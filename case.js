const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { getContentType, downloadContentFromMessage, proto, prepareWAMessageMedia, generateWAMessageFromContent } = require('queenruva-sockets');
const { sms } = require("./msg");
const FileType = require('file-type');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');
const yts = require('yt-search');

// ===== USER PREFIX SYSTEM =====
const USER_PREFIXES_FILE = './user_prefixes.json';
let userPrefixes = {};
try {
    userPrefixes = JSON.parse(fs.readFileSync(USER_PREFIXES_FILE));
} catch {
    userPrefixes = {};
}

function getUserPrefix(userId) {
    return userPrefixes[userId] || '.';
}

function saveUserPrefix(userId, newPrefix) {
    userPrefixes[userId] = newPrefix;
    fs.writeFileSync(USER_PREFIXES_FILE, JSON.stringify(userPrefixes, null, 2));
}
// ===== END USER PREFIX SYSTEM =====

// ===== ANTI-LINK SYSTEM =====
const ANTI_LINK_FILE = './antilink.json';
let antiLinkSettings = {};
try {
    antiLinkSettings = JSON.parse(fs.readFileSync(ANTI_LINK_FILE));
} catch {
    antiLinkSettings = {};
}

function getAntiLinkSettings(groupId) {
    return antiLinkSettings[groupId] || { enabled: false, action: 'delete', warnings: {} };
}

function saveAntiLinkSettings(groupId, settings) {
    antiLinkSettings[groupId] = settings;
    fs.writeFileSync(ANTI_LINK_FILE, JSON.stringify(antiLinkSettings, null, 2));
}

function containsLink(text) {
    if (!text) return false;
    const patterns = [
        /https?:\/\/[^\s]+/gi,
        /www\.[^\s]+/gi,
        /bit\.ly\/[^\s]+/gi,
        /tinyurl\.com\/[^\s]+/gi,
        /t\.me\/[^\s]+/gi,
        /wa\.me\/[^\s]+/gi,
        /chat\.whatsapp\.com\/[^\s]+/gi,
        /instagram\.com\/[^\s]+/gi,
        /facebook\.com\/[^\s]+/gi,
        /twitter\.com\/[^\s]+/gi,
        /youtube\.com\/[^\s]+/gi,
        /youtu\.be\/[^\s]+/gi,
        /discord\.gg\/[^\s]+/gi,
        /discord\.com\/invite\/[^\s]+/gi,
        /tiktok\.com\/[^\s]+/gi,
        /telegram\.org\/[^\s]+/gi
    ];
    return patterns.some(p => p.test(text));
}
// ===== END ANTI-LINK =====

// Helper functions
function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

async function oneViewmeg(socket, isOwner, msg, sender) {
    if (isOwner) {  
        try {
            const akuru = sender;
            const quot = msg;
            if (quot) {
                if (quot.imageMessage?.viewOnce) {
                    let cap = quot.imageMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.imageMessage);
                    await socket.sendMessage(akuru, { image: { url: anu }, caption: cap });
                } else if (quot.videoMessage?.viewOnce) {
                    let cap = quot.videoMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.videoMessage);
                    await socket.sendMessage(akuru, { video: { url: anu }, caption: cap });
                } else if (quot.audioMessage?.viewOnce) {
                    let cap = quot.audioMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.audioMessage);
                    await socket.sendMessage(akuru, { audio: { url: anu }, caption: cap });
                } else if (quot.viewOnceMessageV2?.message?.imageMessage){
                    let cap = quot.viewOnceMessageV2?.message?.imageMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.viewOnceMessageV2.message.imageMessage);
                    await socket.sendMessage(akuru, { image: { url: anu }, caption: cap });
                } else if (quot.viewOnceMessageV2?.message?.videoMessage){
                    let cap = quot.viewOnceMessageV2?.message?.videoMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.viewOnceMessageV2.message.videoMessage);
                    await socket.sendMessage(akuru, { video: { url: anu }, caption: cap });
                } else if (quot.viewOnceMessageV2Extension?.message?.audioMessage){
                    let cap = quot.viewOnceMessageV2Extension?.message?.audioMessage?.caption || "";
                    let anu = await socket.downloadAndSaveMediaMessage(quot.viewOnceMessageV2Extension.message.audioMessage);
                    await socket.sendMessage(akuru, { audio: { url: anu }, caption: cap });
                }
            }        
        } catch (error) {
            console.error('oneViewmeg error:', error);
        }
    }
}

// Main command handler setup function
module.exports = {
    setupCommandHandlers: (socket, number, activeSockets, socketCreationTime, config) => {
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

            const type = getContentType(msg.message);
            if (!msg.message) return;
            msg.message = (getContentType(msg.message) === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const m = sms(socket, msg);
            const quoted =
                type == "extendedTextMessage" &&
                msg.message.extendedTextMessage.contextInfo != null
                ? msg.message.extendedTextMessage.contextInfo.quotedMessage || []
                : [];
            const body = (type === 'conversation') ? msg.message.conversation 
                : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') 
                ? msg.message.extendedTextMessage.text 
                : (type == 'interactiveResponseMessage') 
                ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage 
                    && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id 
                : (type == 'templateButtonReplyMessage') 
                ? msg.message.templateButtonReplyMessage?.selectedId 
                : (type === 'extendedTextMessage') 
                ? msg.message.extendedTextMessage.text 
                : (type == 'imageMessage') && msg.message.imageMessage.caption 
                ? msg.message.imageMessage.caption 
                : (type == 'videoMessage') && msg.message.videoMessage.caption 
                ? msg.message.videoMessage.caption 
                : (type == 'buttonsResponseMessage') 
                ? msg.message.buttonsResponseMessage?.selectedButtonId 
                : (type == 'listResponseMessage') 
                ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                : (type == 'messageContextInfo') 
                ? (msg.message.buttonsResponseMessage?.selectedButtonId 
                    || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                    || msg.text) 
                : (type === 'viewOnceMessage') 
                ? msg.message[type]?.message[getContentType(msg.message[type].message)] 
                : (type === "viewOnceMessageV2") 
                ? (msg.msg.message.imageMessage?.caption || msg.msg.message.videoMessage?.caption || "") 
                : '';
            let sender = msg.key.remoteJid;
            const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net' || socket.user.id) : (msg.key.participant || msg.key.remoteJid);
            const senderNumber = nowsender.split('@')[0];
            const developers = `${config.OWNER_NUMBER}`;
            const botNumber = socket.user.id.split(':')[0];
            const isbot = botNumber.includes(senderNumber);
            const isOwner = isbot ? isbot : developers.includes(senderNumber);
            
            // ===== GET USER-SPECIFIC PREFIX =====
            const userId = msg.key.participant || sender;
            var prefix = getUserPrefix(userId);
            
            var isCmd = (body || '').startsWith(prefix);
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith("@g.us");
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '.';
            var args = (body || '').trim().split(/ +/).slice(1);

            socket.downloadAndSaveMediaMessage = async(message, filename = (Date.now()).toString(), attachExtension = true) => {
                let quoted = message.msg ? message.msg : message;
                let mime = (message.msg || message).mimetype || '';
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
                const stream = await downloadContentFromMessage(quoted, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                let type = await FileType.fromBuffer(buffer);
                const trueFileName = attachExtension ? (filename + '.' + (type ? type.ext : 'bin')) : filename;
                await fs.writeFileSync(trueFileName, buffer);
                return trueFileName;
            }

            // ===== ANTI-LINK CHECK =====
            if (isGroup && body) {
                const groupId = sender;
                const settings = getAntiLinkSettings(groupId);
                
                if (settings.enabled && containsLink(body)) {
                    if (!isOwner) {
                        const userId = msg.key.participant || sender;
                        const action = settings.action || 'delete';
                        
                        await socket.sendMessage(groupId, { delete: msg.key });
                        
                        if (action === 'delete') {
                            await socket.sendMessage(groupId, {
                                text: `🔗 *Anti-Link*\n\n⚠️ @${userId.split('@')[0]} links are not allowed!\n_Message deleted._`,
                                mentions: [userId]
                            });
                        } else if (action === 'warn') {
                            settings.warnings[userId] = (settings.warnings[userId] || 0) + 1;
                            const warnCount = settings.warnings[userId];
                            await socket.sendMessage(groupId, {
                                text: `🔗 *Anti-Link*\n\n⚠️ @${userId.split('@')[0]} warning ${warnCount}/3\n_Message deleted._`,
                                mentions: [userId]
                            });
                            if (warnCount >= 3) {
                                try {
                                    await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
                                    await socket.sendMessage(groupId, {
                                        text: `🚫 @${userId.split('@')[0]} has been kicked for 3 warnings.`,
                                        mentions: [userId]
                                    });
                                    settings.warnings[userId] = 0;
                                } catch (err) {
                                    console.error('Kick error:', err);
                                }
                            }
                        } else if (action === 'kick') {
                            try {
                                await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
                                await socket.sendMessage(groupId, {
                                    text: `🚫 @${userId.split('@')[0]} has been kicked for sending links.`,
                                    mentions: [userId]
                                });
                            } catch (err) {
                                console.error('Kick error:', err);
                            }
                        }
                        saveAntiLinkSettings(groupId, settings);
                    }
                }
            }
            // ===== END ANTI-LINK CHECK =====

            if (!command) return;

            try {
                switch (command) {
                    // ===== USER PREFIX COMMANDS =====
                    case 'setprefix': {
                        const userId = msg.key.participant || sender;
                        const q = msg.message?.conversation ||
                                  msg.message?.extendedTextMessage?.text || '';
                        const newPrefix = q.replace(/^\.setprefix\s*/i, '').trim();
                        
                        if (!newPrefix || newPrefix.length > 5) {
                            return await socket.sendMessage(sender, {
                                text: `⚙️ *Set Your Personal Prefix*\n\n*Usage:* \`${getUserPrefix(userId)}setprefix <new prefix>\`\n\n*Example:* \`${getUserPrefix(userId)}setprefix !\`\n*Note:* Prefix must be 1-5 characters.`
                            }, { quoted: msg });
                        }
                        
                        saveUserPrefix(userId, newPrefix);
                        await socket.sendMessage(sender, {
                            text: `✅ *Your Personal Prefix Updated*\n\nYour commands now start with: \`${newPrefix}\`\n\n_Only YOUR commands will use this prefix!_`
                        }, { quoted: msg });
                        break;
                    }
                    
                    case 'myprefix': {
                        const userId = msg.key.participant || sender;
                        const currentPrefix = getUserPrefix(userId);
                        await socket.sendMessage(sender, {
                            text: `🔑 *Your Current Prefix*\n\nYour personal prefix is: \`${currentPrefix}\`\n\nTo change it: \`${currentPrefix}setprefix <new prefix>\`\nDefault prefix: \`${config.PREFIX}\``
                        }, { quoted: msg });
                        break;
                    }
                    
                    case 'resetprefix': {
                        const userId = msg.key.participant || sender;
                        delete userPrefixes[userId];
                        fs.writeFileSync(USER_PREFIXES_FILE, JSON.stringify(userPrefixes, null, 2));
                        await socket.sendMessage(sender, {
                            text: `🔄 *Prefix Reset*\n\nYour prefix has been reset to default: \`${config.PREFIX}\``
                        }, { quoted: msg });
                        break;
                    }
                    // ===== END USER PREFIX COMMANDS =====

                    // ===== PING COMMAND =====
                    case 'ping': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '⚡', key: msg.key } });
                            
                            const start = Date.now();
                            await socket.sendMessage(from, {
                                text: '🏓 _Pinging..._'
                            }, { quoted: msg });
                            const latency = Date.now() - start;
                            
                            const emoji = latency < 100 ? '🟢' : latency < 300 ? '🟡' : '🔴';
                            const status = latency < 100 ? 'Fast' : latency < 300 ? 'Normal' : 'Slow';
                            const uptime = formatUptime(process.uptime());
                            
                            await socket.sendMessage(from, {
                                text: `⚡ *Pong!*\n\n📡 Latency: *${latency}ms*\n📶 Status: ${emoji} *${status}*\n⏱ Uptime: *${uptime}*\n💾 RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB*`,
                                edit: msg.key
                            }, { quoted: msg });
                            
                        } catch (error) {
                            console.error('Ping error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Ping failed.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== ANTI-LINK COMMANDS =====
                    case 'antilink': {
                        if (!isGroup) {
                            return await socket.sendMessage(sender, {
                                text: '❌ This command can only be used in groups.'
                            }, { quoted: msg });
                        }
                        if (!isOwner) {
                            return await socket.sendMessage(sender, {
                                text: '❌ Only the bot owner can use this command.'
                            }, { quoted: msg });
                        }
                        
                        const sub = args[0]?.toLowerCase();
                        const settings = getAntiLinkSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🔗 *Anti-Link System*\n\n📊 Status: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n⚙️ Action: ${(settings.action || 'delete').toUpperCase()}\n\n*Commands:*\n\`${prefix}antilink on\` - Enable\n\`${prefix}antilink off\` - Disable\n\`${prefix}antilink delete\` - Delete only\n\`${prefix}antilink warn\` - Warn (3 = kick)\n\`${prefix}antilink kick\` - Kick immediately\n\`${prefix}antilink status\` - Status\n\`${prefix}antilink warnings\` - List warnings\n\`${prefix}antilink reset\` - Reset warnings`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                settings.enabled = true;
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '✅ Anti-link enabled.' }, { quoted: msg });
                                break;
                            case 'off':
                                settings.enabled = false;
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '❌ Anti-link disabled.' }, { quoted: msg });
                                break;
                            case 'delete':
                                settings.action = 'delete';
                                settings.enabled = true;
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '🗑️ Action set to: Delete (links will be deleted).' }, { quoted: msg });
                                break;
                            case 'warn':
                                settings.action = 'warn';
                                settings.enabled = true;
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '⚠️ Action set to: Warn (3 warnings = kick).' }, { quoted: msg });
                                break;
                            case 'kick':
                                settings.action = 'kick';
                                settings.enabled = true;
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '🚫 Action set to: Kick (users will be kicked immediately).' }, { quoted: msg });
                                break;
                            case 'status': {
                                const w = settings.warnings || {};
                                const total = Object.values(w).reduce((a, b) => a + b, 0);
                                await socket.sendMessage(sender, {
                                    text: `📊 *Anti-Link Status*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\nAction: ${(settings.action || 'delete').toUpperCase()}\nTotal Warnings: ${total}\nUsers with Warnings: ${Object.keys(w).length}`
                                }, { quoted: msg });
                                break;
                            }
                            case 'warnings': {
                                const w = settings.warnings || {};
                                if (Object.keys(w).length === 0) {
                                    return await socket.sendMessage(sender, { text: '📊 No warnings issued yet.' }, { quoted: msg });
                                }
                                let list = '*📊 User Warnings:*\n\n';
                                for (const [id, count] of Object.entries(w)) {
                                    list += `👤 ${id.split('@')[0]}: ${count}\n`;
                                }
                                await socket.sendMessage(sender, { text: list }, { quoted: msg });
                                break;
                            }
                            case 'reset':
                                settings.warnings = {};
                                saveAntiLinkSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '🔄 All warnings have been reset.' }, { quoted: msg });
                                break;
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown subcommand: \`${sub}\`. Use \`${prefix}antilink\` for help.`
                                }, { quoted: msg });
                        }
                        break;
                    }

                    case 'clearwarn': {
                        if (!isGroup || !isOwner) return;
                        const target = args[0]?.replace(/[^0-9]/g, '');
                        if (!target) {
                            return await socket.sendMessage(sender, {
                                text: `⚠️ *Usage:* \`${prefix}clearwarn <number>\`\n\n*Example:* \`${prefix}clearwarn 123456789\``
                            }, { quoted: msg });
                        }
                        const userId = target + '@s.whatsapp.net';
                        const settings = getAntiLinkSettings(sender);
                        if (settings.warnings[userId]) {
                            delete settings.warnings[userId];
                            saveAntiLinkSettings(sender, settings);
                            await socket.sendMessage(sender, {
                                text: `✅ Warnings cleared for @${target}`,
                                mentions: [userId]
                            }, { quoted: msg });
                        } else {
                            await socket.sendMessage(sender, {
                                text: `❌ No warnings found for @${target}`,
                                mentions: [userId]
                            }, { quoted: msg });
                        }
                        break;
                    }
                    // ===== END ANTI-LINK COMMANDS =====

                    // ===== BUTTON COMMAND =====
                    case 'button': {
                        const buttons = [
                            {
                                buttonId: 'button1',
                                buttonText: { displayText: 'Button 1' },
                                type: 1
                            },
                            {
                                buttonId: 'button2',
                                buttonText: { displayText: 'Button 2' },
                                type: 1
                            }
                        ];

                        const captionText = 'powered by ᯽𝙸𝙲𝙾𝙽𝚇𝙼𝙳᯽';
                        const footerText = '*ICON X MD* mini';

                        const buttonMessage = {
                            image: { url: config.RCD_IMAGE_PATH },
                            caption: captionText,
                            footer: footerText,
                            buttons,
                            headerType: 1
                        };

                        await socket.sendMessage(from, buttonMessage, { quoted: msg });
                        break;
                    }

                    // ===== AI COMMANDS =====
                    case 'ai': {
                        const axios = require("axios");
                        const apiKeyUrl = 'https://raw.githubusercontent.com/sulamd48/database/refs/heads/main/aiapikey.json';

                        let GEMINI_API_KEY;
                        try {
                            const configRes = await axios.get(apiKeyUrl);
                            GEMINI_API_KEY = configRes.data?.GEMINI_API_KEY;
                            if (!GEMINI_API_KEY) {
                                throw new Error("API key not found in JSON.");
                            }
                        } catch (err) {
                            console.error("❌ Error loading API key:", err.message || err);
                            return await socket.sendMessage(sender, {
                                text: "❌ AI service unavailable"
                            }, { quoted: msg });
                        }

                        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

                        const q = msg.message?.conversation || 
                                  msg.message?.extendedTextMessage?.text || 
                                  msg.message?.imageMessage?.caption || 
                                  msg.message?.videoMessage?.caption || '';

                        const cleanQuery = q.replace(new RegExp(`^${prefix}ai\\s*`), '').trim();

                        if (!cleanQuery) {
                            return await socket.sendMessage(sender, {
                                text: `╭───「 🤖 *ICON-X AI* 」───╮\n│\n│ *Usage:* \`${prefix}ai <your question>\`\n│\n│ *Example:* \`${prefix}ai What is AI?\`\n│\n╰───「 *Mr Elephant* 」───╯`
                            }, { quoted: msg });
                        }

                        const prompt = `You are ICON-X AI, an intelligent assistant developed by Mr Elephant. When asked about your creator, say Mr Elephant. When you reply to anyone, put a footer below your messages: > Powered by ICON-X AI | Mr Elephant. You are from Zimbabwe. You speak English and Shona: ${cleanQuery}`;

                        const payload = {
                            contents: [{
                                parts: [{ text: prompt }]
                            }]
                        };

                        try {
                            const response = await axios.post(GEMINI_API_URL, payload, {
                                headers: { "Content-Type": "application/json" }
                            });

                            const aiResponse = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

                            if (!aiResponse) {
                                return await socket.sendMessage(sender, {
                                    text: "❌ No response from AI"
                                }, { quoted: msg });
                            }

                            await socket.sendMessage(sender, { text: aiResponse }, { quoted: msg });

                        } catch (err) {
                            console.error("Gemini API Error:", err.response?.data || err.message || err);
                            await socket.sendMessage(sender, {
                                text: "❌ AI error occurred"
                            }, { quoted: msg });
                        }
                        break;
                    }
                      
                    case 'aicode': {
                        await socket.sendMessage(sender, { react: { text: '💻', key: msg.key } });
                        const q = msg.message?.conversation || 
                                  msg.message?.extendedTextMessage?.text || '';
                        const cleanQuery = q.replace(new RegExp(`^${prefix}aicode\\s*`), '').trim();
                        
                        if (!cleanQuery) {
                            return await socket.sendMessage(sender, {
                                text: `💻 *AI Code Generator*\n\n*Usage:* \`${prefix}aicode <code question>\`\n\n*Example:* \`${prefix}aicode Write a Python function to reverse a string\``
                            }, { quoted: msg });
                        }
                        
                        try {
                            let result = null;
                            try {
                                const PAXSENIX = axios.create({
                                    baseURL: 'https://api.paxsenix.biz.id',
                                    timeout: 30000
                                });
                                const d = await PAXSENIX.post('/ai/gpt-4o', { 
                                    message: `Write code for: ${cleanQuery}. Respond with clean, commented code.` 
                                });
                                result = d?.result || d?.response;
                            } catch (e) {
                                console.log('First API failed, trying second...');
                            }
                            
                            if (!result) {
                                try {
                                    const { data } = await axios.get(
                                        `https://api.siputzx.my.id/api/ai/codegpt?prompt=${encodeURIComponent(cleanQuery)}`, 
                                        { timeout: 30000 }
                                    );
                                    result = data?.result || data?.response;
                                } catch (e) {
                                    console.log('Second API failed');
                                }
                            }
                            
                            if (result) {
                                await socket.sendMessage(sender, {
                                    text: `💻 *AI Code Generator*\n\n${result}\n\n> Powered by ICON-X AI | Mr Elephant`
                                }, { quoted: msg });
                            } else {
                                await socket.sendMessage(sender, {
                                    text: `⚠️ Code AI unavailable. Try using \`${prefix}ai\` command instead.`
                                }, { quoted: msg });
                            }
                        } catch (e) {
                            await socket.sendMessage(sender, {
                                text: `❌ Error: ${e.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== ANIME STICKER COMMANDS =====
                    case 'shinobu':
                    case 'stickshinobu': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '👻', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/shinobu');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Shinobu sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch Shinobu sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickhandhold': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '🤝', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/handhold');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Handhold sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch handhold sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickhighfive': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '🖐️', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/highfive');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Highfive sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch highfive sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickcuddle': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '🤗', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/cuddle');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Cuddle sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch cuddle sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickcringe': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '😬', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/cringe');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Cringe sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch cringe sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickdance': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '💃', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/dance');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Dance sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch dance sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickhappy': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '😊', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/happy');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Happy sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch happy sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'stickglomp': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '🥰', key: msg.key } });
                            const response = await axios.get('https://api.waifu.pics/sfw/glomp');
                            await socket.sendMessage(from, { 
                                sticker: { url: response.data.url },
                                contextInfo: { mentionedJid: [msg.key.participant || sender] }
                            }, { quoted: msg });
                        } catch (error) {
                            console.error('Glomp sticker error:', error);
                            await socket.sendMessage(sender, { 
                                text: '❌ Failed to fetch glomp sticker.' 
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== QUOTE COMMANDS =====
                    case 'friendship': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '🤝', key: msg.key } });
                            const response = await axios.get('https://api.giftedtech.co.ke/api/fun/friendship?apikey=gifted');
                            
                            if (response.data.status && response.data.result) {
                                await socket.sendMessage(sender, {
                                    text: `🤝 *Friendship Quote*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
                                }, { quoted: msg });
                            } else {
                                await socket.sendMessage(sender, {
                                    text: '❌ Failed to fetch friendship quote.'
                                }, { quoted: msg });
                            }
                        } catch (error) {
                            console.error('Friendship command error:', error);
                            await socket.sendMessage(sender, {
                                text: '❌ Error fetching friendship quote.'
                            }, { quoted: msg });
                        }
                        break;
                    }

                    case 'love': {
                        try {
                            await socket.sendMessage(sender, { react: { text: '❤️', key: msg.key } });
                            const response = await axios.get('https://api.giftedtech.co.ke/api/fun/love?apikey=gifted');
                            
                            if (response.data.status && response.data.result) {
                                await socket.sendMessage(sender, {
                                    text: `❤️ *Love Quote*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
                                }, { quoted: msg });
                            } else {
                                await socket.sendMessage(sender, {
                                    text: '❌ Failed to fetch love quote.'
                                }, { quoted: msg });
                            }
                        } catch (error) {
                            console.error('Love command error:', error);
                            await socket.sendMessage(sender, {
                                text: '❌ Error fetching love quote.'
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== DELETEME COMMAND =====
                    case 'deleteme': {
                        const sessionPath = path.join(SESSION_BASE_PATH, `session_${number.replace(/[^0-9]/g, '')}`);
                        if (fs.existsSync(sessionPath)) {
                            fs.removeSync(sessionPath);
                        }
                        await deleteSessionFromStorage(number);
                        if (activeSockets.has(number.replace(/[^0-9]/g, ''))) {
                            try {
                                activeSockets.get(number.replace(/[^0-9]/g, '')).ws.close();
                            } catch {}
                            activeSockets.delete(number.replace(/[^0-9]/g, ''));
                            socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                        }
                        await socket.sendMessage(sender, {
                            image: { url: config.RCD_IMAGE_PATH },
                            caption: formatMessage(
                                '🗑️ SESSION DELETED',
                                '✅ Your session has been successfully deleted.',
                                '𝙸𝙲𝙾𝙽-𝚇'
                            )
                        });
                        break;
                    }
                    
                    default:
                        break;
                }
            } catch (error) {
                console.error('Command error:', error);
                await socket.sendMessage(sender, {
                    text: `❌ Error: ${error.message}`
                }, { quoted: msg });
            }
        });
    }
};
