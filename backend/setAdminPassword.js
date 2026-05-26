const mysql = require('mysql2/promise');
require('dotenv').config();

const username = 'Adm1n';
const passwordHash = '$2b$10$Vo9Vv1jAayZpc4K2ukwqjuJQZOY4mvSSOOMdsWbj2QigpYfWa9y7a';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  await pool.query(`
    INSERT INTO admins (username, password)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE password = VALUES(password)
  `, [username, passwordHash]);

  await pool.end();
  console.log(`Admin credentials updated for ${username}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
