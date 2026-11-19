import { initial } from './initial.js';

let initialized = false;

async function runStage(db, stage, sql, params = []) {
  try {
    await db.prepare(sql).bind(...params).run();
  } catch (cause) {
    const err = new Error(`D1_${stage}_FAILED`);
    err.stage = stage;
    err.cause = cause;
    throw err;
  }
}

async function ensureSchema(db) {
  if (initialized) return;
  await runStage(db, 'CREATE_DOCUMENTS', `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, payload TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT NOT NULL DEFAULT 'seed'
  )`);
  await runStage(db, 'CREATE_CHANGES', `CREATE TABLE IF NOT EXISTS changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    revision INTEGER NOT NULL,
    email TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await runStage(db, 'CREATE_CHANGES_INDEX', 'CREATE INDEX IF NOT EXISTS idx_changes_created_at ON changes(created_at)');
  await runStage(db, 'SEED_MAIN', 'INSERT OR IGNORE INTO documents(id,payload,revision,updated_by) VALUES (?,?,?,?)',
    ['main', JSON.stringify(initial), 1, 'seed']);
  initialized = true;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function getState(db) {
  if (!db) {
    const err = new Error('D1_BINDING_MISSING');
    err.stage = 'BINDING';
    throw err;
  }
  await ensureSchema(db);
  let row;
  try {
    row = await db.prepare('SELECT payload,revision,updated_at,updated_by FROM documents WHERE id = ?').bind('main').first();
  } catch (cause) {
    const err = new Error('D1_READ_MAIN_FAILED');
    err.stage = 'READ_MAIN';
    err.cause = cause;
    throw err;
  }
  if (!row) {
    const err = new Error('DATABASE_NOT_SEEDED');
    err.stage = 'ROW_MISSING';
    throw err;
  }
  try {
    return { data: JSON.parse(row.payload), revision: row.revision, updatedAt: row.updated_at, updatedBy: row.updated_by };
  } catch (cause) {
    const err = new Error('D1_INVALID_STORED_JSON');
    err.stage = 'JSON_PARSE';
    err.cause = cause;
    throw err;
  }
}
