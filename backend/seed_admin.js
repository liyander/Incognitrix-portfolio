const mysql = require('mysql2/promise');

const adminUsername = 'Adm1n';
const adminPasswordHash = '$2b$10$Vo9Vv1jAayZpc4K2ukwqjuJQZOY4mvSSOOMdsWbj2QigpYfWa9y7a';

async function seedAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'CTF',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'incognitrix_db_new'
    });

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        )
    `);

    await connection.execute(`
        INSERT INTO admins (username, password)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, [adminUsername, adminPasswordHash]);
    console.log(`Default admin initialized: ${adminUsername}`);

    await connection.end();
}

seedAdmin().catch(console.error);
