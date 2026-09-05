import Link from 'next/link';
import ManualChrome from '@/components/ManualChrome';

export default function NotFound() {
  return (
    <>
      <ManualChrome name="HENRY(1)" title="General Commands Manual" status="henry(1) — not found" currentSection="home" />
      <section className="man-section page-section not-found-page">
        <h1 className="page-title">not found</h1>
        <p className="man-indent">the requested page does not exist.</p>
        <p className="man-indent"><Link href="/">return to henry(1)</Link></p>
      </section>
    </>
  );
}
