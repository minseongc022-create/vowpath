type SectionHeadingProps = {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
};

export function SectionHeading({
  label,
  title,
  subtitle,
  align = "left",
  light = true,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {label ? (
        <p
          className={`text-sm font-semibold uppercase tracking-wider ${
            light ? "text-brand-300" : "text-brand-600"
          }`}
        >
          {label}
        </p>
      ) : null}
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-balance ${
          light ? "text-white" : "text-brand-950"
        } ${align === "center" ? "mx-auto" : ""}`}
      >
        {title}
      </h2>
      {subtitle?.trim() ? (
        <p
          className={`mt-4 text-lg leading-relaxed ${
            light ? "text-brand-100" : "text-slate-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
