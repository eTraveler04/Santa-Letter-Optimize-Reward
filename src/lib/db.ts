import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Numer w nazwie wymusza nowe połączenie (i migrację) po zmianie schematu w trybie dev.
const holder = globalThis as unknown as { __xmasDb3?: Database.Database };

export function db(): Database.Database {
  if (holder.__xmasDb3) return holder.__xmasDb3;
  const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "xmas.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER REFERENCES lists(id),
      name TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER REFERENCES lists(id),
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents > 0),
      url TEXT NOT NULL,
      rank INTEGER NOT NULL CHECK (rank >= 0),
      reason TEXT,
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      chosen INTEGER NOT NULL DEFAULT 0,
      chosen_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS santas (
      list_id INTEGER NOT NULL REFERENCES lists(id),
      santa_id TEXT NOT NULL,
      truffles INTEGER NOT NULL DEFAULT 0 CHECK (truffles >= 0),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (list_id, santa_id)
    );
  `);
  migrateToLists(d);
  holder.__xmasDb3 = d;
  return d;
}

/** Bazy sprzed wielu list: dodaje kolumnę list_id i przenosi stare wpisy do listy „Moja lista". */
function migrateToLists(d: Database.Database) {
  d.transaction(() => {
    for (const table of ["gifts", "groups"]) {
      const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some((c) => c.name === "list_id")) {
        d.exec(`ALTER TABLE ${table} ADD COLUMN list_id INTEGER REFERENCES lists(id)`);
      }
    }
    const orphans = d
      .prepare(
        `SELECT (SELECT COUNT(*) FROM gifts WHERE list_id IS NULL) +
                (SELECT COUNT(*) FROM groups WHERE list_id IS NULL) AS n`,
      )
      .get() as { n: number };
    if (orphans.n === 0) return;
    d.prepare("INSERT OR IGNORE INTO lists (slug, name, created_at) VALUES ('moja-lista', 'Moja lista', ?)").run(
      new Date().toISOString(),
    );
    const { id } = d.prepare("SELECT id FROM lists WHERE slug = 'moja-lista'").get() as { id: number };
    d.prepare("UPDATE gifts SET list_id = ? WHERE list_id IS NULL").run(id);
    d.prepare("UPDATE groups SET list_id = ? WHERE list_id IS NULL").run(id);
  })();
}
