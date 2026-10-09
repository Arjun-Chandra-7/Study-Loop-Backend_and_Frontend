const RULE_BASE = 1000;
const BLOCKED_PAGE = "/blocked.html";

async function clearRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: rules.map((r) => r.id) });
}

function hostBlocked(url, domains, pattern) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (domains.some((d) => h === d || h.endsWith("." + d))) return true;
    return pattern ? new RegExp(pattern).test(url) : false;
  } catch {
    return false;
  }
}

async function lock({ until, domains, pattern, label }) {
  await clearRules();
  const types = ["main_frame", "sub_frame"];
  const addRules = [];
  if (domains.length) {
    addRules.push({
      id: RULE_BASE,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: BLOCKED_PAGE } },
      condition: { requestDomains: domains, resourceTypes: types },
    });
  }
  if (pattern) {
    addRules.push({
      id: RULE_BASE + 1,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: BLOCKED_PAGE } },
      condition: { regexFilter: pattern, resourceTypes: types },
    });
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules });
  await chrome.storage.local.set({ lock: { until, domains, pattern, label: label || "" } });
  await chrome.alarms.clear("unlock");
  chrome.alarms.create("unlock", { when: until });

  const page = chrome.runtime.getURL(BLOCKED_PAGE);
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (t.id != null && t.url && hostBlocked(t.url, domains, pattern)) chrome.tabs.update(t.id, { url: page });
  }
}

async function unlock() {
  await clearRules();
  await chrome.storage.local.remove("lock");
  await chrome.alarms.clear("unlock");
}

async function status() {
  const { lock: l } = await chrome.storage.local.get("lock");
  const active = Boolean(l && l.until > Date.now());
  return { installed: true, version: chrome.runtime.getManifest().version, active, until: active ? l.until : null };
}

async function expireIfDue() {
  const { lock: l } = await chrome.storage.local.get("lock");
  if (l && l.until <= Date.now()) await unlock();
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "unlock") void unlock();
});
chrome.runtime.onStartup.addListener(() => void expireIfDue());
const APP_URLS = ["https://*.vercel.app/*", "http://localhost/*", "http://127.0.0.1/*"];

async function attachToOpenTabs() {
  const tabs = await chrome.tabs.query({ url: APP_URLS });
  for (const t of tabs) {
    if (t.id == null) continue;
    chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["bridge.js"] }).catch(() => {});
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void expireIfDue();
  void attachToOpenTabs();
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const fromApp = sender.tab && sender.url && /^(https:\/\/study-loop[^/]*\.vercel\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)\//.test(sender.url);
  const fromBlockedPage = sender.url && sender.url.startsWith(chrome.runtime.getURL(""));
  if (!fromApp && !(fromBlockedPage && msg.type === "status")) return false;
  (async () => {
    if (msg.type === "start" && Array.isArray(msg.domains) && typeof msg.until === "number") {
      await lock({ until: msg.until, domains: msg.domains.slice(0, 500), pattern: msg.pattern || null, label: msg.label });
    } else if (msg.type === "stop") {
      await unlock();
    }
    reply(await status());
  })();
  return true;
});
