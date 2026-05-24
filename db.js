const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    // Points & rank table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bot_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(30) NOT NULL UNIQUE,
        username VARCHAR(100) NOT NULL,
        points INT DEFAULT 0,
        level INT DEFAULT 1,
        total_voice_minutes INT DEFAULT 0,
        total_invites INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Voice sessions (track who is in voice and since when)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bot_voice_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invite tracking
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bot_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(30) NOT NULL,
        invite_code VARCHAR(20) NOT NULL UNIQUE,
        uses INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User of the week history
    await conn.query(`
      CREATE TABLE IF NOT EXISTS bot_uotw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(30) NOT NULL,
        username VARCHAR(100) NOT NULL,
        points_that_week INT DEFAULT 0,
        week_start DATE NOT NULL,
        announced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] All tables ready ✅');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
