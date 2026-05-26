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
        
        let headerIndex = 0;
        if (rows[0] && rows[0][0] && rows[0][0].includes("DETAILS")) {
            headerIndex = 1; // "Project" sheet has header on row 2
        }
        
        const keys = rows[headerIndex].map(k => k ? k.trim() : '');
        sheetsData[sheet] = rows.slice(headerIndex + 1).map(row => {
            let obj = {};
            keys.forEach((k, i) => { if (k) obj[k] = row[i]; });
            return obj;
        });
    }

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'CTF',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'incognitrix_db_new'
    });

    const allTeams = new Set();
    const allIndsMap = {}; // name -> data
    const allProjectsMap = {}; // name -> data
    const studentSheets = ['Technical Team', 'CVE Hunt Team', 'Escape Room Team', 'Cyber-AR&VR', 'Internship/Placed', 'Project'];

    // 1. Parse Individuals & Projects
    studentSheets.forEach((sheetName) => {
        if (sheetsData[sheetName]) {
            sheetsData[sheetName].forEach(row => {
                const name = row['NAME'] || row['NAME '] || row['STUDENT LEARNER'] || row['LEADING BY'];
                if (name && name.trim()) {
                    const normName = name.trim().replace(/\s+/g, ' ');
                    const teamName = row['TEAM NAME'] || (sheetName === 'Project' ? 'Project Team' : sheetName);
                    allTeams.add(teamName);
                    
                    if (!allIndsMap[normName]) {
                        allIndsMap[normName] = {
                            name: normName,
                            team_name: teamName,
                            role: row['WORK'] || 'Operative',
                            department: row['DEPT - YEAR'] || 'Unknown',
                            year: row['YEAR'] || row['DEPT - YEAR'] || 'Unknown',
                            achievements: [],
                            certificates: [],
                            research_work: []
                        };
                    }

                    if (row['ACHIEVEMENTS']) allIndsMap[normName].achievements.push(row['ACHIEVEMENTS']);
                    if (row['CERTIFICATES']) allIndsMap[normName].certificates.push(row['CERTIFICATES']);
                    if (row['RESEARCH WORK']) allIndsMap[normName].research_work.push(row['RESEARCH WORK']);
                    
                    // Collect Projects from the "Project" sheet
                    if (sheetName === 'Project' && row['PROJECT NAME']) {
                        const pName = row['PROJECT NAME'].trim();
                        if (!allProjectsMap[pName]) {
                            allProjectsMap[pName] = {
                                title: pName,
                                status: 'ONGOING',
                                priority: 'STANDARD',
                                team: teamName,
                                operatives: []
                            };
                        }
                        if (!allProjectsMap[pName].operatives.includes(normName)) {
                            allProjectsMap[pName].operatives.push(normName);
                        }
                    }
                }
            });
        }
    });

    // 2. Parse Achievements Sheet
    if (sheetsData['Achievements']) {
        let lastRank = '';
        let lastEvent = '';
        let lastDate = '';
        sheetsData['Achievements'].forEach(row => {
            const name = row['NAME'] || row['NAME '];
            if (name && name.trim()) {
                const normName = name.trim().replace(/\s+/g, ' ');
                if (allIndsMap[normName]) {
                    const evt = row['EVENT/PROGRAM'] || lastEvent;
                    const date = row['DATE'] || lastDate;
                    const rank = row['RANK'] || lastRank;
                    
                    if (row['EVENT/PROGRAM']) lastEvent = evt;
                    if (row['DATE']) lastDate = date;
                    if (row['RANK']) lastRank = rank;
                    
                    allIndsMap[normName].achievements.push({
                        title: evt,
                        date: date,
                        rank: rank,
                        location: row['LOCATION'] || ''
                    });
                }
            }
        });
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE individuals');
    await pool.query('TRUNCATE TABLE teams');
    await pool.query('TRUNCATE TABLE projects');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log("Inserting Teams...");
    const teamIdMap = {};
    for (const tname of allTeams) {
        const [res] = await pool.query('INSERT INTO teams (name, description, technical_summary, current_objective) VALUES (?, ?, ?, ?)', [
            tname, 'Operations and specialized focus for ' + tname, 'Technical operations inside ' + tname + ' division.', 'Sustain and advance ' + tname + ' directives.'
        ]);
        teamIdMap[tname] = res.insertId;
    }

    console.log("Inserting Individuals...");
    let indCount = 0;
    for (const normName in allIndsMap) {
        const ind = allIndsMap[normName];
        const tid = teamIdMap[ind.team_name];
        await pool.query('INSERT INTO individuals (name, role, team_id, department, year_of_study, achievements, certificates, research_work) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
            ind.name, ind.role, tid, ind.department, ind.year,
            JSON.stringify(ind.achievements),
            JSON.stringify(ind.certificates),
            JSON.stringify(ind.research_work)
        ]);
        indCount++;
    }

    console.log("Inserting Projects...");
    let projCount = 0;
    for (const pName in allProjectsMap) {
        const proj = allProjectsMap[pName];
        await pool.query(`
            INSERT INTO projects 
            (id, title, status, priority, description, shortDesc, team, operatives) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'PROJ-' + (++projCount),
            proj.title,
            proj.status,
            proj.priority,
            'Detailed analysis and tracking for ' + proj.title,
            'Ongoing directive focusing on ' + proj.title,
            proj.team,
            JSON.stringify(proj.operatives)
        ]);
    }

    console.log(`Sync complete! Teams: ${allTeams.size}, Individuals: ${indCount}, Projects: ${projCount}`);
    process.exit(0);
}

sync().catch(console.error);
