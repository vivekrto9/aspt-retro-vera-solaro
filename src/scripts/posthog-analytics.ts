import type { PostHog, PostHogInterface } from "posthog-js";

type PublicPosthogConfig = {
  enabled?: boolean;
  projectApiKey?: string;
  host?: string;
};

declare global {
  interface Window {
    astroPagesTrack?: (eventName: string, payload?: Record<string, unknown>) => void;
    posthog?: PostHog | PostHogInterface;
  }
}

const configNode = document.querySelector<HTMLScriptElement>("script[data-posthog-config]");

const readConfig = (): PublicPosthogConfig => {
  try {
    return JSON.parse(configNode?.textContent || "{}") as PublicPosthogConfig;
  } catch {
    return {};
  }
};

const config = readConfig();
const projectApiKey = String(config.projectApiKey || "").trim();
const posthogHost = String(config.host || "https://us.i.posthog.com").replace(/\/$/, "");
let posthogPromise: Promise<PostHog | null> | null = null;

const initializePosthog = (): Promise<PostHog | null> => {
  if (!config.enabled || !projectApiKey) return Promise.resolve(null);
  if (posthogPromise) return posthogPromise;

  posthogPromise = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(projectApiKey, {
        api_host: posthogHost,
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        person_profiles: "identified_only",
        loaded: (client) => {
          window.posthog = client;
          document.documentElement.dataset.posthogReady = "true";
        },
      });
      window.posthog = posthog;
      return posthog;
    })
    .catch(() => {
      document.documentElement.dataset.posthogReady = "false";
      return null;
    });

  return posthogPromise;
};

window.astroPagesTrack = (eventName, payload = {}) => {
  if (!eventName.trim()) return;
  void initializePosthog().then((posthog) => {
    posthog?.capture(eventName, {
      ...payload,
      route: window.location.pathname,
      locale: document.body.dataset.locale || "en",
    });
  });
};

if (config.enabled && projectApiKey) {
  // Analytics consent is intentionally disabled. Start capture immediately once
  // PostHog is connected for the generated site.
  void initializePosthog();

  /*
   * To restore consent-gated tracking, uncomment the banner in BaseLayout.astro
   * and replace the immediate initialization above with this block:
   *
   * const consentStorageKey = "astropages:analytics-consent";
   * const consentBanner = document.querySelector<HTMLElement>("[data-analytics-consent-banner]");
   * const storedConsent = () => window.localStorage.getItem(consentStorageKey);
   * const storeConsent = (value: "granted" | "denied") => window.localStorage.setItem(consentStorageKey, value);
   * const hideBanner = () => { if (consentBanner) consentBanner.hidden = true; };
   * const acceptAnalytics = () => { storeConsent("granted"); hideBanner(); void initializePosthog(); };
   * const declineAnalytics = () => { storeConsent("denied"); hideBanner(); };
   * const consent = storedConsent();
   * if (consent === "granted") void initializePosthog();
   * else if (consent !== "denied" && consentBanner) consentBanner.hidden = false;
   * consentBanner?.querySelector("[data-analytics-consent-accept]")?.addEventListener("click", acceptAnalytics);
   * consentBanner?.querySelector("[data-analytics-consent-decline]")?.addEventListener("click", declineAnalytics);
   */
}
