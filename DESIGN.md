# Design — Warm Editorial Foundation

This document describes the implemented customer-site design family. It treats current page, style, content, asset, and interaction sources as production truth while separating shared foundations from route-specific art direction and editing overlays.

## Design Identity

**Warm Editorial Foundation** combines paper-like neutrals, dark editorial serif headlines, practical sans-serif controls, and a restrained warm accent. The shared pages are quiet and spacious; hierarchy comes from scale and weight rather than decoration. The `/lead-generation-demo` sample intensifies the same warm editorial relationship with photography, near-black surfaces, amber light, and immersive composition. AstroPages Content Studio is deliberately a separate tool layer: compact, dark, elevated, and state-dense.

The site currently has three visual layers:

| Layer | Evidence | Role |
| --- | --- | --- |
| Neutral foundation | `src/styles/base.css`, `src/layouts/BaseLayout.astro` | Home, account routes, and 404 typography, color, containers, cards, buttons, and forms |
| Campaign exception | `src/styles/product-lead-demo.css`, `src/pages/lead-generation-demo.astro`, `src/data/product-lead-demo.ts` | Northstar sample product story and lead flow |
| Builder overlay | `src/builder/BuilderStyles.astro`, `src/builder/BuilderToolbar.astro`, `src/builder/BuilderClient.astro` | Authenticated Content Studio launcher, menu, inspector, editing dock, selection, review, save, publish, and error feedback |

The family is not the Northstar brand. Northstar is sample content demonstrating how a customer campaign can become more cinematic without abandoning editorial type, warm color, direct actions, or clear state feedback.

## Production Source Map

| Source | Authority |
| --- | --- |
| `src/layouts/BaseLayout.astro` | Shared document shell, locale, metadata, generated settings, base stylesheet, and optional Builder toolbar |
| `src/styles/base.css` | Shared visual tokens and selectors for home, auth, and 404 |
| `src/pages/index.astro` | Neutral home composition, navigation, feature cards, footer, logo fallback, and Builder mounting |
| `src/pages/login.astro` | Login copy, form, pending text, API error text, and success redirect |
| `src/pages/signup.astro` | Account-creation copy, fields, pending text, API error text, and login redirect |
| `src/pages/forgot-password.astro` | Reset-request copy, pending/result feedback, and login return |
| `src/pages/reset-password.astro` | New-password fields, mismatch error, pending/result feedback, and delayed login redirect |
| `src/pages/404.astro` | Minimal centered not-found composition and source-default copy |
| `src/pages/lead-generation-demo.astro` | Campaign sections, native dialog, lead form, share action, success state, and client interactions |
| `src/styles/product-lead-demo.css` | Campaign tokens, image treatment, responsive composition, dialog, form states, and motion |
| `src/data/public-copy.ts` | Home, chrome, SEO, and 404 source defaults |
| `src/data/product-lead-demo.ts` | Isolated Northstar product, CTA, form, footer, image, price, and SEO copy |
| `src/generated/site-settings.json` | Generated settings input. `BaseLayout.astro` directly consumes `defaultLocale`, `primaryColor`, and `brandName`, and passes the settings to `src/server/generated-site/seo.ts`, which also consumes `seoTitle`, `seoDescription`, and `contactEmail`. The visual metadata fields `navigationMode`, `tone`, `typography`, and `buttonStyle` currently have no consumers under `src/` |
| `src/builder/registry.ts` | Editable home/chrome/not-found schemas and release targets |
| `src/builder/public-page.ts` | Published/default home and chrome resolution plus editable-field attributes |
| `src/builder/BuilderToolbar.astro` | Builder overlay structure, labels, tabs, controls, previews, and ARIA relationships |
| `src/builder/BuilderClient.astro` | Builder menu, selection, inline editing, draft/review/publish, preview, and error transitions |
| `src/builder/BuilderStyles.astro` | Builder-only tokens, responsive overlay geometry, selected-field outlines, status colors, and disabled states |
| `astropages/assets.manifest.json`, `astropages/assets/logo.svg` | Replaceable protected `logo` alias and source artwork |
| `public/images/product-lamp-hero.png` | Northstar campaign photograph |
| `src/server/aggregator/admin-sso.ts` | Separate browser-safe Content Studio sign-in error panel and its inline visual treatment |

`src/layouts/BaseAdminLayout.astro` is a separate utility shell; current public pages use `BaseLayout.astro`. `src/components/` contains only `.gitkeep`, so repeated public patterns are selectors and page structures rather than extracted components.

Behavioral guardrails include `tests/smoke.test.mjs`, `tests/manifest.test.mjs`, `tests/generated-site/edit-access-stability.test.mjs`, `tests/generated-site/product-interest-lead.test.mjs`, `tests/project-assets-contract.test.mjs`, and `tests/project-assets-seed.test.mjs`. They verify route, Builder, lead, and asset contracts rather than visual appearance.

Current route declarations are narrower than source: `template.manifest.json` lists `/`, `/login`, `/signup`, `/forgot-password`, and `/reset-password`, while `/lead-generation-demo` and `src/pages/404.astro` also render. Treat the files as current visual truth and the omission as an unresolved contract difference.

## Visual Foundations

The neutral palette in `src/styles/base.css` is anchored by `--color-bg: #fbf8f2`, white `--color-panel`, dark brown `--color-text: #231b18`, muted taupe `--color-muted: #706761`, warm line `--color-line: #e5d8c6`, oxblood `--color-primary: #9f2f1f`, and its darker hover `--color-primary-strong: #7f2418`. `src/generated/site-settings.json` repeats the primary as `#9F2F1F` for browser theme color. Keep semantic roles stable when customer colors change: page, panel, text, secondary text, boundary, action, and action emphasis.

`--font-serif` is Georgia with Times fallback; `--font-sans` is Inter followed by system UI. No remote font load is required. Serif belongs to dominant statements (`h1`, campaign headings); sans serif carries navigation, body copy, labels, status, and controls. Neutral `h1` uses `clamp(42px, 8vw, 84px)` with a tight `0.96` line-height. The campaign expands this to `clamp(64px, 10vw, 126px)` and introduces Iowan Old Style/Palatino fallbacks, negative tracking, and lighter weight.

Shared content width is `min(1120px, calc(100% - 40px))`. Large vertical fields create calm: the neutral hero has a `520px` minimum height, auth pages fill the viewport, and feature cards use generous padding and minimum height. Corners are controlled rather than playful: neutral buttons, cards, panels, and inputs use `8px`; the campaign uses pill buttons and an unrounded editorial dialog.

The campaign replaces the neutral variables at `:root` with `#f2eee6`, `#171713`, amber `#d99a3e`, and near-black `#10100e`. The late `.product-demo` selectors in `src/styles/product-lead-demo.css` protect route art direction from shared `.button`, `.features`, and `main` rules. The hero CTA is a purposeful red exception (`#e3412f`) with a pulse, glow, arrow disc, hover lift, and explicit focus ring.

Builder visuals use their own `--builder-*` namespace. Peacock-teal surfaces (`--builder-surface-deep`, `--builder-surface`, `--builder-surface-raised`) stay independent of customer colors; deeper teal controls, restrained copper trim, warm-gold labels, green success, blue information, and pale red danger encode hierarchy and state. Enabled and disabled actions have deliberately different fills and motion. Its Plus Jakarta Sans-first stack falls back to system UI; `astro.config.mjs` configures EmDash with `fonts: false`.

## Composition And Route Hierarchy

**Home `/`.** `src/pages/index.astro` follows header, hero, three-card feature grid, and footer. The header pairs a left brand with four right navigation links. The hero uses eyebrow, single dominant H1, supporting lead, then primary and secondary actions. Feature cards are peers, not competing calls to action. Home copy and chrome resolve through `loadPublicPageContent(Astro, "home")`; source fallbacks live in `src/data/public-copy.ts`.

**Lead demo `/lead-generation-demo`.** The route is intentionally immersive: absolute overlay header; full-viewport photographic hero; numbered three-column highlights; asymmetrical product detail; dark centered closing CTA; shareable URL band; split footer; and modal enquiry. `bodyClass="product-demo"` scopes authoritative exceptions. Its `builderEdit` and `chromeEdit` functions currently return empty objects and no `builderToolbar` prop is passed, so its apparent editable markers are inert and its copy comes directly from `src/data/product-lead-demo.ts`.

**Auth routes.** `/login`, `/signup`, `/forgot-password`, and `/reset-password` share `.auth-body`, `.auth-page`, `.auth-copy`, `.auth-panel`, and `.auth-form`. Desktop uses a wide editorial message beside a `320px` to `420px` panel. Each page changes only the task copy, fields, links, and script behavior. Copy is hard-coded in the route files, not sourced from Builder defaults.

**404.** `src/pages/404.astro` reduces the family to eyebrow, H1, short explanation, and home action in `.not-found`, vertically centered over the full viewport. It calls `getHomeDefaults("en")` directly. Although `src/builder/registry.ts` defines `site_pages/not_found_page`, this page does not call `loadPublicPageContent` or mount the toolbar; the registry-to-render connection is therefore not established in current code.

**Builder.** Only home supplies `builderToolbar` to `BaseLayout.astro`. Authenticated access reveals a draggable bottom-right launcher without changing ordinary public rendering; Astro development mode grants this access locally without SSO, while deployed environments retain session, role, CSRF, and publish checks. Studio mode is entered by `?preview=1` or the `astropages-content-studio` cookie. The overlay progresses from the launcher and its clickable summary to the main menu, editing dock, and inspector; the removed floating context pill is not rendered, and customer content remains visible beneath the tool layer.

## Component And State Grammar

Shared public patterns are structural rather than componentized:

| Pattern | Selectors and behavior |
| --- | --- |
| Brand/navigation | `.brand`, `.site-header`, `nav`; home requests `/_assets/aliases/logo/logo.svg` and reveals `.brand-fallback` on image error |
| Editorial cue | `.eyebrow`; warm accent, compact bold text, with uppercase/tracking added only by the campaign |
| Primary action | `.button.primary` or `.auth-form button`; filled accent, white text in the shared layer, stronger hover color |
| Secondary action | `.button.secondary`; bordered panel on neutral pages, translucent dark glass over campaign imagery |
| Feature grouping | `.features`; three equal peers on desktop and one column on small screens |
| Auth panel | `.auth-panel`, `.auth-form`; bordered white task surface, stacked labels, full-width controls, reserved status area |
| Not-found action | `.not-found` plus shared `.button.primary`; no alternate navigation or decoration |

Lead interactions in `src/pages/lead-generation-demo.astro` use `data-open-lead` and `data-close-lead` to open/close a native `<dialog>`, lock body scrolling, and focus the first input after 120ms. Backdrop click closes it. Submission runs native `reportValidity()`, disables `.form-submit`, reports “Sending your request…”, then either shows `.form-success` and a lead reference or writes an API message to `.form-status`. `[hidden]` is authoritative. The copy control reports success or fallback through `[data-copy-status]` and restores its label after 1.8 seconds.

Auth scripts reserve `.auth-form__status` for pending, API result, and error text. Reset-password mismatch is handled before network submission. Current controls do not add a route-specific error border; text and native validity UI carry the error state.

Builder state is attribute-driven. `[hidden]` controls menu, popover, inspector, dock, and empty sections, while panel closing waits for the approved exit motion. `data-state` distinguishes idle, unsaved, saving, publishing, draft, published, and error status pills. `data-builder-active`, `aria-expanded`, and `aria-selected` expose active launcher/tabs. Disabled save, review, and publish controls use a flat muted treatment and do not animate. In edit mode, `[data-builder-edit]` gets a text cursor; hover, selection, and `[data-builder-editing]` receive the builder accent outline and wash. Inline text and placeholder editing track changes live; Enter commits, Escape restores, and blur records a pending change. The launcher and “Done” share the same guarded close behavior, showing `Save this draft before closing edit mode.` as an inline warning when local edits remain. Saved-draft counts update from the diff endpoint without requiring a page refresh.

## Responsive Behavior

The public breakpoint is `@media (max-width: 760px)` in both CSS files. Neutral gutters reduce from `40px` total to `28px`; header navigation wraps under the brand; the hero removes its minimum height; features become one column; auth changes from two columns to one; auth spacing tightens; and panels reduce from `32px` to `24px` padding. Type remains fluid rather than receiving a small fixed mobile size.

The campaign uses the same `760px` threshold but changes composition more aggressively. Its hero becomes at least `780px`, aligns content to the bottom, shifts image focal position to `64%`, and swaps the side gradient for a bottom-heavy shade. The in-page nav link hides while “Request details” remains. Features become separated rows, product detail becomes one column, footer stacks, and the share band becomes one column. The dialog becomes a bottom-aligned full-width sheet; the visual half hides, content scrolls, fields stack, and content padding tightens.

Builder overlays use `@media (max-width: 720px)`: 12px edge offsets, a 60px launcher, a near-full-width menu/dock, single-column menu footer actions, and a viewport-bounded inspector between 18px and 86px. The launcher position persists and is re-clamped after resizing. At `@media (min-width: 980px)`, the inspector and visible editing dock keep a 20px gap and cap their heights to prevent viewport overflow.

The campaign's `@media (prefers-reduced-motion: reduce)` disables only `.hero-primary-cta` pulsing. The hero image, hero-copy, and dialog entrance animations remain active in current CSS; do not describe the route as fully reduced-motion compliant.

## Imagery Symbols And Assets

The replaceable customer logo is seeded at `astropages/assets/logo.svg`, declared by `astropages/assets.manifest.json` as protected, customer-visible, and replaceable, then requested through the stable `/_assets/aliases/logo/logo.svg` URL. The SVG is a red rounded-square plus mark with “Base Template” and “ASTROPAGES STARTER” wordmarks. Home intentionally uses empty image alt inside a labeled brand link and falls back to editable brand text on load error. The same alias supplies favicon and default social imagery in `BaseLayout.astro` and `src/data/public-copy.ts`.

`public/images/product-lamp-hero.png` is the only direct public image. It is a warm, low-key photograph of a matte-black lamp on a walnut desk. The hero uses meaningful alt text from `product_image_alt`; the dialog repeats it decoratively with empty alt. Dark gradients protect text contrast and direct focus from copy to product. Number labels `01` to `03`, arrows `↗`, close `×`, and success `✓` are interface symbols. Content Studio uses an inline pencil/edit SVG and a stroke-based north-east preview arrow, both decorative inside properly named buttons.

Do not promote the lamp, plus mark, arrows, or Northstar wordmark into permanent customer identity. New imagery needs a deliberate focal point, enough quiet area for adjacent copy, truthful alt treatment, and a route-specific crop at both compositions.

## Content Voice And Customer Adaptation

Shared source copy in `src/data/public-copy.ts` is direct, neutral, and infrastructure-aware because home is a starter experience. Sentences are short, headings are declarative, and CTAs name the result: “Start editing,” “View health API,” and “Go home.” Generated settings record `tone: "neutral"` and `typography: "editorial"` as currently unconsumed metadata; customer copy may replace technical language while retaining clarity and hierarchy.

Northstar copy is warmer and product-led: sensory benefit first, material proof second, direct enquiry last. It is sample campaign content, including the rupee price, and does not establish a required product, locale, currency, or market. Account copy is intentionally plain and task-focused. Builder copy uses operational verbs and explicit state language: edit, preview, save draft, review, publish, done, published, and error.

Adapt customer name, palette, logo, image, claims, CTA, locale, and metadata together. Keep one dominant promise per view, make supporting copy earn its place, and avoid invented sector language. `src/data/localization-contract.ts` currently activates English only, uses `?locale=`, and declares no RTL support; catalog availability is not evidence that translated layouts or RTL have been verified.

## Accessibility Floor

Preserve the semantic and state foundations already present: labeled navigation, one route H1, labeled form controls, autocomplete/input-mode hints, required/minlength/maxlength constraints, native `<dialog>`, named dialog and closing sections, live status regions on the lead flow, descriptive image alt, decorative empty alt, button elements for actions, and links for navigation.

Keyboard behavior must retain dialog focus entry, Escape handling where implemented, Builder tab semantics, Enter/Escape inline-edit behavior, and visible selection. Neutral auth inputs define a red border and 3px outline on `:focus`; the campaign hero primary CTA defines `:focus-visible`. Other links, buttons, lead fields, and Builder controls largely depend on browser focus defaults or border changes, so future styling must add rather than remove clear focus indication.

Do not rely on color or animation alone for status. Keep text labels for pending, error, draft, published, copied, and success states. Preserve the existing 40px to 48px sizing where it applies to primary public and Builder action controls, but do not treat it as a system-wide minimum. `src/builder/BuilderStyles.astro` sets `.builder-inspector-header button` and `.builder-inspector-tabs button` to a 34px minimum height, while `src/styles/product-lead-demo.css` makes `.dialog-close` 36px square; these compact, implementation-specific controls are accessibility risks to review before reuse, not target sizes. Avoid claiming contrast certification or complete focus trapping: no automated visual accessibility test establishes either in the current sources.

## Extension Rules

1. Start with `BaseLayout.astro` and `src/styles/base.css`; create a route stylesheet only when the page has a real art-direction exception.
2. Reuse semantic roles and the 1120px measure before adding new colors, radii, widths, or interaction patterns.
3. Keep one clear H1 and action hierarchy. A campaign may become immersive, but account, error, and utility journeys stay calm and task-first.
4. Scope exceptions under a body class, as `.product-demo` does, so shared selectors remain predictable.
5. Put customer-editable public copy in the content path and wire its actual Builder target. Do not add decorative `builderEdit` calls that resolve to empty attributes.
6. Keep Content Studio colors and geometry in `BuilderStyles.astro`; customer themes must not make the editing tool look like public content.
7. Add complete hover, focus-visible, disabled, pending, error, success, empty, and reduced-motion behavior with every new interactive pattern.
8. Validate desktop and mobile composition with real content lengths, image crops, native validity, API failure, and keyboard selection; source tests alone are not visual evidence.
9. Treat `src/generated/site-settings.json` as generated input and rendered CSS/pages as current behavior when they differ.
10. Update route declarations, content/asset contracts, and relevant behavioral tests when a customer-visible route or editable source becomes part of the supported site.
