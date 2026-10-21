/* Hiwalay na file para magamit ng proxy.ts nang hindi isinasama ang database. */
export const SESSION_COOKIE = "cu-admin";

/* 32 random byte na base64url (tingnan ang createSession sa auth.ts). */
export const looksLikeSessionToken = (value: string | undefined) => Boolean(value && /^[A-Za-z0-9_-]{43}$/.test(value));
