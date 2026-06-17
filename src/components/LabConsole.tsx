'use client';

import { FormEvent, useEffect, useState } from 'react';
import BrowserModelPanel from '@/components/BrowserModelPanel';
import LocalSearchPanel from '@/components/LocalSearchPanel';
import type { SearchDocument } from '@/lib/siteIndex';

const DEFAULT_API_URL = 'https://hwang2409githubio-production.up.railway.app';
const LAB_API_URL = process.env.NEXT_PUBLIC_LAB_API_URL || DEFAULT_API_URL;
const LAB_MODES = [
  ['token', 'predict text', 'backend model'] as const,
  ['search', 'search posts', 'browser index'] as const,
  ['browser', 'run wasm', 'in this tab'] as const,
];

type ApiState = 'idle' | 'loading' | 'ok' | 'error';
type LabMode = (typeof LAB_MODES)[number][0];

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
  const [activeMode, setActiveMode] = useState<LabMode>('token');
  const [healthState, setHealthState] = useState<ApiState>('idle');
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
  const backendState =
    tokenState === 'loading'
      ? 'loading'
      : tokenState === 'error' || healthState === 'error'
        ? 'error'
        : healthState === 'ok'
          ? 'ok'
          : healthState;
  const backendLabel =
    tokenState === 'loading'
      ? 'running'
      : healthState === 'ok'
        ? 'backend ready'
        : healthState === 'loading'
          ? 'checking'
          : healthState === 'error'
            ? 'backend offline'
            : 'idle';
  const showBackendState = backendState !== 'ok';

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

        await response.json();
        if (!cancelled) {
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
      <div className="lab-switcher" aria-label="Lab experiments">
        {LAB_MODES.map(([mode, label, detail]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={activeMode === mode}
            onClick={() => setActiveMode(mode)}
          >
            {label}
            <span>{detail}</span>
          </button>
        ))}
      </div>

      {activeMode === 'token' ? (
        <section className="lab-workbench" aria-labelledby="token-probe">
        <div className="lab-workbench-heading">
          <div>
            <h2 id="token-probe">next token</h2>
            <p>type a phrase and the backend guesses the next word</p>
          </div>
          {showBackendState ? (
            <span className={`lab-state lab-state-${backendState}`}>{backendLabel}</span>
          ) : null}
        </div>

        {healthError ? <p className="lab-error lab-error-inline">{healthError}</p> : null}

        <div className="lab-workbench-grid">
          <form className="lab-form" onSubmit={submitTokenProbe}>
            <div className="lab-input-row">
              <label htmlFor="token-context">context</label>
            </div>
            <textarea
              id="token-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={6}
              maxLength={4000}
              spellCheck={false}
            />

            <details className="lab-examples">
              <summary>examples</summary>
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
            </details>

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
                  <span>next word</span>
                  <strong>{topPrediction ? topPrediction.token : '-'}</strong>
                  <p>
                    after <span>{context.trim() || '-'}</span>
                  </p>
                </div>

                <ol className="prediction-list prediction-list-simple">
                  {tokenResult.predictions.slice(0, 3).map((prediction) => (
                    <li key={prediction.token}>
                      <span className="prediction-token">{prediction.token}</span>
                      <span className="prediction-score">
                        {Math.round(prediction.score * 100)}%
                      </span>
                    </li>
                  ))}
                </ol>

                <details className="lab-details">
                  <summary>how it ran</summary>
                  <dl className="lab-metrics">
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
                <span>you will see the top three guesses here</span>
              </div>
            )}
          </div>
        </div>
        </section>
      ) : null}

      {activeMode === 'search' ? (
        <LocalSearchPanel documents={searchDocuments} />
      ) : null}

      {activeMode === 'browser' ? <BrowserModelPanel /> : null}
    </div>
  );
}
