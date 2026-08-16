type IconProps = {
  active?: boolean;
  className?: string;
};

const base = "h-6 w-6 shrink-0";

function stroke(active?: boolean) {
  return active ? "stroke-giu-primary" : "stroke-giu-muted";
}

export function GiuIconHome({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <path
        d="M4.5 10.2 12 4.5l7.5 5.7V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 20.5V13.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2V20.5"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GiuIconBox({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <path
        d="M12 3.5 19.25 7.5v9L12 20.5 4.75 16.5v-9L12 3.5Z"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 3.5v17M4.75 7.5 12 11.5l7.25-4" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function GiuIconTicket({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <path
        d="M6.5 5.5h11A1.5 1.5 0 0 1 19 7v2.2a1.8 1.8 0 0 0 0 3.6V15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 15v-2.2a1.8 1.8 0 0 0 0-3.6V7a1.5 1.5 0 0 1 1.5-1.5Z"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 8.2v7.6" strokeWidth="1.75" strokeLinecap="round" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

export function GiuIconStore({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <path
        d="M4.5 9.5V19a1.2 1.2 0 0 0 1.2 1.2h12.6A1.2 1.2 0 0 0 19.5 19V9.5"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 9.5 7.2 5.8A1.5 1.5 0 0 1 8.6 5h6.8a1.5 1.5 0 0 1 1.4 1l1.2 3.5"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9.5 14.2h5" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function GiuIconHeart({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <path
        d="M12 19.2 5.8 13.4a4.2 4.2 0 0 1 0-6 4.2 4.2 0 0 1 5.9-.2L12 7.4l.3-.2a4.2 4.2 0 0 1 5.9.2 4.2 4.2 0 0 1 0 6L12 19.2Z"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        className={active ? "fill-giu-primary stroke-giu-primary" : ""}
      />
    </svg>
  );
}

export type GiuNavIconName = "home" | "box" | "ticket" | "store" | "heart" | "settings";

export function GiuIconSettings({ active, className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} ${stroke(active)}`} aria-hidden>
      <circle cx="12" cy="12" r="3" strokeWidth="1.75" />
      <path
        d="M12 3.5v2M12 18.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3.5 12h2M18.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GiuNavIcon({ name, active }: { name: GiuNavIconName; active?: boolean }) {
  switch (name) {
    case "home":
      return <GiuIconHome active={active} />;
    case "box":
      return <GiuIconBox active={active} />;
    case "ticket":
      return <GiuIconTicket active={active} />;
    case "store":
      return <GiuIconStore active={active} />;
    case "heart":
      return <GiuIconHeart active={active} />;
    case "settings":
      return <GiuIconSettings active={active} />;
  }
}
