type ManualHeader = {
  name: string;
  title: string;
};

export default function ManHeader({ name, title }: ManualHeader) {
  return (
    <div className="man-header" aria-label={`${name} manual page`}>
      <span>{name}</span>
      <span className="man-header-title">{title}</span>
      <span className="man-header-right">{name}</span>
    </div>
  );
}
