const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../db');
const { addPoints, ensureUser } = require('../utils/points');

const STAFF_ROLE_IDS = [
  '924026085472104492', // Admin
  '924026085472104495', // Owner
  '1465714632311181495', // </>
  '1453417028189950073', // Galaxy Staff (boy/girl)
  '1468075952281096416', // Lady Manager
  '1477454467136753665', // HAMMER
];

const VERIFIED_ROLES = {
  boy: '924026085421752408',
  girl: '925860423469793280',
};

const VERIFY_POINTS = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify a user and assign the correct role')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to verify').setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('gender')
        .setDescription('Verified role to assign')
        .setRequired(true)
        .addChoices(
          { name: 'Boy', value: 'boy' },
          { name: 'Girl', value: 'girl' }
        )
    ),

  async execute(interaction) {
    const staffMember = interaction.member;
    const hasStaffRole = STAFF_ROLE_IDS.some(roleId => staffMember.roles.cache.has(roleId));

    if (!hasStaffRole) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⛔ Access denied')
        .setDescription('Only staff and higher roles can verify users.')
        .setFooter({ text: 'Verification System' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const gender = interaction.options.getString('gender');
    const roleId = VERIFIED_ROLES[gender];

    const guild = interaction.guild;
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('❌ User not found')
        .setDescription('I could not find that user in this server.')
        .setFooter({ text: 'Verification System' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Already verified in DB?
    const [rows] = await pool.query(
      `SELECT verified_role, verified_gender FROM bot_verifications WHERE discord_id = ? LIMIT 1`,
      [targetUser.id]
    );

    const hasBoy = targetMember.roles.cache.has(VERIFIED_ROLES.boy);
    const hasGirl = targetMember.roles.cache.has(VERIFIED_ROLES.girl);
    const alreadyVerifiedRole = hasBoy || hasGirl;

    if (rows.length || alreadyVerifiedRole) {
      if (rows.length && !alreadyVerifiedRole) {
        await targetMember.roles.add(rows[0].verified_role);
      }

      if (!rows.length && alreadyVerifiedRole) {
        const existingGender = hasGirl ? 'girl' : 'boy';
        const existingRole = hasGirl ? VERIFIED_ROLES.girl : VERIFIED_ROLES.boy;
        await pool.query(
          `INSERT INTO bot_verifications (discord_id, verified_by, verified_role, verified_gender)
           VALUES (?, ?, ?, ?)` ,
          [targetUser.id, interaction.user.id, existingRole, existingGender]
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('✅ Already verified')
        .setDescription(`${targetUser.username} is already verified. No points awarded.`)
        .addFields(
          { name: 'User', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Checked by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'Verification System' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await targetMember.roles.add(roleId);

    await pool.query(
      `INSERT INTO bot_verifications (discord_id, verified_by, verified_role, verified_gender)
       VALUES (?, ?, ?, ?)` ,
      [targetUser.id, interaction.user.id, roleId, gender]
    );

    await ensureUser(interaction.user.id, interaction.user.username);
    const { after } = await addPoints(interaction.user.id, interaction.user.username, VERIFY_POINTS);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('✅ Verification successful')
      .setDescription(`${targetUser.username} has been verified as **${gender.toUpperCase()}**.`)
      .addFields(
        { name: 'User', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Verified by', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Points Awarded', value: `+${VERIFY_POINTS} (Total: ${after.points})`, inline: true }
      )
      .setFooter({ text: 'Verification System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // DM the staff member a confirmation
    try {
      await interaction.user.send({ embeds: [embed] });
    } catch (_) {}
  }
};
