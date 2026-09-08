import Link from 'next/link';
import IframeResizer from '@/components/IframeResizer';
import LabDemo from '@/components/LabDemo';

const demos = [
  {
    id: 'cifar-demo',
    title: 'cifar-10 classifier',
    description: 'ResNet-18 image classification running in your browser.',
    href: '/blog/cifar10-classifier/',
    src: '/cifar-demo.html',
  },
  {
    id: 'whitematter-demo',
    title: 'whitematter',
    description: 'a neural network built from scratch, running live.',
    href: '/blog/whitematter/',
    src: '/whitematter-demo.html',
  },
] as const;

export const metadata = {
  title: 'lab',
};

export default function LabPage() {
  return (
    <section className="lab-page">
      <div className="lab-page-header">
        <h1 className="page-title">lab</h1>
        <p className="page-note">interactive demos from things i&apos;ve built.</p>
      </div>

      <div className="lab-demos">
        {demos.map(({ id, title, description, href, src }) => (
          <section className="lab-demo" key={id} aria-labelledby={`${id}-title`}>
            <div className="lab-demo-heading">
              <h2 id={`${id}-title`}>{title}</h2>
              <p>{description}</p>
              <Link href={href}>read the writeup</Link>
            </div>
            <LabDemo src={src} title={title} />
          </section>
        ))}
      </div>
      <IframeResizer />
    </section>
  );
}
