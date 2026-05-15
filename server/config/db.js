const path = require('path');
const { pathToFileURL } = require('url');
const { createClient } = require('@libsql/client');

/**
 * Turso / libSQL client.
 * - Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (Turso dashboard).
 * - Local: if TURSO_DATABASE_URL is unset, uses a local SQLite file (same path as before).
 */
const defaultFileUrl = pathToFileURL(path.join(__dirname, '..', 'quotations.db')).href;

const url = process.env.TURSO_DATABASE_URL || defaultFileUrl;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const db = createClient({ url, authToken });

module.exports = db;
