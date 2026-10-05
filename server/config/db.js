const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/blog.db');
const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

// Ensure the data directory exists
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database instance
const db = new DatabaseSync(resolvedDbPath);

// Enable foreign keys and WAL mode for reliability and concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
function initDatabase() {
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    if (fs.existsSync(migrationPath)) {
        const schemaSql = fs.readFileSync(migrationPath, 'utf8');
        db.exec(schemaSql);
        console.log('✓ Database schema verified and initialized');
    }
}

initDatabase();

module.exports = {
    db,
    queryAll: (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
    },
    queryOne: (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.get(...params) || null;
    },
    execute: (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.run(...params);
    }
};
