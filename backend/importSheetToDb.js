const { google } = require('googleapis');
const mysql = require('mysql2/promise');
const { cves: requestedCves, rangeDescription, rangeTimeline, academyDescription, networkingSummary } = require('./applyRequestedData');
require('dotenv').config();

const spreadsheetId = '19aB9aDWJ1G473ILMhRUBPz5IQxXxmYq96sXgKZCyyu4';

const canonicalProjects = [
  {
    id: 'PROJ-1',
    title: 'Incognitrix Academy',
    team: 'Academy Team',
    priority: 'Academy Team',
    stack: ['React', 'Node.js', 'MySQL', 'Markdown', 'Cyber Security Curriculum'],
    keywords: ['incognitrix academy', 'incognitrix academic', 'academy', 'roadmap', 'module', 'content creation', 'learning platform', 'lms']
  },
  {
    id: 'PROJ-2',
    title: 'Incognitrix Range',
    team: 'Range Team',
    priority: 'Range Team',
    stack: ['Docker', 'Linux', 'CTF Challenges', 'Sherlock Labs', 'Boot2Root'],
    keywords: ['incognitrix range', 'range', 'sherlock', 'bootroot', 'boot to root', 'ctf', 'challenge', 'wazuh', 'cve lab']
  },
  {
    id: 'PROJ-3',
    title: 'Incognitrix Portfolio',
    team: 'Portfolio Team',
    priority: 'Portfolio Team',
    stack: ['React', 'Express', 'MySQL', 'Tailwind CSS'],
    keywords: ['portfolio', 'portfoilio', 'protofolio', 'protfilo', 'portal']
  },
  {
    id: 'PROJ-4',
    title: 'AR VR Project',
    team: 'AR VR Team',
    priority: 'AR VR Team',
    stack: ['Unity', 'AR', 'VR', 'Mixed Reality', '3D Assets'],
    keywords: ['ar', 'vr', 'unity', 'mixed reality', 'augumented', 'augmented', 'cyber game', '3d model', 'panoromic']
  },
  {
    id: 'PROJ-5',
    title: 'Incognitrix Career',
    team: 'Career Team',
    priority: 'Career Team',
    stack: ['Automation', 'AI Agents', 'Job Feeds', 'Career Tracking'],
    keywords: ['incognitrix career', 'career', 'job fetching', 'job scraping', 'placement']
  }
];

const normalTeamNames = new Map([
  ['$(straw-hats)', null],
  ['straw hats', null],
  ['black cats', null],
  ['blackhats', null],
  ['black hats', null],
  ['cortex', null],
  ['hackbuddies', null],
  ['hydra', null],
  ['internship/placed', null],
  ['meowsec', null],
  ['moonlitcipher', null],
  ['psych glitch', null],
  ['ph4nth0m hack3rs', null],
  ['technical team', null],
  ['cyber-ar&vr', 'AR VR Team'],
  ['cyber-ar&vr escape room', 'AR VR Team'],
  ['cyber-ar and vr', 'AR VR Team'],
  ['ar vr', 'AR VR Team'],
  ['ar vr team', 'AR VR Team'],
  ['agumented network annotation', 'Networking Team'],
  ['augmented network annotation', 'Networking Team'],
  ['escape  room team', 'Escape Room Team'],
  ['escape room team', 'Escape Room Team'],
  ['project', 'Project Team']
]);

const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const lower = (value) => clean(value).toLowerCase();
const normalizePerson = (value) => lower(value).replace(/[\s.]/g, '').replace('auswath', 'asuwath');

function normalizeTeam(teamName, fallback) {
  const raw = clean(teamName || fallback);
  const mapped = normalTeamNames.get(lower(raw));
  if (normalTeamNames.has(lower(raw))) return mapped;
  return raw || null;
}

function parseSheet(rows) {
  if (!rows || rows.length === 0) return [];

  let headerIndex = 0;
  let maxNonEmpty = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const nonEmpty = (rows[i] || []).filter(cell => clean(cell)).length;
    if (nonEmpty > maxNonEmpty) {
      maxNonEmpty = nonEmpty;
      headerIndex = i;
    }
  }

  const headers = [...(rows[headerIndex] || [])].map(clean);
  if (headerIndex > 0) {
    for (let col = 0; col < headers.length; col++) {
      if (!headers[col]) {
        for (let row = headerIndex - 1; row >= 0; row--) {
          const candidate = clean(rows[row]?.[col]);
          if (candidate) {
            headers[col] = candidate;
            break;
          }
        }
      }
    }
  }

  return rows.slice(headerIndex + 1)
    .map(row => {
      const parsed = {};
      headers.forEach((header, index) => {
        if (!header) return;
        let key = header;
        if (Object.prototype.hasOwnProperty.call(parsed, key)) key = `${header}__${index}`;
        parsed[key] = row[index] === undefined ? '' : row[index];
      });
      parsed.__cells = headers.map((header, index) => ({ header, value: row[index] === undefined ? '' : row[index], index }));
      return parsed;
    })
    .filter(row => Object.values(row).some(value => clean(value)));
}

function getName(row) {
  return clean(row.NAME || row['NAME '] || row['STUDENT LEARNER'] || row['LEADING BY']);
}

function getWorkEntries(row) {
  const cells = row.__cells || Object.entries(row).map(([header, value]) => ({ header, value, index: 0 }));
  const ignoredValues = new Set(['-', 'exam', 'practical', 'technical team']);
  return cells
    .filter(cell => lower(cell.header).includes('work') && clean(cell.value) && !ignoredValues.has(lower(cell.value)))
    .map(cell => {
      const previousDate = cells
        .slice(0, cell.index)
        .reverse()
        .find(candidate => /^\d{2}-\d{2}-\d{4}$/.test(clean(candidate.header)) || /^\d{4}-\d{2}-\d{2}$/.test(clean(candidate.header)));
      return { date: previousDate ? clean(previousDate.header) : 'LOGGED', text: clean(cell.value) };
    });
}

function detectProjects(text) {
  const textLower = lower(text);
  return canonicalProjects.filter(project => project.keywords.some(keyword => textLower.includes(keyword)));
}

function formatWorkAchievement(entry) {
  return {
    title: entry.text.length > 90 ? `${entry.text.slice(0, 87)}...` : entry.text,
    description: entry.text,
    date: entry.date
  };
}

async function fetchSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: '../api.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = meta.data.sheets.map(sheet => sheet.properties.title);
  const data = {};

  for (const title of titles) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: title });
    data[title] = parseSheet(response.data.values || []);
  }

  return data;
}

function collectData(sheetsData) {
  const individuals = new Map();
  const teams = new Set();
  const projectActivity = new Map(canonicalProjects.map(project => [project.title, []]));
  const projectPeople = new Map(canonicalProjects.map(project => [project.title, new Map()]));
  const achievements = new Map();

  for (const [sheetName, rows] of Object.entries(sheetsData)) {
    let currentTeam = normalizeTeam('', sheetName);

    for (const row of rows) {
      const explicitTeam = normalizeTeam(row['TEAM NAME'], currentTeam);
      if (explicitTeam) currentTeam = explicitTeam;
      if (currentTeam) teams.add(currentTeam);

      const name = getName(row);
      if (!name) continue;

      const key = normalizePerson(name);
      if (!individuals.has(key)) {
        individuals.set(key, {
          name,
          role: clean(row.WORK) || 'Operative',
          team_name: currentTeam || 'Project Team',
          department: clean(row['DEPT - YEAR']) || clean(row.YEAR) || 'Unknown',
          year_of_study: clean(row.YEAR) || clean(row['DEPT - YEAR']) || 'Unknown',
          achievements: [],
          certificates: [],
          research_work: []
        });
      }

      const individual = individuals.get(key);
      if (currentTeam && !individual.team_name) individual.team_name = currentTeam;
      if (clean(row.CERTIFICATES)) individual.certificates.push({ title: clean(row.CERTIFICATES), date: clean(row.DATE) });
      if (clean(row['RESEARCH WORK'])) individual.research_work.push({ title: clean(row['RESEARCH WORK']), date: clean(row.DATE) });

      for (const entry of getWorkEntries(row)) {
        individual.achievements.push(formatWorkAchievement(entry));
        for (const project of detectProjects(entry.text)) {
          projectActivity.get(project.title).push({ ...entry, person: name });
          projectPeople.get(project.title).set(key, { name, role: individual.role || 'Operative' });
        }
      }

      if (lower(sheetName).includes('achievement')) {
        const title = clean(row['EVENT/PROGRAM'] || row.EVENT || row.PROGRAM || row.ACHIEVEMENTS || row.TITLE);
        if (title) {
          const achKey = lower(`${title}-${row.DATE || ''}-${row.RANK || ''}`);
          if (!achievements.has(achKey)) {
            achievements.set(achKey, {
              title,
              description: `${title}${row.RANK ? ` - Rank ${row.RANK}` : ''}${row.LOCATION ? ` at ${row.LOCATION}` : ''}`,
              date: clean(row.DATE) || null,
              future_scope: 'Convert this result into reusable writeups, training modules, and practice tasks.',
              reference_link: [],
              contributors: []
            });
          }
          achievements.get(achKey).contributors.push(name);
          individual.achievements.push({
            title,
            description: achievements.get(achKey).description,
            date: clean(row.DATE),
            rank: clean(row.RANK),
            location: clean(row.LOCATION)
          });
        }
      }
    }
  }

  for (const project of canonicalProjects) teams.add(project.team);
  teams.delete(null);
  teams.delete('Technical Team');

  const projects = canonicalProjects.map(project => {
    const activity = projectActivity.get(project.title).slice(0, 12);
    const people = Array.from(projectPeople.get(project.title).values());
    const timeline = activity.slice(0, 6).map((entry, index) => ({
      phase: index === 0 ? 'LATEST' : 'LOGGED',
      title: entry.text.length > 80 ? `${entry.text.slice(0, 77)}...` : entry.text,
      desc: `${entry.person}: ${entry.text}`,
      active: index === 0
    }));

    return {
      ...project,
      status: 'ONGOING',
      description: activity.length
        ? activity.map(entry => `${entry.person}: ${entry.text}`).slice(0, 4).join('\n')
        : `${project.title} is maintained as an active Incognitrix lab project.`,
      shortDesc: activity[0]?.text || `${project.title} active directive.`,
      beneficiaries: 'Incognitrix lab members and learners',
      usage_desc: activity.length
        ? `Used for: ${activity.map(entry => entry.text).slice(0, 5).join(' | ')}`
        : `Used by the lab to coordinate ${project.title} work.`,
      timeline,
      operatives: people
    };
  });

  if (achievements.size === 0) {
    for (const individual of individuals.values()) {
      for (const ach of individual.achievements.filter(item => lower(item.title).includes('ctf')).slice(0, 5)) {
        const achKey = lower(ach.title);
        if (!achievements.has(achKey)) {
          achievements.set(achKey, {
            title: ach.title,
            description: ach.description || ach.title,
            date: ach.date || null,
            future_scope: 'Build writeups and reusable training content from this activity.',
            reference_link: [],
            contributors: [individual.name]
          });
        }
      }
    }
  }

  const projectsWithRequestedContent = projects.map(project => {
    if (project.title === 'Incognitrix Range') {
      return {
        ...project,
        description: rangeDescription,
        shortDesc: 'Offensive and blue-team practical range with advisor simulations, pro labs, boot2root, CVE simulations, CTFs, malware lab, forensics, and EDR setups.',
        usage_desc: 'Used to run practical cyber security training across adversary simulation, infrastructure compromise, CVE reproduction, CTF challenges, malware analysis, forensics, and Wazuh EDR practice.',
        stack: ['Docker', 'Linux', 'Active Directory Labs', 'Wazuh', 'CTF Engine', 'Malware Sandbox', 'Forensics'],
        timeline: rangeTimeline,
        operatives: [
          { name: 'Liyander Rishwanth', role: 'Lead Developer' },
          { name: 'Keerthi Ragavan', role: 'Product Lead' }
        ]
      };
    }
    if (project.title === 'Incognitrix Academy') {
      return {
        ...project,
        description: academyDescription,
        shortDesc: 'Practical cyber security learning modules, guided exercises, and learner roadmaps.',
        usage_desc: 'Used for practical learning, module delivery, challenge walkthroughs, and structured cyber security roadmaps.',
        operatives: [{ name: 'Liyander Rishwanth', role: 'Lead Developer' }]
      };
    }
    if (project.title === 'Incognitrix Portfolio') return {
      ...project,
      operatives: [
        { name: 'Liyander Rishwanth', role: 'Lead Developer' },
        { name: 'Abinesh', role: 'Product Lead' }
      ]
    };
    if (project.title === 'AR VR Project') return { ...project, operatives: [{ name: 'Kowshik T', role: 'Lead Developer' }] };
    if (project.title === 'Incognitrix Career') return { ...project, operatives: [{ name: 'Harish Kumar N', role: 'Lead Developer' }] };
    return project;
  });

  return {
    teams: Array.from(teams).sort(),
    individuals: Array.from(individuals.values()),
    projects: projectsWithRequestedContent,
    cves: requestedCves,
    achievements: Array.from(achievements.values()).slice(0, 20)
  };
}

async function importData(data) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    technical_summary TEXT,
    current_objective TEXT
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS individuals (
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
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS projects (
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
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS cves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cve_number VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    poc TEXT,
    reference_link JSON,
    contributors JSON
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date DATE,
    future_scope TEXT,
    reference_link JSON,
    contributors JSON
  )`);

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE individuals');
  await pool.query('TRUNCATE TABLE teams');
  await pool.query('TRUNCATE TABLE projects');
  await pool.query('TRUNCATE TABLE cves');
  await pool.query('TRUNCATE TABLE achievements');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  const teamIdMap = new Map();
  for (const teamName of data.teams) {
    const [result] = await pool.query(
      'INSERT INTO teams (name, description, technical_summary, current_objective) VALUES (?, ?, ?, ?)',
      [
        teamName,
        `Operations and specialized focus for ${teamName}.`,
        `Technical operations, documentation, and delivery activity for ${teamName}.`,
        `Maintain active work streams and publish progress for ${teamName}.`
      ]
    );
    teamIdMap.set(teamName, result.insertId);
  }

  for (const individual of data.individuals) {
    const teamId = teamIdMap.get(individual.team_name) || null;
    await pool.query(
      'INSERT INTO individuals (name, role, team_id, department, year_of_study, achievements, certificates, research_work, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        individual.name,
        individual.role || 'Operative',
        teamId,
        individual.department,
        individual.year_of_study,
        JSON.stringify(individual.achievements),
        JSON.stringify(individual.certificates),
        JSON.stringify(individual.research_work),
        ''
      ]
    );
  }

  for (const project of data.projects) {
    await pool.query(
      `INSERT INTO projects
       (id, title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.title,
        project.status,
        project.priority,
        project.description,
        project.shortDesc,
        '',
        JSON.stringify(project.stack),
        JSON.stringify(project.timeline),
        project.beneficiaries,
        project.team,
        project.usage_desc,
        JSON.stringify(project.operatives)
      ]
    );
  }

  for (const cve of data.cves) {
    await pool.query(
      'INSERT INTO cves (cve_number, details, poc, reference_link, contributors) VALUES (?, ?, ?, ?, ?)',
      [
        cve.cve_number,
        `${cve.product}: ${cve.details}`,
        'Public details and lab reproduction notes are tracked by the named finder. No exploit payload is stored here.',
        JSON.stringify(cve.references),
        JSON.stringify([cve.finder])
      ]
    );
  }

  await pool.query(
    'UPDATE teams SET description = ?, technical_summary = ?, current_objective = ? WHERE name = ?',
    [
      'Networking team responsible for lab network design, cluster operations, and traffic visualization.',
      networkingSummary,
      'Maintain the restricted lab network, Raspberry Pi load-balancing cluster, JOBE compilation workers, and the network simulation dashboard.',
      'Networking Team'
    ]
  );

  for (const achievement of data.achievements) {
    await pool.query(
      'INSERT INTO achievements (title, description, date, future_scope, reference_link, contributors) VALUES (?, ?, ?, ?, ?, ?)',
      [
        achievement.title,
        achievement.description,
        /^\d{4}-\d{2}-\d{2}$/.test(achievement.date || '') ? achievement.date : null,
        achievement.future_scope,
        JSON.stringify(achievement.reference_link),
        JSON.stringify([...new Set(achievement.contributors)])
      ]
    );
  }

  await pool.end();
}

async function main() {
  const sheetsData = await fetchSheets();
  const data = collectData(sheetsData);
  await importData(data);
  console.log(`Imported ${data.teams.length} teams, ${data.individuals.length} individuals, ${data.projects.length} projects, ${data.cves.length} CVEs, ${data.achievements.length} achievements.`);
  console.log(`Projects: ${data.projects.map(project => project.title).join(', ')}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
