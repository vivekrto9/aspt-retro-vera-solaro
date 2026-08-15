import { activeLocales, localizePath } from "../../data/localization-contract.ts";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

const ROBOTS_DISALLOW = [
  "/api/",
  "/_emdash",
] as const;

const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const normalizedOrigin = (origin: string) => origin.replace(/\/$/, "");

export const resolveSeoOrigin = (fallbackOrigin: string, siteUrl?: string) => {
  const configured = (siteUrl ?? "").trim();
  if (!configured) return fallbackOrigin;

  try {
    return new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`).origin;
  } catch {
    return fallbackOrigin;
  }
};

export const buildPublicSitemapXml = (origin: string, now = new Date()) => {
  const baseUrl = normalizedOrigin(origin);
  const lastmod = now.toISOString();
  const localizedUrls = PUBLIC_ROUTES.flatMap((route) =>
    activeLocales.map((locale) => ({
      loc: `${baseUrl}${localizePath(route, locale.code)}`,
      lastmod,
    })),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...localizedUrls.flatMap((url) => [
      "  <url>",
      `    <loc>${xmlEscape(url.loc)}</loc>`,
      `    <lastmod>${xmlEscape(url.lastmod)}</lastmod>`,
      "  </url>",
    ]),
    "</urlset>",
  ].join("\n");
};

export const buildPublicRobotsTxt = (origin: string) => {
  const baseUrl = normalizedOrigin(origin);
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Disallow generated-site private and operational routes",
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");
};

const LLMS_SECTIONS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ path: string; label: string; note: string }>;
}> = [
  {
    title: "Overview",
    links: [
      {
        path: "/",
        label: "Home",
        note: "Public overview of this site and its visible visitor-facing content.",
      },
    ],
  },
];

export const buildPublicLlmsTxt = (
  origin: string,
  settings: { brandName?: string; seoDescription?: string } = {},
) => {
  const baseUrl = normalizedOrigin(origin);
  const brandName = settings.brandName || "Base Template";
  const seoDescription = settings.seoDescription || "";
  const lines: string[] = [`# ${brandName}`, ""];

  if (seoDescription) {
    lines.push(`> ${seoDescription}`, "");
  }

  for (const section of LLMS_SECTIONS) {
    lines.push(`## ${section.title}`);
    for (const link of section.links) {
      lines.push(`- [${link.label}](${baseUrl}${link.path}): ${link.note}`);
    }
    lines.push("");
  }

  lines.push(
    "## Sitemap",
    `- [XML sitemap](${baseUrl}/sitemap.xml): Full list of indexable public pages.`,
    "",
  );

  return lines.join("\n");
};

export const isPublicSeoRoute = (pathname: string) =>
  pathname === "/sitemap.xml" || pathname === "/robots.txt" || pathname === "/llms.txt";
