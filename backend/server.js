const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 1337;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const toJsonArray = (value) => {
    if (!value) return JSON.stringify([]);
    if (Array.isArray(value)) return JSON.stringify(value.filter(Boolean));
    return JSON.stringify([value].filter(Boolean));
};

const parseJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
};

const normalizePersonKey = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getPersonMatchKeys = (value) => {
    const text = String(value || '').toLowerCase();
    const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);
    const nameTokens = tokens.filter(token => token.length > 1);
    const keys = new Set([
        normalizePersonKey(value),
        nameTokens.join(''),
        nameTokens.slice(0, 2).join('')
    ].filter(Boolean));

    [...keys].forEach(key => {
        keys.add(key.replace('liyandar', 'liyander'));
        keys.add(key.replace('liyander', 'liyandar'));
    });

    return [...keys];
};

const levenshteinDistance = (a, b) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 0; i < a.length; i += 1) {
        let current = [i + 1];
        for (let j = 0; j < b.length; j += 1) {
            current[j + 1] = Math.min(
                current[j] + 1,
                previous[j + 1] + 1,
                previous[j] + (a[i] === b[j] ? 0 : 1)
            );
        }
        previous.splice(0, previous.length, ...current);
    }
    return previous[b.length];
};

const isPersonMatch = (left, right) => {
    const leftKeys = getPersonMatchKeys(left);
    const rightKeys = getPersonMatchKeys(right);
    return leftKeys.some(leftKey => rightKeys.some(rightKey => (
        leftKey === rightKey ||
        (leftKey.length > 4 && rightKey.length > 4 && (leftKey.includes(rightKey) || rightKey.includes(leftKey))) ||
        (leftKey.length > 6 && rightKey.length > 6 && levenshteinDistance(leftKey, rightKey) <= 2)
    )));
};

const parseLooseDateKey = (value) => {
    if (!value) return null;
    if (value instanceof Date) return formatDateKey(value);
    const text = String(value).trim();

    let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match) return text;

    match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
    if (match) return `${match[3]}-${match[1]}-${match[2]}`;

    return null;
};

// Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL Database: incognitrix_lab');
        connection.release();
        ensureRuntimeSchema();
    })
    .catch(err => {
        console.error('Database connection failed. Ensure MySQL is running, the user CTF exists, and the incognitrix_lab database is created.', err);
    });

async function ensureRuntimeSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                attendance_date DATE NOT NULL,
                UNIQUE KEY org_emp_date (user_id, attendance_date)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                twofa_secret VARCHAR(255),
                has_2fa_enabled BOOLEAN DEFAULT FALSE
            )
        `);

        const [attendanceColumns] = await pool.query('SHOW COLUMNS FROM attendance');
        const hasAttendanceDate = attendanceColumns.some(col => col.Field === 'attendance_date');
        const hasCheckInDate = attendanceColumns.some(col => col.Field === 'check_in_date');
        if (!hasAttendanceDate) {
            await pool.query('ALTER TABLE attendance ADD COLUMN attendance_date DATE NULL');
            if (hasCheckInDate) {
                await pool.query('UPDATE attendance SET attendance_date = check_in_date WHERE attendance_date IS NULL');
            }
            await pool.query('UPDATE attendance SET attendance_date = CURRENT_DATE WHERE attendance_date IS NULL');
            await pool.query('ALTER TABLE attendance MODIFY attendance_date DATE NOT NULL');
        }

        const [userColumns] = await pool.query('SHOW COLUMNS FROM users');
        if (!userColumns.some(col => col.Field === 'twofa_secret')) {
            await pool.query('ALTER TABLE users ADD COLUMN twofa_secret VARCHAR(255)');
        }
        if (!userColumns.some(col => col.Field === 'has_2fa_enabled')) {
            await pool.query('ALTER TABLE users ADD COLUMN has_2fa_enabled BOOLEAN DEFAULT FALSE');
        }

        const [individualColumns] = await pool.query('SHOW COLUMNS FROM individuals');
        if (!individualColumns.some(col => col.Field === 'daily_work')) {
            await pool.query('ALTER TABLE individuals ADD COLUMN daily_work TEXT');
        }
        if (!individualColumns.some(col => col.Field === 'studying_year')) {
            await pool.query('ALTER TABLE individuals ADD COLUMN studying_year INT');
            await pool.query(`
                UPDATE individuals
                SET studying_year = CAST(REGEXP_SUBSTR(year_of_study, '[0-9]+') AS UNSIGNED)
                WHERE studying_year IS NULL AND year_of_study REGEXP '[0-9]+'
            `);
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS individual_work_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                individual_id INT NOT NULL,
                work_date DATE NOT NULL,
                work_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY individual_work_date (individual_id, work_date)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS upcoming_ctfs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                url TEXT,
                start_time DATETIME,
                end_time DATETIME,
                format VARCHAR(255),
                location VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_holidays (
                id INT AUTO_INCREMENT PRIMARY KEY,
                holiday_date DATE NOT NULL UNIQUE,
                title VARCHAR(255) NOT NULL,
                holiday_type VARCHAR(100) DEFAULT 'Institute Holiday',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_od (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                od_date DATE NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY user_od_date (user_id, od_date)
            )
        `);
    } catch (err) {
        console.error('Runtime schema migration failed:', err);
    }
}

async function markAttendance(userId, username) {
    const today = formatDateKey(new Date());
    try {
        await pool.query(
            "INSERT INTO attendance (user_id, attendance_date) VALUES (?, ?)",
            [userId, today]
        );
        return { success: true, message: "Attendance marked as present for today!", username, attendanceRecorded: true };
    } catch (attErr) {
        if (attErr.code === 'ER_DUP_ENTRY') {
            return { success: true, message: "Attendance already marked for today.", username, attendanceRecorded: false, alreadyMarked: true };
        }
        throw attErr;
    }
}

// -----------------------------------------
// ROUTES
// -----------------------------------------

// GET all projects
app.get('/api/projects', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching projects' });
    }
});

// GET single project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching project' });
    }
});

// POST new project (Admin Panel)
app.post('/api/projects', async (req, res) => {
    const { id, title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives } = req.body;
    try {
        const query = `
            INSERT INTO projects 
            (id, title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // We use JSON.stringify for arrays/objects so they are stored as JSON in MySQL
        const values = [
            id, title, status, priority, description, shortDesc, image, 
            JSON.stringify(stack || []), 
            JSON.stringify(timeline || []), 
            beneficiaries, team, usage_desc, 
            JSON.stringify(operatives || [])
        ];
        
        await pool.query(query, values);
        res.status(201).json({ message: 'Project created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating project. Did you check constraints?' });
    }
});

// PUT update project (Admin Panel)
app.put('/api/projects/:id', async (req, res) => {
    const { title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives } = req.body;
    try {
        const query = `
            UPDATE projects SET 
            title = ?, status = ?, priority = ?, description = ?, shortDesc = ?, image = ?, 
            stack = ?, timeline = ?, beneficiaries = ?, team = ?, usage_desc = ?, operatives = ?
            WHERE id = ?
        `;
        const values = [
            title, status, priority, description, shortDesc, image, 
            JSON.stringify(stack || []), 
            JSON.stringify(timeline || []), 
            beneficiaries, team, usage_desc, 
            JSON.stringify(operatives || []),
            req.params.id
        ];
        
        const [result] = await pool.query(query, values);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating project' });
    }
});

// DELETE project (Admin Panel)
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting project' });
    }
});

// -----------------------------------------
// TEAMS ROUTES
// -----------------------------------------
app.get('/api/teams', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM teams
            ORDER BY CASE WHEN name = 'Red Team' THEN 0 ELSE 1 END, name
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching teams' });
    }
});

app.post('/api/teams', async (req, res) => {
    const { name, description, technical_summary, current_objective } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO teams (name, description, technical_summary, current_objective) VALUES (?, ?, ?, ?)', [name, description, technical_summary, current_objective]);
        res.status(201).json({ id: result.insertId, message: 'Team created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating team' });
    }
});

app.put('/api/teams/:id', async (req, res) => {
    const { name, description, technical_summary, current_objective } = req.body;
    try {
        await pool.query('UPDATE teams SET name = ?, description = ?, technical_summary = ?, current_objective = ? WHERE id = ?', [name, description, technical_summary, current_objective, req.params.id]);
        res.json({ message: 'Team updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating team' });
    }
});

app.delete('/api/teams/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting team' });
    }
});

// -----------------------------------------
// INDIVIDUALS ROUTES
// -----------------------------------------
app.get('/api/individuals', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, t.name as team_name, wl.work_text as current_day_work
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
            LEFT JOIN individual_work_logs wl ON wl.individual_id = i.id AND wl.work_date = CURRENT_DATE
            ORDER BY CASE
                WHEN LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) IN ('liyandarrishwanthl', 'liyanderrishwanthl') THEN 0
                ELSE 1
            END, i.name
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching individuals' });
    }
});

app.get('/api/individuals/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, t.name as team_name, wl.work_text as current_day_work, u.id as attendance_user_id
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
            LEFT JOIN individual_work_logs wl ON wl.individual_id = i.id AND wl.work_date = CURRENT_DATE
            LEFT JOIN users u
                ON LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) = LOWER(REPLACE(REPLACE(u.username, '.', ''), ' ', ''))
            WHERE i.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Individual not found' });
        const [workTimeline] = await pool.query(`
            SELECT id, work_date, work_text, created_at, updated_at
            FROM individual_work_logs
            WHERE individual_id = ?
            ORDER BY work_date DESC, id DESC
            LIMIT 60
        `, [req.params.id]);

        const todayKey = formatDateKey(new Date());
        const requestedMonth = req.query.month || todayKey.slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(requestedMonth)) {
            return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
        }

        const monthStart = `${requestedMonth}-01`;
        const monthEndDate = new Date(`${monthStart}T00:00:00`);
        monthEndDate.setMonth(monthEndDate.getMonth() + 1);
        monthEndDate.setDate(0);
        const monthEnd = formatDateKey(monthEndDate);
        const calendarDates = getDateRange(monthStart, monthEnd).map(formatDateKey);
        const statusEnd = requestedMonth === todayKey.slice(0, 7) && todayKey < monthEnd ? todayKey : monthEnd;
        const workingDateKeys = await getWorkingDateKeys(monthStart, statusEnd);
        const workingDateSet = new Set(workingDateKeys);
        const individual = rows[0];
        const attendanceUserKeys = [
            individual.attendance_user_id,
            individual.id,
            individual.name,
            normalizePersonKey(individual.name)
        ].filter(Boolean).map(String);

        const [attendanceRows] = attendanceUserKeys.length > 0 ? await pool.query(
            'SELECT attendance_date FROM attendance WHERE user_id IN (?) AND attendance_date BETWEEN ? AND ?',
            [attendanceUserKeys, monthStart, statusEnd]
        ) : [[]];
        const [odRows] = attendanceUserKeys.length > 0 ? await pool.query(
            'SELECT od_date, reason FROM attendance_od WHERE user_id IN (?) AND od_date BETWEEN ? AND ?',
            [attendanceUserKeys, monthStart, statusEnd]
        ) : [[]];

        const presentDates = new Set(attendanceRows.map(row => toDateKey(row.attendance_date)));
        parseJsonArray(individual.achievements).forEach(item => {
            const dateKey = parseLooseDateKey(item.date);
            if (dateKey && dateKey >= monthStart && dateKey <= statusEnd) {
                presentDates.add(dateKey);
            }
        });
        const odByDate = new Map(odRows.map(row => [toDateKey(row.od_date), row.reason || 'On duty']));
        const attendanceCalendar = calendarDates.map(dateKey => {
            const date = new Date(`${dateKey}T00:00:00`);
            let status = 'off';
            let label = 'Not counted';

            if (dateKey > statusEnd || requestedMonth > todayKey.slice(0, 7)) {
                status = 'upcoming';
                label = 'Upcoming';
            } else if (workingDateSet.has(dateKey)) {
                if (presentDates.has(dateKey)) {
                    status = 'present';
                    label = 'Present';
                } else if (odByDate.has(dateKey)) {
                    status = 'od';
                    label = odByDate.get(dateKey);
                } else {
                    status = 'absent';
                    label = 'Absent';
                }
            }

            return {
                date: dateKey,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                status,
                label
            };
        });

        const [achievementRows] = await pool.query('SELECT * FROM achievements ORDER BY date DESC, id DESC');
        const linkedAchievements = achievementRows.filter(achievement => {
            const contributors = parseJsonArray(achievement.contributors);
            return contributors.some(contributor => isPersonMatch(contributor, individual.name));
        });

        res.json({
            ...individual,
            work_timeline: workTimeline,
            linked_achievements: linkedAchievements,
            attendance_calendar: attendanceCalendar,
            attendance_calendar_month: requestedMonth
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching individual' });
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

app.post('/api/individuals', async (req, res) => {
    const { name, role, team_id, department, year_of_study, studying_year, daily_work, achievements, certificates, research_work, image } = req.body;
    try {
        const parsedTeamId = team_id && team_id !== '' ? parseInt(team_id, 10) : null;
        const parsedStudyingYear = studying_year && studying_year !== '' ? parseInt(studying_year, 10) : null;

        const [result] = await pool.query(
            'INSERT INTO individuals (name, role, team_id, department, year_of_study, studying_year, daily_work, achievements, certificates, research_work, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                name, role, parsedTeamId, department, year_of_study, parsedStudyingYear, daily_work || '',
                JSON.stringify(achievements || []), 
                JSON.stringify(certificates || []), 
                JSON.stringify(research_work || []),
                image || ''
            ]
        );
        if (daily_work) {
            await pool.query(
                `INSERT INTO individual_work_logs (individual_id, work_date, work_text)
                 VALUES (?, CURRENT_DATE, ?)
                 ON DUPLICATE KEY UPDATE work_text = VALUES(work_text)`,
                [result.insertId, daily_work]
            );
        }
        res.status(201).json({ id: result.insertId, message: 'Individual created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating individual' });
    }
});

app.put('/api/individuals/:id', async (req, res) => {
    const { name, role, team_id, department, year_of_study, studying_year, daily_work, achievements, certificates, research_work, image } = req.body;
    try {
        const parsedTeamId = team_id && team_id !== '' ? parseInt(team_id, 10) : null;
        const parsedStudyingYear = studying_year && studying_year !== '' ? parseInt(studying_year, 10) : null;
        await pool.query(
            'UPDATE individuals SET name = ?, role = ?, team_id = ?, department = ?, year_of_study = ?, studying_year = ?, daily_work = ?, achievements = ?, certificates = ?, research_work = ?, image = ? WHERE id = ?',
            [
                name, role, parsedTeamId, department, year_of_study, parsedStudyingYear, daily_work || '',
                JSON.stringify(achievements || []), 
                JSON.stringify(certificates || []), 
                JSON.stringify(research_work || []), 
                image || '',
                req.params.id
            ]
        );
        if (daily_work) {
            await pool.query(
                `INSERT INTO individual_work_logs (individual_id, work_date, work_text)
                 VALUES (?, CURRENT_DATE, ?)
                 ON DUPLICATE KEY UPDATE work_text = VALUES(work_text)`,
                [req.params.id, daily_work]
            );
        }
        res.json({ message: 'Individual updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating individual' });
    }
});

app.patch('/api/individuals/:id/daily-work', async (req, res) => {
    const { daily_work, work_date } = req.body;
    try {
        const targetDate = work_date || null;
        await pool.query(
            'UPDATE individuals SET daily_work = ? WHERE id = ?',
            [daily_work || '', req.params.id]
        );
        await pool.query(
            `INSERT INTO individual_work_logs (individual_id, work_date, work_text)
             VALUES (?, COALESCE(?, CURRENT_DATE), ?)
             ON DUPLICATE KEY UPDATE work_text = VALUES(work_text)`,
            [req.params.id, targetDate, daily_work || '']
        );
        res.json({ message: 'Current day work stored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating daily work' });
    }
});

app.delete('/api/individuals/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM individuals WHERE id = ?', [req.params.id]);
        res.json({ message: 'Individual deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting individual' });
    }
});

// -----------------------------------------
// UPCOMING CTF ROUTES
// -----------------------------------------
const mapCtftimeEvent = (event) => ({
    source: 'ctftime',
    id: `ctftime-${event.id}`,
    title: event.title,
    url: event.url || event.ctftime_url || '',
    start_time: event.start,
    end_time: event.finish,
    format: event.format || 'CTF',
    location: event.location || 'Online',
    description: event.description || ''
});

app.get('/api/upcoming-ctfs', async (req, res) => {
    try {
        const [manualRows] = await pool.query(`
            SELECT 'manual' as source, id, title, url, start_time, end_time, format, location, description
            FROM upcoming_ctfs
            WHERE start_time IS NULL OR end_time IS NULL OR end_time >= NOW()
            ORDER BY COALESCE(start_time, NOW()) ASC, id DESC
        `);

        let ctftimeEvents = [];
        try {
            const now = Math.floor(Date.now() / 1000);
            const response = await fetch(`https://ctftime.org/api/v1/events/?limit=20&start=${now}`, {
                headers: {
                    'User-Agent': 'Incognitrix-Lab-Dashboard/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                ctftimeEvents = Array.isArray(data) ? data.map(mapCtftimeEvent) : [];
            }
        } catch (ctftimeErr) {
            console.error('CTFTIME fetch failed:', ctftimeErr.message);
        }

        const combined = [...manualRows, ...ctftimeEvents].sort((a, b) => {
            const aTime = a.start_time ? new Date(a.start_time).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.start_time ? new Date(b.start_time).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });

        res.json(combined);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching upcoming CTFs' });
    }
});

app.post('/api/upcoming-ctfs', async (req, res) => {
    const { title, url, start_time, end_time, format, location, description } = req.body;
    const normalizeDateTime = (value) => value ? String(value).replace('T', ' ') : null;

    if (!title) {
        return res.status(400).json({ error: 'CTF title is required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO upcoming_ctfs (title, url, start_time, end_time, format, location, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, url || '', normalizeDateTime(start_time), normalizeDateTime(end_time), format || 'Jeopardy', location || 'Online', description || '']
        );
        res.status(201).json({ id: result.insertId, message: 'Upcoming CTF added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error adding upcoming CTF' });
    }
});

app.delete('/api/upcoming-ctfs/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM upcoming_ctfs WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Manual CTF not found' });
        res.json({ message: 'Upcoming CTF deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting upcoming CTF' });
    }
});

app.get('/api/cves', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM cves');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/cves', async (req, res) => {
    const { cve_number, details, poc, reference_link, contributors } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO cves (cve_number, details, poc, reference_link, contributors) VALUES (?, ?, ?, ?, ?)', [cve_number, details, poc, toJsonArray(reference_link), JSON.stringify(contributors || [])]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/api/cves/:id', async (req, res) => {
    const { cve_number, details, poc, reference_link, contributors } = req.body;
    try {
        await pool.query('UPDATE cves SET cve_number=?, details=?, poc=?, reference_link=?, contributors=? WHERE id=?', [cve_number, details, poc, toJsonArray(reference_link), JSON.stringify(contributors || []), req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.delete('/api/cves/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM cves WHERE id=?', [req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/achievements', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM achievements');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/achievements', async (req, res) => {
    const { title, description, date, future_scope, reference_link, contributors } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO achievements (title, description, date, future_scope, reference_link, contributors) VALUES (?, ?, ?, ?, ?, ?)', [title, description, date || null, future_scope, toJsonArray(reference_link), JSON.stringify(contributors || [])]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/api/achievements/:id', async (req, res) => {
    const { title, description, date, future_scope, reference_link, contributors } = req.body;
    try {
        await pool.query('UPDATE achievements SET title=?, description=?, date=?, future_scope=?, reference_link=?, contributors=? WHERE id=?', [title, description, date || null, future_scope, toJsonArray(reference_link), JSON.stringify(contributors || []), req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.delete('/api/achievements/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM achievements WHERE id=?', [req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// FUTURE SCOPES ROUTES
app.get('/api/future_scopes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM future_scopes');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.post('/api/future_scopes', async (req, res) => {
    const { title, description, expected_outcome, start_date, end_date } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO future_scopes (title, description, expected_outcome, start_date, end_date) VALUES (?, ?, ?, ?, ?)', [title, description, expected_outcome, start_date, end_date]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/api/future_scopes/:id', async (req, res) => {
    const { title, description, expected_outcome, start_date, end_date } = req.body;
    try {
        await pool.query('UPDATE future_scopes SET title=?, description=?, expected_outcome=?, start_date=?, end_date=? WHERE id=?', [title, description, expected_outcome, start_date, end_date, req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.delete('/api/future_scopes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM future_scopes WHERE id=?', [req.params.id]);
        res.json({ message: 'Success' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

const bcrypt = require('bcryptjs');

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
            res.json({ success: true, username: admin.username });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Create New
app.post('/api/admin/create', async (req, res) => {
    const { newUsername, newPassword } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM admins WHERE username = ?', [newUsername]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Username taken' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', [newUsername, hashed]);
        res.json({ success: true, message: 'Admin created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
// Admin Create New User (Operative)
app.post('/api/admin/create-user', async (req, res) => {
    const { newUsername, newPassword } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [newUsername]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Username taken' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [newUsername, hashed]);
        res.json({ success: true, message: 'User created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Create/Reset Individual User Password
app.post('/api/admin/update-user-password', async (req, res) => {
    const username = (req.body.username || req.body.newUsername || '').trim();
    const newPassword = req.body.newPassword || req.body.password || '';

    if (!username || !newPassword) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query(`
            INSERT INTO users (username, password, twofa_secret, has_2fa_enabled)
            VALUES (?, ?, NULL, FALSE)
            ON DUPLICATE KEY UPDATE
                password = VALUES(password),
                twofa_secret = NULL,
                has_2fa_enabled = FALSE
        `, [username, hashed]);

        res.json({ success: true, message: 'User password updated successfully. 2FA has been reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Delete Operative User
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM attendance WHERE user_id = ?', [req.params.id]);
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Operative user not found' });
        }

        res.json({ success: true, message: 'Operative user deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Change Password
app.post('/api/admin/change-password', async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        
        const admin = rows[0];
        const match = await bcrypt.compare(currentPassword, admin.password);
        if (!match) return res.status(401).json({ success: false, message: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hashed, admin.id]);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const padDatePart = (value) => String(value).padStart(2, '0');

const formatDateKey = (date) => (
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
);

const toDateKey = (value) => {
    if (!value) return null;
    if (value instanceof Date) return formatDateKey(value);
    return String(value).slice(0, 10);
};

const isFirstOrThirdSaturday = (date) => {
    if (date.getDay() !== 6) return false;
    const day = date.getDate();
    return day <= 7 || (day >= 15 && day <= 21);
};

const getDateRange = (startKey, endKey) => {
    const dates = [];
    const cursor = new Date(`${startKey}T00:00:00`);
    const end = new Date(`${endKey}T00:00:00`);
    while (cursor <= end) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
};

const getWorkingDateKeys = async (startKey, endKey) => {
    const [holidayRows] = await pool.query(
        'SELECT holiday_date FROM attendance_holidays WHERE holiday_date BETWEEN ? AND ?',
        [startKey, endKey]
    );
    const holidayDates = new Set(holidayRows.map(h => toDateKey(h.holiday_date)));

    return getDateRange(startKey, endKey)
        .filter(date => date.getDay() !== 0)
        .filter(date => !isFirstOrThirdSaturday(date))
        .map(formatDateKey)
        .filter(dateKey => !holidayDates.has(dateKey));
};

const escapeCsv = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
};

const getIsoWeekRange = (weekValue) => {
    const match = /^(\d{4})-W(\d{2})$/.exec(weekValue);
    if (!match) return null;

    const year = Number(match[1]);
    const week = Number(match[2]);
    if (week < 1 || week > 53) return null;

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const weekOneMonday = new Date(jan4);
    weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

    const start = new Date(weekOneMonday);
    start.setUTCDate(weekOneMonday.getUTCDate() + ((week - 1) * 7));

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    return {
        startKey: start.toISOString().slice(0, 10),
        endKey: end.toISOString().slice(0, 10)
    };
};

const formatDateDayLabel = (dateKey) => {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(`${dateKey}T00:00:00`);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${day}-${month}-${year} ${dayName}`;
};

const buildAttendanceStatusCsv = async (startKey, endKey, percentageHeader = 'Attendance Percentage') => {
    const todayKey = formatDateKey(new Date());
    const exportEnd = endKey > todayKey ? todayKey : endKey;
    const workingDateKeys = startKey <= exportEnd ? await getWorkingDateKeys(startKey, exportEnd) : [];
    const workingDateSet = new Set(workingDateKeys);

    const [people] = await pool.query(`
        SELECT
            i.id as individual_id,
            i.name as individual_name,
            i.department,
            i.year_of_study,
            i.studying_year,
            i.achievements,
            u.id as user_id,
            u.username
        FROM individuals i
        LEFT JOIN users u
            ON LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) = LOWER(REPLACE(REPLACE(u.username, '.', ''), ' ', ''))
        ORDER BY COALESCE(i.studying_year, 999), i.name
    `);
    const [attendanceRows] = await pool.query(
        'SELECT user_id, attendance_date FROM attendance WHERE attendance_date BETWEEN ? AND ?',
        [startKey, exportEnd]
    );
    const [odRows] = await pool.query(
        'SELECT user_id, od_date FROM attendance_od WHERE od_date BETWEEN ? AND ?',
        [startKey, exportEnd]
    );

    const attendanceByUser = new Map();
    attendanceRows.forEach(row => {
        const dateKey = toDateKey(row.attendance_date);
        if (!workingDateSet.has(dateKey)) return;
        const userKey = String(row.user_id);
        if (!attendanceByUser.has(userKey)) attendanceByUser.set(userKey, new Set());
        attendanceByUser.get(userKey).add(dateKey);
    });

    const odByUser = new Map();
    odRows.forEach(row => {
        const dateKey = toDateKey(row.od_date);
        if (!workingDateSet.has(dateKey)) return;
        const userKey = String(row.user_id);
        if (!odByUser.has(userKey)) odByUser.set(userKey, new Set());
        odByUser.get(userKey).add(dateKey);
    });

    const headers = [
        'Studying Year',
        'Name',
        'Username',
        'Department',
        ...workingDateKeys.map(formatDateDayLabel),
        percentageHeader
    ];

    const rows = people.map(person => {
        const personKeys = [
            person.user_id,
            person.individual_id,
            person.username,
            person.individual_name,
            normalizePersonKey(person.individual_name)
        ].filter(Boolean).map(String);
        const attendedDates = new Set();
        const odDates = new Set();

        personKeys.forEach(key => {
            (attendanceByUser.get(key) || new Set()).forEach(dateKey => attendedDates.add(dateKey));
            (odByUser.get(key) || new Set()).forEach(dateKey => odDates.add(dateKey));
        });

        parseJsonArray(person.achievements).forEach(item => {
            const dateKey = parseLooseDateKey(item.date);
            if (dateKey && workingDateSet.has(dateKey)) attendedDates.add(dateKey);
        });

        const statusCells = workingDateKeys.map(dateKey => {
            if (attendedDates.has(dateKey)) return 'Present';
            if (odDates.has(dateKey)) return 'OD';
            return 'Absent';
        });
        const effectivePresent = statusCells.filter(status => status === 'Present' || status === 'OD').length;
        const percentage = workingDateKeys.length === 0 ? 100 : Math.round((effectivePresent / workingDateKeys.length) * 100);

        return [
            person.studying_year || '',
            person.individual_name,
            person.username || '',
            'Cybersecurity',
            ...statusCells,
            `${percentage}%`
        ];
    });

    return [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
};

// Admin Get Attendance
app.get('/api/admin/attendance', async (req, res) => {
    try {
        const todayKey = formatDateKey(new Date());
        const [minRows] = await pool.query('SELECT MIN(attendance_date) as minDate FROM attendance');
        const minDateKey = toDateKey(minRows[0]?.minDate) || todayKey;
        const workingDateKeys = await getWorkingDateKeys(minDateKey, todayKey);

        const workingDateSet = new Set(workingDateKeys);
        const totalWorkingDays = workingDateKeys.length;

        const [users] = await pool.query(`
            SELECT u.id, u.username, i.studying_year
            FROM users u
            LEFT JOIN individuals i
                ON LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) = LOWER(REPLACE(REPLACE(u.username, '.', ''), ' ', ''))
            ORDER BY COALESCE(i.studying_year, 999), u.id ASC
        `);
        const [attendanceRows] = await pool.query(
            'SELECT user_id, attendance_date FROM attendance WHERE attendance_date BETWEEN ? AND ?',
            [minDateKey, todayKey]
        );
        const [odRows] = await pool.query(
            'SELECT user_id, od_date, reason FROM attendance_od WHERE od_date BETWEEN ? AND ?',
            [minDateKey, todayKey]
        );

        const attendanceByUser = new Map();
        attendanceRows.forEach(row => {
            const dateKey = toDateKey(row.attendance_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!attendanceByUser.has(userKey)) attendanceByUser.set(userKey, new Set());
            attendanceByUser.get(userKey).add(dateKey);
        });

        const odByUser = new Map();
        odRows.forEach(row => {
            const dateKey = toDateKey(row.od_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!odByUser.has(userKey)) odByUser.set(userKey, new Set());
            odByUser.get(userKey).add(dateKey);
        });

        const attendanceData = users.map(user => {
            const userKey = String(user.id);
            const attendedDates = attendanceByUser.get(userKey) || new Set();
            const odDates = odByUser.get(userKey) || new Set();
            const excusedOdDays = [...odDates].filter(dateKey => !attendedDates.has(dateKey)).length;
            const attendedDays = attendedDates.size;
            const effectivePresent = attendedDays + excusedOdDays;
            const percentage = totalWorkingDays === 0 ? 100 : Math.round((effectivePresent / totalWorkingDays) * 100);

            return {
                id: user.id,
                username: user.username,
                studying_year: user.studying_year,
                attended_days: attendedDays,
                od_days: excusedOdDays,
                working_days: totalWorkingDays,
                percentage
            };
        });

        res.json(attendanceData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching attendance' });
    }
});

app.get('/api/admin/attendance-holidays', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM attendance_holidays ORDER BY holiday_date DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching holidays' });
    }
});

app.post('/api/admin/attendance-holidays', async (req, res) => {
    const { holiday_date, title, holiday_type } = req.body;
    if (!holiday_date || !title) {
        return res.status(400).json({ error: 'Holiday date and title are required' });
    }

    try {
        await pool.query(
            `INSERT INTO attendance_holidays (holiday_date, title, holiday_type)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), holiday_type = VALUES(holiday_type)`,
            [holiday_date, title, holiday_type || 'Institute Holiday']
        );
        res.status(201).json({ message: 'Holiday saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error saving holiday' });
    }
});

app.delete('/api/admin/attendance-holidays/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM attendance_holidays WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Holiday not found' });
        res.json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting holiday' });
    }
});

app.post('/api/admin/attendance-od', async (req, res) => {
    const { user_id, od_date, reason } = req.body;
    if (!user_id || !od_date) {
        return res.status(400).json({ error: 'Operative and OD date are required' });
    }

    try {
        await pool.query(
            `INSERT INTO attendance_od (user_id, od_date, reason)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
            [user_id, od_date, reason || 'On duty']
        );
        res.status(201).json({ message: 'OD saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error saving OD' });
    }
});

app.get('/api/admin/attendance/monthly-export', async (req, res) => {
    try {
        const todayKey = formatDateKey(new Date());
        const requestedMonth = req.query.month || todayKey.slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(requestedMonth)) {
            return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
        }

        const monthStart = `${requestedMonth}-01`;
        const monthEndDate = new Date(`${monthStart}T00:00:00`);
        monthEndDate.setMonth(monthEndDate.getMonth() + 1);
        monthEndDate.setDate(0);
        const monthEnd = formatDateKey(monthEndDate);
        const exportEnd = requestedMonth === todayKey.slice(0, 7) && todayKey < monthEnd ? todayKey : monthEnd;

        const workingDateKeys = await getWorkingDateKeys(monthStart, exportEnd);
        const workingDateSet = new Set(workingDateKeys);
        const totalWorkingDays = workingDateKeys.length;

        const [users] = await pool.query(`
            SELECT
                u.id,
                u.username,
                i.name as individual_name,
                i.department,
                i.year_of_study,
                i.studying_year,
                t.name as team_name
            FROM users u
            LEFT JOIN individuals i
                ON LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) = LOWER(REPLACE(REPLACE(u.username, '.', ''), ' ', ''))
            LEFT JOIN teams t ON i.team_id = t.id
            ORDER BY COALESCE(i.studying_year, 999), i.name, u.username
        `);
        const [attendanceRows] = await pool.query(
            'SELECT user_id, attendance_date FROM attendance WHERE attendance_date BETWEEN ? AND ?',
            [monthStart, exportEnd]
        );
        const [odRows] = await pool.query(
            'SELECT user_id, od_date FROM attendance_od WHERE od_date BETWEEN ? AND ?',
            [monthStart, exportEnd]
        );

        const attendanceByUser = new Map();
        attendanceRows.forEach(row => {
            const dateKey = toDateKey(row.attendance_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!attendanceByUser.has(userKey)) attendanceByUser.set(userKey, new Set());
            attendanceByUser.get(userKey).add(dateKey);
        });

        const odByUser = new Map();
        odRows.forEach(row => {
            const dateKey = toDateKey(row.od_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!odByUser.has(userKey)) odByUser.set(userKey, new Set());
            odByUser.get(userKey).add(dateKey);
        });

        const headers = [
            'Studying Year',
            'Name',
            'Username',
            'Department',
            'Month',
            'Working Days',
            'Attended Days',
            'OD Days',
            'Effective Present',
            'Attendance Percentage'
        ];

        const rows = users.map(user => {
            const userKey = String(user.id);
            const attendedDates = attendanceByUser.get(userKey) || new Set();
            const odDates = odByUser.get(userKey) || new Set();
            const odDays = [...odDates].filter(dateKey => !attendedDates.has(dateKey)).length;
            const attendedDays = attendedDates.size;
            const effectivePresent = attendedDays + odDays;
            const percentage = totalWorkingDays === 0 ? 100 : Math.round((effectivePresent / totalWorkingDays) * 100);

            return [
                user.studying_year || '',
                user.individual_name || user.username,
                user.username,
                'Cybersecurity',
                requestedMonth,
                totalWorkingDays,
                attendedDays,
                odDays,
                effectivePresent,
                `${percentage}%`
            ];
        });

        const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-attendance-${requestedMonth}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error exporting monthly attendance' });
    }
});

app.get('/api/admin/attendance/weekly-export', async (req, res) => {
    try {
        const requestedWeek = req.query.week || '';
        const weekRange = getIsoWeekRange(requestedWeek);
        if (!weekRange) {
            return res.status(400).json({ error: 'Week must be in YYYY-Www format' });
        }

        const csv = await buildAttendanceStatusCsv(weekRange.startKey, weekRange.endKey, 'Weekly Percentage');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="weekly-attendance-${requestedWeek}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error exporting weekly attendance' });
    }
});

app.get('/api/admin/attendance/range-export', async (req, res) => {
    try {
        const from = req.query.from || '';
        const to = req.query.to || '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            return res.status(400).json({ error: 'From and To must be in YYYY-MM-DD format' });
        }

        const todayKey = formatDateKey(new Date());
        const cappedTo = to > todayKey ? todayKey : to;
        if (from > cappedTo) {
            return res.status(400).json({ error: 'From date cannot be after To date' });
        }

        const csv = await buildAttendanceStatusCsv(from, cappedTo, 'Attendance Percentage');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${from}-to-${cappedTo}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error exporting attendance range' });
    }
});

const { google } = require('googleapis');

app.get('/api/sheets-dashboard', async (req, res) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: '../api.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '19aB9aDWJ1G473ILMhRUBPz5IQxXxmYq96sXgKZCyyu4';

        const metadataResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetTitles = metadataResponse.data.sheets.map(sheet => sheet.properties.title);
        
        const allParsedData = {};

        for (const title of sheetTitles) {
            const dataResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: title });
            const rows = dataResponse.data.values;

            if (rows && rows.length > 1) {
                // Find the header row by looking for the row with the most non-empty string cells
                let headerIndex = 0;
                let maxNonEmpty = 0;
                for (let i = 0; i < Math.min(3, rows.length); i++) {
                    let nonEmptyCount = rows[i].filter(c => c && String(c).trim() !== '').length;
                    if (nonEmptyCount > maxNonEmpty) {
                        maxNonEmpty = nonEmptyCount;
                        headerIndex = i;
                    }
                }
                
                // For any empty header in the selected header row, fallback to the row above it
                const headers = [...rows[headerIndex]];
                if (headerIndex > 0) {
                    for (let c = 0; c < headers.length; c++) {
                        if (!headers[c] || headers[c].trim() === '') {
                            for (let r = headerIndex - 1; r >= 0; r--) {
                                if (rows[r] && rows[r][c] && rows[r][c].trim() !== '') {
                                    headers[c] = rows[r][c].trim();
                                    break;
                                }
                            }
                        }
                    }
                }
                
                const parsedSheetData = rows.slice(headerIndex + 1).map(row => {
                    const rowData = {};
                    headers.forEach((header, index) => {
                        if (header && header.trim() !== '') {
                            rowData[header] = row[index] !== undefined ? row[index] : null;
                        }
                    });
                    return rowData;
                });
                
                // Filter out empty rows
                allParsedData[title] = parsedSheetData.filter(r => Object.values(r).some(v => v !== null && v !== ''));
            } else {
                allParsedData[title] = [];
            }
        }
        
        res.json(allParsedData);
    } catch (err) {
        console.error('API Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch from Google Sheets' });
    }
});


const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// User Login (Non-Admin) -> returns whether 2FA is set up
app.post("/api/user/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });
        
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

        if (!user.has_2fa_enabled) {
            // Initiate 2FA setup
            const secret = speakeasy.generateSecret({ name: `Incognitrix Lab:${user.username}`, issuer: 'Incognitrix Lab' });
            await pool.query("UPDATE users SET twofa_secret = ? WHERE id = ?", [secret.base32, user.id]);
            const qrUrl = await qrcode.toDataURL(secret.otpauth_url);
            return res.json({ success: true, requires2FA: true, isFirstTime: true, qr: qrUrl, username: user.username });
        } else {
            return res.json({ success: true, requires2FA: true, isFirstTime: false, username: user.username });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Verify 2FA OTP
app.post("/api/user/verify-2fa", async (req, res) => {
    const { username, token } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
        
        const user = rows[0];
        if (!user.twofa_secret) {
            return res.status(400).json({ success: false, message: "2FA is not configured. Please login again to generate a QR code." });
        }
        const sanitizedToken = String(token || '').replace(/\s/g, '');
        const verified = speakeasy.totp.verify({
            secret: user.twofa_secret,
            encoding: "base32",
            token: sanitizedToken,
            window: 1
        });

        if (verified) {
            if (!user.has_2fa_enabled) {
                await pool.query("UPDATE users SET has_2fa_enabled = TRUE WHERE id = ?", [user.id]);
            }
            
            return res.json(await markAttendance(user.id, user.username));
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP token" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// Diagnostic: list registered routes (temporary)
app.get('/__routes', (req, res) => {
    try {
        const routes = [];
        app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                // routes registered directly on the app
                const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
                routes.push({ path: middleware.route.path, methods });
            } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
                // router middleware
                middleware.handle.stack.forEach((handler) => {
                    if (handler.route) {
                        const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
                        routes.push({ path: handler.route.path, methods });
                    }
                });
            }
        });
        res.json(routes);
    } catch (err) {
        res.status(500).json({ error: 'failed to list routes', details: String(err) });
    }
});


app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${port}`);
});

