'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export default function LabDemo({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <button className="lab-demo-load" type="button" onClick={() => setLoaded(true)}>
        [load demo]
      </button>
    );
  }

  return <div className="lab-demo-surface">{children}</div>;
}
