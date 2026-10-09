import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Permanent_Marker } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { prePaintScript } from "@/lib/palettes";
import { LITE_SCRIPT } from "@/lib/device";
import { installCaptureScript } from "@/lib/pwa";
import "./globals.css";
import "./editorial.css";

const mona = localFont({
  src: "./fonts/MonaSansVF.woff2",
  variable: "--font-mona",
  weight: "200 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});

const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://study-loop-alpha.vercel.app"),
  title: "StudyLoop — Focus, measured differently",
  description:
    "A study wearable and session interface that shows how your physiology changes while you learn.",
  openGraph: {
    title: "StudyLoop — Focus, measured differently",
    description: "A study wearable that shows how your heart rate and skin conductance change while you learn.",
    siteName: "StudyLoop",
    type: "website",
  },
  twitter: { card: "summary_large_image" },

  appleWebApp: { capable: true, title: "StudyLoop", statusBarStyle: "black-translucent" },
  applicationName: "StudyLoop",
};

export const viewport: Viewport = {
  themeColor: "#e9e1cf",
  colorScheme: "light",

  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${mona.variable} ${marker.variable}`}>
      <head>

        <script dangerouslySetInnerHTML={{ __html: prePaintScript() }} />
        <script dangerouslySetInnerHTML={{ __html: LITE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: installCaptureScript() }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerManager />
        <InstallPrompt />
      </body>
    </html>
  );
}
