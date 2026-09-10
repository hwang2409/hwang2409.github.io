export const corpus = [
  'rust search engine',
  'rust rust rust search',
  'a search engine stores documents and builds an index for fast search',
  'immutable segments store documents on object storage',
  'a write ahead log records writes before an index changes',
  'vector search and text search can rank documents together',
];

// Match Rust's tokenizer: lowercase, then split on any run of non-alphanumeric characters.
export function tokenize(text: string) {
  return text.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean);
}

export function scoreDocuments(query: string, k1: number, b: number) {
  const docs = corpus.map(tokenize);
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  const terms = tokenize(query).map(term => {
    const df = docs.filter(doc => doc.includes(term)).length;
    return { term, df, idf: Math.log(1 + (docs.length - df + .5) / (df + .5)) };
  });
  return docs.map((doc, id) => {
    const contributions = terms.map(term => {
      const tf = doc.filter(word => word === term.term).length;
      const normalization = k1 * (1 - b + b * doc.length / average);
      const score = tf === 0 ? 0 : term.idf * tf * (k1 + 1) / (tf + normalization);
      return { ...term, tf, score };
    });
    return { id, text: corpus[id], length: doc.length, contributions, score: contributions.reduce((sum, term) => sum + term.score, 0) };
  }).sort((a, b) => b.score - a.score || a.id - b.id);
}
