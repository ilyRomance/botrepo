// bot.js

// --------------------------------------------------------------------------------
// *** ADDED: Import Express for the Render Health Check ***
// --------------------------------------------------------------------------------
const express = require('express'); 
// ******************************************************

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();


const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const mongo = new MongoClient(process.env.MONGO_URI);
let db;

mongo.connect().then(() => {
  db = mongo.db('skirmish');
  console.log('Connected to MongoDB');
});

function calculateSRChange(kills, roundsWon, roundsLost) {
  const roundsTotal = roundsWon + roundsLost;
  if (roundsTotal === 0) return 0;
  const performanceFactor = kills / roundsTotal;
  const marginFactor = (roundsWon - roundsLost) / roundsTotal;
  const base = 20;
  return parseFloat((base * performanceFactor * marginFactor).toFixed(2));
}

function validateMatchInput(kills, roundsWon, roundsLost) {
  const MAX_ROUNDS = 60;
  const MAX_KILLS = 60;
  if (kills < 0 || roundsWon < 0 || roundsLost < 0) return 'Values cannot be negative.';
  if (roundsWon + roundsLost > MAX_ROUNDS) return `Total rounds cannot exceed ${MAX_ROUNDS}.`;
  if (kills > MAX_KILLS) return `Kills cannot exceed ${MAX_KILLS}.`;
  return null;
}

async function updatePlayerStats(playerId, kills, roundsWon, roundsLost, winner, seasonId) {
  const srChange = calculateSRChange(kills, roundsWon, roundsLost);
  const isWinner = winner === playerId;
  const deltaKills = kills;
  const deltaWins = isWinner ? 1 : 0;

  const player = await db.collection('players').findOne({ discordId: playerId }) || {};
  const updated = {
    discordId: playerId,
    sr: (player.sr || 0) + srChange,
    totalKills: (player.totalKills || 0) + deltaKills,
    totalWins: (player.totalWins || 0) + deltaWins,
    seasonalStats: {
      ...(player.seasonalStats || {}),
      [seasonId]: {
        sr: ((player.seasonalStats?.[seasonId]?.sr) || 0) + srChange,
        kills: ((player.seasonalStats?.[seasonId]?.kills) || 0) + deltaKills,
        wins: ((player.seasonalStats?.[seasonId]?.wins) || 0) + deltaWins
      }
    }
  };
  await db.collection('players').updateOne({ discordId: playerId }, { $set: updated }, { upsert: true });
  return srChange;
}

async function getLeaderboard(statKey, seasonId = null, topN = 10) {
  const sortField = seasonId ? `seasonalStats.${seasonId}.${statKey}` : statKey;
  return db.collection('players').find({}).sort({ [sortField]: -1 }).limit(topN).toArray();
}

async function postLeaderboard(channelId, statKey, seasonId = null) {
  const leaderboard = await getLeaderboard(statKey, seasonId);
  let description = '';
  leaderboard.forEach((p, i) => {
    const value = seasonId ? p.seasonalStats?.[seasonId]?.[statKey] || 0 : p[statKey] || 0;
    description += `${i + 1}. <@${p.discordId}> — ${value}\n`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Leaderboard: ${statKey}${seasonId ? ` (${seasonId})` : ''}`)
    .setDescription(description)
    .setColor('#FFD700');

  const channel = await client.channels.fetch(channelId);
  if (channel) channel.send({ embeds: [embed] });
}

const commands = [
  new SlashCommandBuilder()
    .setName('report_match')
    .setDescription('Admin-only: report a completed Skirmish match')
    .addUserOption(o => o.setName('player1').setDescription('First player').setRequired(true))
    .addUserOption(o => o.setName('player2').setDescription('Second player').setRequired(true))
    .addNumberOption(o => o.setName('kills1').setDescription('Kills by player1').setRequired(true))
    .addNumberOption(o => o.setName('kills2').setDescription('Kills by player2').setRequired(true))
    .addNumberOption(o => o.setName('rounds1').setDescription('Rounds won by player1').setRequired(true))
    .addNumberOption(o => o.setName('rounds2').setDescription('Rounds won by player2').setRequired(true))
    .addStringOption(o => o.setName('season').setDescription('Season ID').setRequired(false)),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display a leaderboard')
    .addStringOption(o =>
      o.setName('type').setDescription('Type (sr, kills, wins)').setRequired(true)
        .addChoices(
          { name: 'SR', value: 'sr' },
          { name: 'Kills', value: 'totalKills' },
          { name: 'Wins', value: 'totalWins' }
        ))
    .addStringOption(o => o.setName('season').setDescription('Season ID').setRequired(false)),
  new SlashCommandBuilder()
    .setName('reset_season')
    .setDescription('Admin-only: reset a season')
    .addStringOption(o => o.setName('season').setDescription('Season ID').setRequired(false))
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'report_match') {}
