require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const ffmpeg = require('ffmpeg-static');
const express = require('express');

// --- 1. Render Port Binding (Dummy Web Server) ---
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Neliel is online and functioning!');
});

app.listen(port, () => {
    console.log(`🛡️ Web server active on port ${port} to satisfy Render checks.`);
});

// --- 2. Discord Client Initialization ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// --- 3. DisTube Configuration ---
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    ffmpeg: {
        path: ffmpeg
    },
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin() // Bypasses YouTube's strict blocking
    ]
});

const PREFIX = process.env.PREFIX || '!';

client.once('ready', () => {
    console.log(`🎵 Neliel is online and running on the stable SoundCloud bypass!`);
});

// --- 4. Command Handler ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !play Command
    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be in a voice channel!');

        const query = args.join(' ');
        if (!query) return message.reply('Please provide a Spotify link!');

        try {
            message.reply(`🔍 Routing track through SoundCloud...`);
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
            message.channel.send('❌ Audio stream failed to bridge.');
        }
    }

    // !restart Command
    if (command === 'restart' || command === 'reboot') {
        await message.reply('🔄 Restarting services...');
        distube.voices.leave(message.guild.id);
        client.destroy();
        process.exit(0);
    }

    // !stop Command
    if (command === 'stop' || command === 'leave') {
        const queue = distube.getQueue(message);
        if (!queue) return message.reply('Nothing is playing right now!');
        
        distube.voices.leave(message);
        message.reply('⏹️ Stopped playback.');
    }

    // !skip Command
    if (command === 'skip') {
        try {
            await distube.skip(message);
            message.reply('⏩ Skipped!');
        } catch (e) {
            message.reply('❌ No songs next in queue.');
        }
    }
});

// --- 5. Event Listeners & Debuggers ---
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎶 Now playing: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('error', (channel, e) => {
    console.error('🔴 DisTube Error:', e);
    if (channel) channel.send(`❌ An error occurred: ${e.message.slice(0, 100)}`);
});

distube.on('ffmpegError', (channel, e) => {
    console.error('🔴 FFmpeg Crash:', e);
});

// --- 6. Login ---
client.login(process.env.DISCORD_TOKEN);