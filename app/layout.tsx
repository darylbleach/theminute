import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Bebas_Neue, Geist, IBM_Plex_Mono } from "next/font/google";
import { SITE_NAME, siteUrl } from "@/lib/config";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — a one-minute standup timer`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Keep standups moving with a shared 60-second timer, running order, and automatic speaker changes.",
  applicationName: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} — standups that stay standing`,
    description: "A shared 60-second timer for fast team standups.",
    url: siteUrl(),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — standups that stay standing`,
    description: "A shared 60-second timer for fast team standups.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
