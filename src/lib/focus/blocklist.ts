export type BlockCategory = "social" | "video" | "messaging" | "games" | "adult";

export interface BlockGroup {
  id: BlockCategory;
  label: string;
  examples: string;
  domains: string[];
}

export const BLOCK_GROUPS: BlockGroup[] = [
  {
    id: "social",
    label: "Social",
    examples: "Instagram, Snapchat, TikTok, X, Reddit",
    domains: [
      "instagram.com",
      "cdninstagram.com",
      "snapchat.com",
      "tiktok.com",
      "facebook.com",
      "fb.com",
      "x.com",
      "twitter.com",
      "reddit.com",
      "threads.net",
      "pinterest.com",
    ],
  },
  {
    id: "video",
    label: "Video",
    examples: "YouTube, Netflix, Twitch",
    domains: ["youtube.com", "youtu.be", "youtube-nocookie.com", "netflix.com", "primevideo.com", "hotstar.com", "twitch.tv"],
  },
  {
    id: "messaging",
    label: "Chat",
    examples: "WhatsApp, Discord, Telegram",
    domains: ["whatsapp.com", "web.whatsapp.com", "discord.com", "discordapp.com", "discord.gg", "web.telegram.org", "messenger.com"],
  },
  {
    id: "games",
    label: "Games",
    examples: "Poki, CrazyGames, Roblox, Steam",
    domains: [
      "poki.com",
      "crazygames.com",
      "miniclip.com",
      "roblox.com",
      "friv.com",
      "coolmathgames.com",
      "y8.com",
      "kongregate.com",
      "itch.io",
      "now.gg",
      "krunker.io",
      "slither.io",
      "agar.io",
      "chess.com",
      "lichess.org",
      "store.steampowered.com",
      "steamcommunity.com",
      "epicgames.com",
    ],
  },
  {
    id: "adult",
    label: "Adult",
    examples: "Porn sites",
    domains: [
      "pornhub.com",
      "xvideos.com",
      "xnxx.com",
      "xhamster.com",
      "redtube.com",
      "youporn.com",
      "onlyfans.com",
      "chaturbate.com",
      "stripchat.com",
      "spankbang.com",
      "eporner.com",
      "rule34.xxx",
    ],
  },
];

export const ADULT_HOST_PATTERN = "^https?://[^/]*(porn|xxx|xvideo|xnxx|xhamster|hentai|nsfw|onlyfans|camgirl)";

export const ALL_CATEGORIES = BLOCK_GROUPS.map((g) => g.id);

export function blockedDomains(categories: BlockCategory[]): string[] {
  return [...new Set(BLOCK_GROUPS.filter((g) => categories.includes(g.id)).flatMap((g) => g.domains))];
}

export function isBlockedHost(host: string, categories: BlockCategory[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (blockedDomains(categories).some((d) => h === d || h.endsWith(`.${d}`))) return true;
  return categories.includes("adult") && new RegExp(ADULT_HOST_PATTERN).test(`https://${h}/`);
}
