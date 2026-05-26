const mysql = require('mysql2/promise');
require('dotenv').config();

const removeTeams = [
  '$(Straw-hats)',
  'Straw Hats',
  'Black CATS',
  'Blackhats',
  'Black Hats',
  'Cortex',
  'HackBuddies',
  'Hydra',
  'Internship/Placed',
  'Meowsec',
  'Moonlitcipher',
  'Psych Glitch',
  'Ph4nth0m Hack3rs'
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  await pool.query(`UPDATE individuals i
    JOIN teams t ON i.team_id = t.id
    SET i.team_id = NULL
    WHERE t.name IN (?)`, [removeTeams]);
  await pool.query('DELETE FROM teams WHERE name IN (?)', [removeTeams]);
  await pool.end();
  console.log(`Removed ${removeTeams.length} unwanted team names and unassigned their members.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
