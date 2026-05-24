const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const { initDB } = require('./db');
const { handleVoiceStateUpdate } = require('./events/voiceStateUpdate');
const { handleGuildMemberAdd, cacheInvites } = require('./events/guildMemberAdd');
const { handleInteraction } = require('./events/interactionCreate');
const { startWeeklyWinner } = require('./utils/weeklyWinner');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  console.log(`\n✅ Bot online as ${client.user.tag}`);
  console.log(`📡 Connected to ${client.guilds.cache.size} server(s)\n`);

  // Init DB tables
  await initDB();

  // Cache existing invites for referral tracking
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
  }

  // Start weekly winner cron
  startWeeklyWinner(client);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  handleVoiceStateUpdate(oldState, newState, client);
});

client.on('guildMemberAdd', member => {
  handleGuildMemberAdd(member, member.guild);
});

client.on('interactionCreate', interaction => {
  handleInteraction(interaction);
});

// Handle crashes gracefully
process.on('unhandledRejection', err => {
  console.error('[UNHANDLED]', err);
});

client.login(process.env.BOT_TOKEN);
