const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const tables = ['teams', 'individuals', 'projects', 'cves', 'achievements', 'future_scopes'];

const schema = `CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    attendance_date DATE NOT NULL,
    UNIQUE KEY org_emp_date (user_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    twofa_secret VARCHAR(255),
    has_2fa_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    technical_summary TEXT,
    current_objective TEXT
);

CREATE TABLE IF NOT EXISTS individuals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    team_id INT,
    department VARCHAR(255),
    year_of_study VARCHAR(255),
    achievements JSON,
    certificates JSON,
    research_work JSON,
    image TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    priority VARCHAR(50),
    description TEXT,
    shortDesc TEXT,
    image TEXT,
    stack JSON,
    timeline JSON,
    beneficiaries TEXT,
    team VARCHAR(255),
    usage_desc TEXT,
    operatives JSON
);

CREATE TABLE IF NOT EXISTS cves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cve_number VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    poc TEXT,
    reference_link JSON,
    contributors JSON
);

CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATE,
    future_scope TEXT,
    reference_link JSON,
    contributors JSON
);

CREATE TABLE IF NOT EXISTS future_scopes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expected_outcome TEXT,
    start_date DATE,
    end_date DATE
);
`;

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 10)}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function dump() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  let sql = `${schema}\nSET FOREIGN_KEY_CHECKS = 0;\n`;
  for (const table of tables.reverse()) {
    sql += `TRUNCATE TABLE ${table};\n`;
  }
  sql += 'SET FOREIGN_KEY_CHECKS = 1;\n\n';

  for (const table of tables.reverse()) {
    try {
      const orderBy = table === 'teams' ? " ORDER BY CASE WHEN name = 'Red Team' THEN 0 ELSE 1 END, name" : '';
      const [rows] = await pool.query(`SELECT * FROM ${table}${orderBy}`);
      for (const row of rows) {
        const keys = Object.keys(row).map(key => `\`${key}\``).join(', ');
        const values = Object.values(row).map(sqlValue).join(', ');
        sql += `INSERT INTO ${table} (${keys}) VALUES (${values});\n`;
      }
      if (rows.length > 0) sql += '\n';
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
    }
  }

  fs.writeFileSync('../init.sql', sql);
  await pool.end();
  console.log('init.sql written successfully.');
}

dump().catch(error => {
  console.error(error);
  process.exit(1);
});
