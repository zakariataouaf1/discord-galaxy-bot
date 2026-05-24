const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard, getLevelInfo } = require('../utils/points');

const medals = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 users by points'),

  async execute(interaction) {
    const rows = await getLeaderboard(10);

    if (!rows.length) {
      return interaction.reply({ content: 'No data yet. Start earning points!', ephemeral: true });
    }

    const description = rows.map((u, i) => {
      const medal = medals[i] || `**#${i + 1}**`;
      const lvl = getLevelInfo(u.points);
      return `${medal} <@${u.discord_id}> — **${u.points} pts** ${lvl.name}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆 Leaderboard — Top 10')
      .setDescription(description)
      .setFooter({ text: 'Updated live' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
