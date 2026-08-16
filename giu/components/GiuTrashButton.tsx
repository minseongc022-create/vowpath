"use client";

type Props = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export function GiuTrashButton({ label, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="giu-btn-3d giu-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
