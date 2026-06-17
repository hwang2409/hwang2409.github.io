'use client';

import { FormEvent, useEffect, useState } from 'react';
import BrowserModelPanel from '@/components/BrowserModelPanel';
import LocalSearchPanel from '@/components/LocalSearchPanel';
import type { SearchDocument } from '@/lib/siteIndex';

const DEFAULT_API_URL = 'https://hwang2409githubio-production.up.railway.app';
const LAB_API_URL = process.env.NEXT_PUBLIC_LAB_API_URL || DEFAULT_API_URL;

type ApiState = 'idle' | 'loading' | 'ok' | 'error';

type HealthResponse = {
  ok: boolean;
  service: string;
  version: string;
  env: string;
};

type Prediction = {
  token: string;
  score: number;
};

type NextTokenResponse = {
  model: string;
  predictions: Prediction[];
  entropy_bits: number;
  latency_ms: number;
  context_chars: number;
  last_token: string | null;
  matched_context?: string[];
  order?: number;
  training_tokens?: number;
  note: string;
};

type TraceStep = {
  label: string;
  durationMs: number;
  detail: string;
};

const EXAMPLE_CONTEXTS = [
  'The CUDA kernel',
  'A static site can still',
  'FastAPI is useful',
  'Local n gram model',
];

export default function LabConsole({ searchDocuments }: { searchDocuments: SearchDocument[] }) {
  const [healthState, setHealthState] = useState<ApiState>('idle');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [context, setContext] = useState('The CUDA kernel');
  const [tokenState, setTokenState] = useState<ApiState>('idle');
  const [tokenResult, setTokenResult] = useState<NextTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);

  const topPrediction = tokenResult?.predictions[0] ?? null;
  const matchedContext =
    tokenResult?.matched_context && tokenResult.matched_context.length > 0
      ? tokenResult.matched_context.join(' ')
      : '-';

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealthState('loading');
      setHealthError(null);

      try {
        const response = await fetch(`${LAB_API_URL}/health`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`health returned ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        if (!cancelled) {
          setHealth(data);
          setHealthState('ok');
        }
      } catch (error) {
        if (!cancelled) {
          setHealthState('error');
          setHealthError(error instanceof Error ? error.message : 'request failed');
        }
      }
    }

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitTokenProbe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const started = performance.now();
    setTokenState('loading');
    setTokenError(null);
    setTraceSteps([]);

    try {
      const body = JSON.stringify({ context, top_k: 5 });
      const serializedAt = performance.now();
      const response = await fetch(`${LAB_API_URL}/token/next`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });
      const responseAt = performance.now();

      if (!response.ok) {
        throw new Error(`token probe returned ${response.status}`);
      }

      const data = (await response.json()) as NextTokenResponse;
      const decodedAt = performance.now();
      const backendMs = data.latency_ms;
      const fetchMs = responseAt - serializedAt;
      const networkMs = Math.max(0, fetchMs - backendMs);

      setTokenResult(data);
      setTraceSteps([
        {
          label: 'serialize',
          durationMs: serializedAt - started,
          detail: `${body.length} bytes`,
        },
        {
          label: 'network',
          durationMs: networkMs,
          detail: `status ${response.status}`,
        },
        {
          label: 'backend',
          durationMs: backendMs,
          detail: data.model,
        },
        {
          label: 'decode',
          durationMs: decodedAt - responseAt,
          detail: `${data.predictions.length} predictions`,
        },
      ]);
      setTokenState('ok');
    } catch (error) {
      setTokenState('error');
      setTokenError(error instanceof Error ? error.message : 'request failed');
      setTraceSteps([
        {
          label: 'failed',
          durationMs: performance.now() - started,
          detail: error instanceof Error ? error.message : 'request failed',
        },
      ]);
    }
  }

  const maxTraceDuration = Math.max(...traceSteps.map((step) => step.durationMs), 1);

  return (
    <div className="lab-console">
      <div className="lab-status-strip" aria-labelledby="api-status">
        <h2 id="api-status">backend</h2>
        <span className={`lab-state lab-state-${healthState}`}>{healthState}</span>
        <span>{health ? `api ${health.version}` : '-'}</span>
        <span>{health?.env || '-'}</span>
      </div>

      {healthError ? <p className="lab-error">{healthError}</p> : null}

      <section className="lab-workbench" aria-labelledby="token-probe">
        <div className="lab-workbench-heading">
          <div>
            <h2 id="token-probe">next token</h2>
            <p>send context to the backend; it scores a local n-gram model</p>
          </div>
          <span className={`lab-state lab-state-${tokenState}`}>{tokenState}</span>
        </div>

        <div className="lab-workbench-grid">
          <form className="lab-form" onSubmit={submitTokenProbe}>
            <div className="lab-input-row">
              <label htmlFor="token-context">context</label>
              <span>{context.length.toLocaleString()} / 4,000</span>
            </div>
            <textarea
              id="token-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={6}
              maxLength={4000}
              spellCheck={false}
            />

            <div className="lab-example-row" aria-label="Example contexts">
              {EXAMPLE_CONTEXTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setContext(example)}
                  aria-pressed={context === example}
                >
                  {example}
                </button>
              ))}
            </div>

            <button
              className="lab-run-button"
              type="submit"
              disabled={tokenState === 'loading' || context.trim().length === 0}
            >
              {tokenState === 'loading' ? 'predicting' : 'predict next token'}
            </button>
          </form>

          <div className="lab-output" aria-live="polite">
            {tokenError ? <p className="lab-error">{tokenError}</p> : null}

            {tokenResult ? (
              <>
                <div className="lab-completion">
                  <span>{context.trim() || '-'}</span>
                  <strong>{topPrediction ? topPrediction.token : '-'}</strong>
                </div>

                <ol className="prediction-list">
                  {tokenResult.predictions.map((prediction) => (
                    <li key={prediction.token}>
                      <span className="prediction-token">{prediction.token}</span>
                      <span className="prediction-meter" aria-hidden="true">
                        <span style={{ transform: `scaleX(${prediction.score})` }} />
                      </span>
                      <span className="prediction-score">{prediction.score.toFixed(2)}</span>
                    </li>
                  ))}
                </ol>

                <dl className="lab-metrics lab-metrics-compact">
                  <div>
                    <dt>match</dt>
                    <dd>{matchedContext}</dd>
                  </div>
                  <div>
                    <dt>latency</dt>
                    <dd>{tokenResult.latency_ms.toFixed(3)} ms</dd>
                  </div>
                  <div>
                    <dt>training</dt>
                    <dd>
                      {typeof tokenResult.training_tokens === 'number'
                        ? `${tokenResult.training_tokens.toLocaleString()} tokens`
                        : '-'}
                    </dd>
                  </div>
                </dl>

                <details className="lab-details">
                  <summary>model and request details</summary>
                  <dl className="lab-metrics">
                    <div>
                      <dt>model</dt>
                      <dd>{tokenResult.model}</dd>
                    </div>
                    <div>
                      <dt>order</dt>
                      <dd>{tokenResult.order ?? '-'}</dd>
                    </div>
                    <div>
                      <dt>entropy</dt>
                      <dd>{tokenResult.entropy_bits.toFixed(3)} bits</dd>
                    </div>
                    <div>
                      <dt>note</dt>
                      <dd>{tokenResult.note}</dd>
                    </div>
                  </dl>

                  {traceSteps.length > 0 ? (
                    <div className="request-trace" aria-label="Request trace">
                      {traceSteps.map((step) => (
                        <div key={step.label}>
                          <span>{step.label}</span>
                          <span className="request-trace-meter" aria-hidden="true">
                            <span
                              style={{
                                transform: `scaleX(${Math.max(
                                  0.03,
                                  step.durationMs / maxTraceDuration
                                )})`,
                              }}
                            />
                          </span>
                          <span>{step.durationMs.toFixed(2)} ms</span>
                          <span>{step.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </details>
              </>
            ) : (
              <div className="lab-empty">
                <span>enter context, then predict</span>
                <span>the backend returns likely next tokens and a small timing report</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="lab-panel-grid">
        <LocalSearchPanel documents={searchDocuments} />
        <BrowserModelPanel />
      </div>
    </div>
  );
}
