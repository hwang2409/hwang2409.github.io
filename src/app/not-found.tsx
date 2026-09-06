import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <section className="page-section not-found-page">
        <h1 className="page-title">not found</h1>
        <p>the requested page does not exist.</p>
        <p><Link href="/">return home</Link></p>
      </section>
    </>
  );
}
