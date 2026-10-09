"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const detail = `${error.name}: ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}\n${(error.stack ?? "").split("\n").slice(1, 6).join("\n")}`;
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#14130f", color: "#f4f1ea", font: "16px/1.5 system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 16px" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>StudyLoop hit an error.</h1>
          <p style={{ opacity: 0.7, margin: "0 0 16px" }}>Reload first. If it keeps happening, clear StudyLoop’s saved data on this device.</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, padding: 12, borderRadius: 8, background: "#21201d", overflowX: "auto" }}>{detail}</pre>
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => location.reload()} style={{ minHeight: 44, padding: "0 16px" }}>
              Reload
            </button>
            <button
              type="button"
              style={{ minHeight: 44, padding: "0 16px" }}
              onClick={() => {
                try {
                  for (const k of Object.keys(localStorage)) if (k.startsWith("sl-")) localStorage.removeItem(k);
                } catch {}
                location.reload();
              }}
            >
              Clear saved data and reload
            </button>
          </p>
        </main>
      </body>
    </html>
  );
}
