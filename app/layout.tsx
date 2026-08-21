import type { Metadata } from "next";
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
    default: `${SITE_NAME} — $1 buys one minute of the internet`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "One URL owns the entire homepage. $1 = 1 minute. Public queue. Cut the line and the people you skip get paid in credit.",
  applicationName: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} — hold the homepage`,
    description: "$1 buys you one minute of the entire front page.",
    url: siteUrl(),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — hold the homepage`,
    description: "$1 buys you one minute of the entire front page.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
