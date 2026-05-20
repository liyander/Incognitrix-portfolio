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

// Database Connection
const pool = mysql.createPool({
    host: 'localhost',
    user: 'CTF',
    password: 'root',
    database: 'incognitrix_db_new',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL Database: incognitrix_lab');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed. Ensure MySQL is running, the user CTF exists, and the incognitrix_lab database is created.', err);
    });

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
        const [rows] = await pool.query('SELECT * FROM teams');
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
            SELECT i.*, t.name as team_name 
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
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
            SELECT i.*, t.name as team_name 
            FROM individuals i 
            LEFT JOIN teams t ON i.team_id = t.id
            WHERE i.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Individual not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching individual' });
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

app.post('/api/individuals', async (req, res) => {
    const { name, role, team_id, department, year_of_study, achievements, certificates, research_work, image } = req.body;
    try {
        const parsedTeamId = team_id && team_id !== '' ? parseInt(team_id, 10) : null;

        const [result] = await pool.query(
            'INSERT INTO individuals (name, role, team_id, department, year_of_study, achievements, certificates, research_work, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                name, role, parsedTeamId, department, year_of_study, 
                JSON.stringify(achievements || []), 
                JSON.stringify(certificates || []), 
                JSON.stringify(research_work || []),
                image || ''
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Individual created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating individual' });
    }
});

app.put('/api/individuals/:id', async (req, res) => {
    const { name, role, team_id, department, year_of_study, achievements, certificates, research_work, image } = req.body;
    try {
        const parsedTeamId = team_id && team_id !== '' ? parseInt(team_id, 10) : null;
        await pool.query(
            'UPDATE individuals SET name = ?, role = ?, team_id = ?, department = ?, year_of_study = ?, achievements = ?, certificates = ?, research_work = ?, image = ? WHERE id = ?',
            [
                name, role, parsedTeamId, department, year_of_study, 
                JSON.stringify(achievements || []), 
                JSON.stringify(certificates || []), 
                JSON.stringify(research_work || []), 
                image || '',
                req.params.id
            ]
        );
        res.json({ message: 'Individual updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating individual' });
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
        const [result] = await pool.query('INSERT INTO cves (cve_number, details, poc, reference_link, contributors) VALUES (?, ?, ?, ?, ?)', [cve_number, details, poc, JSON.stringify(reference_link || []), JSON.stringify(contributors || [])]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/api/cves/:id', async (req, res) => {
    const { cve_number, details, poc, reference_link, contributors } = req.body;
    try {
        await pool.query('UPDATE cves SET cve_number=?, details=?, poc=?, reference_link=?, contributors=? WHERE id=?', [cve_number, details, poc, JSON.stringify(reference_link || []), JSON.stringify(contributors || []), req.params.id]);
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
        const [result] = await pool.query('INSERT INTO achievements (title, description, date, future_scope, reference_link, contributors) VALUES (?, ?, ?, ?, ?, ?)', [title, description, date, future_scope, JSON.stringify(reference_link || []), JSON.stringify(contributors || [])]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.put('/api/achievements/:id', async (req, res) => {
    const { title, description, date, future_scope, reference_link, contributors } = req.body;
    try {
        await pool.query('UPDATE achievements SET title=?, description=?, date=?, future_scope=?, reference_link=?, contributors=? WHERE id=?', [title, description, date, future_scope, JSON.stringify(reference_link || []), JSON.stringify(contributors || []), req.params.id]);
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

// Admin Get Attendance
app.get('/api/admin/attendance', async (req, res) => {
    try {
        const [totalDaysRow] = await pool.query('SELECT DATEDIFF(CURRENT_DATE, MIN(attendance_date)) + 1 as totalEvents FROM attendance');
        let totalEvents = totalDaysRow[0].totalEvents || 1; 
        if (totalEvents <= 0) totalEvents = 1;

        const [rows] = await pool.query(`
            SELECT u.id, u.username, COUNT(a.id) as attended_days
            FROM users u
            LEFT JOIN attendance a ON u.id = a.user_id
            GROUP BY u.id, u.username
        `);
        
        const attendanceData = rows.map(r => ({
            id: r.id,
            username: r.username,
            attended_days: r.attended_days,
            percentage: Math.round((r.attended_days / totalEvents) * 100)
        }));
        
        res.json(attendanceData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching attendance' });
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
            const secret = speakeasy.generateSecret({ name: `Incognitrix portfolio` });
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
        const verified = speakeasy.totp.verify({
            secret: user.twofa_secret,
            encoding: "base32",
            token: token
        });

        if (verified) {
            if (!user.has_2fa_enabled) {
                await pool.query("UPDATE users SET has_2fa_enabled = TRUE WHERE id = ?", [user.id]);
            }
            
            // Mark attendance for today
            const today = new Date().toISOString().split('T')[0];
            try {
                await pool.query(
                    "INSERT INTO attendance (user_id, attendance_date) VALUES (?, ?)", 
                    [user.id, today]
                );
                return res.json({ success: true, message: "Attendance marked as present for today!", username: user.username, attendanceRecorded: true });
            } catch (attErr) {
                if (attErr.code === 'ER_DUP_ENTRY') {
                   return res.json({ success: true, message: "Attendance already marked for today.", username: user.username, attendanceRecorded: false, alreadyMarked: true });
                }
                throw attErr;
            }
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

