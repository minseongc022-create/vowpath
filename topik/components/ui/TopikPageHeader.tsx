type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

/** Consistent soft page header — Malhaeboka-style */
export function TopikPageHeader({ title, subtitle, className }: Props) {
  return (
    <header className={className ?? "mb-5 topik-animate-in"}>
      <h1 className="topik-page-title">{title}</h1>
      {subtitle ? <p className="topik-page-subtitle">{subtitle}</p> : null}
    </header>
  );
}
