import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { BLOCK_GROUPS } from "@/lib/focus/blocklist";

export const metadata: Metadata = {
  title: "Focus Lock · StudyLoop",
  description: "Install the StudyLoop Focus Lock extension to block distracting websites during a study session.",
};

export default function FocusLockPage() {
  return (
    <main className="nf focus-install">
      <Link href="/" aria-label="StudyLoop home">
        <Logo />
      </Link>
      <div className="nf__body">
        <p className="eyebrow">
          <span className="eyebrow__rule" aria-hidden />
          Focus lock
        </p>
        <h1 className="display display--md">Block distractions while you study.</h1>
        <p className="body muted">
          StudyLoop is a website, and browsers don’t let a website block other sites. This small extension does it for
          you: when a session starts, the sites below are blocked in this browser until the timer ends.
        </p>

        <ol className="focus-install__steps">
          <li>
            <a className="btn btn--primary" href="/studyloop-focus-lock.zip" download>
              Download the extension
            </a>
          </li>
          <li>Unzip it. You get a folder called <b>focus-lock</b>.</li>
          <li>
            In Chrome, Edge or Brave, open <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top
            right).
          </li>
          <li>
            Click <b>Load unpacked</b> and pick the <b>focus-lock</b> folder.
          </li>
          <li>
            Optional: open the extension’s <b>Details</b> and turn on <b>Allow in Incognito</b>, so a private window
            can’t get around it.
          </li>
          <li>Reload StudyLoop. Session setup should say “blocker connected”.</li>
        </ol>

        <h2 className="h-section">What gets blocked</h2>
        <ul className="focus-install__groups">
          {BLOCK_GROUPS.map((g) => (
            <li key={g.id}>
              <b>{g.label}:</b> {g.examples}
            </li>
          ))}
        </ul>

        <h2 className="h-section">What it can’t do yet</h2>
        <p className="body muted">
          It only covers this browser on this computer. Phone apps such as Instagram, Snapchat or WhatsApp need the
          StudyLoop phone app, which isn’t built yet. Removing the extension also removes the lock.
        </p>

        <Link href="/" className="btn btn--ghost">
          Back to StudyLoop
        </Link>
      </div>
    </main>
  );
}
