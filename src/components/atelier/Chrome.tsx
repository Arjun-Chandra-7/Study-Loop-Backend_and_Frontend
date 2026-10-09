"use client";

import { useEffect, useState } from "react";
import { DesignSwitch } from "@/components/designs/DesignSwitch";
import { scrollToEl } from "@/components/motion/SmoothScroll";

const NAV = [
  { href: "#object", label: "The band" },
  { href: "#inside", label: "Inside" },
  { href: "#craft", label: "Craft" },
  { href: "#sound", label: "Sound" }, 
  { href: "#loop", label: "The loop" },
];

function jump(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault();
  scrollToEl(document.querySelector(href));
}

export function AtelierHeader() {
  const [tone, setTone] = useState<"dark" | "light">("dark");
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".atelier main [data-tone], .atelier .at-footer"));
    const probe = () => {
      setSolid(window.scrollY > 24);
      const y = 32;
      const hit = sections.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= y && r.bottom > y;
      });
      if (hit) setTone(hit.dataset.tone === "light" ? "light" : "dark");
    };
    probe();
    window.addEventListener("scroll", probe, { passive: true });
    window.addEventListener("resize", probe);
    return () => {
      window.removeEventListener("scroll", probe);
      window.removeEventListener("resize", probe);
    };
  }, []);

  return (
    <header className="at-header" data-tone={tone} data-solid={solid || undefined}>
      <a className="at-header__mark" href="#top" onClick={(e) => jump(e, "#top")}>
        StudyLoop
      </a>
      <nav className="at-header__nav" aria-label="Story">
        {NAV.map((item) => (
          <a key={item.href} href={item.href} onClick={(e) => jump(e, item.href)}>
            {item.label}
          </a>
        ))}
      </nav>
      <a className="at-header__cta" href="#session" onClick={(e) => jump(e, "#session")}>
        Begin a session
      </a>
    </header>
  );
}

export function AtelierFooter() {
  return (
    <footer className="at-footer" data-tone="dark">
      <div className="at-footer__grid">
        <div>
          <p className="at-footer__mark">StudyLoop</p>
          <p className="at-footer__note">A study wearable and session companion. Built by Tech Innovators.</p>
        </div>
        <div>
          <p className="at-footer__label">Story</p>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={(e) => jump(e, item.href)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="at-footer__label">Use</p>
          <ul>
            <li>
              <a href="#session" onClick={(e) => jump(e, "#session")}>
                Begin a session
              </a>
            </li>
            <li>
              <a href="/focus-lock">Focus lock extension</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="at-footer__label">Design</p>
          <DesignSwitch current="atelier" />
        </div>
      </div>
      <p className="at-footer__fine">
        StudyLoop reads heart rate and skin conductance. It does not read brain activity. Its audio explores
        findings on alpha, gamma and theta rhythms that are early and mixed. It is not a medical device or a
        treatment.
      </p>
    </footer>
  );
}
