"use client";

import { useCallback, useState } from "react";

export function CopyBlock({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback ignored */
    }
  }, [text]);

  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-giu-border bg-white p-4 text-sm text-giu-ink">
        {text}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-lg bg-giu-primary px-4 py-2 text-sm font-semibold text-white hover:bg-giu-primary/90"
      >
        {copied ? "Đã copy ✓" : label}
      </button>
    </div>
  );
}

export function CopyLink({ href }: { href: string; label?: string }) {
  return (
    <div className="rounded-xl border border-giu-border bg-giu-surface p-4">
      <p className="break-all text-sm font-medium text-giu-primary">{href}</p>
      <CopyBlock text={href} label="Copy link" />
    </div>
  );
}
