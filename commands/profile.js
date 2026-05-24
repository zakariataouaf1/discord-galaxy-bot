const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, ensureUser, getLevelInfo } = require('../utils/points');
const { pool } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View full profile stats')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to view (leave empty for yourself)').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    await ensureUser(target.id, target.username);
    const user = await getUser(target.id);
    const lvl = getLevelInfo(user.points);

    // Check UOTW wins
    const [wins] = await pool.query(
      `SELECT COUNT(*) as count FROM bot_uotw WHERE discord_id = ?`,
      [target.id]
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 ${target.username}'s Profile`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '⭐ Points', value: `${user.points}`, inline: true },
        { name: '🏅 Rank', value: lvl.name, inline: true },
        { name: '🎙️ Voice Time', value: `${Math.floor(user.total_voice_minutes / 60)}h ${user.total_voice_minutes % 60}m`, inline: true },
        { name: '🔗 People Invited', value: `${user.total_invites}`, inline: true },
        { name: '🏆 UOTW Wins', value: `${wins[0].count}`, inline: true },
        { name: '📅 Member Since', value: `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:D>`, inline: true },
      )
      .setFooter({ text: 'Galaxy BOT' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
