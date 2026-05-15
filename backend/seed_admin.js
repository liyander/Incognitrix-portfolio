const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'CTF',
        password: 'root',
        database: 'incognitrix_db_new'
    });

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )
    `);

    const [rows] = await connection.execute('SELECT * FROM admins WHERE username = ?', ['Adm1n']);
    
    if (rows.length === 0) {
        const hashedPassword = await bcrypt.hash('P@ssw0rd#567', 10);
        await connection.execute('INSERT INTO admins (username, password) VALUES (?, ?)', ['Adm1n', hashedPassword]);
        console.log('Default admin seeded.');
    } else {
        console.log('Admin already exists.');
    }

    await connection.end();
}

seedAdmin().catch(console.error);