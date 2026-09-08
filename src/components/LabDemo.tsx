'use client';

import { useState } from 'react';

type LabDemoProps = {
  readonly src: string;
  readonly title: string;
};

export default function LabDemo({ src, title }: LabDemoProps) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <button className="lab-demo-load" type="button" onClick={() => setLoaded(true)}>
        [load demo]
      </button>
    );
  }

  return (
    <div className="lab-demo-surface">
      <iframe
        className="lab-demo-iframe"
        title={title}
        src={src}
        scrolling="no"
      />
    </div>
  );
}
