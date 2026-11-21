// DEMO-GRADE LOCAL LOGIN. NOT SECURE.
// Accounts and app data live in the browser's localStorage. Passwords are only
// run through a djb2 string hash for display-level obfuscation; this is NOT
// cryptographic hashing and must not be used to protect real personal data.

import type { AppData } from './types';

const DATA_PREFIX = 'tutorbooks.v1:';
const USERS_KEY = 'tutorbooks.users';
const SESSION_KEY = 'tutorbooks.session';
const GUEST = 'guest';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readItem(key: string): string | null {
  const store = getStorage();
  if (store === null) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  const store = getStorage();
  if (store === null) return;
  try {
    store.setItem(key, value);
  } catch {
    // quota exceeded or storage disabled: silent no-op
  }
}

function removeItem(key: string): void {
  const store = getStorage();
  if (store === null) return;
  try {
    store.removeItem(key);
  } catch {
    // silent no-op
  }
}

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function readUsers(): Record<string, string> {
  const raw = readItem(USERS_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [email, hash] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof hash === 'string') out[email] = hash;
    }
    return out;
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, string>): void {
  writeItem(USERS_KEY, JSON.stringify(users));
}

function dataKeyFor(email: string | null): string {
  return DATA_PREFIX + (email ?? GUEST);
}

export function emptyData(): AppData {
  return {
    customers: [],
    invoices: [],
    bills: [],
    openingBalance: 0,
  };
}

export function loadData(): AppData {
  const raw = readItem(dataKeyFor(currentUser()));
  if (raw === null) return emptyData();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return emptyData();
    }
    const obj = parsed as Partial<AppData>;
    const base = emptyData();
    return {
      customers: Array.isArray(obj.customers) ? obj.customers : base.customers,
      invoices: Array.isArray(obj.invoices) ? obj.invoices : base.invoices,
      bills: Array.isArray(obj.bills) ? obj.bills : base.bills,
      openingBalance:
        typeof obj.openingBalance === 'number' && Number.isFinite(obj.openingBalance)
          ? obj.openingBalance
          : base.openingBalance,
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  writeItem(dataKeyFor(currentUser()), JSON.stringify(data));
}

export function registerUser(
  email: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase();
  if (normalized === '' || password === '') {
    return { ok: false, error: 'Email and password are required.' };
  }
  if (!normalized.includes('@') || !normalized.includes('.')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  const users = readUsers();
  if (Object.prototype.hasOwnProperty.call(users, normalized)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  users[normalized] = djb2(password);
  writeUsers(users);
  return { ok: true };
}

export function loginUser(
  email: string,
  password: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase();
  if (normalized === '' || password === '') {
    return { ok: false, error: 'Email and password are required.' };
  }
  const users = readUsers();
  if (!Object.prototype.hasOwnProperty.call(users, normalized)) {
    return { ok: false, error: 'No account found for this email.' };
  }
  if (users[normalized] !== djb2(password)) {
    return { ok: false, error: 'Incorrect password.' };
  }
  writeItem(SESSION_KEY, normalized);
  return { ok: true, email: normalized };
}

export function logout(): void {
  removeItem(SESSION_KEY);
}

export function currentUser(): string | null {
  const value = readItem(SESSION_KEY);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
