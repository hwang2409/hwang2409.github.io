export type NGramDistribution = Array<[string, number]>;

export type ClientNGramModel = {
  maxOrder: number;
  trainingTokens: number;
  entries: Array<[string, NGramDistribution]>;
};

export type NGramPrediction = {
  token: string;
  score: number;
};

export type NGramPredictionResult = {
  predictions: NGramPrediction[];
  matchedContext: string[];
  order: number;
  entropyBits: number;
};

const tokenPattern = /[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?|[^\w\s]/gi;
const contextSeparator = '\u0001';

export function tokenizeText(text: string) {
  return Array.from(text.toLowerCase().matchAll(tokenPattern), (match) => match[0]);
}

function contextKey(tokens: string[]) {
  return tokens.join(contextSeparator);
}

function contextFromKey(key: string) {
  return key.length > 0 ? key.split(contextSeparator) : [];
}

export function createNGramModel(
  text: string,
  maxOrder = 3,
  topPerContext = 8
): ClientNGramModel {
  const tokens = tokenizeText(text);
  const counts = new Map<string, Map<string, number>>();

  function addCount(context: string[], token: string) {
    const key = contextKey(context);
    const distribution = counts.get(key) || new Map<string, number>();
    distribution.set(token, (distribution.get(token) || 0) + 1);
    counts.set(key, distribution);
  }

  tokens.forEach((token, index) => {
    for (let order = 0; order <= maxOrder; order += 1) {
      const start = index - order;
      if (start < 0) continue;
      addCount(tokens.slice(start, index), token);
    }
  });

  const entries = Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, distribution]) => {
      const ranked = Array.from(distribution.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, topPerContext);
      return [key, ranked] as [string, NGramDistribution];
    });

  return {
    maxOrder,
    trainingTokens: tokens.length,
    entries,
  };
}

export function predictNextToken(
  model: ClientNGramModel,
  context: string,
  topK = 5
): NGramPredictionResult {
  const contextTokens = tokenizeText(context);
  const distributions = new Map(model.entries);
  let matchedKey = '';
  let distribution = distributions.get('') || [];

  for (let order = Math.min(model.maxOrder, contextTokens.length); order >= 0; order -= 1) {
    const key = contextKey(contextTokens.slice(-order));
    const candidate = distributions.get(key);
    if (candidate) {
      matchedKey = key;
      distribution = candidate;
      break;
    }
  }

  const total = distribution.reduce((sum, [, count]) => sum + count, 0);
  const predictions = distribution.slice(0, topK).map(([token, count]) => ({
    token,
    score: total > 0 ? count / total : 0,
  }));
  const entropyBits = distribution.reduce((sum, [, count]) => {
    const probability = total > 0 ? count / total : 0;
    return probability > 0 ? sum - probability * Math.log2(probability) : sum;
  }, 0);

  return {
    predictions,
    matchedContext: contextFromKey(matchedKey),
    order: contextFromKey(matchedKey).length,
    entropyBits: Math.abs(entropyBits) < 1e-12 ? 0 : entropyBits,
  };
}
