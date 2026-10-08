"use client";

import { useEffect, useState } from "react";

function clearLocalData() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("sl-")) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("sl-")) sessionStorage.removeItem(k);
  } catch {}
  location.reload();
}

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState(false);
  const detail = `${error.name}: ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}\n${(error.stack ?? "").split("\n").slice(1, 6).join("\n")}`;

  useEffect(() => {
    console.error("[StudyLoop] crashed:", error);
  }, [error]);

  return (
    <main className="nf">
      <div className="nf__body">
        <p className="eyebrow">
          <span className="eyebrow__rule" aria-hidden />
          Something broke
        </p>
        <h1 className="display display--md">StudyLoop hit an error.</h1>
        <p className="body muted">Try again first. If it keeps happening, clear StudyLoop’s saved data on this device.</p>
        <pre className="app-error__detail">{detail}</pre>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={reset}>
            Try again
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(detail).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy error"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={clearLocalData}>
            Clear saved data and reload
          </button>
        </div>
      </div>
    </main>
  );
}
