from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from math import log2


TOKEN_RE = re.compile(r"[a-z]+(?:'[a-z]+)?|\d+(?:\.\d+)?|[^\w\s]", re.IGNORECASE)


@dataclass(frozen=True)
class Prediction:
    token: str
    score: float


@dataclass(frozen=True)
class PredictionResult:
    predictions: list[Prediction]
    entropy_bits: float
    matched_context: tuple[str, ...]
    order: int


class NGramModel:
    def __init__(self, text: str, max_order: int = 3) -> None:
        self.max_order = max_order
        self.tokens = self.tokenize(text)
        self.counts: dict[tuple[str, ...], Counter[str]] = defaultdict(Counter)
        self._train()

    @staticmethod
    def tokenize(text: str) -> list[str]:
        return [match.group(0).lower() for match in TOKEN_RE.finditer(text)]

    @property
    def training_tokens(self) -> int:
        return len(self.tokens)

    def _train(self) -> None:
        for index, token in enumerate(self.tokens):
            for order in range(self.max_order + 1):
                start = index - order
                if start < 0:
                    continue
                context = tuple(self.tokens[start:index])
                self.counts[context][token] += 1

    def predict(self, context: str, top_k: int) -> PredictionResult:
        context_tokens = self.tokenize(context)
        matched_context: tuple[str, ...] = ()
        distribution: Counter[str] = self.counts[()]

        for order in range(min(self.max_order, len(context_tokens)), -1, -1):
            candidate = tuple(context_tokens[-order:]) if order else ()
            if candidate in self.counts:
                matched_context = candidate
                distribution = self.counts[candidate]
                break

        total = sum(distribution.values())
        ranked = distribution.most_common(top_k)
        predictions = [
            Prediction(token=token, score=count / total)
            for token, count in ranked
        ]

        entropy_bits = -sum(
            (count / total) * log2(count / total)
            for count in distribution.values()
        )
        if abs(entropy_bits) < 1e-12:
            entropy_bits = 0.0

        return PredictionResult(
            predictions=predictions,
            entropy_bits=entropy_bits,
            matched_context=matched_context,
            order=len(matched_context),
        )
