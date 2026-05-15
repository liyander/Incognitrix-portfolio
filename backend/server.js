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

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${port}`);
});
