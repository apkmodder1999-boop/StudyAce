export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface UserRecord {
  user_id: string;
  name: string;
  ip: string;
  city: string;
  isp: string;
  device_info: string;
  created_at?: string;
}

/**
 * Extracts Cloudflare D1 Database binding across all possible runtime contexts
 */
export function getD1Database(env: unknown, request?: Request): D1Database | undefined {
  if (env && typeof env === "object" && "DB" in env && (env as Record<string, unknown>).DB) {
    return (env as Record<string, unknown>).DB as D1Database;
  }
  if (
    request &&
    (request as unknown as { context?: { env?: { DB?: D1Database } } }).context?.env?.DB
  ) {
    return (request as unknown as { context: { env: { DB: D1Database } } }).context.env.DB;
  }
  const g = globalThis as unknown as { DB?: D1Database; __env__?: { DB?: D1Database } };
  if (g.DB) return g.DB;
  if (g.__env__?.DB) return g.__env__.DB;
  return undefined;
}

/**
 * Safely inserts or updates a user in the Cloudflare D1 "users" table
 */
export async function saveUserToD1(
  db: D1Database | undefined,
  user: {
    userId: string;
    name: string;
    ip?: string;
    city?: string;
    isp?: string;
    deviceInfo?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: "D1 database binding 'DB' not detected in environment" };
  }

  const userId = String(user.userId || `std_${Date.now().toString(36)}`);
  const name = String(user.name || "Aspirant").trim();
  const ip = String(user.ip || "Unknown");
  const city = String(user.city || "Unknown");
  const isp = String(user.isp || "Unknown");
  const deviceInfo = String(user.deviceInfo || "Web Browser");

  // Step 1: Ensure users table exists with matching schema
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT,
        ip TEXT,
        city TEXT,
        isp TEXT,
        device_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (schemaErr) {
    console.warn("[D1] Notice on CREATE TABLE:", schemaErr);
  }

  // Step 2: Attempt standard Upsert (ON CONFLICT)
  try {
    await db
      .prepare(
        `INSERT INTO users (user_id, name, ip, city, isp, device_info)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           name = excluded.name,
           ip = excluded.ip,
           city = excluded.city,
           isp = excluded.isp,
           device_info = excluded.device_info;`,
      )
      .bind(userId, name, ip, city, isp, deviceInfo)
      .run();

    return { success: true };
  } catch (upsertErr) {
    // Step 3: Fallback for tables without user_id PRIMARY KEY
    try {
      await db
        .prepare(
          `INSERT INTO users (user_id, name, ip, city, isp, device_info)
           VALUES (?, ?, ?, ?, ?, ?);`,
        )
        .bind(userId, name, ip, city, isp, deviceInfo)
        .run();

      return { success: true };
    } catch (insertErr) {
      console.error("[D1] Error inserting into users table:", insertErr);
      return { success: false, error: (insertErr as Error).message };
    }
  }
}

/**
 * Helper to query users table for verification
 */
export async function getUsersFromD1(db: D1Database | undefined): Promise<UserRecord[]> {
  if (!db) return [];
  try {
    const res = await db
      .prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 100")
      .all<UserRecord>();
    return Array.isArray(res.results) ? res.results : [];
  } catch (err) {
    console.error("[D1] Error querying users:", err);
    return [];
  }
}
