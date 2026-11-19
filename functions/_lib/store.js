import { initial } from './initial.js';
let initialized = false;
async function ensureSchema(db) {
 if(initialized)return;
 await db.exec(`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT NOT NULL DEFAULT 'seed');
CREATE TABLE IF NOT EXISTS changes (id INTEGER PRIMARY KEY AUTOINCREMENT, revision INTEGER NOT NULL, email TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_changes_created_at ON changes(created_at);`);
 await db.prepare('INSERT OR IGNORE INTO documents(id,payload,revision,updated_by) VALUES (?,?,?,?)').bind('main',JSON.stringify(initial),1,'seed').run();
 initialized=true;
}
export function json(data, status=200) {
 return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
export async function getState(db) {
 if(!db) throw new Error('D1 DB binding not configured');
 await ensureSchema(db);
 const row=await db.prepare('SELECT payload,revision,updated_at,updated_by FROM documents WHERE id = ?').bind('main').first();
 if(!row) throw new Error('DATABASE_NOT_SEEDED');
 return {data:JSON.parse(row.payload),revision:row.revision,updatedAt:row.updated_at,updatedBy:row.updated_by};
}
