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

        <h2 className="h-section">Chrome, Edge, Brave, Arc</h2>
        <ol className="focus-install__steps">
          <li>
            <a className="btn btn--primary" href="/studyloop-focus-lock.zip" download>
              Download for Chrome
            </a>
          </li>
          <li>
            Unzip it. You get a folder called <b>studyloop-focus-lock</b> with <code>manifest.json</code> inside.
          </li>
          <li>
            Open <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top right).
          </li>
          <li>
            Click <b>Load unpacked</b> and pick the <b>studyloop-focus-lock</b> folder (the one that contains{" "}
            <code>manifest.json</code>).
          </li>
          <li>
            Optional: in the extension’s <b>Details</b>, turn on <b>Allow in Incognito</b>.
          </li>
        </ol>

        <h2 className="h-section">Firefox, Zen</h2>
        <ol className="focus-install__steps">
          <li>
            <a className="btn btn--primary" href="/studyloop-focus-lock-firefox.xpi" download>
              Download for Firefox
            </a>
          </li>
          <li>
            Open <code>about:debugging#/runtime/this-firefox</code>.
          </li>
          <li>
            Click <b>Load Temporary Add-on…</b> and pick the downloaded <b>.xpi</b> file.
          </li>
          <li>
            Temporary add-ons are removed when the browser restarts, so repeat this after a restart. A permanent install
            needs the add-on signed by Mozilla.
          </li>
        </ol>

        <p className="body muted">
          Then reload StudyLoop. Session setup should say “blocker connected”.
        </p>

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
