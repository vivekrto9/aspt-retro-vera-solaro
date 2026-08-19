# Design — Vera Solaro Warm Almanac

This document describes the production design and interaction contract for the Vera Solaro template. The six warm Vera source HTML files in `../retro-html-source/` are the authority for visitor copy, hierarchy, and desktop composition. Production semantics, responsive behavior, provider states, privacy controls, and Content Studio editability are implemented without changing that visual language.

## Visual thesis

The site should feel like a well-used 1970s astrology almanac on a Trieste reading-room desk: cream paper, dark ink, burnt-orange annotations, mustard tabs, aubergine chapter bands, hand-drawn borders, and deliberately imperfect offset shadows. It is intimate and specific, not a generic wellness site or software dashboard.

The canonical type system is:

- Shrikhand for display statements and the Vera signature;
- Libre Baskerville 400/700/italic for long reading and editorial copy;
- Barlow Condensed 400/500/600/700 for labels, navigation, prices, metadata, and controls.

Fonts are self-hosted through the existing package imports in `src/components/vera/VeraFrame.astro`; public pages must not add a remote font stylesheet.

The core palette in `src/styles/vera.css` is Cream `#F4E4C5`, Burnt `#C6491F`, Mustard `#E2A22C`, Aubergine `#3B1E36`, Ink `#2C1810`, Clay `#C77B62`, and Sage `#5E7A4E`. Supporting paper and ink tones may be used only where the source uses them. Cards use 2–3px ink boundaries, 4–10px offset shadows, rounded paper corners, and uppercase tracked labels.

## Source map

| Canonical source | Production surfaces |
| --- | --- |
| `Vera Solaro Astrology.dc.html` and the image-added standalone | Home, global header/footer, supplied home imagery |
| `Vera Solaro Booking.dc.html` | Reading detail, booking, availability, intake, payment, confirmation, waitlist, and failure states |
| `Vera Solaro Pages.dc.html` | Writing, article, About, questions, contact, legal, 404, and closed state |
| `Vera Solaro Letters.dc.html` | Monthly-letter signup, pending, confirmed, sample, archive, and opt-in email |
| `Vera Solaro Account.dc.html` | Sitting overview, reschedule, cancellation, receipt, and reading room |
| `Home.dc.html` | Internal screen inventory only; it is not a visitor homepage |

The dark Midnight Ledger/Verdigris alternatives are not part of this template. Do not mix their blue palette or styling into the warm system.

## Production architecture

`VeraFrame.astro` composes the shared layout, header, footer, consent controls, self-hosted fonts, SEO, and Content Studio overlay. `src/styles/vera.css` owns the public design language. `src/data/vera/content.ts` is the only source-default registry for visitor-facing Vera copy and SEO. `src/data/public-copy.ts` is a compatibility adapter to those same Vera defaults; it must not contain a second copy system.

The existing Content Studio contract contains exactly 22 collection/entry pairs. The same set must remain in:

- `src/data/vera/content.ts` (`veraEntries`);
- `src/builder/registry.ts` release targets;
- `template.manifest.json` public editable entries;
- `src/data/localization-contract.ts` public editable entries.

Every visible static label, paragraph, CTA, error, empty state, consent disclosure, SEO field, and meaningful image alternative belongs to one of those existing entries. Keep each physical collection at or below the 84-field platform ceiling; split fields only across the existing Vera entries. Runtime values such as service price, slot time, booking number, payment state, file metadata, and account data come from authoritative APIs and are inserted with safe text APIs.

Do not add parallel JSON contracts, asset metadata sidecars, or a second content registry. The six standard `astropages/*.json` manifests are the complete top-level manifest boundary.

## Route composition

- `/` preserves the source order: header, sky-note hero and zodiac wheel, stats, sky ticker, portrait/about, three readings, testimonials, journal cards, monthly letter, and four-column footer.
- `/readings` is the three-reading catalog. Each `/readings/[service]` route is a real service-detail screen with source facts, inclusions, preparation, FAQs, and provider-backed availability/booking action.
- `/booking` retains the source four-step journey. Calendly supplies live slots behind the custom source UI; Stripe Elements supplies card collection. Browser state never fabricates a confirmed payment or sitting.
- `/writing` and `/writing/[slug]` read the EmDash `posts` collection through `src/data/blog-posts.ts`; no article, slug, or article link is hardcoded in a route, component, or discovery document. The source-provided English copy (nine listing pieces plus the complete Saturn body) ships as a CMS-loadable fixture in `docs/content-fixtures/`, not as theme code.
- `/letters` exposes the distinct signup, pending, confirmed, and sample compositions rather than merging them into a generic page.
- `/account` exposes only server-authorized customer data and the source overview, move, cancel, receipt, and reading-room states.
- `/closed` changes the global books-open chrome as well as the page body.
- Auth routes are necessary utility surfaces requested for the account feature. Their Studio-backed text follows Vera’s source voice, but must never be represented as literal source copy when no matching source screen exists.

## Imagery and assets

The source package supplies exactly four image byte assets: Vera portrait, ephemeris pages, brass protractor, and night sky. They are registered in the existing Project Assets manifest and served through stable alias URLs. They remain confined to their four authorized home slots.

Other canonical image slots must still exist in their source positions with truthful editable alt text and a designed `VeraImage` placeholder until the project owner supplies media. Do not reuse one of the four home images to fill a missing room, article, letter, map, holiday, avatar, chart, or account artifact.

## Interaction and state truth

Source `div onClick` prototypes become semantic links, buttons, fieldsets, forms, labels, and disclosure controls. Preserve the pixels and copy while adding keyboard operation, visible focus, Escape behavior, focus transfer after panel changes, live regions, disabled/pending states, and reduced-motion behavior.

All commercial state is server-authoritative:

- Calendly availability is queried in bounded seven-day provider windows;
- D1 owns the selected service/mode, twelve-minute hold, intake, quote, gift reservation, and booking status;
- Stripe Elements and signed Stripe webhooks own payment truth;
- Calendly invitees are created or reconciled only through the site policy path;
- account, files, reports, messages, invoices, refunds, and reschedules require verified ownership;
- browser clocks, return URLs, query flags, and custom events never create paid or completed state.

Do not embed a raw Calendly widget; it would replace the source UI. Do not render raw card fields. Do not persist names, email addresses, birth details, or provider secrets in browser storage or analytics.

## Responsive contract

The source defines a fixed 1440px desktop canvas and explicitly leaves mobile unbuilt. Production mobile behavior is therefore derived, not copied. Preserve the desktop hierarchy at source dimensions, then reflow it deliberately:

- keep the primary Book action reachable in the mobile menu;
- stack rails and cards in reading order without moving price/due information after a payment action;
- retain recognizable zodiac and paper ornament at a reduced scale rather than removing the identity;
- use fluid display type, safe gutters, 44px-class public controls, and no horizontal overflow;
- keep long article, legal, letter, receipt, and account content readable at 320–430px widths.

Desktop and mobile must be visually checked with real content and empty/error/provider-blocked states; contract tests alone are not visual evidence.

## Privacy and analytics

The source privacy text originally promised no analytics. The approved production exception is consent-gated private PostHog analytics with autocapture and session recording disabled. Only allowlisted operational event names and non-personal properties may be sent. No name, email, phone, birth data, location, free-form message, booking/manage token, account capability, or sensitive URL query may leave the browser.

The legal and consent copy explaining this exception remains editable in the existing Studio entries. When analytics is not configured or consent is declined, no PostHog request is made.

## Extension rules

1. Start from the exact warm source composition and existing Vera tokens; do not introduce a generic component-library aesthetic.
2. Use only source copy for source-defined surfaces. New utility/security copy must be necessary, Studio-backed where visitor-visible, and clearly treated as a production exception.
3. Add behavior behind the source UI; never trade visual fidelity for a provider embed.
4. Reuse the existing 22 Studio entries and six standard manifests. Do not create sidecar contracts.
5. Keep placeholder truth: missing bytes stay visibly intentional placeholders until supplied.
6. Implement complete hover, focus-visible, disabled, pending, error, success, empty, and reduced-motion behavior for every interaction.
7. Verify provider failures, reloads, duplicate webhooks, hold expiry, cancellation/refund, account recovery, and private-file authorization as well as the happy path.
8. Update this document, relevant existing tests, and the existing manifests whenever production behavior changes.
