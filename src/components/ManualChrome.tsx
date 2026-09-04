import ManHeader from '@/components/ManHeader';
import StatusLine from '@/components/StatusLine';

export default function ManualChrome({
  name,
  title,
  status,
}: {
  readonly name: string;
  readonly title: string;
  readonly status: string;
}) {
  return (
    <>
      <ManHeader name={name} title={title} />
      <StatusLine label={status} />
    </>
  );
}
