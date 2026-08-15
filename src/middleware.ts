import emdashMiddleware from "emdash/middleware";
import { defineMiddleware, sequence } from "astro:middleware";

import {
  buildPublicLlmsTxt,
  buildPublicRobotsTxt,
  buildPublicSitemapXml,
  resolveSeoOrigin,
} from "./server/generated-site/public-seo-routes.ts";
import generatedSettings from "./generated/site-settings.json";
import { astropagesContentReleaseMiddleware } from "./server/generated-site/content-release-middleware.ts";

const publicSeoMiddleware = defineMiddleware(async (context, next) => {
  const seoOrigin = resolveSeoOrigin(context.url.origin, generatedSettings.siteSettings.siteUrl);

  if (context.url.pathname === "/sitemap.xml") {
    return new Response(buildPublicSitemapXml(seoOrigin), {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }

  if (context.url.pathname === "/robots.txt") {
    return new Response(buildPublicRobotsTxt(seoOrigin), {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  if (context.url.pathname === "/llms.txt") {
    return new Response(buildPublicLlmsTxt(seoOrigin, generatedSettings.siteSettings), {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return next();
});

export const onRequest = sequence(
  emdashMiddleware,
  astropagesContentReleaseMiddleware,
  publicSeoMiddleware,
);
