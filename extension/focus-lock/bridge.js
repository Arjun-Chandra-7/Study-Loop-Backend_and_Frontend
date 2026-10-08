(() => {
  const host = location.hostname;
  if (!(host === "localhost" || host === "127.0.0.1" || (host.startsWith("study-loop") && host.endsWith(".vercel.app")))) return;
  if (window.__studyloopBridge) return;
  window.__studyloopBridge = true;

  const post = (data) => window.postMessage({ source: "studyloop-ext", ...data }, location.origin);

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const msg = e.data;
    if (!msg || msg.source !== "studyloop-app" || typeof msg.type !== "string") return;
    chrome.runtime.sendMessage({ type: msg.type, until: msg.until, domains: msg.domains, pattern: msg.pattern, label: msg.label }, (res) => {
      if (chrome.runtime.lastError) return post({ id: msg.id, error: chrome.runtime.lastError.message });
      post({ id: msg.id, ...res });
    });
  });

  post({ type: "hello" });
})();
