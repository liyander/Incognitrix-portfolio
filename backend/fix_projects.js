const mysql = require('mysql2/promise');
async function run() {
    const pool = mysql.createPool({host: 'localhost', user: 'CTF', password: 'root', database: 'incognitrix_db_new'});
    await pool.query('TRUNCATE TABLE projects');
    await pool.query(`INSERT INTO projects (id, title, status, priority, description, shortDesc) VALUES 
        ("PROJ-1", "Incognitrix Academy", "ONGOING", "HIGH", "Academy platform", "Academy platform"),
        ("PROJ-2", "Incognitrix Range", "ONGOING", "HIGH", "CTF and training range", "CTF and training range"),
        ("PROJ-3", "Incognitrix Portfolio", "ONGOING", "MEDIUM", "Team portfolio", "Team portfolio"),
        ("PROJ-4", "AR VR Project", "ONGOING", "MEDIUM", "Augmented and virtual reality", "Augmented and virtual reality")
    `);
    console.log('Projects fixed!');
    process.exit(0);
}
run().catch(console.error);