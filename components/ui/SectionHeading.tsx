type SectionHeadingProps = {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** @deprecated Light headings on dark backgrounds only */
  light?: boolean;
};

export function SectionHeading({
  label,
  title,
  subtitle,
  align = "left",
  light = false,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {label ? (
        <p
          className={`text-xs font-semibold uppercase tracking-wider sm:text-sm ${
            light ? "text-brand-300" : "text-brand-800"
          }`}
        >
          {label}
        </p>
      ) : null}
      <h2
        className={`mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-4xl text-balance ${
          light ? "text-white" : "text-brand-950"
        } ${align === "center" ? "mx-auto" : ""}`}
      >
        {title}
      </h2>
      {subtitle?.trim() ? (
        <p
          className={`mt-2 text-base leading-snug sm:mt-4 sm:text-lg sm:leading-relaxed ${
            light ? "text-brand-100" : "text-stone-700"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
