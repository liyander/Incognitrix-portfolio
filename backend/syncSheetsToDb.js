const { google } = require('googleapis');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function sync() {
    const auth = new google.auth.GoogleAuth({
        keyFile: '../api.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const spreadsheetId = '19aB9aDWJ1G473ILMhRUBPz5IQxXxmYq96sXgKZCyyu4';
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const meta = await googleSheets.spreadsheets.get({ spreadsheetId });
    const sheets = meta.data.sheets.map(s => s.properties.title);

    const sheetsData = {};
    for (const sheet of sheets) {
        const d = await googleSheets.spreadsheets.values.get({ spreadsheetId, range: sheet });
        const rows = d.data.values;
        if (!rows || rows.length < 2) continue;
        const keys = rows[0].map(k => k ? k.trim() : '');
        sheetsData[sheet] = rows.slice(1).map(row => {
            let obj = {};
            keys.forEach((k, i) => { if (k) obj[k] = row[i]; });
            return obj;
        });
    }

    const pool = mysql.createPool({
        host: 'localhost',
        user: 'CTF',
        password: 'root',
        database: 'incognitrix_db_new'
    });

    const allTeams = new Set();
    const allInds = [];
    const studentSheets = ['Technical Team', 'CVE Hunt Team', 'Escape Room Team', 'Cyber-AR&VR', 'Internship/Placed'];

    studentSheets.forEach((sheetName) => {
        if (sheetsData[sheetName]) {
            sheetsData[sheetName].forEach(row => {
                const name = row['NAME'] || row['NAME '];
                if (name) {
                    const teamName = row['TEAM NAME'] || sheetName;
                    allTeams.add(teamName);
                    allInds.push({
                        name: name,
                        team_name: teamName,
                        role: row['WORK'] || 'Operative',
                        department: row['DEPT - YEAR'] || 'Unknown',
                        achievements: row['ACHIEVEMENTS'] || '',
                        certificates: row['CERTIFICATES'] || '',
                        research_work: row['RESEARCH WORK'] || ''
                    });
                }
            });
        }
    });

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE individuals');
    await pool.query('TRUNCATE TABLE teams');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    const teamIdMap = {};
    for (const tname of allTeams) {
        const [res] = await pool.query('INSERT INTO teams (name, description, technical_summary, current_objective) VALUES (?, ?, ?, ?)', [
            tname, 'Operations and specialized focus for ' + tname, 'Technical operations inside ' + tname + ' division.', 'Sustain and advance ' + tname + ' directives.'
        ]);
        teamIdMap[tname] = res.insertId;
    }

    const seen = new Set();
    for (const ind of allInds) {
        if (!seen.has(ind.name)) {
            seen.add(ind.name);
            const tid = teamIdMap[ind.team_name];
            await pool.query('INSERT INTO individuals (name, role, team_id, department, achievements, certificates, research_work) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                ind.name, ind.role, tid, ind.department,
                JSON.stringify([ind.achievements]),
                JSON.stringify([ind.certificates]),
                JSON.stringify([ind.research_work])
            ]);
        }
    }

    console.log("Sync complete! Unique Individuals: " + seen.size);
    process.exit(0);
}

sync().catch(console.error);
