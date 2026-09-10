export interface Point { x: number; y: number }
export interface SearchNode extends Point { level: number; tag: number; edges: number[][] }
export interface Graph { nodes: SearchNode[]; entry: number; m: number }
interface Visit { id: number; layer: number; from: number }

// Same LCG as the site's broad-phase demo. Each fixture owns its seed.
export function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function points(count = 320, seed = 38) {
  const random = seeded(seed);
  return Array.from({ length: count }, () => ({ x: random(), y: random(), tag: Math.floor(random() * 3) }));
}

export function distance(a: Point, b: Point) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }

function rank(graph: Graph, query: Point) {
  return (a: number, b: number) => distance(graph.nodes[a], query) - distance(graph.nodes[b], query) || a - b;
}

// A real bounded best-first search. Filtered search keeps rejected nodes as
// routing candidates, matching the Rust engine's policy and expansion cap.
function searchLayer(graph: Graph, query: Point, entry: number, layer: number, ef: number, allowed?: ReadonlySet<number>) {
  const compare = rank(graph, query);
  const seen = new Set([entry]);
  const visits: Visit[] = [{ id: entry, layer, from: entry }];
  const frontier = [entry];
  const best = allowed && !allowed.has(entry) ? [] : [entry];
  let expansions = 0;
  while (frontier.length) {
    frontier.sort(compare);
    const current = frontier.shift()!;
    if (allowed && expansions >= ef * 8) break;
    expansions += 1;
    const routingPending = allowed && frontier.some(id => !allowed.has(id));
    if (best.length >= ef && !routingPending && compare(current, best[best.length - 1]) > 0) break;
    for (const id of graph.nodes[current].edges[layer]) {
      if (seen.has(id)) continue;
      seen.add(id);
      visits.push({ id, layer, from: current });
      if (allowed && !allowed.has(id)) { frontier.push(id); continue; }
      if (best.length < ef || compare(id, best[best.length - 1]) < 0) {
        frontier.push(id);
        best.push(id);
        best.sort(compare);
        if (best.length > ef) best.pop();
      }
    }
  }
  return { best, visits, expansions };
}

export function buildGraph(data = points(), m = 4, efConstruction = 32): Graph {
  const graph: Graph = { nodes: [], entry: 0, m };
  const random = seeded(138);
  for (const point of data) {
    const id = graph.nodes.length;
    let level = 0;
    while (level < 5 && random() < 1 / m) level += 1;
    const node: SearchNode = { ...point, level, edges: Array.from({ length: level + 1 }, () => []) };
    graph.nodes.push(node);
    if (id === 0) continue;
    let entry = graph.entry;
    const top = graph.nodes[entry].level;
    for (let layer = top; layer > level; layer -= 1) {
      entry = searchLayer(graph, point, entry, layer, 1).best[0];
    }
    const prune = (target: number, layer: number) => {
      const neighbors = graph.nodes[target].edges[layer];
      const required = layer === 0 ? neighbors.filter(n => Math.abs(n - target) === 1) : [];
      graph.nodes[target].edges[layer] = [...required, ...neighbors.filter(n => !required.includes(n)).sort(rank(graph, graph.nodes[target]))]
        .slice(0, layer === 0 ? 2 * m : m);
    };
    for (let layer = Math.min(top, level); layer >= 0; layer -= 1) {
      const beam = searchLayer(graph, point, entry, layer, efConstruction).best;
      node.edges[layer] = beam.slice(0, layer === 0 ? 2 * m : m);
      for (const neighbor of node.edges[layer]) {
        graph.nodes[neighbor].edges[layer].push(id);
        prune(neighbor, layer);
      }
      entry = beam[0];
    }
    // Preserve an insertion-order backbone at level zero, as pufferclone does.
    if (!node.edges[0].includes(id - 1)) node.edges[0].push(id - 1);
    if (!graph.nodes[id - 1].edges[0].includes(id)) graph.nodes[id - 1].edges[0].push(id);
    prune(id, 0); prune(id - 1, 0);
    if (level > top) graph.entry = id;
  }
  return graph;
}

export function searchGraph(graph: Graph, query: Point, ef = 16, k = 10, allowed?: ReadonlySet<number>) {
  if (!graph.nodes.length) return { best: [], beam: [], visits: [], visited: 0, expansions: 0 };
  let entry = graph.entry;
  const visits: Visit[] = [];
  let expansions = 0;
  for (let layer = graph.nodes[entry].level; layer > 0; layer -= 1) {
    const result = searchLayer(graph, query, entry, layer, 1);
    entry = result.best[0];
    visits.push(...result.visits);
    expansions += result.expansions;
  }
  const result = searchLayer(graph, query, entry, 0, Math.max(k, ef), allowed);
  visits.push(...result.visits);
  return { best: result.best.slice(0, k), beam: result.best, visits,
    visited: new Set(visits.map(v => v.id)).size, expansions: expansions + result.expansions };
}

export function exactSearch(graph: Graph, query: Point, k = 10, allowed?: ReadonlySet<number>) {
  return graph.nodes.map((_, id) => id).filter(id => !allowed || allowed.has(id)).sort(rank(graph, query)).slice(0, k);
}
