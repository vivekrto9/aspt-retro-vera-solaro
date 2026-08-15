import { activeLocales, type SupportedLocale } from "../data/localization-contract.ts";
import {
  getChromeDefaults,
  getHomeDefaults,
  type HomePageContent,
} from "../data/public-copy.ts";

export type BuilderFieldType = "string" | "text";

export type BuilderSchemaField = {
  slug: string;
  type: BuilderFieldType;
  label: string;
  required?: boolean;
};

export type PageContent = Record<string, string>;

export type BuilderCollectionConfig = {
  slug: string;
  label: string;
  labelSingular: string;
  supports: Array<"drafts" | "revisions" | "preview">;
  fields: BuilderSchemaField[];
};

export type BuilderEntryConfig = {
  collectionConfig: BuilderCollectionConfig;
  editableFields: BuilderSchemaField[];
  defaultsByLocale: Record<SupportedLocale, HomePageContent>;
};

export type BuilderContentTarget = {
  collection: string;
  entry: string;
};

export type BuilderReleaseTarget = BuilderContentTarget & {
  fields: string[];
};

const seoFields = [
  "seo_title",
  "seo_description",
  "seo_canonical_path",
  "seo_robots",
  "og_title",
  "og_description",
  "og_image",
  "og_image_alt",
  "twitter_card",
  "twitter_title",
  "twitter_description",
  "twitter_image",
];

const longTextPatterns = [
  "_body",
  "_about",
  "_description",
  "footer_note",
  "seo_description",
  "og_description",
  "twitter_description",
];

const labelFor = (field: string) =>
  field
    .replace(/^seo_/, "SEO ")
    .replace(/^og_/, "Open Graph ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Cta", "CTA");

const fieldType = (field: string): BuilderFieldType =>
  longTextPatterns.some((pattern) => field.includes(pattern)) ? "text" : "string";

const schemaFieldsFor = (defaults: PageContent): BuilderSchemaField[] =>
  Object.keys(defaults).map((field) => ({
    slug: field,
    type: fieldType(field),
    label: labelFor(field),
    required: ["hero_title", "brand_name", "seo_title"].includes(field),
  }));

const withLocaleDefaults = (
  defaultsFactory: (locale: SupportedLocale) => HomePageContent,
) =>
  Object.fromEntries(
    activeLocales.map((locale) => [locale.code, defaultsFactory(locale.code)]),
  ) as Record<SupportedLocale, HomePageContent>;

const collectionFor = (
  slug: string,
  label: string,
  defaults: PageContent,
): BuilderCollectionConfig => ({
  slug,
  label,
  labelSingular: label.replace(/s$/, ""),
  supports: ["drafts", "revisions", "preview"],
  fields: schemaFieldsFor(defaults),
});

const homeCollection = collectionFor("site_pages", "Site Pages", getHomeDefaults("en"));
const chromeCollection = collectionFor("site_chrome", "Site Chrome", getChromeDefaults("en"));

const entries: BuilderEntryConfig[] = [
  {
    collectionConfig: homeCollection,
    editableFields: schemaFieldsFor(getHomeDefaults("en")),
    defaultsByLocale: withLocaleDefaults(getHomeDefaults),
  },
  {
    collectionConfig: chromeCollection,
    editableFields: schemaFieldsFor(getChromeDefaults("en")),
    defaultsByLocale: withLocaleDefaults(getChromeDefaults),
  },
];

const entryMap = new Map<string, BuilderEntryConfig>([
  ["site_pages/home", entries[0]],
  ["site_pages/not_found_page", entries[0]],
  ["site_chrome/main", entries[1]],
]);

const fieldTargets = new Map<string, BuilderContentTarget>();
for (const field of Object.keys(getHomeDefaults("en"))) {
  fieldTargets.set(field, { collection: "site_pages", entry: "home" });
}
for (const field of Object.keys(getChromeDefaults("en"))) {
  fieldTargets.set(field, { collection: "site_chrome", entry: "main" });
}

export const builderSeoFields = seoFields;
export const builderSeoFieldSet = new Set(seoFields);
export const chromeTarget = { collection: "site_chrome", entry: "main" } as const;

const releaseTargets: BuilderReleaseTarget[] = [
  {
    collection: "site_pages",
    entry: "home",
    fields: Object.keys(getHomeDefaults("en")),
  },
  {
    collection: "site_pages",
    entry: "not_found_page",
    fields: Object.keys(getHomeDefaults("en")),
  },
  {
    collection: "site_chrome",
    entry: "main",
    fields: Object.keys(getChromeDefaults("en")),
  },
];

export const getBuilderEntryConfig = (collection: string, entry: string) =>
  entryMap.get(`${collection}/${entry}`);

export const getBuilderPageTargets = (page: string): BuilderContentTarget[] => {
  if (page === "not_found_page") {
    return [{ collection: "site_pages", entry: "not_found_page" }];
  }
  return [{ collection: "site_pages", entry: "home" }];
};

export const getBuilderReleaseTargets = (): BuilderReleaseTarget[] =>
  releaseTargets.map((target) => ({
    collection: target.collection,
    entry: target.entry,
    fields: [...target.fields],
  }));

export const getBuilderFieldTarget = (field: string, page = "home") => {
  if (field.startsWith("not_found_")) {
    return { collection: "site_pages", entry: "not_found_page" };
  }
  const target = fieldTargets.get(field);
  if (!target && page === "not_found_page") {
    return { collection: "site_pages", entry: "not_found_page" };
  }
  return target;
};

export const isBuilderEditableField = (field: string) =>
  fieldTargets.has(field) || field.startsWith("not_found_");

export const getBuilderFieldLabel = (field: string) => labelFor(field);
