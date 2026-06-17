'use client';

import { useEffect, useMemo, useState } from 'react';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';

type ModelResult = {
  logit: number;
  probability: number;
  latencyMs: number;
};

const wasmScorer = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x09, 0x01, 0x60,
  0x04, 0x7d, 0x7d, 0x7d, 0x7d, 0x01, 0x7d, 0x03, 0x02, 0x01, 0x00, 0x07,
  0x09, 0x01, 0x05, 0x73, 0x63, 0x6f, 0x72, 0x65, 0x00, 0x00, 0x0a, 0x27,
  0x01, 0x25, 0x00, 0x20, 0x00, 0x43, 0x00, 0x00, 0x00, 0x3f, 0x94, 0x20,
  0x01, 0x43, 0x00, 0x00, 0x80, 0xbe, 0x94, 0x92, 0x20, 0x02, 0x43, 0x00,
  0x00, 0x00, 0x3e, 0x94, 0x92, 0x20, 0x03, 0x43, 0x00, 0x00, 0x40, 0x3f,
  0x94, 0x92, 0x0b,
]);

const sampleVector = [0.4, 0.8, 0.2, 1.0] as const;

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '-';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BrowserModelPanel() {
  const [state, setState] = useState<ModelState>('idle');
  const [result, setResult] = useState<ModelResult | null>(null);
  const [artifactBytes, setArtifactBytes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vectorText = useMemo(() => sampleVector.map((value) => value.toFixed(2)).join(', '), []);

  useEffect(() => {
    let cancelled = false;

    async function readArtifactSize() {
      try {
        const response = await fetch('/resnet18.onnx', { method: 'HEAD' });
        const length = response.headers.get('content-length');
        if (!cancelled && length) {
          setArtifactBytes(Number(length));
        }
      } catch {
        if (!cancelled) {
          setArtifactBytes(null);
        }
      }
    }

    readArtifactSize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runModel() {
    setState('loading');
    setError(null);

    try {
      const started = performance.now();
      const { instance } = await WebAssembly.instantiate(wasmScorer);
      const score = instance.exports.score;

      if (typeof score !== 'function') {
        throw new Error('score export missing');
      }

      const logit = score(...sampleVector) as number;
      setResult({
        logit,
        probability: sigmoid(logit),
        latencyMs: performance.now() - started,
      });
      setState('ready');
    } catch (modelError) {
      setError(modelError instanceof Error ? modelError.message : 'wasm failed');
      setState('error');
    }
  }

  return (
    <section className="lab-panel" aria-labelledby="browser-model">
      <div className="lab-panel-heading">
        <div>
          <h2 id="browser-model">browser wasm</h2>
          <p>run a tiny scorer without touching the backend</p>
        </div>
        <span className={`lab-state lab-state-${state === 'ready' ? 'ok' : state}`}>{state}</span>
      </div>

      <button
        className="lab-run-button"
        type="button"
        onClick={runModel}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'running' : 'run in browser'}
      </button>

      {result ? (
        <div className="browser-model-result">
          <span>score from this tab</span>
          <strong>{result.probability.toFixed(3)}</strong>
          <span>{result.latencyMs.toFixed(3)} ms</span>
        </div>
      ) : null}

      <details className="lab-details">
        <summary>what ran</summary>
        <dl className="lab-metrics lab-metrics-wide">
          <div>
            <dt>runtime</dt>
            <dd>WebAssembly</dd>
          </div>
          <div>
            <dt>input</dt>
            <dd>{vectorText}</dd>
          </div>
          <div>
            <dt>artifact</dt>
            <dd>/resnet18.onnx</dd>
          </div>
          <div>
            <dt>size</dt>
            <dd>{formatBytes(artifactBytes)}</dd>
          </div>
          <div>
            <dt>logit</dt>
            <dd>{result ? result.logit.toFixed(3) : '-'}</dd>
          </div>
        </dl>
      </details>

      {error ? <p className="lab-error">{error}</p> : null}
    </section>
  );
}
