import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("warm Vera source anchors remain the public content defaults", async () => {
  const {
    homeDefaults,
    homeSectionsDefaults,
    articleDefaults,
    lettersDefaults,
    legalDefaults,
  } = await import("../src/data/vera/content.ts");

  assert.equal(homeDefaults.hero_title, "The sky kept a note for you.");
  assert.match(homeDefaults.hero_body, /No apps, no algorithms/);
  assert.equal(homeSectionsDefaults.reading_2_title, "The Year Ahead");
  assert.equal(homeSectionsDefaults.reading_2_price, "$385");
  assert.equal(articleDefaults.pull_quote.startsWith("A hard transit tells you"), true);
  assert.equal(lettersDefaults.sample_meta, "Letter no. 337 · New moon, 14 July 2026");
  assert.match(lettersDefaults.section_3_p3, /Revise the thing twice, not nine times/);
  assert.match(legalDefaults.section_2_p2, /Optional PostHog analytics runs only after you allow it/);
  assert.doesNotMatch(legalDefaults.section_2_p2, /no tracking pixel/i);
  assert.doesNotMatch(legalDefaults.section_5_p1, /no analytics/i);
});

test("every Vera Content Studio collection remains below the 84 editable-field ceiling", async () => {
  const { veraEntries } = await import("../src/data/vera/content.ts");
  const { getBuilderEntryConfig, getBuilderReleaseTargets } = await import("../src/builder/registry.ts");

  const releaseKeys = new Set(
    getBuilderReleaseTargets().map((target) => `${target.collection}/${target.entry}`),
  );
  assert.equal(releaseKeys.size, veraEntries.length);
  assert.equal(veraEntries.length, 22, "the source template stays within the existing 22 Studio entries");

  for (const definition of veraEntries) {
    const key = `${definition.collection}/${definition.entry}`;
    assert.equal(releaseKeys.has(key), true, `${key} must be included in release snapshots`);
    const config = getBuilderEntryConfig(definition.collection, definition.entry);
    assert.ok(config, `${key} must have a Builder entry config`);
    assert.ok(
      config.collectionConfig.fields.length <= 84,
      `${definition.collection} has ${config.collectionConfig.fields.length} editable fields`,
    );
  }
});

test("all canonical public routes mount the Vera frame and editable page content", () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/readings.astro",
    "src/pages/readings/[service].astro",
    "src/pages/booking.astro",
    "src/pages/writing.astro",
    "src/pages/writing/saturn-is-not-punishing-you.astro",
    "src/pages/about.astro",
    "src/pages/questions.astro",
    "src/pages/contact.astro",
    "src/pages/legal.astro",
    "src/pages/letters.astro",
    "src/pages/account.astro",
    "src/pages/closed.astro",
    "src/pages/404.astro",
    "src/pages/login.astro",
    "src/pages/signup.astro",
    "src/pages/forgot-password.astro",
    "src/pages/reset-password.astro",
  ];

  for (const route of routes) {
    const source = read(route);
    assert.match(source, /loadPublicPageContent\(Astro,/);
    assert.match(source, /<VeraFrame/);
    assert.match(source, /builderEdit/);
  }
});

test("account access routes use one bounded Studio collection and never expose backend copy", async () => {
  const { authDefaults, veraPageTargets } = await import("../src/data/vera/content.ts");
  const manifest = JSON.parse(read("template.manifest.json"));
  const publicPage = read("src/builder/public-page.ts");
  const routes = [
    ["login", "src/pages/login.astro"],
    ["signup", "src/pages/signup.astro"],
    ["forgot_password", "src/pages/forgot-password.astro"],
    ["reset_password", "src/pages/reset-password.astro"],
  ];

  assert.ok(Object.keys(authDefaults).length <= 84);
  assert.equal(authDefaults.auth_eyebrow, "Your sittings");
  assert.match(authDefaults.login_intro, /reading room are kept here permanently/);
  assert.equal(manifest.localization.publicEditableEntries.includes("vera_auth/main"), true);
  assert.match(publicPage, /getSafePublicNextPath/);
  assert.match(publicPage, /destination\.origin !== url\.origin/);

  for (const [pageKey, route] of routes) {
    assert.deepEqual(veraPageTargets[pageKey], [{ collection: "vera_auth", entry: "main" }]);
    const source = read(route);
    assert.match(source, /loadPublicPageContent\(Astro,/);
    assert.match(source, /<VeraFrame/);
    assert.match(source, /builderEdit/);
    assert.doesNotMatch(source, /payload\.message|error\.message|\.textContent\s*=\s*["'`][A-Za-z]/);
    assert.doesNotMatch(source, /<BaseLayout|auth-body|auth-page|auth-panel/);
  }

  assert.match(read("src/pages/login.astro"), /data-next-path=\{safeNext\}/);
  assert.match(read("src/pages/signup.astro"), /data-login-path=\{loginHref\}/);
  assert.match(read("src/pages/forgot-password.astro"), /forgot_reset_url_prefix/);
});

test("source media is used only in its four supplied home slots", () => {
  const home = read("src/pages/index.astro");
  const otherVeraSources = [
    ...fs.readdirSync(path.join(root, "src/pages"), { recursive: true }),
    ...fs.readdirSync(path.join(root, "src/components/vera"), { recursive: true }),
  ]
    .filter((entry) => typeof entry === "string" && entry.endsWith(".astro"))
    .map((entry) => {
      const pagePath = path.join(root, "src/pages", entry);
      const componentPath = path.join(root, "src/components/vera", entry);
      if (fs.existsSync(pagePath) && path.relative(root, pagePath) !== "src/pages/index.astro") {
        return fs.readFileSync(pagePath, "utf8");
      }
      return fs.existsSync(componentPath) ? fs.readFileSync(componentPath, "utf8") : "";
    })
    .join("\n");

  for (const alias of ["vera-portrait", "ephemeris-pages", "brass-protractor", "night-sky"]) {
    assert.match(home, new RegExp(`aliases/${alias}/`));
    assert.doesNotMatch(otherVeraSources, new RegExp(`aliases/${alias}/`));
  }
});

test("Vera uses the existing manifests without JSON sidecars", () => {
  const manifestNames = fs.readdirSync(path.join(root, "astropages"))
    .filter((name) => name.endsWith(".json"))
    .sort();
  assert.deepEqual(manifestNames, [
    "assets.manifest.json",
    "email-templates.manifest.json",
    "leads.manifest.json",
    "sales.manifest.json",
    "secrets.manifest.json",
    "users-data.manifest.json",
  ]);
  for (const name of [
    `asset${"-usage"}.manifest.json`,
    `source${"-provenance"}.json`,
    `content${"-state"}.json`,
  ]) {
    assert.equal(fs.existsSync(path.join(root, "astropages", name)), false);
  }
});

test("booking shell delegates live availability and payment without fake success", async () => {
  const booking = read("src/pages/booking.astro");
  const { bookingDefaults } = await import("../src/data/vera/content.ts");
  assert.match(booking, /data-calendly-slot-mount/);
  assert.match(booking, /data-calendly-live-slots/);
  assert.match(booking, /data-calendly-month-grid/);
  assert.match(booking, /data-calendly-prev-month/);
  assert.match(booking, /data-calendly-next-month/);
  assert.match(booking, /renderCalendarGrid/);
  assert.match(booking, /data-booking-open-waitlist/);
  assert.match(booking, /data-stripe-elements-mount/);
  assert.match(booking, /data-booking-place-suggestions/);
  assert.match(booking, /data-booking-place-error/);
  assert.match(booking, /data-booking-gift-error/);
  assert.match(booking, /data-booking-gift-applied/);
  for (const state of ["declined", "slot-taken", "waitlist", "expired", "processing"]) {
    assert.match(booking, new RegExp(`data-booking-state="${state}"`));
  }
  assert.match(booking, /const apiBase = "\/api\/astropages\/generated-site\/vera"/);
  assert.match(booking, /envelope\.status !== "ready"/);
  assert.match(booking, /loadStripe/);
  assert.match(booking, /confirmCardPayment/);
  assert.match(booking, /if \(status === "confirmed"\)/);
  assert.match(booking, /showConfirmed\(booking\)/);
  assert.match(booking, /data-booking-payment-summary/);
  assert.match(booking, /data-booking-summary-price/);
  assert.match(booking, /data-booking-summary-gift-value/);
  assert.match(booking, /data-booking-summary-due/);
  assert.match(booking, /data-booking-confirmed-reference/);
  assert.match(booking, /data-booking-confirmed-email-ledger/);
  assert.match(booking, /data-booking-intake-error="name"/);
  assert.match(booking, /data-booking-intake-error="consent"/);
  assert.match(booking, /data-booking-unknown-time/);
  assert.match(booking, /name="birth-time-approximation"/);
  for (const option of ["Small hours", "Morning", "Around midday", "Afternoon", "Evening", "No idea at all"]) {
    assert.match(booking, new RegExp(option));
  }
  assert.match(booking, /birthTimeApproximation/);
  assert.match(booking, /\.\.\.\(birthTimeUnknown \? \{ birthTimeApproximation \} : \{\}\)/);
  assert.match(booking, /birthTimeApproximationValues\.has/);
  assert.match(booking, /data-booking-time-approximation/);
  assert.match(booking, /paymentPolicies\.map/);
  assert.match(booking, /data-account-panel-link="reschedule"/);
  assert.match(booking, /data-account-panel-link="receipt"/);
  assert.match(booking, /data-booking-add-calendar/);
  assert.match(booking, /contact\?topic=booking/);
  assert.doesNotMatch(booking, /reportValidity\(/);
  assert.match(booking, /renderPaymentSummary/);
  assert.match(booking, /renderConfirmation\(booking\)/);
  assert.equal(bookingDefaults.summary_kicker, "Your sitting");
  assert.equal(bookingDefaults.summary_balance_template, "Then {{ balance }} after the sitting");
  assert.equal(bookingDefaults.confirmed_sitting_label, "The sitting");
  assert.equal(bookingDefaults.confirmed_calendar_cta, "Add to calendar");
  assert.equal(bookingDefaults.confirmed_move_cta, "Move the date");
  assert.equal(bookingDefaults.confirmed_receipt_cta, "Download receipt");
  assert.match(bookingDefaults.payment_policy_1, /Moving the date\./);
  assert.match(bookingDefaults.payment_policy_2, /If Vera cancels/);
  assert.equal(
    bookingDefaults.birth_time_approx_options,
    "Small hours\nMorning\nAround midday\nAfternoon\nEvening\nNo idea at all",
  );
  assert.match(bookingDefaults.validation_errors, /Vera needs a name for the chart/);
  assert.match(bookingDefaults.confirmed_email_headers, /Subject: Your sitting is held/);
  assert.match(booking, /window\.astroPagesTrack/);
  assert.doesNotMatch(booking, /astropages:booking-confirmed/);
  assert.doesNotMatch(booking, /window\.posthog/);
  assert.doesNotMatch(booking, /name="card-number"|autocomplete="cc-number"/);
  assert.doesNotMatch(booking, /name="slot"[^>]*checked/);
});

test("account, letters, and forms expose source-faithful integration states", async () => {
  const { accountDefaults, bookingDefaults, contactDefaults, lettersDefaults } = await import(
    "../src/data/vera/content.ts"
  );
  const account = read("src/pages/account.astro");
  const contact = read("src/pages/contact.astro");
  const letters = read("src/pages/letters.astro");
  const frame = read("src/components/vera/VeraFrame.astro");

  assert.equal(
    bookingDefaults.gift_error,
    "That code isn't in the book — check the card it came on",
  );
  assert.equal(
    bookingDefaults.birth_place_error,
    "The place sets the whole frame — town and country, please",
  );
  assert.equal(contactDefaults.email_error, "An email address, so Vera can write back");
  assert.equal(lettersDefaults.confirmed_kicker, "You're in the book");

  assert.match(account, /data-account-loading/);
  for (const panel of ["overview", "reschedule", "cancel", "receipt", "room"]) {
    assert.match(account, new RegExp(`data-account-panel="${panel}"`));
  }
  assert.match(account, /\/api\/astropages\/generated-site\/vera\/account/);
  assert.match(account, /\/login\?next=%2Faccount/);
  assert.match(account, /"x-csrf-token": portal\.csrfToken/);
  assert.match(account, /availabilityEndpoint/);
  assert.match(account, /searchParams\.set\("serviceSlug"/);
  assert.match(account, /\/reschedule/);
  assert.match(account, /\/cancel/);
  assert.match(account, /\/account\/messages/);
  assert.match(account, /\/account\/files\//);
  assert.match(account, /data-account-nav/);
  assert.match(account, /data-account-nav-button/);
  assert.match(account, /window\.location\.hash\.replace/);
  assert.match(account, /prepareAccountPanel\(initialPanel\)/);
  assert.match(account, /data-account-report-download/);
  assert.match(account, /data-account-chart-download/);
  assert.match(account, /data-account-files-ledger/);
  assert.match(account, /data-account-five-year/);
  assert.match(account, /room_destroy_note/);
  assert.match(account, /birthTimeApproximation/);
  assert.equal(accountDefaults.room_intro.startsWith("Everything from that sitting lives here permanently"), true);
  assert.equal(accountDefaults.room_files_title, "Everything from this sitting");
  assert.equal(accountDefaults.room_five_year_title, "Five years on");
  assert.equal(accountDefaults.room_chart_download_cta, "Download scan");
  assert.match(account, /body\?\.status === "ready"/);
  assert.doesNotMatch(account, /\.innerHTML\s*=/);
  assert.match(contact, /data-contact-error/);
  assert.match(contact, /\/api\/astropages\/generated-site\/vera\/contact/);
  assert.match(contact, /consentContact: true/);
  assert.match(contact, /result\?\.status !== "ready"/);
  assert.doesNotMatch(contact, /note_placeholder/);
  assert.doesNotMatch(contact, /astropages:contact-submitted/);
  assert.match(frame, /\/api\/astropages\/generated-site\/vera\/newsletter/);
  assert.match(frame, /consentMarketing: true/);
  assert.match(frame, /result\?\.status !== "ready"/);
  assert.match(frame, /astropages:newsletter-pending/);
  assert.match(letters, /searchParams\.get\("confirmed"\)/);
  assert.match(letters, /data-letter-confirmed/);
});

test("warm source reading, letter, writing, and closed screens stay reachable", async () => {
  const {
    aboutDefaults,
    chromeDefaults,
    contactDefaults,
    lettersDefaults,
    notFoundDefaults,
    readingsDefaults,
  } = await import("../src/data/vera/content.ts");
  const readings = read("src/components/vera/ReadingsCatalog.astro");
  const readingRoute = read("src/pages/readings/[service].astro");
  const letters = read("src/pages/letters.astro");
  const writing = read("src/pages/writing.astro");
  const article = read("src/pages/writing/saturn-is-not-punishing-you.astro");
  const questions = read("src/pages/questions.astro");
  const closed = read("src/pages/closed.astro");
  const header = read("src/components/vera/VeraHeader.astro");
  const footer = read("src/components/vera/VeraFooter.astro");
  const contact = read("src/pages/contact.astro");

  assert.equal(readingsDefaults.detail_questions_heading, "Questions people ask first");
  assert.match(readings, /vera-reading-detail__grid/);
  assert.match(readings, /detailFaqs = \[1, 2, 3, 4, 5\]/);
  assert.match(readings, /data-reading-books-open/);
  assert.match(readings, /data-reading-books-closed/);
  assert.match(readings, /data-reading-availability-error/);
  assert.match(readings, /readWindow\("call"/);
  assert.match(readings, /readWindow\("in_person"/);
  assert.match(readings, /Promise\.allSettled/);
  assert.match(readings, /reading-availability:\$\{serviceSlug\}/);
  assert.match(readings, /expiresAt: Date\.now\(\) \+ 5 \* 60_000/);
  assert.match(readings, /href=\{`\/booking\?service=\$\{selectedService\.slug\}`\}/);
  assert.doesNotMatch(readingRoute, /searchParams\.get\("books"\)/);
  assert.match(readingRoute, /service_\$\{selected\}_seo/);
  assert.match(readingRoute, /seo_canonical_path: serviceSeoCanonical/);
  assert.match(readingRoute, /"@type": "Service"/);
  assert.match(readingRoute, /buildBreadcrumbJsonLd/);
  assert.match(readingRoute, /buildFaqJsonLd/);

  for (const state of ["signup", "pending", "confirmed", "sample"]) {
    assert.match(letters, new RegExp(`data-letter-screen="${state}"`));
  }
  assert.match(letters, /pending_preview_subject/);
  assert.match(letters, /sample_author_alt/);
  assert.match(letters, /data-letter-resent/);
  assert.equal(lettersDefaults.pending_kicker, "One step left");
  assert.equal(lettersDefaults.confirmed_kicker, "You're in the book");

  assert.equal((writing.match(/href="\/writing\/saturn-is-not-punishing-you"/g) ?? []).length, 1);
  assert.doesNotMatch(writing, /articles\.map[\s\S]*?<a[^>]+href="\/writing\/saturn-is-not-punishing-you"/);
  assert.match(writing, /articles = \[1, 2, 3, 4, 5, 6, 7, 8, 9\]/);
  assert.match(writing, /writing_meta_count/);
  assert.match(writing, /writing_meta_note/);
  assert.match(article, /article_author_alt/);
  assert.match(article, /author_alt/);
  assert.match(article, /buildArticleJsonLd/);
  assert.match(article, /buildBreadcrumbJsonLd/);
  assert.match(article, />\{index\}</);
  assert.doesNotMatch(article, /String\(index\)\.padStart/);
  assert.equal(aboutDefaults.about_eyebrow, "About");
  assert.match(questions, /buildFaqJsonLd/);
  assert.match(questions, /role="tablist"/);

  assert.equal(notFoundDefaults.not_found_symbol, "404");
  assert.equal(notFoundDefaults.not_found_home_cta, "The writing");
  assert.match(closed, /vera-closed-works/);
  assert.match(header, /vera-holiday-bar/);
  assert.match(header, /class="vera-nav__book"/);
  assert.equal(chromeDefaults.closed_notice.includes("ferragosto"), true);

  assert.equal(contactDefaults.success_kicker, "Note sent");
  assert.match(footer, /\/contact\?topic=gift-certificate/);
  assert.match(contact, /searchParams\.get\("topic"\) === "gift-certificate"/);
  assert.match(contact, /success_kicker/);
});

test("account signup verification copy reflects the source double opt-in state", async () => {
  const { authDefaults } = await import("../src/data/vera/content.ts");
  assert.equal(
    authDefaults.signup_success_status,
    "One step left. Go and confirm it's actually you.",
  );
  assert.equal(authDefaults.verification_success_status, "You're in the book");
  assert.equal(authDefaults.verification_invalid_status, "Wrong address? Start over");
});

test("Vera typography has no remote font stylesheet", () => {
  const styles = read("src/styles/vera.css");
  const frame = read("src/components/vera/VeraFrame.astro");
  assert.doesNotMatch(styles, /fonts\.googleapis\.com|@import\s+url/);
  assert.match(frame, /@fontsource\/shrikhand\/400\.css/);
  assert.match(frame, /@fontsource\/libre-baskerville\/400-italic\.css/);
  assert.match(frame, /@fontsource\/barlow-condensed\/700\.css/);
});
