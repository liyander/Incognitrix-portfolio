const mysql = require('mysql2/promise');
require('dotenv').config();

const achievements = [
  {
    title: 'Vulnerability Research Across Major Technology Organizations',
    description: 'Liyander Rishwanth L is credited in the lab archive for vulnerability research involving Google, Microsoft, Apple, Cambridge, Oxford, and NASA systems or programs. This record is stored as a lab achievement based on internal/project-provided data.',
    future_scope: 'Maintain evidence, disclosure timelines, acknowledgements, and remediation notes in the lab archive as supporting records become available.',
    contributors: ['Liyander Rishwanth L']
  },
  {
    title: 'AI Exploitation Research in Gemini and Grok',
    description: 'Liyander Rishwanth L is credited in the lab archive for AI exploitation research involving Gemini and Grok, focused on identifying abuse paths and security weaknesses in AI-assisted systems.',
    future_scope: 'Turn findings into safe AI security labs covering prompt abuse, tool misuse, guardrail testing, and defensive validation.',
    contributors: ['Liyander Rishwanth L']
  },
  {
    title: 'Black Hat USA Invitation by Microsoft',
    description: 'Liyander Rishwanth L was invited by Microsoft to attend Black Hat USA as a security researcher, according to the provided lab record.',
    future_scope: 'Use the invitation and conference exposure to strengthen responsible disclosure practice, research networking, and advanced security training content.',
    contributors: ['Liyander Rishwanth L']
  }
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  for (const achievement of achievements) {
    await pool.query('DELETE FROM achievements WHERE title = ?', [achievement.title]);
    await pool.query(
      'INSERT INTO achievements (title, description, date, future_scope, reference_link, contributors) VALUES (?, ?, ?, ?, ?, ?)',
      [
        achievement.title,
        achievement.description,
        null,
        achievement.future_scope,
        JSON.stringify([]),
        JSON.stringify(achievement.contributors)
      ]
    );
  }

  await pool.end();
  console.log(`Applied ${achievements.length} additional achievement records.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
