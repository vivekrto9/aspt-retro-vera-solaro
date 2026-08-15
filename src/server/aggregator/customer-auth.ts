import { AP_TABLES as tables } from "./db/tables.ts";
import { createId, nowIso, safeString, type RuntimeEnv } from "./runtime.ts";

type Row = Record<string, unknown>;

const encoder = new TextEncoder();
const sessionCookieName = "ap_customer_session";
const csrfCookieName = "ap_customer_csrf";
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const passwordResetTtlMs = 60 * 60 * 1000;
const passwordIterations = 100_000;

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const sha256Hex = async (value: string) =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));

const randomHex = (bytes = 32) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return [...array].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const first = async <T extends Row = Row>(env: RuntimeEnv, sql: string, values: unknown[] = []) => {
  if (!env.DB) return null;
  const statement = env.DB.prepare(sql).bind(...values) as {
    first?: <Result = T>() => Promise<Result | null>;
  };
  return await statement.first?.<T>() ?? null;
};

const run = async (env: RuntimeEnv, sql: string, values: unknown[] = []) => {
  if (!env.DB) return;
  await env.DB.prepare(sql).bind(...values).run?.();
};

const normalizeEmail = (email: unknown) => safeString(email).toLowerCase();

const requestOrigin = (env: RuntimeEnv, request: Request) => {
  const configured = safeString(env.SITE_ORIGIN);
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
};

const isLocalRequest = (request: Request) => {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
};

const hashPassword = async (password: string, salt = randomHex(16)) => {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(salt),
      iterations: passwordIterations,
    },
    keyMaterial,
    256,
  );
  return { salt, hash: toHex(bits) };
};

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
};

const cookieValue = (request: Request, name: string) => {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";
};

const cookieSuffix = (request: Request) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
};

const csrfCookieSuffix = (request: Request) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; SameSite=Lax${secure}`;
};

const accountFromRow = (row: Row) => ({
  id: String(row.id),
  email: String(row.email),
  displayName: String(row.display_name ?? ""),
  phone: row.phone ? String(row.phone) : "",
  defaultLanguage: row.default_language ? String(row.default_language) : "English",
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
});

export type CustomerAccount = ReturnType<typeof accountFromRow>;

const getCustomerAccountByEmail = async (env: RuntimeEnv, email: string) => {
  const row = await first(env, `SELECT * FROM ${tables.customerAccounts} WHERE email = ?`, [normalizeEmail(email)]);
  return row ? accountFromRow(row) : null;
};

const getCustomerAccountById = async (env: RuntimeEnv, accountId: string) => {
  const row = await first(env, `SELECT * FROM ${tables.customerAccounts} WHERE id = ?`, [accountId]);
  return row ? accountFromRow(row) : null;
};

const createCustomerSession = async ({ env, accountId, request }: { env: RuntimeEnv; accountId: string; request: Request }) => {
  const token = randomHex(32);
  const csrf = randomHex(24);
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  const now = nowIso();
  await run(
    env,
    `INSERT INTO ${tables.customerSessions} (
      id, account_id, session_token_hash, csrf_token_hash, expires_at,
      last_seen_at, revoked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [createId("csess"), accountId, await sha256Hex(token), await sha256Hex(csrf), expiresAt, now, now],
  );
  return {
    csrfToken: csrf,
    cookies: [
      `${sessionCookieName}=${token}; Expires=${new Date(expiresAt).toUTCString()}; ${cookieSuffix(request)}`,
      `${csrfCookieName}=${csrf}; Expires=${new Date(expiresAt).toUTCString()}; ${csrfCookieSuffix(request)}`,
    ],
  };
};

export const signupCustomer = async ({
  env,
  request,
  displayName,
  email,
  phone,
  password,
  createSession = false,
}: {
  env: RuntimeEnv;
  request: Request;
  displayName: unknown;
  email: unknown;
  phone?: unknown;
  password: unknown;
  createSession?: boolean;
}) => {
  if (!env.DB) return { ok: false as const, message: "Customer account storage is not ready." };
  const normalizedEmail = normalizeEmail(email);
  const name = safeString(displayName);
  const rawPassword = safeString(password);
  if (!name) return { ok: false as const, message: "Full name is required." };
  if (!normalizedEmail || !normalizedEmail.includes("@")) return { ok: false as const, message: "Enter a valid email address." };
  if (rawPassword.length < 8) return { ok: false as const, message: "Password must be at least 8 characters." };
  if (await getCustomerAccountByEmail(env, normalizedEmail)) {
    return { ok: false as const, message: "An account already exists for this email. Please login." };
  }

  const now = nowIso();
  const accountId = createId("acct");
  const passwordResult = await hashPassword(rawPassword);
  await run(
    env,
    `INSERT INTO ${tables.customerAccounts} (
      id, email, display_name, phone, password_hash, password_salt,
      default_language, email_verified_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      accountId,
      normalizedEmail,
      name,
      safeString(phone) || null,
      passwordResult.hash,
      passwordResult.salt,
      "English",
      now,
      now,
      now,
    ],
  );
  const account = await getCustomerAccountById(env, accountId);
  if (!account) return { ok: false as const, message: "Account could not be created." };
  if (!createSession) return { ok: true as const, account, cookies: [], csrfToken: "" };
  const session = await createCustomerSession({ env, accountId: account.id, request });
  return { ok: true as const, account, cookies: session.cookies, csrfToken: session.csrfToken };
};

export const loginCustomer = async ({
  env,
  request,
  email,
  password,
}: {
  env: RuntimeEnv;
  request: Request;
  email: unknown;
  password: unknown;
}) => {
  if (!env.DB) return { ok: false as const, message: "Customer account storage is not ready." };
  const normalizedEmail = normalizeEmail(email);
  const rawPassword = safeString(password);
  if (!normalizedEmail || !rawPassword) return { ok: false as const, message: "Email and password are required." };
  const row = await first(env, `SELECT * FROM ${tables.customerAccounts} WHERE email = ?`, [normalizedEmail]);
  if (!row) return { ok: false as const, message: "Email or password is incorrect." };
  const passwordResult = await hashPassword(rawPassword, String(row.password_salt ?? ""));
  if (!timingSafeEqual(passwordResult.hash, String(row.password_hash ?? ""))) {
    return { ok: false as const, message: "Email or password is incorrect." };
  }
  const account = accountFromRow(row);
  const session = await createCustomerSession({ env, accountId: account.id, request });
  return { ok: true as const, account, cookies: session.cookies, csrfToken: session.csrfToken };
};

export const requestCustomerPasswordReset = async ({
  env,
  request,
  email,
}: {
  env: RuntimeEnv;
  request: Request;
  email: unknown;
}) => {
  if (!env.DB) return { ok: false as const, message: "Customer account storage is not ready." };
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false as const, message: "Enter a valid email address." };
  }

  const row = await first(env, `SELECT * FROM ${tables.customerAccounts} WHERE email = ?`, [normalizedEmail]);
  const genericMessage = "If an account exists for this email, password reset instructions will be available shortly.";
  if (!row) return { ok: true as const, message: genericMessage, resetUrl: "" };

  const token = randomHex(32);
  const resetUrl = `${requestOrigin(env, request)}/reset-password?token=${encodeURIComponent(token)}`;
  const now = nowIso();
  const expiresAt = new Date(Date.now() + passwordResetTtlMs).toISOString();
  await run(
    env,
    `INSERT INTO ${tables.customerPasswordResets} (
      id, account_id, reset_token_hash, expires_at, used_at, created_at
    ) VALUES (?, ?, ?, ?, NULL, ?)`,
    [createId("cpwr"), String(row.id), await sha256Hex(token), expiresAt, now],
  );

  return {
    ok: true as const,
    message: genericMessage,
    resetUrl: isLocalRequest(request) ? resetUrl : "",
  };
};

export const resetCustomerPassword = async ({
  env,
  token,
  password,
}: {
  env: RuntimeEnv;
  token: unknown;
  password: unknown;
}) => {
  if (!env.DB) return { ok: false as const, message: "Customer account storage is not ready." };
  const rawToken = safeString(token);
  const rawPassword = safeString(password);
  if (!rawToken) return { ok: false as const, message: "Reset link is invalid or expired." };
  if (rawPassword.length < 8) return { ok: false as const, message: "Password must be at least 8 characters." };

  const tokenHash = await sha256Hex(rawToken);
  const row = await first(
    env,
    `SELECT reset.*, account.email
       FROM ${tables.customerPasswordResets} reset
       JOIN ${tables.customerAccounts} account ON account.id = reset.account_id
      WHERE reset.reset_token_hash = ? AND reset.used_at IS NULL
      ORDER BY reset.created_at DESC
      LIMIT 1`,
    [tokenHash],
  );
  if (!row || new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { ok: false as const, message: "Reset link is invalid or expired." };
  }

  const passwordResult = await hashPassword(rawPassword);
  const now = nowIso();
  await run(
    env,
    `UPDATE ${tables.customerAccounts}
        SET password_hash = ?, password_salt = ?, updated_at = ?
      WHERE id = ?`,
    [passwordResult.hash, passwordResult.salt, now, String(row.account_id)],
  );
  await run(env, `UPDATE ${tables.customerPasswordResets} SET used_at = ? WHERE id = ?`, [now, String(row.id)]);
  await run(env, `UPDATE ${tables.customerSessions} SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL`, [
    now,
    String(row.account_id),
  ]);
  return { ok: true as const, message: "Password updated. Please login with your new password." };
};

export const getCustomerSession = async (env: RuntimeEnv, request: Request) => {
  const token = cookieValue(request, sessionCookieName);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const session = await first(
    env,
    `SELECT * FROM ${tables.customerSessions}
     WHERE session_token_hash = ? AND revoked_at IS NULL`,
    [tokenHash],
  );
  if (!session || new Date(String(session.expires_at)).getTime() < Date.now()) return null;
  const account = await getCustomerAccountById(env, String(session.account_id));
  if (!account) return null;
  await run(env, `UPDATE ${tables.customerSessions} SET last_seen_at = ? WHERE id = ?`, [nowIso(), String(session.id)]);
  return {
    sessionId: String(session.id),
    account,
    csrfToken: cookieValue(request, csrfCookieName),
    csrfTokenHash: String(session.csrf_token_hash ?? ""),
  };
};

export const requireCustomerSession = async (env: RuntimeEnv, request: Request) => {
  const session = await getCustomerSession(env, request);
  if (!session) {
    return {
      ok: false as const,
      response: new Response("Customer login is required.", { status: 401 }),
    };
  }
  return { ok: true as const, session };
};

export const revokeCustomerSession = async (env: RuntimeEnv, request: Request) => {
  const token = cookieValue(request, sessionCookieName);
  if (token) {
    await run(env, `UPDATE ${tables.customerSessions} SET revoked_at = ? WHERE session_token_hash = ?`, [
      nowIso(),
      await sha256Hex(token),
    ]);
  }
  return [
    `${sessionCookieName}=; Max-Age=0; ${cookieSuffix(request)}`,
    `${csrfCookieName}=; Max-Age=0; ${csrfCookieSuffix(request)}`,
  ];
};
