import type { Context } from 'hono';

const windowMs = 15 * 60 * 1000;
/** The longest time that a client must wait after it has used up its attempts. */
export const loginRetryAfterSeconds = windowMs / 1000;
// A user who mistypes a few times stays well below these.
const maxPerPair = 10;
const maxPerIp = 30;
const maxPasswordChecks = 10;
// Pruning walks the whole map, so it runs at most once a minute. Without that,
// a flood of new usernames made every request walk the map.
const pruneIntervalMs = 60 * 1000;
// A full map refuses new keys, so that requests with many different usernames
// or addresses can't grow the memory without limit. Refusing logins for a while
// under a flood is better than slowing down every request of the server.
const maxEntries = 100_000;

type Entry = { count: number; resetAt: number };

/** Counts attempts per key in a fixed time window. */
class AttemptCounter {
  private readonly entries = new Map<string, Entry>();
  private readonly max: number;
  private nextPruneAt = 0;

  constructor(max: number) {
    this.max = max;
  }

  /** Counts an attempt. Returns `false` if the key has no attempts left. */
  take(key: string, now: number): boolean {
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (now >= this.nextPruneAt) {
        this.prune(now);
        this.nextPruneAt = now + pruneIntervalMs;
      }
      if (!this.entries.has(key) && this.entries.size >= maxEntries)
        return false;
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.max) return false;
    entry.count++;
    return true;
  }

  /** Gives back an attempt, for a successful login. */
  giveBack(key: string): void {
    const entry = this.entries.get(key);
    if (entry && entry.count > 0) entry.count--;
  }

  clear(): void {
    this.entries.clear();
    this.nextPruneAt = 0;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}

// The username is counted together with the address, so that failed logins
// from elsewhere can't lock the user out.
const byPair = new AttemptCounter(maxPerPair);
const byIp = new AttemptCounter(maxPerIp);
const passwordChecks = new AttemptCounter(maxPasswordChecks);

const pairKey = (ip: string, username: string) => `${ip}\n${username}`;

/**
 * Counts a login attempt before the password is checked. Returns `false` if the
 * client address, or the username from that address, has used up its attempts.
 * The attempt is counted first, so that parallel requests cannot all get
 * through before the first one fails. An address over its limit adds nothing
 * to the map of usernames.
 */
export function takeLoginAttempt(
  c: Context,
  username: string,
  now = Date.now(),
): boolean {
  const ip = clientIp(c);
  return byIp.take(ip, now) && byPair.take(pairKey(ip, username), now);
}

/** Gives back the attempt of a successful login. */
export function giveBackLoginAttempt(c: Context, username: string): void {
  const ip = clientIp(c);
  byIp.giveBack(ip);
  byPair.giveBack(pairKey(ip, username));
}

/**
 * Counts a check of the current password of a logged-in user, before the
 * check. Returns `false` if the user has used up their attempts. This limits
 * both the Argon2 work of one user and the guessing with a stolen session.
 */
export function takePasswordCheck(userId: string, now = Date.now()): boolean {
  return passwordChecks.take(userId, now);
}

/** Gives back the attempt of a right password. */
export function giveBackPasswordCheck(userId: string): void {
  passwordChecks.giveBack(userId);
}

/** Forgets all attempts. For tests. */
export function resetLoginAttempts(): void {
  byPair.clear();
  byIp.clear();
  passwordChecks.clear();
}

/**
 * The address of the client. In production, Caddy adds the address it got the
 * request from as the last `X-Forwarded-For` entry, so the earlier entries can
 * be set by the client and are not used.
 */
function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
  if (forwarded) return forwarded;
  const incoming = (
    c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined
  )?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
