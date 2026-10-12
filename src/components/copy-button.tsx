"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function SubmitButton({ children, className = "btn", pendingText = "Working…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  // Lightweight pending state without extra deps
  const [busy, setBusy] = useState(false);
  return (
    <button type="submit" className={className} disabled={busy} onClick={(e) => { if ((e.currentTarget.form as HTMLFormElement)?.checkValidity()) setTimeout(() => setBusy(true), 0); }}>
      {busy ? pendingText : children}
    </button>
  );
}
