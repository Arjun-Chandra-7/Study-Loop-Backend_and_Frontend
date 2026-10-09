import localFont from "next/font/local";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppLayout } from "@/components/cockpit/AppLayout";
import { AtelierFooter, AtelierHeader } from "@/components/atelier/Chrome";
import { AtelierStory, AtelierClosing } from "@/components/atelier/Story";
import { MotionPrefs } from "@/components/motion/MotionPrefs";
import { MusicReturn } from "@/components/music/MusicReturn";
import { QuietLock } from "@/components/motion/QuietLock";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { FocusGuard } from "@/components/session/FocusGuard";
import { HeadphoneNotice } from "@/components/session/HeadphoneNotice";
import { LoopNowPlaying } from "@/components/session/LoopSound";
import { SessionPrompts } from "@/components/session/SessionPrompts";
import { SessionRecovery } from "@/components/session/SessionRecovery";
import { FirstRun } from "@/components/onboarding/FirstRun";
import "@/components/atelier/atelier.css";

const display = localFont({
  src: [
    { path: "../../app/fonts/CormorantGaramond-Light.ttf", weight: "300", style: "normal" },
    { path: "../../app/fonts/CormorantGaramond-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../app/fonts/CormorantGaramond-LightItalic.ttf", weight: "300", style: "italic" },
    { path: "../../app/fonts/CormorantGaramond-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-atelier",
  display: "swap",
});

export function AtelierHome() {
  return (
    <AuthGate>
      <MotionPrefs>
        <MusicReturn />
        <SmoothScroll />
        <QuietLock />
        <div className={`atelier ${display.variable}`}>
          <a className="skip" href="#cockpit">
            Skip to session controls
          </a>
          <AtelierHeader />
          <main>
            <AtelierStory />
            <section className="at-session" id="session" data-tone="light" aria-labelledby="at-session-title">
              <header className="at-session__head" data-reveal>
                <p className="at-eyebrow">The session</p>
                <h2 id="at-session-title" className="at-display at-display--md">
                  The session
                </h2>
                <p className="at-lede">Pair the band, choose what you are studying, and begin.</p>
              </header>
              <div id="cockpit" className="at-session__app">
                <AppLayout />
              </div>
            </section>
            <AtelierClosing />
          </main>
          <AtelierFooter />
        </div>
        <SessionPrompts />
        <HeadphoneNotice />
        <LoopNowPlaying />
        <FocusGuard />
        <SessionRecovery />
        <FirstRun />
      </MotionPrefs>
    </AuthGate>
  );
}
