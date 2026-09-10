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
one process, one crate, no runtime dependencies past `tokio`, `serde`, and
`aws-sdk-s3`.

the six demos below explain the pieces: a write path that survives crashes,
two vector indexes to compare, a text index for keyword rank, and a filter
step that gates them both.

<!-- widget: wal-segments -->

<p class="project-demo-note">these six TypeScript demos explain pufferclone's ideas; they do not run its rust code.</p>

## documents, namespaces, and the write path

a document has a string id, an optional dense vector, and a bag of typed
attributes. documents live in namespaces, and every namespace owns its own
object-store prefix: `ns/<name>/wal/…`, `ns/<name>/segments/…`, and a
`manifest.json` at the root. schemas are per-namespace hints, not a global
catalog.

writes land in the write-ahead log first. a `WalBatch` carries upserts and
deletes with a monotonic sequence number, gets bincode-encoded, and lands
at a zero-padded twenty-digit key so lexical order matches insertion order.
the namespace acknowledges the write only after that put returns. a crashed
process rehydrates by listing the wal prefix and replaying the batches the
manifest has not yet retired.

the pending buffer flushes when it holds a thousand documents or four
megabytes of wal, whichever comes first. flushing means building an
immutable segment from the buffer, writing it to `segments/…`, and swapping
the manifest to point at the new segment while retiring the wal entries it
covers. segments never change once published.

## exact scan is the honest baseline

before an approximate index earns a place, the exact scan has to be worth
beating. every namespace ships with one: cosine similarity across every
vector, sorted, top-k returned. it is simple, deterministic, and correct at
any recall target because it visits every candidate.

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
default parameters are `M = 16`, `M0 = 32`, `ef_construction = 200`. the
build assigns each node a level from a geometric distribution and inserts
it top-down: search from the current entry point in each upper layer, then
switch to `ef_construction` breadth once you reach the node's own top layer.
each new node connects to its nearest `M` neighbours per layer, and every
neighbour gets pruned back to the cap.

<!-- widget: hnsw-build -->

pufferclone deliberately keeps the naive "closest M" heuristic instead of
the paper's diversity rule; the smaller surface is easier to test and
enough for the v1 segment. the demo also preserves an insertion-order edge
at layer zero, matching one of pufferclone's small deviations from the
paper.

## efSearch is the recall knob

approximate means the query beam might miss neighbours the exact scan would
find. `ef_search` sets that beam. wider beams visit more candidates and get
closer to the exact answer; narrower ones finish sooner and can drop real
neighbours from the tail.

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

text search is a separate index over the same segment. tokenisation
lowercases the input and splits on any run of non-alphanumeric
characters; the inverted index stores document frequencies and
per-document term counts. `text_stats` maintains corpus counts so
document frequencies can be merged across segments.

<!-- widget: bm25-scoring -->

the demo scores a fixed six-document corpus. moving `k1` changes term
saturation: a rare term keeps mattering as its count rises. moving `b`
changes length normalisation: short documents win harder with `b` near
one. pufferclone fixes `k1 = 1.2` and `b = 0.75`; the sliders are there
to make the formula visible, not to configure the real engine.

## filter first, then rank

pufferclone accepts a small filter DSL against document attributes and
applies it before the vector or text search runs. exact scan skips
disallowed points outright. HNSW keeps disallowed nodes as routing
candidates so they can still guide the traversal, but never adds them to
the returned beam.

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

`PUFFERCLONE_MEMORY_BUDGET_BYTES` sets a soft cap on how much of the
loaded namespace cache stays hot. the coordinator picks the least-recently
queried or written namespace when the budget spills, closes its indexes,
and drops it from the cache. a fresh query re-hydrates it from segments on
the next request. a single namespace that is larger than the whole budget
still loads on demand, so there is always at least one namespace available
when the cap cannot be met. the setting is off by default; `0` or a
non-numeric value is a startup error.

## the store contract is small

the object-store trait has four operations: put, get, list, delete. put
is write-once for segment and WAL keys and overwrite for the manifest.
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

`puf` speaks to the HTTP api at `http://127.0.0.1:8666` by default. it
knows how to list and drop namespaces, upsert documents from jsonl, and
issue queries. a hundred-document batch keeps upserts small; a query
returns the raw json response unless `--json` is on.

```sh
puf ns ls
puf upsert --namespace notes docs.jsonl
puf query --namespace notes --vector '[…]' --top-k 10 --filter '{"tag":"code"}'
```

the point of building this was not to compete with turbopuffer. it was to
have a system i could open at any layer — wal, segment, filter, HNSW, S3
adapter — and explain why every step happens.
