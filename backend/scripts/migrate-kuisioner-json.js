const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'uptd_lab'
        });

        console.log('🔌 Connected');

        // Ambil pertanyaan
        const [questions] = await connection.query('SELECT id, question_text FROM kuisioner_questions ORDER BY urutan');
        console.log(`📋 Found ${questions.length} questions`);

        // Ambil data yang jawaban_json NULL
        const [rows] = await connection.query('SELECT id FROM kuisioner WHERE jawaban_json IS NULL OR jawaban_json = "" OR jawaban_json = "null"');

        for (const row of rows) {
            const jawabanObj = {};
            questions.forEach(q => {
                jawabanObj[String(q.id)] = null;
            });
            const pertanyaanTexts = questions.map(q => q.question_text);

            await connection.query(`
                UPDATE kuisioner 
                SET jawaban_json = ?, pertanyaan_json = ?
                WHERE id = ?
            `, [JSON.stringify(jawabanObj), JSON.stringify(pertanyaanTexts), row.id]);
            console.log(`✅ Row ${row.id} updated`);
        }

        console.log('🎉 Selesai');
        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();