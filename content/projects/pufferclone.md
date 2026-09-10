---
title: pufferclone
excerpt: "rebuilding turbopuffer from scratch in rust: WAL to segments to HNSW to hybrid search on object storage"
date: 09/10/2026
order: 5
image: /projects/pufferclone-hero.svg
imageAlt: WAL cells and immutable segments feeding compaction on the left, an HNSW graph with a query and nearest neighbours on the right
imageWidth: 960
imageHeight: 540
---

turbopuffer is a serverless vector and full-text search database that keeps
its state in object storage. i wanted to know how a system like that fits
together, so i wrote one from scratch in rust:
[pufferclone](https://github.com/hwang2409/tooling/tree/main/pufferclone).
one process, one crate. `tokio` and `axum` run the server, `object_store`
talks to the S3 and local backends, `serde` handles the wire formats.

the six demos below explain the pieces: a write path that survives crashes,
two vector indexes to compare, a text index for keyword rank, and a filter
step that gates them both.

<!-- widget: wal-segments -->

<p class="project-demo-note">these six TypeScript demos explain pufferclone's ideas; they do not run its rust code.</p>

## documents, namespaces, and the write path

everything downstream is one type. a `Doc` is a string id, an optional
dense vector, and a bag of typed attributes:

```rust
pub struct Doc {
    // ...
    pub id: String,
    // ...
    pub vector: Option<Vec<f32>>,
    // ...
    pub attributes: BTreeMap<String, AttrValue>,
}
```

```rust
pub enum AttrValue {
    // ...
    String(String),
    // ...
}
```

documents live in namespaces, and every namespace owns its own object-store
prefix: `ns/<name>/wal/…`, `ns/<name>/segments/…`, and a `MANIFEST.json`
at the root. `AttrValue` is the whole attribute vocabulary; the filter
DSL below can only compare things that fit one of these variants.

writes land in the write-ahead log first. a `WalBatch` carries upserts
and deletes with a monotonic sequence number and gets bincode-encoded
before the namespace acknowledges the write:

```rust
pub struct WalBatch {
    // ...
    pub seq: u64,
    // ...
    pub upserts: Vec<Doc>,
    // ...
    pub deletes: Vec<String>,
}
```

```rust
pub fn wal_key(namespace: &str, seq: u64) -> String {
    format!("ns/{namespace}/wal/{seq:020}.wal")
}
```

the twenty-digit zero-padded key is wide enough for any `u64` and makes
lexical order match insertion order. a crashed process rehydrates by
listing the wal prefix and replaying the batches the manifest has not
yet retired.

the pending buffer flushes when it holds a thousand documents or four
megabytes of wal, whichever comes first. flushing builds an immutable
segment, writes it under `segments/…`, and swaps the manifest to point at
it:

```rust
pub struct SegmentMeta {
    // ...
    #[serde(default)]
    pub last_wal_seq: u64,
    // ...
    #[serde(default)]
    pub sections: Vec<String>,
}
```

```rust
/// The first WAL sequence included in the segment.
#[serde(default)]
pub first_wal_seq: u64,
```

```rust
pub struct Manifest {
    // ...
    pub segments: Vec<SegmentMeta>,
    // ...
}
```

the manifest is the only overwrite-in-place object; every segment file
is write-once. `last_wal_seq` on each `SegmentMeta` is what tells replay
which wal entries the segment has already retired. `sections` names the
opaque index blobs stored next to `docs.bin` under the segment prefix:
`vectors`, `text`, `tombstones`, and `hnsw` once the segment is large
enough.

## exact scan is the honest baseline

before an approximate index earns a place, the exact scan has to be worth
beating. every namespace ships with one: cosine similarity across every
vector, sorted, top-k returned. the trait names what a vector index has
to do, and `ExactScan` is the reference implementation:

```rust
pub trait VectorIndex: Sized {
    // ...
    fn build<I, D, V>(documents: I) -> Self
    where
        I: IntoIterator<Item = (D, V)>,
        D: Into<String>,
        V: Into<Vec<f32>>;
    // ...
}
```

```rust
pub struct ExactScan {
    vectors: std::collections::BTreeMap<String, Vec<f32>>,
}
```

ties break by id, not by map order. the shared `sort_scores` helper
sorts by score descending, then falls back to `left.0.cmp(&right.0)`,
so two hits with the same cosine similarity always land in the same
order. exact scan is simple, correct at any recall target, and
cache-friendly enough that it stays honest at small n.

<!-- widget: vector-query -->

move the query in either plot. exact touches every point on the left; HNSW
walks a layered graph on the right, following upper-layer hops down into a
tight beam at layer zero. both use the same seeded 320-point corpus, so
you can compare the returned neighbours directly.

pufferclone's rust benchmarks make the same comparison at scale. at ten
thousand documents in 768 dimensions, HNSW answers a top-10 query in about
one millisecond while exact scan takes about five. at a hundred thousand
documents, HNSW is still around two milliseconds; exact scan takes almost
a hundred. the crossover shows up between one and ten thousand documents,
where cache-friendly linear scan already runs in about a millisecond.

## build the graph, layer by layer

HNSW ships as a segment index once a namespace passes 256 documents. the
defaults live as module constants next to the implementation:

```rust
const DEFAULT_M: usize = 16;
const DEFAULT_M0: usize = 32;
const DEFAULT_EF_CONSTRUCTION: usize = 200;
```

`M` is the neighbour cap on upper layers; `M0` is the wider cap at layer
zero. `ef_construction` is the beam width used when placing a new node.
each node stores those neighbours and its position on the insertion-order
backbone:

```rust
struct Node {
    id: String,
    vector: Vec<f32>,
    level: usize,
    neighbors: Vec<Vec<usize>>,
    backbone_prev: Option<usize>,
    backbone_next: Option<usize>,
}
```

`neighbors` is one adjacency list per layer, length `level + 1`. the
build assigns each node a level from a hash of its id and inserts it
top-down: search from the current entry point in each upper layer, then
switch to `ef_construction` breadth once you reach the node's own top
layer. each new node connects to its nearest neighbours per layer, and
every neighbour gets pruned back to the layer's cap.

<!-- widget: hnsw-build -->

pufferclone deliberately keeps the naive "closest M" heuristic instead of
the paper's diversity rule; the smaller surface is easier to test and
enough for the v1 segment. `backbone_prev` and `backbone_next` are the
insertion-order edge at layer zero, one of pufferclone's small deviations
from the paper — the demo preserves it too.

## efSearch is the recall knob

approximate means the query beam might miss neighbours the exact scan
would find. `ef_search` sets that beam. the search entry point takes it
by value so a caller can raise or lower recall per query:

```rust
pub fn search_with_ef(
    &self,
    query: &[f32],
    top_k: usize,
    ef_search: usize,
) -> Vec<(String, f32)> {
    // ...
}
```

wider beams visit more candidates and get closer to the exact answer;
narrower ones finish sooner and can drop real neighbours from the tail.

<!-- widget: recall-tradeoff -->

the harness runs actual searches over 480 seeded points with 24 fixed
queries and reports recall@10 alongside the mean visited-node count. wider
beams do not always help proportionally: below a threshold, most of the
missing neighbours are in the tail, and doubling ef mostly costs visits.

pufferclone reports the same shape at scale. at ten thousand 128-dimension
documents, the default `ef_search = 64` hits recall@10 of 0.981; pushing
`ef_search` to 256 lifts recall@10 to 0.994 and recall@100 from about 0.78
to 0.95. HNSW at 100k × 128 stays around 300 µs; the same query against
the exact scan takes about twelve milliseconds.

## BM25 is the second index

text search is a separate index over the same segment. the postings map
lives inside `TextIndex`; `TextStats` is the mergeable summary the
namespace uses to make scores comparable across segments:

```rust
pub struct TextStats {
    // ...
    pub doc_count: usize,
    // ...
    pub total_len: usize,
    // ...
    pub doc_freq: BTreeMap<String, usize>,
}
```

```rust
pub struct TextIndex {
    postings: BTreeMap<String, BTreeMap<String, u32>>,
    doc_lengths: BTreeMap<String, usize>,
    avgdl: f64,
}
```

tokenisation lowercases the input and splits on any run of non-alphanumeric
characters. `postings` maps a term to a document-frequency map; per-document
term counts live inside that inner map. `TextStats` is what makes the query
correct across the memtable and every segment at once: each source computes
its filtered stats, the namespace merges them, and BM25 runs against the
merged summary rather than any single segment's view.

<!-- widget: bm25-scoring -->

the demo scores a fixed six-document corpus. moving `k1` changes term
saturation: a rare term keeps mattering as its count rises. moving `b`
changes length normalisation: short documents win harder with `b` near
one. pufferclone fixes `k1 = 1.2` and `b = 0.75`; the sliders are there
to make the formula visible, not to configure the real engine.

## filter first, then rank

pufferclone accepts a small filter DSL against document attributes and
applies it before the vector or text search runs. the AST is one tagged
enum, serialised with the operator name in the `op` field:

```rust
#[serde(tag = "op", rename_all = "snake_case")]
pub enum Filter {
    // ...
    Eq { field: String, value: AttrValue },
    // ...
    And { filters: Vec<Filter> },
    // ...
    Or { filters: Vec<Filter> },
}
```

equality and membership require matching `AttrValue` types; ordering
accepts `Int` or `Float` on either side. any other type mismatch is
`false`, including `Ne` — a missing field never becomes "not equal to
anything". exact scan skips disallowed points outright. HNSW keeps
disallowed nodes as routing candidates so they can still guide the
traversal, but never adds them to the returned beam.

<!-- widget: hybrid-search -->

the tag filter shows what changes. "filter before" mirrors pufferclone's
policy: results only contain allowed nodes, but rejected nodes still hop
the query into the right neighbourhood. "filter last" runs the unfiltered
top ten first and drops mismatches — cheap when the filter is loose,
lossy when it is sparse, because the top ten was chosen without knowing
which nodes mattered.

when both indexes fire, pufferclone combines their rankings with reciprocal
rank fusion. hybrid queries are two searches plus a merge, not a
score-space blend.

## keep memory bounded

the coordinator picks the least-recently queried or written namespace when
the budget spills, closes its indexes, and drops it from the cache. three
constants set the policy:

```rust
pub(crate) const HOT_CACHE_CAPACITY: usize = 8;
pub(crate) const COLD_LOAD_CONCURRENCY: usize = 4;
pub(crate) const MEMORY_BUDGET_ENV: &str = "PUFFERCLONE_MEMORY_BUDGET_BYTES";
```

`HOT_CACHE_CAPACITY` caps loaded namespaces; `COLD_LOAD_CONCURRENCY`
caps the parallel cold loads that hydrate the cache; the env var sets
the soft byte cap. a fresh query re-hydrates an evicted namespace from
its segments on the next request. a single namespace that is larger than
the whole budget still loads on demand, so there is always at least one
namespace available when the cap cannot be met. the setting is off by
default; `0` or a non-numeric value is a startup error.

## the store contract is small

the object-store trait has four operations. put is write-once for segment
and WAL keys and overwrite for the manifest; get, list, and delete carry
no policy:

```rust
pub trait ObjectStore {
    // ...
    fn put(&self, key: &str, bytes: &[u8]) -> Result<()>;
    // ...
    fn get(&self, key: &str) -> Result<Vec<u8>>;
    // ...
    fn list(&self, prefix: &str) -> Result<Vec<String>>;
    // ...
    fn delete(&self, key: &str) -> Result<()>;
}
```

the local backend uses a directory tree: hard-link publication makes
segment writes atomic, and rename swaps the manifest. the S3 backend
reaches the same guarantees through conditional create for write-once
objects and unconditional put for the manifest. every S3 call crosses the
async/sync boundary and the network, so the engine's correctness never
depends on local-store latency.

MinIO covers the end-to-end path in-repo:
`PUFFERCLONE_TEST_S3_URL=http://127.0.0.1:9000 cargo test --test s3_e2e`,
and `scripts/s3_smoke.sh` drives the real HTTP api against a running
MinIO before the process exits.

## the CLI is the driver

`puf` speaks to the HTTP api at `http://127.0.0.1:8666` by default. the
top-level `clap` subcommand tree is the entire surface:

```rust
enum Command {
    // ...
    Ns {
        // ...
    },
    // ...
    Upsert(UpsertArgs),
    // ...
    Query(QueryArgs),
}
```

```rust
enum NamespaceCommand {
    // ...
    Ls,
    // ...
    Rm {
        // ...
    },
}
```

`namespace` is a positional argument on both `upsert` and `query`.
`upsert` batches its JSONL input into groups of a hundred; `query`
prints a tab-separated table by default and switches to JSON when the
top-level `--json` flag is set. `--filter` takes `field=value`
pairs and can be repeated; `--filter-in` takes `field=v1,v2` for
membership tests.

```sh
puf ns ls
puf upsert notes -f docs.jsonl
puf query notes --vector '0.1,0.2,0.3' --top-k 10 --filter tag=code
```

the point of building this was not to compete with turbopuffer. it was to
have a system i could open at any layer — wal, segment, filter, HNSW, S3
adapter — and explain why every step happens.
