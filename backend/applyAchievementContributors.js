const mysql = require('mysql2/promise');
require('dotenv').config();

const contributorsByTitle = {
  'ACN CTF': ['Liyander Rishwanth', 'Keerthi Ragavan', 'Micheal'],
  'L3m0n CTF': ['Liyander Rishwanth', 'Keerthi Ragavan', 'Micheal'],
  '0xti CTF': ['Liyander Rishwanth', 'Keerthi Ragavan', 'Micheal'],
  'KI CTF': ['Liyander Rishwanth', 'Keerthi Ragavan', 'Micheal'],
  'HackQuest': ['Liyander Rishwanth L'],
  'Inno Blitz': ['Mantra K', 'Dharshini TR']
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  for (const [title, contributors] of Object.entries(contributorsByTitle)) {
    await pool.query('UPDATE achievements SET contributors = ? WHERE title = ?', [
      JSON.stringify(contributors),
      title
    ]);
  }

  await pool.end();
  console.log(`Updated contributors for ${Object.keys(contributorsByTitle).length} achievement groups.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
