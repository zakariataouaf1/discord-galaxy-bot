const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resetPoints, ensureUser } = require('../utils/points');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetpoints')
    .setDescription('Reset a user\'s points to 0 [Admin only]')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    await ensureUser(target.id, target.username);
    await resetPoints(target.id);

    await interaction.reply({
      content: `✅ Reset **${target.username}**'s points to 0.`,
      ephemeral: true
    });
  }
};
