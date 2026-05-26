#!/bin/sh
set -e

echo "Waiting for database at ${DB_HOST:-localhost}..."
node - <<'NODE'
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'CTF',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'incognitrix_db_new'
};

(async () => {
  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.end();
      process.exit(0);
    } catch (error) {
      if (attempt === 60) {
        console.error(error);
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
})();
NODE

node seed_admin.js

exec "$@"
