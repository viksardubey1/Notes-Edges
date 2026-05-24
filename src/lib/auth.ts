/**
 * Auth — Notes & Edges
 *
 * localStorage-based authentication. Not cryptographically secure —
 * suitable for a local/demo app without a backend.
 *
 * Accounts: ne_accounts  → Record<email, Account>
 * Session:  ne_session   → Session | null
 */

export interface Account {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
}

const ACCOUNTS_KEY = 'ne_accounts';
const SESSION_KEY = 'ne_session';

function hashPassword(password: string): string {
  // Simple reversible encoding — not cryptographically secure.
  // Replace with bcrypt or similar when adding a real backend.
  return btoa(encodeURIComponent(password));
}

function verifyPassword(password: string, hash: string): boolean {
  try {
    return hashPassword(password) === hash;
  } catch {
    return false;
  }
}

function getAccounts(): Record<string, Account> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Account>) : {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts: Record<string, Account>): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Storage full
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: string };

export function signUp(email: string, password: string, displayName?: string): AuthResult {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getAccounts();

  if (accounts[normalizedEmail]) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  const account: Account = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    name: (displayName?.trim() || normalizedEmail.split('@')[0]),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  accounts[normalizedEmail] = account;
  saveAccounts(accounts);

  const session: Session = { userId: account.id, email: account.email, name: account.name };
  saveSession(session);
  return { ok: true, session };
}

export function signIn(email: string, password: string): AuthResult {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  const account = accounts[normalizedEmail];

  if (!account) {
    return { ok: false, error: 'No account found with this email address.' };
  }

  if (!verifyPassword(password, account.passwordHash)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  const session: Session = { userId: account.id, email: account.email, name: account.name };
  saveSession(session);
  return { ok: true, session };
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function updateDisplayName(userId: string, name: string): void {
  if (typeof window === 'undefined') return;
  try {
    const session = getSession();
    if (session?.userId === userId) {
      saveSession({ ...session, name });
    }
    // Also update in accounts
    const accounts = getAccounts();
    const account = Object.values(accounts).find((a) => a.id === userId);
    if (account) {
      account.name = name;
      saveAccounts(accounts);
    }
  } catch {
    // ignore
  }
}
