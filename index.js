require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const ffmpeg = require('ffmpeg-static');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize DisTube using SoundCloud as the unblockable background engine
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    ffmpeg: {
        path: ffmpeg
    },
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin() // Completely bypasses YouTube's 0-byte ghost streams
    ]
});

const PREFIX = process.env.PREFIX || '!';

client.once('ready', () => {
    console.log(`🎵 Neliel is online and running on the stable SoundCloud bypass!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('You need to be in a voice channel!');

        const query = args.join(' ');
        if (!query) return message.reply('Please provide a Spotify link!');

        try {
            message.reply(`🔍 Routing Spotify track through SoundCloud...`);
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
            message.channel.send('❌ Audio stream failed to bridge.');
        }
    }

    if (command === 'restart' || command === 'reboot') {
        await message.reply('🔄 Restarting services...');
        distube.voices.leave(message.guild.id);
        client.destroy();
        process.exit(0);
    }

    if (command === 'stop' || command === 'leave') {
        const queue = distube.getQueue(message);
        if (!queue) return message.reply('Nothing is playing right now!');
        
        distube.voices.leave(message);
        message.reply('⏹️ Stopped playback.');
    }

    if (command === 'skip') {
        try {
            await distube.skip(message);
            message.reply('⏩ Skipped!');
        } catch (e) {
            message.reply('❌ No songs next in queue.');
        }
    }
});

// Event Listeners
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎶 Now playing: **${song.name}** - \`${song.formattedDuration}\``);
});

// Built-in debuggers to catch any silent failures
distube.on('error', (channel, e) => {
    console.error('🔴 DisTube Error:', e);
    if (channel) channel.send(`❌ An error occurred: ${e.message.slice(0, 100)}`);
});

distube.on('ffmpegError', (channel, e) => {
    console.error('🔴 FFmpeg Crash:', e);
});

client.login(process.env.DISCORD_TOKEN);