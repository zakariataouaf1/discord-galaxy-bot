const { pool } = require('../db');

// Define levels — tweak points thresholds as you like
const LEVELS = [
  { level: 1, name: '🥉 Bronze',    min: 0 },
  { level: 2, name: '🥈 Silver',    min: 100 },
  { level: 3, name: '🥇 Gold',      min: 300 },
  { level: 4, name: '💎 Diamond',   min: 600 },
  { level: 5, name: '👑 Legend',    min: 1000 },
];

function getLevelInfo(points) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.min) current = lvl;
  }
  const nextIndex = LEVELS.indexOf(current) + 1;
  const next = LEVELS[nextIndex] || null;
  return { ...current, next };
}

async function ensureUser(discord_id, username) {
  await pool.query(
    `INSERT INTO bot_points (discord_id, username) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE username = VALUES(username)`,
    [discord_id, username]
  );
}

async function getUser(discord_id) {
  const [rows] = await pool.query(
    `SELECT * FROM bot_points WHERE discord_id = ?`,
    [discord_id]
  );
  return rows[0] || null;
}

async function addPoints(discord_id, username, amount) {
  await ensureUser(discord_id, username);
  const before = await getUser(discord_id);
  const oldLevel = getLevelInfo(before.points);

  await pool.query(
    `UPDATE bot_points SET points = points + ? WHERE discord_id = ?`,
    [amount, discord_id]
  );

  const after = await getUser(discord_id);
  const newLevel = getLevelInfo(after.points);

  // Return whether user leveled up
  const leveledUp = newLevel.level > oldLevel.level ? newLevel : null;
  return { after, leveledUp };
}

async function removePoints(discord_id, amount) {
  await pool.query(
    `UPDATE bot_points SET points = GREATEST(0, points - ?) WHERE discord_id = ?`,
    [amount, discord_id]
  );
}

async function resetPoints(discord_id) {
  await pool.query(
    `UPDATE bot_points SET points = 0, level = 1 WHERE discord_id = ?`,
    [discord_id]
  );
}

async function getLeaderboard(limit = 10) {
  const [rows] = await pool.query(
    `SELECT discord_id, username, points, level FROM bot_points ORDER BY points DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = { addPoints, removePoints, resetPoints, getUser, ensureUser, getLeaderboard, getLevelInfo };
