'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

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
  note: string;
};

export default function LabConsole() {
  const [healthState, setHealthState] = useState<ApiState>('idle');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [context, setContext] = useState('The CUDA kernel');
  const [tokenState, setTokenState] = useState<ApiState>('idle');
  const [tokenResult, setTokenResult] = useState<NextTokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const displayUrl = useMemo(() => LAB_API_URL.replace(/^https?:\/\//, ''), []);

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
    setTokenState('loading');
    setTokenError(null);

    try {
      const response = await fetch(`${LAB_API_URL}/token/next`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context, top_k: 5 }),
      });

      if (!response.ok) {
        throw new Error(`token probe returned ${response.status}`);
      }

      const data = (await response.json()) as NextTokenResponse;
      setTokenResult(data);
      setTokenState('ok');
    } catch (error) {
      setTokenState('error');
      setTokenError(error instanceof Error ? error.message : 'request failed');
    }
  }

  return (
    <div className="lab-console">
      <section className="lab-section" aria-labelledby="api-status">
        <div className="lab-section-heading">
          <h2 id="api-status">api</h2>
          <span className={`lab-state lab-state-${healthState}`}>{healthState}</span>
        </div>

        <dl className="lab-readout">
          <div>
            <dt>url</dt>
            <dd>{displayUrl}</dd>
          </div>
          <div>
            <dt>service</dt>
            <dd>{health?.service || '-'}</dd>
          </div>
          <div>
            <dt>version</dt>
            <dd>{health?.version || '-'}</dd>
          </div>
          <div>
            <dt>env</dt>
            <dd>{health?.env || '-'}</dd>
          </div>
        </dl>

        {healthError ? <p className="lab-error">{healthError}</p> : null}
      </section>

      <section className="lab-section" aria-labelledby="token-probe">
        <div className="lab-section-heading">
          <h2 id="token-probe">token probe</h2>
          <span className={`lab-state lab-state-${tokenState}`}>{tokenState}</span>
        </div>

        <form className="lab-form" onSubmit={submitTokenProbe}>
          <label htmlFor="token-context">context</label>
          <textarea
            id="token-context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            rows={3}
            maxLength={4000}
          />
          <button type="submit" disabled={tokenState === 'loading' || context.trim().length === 0}>
            run
          </button>
        </form>

        {tokenError ? <p className="lab-error">{tokenError}</p> : null}

        {tokenResult ? (
          <div className="lab-result">
            <dl className="lab-readout">
              <div>
                <dt>model</dt>
                <dd>{tokenResult.model}</dd>
              </div>
              <div>
                <dt>last token</dt>
                <dd>{tokenResult.last_token || '-'}</dd>
              </div>
              <div>
                <dt>entropy</dt>
                <dd>{tokenResult.entropy_bits.toFixed(3)} bits</dd>
              </div>
              <div>
                <dt>latency</dt>
                <dd>{tokenResult.latency_ms.toFixed(3)} ms</dd>
              </div>
            </dl>

            <ol className="prediction-list">
              {tokenResult.predictions.map((prediction) => (
                <li key={prediction.token}>
                  <span>{prediction.token}</span>
                  <span>{prediction.score.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
    </div>
  );
}
