import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildPublicSeo,
  buildWebSiteJsonLd,
  resolveSiteRequestUrl,
} from "../src/server/generated-site/seo.ts";
import {
  buildPublicLlmsTxt,
  buildPublicRobotsTxt,
  buildPublicSitemapXml,
  isPublicSeoRoute,
  resolveSeoOrigin,
} from "../src/server/generated-site/public-seo-routes.ts";

const siteSettings = {
  brandName: "Example Brand",
  siteUrl: "example.com",
  seoTitle: "Example Brand Home",
  seoDescription: "A neutral example website.",
  contactEmail: "hello@example.com",
  supportPhone: "+1 555 0100",
};

test("canonical configuration rebases public metadata while preserving request paths", () => {
  assert.equal(
    resolveSiteRequestUrl("https://preview.example.workers.dev/path?locale=en", "example.com"),
    "https://example.com/path?locale=en",
  );
  assert.equal(
    resolveSiteRequestUrl("https://preview.example.workers.dev/path", "not a url"),
    "https://preview.example.workers.dev/path",
  );

  const seo = buildPublicSeo({
    requestUrl: "https://preview.example.workers.dev/?preview=1",
    siteSettings,
    locale: "en",
    canonicalPath: "/",
  });

  assert.equal(seo.canonicalUrl, "https://example.com/");
  assert.equal(seo.og.image, "https://example.com/_assets/aliases/logo/logo.svg");
  assert.equal(seo.twitter.image, "https://example.com/_assets/aliases/logo/logo.svg");
  assert.deepEqual(seo.alternates, [
    { locale: "en", href: "https://example.com/" },
    { locale: "x-default", href: "https://example.com/" },
  ]);
});

test("site-wide and page-specific JSON-LD use the configured canonical origin", () => {
  const requestUrl = "https://preview.example.workers.dev/guides/example";
  const organization = buildOrganizationJsonLd({ siteSettings, requestUrl });
  const website = buildWebSiteJsonLd({ siteSettings, requestUrl });
  const breadcrumbs = buildBreadcrumbJsonLd({
    requestUrl,
    siteUrl: siteSettings.siteUrl,
    items: [
      { name: "Guides", path: "/guides" },
      { name: "Example", path: "/guides/example" },
    ],
  });
  const article = buildArticleJsonLd({
    requestUrl,
    siteSettings,
    headline: "Example guide",
    description: "A visible example guide.",
    authorName: "Example Author",
    datePublished: "2026-08-05",
    image: "/images/example.png",
    url: "/guides/example",
  });

  assert.equal(organization.url, "https://example.com");
  assert.equal(website.url, "https://example.com");
  assert.equal(breadcrumbs.itemListElement[1].item, "https://example.com/guides/example");
  assert.equal(article?.mainEntityOfPage, "https://example.com/guides/example");
  assert.equal(article?.image, "https://example.com/images/example.png");
  assert.equal(article?.dateModified, "2026-08-05");
  assert.equal(buildArticleJsonLd({ requestUrl, siteSettings, headline: " " }), null);
});

test("FAQ schema contains only complete visible question and answer pairs", () => {
  const faq = buildFaqJsonLd([
    { question: "What is included?", answer: "Only content visible on the page." },
    { question: "Missing answer", answer: " " },
  ]);

  assert.equal(faq?.mainEntity.length, 1);
  assert.equal(faq?.mainEntity[0].name, "What is included?");
  assert.equal(buildFaqJsonLd([]), null);
});

test("public discovery routes use the canonical domain and neutral site content", () => {
  const canonicalOrigin = resolveSeoOrigin("https://preview.example.workers.dev", siteSettings.siteUrl);
  const sitemap = buildPublicSitemapXml(canonicalOrigin, new Date("2026-08-05T00:00:00.000Z"));
  const robots = buildPublicRobotsTxt(canonicalOrigin);
  const llms = buildPublicLlmsTxt(canonicalOrigin, siteSettings);

  assert.equal(canonicalOrigin, "https://example.com");
  assert.equal(resolveSeoOrigin("https://preview.example.workers.dev", "not a url"), "https://preview.example.workers.dev");
  assert.match(sitemap, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.com\/login<\/loc>/);
  assert.doesNotMatch(sitemap, /preview\.example\.workers\.dev/);
  assert.match(robots, /Disallow: \/_emdash/);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
  assert.match(llms, /^# Example Brand$/m);
  assert.match(llms, /\[Home\]\(https:\/\/example\.com\/\)/);
  assert.match(llms, /\[XML sitemap\]\(https:\/\/example\.com\/sitemap\.xml\)/);
  assert.doesNotMatch(llms, /kundli|vedic|jyotish|horoscope/i);
});

test("all public SEO endpoints are recognized without matching unrelated routes", () => {
  assert.equal(isPublicSeoRoute("/robots.txt"), true);
  assert.equal(isPublicSeoRoute("/sitemap.xml"), true);
  assert.equal(isPublicSeoRoute("/llms.txt"), true);
  assert.equal(isPublicSeoRoute("/_emdash/api/mcp"), false);
  assert.equal(isPublicSeoRoute("/api/astropages/generated-site/health"), false);
});
