const cron = require('node-cron');
const { pool } = require('../db');

function startWeeklyWinner(client) {
  // Runs every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    try {
      const channelId = process.env.UOTW_CHANNEL_ID;
      const channel = await client.channels.fetch(channelId);
      if (!channel) return console.error('[UOTW] Channel not found');

      // Get the top user of the past week
      const [rows] = await pool.query(
        `SELECT discord_id, username, points FROM bot_points ORDER BY points DESC LIMIT 1`
      );

      if (!rows.length) return;

      const winner = rows[0];

      // Save to history
      await pool.query(
        `INSERT INTO bot_uotw (discord_id, username, points_that_week, week_start)
         VALUES (?, ?, ?, DATE(NOW()))`,
        [winner.discord_id, winner.username, winner.points]
      );

      // Announce
      await channel.send(
        `🏆 **User of the Week** 🏆\n\n` +
        `Congratulations to <@${winner.discord_id}> — **${winner.username}**!\n` +
        `They topped the leaderboard this week with **${winner.points} points**! 🎉\n\n` +
        `Keep grinding everyone, new week starts now! 💪`
      );

      console.log(`[UOTW] Announced winner: ${winner.username}`);
    } catch (err) {
      console.error('[UOTW] Error:', err);
    }
  });

  console.log('[UOTW] Weekly winner cron scheduled ✅');
}

module.exports = { startWeeklyWinner };
