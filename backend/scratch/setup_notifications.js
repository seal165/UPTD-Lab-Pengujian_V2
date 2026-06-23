const mysql = require('mysql2/promise');

async function run() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'uptd_lab'
    });

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                href VARCHAR(255) DEFAULT '#',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Table notifications created successfully.");
    } catch (e) {
        console.error("Error creating table:", e);
    }
    
    await db.end();
}

run();
