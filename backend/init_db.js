const mysql = require('mysql2/promise');

async function initializeDatabase() {
    try {
        console.log('Connecting to MySQL (no specific DB)...');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'CTF',
            password: 'root'
        });

        console.log('Connected. Creating database and tables...');
        
        await connection.query('CREATE DATABASE IF NOT EXISTS incognitrix_lab');
        await connection.query('USE incognitrix_lab');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255),
                status VARCHAR(50),
                priority VARCHAR(50),
                description TEXT,
                shortDesc TEXT,
                image TEXT,
                stack JSON,
                timeline JSON,
                beneficiaries VARCHAR(255),
                team VARCHAR(255),
                usage_desc TEXT,
                operatives JSON
            )
        `;
        
        await connection.query(createTableQuery);

        const createTeamsTableQuery = `
            CREATE TABLE IF NOT EXISTS teams (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                technical_summary TEXT,
                current_objective TEXT
            )
        `;
        await connection.query(createTeamsTableQuery);

        // Attempt to add columns if table already exists but without these columns
        try {
            await connection.query('ALTER TABLE teams ADD COLUMN technical_summary TEXT');
            await connection.query('ALTER TABLE teams ADD COLUMN current_objective TEXT');
        } catch (e) {
            // Columns likely already exist, ignore
        }

        // Insert default teams if table is empty
        const [existingTeams] = await connection.query('SELECT COUNT(*) as count FROM teams');
        if (existingTeams[0].count === 0) {
            const defaultTeams = [
                ['Red team', 'Offensive Operations', 'Simulates advanced persistent threats (APTs) against internal infrastructure.', 'Operation Glass House: Lateral movement testing within the Beta subnet.'],
                ['Blue team', 'Defensive Operations', 'Proactive threat hunting, incident response, and continuous monitoring of network perimeters.', 'Patch deployment across Alpha nodes.'],
                ['Network', 'Core Systems Architecture & Routing Protocols', 'Maintains the physical and logical topology of the Kinetic Terminal.', 'Upgrading backbone switches to 100Gbps interfaces.'],
                ['CVE', 'Vulnerability Research', 'Tracks and mitigates Common Vulnerabilities and Exposures.', 'Researching latest zero-day exploits in the wild.'],
                ['VAPT', 'Vulnerability Assessment and Penetration Testing', 'Conducts comprehensive security assessments of internal systems.', 'Scheduled quarterly penetration testing.'],
                ['Project team', 'Project Management and Execution', 'Oversees the lifecycle of specialized research projects.', 'Ensuring timely delivery of all Q3 objectives.'],
                ['Research team', 'Advanced Security Research', 'Develops new tools and methodologies for both offensive and defensive operations.', 'Prototyping next-generation AI-driven threat detection.']
            ];

            for (const team of defaultTeams) {
                await connection.query('INSERT INTO teams (name, description, technical_summary, current_objective) VALUES (?, ?, ?, ?)', team);
            }
            console.log('Inserted default teams into database.');
        }

        const createIndividualsTableQuery = `
            CREATE TABLE IF NOT EXISTS individuals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100),
                team_id INT,
                department VARCHAR(255),
                year_of_study VARCHAR(50),
                achievements TEXT,
                certificates TEXT,
                research_work TEXT,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
            )
        `;
        await connection.query(createIndividualsTableQuery);
        
        console.log('Database and all tables (projects, teams, individuals) successfully initialized!');
        
        await connection.end();
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

initializeDatabase();