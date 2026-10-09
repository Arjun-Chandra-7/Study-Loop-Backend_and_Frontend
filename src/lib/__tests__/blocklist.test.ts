import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES, blockedDomains, isBlockedHost } from "../focus/blocklist";

describe("focus blocklist", () => {
  it("blocks the apps students asked about, including subdomains", () => {
    for (const host of ["www.instagram.com", "m.youtube.com", "youtu.be", "discord.com", "web.whatsapp.com", "web.snapchat.com", "poki.com", "www.pornhub.com"]) {
      expect(isBlockedHost(host, ALL_CATEGORIES)).toBe(true);
    }
  });

  it("catches unlisted adult sites by name", () => {
    expect(isBlockedHost("some-new-porn-site.net", ALL_CATEGORIES)).toBe(true);
  });

  it("leaves study sites and lookalike names alone", () => {
    for (const host of ["wikipedia.org", "khanacademy.org", "docs.google.com", "notinstagram.com", "essex.ac.uk", "study-loop.vercel.app"]) {
      expect(isBlockedHost(host, ALL_CATEGORIES)).toBe(false);
    }
  });

  it("only blocks the chosen categories", () => {
    expect(isBlockedHost("youtube.com", ["social"])).toBe(false);
    expect(blockedDomains(["video"])).toContain("youtube.com");
    expect(blockedDomains(["video"])).not.toContain("instagram.com");
  });
});
