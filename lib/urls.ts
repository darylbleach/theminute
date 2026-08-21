const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "cutt.ly",
]);

const BLOCKED_HOST_SUFFIXES = [".onion"];

export type PlacementUrl = {
  href: string;
  hostname: string;
};

export function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconFor(hostname: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
}

export function parsePlacementUrl(raw: string): PlacementUrl {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Enter a URL.");
  }
  if (trimmed.length > 2048) {
    throw new Error("That URL is too long.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("That URL is not valid.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("HTTPS only. This is a full-page takeover.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs cannot include credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.includes(".") || hostname.startsWith(".") || hostname.endsWith(".")) {
    throw new Error("Enter a real hostname.");
  }
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_HOSTS.has(hostname.replace(/^www\./, ""))) {
    throw new Error("That host is not allowed.");
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("That host is not allowed.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    throw new Error("IP addresses are not allowed.");
  }

  parsed.hash = "";
  return {
    href: parsed.toString(),
    hostname: hostname.replace(/^www\./, ""),
  };
}

export function sanitizeTagline(raw: string, max = 140) {
  const tagline = raw.replace(/\s+/g, " ").trim();
  if (!tagline) {
    throw new Error("Write one line of copy.");
  }
  if (tagline.length > max) {
    throw new Error(`Keep the line under ${max} characters.`);
  }
  if (/[<>]/.test(tagline)) {
    throw new Error("Plain text only.");
  }
  return tagline;
}
