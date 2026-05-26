const mysql = require('mysql2/promise');
require('dotenv').config();

const referencesByTitle = {
  'ACN CTF': ['https://www.factamrita.in/', 'https://www.amrita.edu/news/amrita-cybernation-2025-inaugurated-at-amrita-vishwa-vidyapeetham-chennai-campus/'],
  'L3m0n CTF': ['https://ctf.l3m0nctf.xyz/'],
  '0xti CTF': ['https://unstop.com/college-fests/hactivate-rajalakshmi-engineering-college-rec-chennai-431185/amp'],
  'HackQuest': ['https://www.linkedin.com/posts/ibby-cyber-security-mentor_hackquest-2k26-report-2-activity-7430122477747376128--wBW', 'https://1nf1n1ty.team/achievements/'],
  'KI CTF': ['https://yugam.in/e/cyberconclave', 'https://www.knowafest.com/explore/events/2026/02/1630-yugam-2026-kumaraguru-college-technology-technical-event-coimbatore'],
  'Inno Blitz': ['https://srec.ac.in/events/details/inno-blitz', 'https://www.knowafest.com/explore/events/2026/03/1403-inno-blitz-2-0-sri-ramakrishna-engineering-college-national-level-technical-event-coimbatore']
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  for (const [title, links] of Object.entries(referencesByTitle)) {
    await pool.query('UPDATE achievements SET reference_link = ? WHERE title = ?', [JSON.stringify(links), title]);
  }

  await pool.end();
  console.log(`Updated references for ${Object.keys(referencesByTitle).length} achievement groups.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
