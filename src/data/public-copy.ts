import type { SupportedLocale } from "./localization-contract.ts";

export type HomePageContent = Record<string, string>;

const homeDefaults: HomePageContent = {
  title: "Starter Site",
  hero_kicker: "AstroPages Base Template",
  hero_title: "Build your next website from a clean AstroPages starter",
  hero_body:
    "This base keeps the shared Astro, Cloudflare, EmDash, SEO, and editor plumbing while leaving the business model and content architecture ready for your next project.",
  hero_primary_cta: "Start editing",
  hero_secondary_cta: "View health API",
  feature_1_title: "Editable content",
  feature_1_body: "Builder-ready content fields are wired through EmDash drafts and publishing.",
  feature_2_title: "Cloudflare runtime",
  feature_2_body: "Worker, D1, R2, KV, Images, and deployment scripts are preserved.",
  feature_3_title: "SEO defaults",
  feature_3_body: "Canonical URLs, Open Graph, Twitter cards, sitemap, and robots routes are included.",
  footer_note: "Replace these starter sections with your website-specific pages, data, and integrations.",
  not_found_title: "Page not found",
  not_found_body: "This route is not part of the starter template yet.",
  not_found_cta: "Go home",
  seo_title: "AstroPages Base Template",
  seo_description: "A clean AstroPages starter for building a new generated website.",
  seo_canonical_path: "/",
  seo_robots: "index,follow",
  og_title: "AstroPages Base Template",
  og_description: "Start a new Cloudflare-backed AstroPages website with shared infrastructure already wired.",
  og_image: "/_assets/aliases/logo/logo.svg",
  og_image_alt: "AstroPages Base Template",
  twitter_card: "summary_large_image",
  twitter_title: "AstroPages Base Template",
  twitter_description: "A reusable base template for new AstroPages websites.",
  twitter_image: "/_assets/aliases/logo/logo.svg",
};

const chromeDefaults: HomePageContent = {
  title: "Site Chrome",
  brand_name: "Base Template",
  nav_home: "Home",
  footer_brand_name: "Base Template",
  footer_about: "A reusable AstroPages starter for new generated websites.",
};

export const getHomeDefaults = (_locale: SupportedLocale = "en"): HomePageContent => ({
  ...homeDefaults,
});

export const getChromeDefaults = (_locale: SupportedLocale = "en"): HomePageContent => ({
  ...chromeDefaults,
});
