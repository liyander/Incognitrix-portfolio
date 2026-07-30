const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dns = require('dns');
const { execFile } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = 1337;
const execFileAsync = promisify(execFile);
const ATTENDANCE_TIME_ZONE = 'Asia/Kolkata';
const DEFAULT_ATTENDANCE_CUTOFF = '08:35';
const ATTENDANCE_NOW_SQL = 'UTC_TIMESTAMP() + INTERVAL 330 MINUTE';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const studentSessions = new Map();

const requireAdmin = (req, res, next) => {
    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const session = adminSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (token) adminSessions.delete(token);
        return res.status(401).json({ error: 'Admin authentication required' });
    }

    req.admin = session;
    next();
};

const requireStudent = (req, res, next) => {
    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const session = studentSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (token) studentSessions.delete(token);
        return res.status(401).json({ error: 'Student authentication required' });
    }

    req.student = session;
    next();
};

dns.setDefaultResultOrder?.('ipv4first');

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
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function syncIndividualUserMappings() {
    try {
        const [individuals] = await pool.query('SELECT id, name, user_id FROM individuals');
        const [users] = await pool.query('SELECT id, username FROM users');

        for (const individual of individuals) {
            const exactMatch = users.find(user => normalizePersonKey(user.username) === normalizePersonKey(individual.name));
            const fuzzyMatch = exactMatch || users.find(user => isPersonMatch(user.username, individual.name));
            if (fuzzyMatch && String(individual.user_id || '') !== String(fuzzyMatch.id)) {
                await pool.query('UPDATE individuals SET user_id = ? WHERE id = ?', [fuzzyMatch.id, individual.id]);
            }
        }
    } catch (err) {
        console.warn('Skipping individual/user attendance mapping sync:', err.message);
    }
}

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
                entry_at DATETIME NULL,
                exit_at DATETIME NULL,
                UNIQUE KEY org_emp_date (user_id, attendance_date)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                attendance_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP NULL,
                reviewed_by VARCHAR(255),
                review_note TEXT,
                UNIQUE KEY user_request_date (user_id, attendance_date)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                twofa_secret VARCHAR(255),
                has_2fa_enabled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        if (!attendanceColumns.some(col => col.Field === 'entry_at')) {
            await pool.query('ALTER TABLE attendance ADD COLUMN entry_at DATETIME NULL AFTER attendance_date');
            await pool.query("UPDATE attendance SET entry_at = CONCAT(attendance_date, ' 08:30:00') WHERE entry_at IS NULL");
        }
        if (!attendanceColumns.some(col => col.Field === 'exit_at')) {
            await pool.query('ALTER TABLE attendance ADD COLUMN exit_at DATETIME NULL AFTER entry_at');
        }
        await pool.query('ALTER TABLE attendance MODIFY entry_at DATETIME NULL');
        await pool.query('ALTER TABLE attendance MODIFY exit_at DATETIME NULL');
        await pool.query("UPDATE attendance SET entry_at = CONCAT(attendance_date, ' 08:30:00') WHERE entry_at IS NULL");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS guest_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guest_name VARCHAR(255) NOT NULL,
                department VARCHAR(255) NOT NULL,
                purpose TEXT NOT NULL,
                attendance_date DATE NOT NULL,
                entry_at DATETIME NULL,
                exit_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query('ALTER TABLE guest_attendance MODIFY entry_at DATETIME NULL');
        await pool.query('ALTER TABLE guest_attendance MODIFY exit_at DATETIME NULL');

        const [userColumns] = await pool.query('SHOW COLUMNS FROM users');
        if (!userColumns.some(col => col.Field === 'twofa_secret')) {
            await pool.query('ALTER TABLE users ADD COLUMN twofa_secret VARCHAR(255)');
        }
        if (!userColumns.some(col => col.Field === 'has_2fa_enabled')) {
            await pool.query('ALTER TABLE users ADD COLUMN has_2fa_enabled BOOLEAN DEFAULT FALSE');
        }
        if (!userColumns.some(col => col.Field === 'created_at')) {
            await pool.query('ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS individuals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                user_id INT NULL,
                role VARCHAR(255),
                team_id INT,
                department VARCHAR(255),
                year_of_study VARCHAR(255),
                studying_year INT,
                daily_work TEXT,
                achievements JSON,
                certificates JSON,
                research_work JSON,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [individualColumns] = await pool.query('SHOW COLUMNS FROM individuals');
        if (!individualColumns.some(col => col.Field === 'user_id')) {
            await pool.query('ALTER TABLE individuals ADD COLUMN user_id INT NULL AFTER name');
        }
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
        if (!individualColumns.some(col => col.Field === 'created_at')) {
            await pool.query('ALTER TABLE individuals ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
        await syncIndividualUserMappings();
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
            CREATE TABLE IF NOT EXISTS ctf_participations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ctf_id VARCHAR(255) NOT NULL,
                ctf_title VARCHAR(255) NOT NULL,
                ctf_source VARCHAR(50) DEFAULT 'manual',
                participating BOOLEAN DEFAULT TRUE,
                status VARCHAR(50) DEFAULT 'participating',
                start_time DATETIME,
                end_time DATETIME,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY ctf_participation_unique (ctf_source, ctf_id)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ctf_participation_teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                participation_id INT NOT NULL,
                team_name VARCHAR(255) NOT NULL,
                position INT NULL,
                score VARCHAR(100),
                notes TEXT,
                members JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lab_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_date DATE NOT NULL UNIQUE,
                target_week VARCHAR(20) NOT NULL,
                daily_schedule TEXT,
                weekly_target TEXT,
                schedule_slots JSON,
                break_slots JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX lab_plans_week_idx (target_week)
            )
        `);
        const [labPlanColumns] = await pool.query('SHOW COLUMNS FROM lab_plans');
        if (!labPlanColumns.some(col => col.Field === 'schedule_slots')) {
            await pool.query('ALTER TABLE lab_plans ADD COLUMN schedule_slots JSON');
        }
        if (!labPlanColumns.some(col => col.Field === 'break_slots')) {
            await pool.query('ALTER TABLE lab_plans ADD COLUMN break_slots JSON');
        }
        try {
            const [projectColumns] = await pool.query('SHOW COLUMNS FROM projects');
            if (!projectColumns.some(col => col.Field === 'sort_order')) {
                await pool.query('ALTER TABLE projects ADD COLUMN sort_order INT NULL');
                await pool.query('SET @project_order := 0');
                await pool.query('UPDATE projects SET sort_order = (@project_order := @project_order + 1) ORDER BY id');
            }
        } catch (projectErr) {
            console.warn('Skipping project order migration:', projectErr.message);
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dashboard_highlights (
                id INT AUTO_INCREMENT PRIMARY KEY,
                highlight_type VARCHAR(50) DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                summary TEXT,
                event_date DATE NULL,
                link TEXT,
                participants JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
        await pool.query(`
            UPDATE users u
            JOIN (
                SELECT user_id, MIN(record_date) AS first_attendance_date
                FROM (
                    SELECT user_id, attendance_date AS record_date FROM attendance
                    UNION ALL
                    SELECT user_id, od_date AS record_date FROM attendance_od
                ) attendance_history
                GROUP BY user_id
            ) history ON CAST(u.id AS CHAR) = CAST(history.user_id AS CHAR)
            SET u.created_at = LEAST(DATE(u.created_at), history.first_attendance_date)
            WHERE history.first_attendance_date IS NOT NULL
        `);
        await pool.query(`
            UPDATE individuals i
            JOIN users u ON u.id = i.user_id
            SET i.created_at = LEAST(DATE(i.created_at), DATE(u.created_at))
            WHERE i.user_id IS NOT NULL
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value VARCHAR(255) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await pool.query(
            `INSERT IGNORE INTO app_settings (setting_key, setting_value)
             VALUES ('attendance_cutoff_time', ?)`,
            [DEFAULT_ATTENDANCE_CUTOFF]
        );
    } catch (err) {
        console.error('Runtime schema migration failed:', err);
    }
}

const isValidTimeValue = (value) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
};

const formatTimeForDisplay = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const getAttendanceCutoff = async () => {
    const [rows] = await pool.query(
        `SELECT setting_value FROM app_settings
         WHERE setting_key = 'attendance_cutoff_time' LIMIT 1`
    );
    const storedValue = rows[0]?.setting_value;
    return isValidTimeValue(storedValue) ? storedValue : DEFAULT_ATTENDANCE_CUTOFF;
};

const getCurrentTimeInAttendanceZoneSeconds = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: ATTENDANCE_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return (Number(values.hour) * 3600) + (Number(values.minute) * 60) + Number(values.second);
};

const getCutoffTimeSeconds = (cutoffTime) => {
    const [hour, minute] = cutoffTime.split(':').map(Number);
    return (hour * 3600) + (minute * 60);
};

async function submitAttendanceForReview(userId, username) {
    const today = formatDateKey(new Date());
    try {
        const [existingAttendance] = await pool.query(
            'SELECT id, entry_at, exit_at FROM attendance WHERE user_id = ? AND attendance_date = ? LIMIT 1',
            [userId, today]
        );
        if (existingAttendance.length > 0) {
            const attendance = existingAttendance[0];
            if (!attendance.exit_at) {
                await pool.query(
                    `UPDATE attendance SET exit_at = ${ATTENDANCE_NOW_SQL} WHERE id = ? AND exit_at IS NULL`,
                    [attendance.id]
                );
                const [updatedRows] = await pool.query(
                    'SELECT entry_at, exit_at FROM attendance WHERE id = ? LIMIT 1',
                    [attendance.id]
                );
                return {
                    success: true,
                    message: "Exit recorded successfully.",
                    username,
                    attendanceRecorded: false,
                    exitRecorded: true,
                    approvalStatus: 'approved',
                    entry_at: updatedRows[0]?.entry_at || attendance.entry_at,
                    exit_at: updatedRows[0]?.exit_at || null
                };
            }
            return {
                success: true,
                message: "Entry and exit are already recorded for today.",
                username,
                attendanceRecorded: false,
                alreadyMarked: true,
                approvalStatus: 'approved',
                entry_at: attendance.entry_at,
                exit_at: attendance.exit_at
            };
        }

        const cutoffTime = await getAttendanceCutoff();
        if (getCurrentTimeInAttendanceZoneSeconds() > getCutoffTimeSeconds(cutoffTime)) {
            return {
                success: false,
                message: `Attendance closed at ${formatTimeForDisplay(cutoffTime)}. Contact an admin if an exception is required.`,
                username,
                attendanceRecorded: false,
                attendanceClosed: true,
                cutoffTime
            };
        }

        await pool.query(
            `INSERT INTO attendance_requests (user_id, attendance_date, status, requested_at, reviewed_at, reviewed_by, review_note)
             VALUES (?, ?, 'pending', ${ATTENDANCE_NOW_SQL}, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE status = 'pending', requested_at = ${ATTENDANCE_NOW_SQL}, reviewed_at = NULL, reviewed_by = NULL, review_note = NULL`,
            [userId, today]
        );
        return { success: true, message: "Attendance submitted for admin approval.", username, attendanceRecorded: false, approvalStatus: 'pending' };
    } catch (attErr) {
        throw attErr;
    }
}

async function recordGuestAttendance({ guestName, department, purpose }) {
    const today = formatDateKey(new Date());
    const trimmedGuestName = String(guestName || '').trim();
    const trimmedDepartment = String(department || '').trim();
    const trimmedPurpose = String(purpose || '').trim();

    if (!trimmedGuestName || !trimmedDepartment || !trimmedPurpose) {
        return { success: false, status: 400, message: 'Guest name, department, and purpose are required.' };
    }

    const [openRows] = await pool.query(
        `SELECT id, entry_at, exit_at
         FROM guest_attendance
         WHERE LOWER(guest_name) = LOWER(?) AND LOWER(department) = LOWER(?) AND attendance_date = ? AND exit_at IS NULL
         ORDER BY entry_at DESC
         LIMIT 1`,
        [trimmedGuestName, trimmedDepartment, today]
    );

    if (openRows.length > 0) {
        await pool.query(
            `UPDATE guest_attendance SET exit_at = ${ATTENDANCE_NOW_SQL} WHERE id = ? AND exit_at IS NULL`,
            [openRows[0].id]
        );
        const [updatedRows] = await pool.query('SELECT * FROM guest_attendance WHERE id = ? LIMIT 1', [openRows[0].id]);
        return {
            success: true,
            message: 'Guest exit recorded successfully.',
            guest: updatedRows[0],
            exitRecorded: true
        };
    }

    const [result] = await pool.query(
        `INSERT INTO guest_attendance (guest_name, department, purpose, attendance_date, entry_at)
         VALUES (?, ?, ?, ?, ${ATTENDANCE_NOW_SQL})`,
        [trimmedGuestName, trimmedDepartment, trimmedPurpose, today]
    );
    const [createdRows] = await pool.query('SELECT * FROM guest_attendance WHERE id = ? LIMIT 1', [result.insertId]);
    return {
        success: true,
        message: 'Guest entry recorded successfully.',
        guest: createdRows[0],
        entryRecorded: true
    };
}

// -----------------------------------------
// ROUTES
// -----------------------------------------

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'backend', timestamp: new Date().toISOString() });
});

app.post('/api/guest/attendance', async (req, res) => {
    try {
        const result = await recordGuestAttendance({
            guestName: req.body?.guest_name || req.body?.name,
            department: req.body?.department,
            purpose: req.body?.purpose
        });
        res.status(result.status || 200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error recording guest attendance' });
    }
});

// GET all projects
app.get('/api/projects', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM projects ORDER BY COALESCE(sort_order, 999999), id');
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
        const [orderRows] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as nextOrder FROM projects');
        const query = `
            INSERT INTO projects
            (id, title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        // We use JSON.stringify for arrays/objects so they are stored as JSON in MySQL
        const values = [
            id, title, status, priority, description, shortDesc, image,
            JSON.stringify(stack || []),
            JSON.stringify(timeline || []),
            beneficiaries, team, usage_desc,
            JSON.stringify(operatives || []),
            orderRows[0]?.nextOrder || 1
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

app.post('/api/projects/:id/move', async (req, res) => {
    const direction = req.body?.direction === 'down' ? 'down' : 'up';
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.query('SET @project_order := 0');
        await connection.query('UPDATE projects SET sort_order = (@project_order := @project_order + 1) ORDER BY COALESCE(sort_order, 999999), id');

        const [currentRows] = await connection.query('SELECT id, sort_order FROM projects WHERE id = ? LIMIT 1', [req.params.id]);
        if (currentRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Project not found' });
        }

        const current = currentRows[0];
        const comparison = direction === 'up' ? '<' : '>';
        const sortDirection = direction === 'up' ? 'DESC' : 'ASC';
        const [neighborRows] = await connection.query(
            `SELECT id, sort_order FROM projects WHERE sort_order ${comparison} ? ORDER BY sort_order ${sortDirection} LIMIT 1`,
            [current.sort_order]
        );

        if (neighborRows.length === 0) {
            await connection.commit();
            return res.json({ message: 'Project already at boundary' });
        }

        const neighbor = neighborRows[0];
        await connection.query('UPDATE projects SET sort_order = ? WHERE id = ?', [neighbor.sort_order, current.id]);
        await connection.query('UPDATE projects SET sort_order = ? WHERE id = ?', [current.sort_order, neighbor.id]);

        await connection.commit();
        res.json({ message: 'Project order updated successfully' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error updating project order' });
    } finally {
        if (connection) connection.release();
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
        const todayKey = formatDateKey(new Date());
        const [rows] = await pool.query(`
            SELECT
                i.*,
                t.name as team_name,
                wl.work_text as current_day_work,
                u.id as attendance_user_id,
                a.id as today_attendance_id,
                od.id as today_od_id,
                od.reason as today_od_reason,
                h.id as today_holiday_id,
                h.title as today_holiday_title
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
            LEFT JOIN individual_work_logs wl ON wl.individual_id = i.id AND wl.work_date = ?
            LEFT JOIN users u ON u.id = i.user_id
            LEFT JOIN attendance a ON a.user_id = u.id AND a.attendance_date = ?
            LEFT JOIN attendance_od od ON od.user_id = u.id AND od.od_date = ?
            LEFT JOIN attendance_holidays h ON h.holiday_date = ?
            ORDER BY CASE
                WHEN LOWER(REPLACE(REPLACE(i.name, '.', ''), ' ', '')) IN ('liyandarrishwanthl', 'liyanderrishwanthl') THEN 0
                ELSE 1
            END, i.name
        `, [todayKey, todayKey, todayKey, todayKey]);
        const today = new Date(`${todayKey}T00:00:00`);
        const isHolidayToday = rows.some(row => row.today_holiday_id) || today.getDay() === 0 || isFirstOrThirdSaturday(today);
        res.json(rows.map(row => {
            let currentWorkStatus = 'not_updated';
            let currentWorkLabel = 'Not updated';

            if (isHolidayToday) {
                currentWorkStatus = 'holiday';
                currentWorkLabel = row.today_holiday_title || 'Holiday';
            } else if (row.today_od_id) {
                currentWorkStatus = 'od';
                currentWorkLabel = row.today_od_reason || 'OD';
            } else if (row.attendance_user_id && !row.today_attendance_id) {
                currentWorkStatus = 'absent';
                currentWorkLabel = 'Absent';
            } else if (row.current_day_work) {
                currentWorkStatus = 'updated';
                currentWorkLabel = row.current_day_work;
            }

            return {
                ...row,
                current_work_status: currentWorkStatus,
                current_work_label: currentWorkLabel
            };
        }));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching individuals' });
    }
});

app.get('/api/individuals/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, t.name as team_name, wl.work_text as current_day_work, u.id as attendance_user_id, u.username as attendance_username
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
            LEFT JOIN individual_work_logs wl ON wl.individual_id = i.id AND wl.work_date = CURRENT_DATE
            LEFT JOIN users u ON u.id = i.user_id
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
        const attendanceUserId = individual.attendance_user_id ? String(individual.attendance_user_id) : null;

        const [monthWorkRows] = await pool.query(`
            SELECT id, work_date, work_text, created_at, updated_at
            FROM individual_work_logs
            WHERE individual_id = ? AND work_date BETWEEN ? AND ?
            ORDER BY work_date DESC, id DESC
        `, [req.params.id, monthStart, statusEnd]);
        const [holidayRows] = await pool.query(
            'SELECT holiday_date, title, holiday_type FROM attendance_holidays WHERE holiday_date BETWEEN ? AND ?',
            [monthStart, statusEnd]
        );

        const [attendanceRows] = attendanceUserId ? await pool.query(
            `SELECT
                attendance_date,
                entry_at,
                exit_at,
                DATE_FORMAT(entry_at, '%H:%i') AS entry_time,
                DATE_FORMAT(exit_at, '%H:%i') AS exit_time
             FROM attendance
             WHERE user_id = ? AND attendance_date BETWEEN ? AND ?`,
            [attendanceUserId, monthStart, statusEnd]
        ) : [[]];
        const [odRows] = attendanceUserId ? await pool.query(
            'SELECT od_date, reason FROM attendance_od WHERE user_id = ? AND od_date BETWEEN ? AND ?',
            [attendanceUserId, monthStart, statusEnd]
        ) : [[]];

        const attendanceByDate = new Map(attendanceRows.map(row => [toDateKey(row.attendance_date), {
            entry_at: row.entry_at,
            exit_at: row.exit_at,
            entry_time: row.entry_time,
            exit_time: row.exit_time
        }]));
        const workByDate = new Map(monthWorkRows.map(row => [toDateKey(row.work_date), row]));
        const holidayByDate = new Map(holidayRows.map(row => [toDateKey(row.holiday_date), row]));
        const odByDate = new Map(odRows.map(row => [toDateKey(row.od_date), row.reason || 'On duty']));
        const attendanceCalendar = calendarDates.map(dateKey => {
            const date = new Date(`${dateKey}T00:00:00`);
            let status = 'off';
            let label = 'Not counted';
            const attendanceTimes = attendanceByDate.get(dateKey) || {};

            if (dateKey > statusEnd || requestedMonth > todayKey.slice(0, 7)) {
                status = 'upcoming';
                label = 'Upcoming';
            } else if (attendanceByDate.has(dateKey)) {
                status = 'present';
                label = 'Present';
            } else if (odByDate.has(dateKey)) {
                status = 'od';
                label = odByDate.get(dateKey);
            } else if (workingDateSet.has(dateKey)) {
                status = 'absent';
                label = 'Absent';
            }

            return {
                date: dateKey,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                status,
                label,
                entry_at: attendanceTimes.entry_at || null,
                exit_at: attendanceTimes.exit_at || null,
                entry_time: attendanceTimes.entry_time || null,
                exit_time: attendanceTimes.exit_time || null
            };
        });
        const workUpdateCalendar = calendarDates
            .filter(dateKey => dateKey <= statusEnd && requestedMonth <= todayKey.slice(0, 7))
            .map(dateKey => {
                const date = new Date(`${dateKey}T00:00:00`);
                const workLog = workByDate.get(dateKey);
                const holiday = holidayByDate.get(dateKey);
                const isWeeklyOff = date.getDay() === 0 || isFirstOrThirdSaturday(date);
                let status = 'not_updated';
                let label = 'Not updated';
                let workText = '';

                if (holiday) {
                    status = 'holiday';
                    label = holiday.title || 'Holiday';
                } else if (isWeeklyOff) {
                    status = 'holiday';
                    label = 'Holiday';
                } else if (odByDate.has(dateKey)) {
                    status = 'od';
                    label = odByDate.get(dateKey) || 'OD';
                } else if (workingDateSet.has(dateKey) && !attendanceByDate.has(dateKey)) {
                    status = 'absent';
                    label = 'Absent';
                } else if (workLog?.work_text) {
                    status = 'updated';
                    label = 'Updated';
                    workText = workLog.work_text;
                }

                return {
                    id: workLog?.id || `status-${dateKey}`,
                    work_date: dateKey,
                    work_text: workText,
                    status,
                    label,
                    created_at: workLog?.created_at || null,
                    updated_at: workLog?.updated_at || null,
                    editable: !['holiday', 'absent', 'od'].includes(status)
                };
            })
            .sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)));
        const currentWorkUpdate = workUpdateCalendar.find(day => day.work_date === todayKey) || null;

        const [achievementRows] = await pool.query('SELECT * FROM achievements ORDER BY date DESC, id DESC');
        const linkedAchievements = achievementRows.filter(achievement => {
            const contributors = parseJsonArray(achievement.contributors);
            return contributors.some(contributor => isPersonMatch(contributor, individual.name));
        });

        res.json({
            ...individual,
            current_work_status: currentWorkUpdate?.status || (individual.current_day_work ? 'updated' : 'not_updated'),
            current_work_label: currentWorkUpdate?.work_text || currentWorkUpdate?.label || individual.current_day_work || 'Not updated',
            work_timeline: workTimeline,
            work_update_calendar: workUpdateCalendar,
            linked_achievements: linkedAchievements,
            attendance_calendar: attendanceCalendar,
            attendance_calendar_month: requestedMonth,
            attendance_calendar_source: attendanceUserId ? `users.id:${attendanceUserId}` : 'no_user_match'
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
        await syncIndividualUserMappings();
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
        await syncIndividualUserMappings();
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

app.put('/api/admin/individuals/:id/work-log', requireAdmin, async (req, res) => {
    const workDate = String(req.body?.work_date || '');
    const workText = String(req.body?.work_text || '').trim();
    const today = formatDateKey(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !workText) {
        return res.status(400).json({ error: 'A valid work date and work details are required' });
    }
    if (workDate > today) {
        return res.status(400).json({ error: 'Future work cannot be edited' });
    }

    try {
        const [individualRows] = await pool.query('SELECT id FROM individuals WHERE id = ? LIMIT 1', [req.params.id]);
        if (individualRows.length === 0) return res.status(404).json({ error: 'Individual not found' });

        await pool.query(
            `INSERT INTO individual_work_logs (individual_id, work_date, work_text)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE work_text = VALUES(work_text)`,
            [req.params.id, workDate, workText]
        );
        await pool.query(
            `UPDATE individuals
             SET daily_work = CASE WHEN ? = CURRENT_DATE THEN ? ELSE daily_work END
             WHERE id = ?`,
            [workDate, workText, req.params.id]
        );

        res.json({ message: 'Work log updated successfully', work_date: workDate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating work log' });
    }
});

app.post('/api/admin/individuals/bulk-work', async (req, res) => {
    const individualIds = [...new Set((Array.isArray(req.body?.individual_ids) ? req.body.individual_ids : [])
        .map(id => Number(id))
        .filter(Number.isInteger))];
    const workDate = String(req.body?.work_date || '');
    const workText = String(req.body?.work_text || '').trim();

    if (individualIds.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !workText) {
        return res.status(400).json({ error: 'Individuals, work date, and work details are required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const placeholders = individualIds.map(() => '?').join(', ');
        const [individualRows] = await connection.query(
            `SELECT id FROM individuals WHERE id IN (${placeholders})`,
            individualIds
        );
        if (individualRows.length !== individualIds.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'One or more selected individuals were not found' });
        }

        await connection.query(
            `UPDATE individuals
             SET daily_work = CASE WHEN ? = CURRENT_DATE THEN ? ELSE daily_work END
             WHERE id IN (${placeholders})`,
            [workDate, workText, ...individualIds]
        );

        const workLogValues = individualIds.map(() => '(?, ?, ?)').join(', ');
        const workLogParams = individualIds.flatMap(id => [id, workDate, workText]);
        await connection.query(
            `INSERT INTO individual_work_logs (individual_id, work_date, work_text)
             VALUES ${workLogValues}
             ON DUPLICATE KEY UPDATE work_text = VALUES(work_text)`,
            workLogParams
        );

        await connection.commit();
        res.json({ message: 'Work assigned successfully', assigned_count: individualIds.length });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error assigning work' });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/admin/individuals/:id/attendance', requireAdmin, async (req, res) => {
    const attendanceDate = String(req.body?.attendance_date || '');
    const status = String(req.body?.status || '').toLowerCase();
    const reason = String(req.body?.reason || '').trim();
    const entryTime = String(req.body?.entry_time || '').trim();
    const exitTime = String(req.body?.exit_time || '').trim();
    const today = formatDateKey(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate) || !['present', 'absent', 'od'].includes(status)) {
        return res.status(400).json({ error: 'A valid date and attendance status are required' });
    }
    if (entryTime && !/^\d{2}:\d{2}$/.test(entryTime)) {
        return res.status(400).json({ error: 'Entry time must use HH:MM format' });
    }
    if (exitTime && !/^\d{2}:\d{2}$/.test(exitTime)) {
        return res.status(400).json({ error: 'Exit time must use HH:MM format' });
    }
    if (attendanceDate > today) {
        return res.status(400).json({ error: 'Future attendance cannot be edited' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [individualRows] = await connection.query(
            'SELECT user_id FROM individuals WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (individualRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Individual not found' });
        }

        const userId = individualRows[0].user_id;
        if (!userId) {
            await connection.rollback();
            return res.status(400).json({ error: 'This individual is not linked to an attendance user' });
        }

        await connection.query(
            'DELETE FROM attendance_requests WHERE user_id = ? AND attendance_date = ?',
            [userId, attendanceDate]
        );

        if (status === 'present') {
            const entryAt = `${attendanceDate} ${entryTime || '08:30'}:00`;
            const exitAt = exitTime ? `${attendanceDate} ${exitTime}:00` : null;
            await connection.query('DELETE FROM attendance_od WHERE user_id = ? AND od_date = ?', [userId, attendanceDate]);
            await connection.query(
                `INSERT INTO attendance (user_id, attendance_date, entry_at, exit_at) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE attendance_date = VALUES(attendance_date), entry_at = VALUES(entry_at), exit_at = VALUES(exit_at)`,
                [userId, attendanceDate, entryAt, exitAt]
            );
        } else if (status === 'od') {
            await connection.query('DELETE FROM attendance WHERE user_id = ? AND attendance_date = ?', [userId, attendanceDate]);
            await connection.query(
                `INSERT INTO attendance_od (user_id, od_date, reason) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
                [userId, attendanceDate, reason || 'Admin marked OD']
            );
        } else {
            await connection.query('DELETE FROM attendance WHERE user_id = ? AND attendance_date = ?', [userId, attendanceDate]);
            await connection.query('DELETE FROM attendance_od WHERE user_id = ? AND od_date = ?', [userId, attendanceDate]);
        }

        await connection.commit();
        res.json({ message: 'Attendance updated successfully', attendance_date: attendanceDate, status });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error updating attendance' });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/admin/individuals/:id/attendance-times', requireAdmin, async (req, res) => {
    const attendanceDate = String(req.body?.attendance_date || '');
    const entryTime = String(req.body?.entry_time || '').trim();
    const exitTime = String(req.body?.exit_time || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        return res.status(400).json({ error: 'A valid attendance date is required' });
    }
    if (entryTime && !/^\d{2}:\d{2}$/.test(entryTime)) {
        return res.status(400).json({ error: 'Entry time must use HH:MM format' });
    }
    if (exitTime && !/^\d{2}:\d{2}$/.test(exitTime)) {
        return res.status(400).json({ error: 'Exit time must use HH:MM format' });
    }

    try {
        const [individualRows] = await pool.query('SELECT user_id FROM individuals WHERE id = ? LIMIT 1', [req.params.id]);
        if (individualRows.length === 0) return res.status(404).json({ error: 'Individual not found' });
        const userId = individualRows[0].user_id;
        if (!userId) return res.status(400).json({ error: 'This individual is not linked to an attendance user' });

        await pool.query(
            `UPDATE attendance
             SET entry_at = ?, exit_at = ?
             WHERE user_id = ? AND attendance_date = ?`,
            [
                entryTime ? `${attendanceDate} ${entryTime}:00` : null,
                exitTime ? `${attendanceDate} ${exitTime}:00` : null,
                [userId, attendanceDate]
            ].flat()
        );
        res.json({ message: 'Attendance times updated successfully', attendance_date: attendanceDate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating attendance times' });
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
const CTFTIME_USER_AGENT = 'Incognitrix-Lab-Dashboard/1.0 (+https://incognitrix.local)';

const mapCtftimeEvent = (event) => ({
    source: 'ctftime',
    id: `ctftime-${event.id || event.ctf_id}`,
    title: event.title || 'Untitled CTF',
    url: event.url || event.ctftime_url || '',
    start_time: event.start,
    end_time: event.finish,
    format: event.format || 'CTF',
    location: event.location || (event.onsite ? 'Onsite' : 'Online'),
    description: event.description || ''
});

const fetchCtftimeEvents = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'User-Agent': CTFTIME_USER_AGENT
            }
        });

        if (!response.ok) {
            throw new Error(`CTFTIME responded ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error(`CTFTIME returned ${contentType || 'unknown content type'}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('CTFTIME payload was not an array');
        }

        return data;
    } finally {
        clearTimeout(timeout);
    }
};

const fetchCtftimeEventsWithFallback = async (url) => {
    try {
        return await fetchCtftimeEvents(url);
    } catch (fetchErr) {
        try {
            const { stdout } = await execFileAsync('curl', [
                '-sS',
                '--fail',
                '--location',
                '--connect-timeout', '10',
                '--max-time', '20',
                '-H', `User-Agent: ${CTFTIME_USER_AGENT}`,
                '-H', 'Accept: application/json',
                url
            ], { maxBuffer: 1024 * 1024 });
            const data = JSON.parse(stdout);
            if (!Array.isArray(data)) {
                throw new Error('CTFTIME curl payload was not an array');
            }
            return data;
        } catch (curlErr) {
            const error = new Error(`Node fetch failed (${fetchErr.message}); curl fallback failed (${curlErr.message})`);
            error.cause = fetchErr.cause || curlErr;
            throw error;
        }
    }
};

app.get('/api/ctftime-health', async (req, res) => {
    const url = 'https://ctftime.org/api/v1/events/?limit=3';
    try {
        const data = await fetchCtftimeEventsWithFallback(url);
        res.json({
            ok: true,
            source: url,
            count: data.length,
            sample: data.slice(0, 3).map(mapCtftimeEvent)
        });
    } catch (err) {
        console.error('CTFTIME health check failed:', err.message);
        res.status(502).json({
            ok: false,
            source: url,
            error: err.message,
            cause: err.cause ? {
                name: err.cause.name,
                code: err.cause.code,
                message: err.cause.message
            } : null
        });
    }
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
            const candidateUrls = [
                'https://ctftime.org/api/v1/events/?limit=30',
                `https://ctftime.org/api/v1/events/?limit=30&start=${now}`
            ];
            let lastCtftimeError = null;

            for (const url of candidateUrls) {
                try {
                    const data = await fetchCtftimeEventsWithFallback(url);
                    ctftimeEvents = data
                        .map(mapCtftimeEvent)
                        .slice(0, 20);
                    if (ctftimeEvents.length === 0) {
                        throw new Error('CTFTIME returned no upcoming events for this query');
                    }
                    break;
                } catch (err) {
                    lastCtftimeError = err;
                }
            }

            if (lastCtftimeError && ctftimeEvents.length === 0) {
                console.error('CTFTIME fetch failed:', lastCtftimeError.message);
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

const normalizeCtfDateTime = (value) => value ? String(value).replace('T', ' ').replace('Z', '').slice(0, 19) : null;

const attachParticipationTeams = async (participations) => {
    if (!participations.length) return [];
    const ids = participations.map(row => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const [teamRows] = await pool.query(
        `SELECT * FROM ctf_participation_teams WHERE participation_id IN (${placeholders}) ORDER BY COALESCE(position, 9999), team_name`,
        ids
    );
    const teamsByParticipation = new Map();
    teamRows.forEach(team => {
        const key = Number(team.participation_id);
        if (!teamsByParticipation.has(key)) teamsByParticipation.set(key, []);
        teamsByParticipation.get(key).push({
            ...team,
            members: parseJsonArray(team.members)
        });
    });
    return participations.map(participation => ({
        ...participation,
        teams: teamsByParticipation.get(Number(participation.id)) || []
    }));
};

app.get('/api/ctf-participations', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM ctf_participations
            ORDER BY COALESCE(start_time, NOW()) ASC, id DESC
        `);
        res.json(await attachParticipationTeams(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching CTF participations' });
    }
});

app.get('/api/ctf-participations/active', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM ctf_participations
            WHERE participating = TRUE
              AND (
                DATE(COALESCE(start_time, CURRENT_DATE)) <= CURRENT_DATE
                AND DATE(COALESCE(end_time, start_time, CURRENT_DATE)) >= CURRENT_DATE
              )
            ORDER BY COALESCE(start_time, NOW()) ASC, ctf_title
        `);
        res.json(await attachParticipationTeams(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching active CTF participations' });
    }
});

app.post('/api/ctf-participations', async (req, res) => {
    const { ctf_id, ctf_title, ctf_source, participating, status, start_time, end_time, notes } = req.body;
    if (!ctf_id || !ctf_title) {
        return res.status(400).json({ error: 'CTF id and title are required' });
    }

    try {
        await pool.query(
            `INSERT INTO ctf_participations
                (ctf_id, ctf_title, ctf_source, participating, status, start_time, end_time, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                ctf_title = VALUES(ctf_title),
                participating = VALUES(participating),
                status = VALUES(status),
                start_time = VALUES(start_time),
                end_time = VALUES(end_time),
                notes = VALUES(notes)`,
            [
                String(ctf_id),
                ctf_title,
                ctf_source || 'manual',
                participating === false ? 0 : 1,
                status || (participating === false ? 'watching' : 'participating'),
                normalizeCtfDateTime(start_time),
                normalizeCtfDateTime(end_time),
                notes || ''
            ]
        );
        const [rows] = await pool.query(
            'SELECT * FROM ctf_participations WHERE ctf_id = ? AND ctf_source = ? LIMIT 1',
            [String(ctf_id), ctf_source || 'manual']
        );
        res.status(201).json((await attachParticipationTeams(rows))[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error saving CTF participation' });
    }
});

app.delete('/api/ctf-participations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ctf_participation_teams WHERE participation_id = ?', [req.params.id]);
        const [result] = await pool.query('DELETE FROM ctf_participations WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'CTF participation not found' });
        res.json({ message: 'CTF participation removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error removing CTF participation' });
    }
});

app.post('/api/ctf-participations/:id/teams', async (req, res) => {
    const { team_name, members, position, score, notes } = req.body;
    if (!team_name) {
        return res.status(400).json({ error: 'Team name is required' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO ctf_participation_teams (participation_id, team_name, position, score, notes, members)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.params.id,
                team_name,
                position === '' || position === undefined ? null : Number(position),
                score || '',
                notes || '',
                JSON.stringify(Array.isArray(members) ? members : [])
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'CTF team added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error adding CTF team' });
    }
});

app.put('/api/ctf-participation-teams/:id', async (req, res) => {
    const { team_name, members, position, score, notes } = req.body;
    if (!team_name) {
        return res.status(400).json({ error: 'Team name is required' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE ctf_participation_teams
             SET team_name = ?, position = ?, score = ?, notes = ?, members = ?
             WHERE id = ?`,
            [
                team_name,
                position === '' || position === undefined ? null : Number(position),
                score || '',
                notes || '',
                JSON.stringify(Array.isArray(members) ? members : []),
                req.params.id
            ]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'CTF team not found' });
        res.json({ message: 'CTF team updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating CTF team' });
    }
});

app.delete('/api/ctf-participation-teams/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM ctf_participation_teams WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'CTF team not found' });
        res.json({ message: 'CTF team deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting CTF team' });
    }
});

const getIsoWeekValue = (date) => {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const SCHEDULE_YEARS = ['I', 'II', 'III', 'IV'];
const SCHEDULE_TYPES = ['Placement Training', 'Weekly Assessment', 'Custom input', 'Project Work/Lab work'];
const SCHEDULE_START_MINUTES = (8 * 60) + 30;
const SCHEDULE_END_MINUTES = (16 * 60) + 30;

const parseTimeMinutes = (value) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return (hours * 60) + minutes;
};

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) => leftStart < rightEnd && rightStart < leftEnd;

const normalizeYearList = (years) => [...new Set((Array.isArray(years) ? years : [])
    .map(year => String(year || '').trim().toUpperCase())
    .filter(year => SCHEDULE_YEARS.includes(year)))];

const validateTimeRange = (startTime, endTime) => {
    const startMinutes = parseTimeMinutes(startTime);
    const endMinutes = parseTimeMinutes(endTime);
    if (startMinutes === null || endMinutes === null) return 'Time must use HH:MM format';
    if (startMinutes < SCHEDULE_START_MINUTES || endMinutes > SCHEDULE_END_MINUTES) return 'Schedule time must stay between 08:30 and 16:30';
    if (startMinutes >= endMinutes) return 'Start time must be before end time';
    return null;
};

const normalizeSchedulePayload = (scheduleSlots, breakSlots) => {
    const normalizedBreaks = (Array.isArray(breakSlots) ? breakSlots : []).map((slot, index) => {
        const years = normalizeYearList(slot.years);
        const start_time = String(slot.start_time || '');
        const end_time = String(slot.end_time || '');
        const timeError = validateTimeRange(start_time, end_time);
        if (timeError) throw new Error(`Break ${index + 1}: ${timeError}`);
        if (years.length === 0) throw new Error(`Break ${index + 1}: select at least one year`);
        return {
            id: slot.id || `break-${Date.now()}-${index}`,
            years,
            start_time,
            end_time,
            title: slot.title || 'Break / Lunch'
        };
    });

    const normalizedSchedule = (Array.isArray(scheduleSlots) ? scheduleSlots : []).map((slot, index) => {
        const years = normalizeYearList(slot.years);
        const start_time = String(slot.start_time || '');
        const end_time = String(slot.end_time || '');
        const schedule_type = SCHEDULE_TYPES.includes(slot.schedule_type) ? slot.schedule_type : 'Project Work/Lab work';
        const custom_text = String(slot.custom_text || '').trim();
        const timeError = validateTimeRange(start_time, end_time);
        if (timeError) throw new Error(`Schedule ${index + 1}: ${timeError}`);
        if (years.length === 0) throw new Error(`Schedule ${index + 1}: select at least one year`);
        if (schedule_type === 'Custom input' && !custom_text) throw new Error(`Schedule ${index + 1}: custom input is required`);

        const scheduleStart = parseTimeMinutes(start_time);
        const scheduleEnd = parseTimeMinutes(end_time);
        const overlappingBreak = normalizedBreaks.find(breakSlot => {
            const sharedYear = years.some(year => breakSlot.years.includes(year));
            if (!sharedYear) return false;
            return rangesOverlap(scheduleStart, scheduleEnd, parseTimeMinutes(breakSlot.start_time), parseTimeMinutes(breakSlot.end_time));
        });
        if (overlappingBreak) {
            throw new Error(`Schedule ${index + 1}: conflicts with ${overlappingBreak.title} for ${overlappingBreak.years.join(', ')}`);
        }

        return {
            id: slot.id || `schedule-${Date.now()}-${index}`,
            years,
            start_time,
            end_time,
            schedule_type,
            custom_text
        };
    });

    return { scheduleSlots: normalizedSchedule, breakSlots: normalizedBreaks };
};

app.get('/api/lab-plan', async (req, res) => {
    const today = formatDateKey(new Date());
    const planDate = req.query.date || today;
    const targetWeek = req.query.week || getIsoWeekValue(new Date(`${planDate}T00:00:00`));

    try {
        const [dailyRows] = await pool.query(
            'SELECT * FROM lab_plans WHERE plan_date = ? LIMIT 1',
            [planDate]
        );
        const [weeklyRows] = await pool.query(
            `SELECT *
             FROM lab_plans
             WHERE target_week = ? AND weekly_target IS NOT NULL AND weekly_target <> ''
             ORDER BY updated_at DESC, plan_date DESC
             LIMIT 1`,
            [targetWeek]
        );
        res.json({
            plan_date: planDate,
            target_week: targetWeek,
            daily_schedule: dailyRows[0]?.daily_schedule || '',
            weekly_target: weeklyRows[0]?.weekly_target || dailyRows[0]?.weekly_target || '',
            schedule_slots: parseJsonArray(dailyRows[0]?.schedule_slots),
            break_slots: parseJsonArray(dailyRows[0]?.break_slots),
            daily_plan: dailyRows[0] || null,
            weekly_plan: weeklyRows[0] || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching lab plan' });
    }
});

app.get('/api/admin/lab-plans', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM lab_plans
            ORDER BY plan_date DESC, id DESC
            LIMIT 30
        `);
        res.json(rows.map(row => ({
            ...row,
            schedule_slots: parseJsonArray(row.schedule_slots),
            break_slots: parseJsonArray(row.break_slots)
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching lab plans' });
    }
});

app.post('/api/admin/lab-plans', async (req, res) => {
    const { plan_date, target_week, daily_schedule, weekly_target, schedule_slots, break_slots } = req.body;
    if (!plan_date || !target_week) {
        return res.status(400).json({ error: 'Plan date and target week are required' });
    }

    try {
        const normalized = normalizeSchedulePayload(schedule_slots || [], break_slots || []);
        await pool.query(
            `INSERT INTO lab_plans (plan_date, target_week, daily_schedule, weekly_target, schedule_slots, break_slots)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                target_week = VALUES(target_week),
                daily_schedule = VALUES(daily_schedule),
                weekly_target = VALUES(weekly_target),
                schedule_slots = VALUES(schedule_slots),
                break_slots = VALUES(break_slots)`,
            [
                plan_date,
                target_week,
                daily_schedule || '',
                weekly_target || '',
                JSON.stringify(normalized.scheduleSlots),
                JSON.stringify(normalized.breakSlots)
            ]
        );
        res.status(201).json({ message: 'Lab plan saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message || 'Server error saving lab plan' });
    }
});

app.delete('/api/admin/lab-plans/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM lab_plans WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Lab plan not found' });
        res.json({ message: 'Lab plan deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting lab plan' });
    }
});

app.get('/api/dashboard-highlights', async (req, res) => {
    try {
        const [highlightRows] = await pool.query(`
            SELECT *
            FROM dashboard_highlights
            WHERE is_active = TRUE
            ORDER BY COALESCE(event_date, DATE(created_at)) DESC, id DESC
            LIMIT 12
        `);
        const manualHighlights = highlightRows.map(row => ({
            ...row,
            source: 'manual',
            participants: parseJsonArray(row.participants)
        }));

        const [achievementRows] = await pool.query(`
            SELECT id, title, description, date, reference_link, contributors
            FROM achievements
            ORDER BY COALESCE(date, CURRENT_DATE) DESC, id DESC
            LIMIT 6
        `);
        const achievementHighlights = achievementRows.map(row => ({
            id: `achievement-${row.id}`,
            highlight_type: 'achievement',
            title: row.title,
            summary: row.description || '',
            event_date: row.date,
            link: parseJsonArray(row.reference_link)[0] || '',
            participants: parseJsonArray(row.contributors),
            is_active: true,
            source: 'achievement'
        }));

        const [participationRows] = await pool.query(`
            SELECT *
            FROM ctf_participations
            WHERE participating = TRUE
            ORDER BY COALESCE(start_time, NOW()) DESC, id DESC
            LIMIT 6
        `);
        const participationsWithTeams = await attachParticipationTeams(participationRows);
        const participationHighlights = participationsWithTeams.map(row => ({
            id: `participation-${row.id}`,
            highlight_type: 'participation',
            title: row.ctf_title,
            summary: row.notes || row.status || 'Participation tracked',
            event_date: row.start_time,
            link: '',
            participants: (row.teams || []).flatMap(team => Array.isArray(team.members) ? team.members.map(member => member.name || member).filter(Boolean) : []),
            is_active: true,
            source: 'participation'
        }));

        const combined = [...manualHighlights, ...achievementHighlights, ...participationHighlights]
            .filter(item => item.title)
            .sort((a, b) => {
                const dateA = toDateKey(a.event_date) || '0000-00-00';
                const dateB = toDateKey(b.event_date) || '0000-00-00';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                return String(b.id).localeCompare(String(a.id));
            })
            .slice(0, 12);

        res.json(combined);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching dashboard highlights' });
    }
});

app.get('/api/admin/dashboard-highlights', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM dashboard_highlights
            ORDER BY COALESCE(event_date, DATE(created_at)) DESC, id DESC
            LIMIT 50
        `);
        res.json(rows.map(row => ({
            ...row,
            participants: parseJsonArray(row.participants)
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching dashboard highlights' });
    }
});

app.post('/api/admin/dashboard-highlights', async (req, res) => {
    const { highlight_type, title, summary, event_date, link, participants, is_active } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO dashboard_highlights
                (highlight_type, title, summary, event_date, link, participants, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                highlight_type || 'info',
                title,
                summary || '',
                event_date || null,
                link || '',
                JSON.stringify(Array.isArray(participants) ? participants.filter(Boolean) : []),
                is_active === false ? 0 : 1
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Dashboard highlight saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error saving dashboard highlight' });
    }
});

app.put('/api/admin/dashboard-highlights/:id', async (req, res) => {
    const { highlight_type, title, summary, event_date, link, participants, is_active } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE dashboard_highlights
             SET highlight_type = ?, title = ?, summary = ?, event_date = ?, link = ?, participants = ?, is_active = ?
             WHERE id = ?`,
            [
                highlight_type || 'info',
                title,
                summary || '',
                event_date || null,
                link || '',
                JSON.stringify(Array.isArray(participants) ? participants.filter(Boolean) : []),
                is_active === false ? 0 : 1,
                req.params.id
            ]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Dashboard highlight not found' });
        res.json({ message: 'Dashboard highlight updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating dashboard highlight' });
    }
});

app.delete('/api/admin/dashboard-highlights/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM dashboard_highlights WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Dashboard highlight not found' });
        res.json({ message: 'Dashboard highlight removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error removing dashboard highlight' });
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
            const token = crypto.randomBytes(32).toString('hex');
            adminSessions.set(token, { username: admin.username, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS });
            res.json({ success: true, username: admin.username, token });
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
        await syncIndividualUserMappings();
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
        await syncIndividualUserMappings();

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
        await pool.query('DELETE FROM attendance_requests WHERE user_id = ?', [req.params.id]);
        await pool.query('DELETE FROM attendance_od WHERE user_id = ?', [req.params.id]);
        await pool.query('UPDATE individuals SET user_id = NULL WHERE user_id = ?', [req.params.id]);
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

const latestDateKey = (...values) => values
    .map(toDateKey)
    .filter(Boolean)
    .sort()
    .pop() || null;

const earliestDateKey = (...values) => values
    .map(toDateKey)
    .filter(Boolean)
    .sort()
    .shift() || null;

const getAttendanceCountingStart = ({ rangeStartKey, userCreatedAt, individualCreatedAt, historyDates = [] }) => {
    const createdStartKey = latestDateKey(rangeStartKey, userCreatedAt, individualCreatedAt) || rangeStartKey;
    const firstHistoryKey = earliestDateKey(...historyDates);

    if (!firstHistoryKey) return createdStartKey;

    return firstHistoryKey < createdStartKey ? firstHistoryKey : createdStartKey;
};

const getFirstAttendanceHistoryByUser = async () => {
    const [rows] = await pool.query(`
        SELECT user_id, MIN(record_date) AS first_record_date
        FROM (
            SELECT user_id, attendance_date AS record_date FROM attendance
            UNION ALL
            SELECT user_id, od_date AS record_date FROM attendance_od
        ) attendance_history
        GROUP BY user_id
    `);

    const firstHistoryByUser = new Map();
    rows.forEach(row => {
        const userKey = String(row.user_id || '');
        const dateKey = toDateKey(row.first_record_date);
        if (userKey && dateKey) firstHistoryByUser.set(userKey, dateKey);
    });
    return firstHistoryByUser;
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
            i.created_at as individual_created_at,
            u.id as user_id,
            u.username,
            u.created_at as user_created_at
        FROM individuals i
        LEFT JOIN users u ON u.id = i.user_id
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

    const firstHistoryByUser = await getFirstAttendanceHistoryByUser();

    const headers = [
        'Studying Year',
        'Name',
        'Username',
        'Department',
        ...workingDateKeys.map(formatDateDayLabel),
        percentageHeader
    ];

    const rows = people.map(person => {
        const userKey = person.user_id ? String(person.user_id) : null;
        const attendedDates = userKey ? (attendanceByUser.get(userKey) || new Set()) : new Set();
        const odDates = userKey ? (odByUser.get(userKey) || new Set()) : new Set();
        const countingStartKey = getAttendanceCountingStart({
            rangeStartKey: startKey,
            userCreatedAt: person.user_created_at,
            individualCreatedAt: person.individual_created_at,
            historyDates: userKey && firstHistoryByUser.has(userKey) ? [firstHistoryByUser.get(userKey)] : []
        });

        const statusCells = workingDateKeys.map(dateKey => {
            if (dateKey < countingStartKey) return 'Not Joined';
            if (attendedDates.has(dateKey)) return 'Present';
            if (odDates.has(dateKey)) return 'OD';
            return 'Absent';
        });
        const effectivePresent = statusCells.filter(status => status === 'Present' || status === 'OD').length;
        const countedDays = statusCells.filter(status => status !== 'Not Joined').length;
        const percentage = countedDays === 0 ? 100 : Math.round((effectivePresent / countedDays) * 100);

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
        const [minRows] = await pool.query(`
            SELECT MIN(record_date) as minDate
            FROM (
                SELECT attendance_date as record_date FROM attendance
                UNION ALL
                SELECT od_date as record_date FROM attendance_od
            ) attendance_history
        `);
        const minDateKey = toDateKey(minRows[0]?.minDate) || todayKey;
        const workingDateKeys = await getWorkingDateKeys(minDateKey, todayKey);

        const workingDateSet = new Set(workingDateKeys);
        const [users] = await pool.query(`
            SELECT
                u.id,
                u.username,
                u.created_at as user_created_at,
                MIN(i.studying_year) as studying_year,
                MIN(i.created_at) as individual_created_at
            FROM users u
            LEFT JOIN individuals i
                ON i.user_id = u.id
            GROUP BY u.id, u.username, u.created_at
            ORDER BY COALESCE(MIN(i.studying_year), 999), u.id ASC
        `);
        const [attendanceRows] = await pool.query(
            'SELECT user_id, attendance_date, entry_at, exit_at FROM attendance WHERE attendance_date BETWEEN ? AND ?',
            [minDateKey, todayKey]
        );
        const [odRows] = await pool.query(
            'SELECT user_id, od_date, reason FROM attendance_od WHERE od_date BETWEEN ? AND ?',
            [minDateKey, todayKey]
        );

        const attendanceByUser = new Map();
        const todayAttendanceByUser = new Map();
        attendanceRows.forEach(row => {
            const dateKey = toDateKey(row.attendance_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!attendanceByUser.has(userKey)) attendanceByUser.set(userKey, new Set());
            attendanceByUser.get(userKey).add(dateKey);
            if (dateKey === todayKey) {
                todayAttendanceByUser.set(userKey, {
                    entry_at: row.entry_at,
                    exit_at: row.exit_at
                });
            }
        });

        const odByUser = new Map();
        odRows.forEach(row => {
            const dateKey = toDateKey(row.od_date);
            if (!workingDateSet.has(dateKey)) return;
            const userKey = String(row.user_id);
            if (!odByUser.has(userKey)) odByUser.set(userKey, new Set());
            odByUser.get(userKey).add(dateKey);
        });

        const firstHistoryByUser = await getFirstAttendanceHistoryByUser();

        const attendanceData = users.map(user => {
            const userKey = String(user.id);
            const countingStartKey = getAttendanceCountingStart({
                rangeStartKey: minDateKey,
                userCreatedAt: user.user_created_at,
                individualCreatedAt: user.individual_created_at,
                historyDates: firstHistoryByUser.has(userKey) ? [firstHistoryByUser.get(userKey)] : []
            });
            const userWorkingDays = workingDateKeys.filter(dateKey => dateKey >= countingStartKey);
            const userWorkingDateSet = new Set(userWorkingDays);
            const attendedDates = attendanceByUser.get(userKey) || new Set();
            const odDates = odByUser.get(userKey) || new Set();
            const attendedDays = [...attendedDates].filter(dateKey => userWorkingDateSet.has(dateKey)).length;
            const excusedOdDays = [...odDates].filter(dateKey => userWorkingDateSet.has(dateKey) && !attendedDates.has(dateKey)).length;
            const effectivePresent = attendedDays + excusedOdDays;
            const percentage = userWorkingDays.length === 0 ? 100 : Math.round((effectivePresent / userWorkingDays.length) * 100);
            const todayAttendance = todayAttendanceByUser.get(userKey) || {};

            return {
                id: user.id,
                username: user.username,
                studying_year: user.studying_year,
                attended_days: attendedDays,
                od_days: excusedOdDays,
                working_days: userWorkingDays.length,
                attendance_start_date: countingStartKey,
                today_entry_at: todayAttendance.entry_at || null,
                today_exit_at: todayAttendance.exit_at || null,
                percentage
            };
        });

        res.json(attendanceData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching attendance' });
    }
});

app.get('/api/admin/guest-attendance', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT *
            FROM guest_attendance
            ORDER BY attendance_date DESC, entry_at DESC, id DESC
            LIMIT 200
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching guest attendance' });
    }
});

app.get('/api/admin/attendance-settings', async (req, res) => {
    try {
        const cutoffTime = await getAttendanceCutoff();
        res.json({ cutoff_time: cutoffTime, timezone: ATTENDANCE_TIME_ZONE });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching attendance settings' });
    }
});

app.put('/api/admin/attendance-settings', requireAdmin, async (req, res) => {
    const cutoffTime = String(req.body?.cutoff_time || '');
    if (!isValidTimeValue(cutoffTime)) {
        return res.status(400).json({ error: 'Cutoff time must use HH:MM format' });
    }

    try {
        await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value)
             VALUES ('attendance_cutoff_time', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [cutoffTime]
        );
        res.json({ message: 'Attendance cutoff updated', cutoff_time: cutoffTime, timezone: ATTENDANCE_TIME_ZONE });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating attendance settings' });
    }
});

app.delete('/api/admin/attendance', requireAdmin, async (req, res) => {
    if (req.body?.confirmation !== 'RESET ATTENDANCE') {
        return res.status(400).json({ error: 'Attendance reset confirmation is required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [requestResult] = await connection.query('DELETE FROM attendance_requests');
        const [odResult] = await connection.query('DELETE FROM attendance_od');
        const [guestResult] = await connection.query('DELETE FROM guest_attendance');
        const [attendanceResult] = await connection.query('DELETE FROM attendance');

        await connection.commit();
        res.json({
            message: 'Attendance reset successfully',
            deleted: {
                attendance: attendanceResult.affectedRows,
                guests: guestResult.affectedRows,
                requests: requestResult.affectedRows,
                od: odResult.affectedRows
            }
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error resetting attendance' });
    } finally {
        if (connection) connection.release();
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

app.post('/api/admin/attendance-holidays', requireAdmin, async (req, res) => {
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

app.delete('/api/admin/attendance-holidays/:id', requireAdmin, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM attendance_holidays WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Holiday not found' });
        res.json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting holiday' });
    }
});

app.post('/api/admin/attendance-od', requireAdmin, async (req, res) => {
    const { user_id, user_ids, od_date, reason } = req.body;
    const selectedUserIds = [...new Set((Array.isArray(user_ids) ? user_ids : [user_id])
        .map(id => String(id || '').trim())
        .filter(Boolean))];
    if (selectedUserIds.length === 0 || !od_date) {
        return res.status(400).json({ error: 'At least one operative and an OD date are required' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const placeholders = selectedUserIds.map(() => '?').join(', ');
        const [users] = await connection.query(
            `SELECT id FROM users WHERE id IN (${placeholders})`,
            selectedUserIds
        );
        if (users.length !== selectedUserIds.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'One or more selected operatives were not found' });
        }

        const valuePlaceholders = selectedUserIds.map(() => '(?, ?, ?)').join(', ');
        const values = selectedUserIds.flatMap(id => [id, od_date, reason || 'On duty']);
        await connection.query(
            `INSERT INTO attendance_od (user_id, od_date, reason)
             VALUES ${valuePlaceholders}
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
            values
        );
        await connection.commit();
        res.status(201).json({ message: 'OD saved successfully', saved_count: selectedUserIds.length });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error saving OD' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/admin/attendance-requests', async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const [rows] = await pool.query(`
            SELECT ar.*, u.username
            FROM attendance_requests ar
            LEFT JOIN users u ON u.id = ar.user_id
            WHERE ar.status = ?
            ORDER BY ar.requested_at DESC, ar.id DESC
        `, [status]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching attendance requests' });
    }
});

app.post('/api/admin/attendance-requests/:id/approve', requireAdmin, async (req, res) => {
    const reviewer = req.body.reviewed_by || req.body.admin_username || 'admin';
    try {
        const [rows] = await pool.query(
            `SELECT ar.*, DATE_FORMAT(ar.requested_at, '%Y-%m-%d %H:%i:%s') AS requested_at_local
             FROM attendance_requests ar
             WHERE ar.id = ?
             LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Attendance request not found' });

        const request = rows[0];
        await pool.query(
            `INSERT INTO attendance (user_id, attendance_date, entry_at)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE attendance_date = VALUES(attendance_date), entry_at = COALESCE(entry_at, VALUES(entry_at))`,
            [request.user_id, toDateKey(request.attendance_date), request.requested_at_local || request.requested_at]
        );
        await pool.query(
            `UPDATE attendance_requests
             SET status = 'approved', reviewed_at = ${ATTENDANCE_NOW_SQL}, reviewed_by = ?, review_note = NULL
             WHERE id = ?`,
            [reviewer, req.params.id]
        );
        res.json({ success: true, message: 'Attendance approved and recorded.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error approving attendance request' });
    }
});

app.post('/api/admin/attendance-requests/:id/reject', requireAdmin, async (req, res) => {
    const reviewer = req.body.reviewed_by || req.body.admin_username || 'admin';
    const note = req.body.review_note || 'Rejected by admin';
    try {
        const [result] = await pool.query(
            `UPDATE attendance_requests
             SET status = 'rejected', reviewed_at = ${ATTENDANCE_NOW_SQL}, reviewed_by = ?, review_note = ?
             WHERE id = ?`,
            [reviewer, note, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Attendance request not found' });
        res.json({ success: true, message: 'Attendance request rejected.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error rejecting attendance request' });
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
        const [users] = await pool.query(`
            SELECT
                u.id,
                u.username,
                i.name as individual_name,
                i.department,
                i.year_of_study,
                i.studying_year,
                i.created_at as individual_created_at,
                u.created_at as user_created_at,
                t.name as team_name
            FROM users u
            LEFT JOIN individuals i
                ON i.user_id = u.id
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

        const firstHistoryByUser = await getFirstAttendanceHistoryByUser();

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
            const countingStartKey = getAttendanceCountingStart({
                rangeStartKey: monthStart,
                userCreatedAt: user.user_created_at,
                individualCreatedAt: user.individual_created_at,
                historyDates: firstHistoryByUser.has(userKey) ? [firstHistoryByUser.get(userKey)] : []
            });
            const userWorkingDays = workingDateKeys.filter(dateKey => dateKey >= countingStartKey);
            const userWorkingDateSet = new Set(userWorkingDays);
            const attendedDates = attendanceByUser.get(userKey) || new Set();
            const odDates = odByUser.get(userKey) || new Set();
            const odDays = [...odDates].filter(dateKey => userWorkingDateSet.has(dateKey) && !attendedDates.has(dateKey)).length;
            const attendedDays = [...attendedDates].filter(dateKey => userWorkingDateSet.has(dateKey)).length;
            const effectivePresent = attendedDays + odDays;
            const percentage = userWorkingDays.length === 0 ? 100 : Math.round((effectivePresent / userWorkingDays.length) * 100);

            return [
                user.studying_year || '',
                user.individual_name || user.username,
                user.username,
                'Cybersecurity',
                requestedMonth,
                userWorkingDays.length,
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

app.post('/api/student/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const [rows] = await pool.query('SELECT id, username, password FROM users WHERE username = ? LIMIT 1', [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const [individualRows] = await pool.query('SELECT id FROM individuals WHERE user_id = ? LIMIT 1', [user.id]);
        if (individualRows.length === 0) {
            return res.status(403).json({ success: false, message: 'No student profile is linked to this login.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        studentSessions.set(token, {
            userId: user.id,
            username: user.username,
            individualId: individualRows[0].id,
            expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
        });

        res.json({ success: true, token, username: user.username, individual_id: individualRows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/student/dashboard', requireStudent, async (req, res) => {
    try {
        const todayKey = formatDateKey(new Date());
        const userId = String(req.student.userId);
        const [individualRows] = await pool.query(`
            SELECT i.*, t.name as team_name, wl.work_text as current_day_work, u.username, u.created_at as user_created_at
            FROM individuals i
            LEFT JOIN teams t ON i.team_id = t.id
            LEFT JOIN users u ON u.id = i.user_id
            LEFT JOIN individual_work_logs wl ON wl.individual_id = i.id AND wl.work_date = ?
            WHERE i.id = ? AND i.user_id = ?
            LIMIT 1
        `, [todayKey, req.student.individualId, req.student.userId]);
        if (individualRows.length === 0) return res.status(404).json({ error: 'Student profile not found' });

        const student = individualRows[0];
        const [achievementRows] = await pool.query('SELECT * FROM achievements ORDER BY date DESC, id DESC');
        const linkedAchievements = achievementRows.filter(achievement => {
            const contributors = parseJsonArray(achievement.contributors);
            return contributors.some(contributor => isPersonMatch(contributor, student.name));
        });

        const [certificateCountRows] = await pool.query('SELECT COUNT(*) as total FROM ctf_participation_teams WHERE JSON_SEARCH(members, "one", ?) IS NOT NULL', [student.name]);
        const rangeStartKey = earliestDateKey(student.user_created_at, student.created_at, todayKey) || todayKey;
        const workingDateKeys = await getWorkingDateKeys(rangeStartKey, todayKey);
        const [attendanceRows] = await pool.query(
            'SELECT attendance_date, entry_at, exit_at FROM attendance WHERE user_id = ? AND attendance_date BETWEEN ? AND ?',
            [userId, rangeStartKey, todayKey]
        );
        const [odRows] = await pool.query(
            'SELECT od_date, reason FROM attendance_od WHERE user_id = ? AND od_date BETWEEN ? AND ?',
            [userId, rangeStartKey, todayKey]
        );
        const attendedDates = new Set(attendanceRows.map(row => toDateKey(row.attendance_date)));
        const odDates = new Set(odRows.map(row => toDateKey(row.od_date)));
        const firstHistoryByUser = await getFirstAttendanceHistoryByUser();
        const countingStartKey = getAttendanceCountingStart({
            rangeStartKey,
            userCreatedAt: student.user_created_at,
            individualCreatedAt: student.created_at,
            historyDates: firstHistoryByUser.has(userId) ? [firstHistoryByUser.get(userId)] : []
        });
        const countedWorkingDays = workingDateKeys.filter(dateKey => dateKey >= countingStartKey);
        const attendedDays = [...attendedDates].filter(dateKey => countedWorkingDays.includes(dateKey)).length;
        const odDays = [...odDates].filter(dateKey => countedWorkingDays.includes(dateKey) && !attendedDates.has(dateKey)).length;
        const attendancePercentage = countedWorkingDays.length === 0 ? 100 : Math.round(((attendedDays + odDays) / countedWorkingDays.length) * 100);

        const todayAttendance = attendanceRows.find(row => toDateKey(row.attendance_date) === todayKey) || null;
        const todayOd = odRows.find(row => toDateKey(row.od_date) === todayKey) || null;
        const today = new Date(`${todayKey}T00:00:00`);
        const [holidayRows] = await pool.query('SELECT title FROM attendance_holidays WHERE holiday_date = ? LIMIT 1', [todayKey]);
        let todayStatus = 'not_updated';
        let todayLabel = 'Not updated';
        if (holidayRows.length > 0 || today.getDay() === 0 || isFirstOrThirdSaturday(today)) {
            todayStatus = 'holiday';
            todayLabel = holidayRows[0]?.title || 'Holiday';
        } else if (todayOd) {
            todayStatus = 'od';
            todayLabel = todayOd.reason || 'OD';
        } else if (!todayAttendance) {
            todayStatus = 'absent';
            todayLabel = 'Absent';
        } else if (student.current_day_work) {
            todayStatus = 'updated';
            todayLabel = student.current_day_work;
        }

        res.json({
            student: {
                id: student.id,
                name: student.name,
                username: student.username,
                role: student.role,
                department: student.department,
                year_of_study: student.year_of_study,
                studying_year: student.studying_year,
                team_name: student.team_name,
                image: student.image,
                certificates: parseJsonArray(student.certificates),
                research_work: parseJsonArray(student.research_work),
                current_day_work: student.current_day_work || '',
                current_work_status: todayStatus,
                current_work_label: todayLabel
            },
            stats: {
                achievements: linkedAchievements.length,
                participations: certificateCountRows[0]?.total || 0,
                attended_days: attendedDays,
                od_days: odDays,
                working_days: countedWorkingDays.length,
                attendance_percentage: attendancePercentage,
                today_entry_at: todayAttendance?.entry_at || null,
                today_exit_at: todayAttendance?.exit_at || null
            },
            achievements: linkedAchievements.slice(0, 12)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching student dashboard' });
    }
});

app.put('/api/student/profile', requireStudent, async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const department = String(req.body?.department || '').trim();
    const yearOfStudy = String(req.body?.year_of_study || '').trim();
    const studyingYearRaw = req.body?.studying_year;
    const studyingYear = studyingYearRaw === '' || studyingYearRaw === null || studyingYearRaw === undefined ? null : Number(studyingYearRaw);
    const image = String(req.body?.image || '').trim();
    const certificates = Array.isArray(req.body?.certificates) ? req.body.certificates : [];
    const researchWork = Array.isArray(req.body?.research_work) ? req.body.research_work : [];

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (studyingYear !== null && (!Number.isInteger(studyingYear) || studyingYear < 1 || studyingYear > 4)) {
        return res.status(400).json({ error: 'Studying year must be between 1 and 4' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE individuals
             SET name = ?, department = ?, year_of_study = ?, studying_year = ?, image = ?, certificates = ?, research_work = ?
             WHERE id = ? AND user_id = ?`,
            [
                name,
                department,
                yearOfStudy,
                studyingYear,
                image,
                JSON.stringify(certificates),
                JSON.stringify(researchWork),
                req.student.individualId,
                req.student.userId
            ]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Student profile not found' });
        res.json({ message: 'Student profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating student profile' });
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
            
            const attendanceResult = await submitAttendanceForReview(user.id, user.username);
            return res.status(attendanceResult.success ? 200 : 403).json(attendanceResult);
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

