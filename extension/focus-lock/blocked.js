const timeEl = document.getElementById("time");
const lineEl = document.getElementById("line");

function render(until) {
  const left = Math.max(0, until - Date.now());
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  timeEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  if (left === 0) {
    lineEl.textContent = "Your session is over. This site is unlocked.";
    return false;
  }
  return true;
}

chrome.storage.local.get("lock").then(({ lock }) => {
  if (!lock) {
    timeEl.textContent = "0:00";
    lineEl.textContent = "No session is running. This site is unlocked.";
    return;
  }
  render(lock.until);
  const t = setInterval(() => {
    if (!render(lock.until)) clearInterval(t);
  }, 1000);
});
