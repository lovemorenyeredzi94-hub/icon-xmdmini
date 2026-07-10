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

// ===== ANTI-BADWORD SYSTEM =====
const BADWORD_FILE = './badwords.json';
let badwordSettings = {};
try {
    badwordSettings = JSON.parse(fs.readFileSync(BADWORD_FILE));
} catch {
    badwordSettings = {};
}

function getBadwordSettings(groupId) {
    return badwordSettings[groupId] || { enabled: false, words: [], action: 'delete' };
}

function saveBadwordSettings(groupId, settings) {
    badwordSettings[groupId] = settings;
    fs.writeFileSync(BADWORD_FILE, JSON.stringify(badwordSettings, null, 2));
}

function containsBadword(text, words) {
    if (!text || !words || words.length === 0) return false;
    const lowerText = text.toLowerCase();
    return words.some(word => lowerText.includes(word.toLowerCase()));
}
// ===== END ANTI-BADWORD =====

// ===== BOT MODE SYSTEM =====
const MODE_FILE = './botmode.json';
let botMode = {};
try {
    botMode = JSON.parse(fs.readFileSync(MODE_FILE));
} catch {
    botMode = { mode: 'public' };
}

function getBotMode() {
    return botMode.mode || 'public';
}

function setBotMode(mode) {
    botMode.mode = mode;
    fs.writeFileSync(MODE_FILE, JSON.stringify(botMode, null, 2));
}
// ===== END BOT MODE =====

// ===== AUTO TYPING SYSTEM =====
const AUTOTYPING_FILE = './autotyping.json';
let autoTypingSettings = {};
try {
    autoTypingSettings = JSON.parse(fs.readFileSync(AUTOTYPING_FILE));
} catch {
    autoTypingSettings = {};
}

function getAutoTypingSettings(groupId) {
    return autoTypingSettings[groupId] || { enabled: false };
}

function saveAutoTypingSettings(groupId, settings) {
    autoTypingSettings[groupId] = settings;
    fs.writeFileSync(AUTOTYPING_FILE, JSON.stringify(autoTypingSettings, null, 2));
}
// ===== END AUTO TYPING =====

// ===== AUTO RECORDING SYSTEM =====
const AUTORECORDING_FILE = './autorecording.json';
let autoRecordingSettings = {};
try {
    autoRecordingSettings = JSON.parse(fs.readFileSync(AUTORECORDING_FILE));
} catch {
    autoRecordingSettings = {};
}

function getAutoRecordingSettings(groupId) {
    return autoRecordingSettings[groupId] || { enabled: false };
}

function saveAutoRecordingSettings(groupId, settings) {
    autoRecordingSettings[groupId] = settings;
    fs.writeFileSync(AUTORECORDING_FILE, JSON.stringify(autoRecordingSettings, null, 2));
}
// ===== END AUTO RECORDING =====

// ===== ANTI-CALL SYSTEM =====
const ANTICALL_FILE = './anticall.json';
let antiCallSettings = {};
try {
    antiCallSettings = JSON.parse(fs.readFileSync(ANTICALL_FILE));
} catch {
    antiCallSettings = {};
}

function getAntiCallSettings(groupId) {
    return antiCallSettings[groupId] || { enabled: false, action: 'block' };
}

function saveAntiCallSettings(groupId, settings) {
    antiCallSettings[groupId] = settings;
    fs.writeFileSync(ANTICALL_FILE, JSON.stringify(antiCallSettings, null, 2));
}
// ===== END ANTI-CALL =====

// ===== ANTI-DELETE SYSTEM =====
const ANTIDELETE_FILE = './antidelete.json';
let antiDeleteSettings = {};
try {
    antiDeleteSettings = JSON.parse(fs.readFileSync(ANTIDELETE_FILE));
} catch {
    antiDeleteSettings = {};
}

function getAntiDeleteSettings(groupId) {
    return antiDeleteSettings[groupId] || { enabled: false };
}

function saveAntiDeleteSettings(groupId, settings) {
    antiDeleteSettings[groupId] = settings;
    fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify(antiDeleteSettings, null, 2));
}
// ===== END ANTI-DELETE =====

// ===== ANTI-BOT SYSTEM =====
const ANTIBOT_FILE = './antibot.json';
let antiBotSettings = {};
try {
    antiBotSettings = JSON.parse(fs.readFileSync(ANTIBOT_FILE));
} catch {
    antiBotSettings = {};
}

function getAntiBotSettings(groupId) {
    return antiBotSettings[groupId] || { enabled: false, action: 'delete', warnings: {}, botList: [] };
}

function saveAntiBotSettings(groupId, settings) {
    antiBotSettings[groupId] = settings;
    fs.writeFileSync(ANTIBOT_FILE, JSON.stringify(antiBotSettings, null, 2));
}

function isBotMessage(text) {
    if (!text) return false;
    const botKeywords = ['bot', 'ai', 'automated', 'auto-reply', 'spam', 'advert', 'promo', 'click here', 'subscribe', 'follow', 'like', 'share', 'visit'];
    const lower = text.toLowerCase();
    let matches = 0;
    for (const word of botKeywords) {
        if (lower.includes(word)) matches++;
        if (matches >= 2) return true;
    }
    return false;
}
// ===== END ANTI-BOT =====

// ===== ANTI-SPAM SYSTEM =====
const ANTISPAM_FILE = './antispam.json';
let antiSpamSettings = {};
try {
    antiSpamSettings = JSON.parse(fs.readFileSync(ANTISPAM_FILE));
} catch {
    antiSpamSettings = {};
}

function getAntiSpamSettings(groupId) {
    return antiSpamSettings[groupId] || { enabled: false, limit: 5, timeframe: 10, warnings: {} };
}

function saveAntiSpamSettings(groupId, settings) {
    antiSpamSettings[groupId] = settings;
    fs.writeFileSync(ANTISPAM_FILE, JSON.stringify(antiSpamSettings, null, 2));
}
// ===== END ANTI-SPAM =====

// ===== AUTO-REACT SYSTEM =====
const AUTOREACT_FILE = './autoreact.json';
let autoReactSettings = {};
try {
    autoReactSettings = JSON.parse(fs.readFileSync(AUTOREACT_FILE));
} catch {
    autoReactSettings = {};
}

function getAutoReactSettings(chatId) {
    return autoReactSettings[chatId] || { enabled: false };
}

function saveAutoReactSettings(chatId, settings) {
    autoReactSettings[chatId] = settings;
    fs.writeFileSync(AUTOREACT_FILE, JSON.stringify(autoReactSettings, null, 2));
}
// ===== END AUTO-REACT =====

// ===== ANTI-MENTION SYSTEM =====
const ANTIMENTION_FILE = './antimention.json';
let antiMentionSettings = {};
try {
    antiMentionSettings = JSON.parse(fs.readFileSync(ANTIMENTION_FILE));
} catch {
    antiMentionSettings = {};
}

function getAntiMentionSettings(groupId) {
    return antiMentionSettings[groupId] || { enabled: false, action: 'delete', warnings: {} };
}

function saveAntiMentionSettings(groupId, settings) {
    antiMentionSettings[groupId] = settings;
    fs.writeFileSync(ANTIMENTION_FILE, JSON.stringify(antiMentionSettings, null, 2));
}
// ===== END ANTI-MENTION =====

// ===== GROUP STATUS STORAGE =====
const STATUS_FILE = './group_statuses.json';
let groupStatuses = {};
try {
    groupStatuses = JSON.parse(fs.readFileSync(STATUS_FILE));
} catch {
    groupStatuses = {};
}

function saveGroupStatus(groupId, statusData) {
    if (!groupStatuses[groupId]) {
        groupStatuses[groupId] = [];
    }
    groupStatuses[groupId].push(statusData);
    fs.writeFileSync(STATUS_FILE, JSON.stringify(groupStatuses, null, 2));
}
// ===== END GROUP STATUS =====

// ===== REPO COMMAND =====
const REPO_INFO = {
    name: 'ICON-X MD',
    description: 'A powerful WhatsApp bot with advanced features',
    version: '2.0.0',
    author: 'Mr Elephant',
    website: 'https://icon-xmdmini.onrender.com',
    commands: '200+',
    features: [
        'AI Chat (Gemini, GPT-4)',
        'Anti-Link System',
        'Anti-Badword Filter',
        'Anti-Spam Protection',
        'Anti-Call Blocking',
        'Auto-Typing & Recording',
        'Auto-Reaction',
        'Group Status Updates',
        'Download Media (YouTube, TikTok, etc.)',
        'Sticker Maker',
        'And much more!'
    ]
};
// ===== END REPO =====

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

            // ===== ANTI-BADWORD CHECK =====
            if (isGroup && body) {
                const groupId = sender;
                const settings = getBadwordSettings(groupId);
                
                if (settings.enabled && settings.words.length > 0 && containsBadword(body, settings.words)) {
                    if (!isOwner) {
                        const userId = msg.key.participant || sender;
                        const action = settings.action || 'delete';
                        
                        await socket.sendMessage(groupId, { delete: msg.key });
                        
                        await socket.sendMessage(groupId, {
                            text: `🚫 *Anti-Badword*\n\n⚠️ @${userId.split('@')[0]} used inappropriate word!\n_Message deleted._`,
                            mentions: [userId]
                        });
                    }
                }
            }
            // ===== END ANTI-BADWORD CHECK =====

            // ===== ANTI-CALL CHECK =====
            if (isGroup && msg.message?.callMessage) {
                const groupId = sender;
                const settings = getAntiCallSettings(groupId);
                
                if (settings.enabled) {
                    const caller = msg.key.participant || sender;
                    await socket.sendMessage(groupId, {
                        text: `📞 *Anti-Call*\n\n⚠️ @${caller.split('@')[0]} calls are not allowed in this group!`,
                        mentions: [caller]
                    });
                    
                    if (settings.action === 'block') {
                        try {
                            await socket.groupParticipantsUpdate(groupId, [caller], 'remove');
                            await socket.sendMessage(groupId, {
                                text: `🚫 @${caller.split('@')[0]} has been kicked for making a call.`,
                                mentions: [caller]
                            });
                        } catch (err) {
                            console.error('Kick error:', err);
                        }
                    }
                }
            }
            // ===== END ANTI-CALL CHECK =====

            // ===== ANTI-DELETE CHECK =====
            if (msg.message?.protocolMessage?.type === 'revoke') {
                const chatId = sender;
                const settings = getAntiDeleteSettings(chatId);
                
                if (settings.enabled) {
                    try {
                        const deletedMsg = msg.message.protocolMessage.key;
                        const deletedSender = deletedMsg.participant || deletedMsg.remoteJid;
                        
                        let deletedText = 'a message';
                        if (deletedMsg.message) {
                            const msgType = getContentType(deletedMsg.message);
                            if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
                                deletedText = `"${deletedMsg.message[msgType]?.text || deletedMsg.message[msgType] || 'message'}"`;
                            } else if (msgType === 'imageMessage') {
                                deletedText = 'an image 🖼️';
                            } else if (msgType === 'videoMessage') {
                                deletedText = 'a video 🎬';
                            } else if (msgType === 'audioMessage') {
                                deletedText = 'an audio 🎵';
                            } else if (msgType === 'stickerMessage') {
                                deletedText = 'a sticker 🎨';
                            } else {
                                deletedText = 'a message';
                            }
                        }
                        
                        const chatType = isGroup ? 'group' : 'private chat';
                        
                        await socket.sendMessage(chatId, {
                            text: `🗑️ *Anti-Delete*\n\n👤 @${deletedSender?.split('@')[0] || 'Someone'} deleted ${deletedText}\n\n📌 Chat: ${chatType}`,
                            mentions: [deletedSender].filter(Boolean)
                        });
                    } catch (err) {
                        console.error('Anti-Delete error:', err);
                    }
                }
            }
            // ===== END ANTI-DELETE CHECK =====

            // ===== ANTI-BOT CHECK =====
            if (isGroup && body) {
                const groupId = sender;
                const settings = getAntiBotSettings(groupId);
                
                if (settings.enabled) {
                    const userId = msg.key.participant || sender;
                    if (!isOwner) {
                        let isBot = isBotMessage(body);
                        
                        if (isBot) {
                            const action = settings.action || 'delete';
                            await socket.sendMessage(groupId, { delete: msg.key });
                            
                            if (action === 'delete') {
                                await socket.sendMessage(groupId, {
                                    text: `🤖 *Anti-Bot*\n\n⚠️ @${userId.split('@')[0]} bot-like message detected!\n_Message deleted._`,
                                    mentions: [userId]
                                });
                            } else if (action === 'kick') {
                                try {
                                    await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
                                    await socket.sendMessage(groupId, {
                                        text: `🚫 @${userId.split('@')[0]} kicked for bot-like activity.`,
                                        mentions: [userId]
                                    });
                                } catch (err) {
                                    console.error('Kick error:', err);
                                }
                            }
                        }
                    }
                }
            }
            // ===== END ANTI-BOT CHECK =====

            // ===== ANTI-SPAM CHECK =====
            if (isGroup && body) {
                const groupId = sender;
                const settings = getAntiSpamSettings(groupId);
                
                if (settings.enabled) {
                    const userId = msg.key.participant || sender;
                    if (!isOwner) {
                        // Simple spam detection - you can expand this
                        if (body.length < 5 && args.length < 2) {
                            // Short messages might be spam
                            const warnCount = (settings.warnings[userId] || 0) + 1;
                            settings.warnings[userId] = warnCount;
                            saveAntiSpamSettings(groupId, settings);
                            
                            if (warnCount >= 5) {
                                try {
                                    await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
                                    await socket.sendMessage(groupId, {
                                        text: `🚫 @${userId.split('@')[0]} kicked for spamming.`,
                                        mentions: [userId]
                                    });
                                    settings.warnings[userId] = 0;
                                    saveAntiSpamSettings(groupId, settings);
                                } catch (err) {
                                    console.error('Kick error:', err);
                                }
                            }
                        }
                    }
                }
            }
            // ===== END ANTI-SPAM CHECK =====

            // ===== AUTO-TYPING =====
            if (isGroup && body && body.startsWith(prefix)) {
                const groupId = sender;
                const settings = getAutoTypingSettings(groupId);
                
                if (settings.enabled) {
                    await socket.sendPresenceUpdate('composing', groupId);
                }
            }
            // ===== END AUTO-TYPING =====

            // ===== AUTO-RECORDING =====
            if (isGroup && body && body.startsWith(prefix)) {
                const groupId = sender;
                const settings = getAutoRecordingSettings(groupId);
                
                if (settings.enabled) {
                    await socket.sendPresenceUpdate('recording', groupId);
                }
            }
            // ===== END AUTO-RECORDING =====

// ===== AUTO-REACT WITH RANDOM EMOJIS (Works in Groups & Private Chats) =====
if (body) {
    const chatId = sender;
    const settings = getAutoReactSettings(chatId);
    
    if (settings.enabled) {
        try {
            // Random emoji list
            const emojis = [
                '❤️', '🔥', '😀', '👍', '👩‍💻', '🎉', '⭐', '💯', '✨', '🌟',
                '💪', '👏', '🥳', '😍', '🤩', '😎', '🤗', '😊', '🙌', '💖',
                '🎊', '🌈', '⚡', '💫', '🎈', '🎁', '💝', '🎀', '💕'
            ];
            
            // Pick random emoji
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            await socket.sendMessage(chatId, {
                react: {
                    text: randomEmoji,
                    key: msg.key
                }
            });
        } catch (err) {
            console.error('Auto-react error:', err);
        }
    }
}
// ===== END AUTO-REACT =====

// ===== ANTI-MENTION CHECK =====
if (isGroup && body) {
    const groupId = sender;
    const settings = getAntiMentionSettings(groupId);
    
    if (settings.enabled) {
        // Check if message contains mentions
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedMention = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        let hasMention = false;
        
        // Check if there are any mentions
        if (mentionedJid && mentionedJid.length > 0) {
            hasMention = true;
        } else if (quotedMention) {
            hasMention = true;
        }
        
        if (hasMention && !isOwner) {
            const userId = msg.key.participant || sender;
            const action = settings.action || 'delete';
            
            // Delete the message
            await socket.sendMessage(groupId, { delete: msg.key });
            
            if (action === 'delete') {
                await socket.sendMessage(groupId, {
                    text: `🔇 *Anti-Mention*\n\n⚠️ @${userId.split('@')[0]} mentions are not allowed!\n_Message deleted._`,
                    mentions: [userId]
                });
            } else if (action === 'warn') {
                settings.warnings[userId] = (settings.warnings[userId] || 0) + 1;
                const warnCount = settings.warnings[userId];
                await socket.sendMessage(groupId, {
                    text: `🔇 *Anti-Mention*\n\n⚠️ @${userId.split('@')[0]} warning ${warnCount}/3\n_Message deleted._`,
                    mentions: [userId]
                });
                if (warnCount >= 3) {
                    try {
                        await socket.groupParticipantsUpdate(groupId, [userId], 'remove');
                        await socket.sendMessage(groupId, {
                            text: `🚫 @${userId.split('@')[0]} has been kicked for 3 mention warnings.`,
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
                        text: `🚫 @${userId.split('@')[0]} has been kicked for mentioning.`,
                        mentions: [userId]
                    });
                } catch (err) {
                    console.error('Kick error:', err);
                }
            }
            saveAntiMentionSettings(groupId, settings);
        }
    }
}
// ===== END ANTI-MENTION CHECK =====

            // ===== WELCOME EVENT HANDLER =====
            if (isGroup && msg.message?.groupParticipantUpdate) {
                const groupId = sender;
                const participants = msg.message.groupParticipantUpdate;
                const action = participants.action;
                const participantsList = participants.participants || [];
                
                // Load welcome settings
                const WELCOME_FILE = './welcome.json';
                let welcomeSettings = {};
                try {
                    welcomeSettings = JSON.parse(fs.readFileSync(WELCOME_FILE));
                } catch {
                    welcomeSettings = {};
                }
                
                // Load goodbye settings
                const GOODBYE_FILE = './goodbye.json';
                let goodbyeSettings = {};
                try {
                    goodbyeSettings = JSON.parse(fs.readFileSync(GOODBYE_FILE));
                } catch {
                    goodbyeSettings = {};
                }
                
                const groupMeta = await socket.groupMetadata(groupId);
                const groupName = groupMeta.subject || 'Group';
                const memberCount = groupMeta.participants.length;
                
                // Handle new members (welcome)
                if (action === 'add') {
                    const welcomeConfig = welcomeSettings[groupId];
                    if (welcomeConfig && welcomeConfig.enabled) {
                        for (const participant of participantsList) {
                            // Skip if it's the bot joining
                            if (participant === socket.user.id) continue;
                            
                            const userNumber = participant.split('@')[0];
                            const userName = userNumber;
                            
                            let welcomeMsg = welcomeConfig.message || 
                                `👋 *Welcome to ${groupName}*\n\n@user\nWelcome to the group! 🎉\n\nWe now have @count members.\n\n_Please read the group rules and enjoy!_`;
                            
                            // Replace placeholders
                            welcomeMsg = welcomeMsg
                                .replace(/@user/g, `@${userNumber}`)
                                .replace(/@name/g, userName)
                                .replace(/@group/g, groupName)
                                .replace(/@count/g, memberCount);
                            
                            await socket.sendMessage(groupId, {
                                text: welcomeMsg,
                                mentions: [participant]
                            });
                        }
                    }
                }
                
                // Handle removed members (goodbye)
                if (action === 'remove') {
                    const goodbyeConfig = goodbyeSettings[groupId];
                    if (goodbyeConfig && goodbyeConfig.enabled) {
                        for (const participant of participantsList) {
                            // Skip if it's the bot leaving
                            if (participant === socket.user.id) continue;
                            
                            const userNumber = participant.split('@')[0];
                            const userName = userNumber;
                            
                            let goodbyeMsg = goodbyeConfig.message || 
                                `👋 *Goodbye from ${groupName}*\n\n@user has left the group.\n\nWe now have @count members remaining.\n\n_You will be missed!_`;
                            
                            // Replace placeholders
                            goodbyeMsg = goodbyeMsg
                                .replace(/@user/g, `@${userNumber}`)
                                .replace(/@name/g, userName)
                                .replace(/@group/g, groupName)
                                .replace(/@count/g, memberCount);
                            
                            await socket.sendMessage(groupId, {
                                text: goodbyeMsg,
                                mentions: [participant]
                            });
                        }
                    }
                }
            }
            // ===== END WELCOME EVENT =====

            if (!command) return;

            try {
                switch (command) {
                                    // ===== BUTTON COMMAND =====
                    case 'button': {
                        const buttons = [
                            { buttonId: 'button1', buttonText: { displayText: 'Button 1' }, type: 1 },
                            { buttonId: 'button2', buttonText: { displayText: 'Button 2' }, type: 1 }
                        ];
                        const buttonMessage = {
                            image: { url: config.RCD_IMAGE_PATH },
                            caption: 'powered by ᯽𝙸𝙲𝙾𝙽𝚇𝙼𝙳᯽',
                            footer: '*ICON X MD* mini',
                            buttons,
                            headerType: 1
                        };
                        await socket.sendMessage(from, buttonMessage, { quoted: msg });
                        break;
                    }

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
                            await socket.sendMessage(from, { text: '🏓 _Pinging..._' }, { quoted: msg });
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
                            await socket.sendMessage(sender, { text: '❌ Ping failed.' }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 1. ANTI-BADWORD COMMAND =====
                    case 'antibadword': {
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
                        const settings = getBadwordSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🚫 *Anti-Badword System*\n\n📊 Status: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n📝 Badwords: ${settings.words.length > 0 ? settings.words.join(', ') : 'None'}\n⚙️ Action: ${(settings.action || 'delete').toUpperCase()}\n\n*Commands:*\n\`${prefix}antibadword on\` - Enable\n\`${prefix}antibadword off\` - Disable\n\`${prefix}antibadword add <word>\` - Add badword\n\`${prefix}antibadword remove <word>\` - Remove badword\n\`${prefix}antibadword list\` - List badwords\n\`${prefix}antibadword clear\` - Clear all badwords`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                settings.enabled = true;
                                saveBadwordSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '✅ Anti-badword enabled.' }, { quoted: msg });
                                break;
                            case 'off':
                                settings.enabled = false;
                                saveBadwordSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '❌ Anti-badword disabled.' }, { quoted: msg });
                                break;
                            case 'add': {
                                const word = args.slice(1).join(' ');
                                if (!word) {
                                    return await socket.sendMessage(sender, {
                                        text: `⚠️ *Usage:* \`${prefix}antibadword add <word>\``
                                    }, { quoted: msg });
                                }
                                if (!settings.words.includes(word)) {
                                    settings.words.push(word);
                                    saveBadwordSettings(sender, settings);
                                    await socket.sendMessage(sender, {
                                        text: `✅ Added badword: \`${word}\``
                                    }, { quoted: msg });
                                } else {
                                    await socket.sendMessage(sender, {
                                        text: `⚠️ Badword \`${word}\` already exists.`
                                    }, { quoted: msg });
                                }
                                break;
                            }
                            case 'remove': {
                                const word = args.slice(1).join(' ');
                                if (!word) {
                                    return await socket.sendMessage(sender, {
                                        text: `⚠️ *Usage:* \`${prefix}antibadword remove <word>\``
                                    }, { quoted: msg });
                                }
                                const index = settings.words.indexOf(word);
                                if (index > -1) {
                                    settings.words.splice(index, 1);
                                    saveBadwordSettings(sender, settings);
                                    await socket.sendMessage(sender, {
                                        text: `✅ Removed badword: \`${word}\``
                                    }, { quoted: msg });
                                } else {
                                    await socket.sendMessage(sender, {
                                        text: `⚠️ Badword \`${word}\` not found.`
                                    }, { quoted: msg });
                                }
                                break;
                            }
                            case 'list': {
                                const words = settings.words;
                                if (words.length === 0) {
                                    return await socket.sendMessage(sender, {
                                        text: '📝 No badwords added yet.'
                                    }, { quoted: msg });
                                }
                                let list = '*📝 Badwords List:*\n\n';
                                words.forEach((word, i) => {
                                    list += `${i + 1}. \`${word}\`\n`;
                                });
                                await socket.sendMessage(sender, {
                                    text: list
                                }, { quoted: msg });
                                break;
                            }
                            case 'clear':
                                settings.words = [];
                                saveBadwordSettings(sender, settings);
                                await socket.sendMessage(sender, {
                                    text: '🗑️ All badwords have been cleared.'
                                }, { quoted: msg });
                                break;
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown subcommand: \`${sub}\``
                                }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 2. MODE COMMAND =====
                    case 'mode': {
                        if (!isOwner) {
                            return await socket.sendMessage(sender, {
                                text: '❌ Only the bot owner can use this command.'
                            }, { quoted: msg });
                        }
                        
                        const mode = args[0]?.toLowerCase();
                        
                        if (!mode || !['public', 'private'].includes(mode)) {
                            const currentMode = getBotMode();
                            return await socket.sendMessage(sender, {
                                text: `⚙️ *Bot Mode*\n\nCurrent Mode: *${currentMode.toUpperCase()}*\n\n*Usage:* \`${prefix}mode <public|private>\`\n\n*Public:* Anyone can use commands\n*Private:* Only owner can use commands`
                            }, { quoted: msg });
                        }
                        
                        setBotMode(mode);
                        await socket.sendMessage(sender, {
                            text: `✅ Bot mode set to: *${mode.toUpperCase()}*`
                        }, { quoted: msg });
                        break;
                    }

                    // ===== 3. AUTO-TYPING COMMAND =====
                    case 'autotyping': {
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
                        const settings = getAutoTypingSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `⌨️ *Auto-Typing*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*Usage:* \`${prefix}autotyping on/off\``
                            }, { quoted: msg });
                        }
                        
                        if (sub === 'on') {
                            settings.enabled = true;
                            saveAutoTypingSettings(sender, settings);
                            await socket.sendMessage(sender, {
                                text: '✅ Auto-typing enabled.'
                            }, { quoted: msg });
                        } else if (sub === 'off') {
                            settings.enabled = false;
                            saveAutoTypingSettings(sender, settings);
                            await socket.sendMessage(sender, {
                                text: '❌ Auto-typing disabled.'
                            }, { quoted: msg });
                        } else {
                            await socket.sendMessage(sender, {
                                text: `❌ Unknown: \`${sub}\``
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 4. AUTO-RECORDING COMMAND =====
                    case 'autorecording': {
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
                        const settings = getAutoRecordingSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🎙️ *Auto-Recording*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*Usage:* \`${prefix}autorecording on/off\``
                            }, { quoted: msg });
                        }
                        
                        if (sub === 'on') {
                            settings.enabled = true;
                            saveAutoRecordingSettings(sender, settings);
                            await socket.sendMessage(sender, {
                                text: '✅ Auto-recording enabled.'
                            }, { quoted: msg });
                        } else if (sub === 'off') {
                            settings.enabled = false;
                            saveAutoRecordingSettings(sender, settings);
                            await socket.sendMessage(sender, {
                                text: '❌ Auto-recording disabled.'
                            }, { quoted: msg });
                        } else {
                            await socket.sendMessage(sender, {
                                text: `❌ Unknown: \`${sub}\``
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 5. ANTI-CALL COMMAND =====
                    case 'anticall': {
                        if (!isOwner) {
                            return await socket.sendMessage(sender, {
                                text: '❌ Only the bot owner can use this command.'
                            }, { quoted: msg });
                        }
                        
                        const sub = args[0]?.toLowerCase();
                        const chatId = sender;
                        const settings = getAntiCallSettings(chatId);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `📞 *Anti-Call System*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\nAction: ${(settings.action || 'block').toUpperCase()}\n\n*Usage:*\n\`${prefix}anticall on\` - Enable\n\`${prefix}anticall off\` - Disable\n\`${prefix}anticall block\` - Block & kick caller`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                settings.enabled = true;
                                saveAntiCallSettings(chatId, settings);
                                await socket.sendMessage(sender, { text: '✅ Anti-call enabled.' }, { quoted: msg });
                                break;
                            case 'off':
                                settings.enabled = false;
                                saveAntiCallSettings(chatId, settings);
                                await socket.sendMessage(sender, { text: '❌ Anti-call disabled.' }, { quoted: msg });
                                break;
                            case 'block':
                                settings.action = 'block';
                                settings.enabled = true;
                                saveAntiCallSettings(chatId, settings);
                                await socket.sendMessage(sender, { text: '🚫 Anti-call set to block.' }, { quoted: msg });
                                break;
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown: \`${sub}\``
                                }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 6. ANTI-DELETE COMMAND =====
                    case 'antidelete': {
                        if (!isOwner) {
                            return await socket.sendMessage(sender, {
                                text: '❌ Only the bot owner can use this command.'
                            }, { quoted: msg });
                        }
                        
                        const sub = args[0]?.toLowerCase();
                        const chatId = sender;
                        const settings = getAntiDeleteSettings(chatId);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🗑️ *Anti-Delete System*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*Usage:* \`${prefix}antidelete on/off\``
                            }, { quoted: msg });
                        }
                        
                        if (sub === 'on') {
                            settings.enabled = true;
                            saveAntiDeleteSettings(chatId, settings);
                            await socket.sendMessage(sender, { text: '✅ Anti-delete enabled for this chat.' }, { quoted: msg });
                        } else if (sub === 'off') {
                            settings.enabled = false;
                            saveAntiDeleteSettings(chatId, settings);
                            await socket.sendMessage(sender, { text: '❌ Anti-delete disabled for this chat.' }, { quoted: msg });
                        } else {
                            await socket.sendMessage(sender, {
                                text: `❌ Unknown: \`${sub}\``
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 7. ANTI-BOT COMMAND =====
                    case 'antibot': {
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
                        const settings = getAntiBotSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🤖 *Anti-Bot System*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\nAction: ${(settings.action || 'delete').toUpperCase()}\n\n*Commands:*\n\`${prefix}antibot on\` - Enable\n\`${prefix}antibot off\` - Disable\n\`${prefix}antibot delete\` - Delete messages\n\`${prefix}antibot kick\` - Kick bots\n\`${prefix}antibot status\` - Status`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                settings.enabled = true;
                                saveAntiBotSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '✅ Anti-bot enabled.' }, { quoted: msg });
                                break;
                            case 'off':
                                settings.enabled = false;
                                saveAntiBotSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '❌ Anti-bot disabled.' }, { quoted: msg });
                                break;
                            case 'delete':
                                settings.action = 'delete';
                                settings.enabled = true;
                                saveAntiBotSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '🗑️ Anti-bot set to delete.' }, { quoted: msg });
                                break;
                            case 'kick':
                                settings.action = 'kick';
                                settings.enabled = true;
                                saveAntiBotSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '🚫 Anti-bot set to kick.' }, { quoted: msg });
                                break;
                            case 'status': {
                                const w = settings.warnings || {};
                                const total = Object.values(w).reduce((a, b) => a + b, 0);
                                await socket.sendMessage(sender, {
                                    text: `📊 *Anti-Bot Status*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\nAction: ${(settings.action || 'delete').toUpperCase()}\nTotal Warnings: ${total}`
                                }, { quoted: msg });
                                break;
                            }
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown: \`${sub}\``
                                }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 8. ANTI-SPAM COMMAND =====
                    case 'antispam': {
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
                        const settings = getAntiSpamSettings(sender);
                        
                        if (!sub) {
                            return await socket.sendMessage(sender, {
                                text: `🛡️ *Anti-Spam System*\n\nStatus: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\nLimit: ${settings.limit || 5} messages\nTimeframe: ${settings.timeframe || 10}s\n\n*Commands:*\n\`${prefix}antispam on\` - Enable\n\`${prefix}antispam off\` - Disable\n\`${prefix}antispam set <limit> <timeframe>\` - Set limit`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                settings.enabled = true;
                                saveAntiSpamSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '✅ Anti-spam enabled.' }, { quoted: msg });
                                break;
                            case 'off':
                                settings.enabled = false;
                                saveAntiSpamSettings(sender, settings);
                                await socket.sendMessage(sender, { text: '❌ Anti-spam disabled.' }, { quoted: msg });
                                break;
                            case 'set': {
                                const limit = parseInt(args[1]);
                                const timeframe = parseInt(args[2]);
                                if (!limit || !timeframe) {
                                    return await socket.sendMessage(sender, {
                                        text: `⚠️ *Usage:* \`${prefix}antispam set <limit> <timeframe>\`\n\nExample: \`${prefix}antispam set 5 10\` (5 messages in 10 seconds)`
                                    }, { quoted: msg });
                                }
                                settings.limit = limit;
                                settings.timeframe = timeframe;
                                saveAntiSpamSettings(sender, settings);
                                await socket.sendMessage(sender, {
                                    text: `✅ Anti-spam limit set to ${limit} messages in ${timeframe} seconds.`
                                }, { quoted: msg });
                                break;
                            }
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown: \`${sub}\``
                                }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 9. GROUP STATUS COMMAND =====
                    case 'gcstatus':
                    case 'gstatus':
                    case 'groupstatus': {
                        try {
                            // Check if in a group
                            if (!isGroup) {
                                return await socket.sendMessage(sender, {
                                    text: '❌ This command can only be used in groups.'
                                }, { quoted: msg });
                            }
                            
                            // Get the status message
                            const q = msg.message?.conversation || 
                                      msg.message?.extendedTextMessage?.text || '';
                            
                            const statusText = q.replace(new RegExp(`^${prefix}gcstatus\\s*`), '')
                                              .replace(new RegExp(`^${prefix}gstatus\\s*`), '')
                                              .replace(new RegExp(`^${prefix}groupstatus\\s*`), '')
                                              .trim();
                            
                            if (!statusText) {
                                return await socket.sendMessage(sender, {
                                    text: `📢 *Group Status*\n\n*Usage:* \`${prefix}gcstatus <your status>\`\n\n*Example:* \`${prefix}gcstatus I'm feeling great today!\``
                                }, { quoted: msg });
                            }
                            
                            // Get sender info
                            const senderName = msg.key.participant ? 
                                (await socket.groupMetadata(sender)).participants.find(p => p.id === msg.key.participant)?.id?.split('@')[0] || 
                                msg.key.participant?.split('@')[0] : 
                                sender.split('@')[0];
                            
                            // Get current date and time
                            const now = new Date();
                            const date = now.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                            const time = now.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
                            
                            // Check if anonymous
                            const isAnonymous = statusText.toLowerCase().includes('anonymous') || 
                                               statusText.toLowerCase().includes('anon');
                            
                            let displayName = senderName;
                            let anonymousText = '';
                            
                            if (isAnonymous) {
                                const cleaned = statusText.replace(/anonymous|anon/i, '').trim();
                                displayName = 'Anonymous 👤';
                                anonymousText = '\n\n_This status is posted anonymously._';
                            }
                            
                            // Save status
                            const statusData = {
                                text: statusText,
                                user: displayName,
                                userId: msg.key.participant || sender,
                                timestamp: Date.now(),
                                isAnonymous: isAnonymous || false
                            };
                            saveGroupStatus(sender, statusData);
                            
                            // Format the status message
                            const statusMessage = 
                                `╭──────────────────────╮\n` +
                                `│  📢 *GROUP STATUS*    │\n` +
                                `├──────────────────────┤\n` +
                                `│                       │\n` +
                                `│  👤 *${displayName}*\n` +
                                `│                       │\n` +
                                `│  📝 ${statusText}\n` +
                                `│                       │\n` +
                                `│  📅 ${date}\n` +
                                `│  ⏰ ${time}\n` +
                                `│                       │\n` +
                                `├──────────────────────┤\n` +
                                `│  💬 React to this     │\n` +
                                `│  status with emojis!  │\n` +
                                `╰──────────────────────╯` +
                                `${anonymousText}\n\n` +
                                `> Powered by ICON-X 🤖`;
                            
                            // Send the status to the group
                            await socket.sendMessage(from, {
                                text: statusMessage,
                                contextInfo: {
                                    mentionedJid: [msg.key.participant || sender]
                                }
                            }, { quoted: msg });
                            
                            // React to confirm
                            await socket.sendMessage(sender, { 
                                react: { text: '✅', key: msg.key } 
                            });
                            
                        } catch (error) {
                            console.error('Group status error:', error);
                            await socket.sendMessage(sender, {
                                text: `❌ Error posting status: ${error.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 10. KICK COMMAND =====
                    case 'kick': {
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
                        
                        const target = args[0]?.replace(/[^0-9]/g, '');
                        if (!target) {
                            return await socket.sendMessage(sender, {
                                text: `⚠️ *Usage:* \`${prefix}kick <number>\`\n\n*Example:* \`${prefix}kick 123456789\``
                            }, { quoted: msg });
                        }
                        
                        const userId = target + '@s.whatsapp.net';
                        try {
                            await socket.groupParticipantsUpdate(sender, [userId], 'remove');
                            await socket.sendMessage(sender, {
                                text: `✅ @${target} has been kicked.`,
                                mentions: [userId]
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to kick: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

// ===== AUTO-REACT COMMAND =====
case 'autoreact': {
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ Only the bot owner can use this command.'
        }, { quoted: msg });
    }
    
    const sub = args[0]?.toLowerCase();
    const chatId = sender;
    const settings = getAutoReactSettings(chatId);
    
    if (!sub || !['on', 'off'].includes(sub)) {
        const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
        const chatType = isGroup ? 'Group' : 'Private Chat';
        return await socket.sendMessage(sender, {
            text: `😊 *Auto-React*\n\n📌 Chat: ${chatType}\n📊 Status: ${status}\n\n*Usage:* \`${prefix}autoreact on/off\``
        }, { quoted: msg });
    }
    
    if (sub === 'on') {
        settings.enabled = true;
        saveAutoReactSettings(chatId, settings);
        await socket.sendMessage(sender, {
            text: '✅ Auto-react enabled with random emojis! 🎲'
        }, { quoted: msg });
    } else if (sub === 'off') {
        settings.enabled = false;
        saveAutoReactSettings(chatId, settings);
        await socket.sendMessage(sender, {
            text: '❌ Auto-react disabled.'
        }, { quoted: msg });
    }
    break;
}
// ===== END AUTO-REACT =====

// ===== ANTI-MENTION COMMAND =====
case 'antimention': {
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
    const settings = getAntiMentionSettings(sender);
    
    if (!sub) {
        return await socket.sendMessage(sender, {
            text: `🔇 *Anti-Mention System*\n\n📊 Status: ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}\n⚙️ Action: ${(settings.action || 'delete').toUpperCase()}\n\n*Commands:*\n\`${prefix}antimention on\` - Enable\n\`${prefix}antimention off\` - Disable\n\`${prefix}antimention delete\` - Delete only\n\`${prefix}antimention warn\` - Warn (3 = kick)\n\`${prefix}antimention kick\` - Kick immediately`
        }, { quoted: msg });
    }
    
    switch (sub) {
        case 'on':
            settings.enabled = true;
            saveAntiMentionSettings(sender, settings);
            await socket.sendMessage(sender, { text: '✅ Anti-mention enabled.' }, { quoted: msg });
            break;
        case 'off':
            settings.enabled = false;
            saveAntiMentionSettings(sender, settings);
            await socket.sendMessage(sender, { text: '❌ Anti-mention disabled.' }, { quoted: msg });
            break;
        case 'delete':
            settings.action = 'delete';
            settings.enabled = true;
            saveAntiMentionSettings(sender, settings);
            await socket.sendMessage(sender, { text: '🗑️ Action set to: Delete.' }, { quoted: msg });
            break;
        case 'warn':
            settings.action = 'warn';
            settings.enabled = true;
            saveAntiMentionSettings(sender, settings);
            await socket.sendMessage(sender, { text: '⚠️ Action set to: Warn (3 = kick).' }, { quoted: msg });
            break;
        case 'kick':
            settings.action = 'kick';
            settings.enabled = true;
            saveAntiMentionSettings(sender, settings);
            await socket.sendMessage(sender, { text: '🚫 Action set to: Kick.' }, { quoted: msg });
            break;
        default:
            await socket.sendMessage(sender, {
                text: `❌ Unknown: \`${sub}\``
            }, { quoted: msg });
    }
    break;
}
// ===== END ANTI-MENTION =====

                    // ===== 12. TAGALL COMMAND =====
                    case 'tagall': {
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
                        
                        const message = args.join(' ') || '📢 Attention everyone!';
                        
                        try {
                            const groupMeta = await socket.groupMetadata(sender);
                            const participants = groupMeta.participants;
                            
                            let mentions = [];
                            let mentionText = '';
                            
                            // Build mention string
                            participants.forEach((p, i) => {
                                const name = p.id.split('@')[0];
                                mentions.push(p.id);
                                mentionText += `@${name} `;
                                if ((i + 1) % 5 === 0) mentionText += '\n';
                            });
                            
                            const tagMessage = 
                                `╭──────────────────────╮\n` +
                                `│  📢 *TAG ALL*         │\n` +
                                `├──────────────────────┤\n` +
                                `│                       │\n` +
                                `│  📝 ${message}\n` +
                                `│                       │\n` +
                                `│  👥 ${participants.length} members\n` +
                                `│                       │\n` +
                                `├──────────────────────┤\n` +
                                `│  ${mentionText}\n` +
                                `╰──────────────────────╯\n\n` +
                                `> Powered by ICON-X 🤖`;
                            
                            await socket.sendMessage(sender, {
                                text: tagMessage,
                                mentions: mentions
                            }, { quoted: msg });
                            
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to tag all: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 13. PROMOTE COMMAND =====
                    case 'promote': {
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
                        
                        const target = args[0]?.replace(/[^0-9]/g, '');
                        if (!target) {
                            return await socket.sendMessage(sender, {
                                text: `⚠️ *Usage:* \`${prefix}promote <number>\`\n\n*Example:* \`${prefix}promote 123456789\``
                            }, { quoted: msg });
                        }
                        
                        const userId = target + '@s.whatsapp.net';
                        try {
                            await socket.groupParticipantsUpdate(sender, [userId], 'promote');
                            await socket.sendMessage(sender, {
                                text: `✅ @${target} has been promoted to admin.`,
                                mentions: [userId]
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to promote: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 14. DEMOTE COMMAND =====
                    case 'demote': {
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
                        
                        const target = args[0]?.replace(/[^0-9]/g, '');
                        if (!target) {
                            return await socket.sendMessage(sender, {
                                text: `⚠️ *Usage:* \`${prefix}demote <number>\`\n\n*Example:* \`${prefix}demote 123456789\``
                            }, { quoted: msg });
                        }
                        
                        const userId = target + '@s.whatsapp.net';
                        try {
                            await socket.groupParticipantsUpdate(sender, [userId], 'demote');
                            await socket.sendMessage(sender, {
                                text: `✅ @${target} has been demoted.`,
                                mentions: [userId]
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to demote: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 15. JID/NEWSLETTER COMMAND =====
                    case 'jid': {
                        try {
                            const jid = msg.key.remoteJid;
                            const isGroupJid = jid.endsWith('@g.us');
                            const isUserJid = jid.endsWith('@s.whatsapp.net');
                            
                            let info = `📱 *JID Information*\n\n`;
                            info += `📌 JID: \`${jid}\`\n`;
                            info += `📌 Type: ${isGroupJid ? '👥 Group' : isUserJid ? '👤 User' : '📬 Newsletter'}\n`;
                            
                            if (isGroupJid) {
                                try {
                                    const groupMeta = await socket.groupMetadata(jid);
                                    info += `📌 Name: ${groupMeta.subject || 'Unknown'}\n`;
                                    info += `📌 Members: ${groupMeta.participants.length}\n`;
                                    info += `📌 Owner: ${groupMeta.owner?.split('@')[0] || 'Unknown'}\n`;
                                    info += `📌 Created: ${new Date(groupMeta.creation * 1000).toLocaleDateString()}\n`;
                                } catch (e) {
                                    info += `📌 Could not fetch group info\n`;
                                }
                            }
                            
                            await socket.sendMessage(sender, {
                                text: info
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Error: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== 16. REPO COMMAND =====
                    case 'repo': {
                        const repoMessage = 
                            `╭──────────────────────╮\n` +
                            `│  📦 *BOT INFO*        │\n` +
                            `├──────────────────────┤\n` +
                            `│                       │\n` +
                            `│  📛 Name: ${REPO_INFO.name}\n` +
                            `│  📝 ${REPO_INFO.description}\n` +
                            `│  📌 Version: ${REPO_INFO.version}\n` +
                            `│  👤 Author: ${REPO_INFO.author}\n` +
                            `│                       │\n` +
                            `│  🌐 Website: ${REPO_INFO.website}\n` +
                            `│  📊 Commands: ${REPO_INFO.commands}\n` +
                            `│                       │\n` +
                            `│  ✨ *Features*         │\n`;
                        
                        let featuresText = repoMessage;
                        REPO_INFO.features.forEach(feature => {
                            featuresText += `│  ✅ ${feature}\n`;
                        });
                        
                        featuresText += 
                            `│                       │\n` +
                            `├──────────────────────┤\n` +
                            `│  💬 Thanks for using  │\n` +
                            `│  ICON-X MD! 🤖        │\n` +
                            `╰──────────────────────╯\n\n` +
                            `> Powered by ${REPO_INFO.author}`;
                        
                        await socket.sendMessage(sender, {
                            text: featuresText
                        }, { quoted: msg });
                        break;
                    }

                    // ===== LEAVE/EXIT COMMAND =====
                    case 'leave':
                    case 'left':
                    case 'leftgc':
                    case 'leavegc': {
                        try {
                            if (!isGroup) {
                                return await socket.sendMessage(sender, {
                                    text: '❗ This command can only be used in *groups*.'
                                }, { quoted: msg });
                            }

                            if (!isOwner) {
                                return await socket.sendMessage(sender, {
                                    text: '❗ This command can only be used by my *owner*.'
                                }, { quoted: msg });
                            }

                            const groupMeta = await socket.groupMetadata(sender);
                            const groupName = groupMeta.subject || 'this group';

                            await socket.sendMessage(sender, {
                                text: `👋 *Goodbye everyone!*\n\nI am leaving *${groupName}* now.\nThanks for having me here! ❤️\n\n> Powered by ICON-X 🤖`
                            }, { quoted: msg });

                            await new Promise(resolve => setTimeout(resolve, 1500));

                            const botId = socket.user.id.split(':')[0] + '@s.whatsapp.net';
                            await socket.groupParticipantsUpdate(sender, [botId], 'remove');

                            await socket.sendMessage(sender, {
                                text: `✅ Left group: *${groupName}*`
                            }, { quoted: msg });

                        } catch (e) {
                            console.error('Leave error:', e);
                            await socket.sendMessage(sender, {
                                text: `❌ Error: ${e.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== JOIN COMMAND =====
                    case 'join': {
                        try {
                            if (!isOwner) {
                                return await socket.sendMessage(sender, {
                                    text: '❗ This command can only be used by my *owner*.'
                                }, { quoted: msg });
                            }

                            if (isGroup) {
                                return await socket.sendMessage(sender, {
                                    text: '❗ Please use this command in your *inbox*.'
                                }, { quoted: msg });
                            }

                            const groupLink = args[0] || '';

                            if (!groupLink) {
                                return await socket.sendMessage(sender, {
                                    text: `🔗 *Join Command*\n\n*Usage:* \`${prefix}join <group_link>\`\n\n*Example:* \`${prefix}join https://chat.whatsapp.com/AbCdEfGhIjK\``
                                }, { quoted: msg });
                            }

                            await socket.sendMessage(sender, { 
                                react: { text: '🔄', key: msg.key } 
                            });

                            await socket.sendMessage(sender, {
                                text: `⏳ Attempting to join group...`
                            }, { quoted: msg });

                            let groupCode = groupLink;
                            if (groupLink.includes('chat.whatsapp.com')) {
                                groupCode = groupLink.split('/').pop();
                            }

                            const groupInfo = await socket.groupGetInviteInfo(groupCode);

                            if (!groupInfo || !groupInfo.id) {
                                return await socket.sendMessage(sender, {
                                    text: '❌ Invalid group link. The link might be expired or invalid.'
                                }, { quoted: msg });
                            }

                            try {
                                const botId = socket.user.id.split(':')[0] + '@s.whatsapp.net';
                                const groupMeta = await socket.groupMetadata(groupInfo.id);
                                const botInGroup = groupMeta.participants.some(p => p.id === botId);

                                if (botInGroup) {
                                    return await socket.sendMessage(sender, {
                                        text: `ℹ️ Bot is already in the group: *${groupInfo.subject || 'Unknown'}*`
                                    }, { quoted: msg });
                                }
                            } catch (err) {
                                // Bot not in group, continue
                            }

                            await socket.groupAcceptInvite(groupCode);

                            const groupName = groupInfo.subject || 'Unknown';

                            await socket.sendMessage(sender, {
                                text: `✅ *Successfully Joined!*\n\n📌 Group: *${groupName}*\n👥 Members: ${groupInfo.participants?.length || 'Unknown'}\n\n🎉 Bot is now in the group!`
                            }, { quoted: msg });

                            try {
                                const welcomeMsg = 
                                    `╭──────────────────────╮\n` +
                                    `│  🤖 *BOT JOINED*      │\n` +
                                    `├──────────────────────┤\n` +
                                    `│                       │\n` +
                                    `│  👋 Hello everyone!   │\n` +
                                    `│  I'm ICON-X MD Bot   │\n` +
                                    `│                       │\n` +
                                    `│  📌 Commands:         │\n` +
                                    `│  - Type *${prefix}ping* │\n` +
                                    `│  - Type *${prefix}ai* │\n` +
                                    `│  - Type *${prefix}help* │\n` +
                                    `│                       │\n` +
                                    `│  💬 I'm here to help!  │\n` +
                                    `│                       │\n` +
                                    `├──────────────────────┤\n` +
                                    `│  Powered by ICON-X 🤖  │\n` +
                                    `╰──────────────────────╯`;

                                await socket.sendMessage(groupInfo.id, {
                                    text: welcomeMsg
                                });
                            } catch (err) {
                                console.log('Could not send welcome message:', err);
                            }

                        } catch (e) {
                            console.error('Join error:', e);

                            let errorMsg = '❌ Failed to join group.';
                            if (e.message.includes('invalid') || e.message.includes('404')) {
                                errorMsg = '❌ Invalid group link. Please check the link and try again.';
                            } else if (e.message.includes('expired') || e.message.includes('401')) {
                                errorMsg = '❌ Group link has expired. Please get a new link.';
                            } else if (e.message.includes('full') || e.message.includes('409')) {
                                errorMsg = '❌ Group is full. Cannot add more members.';
                            } else if (e.message.includes('not-authorized') || e.message.includes('403')) {
                                errorMsg = '❌ Bot is not authorized to join this group.';
                            } else {
                                errorMsg = `❌ Failed to join: ${e.message}`;
                            }

                            await socket.sendMessage(sender, {
                                text: errorMsg
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== GET GROUP LINK =====
                    case 'getlink':
                    case 'grouplink': {
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
                        
                        try {
                            const groupId = sender;
                            const groupCode = await socket.groupInviteCode(groupId);
                            const link = `https://chat.whatsapp.com/${groupCode}`;
                            
                            const groupMeta = await socket.groupMetadata(groupId);
                            
                            await socket.sendMessage(sender, {
                                text: `🔗 *Group Link*\n\n📌 Group: *${groupMeta.subject || 'Unknown'}*\n🔗 Link: ${link}\n\n_Share this link to join the group._`
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to get link: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== REVOKE GROUP LINK =====
                    case 'revokelink': {
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
                        
                        try {
                            const groupId = sender;
                            const newCode = await socket.groupInviteCode(groupId);
                            const newLink = `https://chat.whatsapp.com/${newCode}`;
                            
                            await socket.sendMessage(sender, {
                                text: `🔄 *Link Revoked*\n\n✅ New link generated:\n${newLink}`
                            }, { quoted: msg });
                        } catch (err) {
                            await socket.sendMessage(sender, {
                                text: `❌ Failed to revoke: ${err.message}`
                            }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== WELCOME COMMAND =====
                    case 'welcome':
                    case 'setwelcome': {
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
                        const WELCOME_FILE = './welcome.json';
                        let welcomeSettings = {};
                        try {
                            welcomeSettings = JSON.parse(fs.readFileSync(WELCOME_FILE));
                        } catch {
                            welcomeSettings = {};
                        }
                        
                        const groupId = sender;
                        if (!welcomeSettings[groupId]) {
                            welcomeSettings[groupId] = { enabled: false, message: '' };
                        }
                        
                        if (!sub) {
                            const status = welcomeSettings[groupId].enabled ? '✅ Enabled' : '❌ Disabled';
                            const msg = welcomeSettings[groupId].message || 'Default welcome message';
                            return await socket.sendMessage(sender, {
                                text: `👋 *Welcome System*\n\n📊 Status: ${status}\n📝 Message: ${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}\n\n*Commands:*\n\`${prefix}welcome on\` - Enable\n\`${prefix}welcome off\` - Disable\n\`${prefix}welcome set <message>\` - Set custom message\n\`${prefix}welcome reset\` - Reset to default\n\n*Placeholders:*\n@user - Mention user\n@name - User's name\n@group - Group name\n@count - Member count`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                welcomeSettings[groupId].enabled = true;
                                fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '✅ Welcome messages enabled for this group.'
                                }, { quoted: msg });
                                break;
                                
                            case 'off':
                                welcomeSettings[groupId].enabled = false;
                                fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '❌ Welcome messages disabled for this group.'
                                }, { quoted: msg });
                                break;
                                
                            case 'set': {
                                const message = args.slice(1).join(' ');
                                if (!message) {
                                    return await socket.sendMessage(sender, {
                                        text: `⚠️ *Usage:* \`${prefix}welcome set <message>\`\n\n*Placeholders:*\n@user - Mention user\n@name - User's name\n@group - Group name\n@count - Member count`
                                    }, { quoted: msg });
                                }
                                welcomeSettings[groupId].message = message;
                                fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: `✅ Welcome message set:\n\n${message}`
                                }, { quoted: msg });
                                break;
                            }
                            
                            case 'reset':
                                welcomeSettings[groupId].message = '';
                                fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '🔄 Welcome message reset to default.'
                                }, { quoted: msg });
                                break;
                                
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown: \`${sub}\``
                                }, { quoted: msg });
                        }
                        break;
                    }

                    // ===== GOODBYE COMMAND =====
                    case 'goodbye':
                    case 'setgoodbye': {
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
                        const GOODBYE_FILE = './goodbye.json';
                        let goodbyeSettings = {};
                        try {
                            goodbyeSettings = JSON.parse(fs.readFileSync(GOODBYE_FILE));
                        } catch {
                            goodbyeSettings = {};
                        }
                        
                        const groupId = sender;
                        if (!goodbyeSettings[groupId]) {
                            goodbyeSettings[groupId] = { enabled: false, message: '' };
                        }
                        
                        if (!sub) {
                            const status = goodbyeSettings[groupId].enabled ? '✅ Enabled' : '❌ Disabled';
                            const msg = goodbyeSettings[groupId].message || 'Default goodbye message';
                            return await socket.sendMessage(sender, {
                                text: `👋 *Goodbye System*\n\n📊 Status: ${status}\n📝 Message: ${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}\n\n*Commands:*\n\`${prefix}goodbye on\` - Enable\n\`${prefix}goodbye off\` - Disable\n\`${prefix}goodbye set <message>\` - Set custom message\n\`${prefix}goodbye reset\` - Reset to default\n\n*Placeholders:*\n@user - Mention user\n@name - User's name\n@group - Group name\n@count - Member count`
                            }, { quoted: msg });
                        }
                        
                        switch (sub) {
                            case 'on':
                                goodbyeSettings[groupId].enabled = true;
                                fs.writeFileSync(GOODBYE_FILE, JSON.stringify(goodbyeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '✅ Goodbye messages enabled for this group.'
                                }, { quoted: msg });
                                break;
                                
                            case 'off':
                                goodbyeSettings[groupId].enabled = false;
                                fs.writeFileSync(GOODBYE_FILE, JSON.stringify(goodbyeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '❌ Goodbye messages disabled for this group.'
                                }, { quoted: msg });
                                break;
                                
                            case 'set': {
                                const message = args.slice(1).join(' ');
                                if (!message) {
                                    return await socket.sendMessage(sender, {
                                        text: `⚠️ *Usage:* \`${prefix}goodbye set <message>\`\n\n*Placeholders:*\n@user - Mention user\n@name - User's name\n@group - Group name\n@count - Member count`
                                    }, { quoted: msg });
                                }
                                goodbyeSettings[groupId].message = message;
                                fs.writeFileSync(GOODBYE_FILE, JSON.stringify(goodbyeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: `✅ Goodbye message set:\n\n${message}`
                                }, { quoted: msg });
                                break;
                            }
                            
                            case 'reset':
                                goodbyeSettings[groupId].message = '';
                                fs.writeFileSync(GOODBYE_FILE, JSON.stringify(goodbyeSettings, null, 2));
                                await socket.sendMessage(sender, {
                                    text: '🔄 Goodbye message reset to default.'
                                }, { quoted: msg });
                                break;
                                
                            default:
                                await socket.sendMessage(sender, {
                                    text: `❌ Unknown: \`${sub}\``
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
                            case 'on': settings.enabled = true; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '✅ Anti-link enabled.' }, { quoted: msg }); break;
                            case 'off': settings.enabled = false; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '❌ Anti-link disabled.' }, { quoted: msg }); break;
                            case 'delete': settings.action = 'delete'; settings.enabled = true; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '🗑️ Action set to: Delete.' }, { quoted: msg }); break;
                            case 'warn': settings.action = 'warn'; settings.enabled = true; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '⚠️ Action set to: Warn (3 = kick).' }, { quoted: msg }); break;
                            case 'kick': settings.action = 'kick'; settings.enabled = true; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '🚫 Action set to: Kick.' }, { quoted: msg }); break;
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
                            case 'reset': settings.warnings = {}; saveAntiLinkSettings(sender, settings); await socket.sendMessage(sender, { text: '🔄 All warnings reset.' }, { quoted: msg }); break;
                            default: await socket.sendMessage(sender, { text: `❌ Unknown: \`${sub}\`` }, { quoted: msg });
                        }
                        break;
                    }

                    case 'clearwarn': {
                        if (!isGroup || !isOwner) return;
                        const target = args[0]?.replace(/[^0-9]/g, '');
                        if (!target) return await socket.sendMessage(sender, { text: `⚠️ Usage: \`${prefix}clearwarn <number>\`` }, { quoted: msg });
                        const userId = target + '@s.whatsapp.net';
                        const settings = getAntiLinkSettings(sender);
                        if (settings.warnings[userId]) {
                            delete settings.warnings[userId];
                            saveAntiLinkSettings(sender, settings);
                            await socket.sendMessage(sender, { text: `✅ Warnings cleared for @${target}`, mentions: [userId] }, { quoted: msg });
                        } else {
                            await socket.sendMessage(sender, { text: `❌ No warnings found for @${target}`, mentions: [userId] }, { quoted: msg });
                        }
                        break;
                    }
                    // ===== END ANTI-LINK COMMANDS =====


// ===== ANIME STICKER COMMANDS =====
case 'shinobu':
case 'stickshinobu': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
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

case 'fathersday': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👨', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/fathersday?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `👨‍👧‍👦 *Father's Day Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Father\'s Day message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Fathersday command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Father\'s Day message.'
        }, { quoted: msg });
    }
    break;
}

case 'mothersday': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👩', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/mothersday?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `👩‍👧‍👦 *Mother's Day Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Mother\'s Day message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Mothersday command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Mother\'s Day message.'
        }, { quoted: msg });
    }
    break;
}

case 'girlfriendsday': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💖', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/girlfriendsday?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💖 *Girlfriend's Day Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Girlfriend\'s Day message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Girlfriendsday command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Girlfriend\'s Day message.'
        }, { quoted: msg });
    }
    break;
}

case 'boyfriendsday': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💙', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/boyfriendsday?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💙 *Boyfriend's Day Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Boyfriend\'s Day message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Boyfriendsday command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Boyfriend\'s Day message.'
        }, { quoted: msg });
    }
    break;
}

case 'newyear': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎉', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/newyear?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🎉 *New Year Message*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch New Year message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Newyear command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching New Year message.'
        }, { quoted: msg });
    }
    break;
}

case 'christmas': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎄', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/christmas?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🎄 *Christmas Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Christmas message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Christmas command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Christmas message.'
        }, { quoted: msg });
    }
    break;
}

case 'heartbreak': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💔', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/heartbreak?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💔 *Heartbreak Quote*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch heartbreak quote.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Heartbreak command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching heartbreak quote.'
        }, { quoted: msg });
    }
    break;
}

// ===== SEARCH COMMANDS =====
case 'yts': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const query = q.replace(new RegExp(`^${userPrefix}yts\\s*`), '').trim();
    
    if (!query) {
        return await socket.sendMessage(sender, {
            text: `🎬 *YouTube Search*\n\n*Usage:* \`${userPrefix}yts <search query>\`\n\n*Example:* \`${userPrefix}yts Icon x md\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        const response = await axios.get(`https://api.giftedtech.co.ke/api/search/yts?apikey=gifted&query=${encodeURIComponent(query)}`);
        
        if (response.data.status && response.data.results) {
            let message = `🎬 *YouTube Search Results for:* ${query}\n\n`;
            const topResults = response.data.results.slice(0, 5);
            
            topResults.forEach((item, i) => {
                if (item.type === "video") {
                    message += `*${i + 1}. ${item.title}*\n`;
                    message += `👤 Author: ${item.author.name}\n`;
                    message += `⏱ Duration: ${item.duration.timestamp}\n`;
                    message += `👀 Views: ${item.views.toLocaleString()}\n`;
                    message += `🔗 ${item.url}\n\n`;
                }
            });
            
            message += `_powered by Mr Elephant_`;
            
            await socket.sendMessage(sender, { text: message }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ No results found for "${query}"`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('YTS command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error searching YouTube.'
        }, { quoted: msg });
    }
    break;
}

case 'googleimage': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const query = q.replace(new RegExp(`^${userPrefix}googleimage\\s*`), '').trim();
    
    if (!query) {
        return await socket.sendMessage(sender, {
            text: `🖼 *Google Image Search*\n\n*Usage:* \`${userPrefix}googleimage <search query>\`\n\n*Example:* \`${userPrefix}googleimage anime landscape\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        const response = await axios.get(`https://api.giftedtech.co.ke/api/search/googleimage?apikey=gifted&query=${encodeURIComponent(query)}`);
        
        if (response.data.status && response.data.results && response.data.results.length > 0) {
            let message = `🖼 *Google Image Search Results for:* ${query}\n\n`;
            const topImages = response.data.results.slice(0, 5);
            
            topImages.forEach((img, i) => {
                message += `*Image ${i + 1}:* ${img}\n\n`;
            });
            
            message += `_powered by Mr Elephant_`;
            
            await socket.sendMessage(sender, { text: message }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ No images found for "${query}"`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('GoogleImage command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error searching images.'
        }, { quoted: msg });
    }
    break;
}

// ===== ANIME IMAGE COMMANDS =====
case 'neko': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🐱', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/neko?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `🐾 *Neko*\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch neko image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Neko command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching neko image.'
        }, { quoted: msg });
    }
    break;
}

case 'waifu': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💖', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/waifu?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `💖 *Waifu*\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch waifu image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Waifu command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching waifu image.'
        }, { quoted: msg });
    }
    break;
}

// ===== JOKE COMMANDS =====
case 'jokev4':
case 'jokesv2': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😂', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/jokes?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            const joke = response.data.result;
            await socket.sendMessage(sender, {
                text: `🤣 *Joke*\n\n*Type:* ${joke.type}\n\n${joke.setup}\n\n*Punchline:* ${joke.punchline}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch joke.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Joke command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching joke.'
        }, { quoted: msg });
    }
    break;
}

// ===== HALLOWEEN COMMAND =====
case 'halloween': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎃', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/halloween?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `👻 *Halloween Special*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Halloween quote.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Halloween command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Halloween quote.'
        }, { quoted: msg });
    }
    break;
}

// ===== GRATITUDE COMMAND =====
case 'gratitude': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🙏', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/gratitude?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🙏 *Gratitude Message*\n\n${response.data.result}\n\n_powered by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch gratitude message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Gratitude command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching gratitude message.'
        }, { quoted: msg });
    }
    break;
}

case 'vision': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    if (!q.includes('http')) {
        return await socket.sendMessage(sender, {
            text: `🖼️ *AI Vision Analysis*\n\n*Usage:* \`${userPrefix}vision <image_url> | <description>\`\n\n*Example:* \`${userPrefix}vision https://example.com/image.jpg | Describe this picture\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        let [url, prompt] = q.replace(new RegExp(`^${userPrefix}vision\\s*`), '').split('|').map(t => t.trim());
        if (!prompt) prompt = "Describe in detail the objects, atmosphere and mood of the picture.";
        
        const response = await axios.get(`https://api.giftedtech.co.ke/api/ai/vision?apikey=gifted&url=${encodeURIComponent(url)}&prompt=${encodeURIComponent(prompt)}`);
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🖼️ *AI Vision Result*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to analyze the image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Vision command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error analyzing image.'
        }, { quoted: msg });
    }
    break;
}

case 'deepimg': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const prompt = q.replace(new RegExp(`^${userPrefix}deepimg\\s*`), '').trim();
    
    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `🎨 *AI Image Generation*\n\n*Usage:* \`${userPrefix}deepimg <prompt>\`\n\n*Example:* \`${userPrefix}deepimg A beautiful sunset over mountains\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎨', key: msg.key } });
        const response = await axios.get(`https://api.giftedtech.co.ke/api/ai/deepimg?apikey=gifted&prompt=${encodeURIComponent(prompt)}`);
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `🎨 *AI Generated Image*\n\n*Prompt:* ${prompt}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to generate image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('DeepImg command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error generating image.'
        }, { quoted: msg });
    }
    break;
}

case 'animeinfo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎬', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/random?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            const info = response.data.result;
            const caption = `🎬 *${info.title}*\n\n📺 Episodes: ${info.episodes}\n📌 Status: ${info.status}\n\n📝 *Synopsis:*\n${info.synopsis}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
            
            await socket.sendMessage(sender, {
                image: { url: info.thumbnail },
                caption: caption
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch anime info.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Animeinfo command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching anime info.'
        }, { quoted: msg });
    }
    break;
}

case 'hwaifu': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔥', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/hwaifu?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `🔥 *Hot Waifu*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch hot waifu image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Hwaifu command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching hot waifu image.'
        }, { quoted: msg });
    }
    break;
}

case 'megumin': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💥', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/megumin?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `💥 *Megumin*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Megumin image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Megumin command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Megumin image.'
        }, { quoted: msg });
    }
    break;
}

case 'ass': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🍑', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/ass?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `🍑 *Ass*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch ass image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Ass command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching ass image.'
        }, { quoted: msg });
    }
    break;
}

case 'ecchi': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔞', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/ecchi?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `🔞 *Ecchi*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch ecchi image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Ecchi command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching ecchi image.'
        }, { quoted: msg });
    }
    break;
}

case 'animechar': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const character = q.replace(new RegExp(`^${userPrefix}animechar\\s*`), '').trim();
    
    if (!character) {
        return await socket.sendMessage(sender, {
            text: `💬 *Anime Character Quote*\n\n*Usage:* \`${userPrefix}animechar <character name>\`\n\n*Example:* \`${userPrefix}animechar lelouch\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '💬', key: msg.key } });
        const response = await axios.get(`https://api.giftedtech.co.ke/api/anime/char-quotes?apikey=gifted&character=${encodeURIComponent(character)}`);
        
        if (response.data.status && response.data.result) {
            const result = response.data.result;
            await socket.sendMessage(sender, {
                text: `💬 *${result.character}* from *${result.show}*\n\n"${result.quote}"\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ Failed to fetch quote for character: ${character}`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Animechar command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching character quote.'
        }, { quoted: msg });
    }
    break;
}

case 'animeshow': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const show = q.replace(new RegExp(`^${userPrefix}animeshow\\s*`), '').trim();
    
    if (!show) {
        return await socket.sendMessage(sender, {
            text: `💬 *Anime Show Quote*\n\n*Usage:* \`${userPrefix}animeshow <show name>\`\n\n*Example:* \`${userPrefix}animeshow code geass\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '💬', key: msg.key } });
        const response = await axios.get(`https://api.giftedtech.co.ke/api/anime/show-quotes?apikey=gifted&show=${encodeURIComponent(show)}`);
        
        if (response.data.status && response.data.result) {
            const result = response.data.result;
            await socket.sendMessage(sender, {
                text: `💬 *${result.character}* from *${result.show}*\n\n"${result.quote}"\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ Failed to fetch quote for show: ${show}`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Animeshow command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching show quote.'
        }, { quoted: msg });
    }
    break;
}

case 'loli': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👧', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/anime/loli?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                image: { url: response.data.result },
                caption: `👧 *Loli*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch loli image.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Loli command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching loli image.'
        }, { quoted: msg });
    }
    break;
}

case 'advice': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💡', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/advice?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💡 *Advice*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch advice.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Advice command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching advice.'
        }, { quoted: msg });
    }
    break;
}

case 'codegen': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const prompt = q.replace(new RegExp(`^${userPrefix}codegen\\s*`), '').trim();
    
    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `💻 *Code Generation*\n\n*Usage:* \`${userPrefix}codegen <programming task>\`\n\n*Example:* \`${userPrefix}codegen create a login form in HTML\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '💻', key: msg.key } });
        const response = await axios.get(`https://apiskeith.vercel.app/ai/codegen?q=${encodeURIComponent(prompt)}`);
        
        if (response.data.status && response.data.result?.code) {
            await socket.sendMessage(sender, {
                text: `💻 *Generated Code*\n\n\`\`\`javascript\n${response.data.result.code}\n\`\`\`\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to generate code.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Codegen command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error generating code.'
        }, { quoted: msg });
    }
    break;
}

case 'lyricsgen': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const args = q.replace(new RegExp(`^${userPrefix}lyricsgen\\s*`), '').split(' ');
    const topic = args[0] || 'love';
    const genre = args[1] || 'pop';
    const mood = args[2] || 'happy';
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎵', key: msg.key } });
        const response = await axios.get(`https://apiskeith.vercel.app/ai/lyricsgen?topic=${encodeURIComponent(topic)}&genre=${encodeURIComponent(genre)}&mood=${encodeURIComponent(mood)}&structure=verse_chorus_bridge&language=en`);
        
        if (response.data.status && response.data.result?.lyrics) {
            await socket.sendMessage(sender, {
                text: `🎤 *Generated Lyrics*\n\n${response.data.result.lyrics}\n\n*Title:* ${response.data.result.metadata?.title || 'Untitled'}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to generate lyrics.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Lyricsgen command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error generating lyrics.'
        }, { quoted: msg });
    }
    break;
}

case 'grok': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const prompt = q.replace(new RegExp(`^${userPrefix}grok\\s*`), '').trim();
    
    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `🤖 *AI Chat*\n\n*Usage:* \`${userPrefix}grok <your question>\`\n\n*Example:* \`${userPrefix}grok What is artificial intelligence?\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } });
        const response = await axios.get(`https://apiskeith.vercel.app/ai/grok?q=${encodeURIComponent(prompt)}`);
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🤖 *AI Response*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to get AI response.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Grok command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error getting AI response.'
        }, { quoted: msg });
    }
    break;
}

case 'text2img': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const prompt = q.replace(new RegExp(`^${userPrefix}text2img\\s*`), '').trim();
    
    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `🖼️ *Text to Image*\n\n*Usage:* \`${userPrefix}text2img <prompt>\`\n\n*Example:* \`${userPrefix}text2img a beautiful sunset over mountains\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎨', key: msg.key } });
        const response = await axios.get(`https://apiskeith.vercel.app/ai/text2img?q=${encodeURIComponent(prompt)}`);
        
        if (response.data.status && response.data.result?.images) {
            let message = `🖼️ *Generated Images*\n\n*Prompt:* ${prompt}\n\n`;
            response.data.result.images.forEach((img, idx) => {
                message += `*Image ${idx + 1}:* ${img.url}\n`;
            });
            message += `\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
            
            await socket.sendMessage(sender, { text: message }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to generate images.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Text2img command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error generating images.'
        }, { quoted: msg });
    }
    break;
}

case 'valentines': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💌', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/valentines?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💌 *Valentine's Message*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch Valentine\'s message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Valentines command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching Valentine\'s message.'
        }, { quoted: msg });
    }
    break;
}

case 'goodnight': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🌙', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/goodnight?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🌙 *Goodnight Message*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch goodnight message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Goodnight command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching goodnight message.'
        }, { quoted: msg });
    }
    break;
}

case 'thankyou': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🙏', key: msg.key } });
        const response = await axios.get('https://api.giftedtech.co.ke/api/fun/thankyou?apikey=gifted');
        
        if (response.data.status && response.data.result) {
            await socket.sendMessage(sender, {
                text: `🙏 *Thank You Message*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch thank you message.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Thankyou command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Error fetching thank you message.'
        }, { quoted: msg });
    }
    break;
}

// More sticker commands
case 'sticksmug': {
    try {
        await socket.sendMessage(sender, { react: { text: '😏', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/smug');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Smug sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch smug sticker.' 
        }, { quoted: msg });
    }
    break;
}

// ===== MORE STICKER COMMANDS =====
case 'sticksmug': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😏', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/smug');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Smug sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch smug sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickblush': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😊', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/blush');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Blush sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch blush sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickawoo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🐺', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/awoo');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Awoo sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch awoo sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickwave': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👋', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/wave');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Wave sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch wave sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'sticksmile': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😄', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/smile');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Smile sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch smile sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickslap': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '✋', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/slap');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Slap sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch slap sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'sticknom': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🍖', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/nom');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Nom sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch nom sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickpoke': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👉', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/poke');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Poke sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch poke sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickwink': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😉', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/wink');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Wink sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch wink sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickbonk': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔨', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/bonk');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Bonk sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch bonk sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickbully': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👊', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/bully');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Bully sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch bully sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'setprefix': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const newPrefix = q.replace(new RegExp(`^${userPrefix}setprefix\\s*`), '').trim();
    
    if (!newPrefix) {
        return await socket.sendMessage(sender, {
            text: `⚙️ *Set Bot Prefix*\n\n*Usage:* \`${userPrefix}setprefix <new prefix>\`\n\n*Example:* \`${userPrefix}setprefix !\``
        }, { quoted: msg });
    }
    
    // Update the config prefix
    config.PREFIX = newPrefix;
    
    await socket.sendMessage(sender, {
        text: `⚙️ *Prefix Updated*\n\n✅ Bot prefix has been changed to: \`${newPrefix}\`\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
    }, { quoted: msg });
    break;
}

case 'stickyeet': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💨', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/yeet');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Yeet sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch yeet sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickbite': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🦷', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/bite');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Bite sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch bite sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickkiss': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💋', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/kiss');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Kiss sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch kiss sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'sticklick': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👅', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/lick');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Lick sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch lick sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickpat': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👋', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/pat');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Pat sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch pat sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickhug': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🤗', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/hug');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Hug sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch hug sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickkill': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💀', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/kill');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Kill sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch kill sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickcry': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '😢', key: msg.key } });
        const response = await axios.get('https://api.waifu.pics/sfw/cry');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Cry sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch cry sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'stickspank': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👋', key: msg.key } });
        const response = await axios.get('https://nekos.life/api/v2/img/spank');
        await socket.sendMessage(from, { 
            sticker: { url: response.data.url },
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });
    } catch (error) {
        console.error('Spank sticker error:', error);
        await socket.sendMessage(sender, { 
            text: '❌ Failed to fetch spank sticker.' 
        }, { quoted: msg });
    }
    break;
}

case 'tagall': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    // Check if message is from a group
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '❌ This command only works in groups!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🏷️', key: msg.key } });
        
        // Get group metadata and participants
        const groupMetadata = await socket.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        if (participants.length === 0) {
            return await socket.sendMessage(sender, {
                text: '❌ No participants found in this group.'
            }, { quoted: msg });
        }
        
        // Create mention list
        let mentions = [];
        let mentionText = `👥 *MENTION ALL*\n\n`;
        
        participants.forEach((participant, index) => {
            const number = participant.id.split('@')[0];
            const name = participant.notify || participant.name || `User ${index + 1}`;
            mentions.push(participant.id);
            mentionText += `@${number}\n`;
        });
        
        mentionText += `\n📊 *Total Members:* ${participants.length}\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
        
        // Send message with logo FIRST, then the mention message
        await socket.sendMessage(from, {
            image: { url: './lucid.jpg' },
            caption: '𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 🏵️ | 𝙈𝙀𝙉𝙏𝙄𝙊𝙉 𝘼𝙇𝙇 𝘾𝙊𝙈𝙈𝘼𝙉𝘿'
        });
        
        // Send mention message
        await socket.sendMessage(from, {
            text: mentionText,
            mentions: mentions
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Tagall command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to tag all members. Make sure I have admin permissions.'
        }, { quoted: msg });
    }
    break;
}

case 'vcf': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」\n' +
                  '│ ❌ This command can only be used in groups!\n' +
                  '└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄'
        }, { quoted: msg });
    }

    try {
        await socket.sendMessage(sender, { react: { text: '📇', key: msg.key } });
        
        // Get group metadata
        const groupMetadata = await socket.groupMetadata(from);
        const groupName = groupMetadata.subject || "Unknown Group";
        const participants = groupMetadata.participants;
        const totalMembers = participants.length;

        if (!participants || participants.length === 0) {
            return await socket.sendMessage(sender, {
                text: '┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙞𝙣𝙞 」\n' +
                      '│ ❌ No members found in this group!\n' +
                      '└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄'
            }, { quoted: msg });
        }

        // Generate vCard content for ALL group members
        let vcfData = "BEGIN:VCARD\nVERSION:3.0\n";
        for (let member of participants) {
            let contactId = member.id.replace(/@s\.whatsapp\.net/, '');
            let contactName = member.notify || member.name || "Unknown Contact";
            vcfData += `FN:${contactName}\n`;
            vcfData += `TEL;TYPE=CELL:${contactId}\n`;
            vcfData += "END:VCARD\n";
        }

        const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_Contacts.vcf`;
        const fileBuffer = Buffer.from(vcfData);
        const fileSizeKB = (fileBuffer.length / 1024).toFixed(2);
        const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

        // System info
        const used = process.memoryUsage();
        const totalMem = (used.rss / (1024 * 1024)).toFixed(2);
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();

        // Loading steps with ICON-X Mini branding
        const loadingSteps = [
`┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」
│ 📇 *vCard Generator*
│ ⏳ Status: *Starting...*
│ 📂 Group: *${groupName}*
│ 👥 Members: *${totalMembers}*
│ 👤 Requested by: *@${sender.split('@')[0]}*
│ 🕒 Time: *${time} | ${date}*
│ 💾 RAM: *${totalMem} MB*
└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄`,

`┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄」
│ 📇 *vCard Generator*
│ ⏳ Status: *Generating..*
│ 📂 Group: *${groupName}*
│ 👥 Members: *${totalMembers}*
│ 👤 Requested by: *@${sender.split('@')[0]}*
│ 🕒 Time: *${time} | ${date}*
│ 💾 RAM: *${totalMem} MB*
└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄`,

`┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」
│ 📇 *vCard Generator*
│ ⚡ Status: *Generating...*
│ 📂 Group: *${groupName}*
│ 👥 Members: *${totalMembers}*
│ 👤 Requested by: *@${sender.split('@')[0]}*
│ 🕒 Time: *${time} | ${date}*
│ 💾 RAM: *${totalMem} MB*
└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄`,

`┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄」
│ 📇 *vCard Generator*
│ ✅ Status: *Finalizing...*
│ 📂 Group: *${groupName}*
│ 👥 Members: *${totalMembers}*
│ 👤 Requested by: *@${sender.split('@')[0]}*
│ 🕒 Time: *${time} | ${date}*
│ 💾 RAM: *${totalMem} MB*
└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄`
        ];

        // Send initial message with logo
        const sentMsg = await socket.sendMessage(from, {
            text: loadingSteps[0],
            mentions: [sender]
        }, { quoted: msg });

        // Update loading animation
        let step = 1;
        const interval = setInterval(async () => {
            if (step < loadingSteps.length) {
                await socket.sendMessage(from, {
                    text: loadingSteps[step],
                    mentions: [sender]
                }, { quoted: sentMsg });
                step++;
            } else {
                clearInterval(interval);

                  // Send the vCard file
                await socket.sendMessage(from, {
                    document: fileBuffer,
                    mimetype: 'text/vcard',
                    fileName: fileName,
                    caption: `┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」\n` +
                            `│ 📇 *vCard Generated Successfully!*\n` +
                            `│ 📂 Group: ${groupName}\n` +
                            `│ 👥 Total Contacts: ${totalMembers}\n` +
                            `│ 📦 File Size: ${fileSizeKB} KB\n` +
                            `│ 👤 Generated by: @${sender.split('@')[0]}\n` +
                            `└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄`,
                    mentions: [sender]
                }, { quoted: msg });

                // Final success message
                setTimeout(async () => {
                    await socket.sendMessage(from, {
                        text: `┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」\n` +
                              `│ ✅ *vCard Generation Complete!*\n` +
                              `│ 📇 File: ${fileName}\n` +
                              `│ 📂 Group: ${groupName}\n` +
                              `│ 👥 Members: ${totalMembers}\n` +
                              `│ 📦 Size: ${fileSizeKB} KB (${fileSizeMB} MB)\n` +
                              `│ 👤 By: @${sender.split('@')[0]}\n` +
                              `│ 🕒 Time: ${time} | ${date}\n` +
                              `└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄\n\n` +
                              `💡 *Note:* This vCF contains ALL group contacts!\n` +
                              `📱 Save contacts easily by opening this file.`,
                        mentions: [sender]
                    }, { quoted: msg });
                }, 3000);
            }
        }, 1500);

    } catch (error) {
        console.error('VCF command error:', error);
        await socket.sendMessage(sender, {
            text: '┌─── 「 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄 」\n' +
                  '│ ❌ Failed to generate vCard file!\n' +
                  '│ Error: ' + error.message + '\n' +
                  '└─── 𝙋𝙤𝙬𝙚𝙧𝙙 𝘽𝙮 𝙄𝘾𝙊𝙉-𝙓 𝙈𝙄𝙉𝙄'
        }, { quoted: msg });
    }
    break;
}

case 'sticker': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } });
        
        // Check if there's a quoted message with media or if media is in current message
        let media = null;
        let mime = '';
        
        if (msg.message?.imageMessage) {
            media = msg.message.imageMessage;
            mime = 'image';
        } else if (msg.message?.videoMessage) {
            media = msg.message.videoMessage;
            mime = 'video';
        } else if (msg.quoted?.imageMessage) {
            media = msg.quoted.imageMessage;
            mime = 'image';
        } else if (msg.quoted?.videoMessage) {
            media = msg.quoted.videoMessage;
            mime = 'video';
        }
        
        if (!media) {
            return await socket.sendMessage(sender, {
                text: `🖼️ *Sticker Maker*\n\n*Usage:* Reply to an image/video with \`${userPrefix}sticker\` or send image/video with caption \`${userPrefix}sticker\`\n\n*Example:* Reply to any image with \`${userPrefix}sticker\``
            }, { quoted: msg });
        }
        
        // Download the media
        const stream = await downloadContentFromMessage(media, mime);
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        // Convert to sticker with custom metadata
        const stickerMetadata = {
            packname: 'ICON-X AI Mini',
            author: 'Mr Elephant l',
            categories: ['🤖', '✨'],
            androidAvoidAutoCrop: true
        };
        
        // Send as sticker
        await socket.sendMessage(from, {
            sticker: buffer,
            ...stickerMetadata
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Sticker command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to create sticker. Please make sure you\'re replying to an image or video.'
        }, { quoted: msg });
    }
    break;
}

case 'groupinfo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    // Check if message is from a group
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '❌ This command only works in groups!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📊', key: msg.key } });
        
        // Get group metadata
        const groupMetadata = await socket.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        // Count admins
        const admins = participants.filter(p => p.admin);
        const regularUsers = participants.filter(p => !p.admin);
        
        // Get group creation date
        const creationDate = new Date(groupMetadata.creation * 1000).toLocaleDateString();
        
        // Create info message
        const infoMessage = `📊 *GROUP INFORMATION*\n\n` +
                           `📛 *Name:* ${groupMetadata.subject}\n` +
                           `👑 *Creator:* ${groupMetadata.owner?.split('@')[0] || 'Unknown'}\n` +
                           `📅 *Created:* ${creationDate}\n` +
                           `👥 *Total Members:* ${participants.length}\n` +
                           `⚡ *Admins:* ${admins.length}\n` +
                           `👤 *Regular Users:* ${regularUsers.length}\n` +
                           `🔒 *Restricted:* ${groupMetadata.restrict ? 'Yes' : 'No'}\n` +
                           `👁️ *Announcement:* ${groupMetadata.announce ? 'Yes' : 'No'}\n\n` +
                           `💾 *Use .savegroup to save all numbers*\n\n` +
                           `_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
        
        // Send group info
        await socket.sendMessage(sender, { text: infoMessage }, { quoted: msg });
        
        // Send group picture if available
        try {
            const groupPic = await socket.profilePictureUrl(from, 'image');
            await socket.sendMessage(sender, {
                image: { url: groupPic },
                caption: `🖼️ *${groupMetadata.subject}* Group Picture`
            }, { quoted: msg });
        } catch (picError) {
            console.log('No group picture available');
        }
        
    } catch (error) {
        console.error('Groupinfo command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to get group information.'
        }, { quoted: msg });
    }
    break;
}

case 'exportgroup': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    // Check if message is from a group
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '❌ This command only works in groups!'
        }, { quoted: msg });
    }
    
    // Check if user is admin using m.isAdmin from sms helper
    const isAdmin = m.isAdmin || false;
    if (!isAdmin) {
        return await socket.sendMessage(sender, {
            text: '❌ You need to be a group admin to use this command!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📤', key: msg.key } });
        
        // Get group metadata
        const groupMetadata = await socket.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        // Create formatted text file
        let textData = `GROUP MEMBERS EXPORT - ${groupMetadata.subject}\n`;
        textData += `Export Date: ${new Date().toLocaleString()}\n`;
        textData += `Total Members: ${participants.length}\n\n`;
        textData += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        // Add admin section
        const admins = participants.filter(p => p.admin);
        if (admins.length > 0) {
            textData += '👑 ADMINISTRATORS:\n';
            admins.forEach((admin, index) => {
                const number = admin.id.split('@')[0];
                const name = admin.notify || admin.name || 'Unknown';
                textData += `${index + 1}. ${name} (${number})\n`;
            });
            textData += '\n';
        }
        
        // Add members section
        const members = participants.filter(p => !p.admin);
        if (members.length > 0) {
            textData += '👤 MEMBERS:\n';
            members.forEach((member, index) => {
                const number = member.id.split('@')[0];
                const name = member.notify || member.name || 'Unknown';
                textData += `${index + 1}. ${name} (${number})\n`;
            });
        }
        
        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `group-export-${timestamp}.txt`;
        fs.writeFileSync(filename, textData);
        
        // Send the text file
        await socket.sendMessage(sender, {
            document: { url: `file://${path.resolve(filename)}` },
            fileName: filename,
            mimetype: 'text/plain',
            caption: `📤 *GROUP EXPORT COMPLETE*\n\n` +
                    `📁 *File:* ${filename}\n` +
                    `📛 *Group:* ${groupMetadata.subject}\n` +
                    `👥 *Total:* ${participants.length} members\n` +
                    `👑 *Admins:* ${admins.length}\n` +
                    `👤 *Members:* ${members.length}\n\n` +
                    `_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
        // Clean up
        setTimeout(() => {
            if (fs.existsSync(filename)) {
                fs.unlinkSync(filename);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Exportgroup command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to export group data.'
        }, { quoted: msg });
    }
    break;
}
// ══════════════════════════════════
 case 'alive': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const os = require('os');
        const start = Date.now();
        const startTime = socketCreationTime.get(number) || Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const totalMem = os.totalmem() / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
        const latency = Date.now() - start;
        const speedStatus = latency < 100 ? '🟢 Fast' : latency < 300 ? '🟡 Normal' : '🔴 Slow';

        const ramNotice = (() => {
            if (memPercent >= 90) return `\n│ 🔴 *RAM Critical!* Performance may drop`;
            if (memPercent >= 75) return `\n│ 🟠 *RAM High!* Running under pressure`;
            if (memPercent >= 50) return `\n│ 🟡 *RAM Moderate* Running stable`;
            return `\n│ 🟢 *RAM Healthy* All systems good`;
        })();

        const imageBuffer = fs.readFileSync('./lucid.jpg');

        await socket.sendMessage(from, {
            image: imageBuffer,
            caption:
                `╭───「 *𝙸𝙲𝙾𝙽-𝚇 ᴍɪɴɪ* 」───╮\n` +
                `│\n` +
                `│ 🤖 Status: Online ✅\n` +
                `│ ⏳ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
                `│ ⚡ Speed: ${latency}ms ${speedStatus}\n` +
                `│ 🟢 Active Bots: ${activeSockets.size}\n` +
                `│\n` +
                `│ 💾 RAM: ${usedMem.toFixed(0)}MB / ${totalMem.toFixed(0)}MB\n` +
                `│ 📊 Usage: ${memPercent}%` +
                ramNotice + `\n` +
                `│\n` +
                `│ 🖥️ Node: ${process.version}\n` +
                `│ 🌐 Platform: ${os.platform()}\n` +
                `│\n` +
                `╰───「 *Mr Elephant* 」───╯`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: (config.NEWSLETTER_JID || '').trim(),
                    newsletterName: '𝙸𝙲𝙾𝙽-𝚇',
                    serverMessageId: 143
                }
            }
        }, { quoted: msg });
    } catch (err) {
        await socket.sendMessage(sender, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
    break;
}

case 'runtime': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const os = require('os');
        const startTime = socketCreationTime.get(number) || Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const memUsage = process.memoryUsage();
        const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
        const rss = (memUsage.rss / 1024 / 1024).toFixed(2);
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);

        await socket.sendMessage(from,
            {
                text:
                    `╭───「 ⏱️ *Runtime Stats* 」───╮\n` +
                    `│\n` +
                    `│ ⏳ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
                    `│ 🟢 Active Bots: ${activeSockets.size}\n` +
                    `│\n` +
                    `│ 🧠 Heap Used: ${heapUsed} MB\n` +
                    `│ 🧠 Heap Total: ${heapTotal} MB\n` +
                    `│ 📦 RSS: ${rss} MB\n` +
                    `│ 💾 Total RAM: ${totalMem} MB\n` +
                    `│ 🟢 Free RAM: ${freeMem} MB\n` +
                    `│\n` +
                    `│ 🖥️ Node: ${process.version}\n` +
                    `│ 🌐 Platform: ${os.platform()}\n` +
                    `│\n` +
                    `╰───「 *ICON-X Mini* 」───╯`
            }, { quoted: msg });
    } catch (err) {
        await socket.sendMessage(sender, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
    break;
}

case 'translation3':
case 'translate': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(translation3|translate)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `📌 *Usage:* \`${userPrefix}translate <text>\`\n\n*Example:* \`${userPrefix}translate hello world\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🌐', key: msg.key } });
        
        const apiUrl = `https://api.popcat.xyz/translate?to=en&text=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data && response.data.translated) {
            await socket.sendMessage(sender, {
                text: `*🌍 Translation Result*\n\n📝 *Original:* ${text}\n\n✅ *Translated:* ${response.data.translated}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to translate the text. Please try again.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Translate command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ Translation service is currently unavailable.'
        }, { quoted: msg });
    }
    break;
}

case 'gfx5':
case 'tripletext': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(gfx5|tripletext)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔮 *GFX 5 Triple Text Generator*\n\n*Usage:* \`${userPrefix}gfx5 text1 | text2 | text3\`\n\n*Example:* \`${userPrefix}gfx5 ICON-X MD | AI\`\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
    }
    
    const parts = text.split('|').map(p => p.trim());
    if (parts.length !== 3) {
        return await socket.sendMessage(sender, {
            text: `⚠️ *Incorrect Format*\n\nPlease provide exactly three texts separated by "|"\n\n*Example:* \`${userPrefix}gfx5 Line1 | Line2 | Line3\``
        }, { quoted: msg });
    }
    
    const [text1, text2, text3] = parts;
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/image-creating/gfx5?apikey=75957eaec54d70ace3&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}&text3=${encodeURIComponent(text3)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🔮 *TRIPLE TEXT DESIGN*\n\n${text1}\n${text2}\n${text3}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('GFX5 command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to generate triple text design. Please try again.'
        }, { quoted: msg });
    }
    break;
}

case 'shimmer': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}shimmer\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `✨ *Shimmering AOV Avatar Generator*\n\n*Usage:* \`${userPrefix}shimmer <text>\`\n\n*Example:* \`${userPrefix}shimmer ICON-X MD\`\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/shimmering-aov-avaters?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `✨ *SHIMMERING AOV AVATAR*\n\n"${text}"\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Shimmer command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to generate shimmering avatar. Please try again.'
        }, { quoted: msg });
    }
    break;
}

case 'addapi': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}addapi\\s*`), '').trim();
    const args = text.split(' ');
    
    if (args.length < 3) {
        return await socket.sendMessage(sender, {
            text: `📌 *Add API to Database*\n\n*Usage:* \`${userPrefix}addapi <api_name> <developer> <api_url>\`\n\n*Example:* \`${userPrefix}addapi ICON-X MDAPI Mr Elephant https://api.iconxmd.com\``
        }, { quoted: msg });
    }
    
    try {
        const apiName = args[0];
        const developer = args[1];
        const apiUrl = args.slice(2).join(' ');
        
        try {
            new URL(apiUrl);
        } catch {
            return await socket.sendMessage(sender, {
                text: '❌ Invalid API URL format.'
            }, { quoted: msg });
        }
        
        const apiData = {
            name: apiName,
            developer: developer,
            url: apiUrl,
            description: "User submitted API",
            uploadedBy: developer,
            timestamp: Date.now()
        };
        
        await axios.post(
            `https://store-3f287-default-rtdb.firebaseio.com/apis.json`,
            apiData
        );
        
        await socket.sendMessage(sender, {
            text: `✅ *API Added Successfully*\n\n🌐 *Name:* ${apiName}\n👨‍💻 *Developer:* ${developer}\n🔗 *URL:* ${apiUrl}\n\n📊 Added to CodeWave database\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Add API command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to add API to database.'
        }, { quoted: msg });
    }
    break;
}

case 'mute': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '❌ This command only works in groups!'
        }, { quoted: msg });
    }
    
    const isAdmin = m.isAdmin;
    if (!isAdmin) {
        return await socket.sendMessage(sender, {
            text: '❌ You need to be a group admin to use this command!'
        }, { quoted: msg });
    }
    
    const isBotAdmin = m.isBotAdmin;
    if (!isBotAdmin) {
        return await socket.sendMessage(sender, {
            text: '❌ I need to be a group admin to mute/unmute!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔇', key: msg.key } });
        
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quotedSender) {
            await socket.groupParticipantsUpdate(from, [quotedSender], 'mute');
            await socket.sendMessage(sender, {
                text: `✅ *User Muted*\n\n🔇 Successfully muted the user in this group.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else if (args[0]) {
            let targetNumber = args[0].replace(/[^0-9]/g, '');
            if (targetNumber.length < 10) {
                return await socket.sendMessage(sender, {
                    text: '❌ Invalid phone number format! Use: .mute 26378xxxxxx'
                }, { quoted: msg });
            }
            
            const targetJid = `${targetNumber}@s.whatsapp.net`;
            await socket.groupParticipantsUpdate(from, [targetJid], 'mute');
            await socket.sendMessage(sender, {
                text: `✅ *User Muted*\n\n🔇 Successfully muted ${targetNumber} in this group.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            return await socket.sendMessage(sender, {
                text: `🔇 *Mute User*\n\n*Usage:* Reply to a user's message with \`${userPrefix}mute\`\n\n*OR*\n\nUse: \`${userPrefix}mute 26378xxxxxx\``
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Mute command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to mute user. Make sure:\n1. User is in the group\n2. I have admin permissions\n3. The user is not an admin'
        }, { quoted: msg });
    }
    break;
}

case 'unmute': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isGroup) {
        return await socket.sendMessage(sender, {
            text: '❌ This command only works in groups!'
        }, { quoted: msg });
    }
    
    const isAdmin = m.isAdmin;
    if (!isAdmin) {
        return await socket.sendMessage(sender, {
            text: '❌ You need to be a group admin to use this command!'
        }, { quoted: msg });
    }
    
    const isBotAdmin = m.isBotAdmin;
    if (!isBotAdmin) {
        return await socket.sendMessage(sender, {
            text: '❌ I need to be a group admin to mute/unmute!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔊', key: msg.key } });
        
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quotedSender) {
            await socket.groupParticipantsUpdate(from, [quotedSender], 'unmute');
            await socket.sendMessage(sender, {
                text: `✅ *User Unmuted*\n\n🔊 Successfully unmuted the user in this group.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else if (args[0]) {
            let targetNumber = args[0].replace(/[^0-9]/g, '');
            if (targetNumber.length < 10) {
                return await socket.sendMessage(sender, {
                    text: '❌ Invalid phone number format! Use: .unmute 26378xxxxxx'
                }, { quoted: msg });
            }
            
            const targetJid = `${targetNumber}@s.whatsapp.net`;
            await socket.groupParticipantsUpdate(from, [targetJid], 'unmute');
            await socket.sendMessage(sender, {
                text: `✅ *User Unmuted*\n\n🔊 Successfully unmuted ${targetNumber} in this group.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            return await socket.sendMessage(sender, {
                text: `🔊 *Unmute User*\n\n*Usage:* Reply to a user's message with \`${userPrefix}unmute\`\n\n*OR*\n\nUse: \`${userPrefix}unmute 26378xxxxxx\``
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Unmute command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to unmute user.'
        }, { quoted: msg });
    }
    break;
}

case 'block': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🚫', key: msg.key } });
        
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quotedSender) {
            await socket.updateBlockStatus(quotedSender, 'block');
            await socket.sendMessage(sender, {
                text: `✅ *User Blocked*\n\n🚫 Successfully blocked the user.\n\n📌 User can no longer message this bot.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else if (args[0]) {
            let targetNumber = args[0].replace(/[^0-9]/g, '');
            if (targetNumber.length < 10) {
                return await socket.sendMessage(sender, {
                    text: '❌ Invalid phone number format! Use: .block 26378xxxxxx'
                }, { quoted: msg });
            }
            
            const targetJid = `${targetNumber}@s.whatsapp.net`;
            await socket.updateBlockStatus(targetJid, 'block');
            await socket.sendMessage(sender, {
                text: `✅ *User Blocked*\n\n🚫 Successfully blocked ${targetNumber}.\n\n📌 User can no longer message this bot.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            return await socket.sendMessage(sender, {
                text: `🚫 *Block User*\n\n*Usage:* Reply to a user's message with \`${userPrefix}block\`\n\n*OR*\n\nUse: \`${userPrefix}block 26378xxxxxx\``
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Block command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to block user.'
        }, { quoted: msg });
    }
    break;
}

case 'unblock': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
        
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quotedSender) {
            await socket.updateBlockStatus(quotedSender, 'unblock');
            await socket.sendMessage(sender, {
                text: `✅ *User Unblocked*\n\n🔓 Successfully unblocked the user.\n\n📌 User can now message this bot again.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else if (args[0]) {
            let targetNumber = args[0].replace(/[^0-9]/g, '');
            if (targetNumber.length < 10) {
                return await socket.sendMessage(sender, {
                    text: '❌ Invalid phone number format! Use: .unblock 26378xxxxxx'
                }, { quoted: msg });
            }
            
            const targetJid = `${targetNumber}@s.whatsapp.net`;
            await socket.updateBlockStatus(targetJid, 'unblock');
            await socket.sendMessage(sender, {
                text: `✅ *User Unblocked*\n\n🔓 Successfully unblocked ${targetNumber}.\n\n📌 User can now message this bot again.\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            return await socket.sendMessage(sender, {
                text: `🔓 *Unblock User*\n\n*Usage:* Reply to a user's message with \`${userPrefix}unblock\`\n\n*OR*\n\nUse: \`${userPrefix}unblock 26378xxxxxx\``
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Unblock command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to unblock user.'
        }, { quoted: msg });
    }
    break;
}

case 'mini': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });

        const websiteLink = config.MINI_URL || 'https://icon-xmdmini.onrender.com/';
        const imageBuffer = fs.readFileSync('./lucid.jpg');

        await socket.sendMessage(from, {
            image: imageBuffer,
            caption:
                `╭───「 👑 *ICON-X Mini* 」───╮\n` +
                `│\n` +
                `│ 🌐 *Website:* ${websiteLink}\n` +
                `│\n` +
                `│ 🔧 *How to Pair:*\n` +
                `│ 1️⃣ Visit: ${websiteLink}\n` +
                `│ 2️⃣ Enter your number (e.g. 26378xxxxxxx)\n` +
                `│ 3️⃣ Get your 6-digit pairing code\n` +
                `│ 4️⃣ Open WhatsApp → Linked Devices\n` +
                `│ 5️⃣ Tap "Link a Device" → Enter code\n` +
                `│ 6️⃣ Bot connects automatically ✅\n` +
                `│\n` +
                `│ 💡 *Tips:*\n` +
                `│ • Use correct country code\n` +
                `│ • Code expires in 10 minutes\n` +
                `│ • Contact: +263781328870\n` +
                `│\n` +
                `╰───「 *Mr Elephant* 」───╯`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: (config.NEWSLETTER_JID || '').trim(),
                    newsletterName: '𝙸𝙲𝙾𝙽-𝚇',
                    serverMessageId: 143
                }
            }
        }, { quoted: msg });

    } catch (error) {
        console.error('Mini command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to send pairing information.'
        }, { quoted: msg });
    }
    break;
}

case 'getpp':
case 'getprofile': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '📸', key: msg.key } });
        
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        let targetJid;
        
        if (quotedSender) {
            targetJid = quotedSender;
        } else if (args[0]) {
            let targetNumber = args[0].replace(/[^0-9]/g, '');
            if (targetNumber.length < 10) {
                return await socket.sendMessage(sender, {
                    text: '❌ Invalid phone number format! Use: .getpp 26378xxxxxx'
                }, { quoted: msg });
            }
            targetJid = `${targetNumber}@s.whatsapp.net`;
        } else if (msg.key.participant) {
            targetJid = msg.key.participant;
        } else {
            return await socket.sendMessage(sender, {
                text: `📸 *Get Profile Picture*\n\n*Usage:* Reply to a user's message with \`${userPrefix}getpp\`\n\n*OR*\n\nUse: \`${userPrefix}getpp 26378xxxxxx\``
            }, { quoted: msg });
        }
        
        let profilePicUrl;
        try {
            profilePicUrl = await socket.profilePictureUrl(targetJid, 'image');
        } catch (error) {
            profilePicUrl = 'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png';
        }
        
        const [userInfo] = await socket.onWhatsApp(targetJid);
        const phoneNumber = targetJid.split('@')[0];
        const userName = userInfo?.exists ? userInfo.name || 'Unknown' : 'Unknown';
        
        await socket.sendMessage(sender, {
            image: { url: profilePicUrl },
            caption: `👤 *Profile Information*\n\n📱 *Number:* ${phoneNumber}\n👤 *Name:* ${userName}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`,
            mentions: [targetJid]
        }, { quoted: msg });
        
    } catch (error) {
        console.error('GetPP command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to get profile picture. User may not have a profile picture or may have privacy settings enabled.'
        }, { quoted: msg });
    }
    break;
}

case 'findapi': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const developer = q.replace(new RegExp(`^${userPrefix}findapi\\s*`), '').trim();
    
    if (!developer) {
        return await socket.sendMessage(sender, {
            text: `🔍 *Find API by Developer*\n\n*Usage:* \`${userPrefix}findapi <developer_name>\`\n\n*Example:* \`${userPrefix}findapi Mr Elephant\``
        }, { quoted: msg });
    }
    
    try {
        const response = await axios.get(`https://store-3f287-default-rtdb.firebaseio.com/apis.json`);
        const data = response.data;
        
        if (!data) {
            return await socket.sendMessage(sender, {
                text: `⚠️ No APIs found for developer: *${developer}*`
            }, { quoted: msg });
        }
        
        const filtered = Object.values(data).filter(api => api.developer === developer);
        
        if (filtered.length === 0) {
            return await socket.sendMessage(sender, {
                text: `⚠️ No APIs found for developer: *${developer}*`
            }, { quoted: msg });
        }
        
        let text = `🔎 *APIs by ${developer}*\n\n`;
        let i = 1;
        
        for (const api of filtered) {
            text += `*${i}.* 🌐 ${api.name}\n🔗 URL: ${api.url}\n📩 Uploaded by: ${api.uploadedBy}\n\n`;
            i++;
        }
        
        text += `📊 Total APIs: *${filtered.length}*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
        
        await socket.sendMessage(sender, { text }, { quoted: msg });
        
    } catch (error) {
        console.error('Find API command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to search for APIs.'
        }, { quoted: msg });
    }
    break;
}

case 'tiktok': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const link = q.replace(new RegExp(`^${userPrefix}tiktok\\s*`), '').trim();
    
    if (!link) {
        return await socket.sendMessage(sender, {
            text: `📽️ *TikTok Video Downloader*\n\n*Usage:* \`${userPrefix}tiktok <tiktok-url>\`\n\n*Example:* \`${userPrefix}tiktok https://vm.tiktok.com/ZMBW2aFWT/\``
        }, { quoted: msg });
    }
    
    if (!link.includes('tiktok.com')) {
        return await socket.sendMessage(sender, {
            text: '❌ *Invalid TikTok URL*\nPlease provide a valid TikTok video link!'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎬', key: msg.key } });
        
        await socket.sendMessage(sender, {
            text: '⏳ Downloading TikTok video, please wait...'
        }, { quoted: msg });
        
        const apiUrl = `https://kaiz-apis.gleeze.com/api/tiktok-dl?url=${encodeURIComponent(link)}`;
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const videoUrl = response.data?.videoUrl || response.data?.url || response.data?.result?.videoUrl;
        
        if (videoUrl) {
            await socket.sendMessage(sender, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: `╭━━〔 *🎬 𝙸𝙲𝙾𝙽-𝚇 TIKTOK* 〕━━╮\n` +
                        `┃ ┃ 📽️ *Video Downloaded Successfully*\n` +
                        `┃ ┃ 💻 *Powered by Mr Elephant*\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ *Could not download TikTok video*\nThe API might be temporarily unavailable.'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('TikTok command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to download TikTok video*\nError: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

case 'ytmp3': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}ytmp3\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `🎵 *YouTube to MP3*\n\n*Usage:* \`${userPrefix}ytmp3 <youtube-url>\`\n\n*Example:* \`${userPrefix}ytmp3 https://youtu.be/2WmBa1CviYE\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎵', key: msg.key } });
        
        await socket.sendMessage(sender, {
            text: '⏳ Converting YouTube video to MP3...'
        }, { quoted: msg });
        
        const apiUrl = `https://apiskeith.vercel.app/download/ytmp3?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.status && response.data.result?.url) {
            const audioUrl = response.data.result.url;
            const filename = response.data.result.filename || 'audio.mp3';
            
            await socket.sendMessage(sender, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: filename,
                caption: `🎧 *YouTube to MP3*\n\n📁 *File:* ${filename}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ *Failed to convert YouTube video to MP3*'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Ytmp3 command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Conversion Failed*\nError: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

case 'expand': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const shortUrl = q.replace(new RegExp(`^${userPrefix}expand\\s*`), '').trim();
    
    if (!shortUrl) {
        return await socket.sendMessage(sender, {
            text: `🔍 *URL Expander*\n\n*Usage:* \`${userPrefix}expand <short-url>\`\n\n*Example:* \`${userPrefix}expand https://bit.ly/example\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        const response = await fetch(shortUrl, { redirect: 'manual' });
        const longUrl = response.headers.get('location');
        
        if (longUrl) {
            await socket.sendMessage(sender, {
                text: `🔗 *Original URL Found*\n\n${longUrl}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ *Could not expand URL*'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Expand command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ *Failed to expand URL*'
        }, { quoted: msg });
    }
    break;
}

case 'shorturl': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const input = q.replace(new RegExp(`^${userPrefix}shorturl\\s*`), '').trim();
    const [url, service = 'tinyurl'] = input.split(' ');
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `🔗 *URL Shortener*\n\n*Usage:* \`${userPrefix}shorturl <url> [service]\`\n\n*Services:* tinyurl, bitly, isgd\n\n*Example:* \`${userPrefix}shorturl https://example.com tinyurl\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔗', key: msg.key } });
        
        let shortUrl;
        
        if (service === 'bitly') {
            const bitlyToken = ''; // Add your Bitly token here
            const response = await axios.post('https://api-ssl.bitly.com/v4/shorten', {
                long_url: url
            }, {
                headers: {
                    'Authorization': `Bearer ${bitlyToken}`,
                    'Content-Type': 'application/json'
                }
            });
            shortUrl = response.data.link;
        } else if (service === 'isgd') {
            const response = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
            shortUrl = response.data;
        } else {
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            shortUrl = response.data;
        }
        
        if (shortUrl) {
            await socket.sendMessage(sender, {
                text: `🔗 *Shortened URL (${service.toUpperCase()})*\n\n${shortUrl}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *Failed to shorten URL using ${service}*`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Shorturl command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to shorten URL*\nError: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

case 'ytstalk': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const username = q.replace(new RegExp(`^${userPrefix}ytstalk\\s*`), '').trim();
    
    if (!username) {
        return await socket.sendMessage(sender, {
            text: `📺 *YouTube Channel Stalker*\n\n*Usage:* \`${userPrefix}ytstalk <username/channel>\`\n\n*Example:* \`${userPrefix}ytstalk Mr Elephant\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        const formattedUsername = username.startsWith('@') ? username : `@${username}`;
        const apiUrl = `https://apiskeith.vercel.app/stalker/ytchannel?user=${encodeURIComponent(formattedUsername)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.status && response.data.result?.channel) {
            const channel = response.data.result.channel;
            const videos = response.data.result.videos || [];
            
            let message = `📺 *YouTube Channel Info*\n\n`;
            message += `👤 *Channel:* ${channel.username}\n`;
            message += `🔗 *URL:* ${channel.url}\n`;
            message += `📝 *Description:* ${channel.description?.substring(0, 100) || 'No description'}...\n`;
            message += `👥 *Subscribers:* ${channel.stats?.subscribers?.toLocaleString() || 'N/A'}\n`;
            message += `🎬 *Total Videos:* ${channel.stats?.videos?.toLocaleString() || 'N/A'}\n\n`;
            
            if (videos.length > 0) {
                message += `📌 *Recent Videos:*\n`;
                videos.slice(0, 3).forEach((video, index) => {
                    message += `\n${index + 1}. *${video.title}*\n`;
                    message += `   👁️ ${video.views?.toLocaleString() || 0} views\n`;
                    message += `   📅 ${video.published || 'Unknown date'}\n`;
                });
            }
            
            message += `\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
            
            await socket.sendMessage(sender, {
                text: message
            }, { quoted: msg });
            
            if (channel.avatar) {
                await socket.sendMessage(sender, {
                    image: { url: channel.avatar },
                    caption: `🖼️ ${channel.username}'s Channel Avatar`
                }, { quoted: msg });
            }
            
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *YouTube channel "${username}" not found*`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Ytstalk command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to fetch YouTube channel info*`
        }, { quoted: msg });
    }
    break;
}

case 'countryinfo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const country = q.replace(new RegExp(`^${userPrefix}countryinfo\\s*`), '').trim();
    
    if (!country) {
        return await socket.sendMessage(sender, {
            text: `🌍 *Country Information*\n\n*Usage:* \`${userPrefix}countryinfo <country-name>\`\n\n*Example:* \`${userPrefix}countryinfo Kenya\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🌍', key: msg.key } });
        
        const apiUrl = `https://apiskeith.vercel.app/stalker/country?region=${encodeURIComponent(country)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.status && response.data.result) {
            const result = response.data.result;
            const basicInfo = result.basicInfo || {};
            const geography = result.geography || {};
            const culture = result.culture || {};
            
            let message = `🌍 *Country Information*\n\n`;
            message += `🏷️ *Name:* ${basicInfo.name || country}\n`;
            message += `🏙️ *Capital:* ${basicInfo.capital || 'N/A'}\n`;
            message += `📞 *Phone Code:* ${basicInfo.phoneCode || 'N/A'}\n`;
            message += `🌐 *Internet TLD:* ${basicInfo.internetTLD || 'N/A'}\n\n`;
            
            if (geography.continent) {
                message += `🌄 *Geography*\n`;
                message += `📌 *Continent:* ${geography.continent.name || 'N/A'}\n`;
                message += `📏 *Area:* ${geography.area?.sqKm?.toLocaleString() || 'N/A'} km²\n`;
                message += `📍 *Coordinates:* ${geography.coordinates?.latitude || 'N/A'}, ${geography.coordinates?.longitude || 'N/A'}\n\n`;
            }
            
            if (culture.languages) {
                message += `🗣️ *Languages:* ${culture.languages.native?.join(', ') || 'N/A'}\n`;
                message += `💰 *Currency:* ${result.government?.currency || 'N/A'}\n`;
                message += `🚗 *Driving Side:* ${culture.drivingSide || 'N/A'}\n\n`;
            }
            
            message += `_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
            
            await socket.sendMessage(sender, {
                text: message
            }, { quoted: msg });
            
            if (basicInfo.flag) {
                await socket.sendMessage(sender, {
                    image: { url: basicInfo.flag },
                    caption: `🇺🇳 Flag of ${basicInfo.name || country}`
                }, { quoted: msg });
            }
            
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *Country "${country}" not found*`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Countryinfo command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to fetch country information*`
        }, { quoted: msg });
    }
    break;
}

case 'apiwatcher': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const response = await axios.get(`https://store-3f287-default-rtdb.firebaseio.com/apis.json`);
        const data = response.data;
        
        if (!data) {
            return await socket.sendMessage(sender, {
                text: '⚠️ No APIs have been published yet.'
            }, { quoted: msg });
        }
        
        let text = "📡 *Explore Published APIs*\n\n";
        let i = 1;
        
        for (const api of Object.values(data)) {
            text += `*${i}.* 🌐 ${api.name}\n👨‍💻 Dev: ${api.developer}\n🔗 URL: ${api.url}\n📩 Uploaded by: ${api.uploadedBy}\n\n`;
            i++;
        }
        
        text += `📊 Total APIs: *${Object.keys(data).length}*\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
        
        await socket.sendMessage(sender, { text }, { quoted: msg });
        
    } catch (error) {
        console.error('API Watcher command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to fetch APIs.'
        }, { quoted: msg });
    }
    break;
}

case 'apitotal': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const response = await axios.get(`https://store-3f287-default-rtdb.firebaseio.com/apis.json`);
        const data = response.data;
        
        const total = data ? Object.keys(data).length : 0;
        
        await socket.sendMessage(sender, {
            text: `🌐 *Total APIs in Database*\n\n📊 Count: *${total}*\n\n🔗 Visit: codewave-unit-force.zone.id/explore/apis\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('API Total command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to fetch API count.'
        }, { quoted: msg });
    }
    break;
}  
        
case 'owner': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });

        const ownerNumber = config.OWNER_NUMBER || '2637811328870';

        const vcard =
            `BEGIN:VCARD\n` +
            `VERSION:3.0\n` +
            `N:ICON-X Mini\n` +
            `FN:Mr Elephant\n` +
            `ORG:Mr Elephant Inc.\n` +
            `TITLE:CEO & Founder\n` +
            `item1.TEL;waid=${ownerNumber}:+${ownerNumber}\n` +
            `item1.X-ABLabel:Click here to chat\n` +
            `item2.X-ABLabel:Location: Harare, Zimbabwe\n` +
            `END:VCARD`;

        const imageBuffer = fs.readFileSync('./lucid.jpg');

        await socket.sendMessage(from, {
            image: imageBuffer,
            caption:
                `╭───「 👑 *Owner Info* 」───╮\n` +
                `│\n` +
                `│ 👤 *Name:* Lucid N\n` +
                `│ 📱 *Phone:* +${ownerNumber}\n` +
                `│ 🏢 *Company:* ICON-X MD TECH.\n` +
                `│ 📍 *Location:* Masvingo, Zimbabwe\n` +
                `│ 🌐 *Web:* https://icon-xmdmini.onrender.com/\n` +
                `│ ⏰ *Hours:* 9AM – 10PM CAT\n` +
                `│\n` +
                `╰───「 *ICON-X MD* 」───╯`
        }, { quoted: msg });

        await socket.sendMessage(from, {
            contacts: {
                displayName: `👑 Lucid N – Mr Elephant`,
                contacts: [{ vcard }]
            }
        }, { quoted: msg });

        await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error('Owner command error:', error);
        await socket.sendMessage(sender, {
            text: `👑 *Owner Contact*\n\n📞 +263782313021\n💬 https://wa.me/263782313021`
        }, { quoted: msg });
    }
    break;
}

// Emoji to GIF converter
case 'emoji2gif': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const emoji = q.replace(new RegExp(`^${userPrefix}emoji2gif\\s*`), '').trim();
    
    if (!emoji) {
        return await socket.sendMessage(sender, {
            text: `✨ *Emoji to GIF Converter*\n\nUsage: ${userPrefix}emoji2gif [emoji]\nExample: ${userPrefix}emoji2gif 😘\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
    }
    
    if (emoji.length > 3) {
        return await socket.sendMessage(sender, {
            text: '❌ *Invalid Emoji*\n\nPlease send only **one emoji**.'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/converter/emoji2gif?apikey=75957eaec54d70ace3&emoji=${encodeURIComponent(emoji)}`;
        
        await socket.sendMessage(sender, {
            video: { url: apiUrl },
            caption: `✨ *Here is your animated emoji!*\n\nEmoji: ${emoji}\n\n*Powered by Mr Elephant*`,
            gifPlayback: true,
            mimetype: 'video/gif'
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Emoji2Gif command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Could Not Convert Emoji*\n\nMaybe the emoji is unsupported or API failed. Try another one!\n\n*Powered by Mr Elephant*'
        }, { quoted: msg });
    }
    break;
}

// Stylish text generator
case 'font': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const userInput = q.replace(new RegExp(`^${userPrefix}font\\s*`), '').trim();
    
    if (!userInput) {
        return await socket.sendMessage(sender, {
            text: `✨ *Stylish Text Generator*\n\nUsage: ${userPrefix}font [your_text]\nExample: ${userPrefix}font Maher Zubair\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
    }
    
    if (userInput.length > 50) {
        return await socket.sendMessage(sender, {
            text: '❌ *Text Too Long*\n\nMaximum allowed is 50 characters.'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/misc/stylish-text?apikey=75957eaec54d70ace3&text=${encodeURIComponent(userInput)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data?.data?.length) {
            return await socket.sendMessage(sender, {
                text: '❌ No stylish text found.'
            }, { quoted: msg });
        }
        
        let stylishOutput = `✨ *Stylish Text for:* ${userInput}\n\n`;
        response.data.data.slice(0, 20).forEach((style, idx) => {
            stylishOutput += `*${idx + 1}.* ${style}\n`;
        });
        
        await socket.sendMessage(sender, {
            text: stylishOutput + '\n*Powered by Mr Elephant*'
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Font command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Could Not Generate Stylish Text*\n\nTry again later or with different text.\n\n*Powered by Mr Elephant*'
        }, { quoted: msg });
    }
    break;
}

// Drake meme generator
case 'drake': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}drake\\s*`), '').trim();
    const args = text.split('|').map(t => t.trim());
    
    if (args.length !== 2) {
        return await socket.sendMessage(sender, {
            text: `🎶 *Drake Meme Generator*\n\nUsage: ${userPrefix}drake [bad_thing]|[good_thing]\nExample: ${userPrefix}drake amongus|amogus\nMax 25 characters per side\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
    }
    
    const [text1, text2] = args;
    
    if (text1.length > 25 || text2.length > 25) {
        return await socket.sendMessage(sender, {
            text: `❌ *Too Much Text*\n\nLeft: ${text1.length}/25\nRight: ${text2.length}/25\n\nKeep it short like Drake's songs!`
        }, { quoted: msg });
    }
    
    const blockedPatterns = [
        /fuck|shit|asshole|bitch|cunt/i,
        /n[i1!]+gg[e3r]*/i
    ];
    
    if ([text1, text2].some(t => blockedPatterns.some(p => p.test(t)))) {
        return await socket.sendMessage(sender, {
            text: '❌ *Inappropriate Content*\n\nDrake prefers clean memes'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎶', key: msg.key } });
        
        const apiUrl = `https://api.popcat.xyz/drake?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🎶 *Drake Reaction*\n\n❌ ${text1}\n✅ ${text2}\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Drake command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Could Not Generate*\n\nAPI failed but here\'s a premade one!\n\n*Powered by Mr Elephant*'
        }, { quoted: msg });
    }
    break;
}

// Oogway wisdom generator
case 'oogway': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const trimmedText = q.replace(new RegExp(`^${userPrefix}oogway\\s*`), '').trim();
    
    if (!trimmedText) {
        return await socket.sendMessage(sender, {
            text: `🐢 *Master Oogway Quote Generator*\n\nUsage: ${userPrefix}oogway [your_wisdom]\nExample: ${userPrefix}oogway Yesterday is history\nMax 100 characters\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
    }
    
    if (trimmedText.length > 100) {
        return await socket.sendMessage(sender, {
            text: `❌ *Too Much Text*\n\nYour text: ${trimmedText.length}/100 characters\n\nBe wise, but be brief like Oogway!`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🐢', key: msg.key } });
        
        const apiUrl = `https://api.popcat.xyz/v2/oogway?text=${encodeURIComponent(trimmedText)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🐢 *Master Oogway Wisdom*\n\n📝 ${trimmedText}\n\n*Powered by Mr Elephant*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Oogway command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Could Not Generate Wisdom*\n\nAPI failed but Master Oogway still smiles!\n\n*Powered by Mr Elephant*'
        }, { quoted: msg });
    }
    break;
}

// Test API command
case 'testapi': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const apiUrl = q.replace(new RegExp(`^${userPrefix}testapi\\s*`), '').trim();
    
    if (!apiUrl) {
        return await socket.sendMessage(sender, {
            text: `🧪 *Example:* ${userPrefix}testapi <API endpoint or prompt>`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🧪', key: msg.key } });
        
        const loadingMsg = await socket.sendMessage(sender, {
            text: `╭───────────────╮\n│ ⏳ Testing API... │\n╰───────────────╯\n*Developed by Mr Elephant*\n*Bot:* ICON-X AI Beta`
        }, { quoted: msg });
        
        const response = await axios.get(apiUrl);
        const contentType = response.headers['content-type'];
        
        if (contentType.includes('image')) {
            await socket.sendMessage(sender, {
                image: { url: apiUrl },
                caption: `🖼️ *API Test Result*\n> ${apiUrl}\n\n🤖 Bot: ICON-X AI Beta\n_Developed by Mr Elephant_`
            }, { quoted: msg });
        } else if (contentType.includes('video')) {
            await socket.sendMessage(sender, {
                video: { url: apiUrl },
                caption: `🎥 *API Test Result*\n> ${apiUrl}\n\n🤖 Bot: ICON-X AI Beta\n_Developed by Mr Elephant_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `📄 *API Test Result*\n> ${JSON.stringify(response.data, null, 2)}\n\n🤖 Bot: ICON-X AI Beta\n_Developed by Mr Elephant_`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error("TestAPI command error:", error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to test API.*\nPlease check your endpoint or try again later.`
        }, { quoted: msg });
    }
    break;
}

// AI Video generator
case 'aivideo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const prompt = q.replace(new RegExp(`^${userPrefix}aivideo\\s*`), '').trim();
    
    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `🎬 *Example:* ${userPrefix}aivideo A woman cry`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📽️', key: msg.key } });
        
        const loadingMsg = await socket.sendMessage(sender, {
            text: `╭───────────────╮\n│ ⏳ Generating AI Video... │\n╰───────────────╯\n*Developed by Mr Elephant*\n*Bot:* ICON-X AI Beta`
        }, { quoted: msg });
        
        const api = `https://eliteprotech-apis.zone.id/aivideo?q=${encodeURIComponent(prompt)}&type=video`;
        const response = await axios.get(api);
        
        if (!response.data?.success || !response.data.result?.url) {
            return await socket.sendMessage(sender, {
                text: '❌ *Failed to generate AI video.* Please try again later.'
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            video: { url: response.data.result.url },
            caption: `🎥 *AI Generated Video*\n> *Prompt:* ${prompt}\n\n🤖 *Bot:* ICON-X AI Beta\n_Developed by Mr Elephant_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error("AI Video command error:", error);
        await socket.sendMessage(sender, {
            text: `❌ *Error generating AI video.*\nPlease try again later.`
        }, { quoted: msg });
    }
    break;
}

// AI Photo to video converter
case 'aiphoto': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } });
        
        if (!msg.message?.imageMessage && !msg.quoted?.imageMessage) {
            return await socket.sendMessage(sender, {
                text: `🖼️ *Reply to a photo to generate AI video.*\n\n*Usage:* Reply to an image with \`${userPrefix}aiphoto\``
            }, { quoted: msg });
        }
        
        const loadingMsg = await socket.sendMessage(sender, {
            text: `╭───────────────╮\n│ ⏳ Generating AI Video... │\n╰───────────────╯\n*Developed by Mr Elephant*\n*Bot:* ICON-X AI Beta`
        }, { quoted: msg });
        
        const imageMessage = msg.message?.imageMessage || msg.quoted?.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const DID_KEY = '8ADi1W5ZEs2-xlP5NbbSP';
        const AUTH_HEADER = `Basic ${Buffer.from(`${DID_KEY}:`).toString('base64')}`;
        
        const upload = await axios.post('https://api.d-id.com/images', buffer, {
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'image/jpeg',
            },
        });
        
        const imageUrl = upload.data.url;
        
        const createTalk = await axios.post('https://api.d-id.com/talks', {
            source_url: imageUrl,
            script: {
                type: 'text',
                input: 'Hello, this is your AI generated video!',
            },
            config: { fluent: true }
        }, {
            headers: {
                'Authorization': AUTH_HEADER,
                'Content-Type': 'application/json',
            },
        });
        
        const talkId = createTalk.data.id;
        
        let videoUrl = null;
        for (let i = 0; i < 20; i++) {
            const status = await axios.get(`https://api.d-id.com/talks/${talkId}`, {
                headers: { 'Authorization': AUTH_HEADER },
            });
            
            if (status.data.result_url) {
                videoUrl = status.data.result_url;
                break;
            }
            await new Promise(res => setTimeout(res, 3000));
        }
        
        if (!videoUrl) {
            return await socket.sendMessage(sender, {
                text: '❌ *Video generation timed out. Try again later.*'
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            video: { url: videoUrl },
            caption: `🎥 *AI Photo → Video*\n🤖 *ICON-X AI Beta*\n_Developed by Mr Elephant_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('AIPhoto command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ *Failed to generate AI video.*'
        }, { quoted: msg });
    }
    break;
}

// Affect meme generator
case 'affect': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const imageUrl = q.replace(new RegExp(`^${userPrefix}affect\\s*`), '').trim();
    
    if (!imageUrl) {
        return await socket.sendMessage(sender, {
            text: `🎭 *Affect Meme Generator* 🎭\n\nUsage: ${userPrefix}affect [image URL]\nExample: ${userPrefix}affect https://i.pinimg.com/564x/c1/43/af/c143afa8d927349d5b66854a9ed08f14.jpg\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    const urlPattern = /^https?:\/\/[^\s]+$/i;
    if (!urlPattern.test(imageUrl)) {
        return await socket.sendMessage(sender, {
            text: '❌ Please provide a valid image URL.'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🎭', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/memes/affect?apikey=${apiKey}&img=${encodeURIComponent(imageUrl)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: '🎭 *Here is your affected meme!* 🎭\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*'
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Affect command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Oops! Something went wrong while generating your meme.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Naughty SpongeBob meme
case 'naughtyspongebob': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}naughtyspongebob\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🧽 *Naughty SpongeBob Meme Generator* 🧽\n\nUsage: ${userPrefix}naughtyspongebob [text]\nExample: ${userPrefix}naughtyspongebob Let\\'s Do IT\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🧽', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/memes/naughty-sponge-bob?apikey=${apiKey}&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🧽 *Naughty SpongeBob Meme*\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Naughty SpongeBob command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Naughty SpongeBob meme.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Sad Black Man meme
case 'sadblackman': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}sadblackman\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `😢 *Sad Black Man Meme Generator* 😢\n\nUsage: ${userPrefix}sadblackman [text1] | [text2]\nExample: ${userPrefix}sadblackman ICON-X Ai Beta | ICON-X Ai Beta\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    const parts = text.split('|').map(p => p.trim());
    if (parts.length !== 2) {
        return await socket.sendMessage(sender, {
            text: '❌ Please provide exactly two texts separated by "|".'
        }, { quoted: msg });
    }
    
    const [text1, text2] = parts;
    
    try {
        await socket.sendMessage(sender, { react: { text: '😢', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/memes/sad-black-man?apikey=${apiKey}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `😢 *Sad Black Man Meme*\n\nTop Text: ${text1}\nBottom Text: ${text2}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Sad Black Man command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Sad Black Man meme.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// My Heart meme generator
case 'myheart': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}myheart\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `❤️ *My Heart Meme Generator* ❤️\n\nUsage: ${userPrefix}myheart [text1] | [text2] | [text3]\nExample: ${userPrefix}myheart when my brother calls me | when my mother calls me | when my father calls me\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    const parts = text.split('|').map(p => p.trim());
    if (parts.length !== 3) {
        return await socket.sendMessage(sender, {
            text: '❌ Please provide exactly three texts separated by "|".'
        }, { quoted: msg });
    }
    
    const [text1, text2, text3] = parts;
    
    try {
        await socket.sendMessage(sender, { react: { text: '❤️', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/memes/my-heart?apikey=${apiKey}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}&text3=${encodeURIComponent(text3)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `❤️ *My Heart Meme*\n\n1️⃣ ${text1}\n2️⃣ ${text2}\n3️⃣ ${text3}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('My Heart command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate My Heart meme.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Colorful Neon Light text
case 'colorfulneon': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}colorfulneon\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🌈 *Colorful Neon Light Text Generator* 🌈\n\nUsage: ${userPrefix}colorfulneon [text]\nExample: ${userPrefix}colorfulneon Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🌈', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/ephoto360/colorful-neon-light?apikey=${apiKey}&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🌈 *Colorful Neon Light*\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Colorful Neon command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Colorful Neon Light text.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Avengers logo generator
case 'avengers': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}avengers\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🛡️ *Avengers Logo Generator* 🛡️\n\nUsage: ${userPrefix}avengers [text1] | [text2]\nExample: ${userPrefix}avengers Maher | Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    const parts = text.split('|').map(p => p.trim());
    if (parts.length !== 2) {
        return await socket.sendMessage(sender, {
            text: '❌ Please provide exactly two texts separated by "|".'
        }, { quoted: msg });
    }
    
    const [text1, text2] = parts;
    
    try {
        await socket.sendMessage(sender, { react: { text: '🛡️', key: msg.key } });
        
        const apiKey = '75957eaec54d70ace3';
        const apiUrl = `https://api.nexoracle.com/ephoto360/avengers?apikey=${apiKey}&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🛡️ *Avengers Logo*\n\n${text1} | ${text2}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Avengers command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Avengers logo.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Bloody text generator
case 'bloody':
case 'bloodytext': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(bloody|bloodytext)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `*Bloody Text Generator*\n\nUsage: ${userPrefix}bloody [text]\nExample: ${userPrefix}bloody Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🩸', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/bloody-text2?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `*Bloody Text*\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Bloody Text command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate bloody text image.*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// Blackpink style generator
case 'blackpink': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}blackpink\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🖤💖 *Blackpink Style Generator* 🖤💖\n\nUsage: ${userPrefix}blackpink [text]\nExample: ${userPrefix}blackpink Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🖤', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/blackpink?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🖤💖 *BLΛƆKPIИK Style* 💖🖤\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Blackpink command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Blackpink style text*\nPlease try again later.'
        }, { quoted: msg });
    }
    break;
}

// COD Warzone text generator
case 'warzone':
case 'codwarzone': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(warzone|codwarzone)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔫 *Call of Duty: Warzone Text Generator* 🔫\n\nUsage: ${userPrefix}warzone [text1] | [text2]\nExample: ${userPrefix}warzone Maher | Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    const parts = text.split('|').map(p => p.trim());
    if (parts.length !== 2) {
        return await socket.sendMessage(sender, {
            text: '⚠️ *Incorrect Format* ⚠️\n\nPlease provide exactly two texts separated by "|"\nExample: .warzone Player | One'
        }, { quoted: msg });
    }
    
    const [text1, text2] = parts;
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔫', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/cod-warzone?apikey=75957eaec54d70ace3&text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🎮 *Call of Duty: Warzone*\n\n${text1.toUpperCase()} ${text2.toUpperCase()}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Warzone command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate Warzone text*\nThe Verdansk servers might be down!'
        }, { quoted: msg });
    }
    break;
}

// 3D Cubic text generator
case 'cubic':
case '3dcubic': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(cubic|3dcubic)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🧊 *3D Cubic Text Generator* 🧊\n\nUsage: ${userPrefix}cubic [text]\nExample: ${userPrefix}cubic Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🧊', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/cubic-3d?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🧊 *3D Cubic Text Effect*\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('3D Cubic command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate 3D cubic text*\nThe render engine might be overloaded!'
        }, { quoted: msg });
    }
    break;
}

// Cyber Hunter text generator
case 'cyberhunter':
case 'cyberhunt': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(cyberhunter|cyberhunt)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔮 *Cyber Hunter Text Generator* 🔮\n\nUsage: ${userPrefix}cyberhunter [text]\nExample: ${userPrefix}cyberhunter Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔮', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/cyber-hunter?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `🔮 *CYBER HUNTER*\n\n「 ${text.toUpperCase()} 」\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Cyber Hunter command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Matrix System Failure*\nFailed to generate cyber text. Try again later.'
        }, { quoted: msg });
    }
    break;
}

// Bokeh text generator
case 'bokeh':
case 'bokehtext': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(bokeh|bokehtext)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `✨ *Bokeh Text Generator* ✨\n\nUsage: ${userPrefix}bokeh [text]\nExample: ${userPrefix}bokeh Maher Zubair\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/ephoto360/bokeh-text?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `✨ *Bokeh Text Effect*\n\n"${text}"\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Bokeh command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Failed to generate bokeh text effect*\nThe service might be temporarily unavailable'
        }, { quoted: msg });
    }
    break;
}

// GFX 12 Glow text generator
case 'gfx12':
case 'gfxglow': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(gfx12|gfxglow)\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `✨ *GFX 12 Glow Text Generator* ✨\n\nUsage: ${userPrefix}gfx12 [text]\nExample: ${userPrefix}gfx12 GLOW\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/image-creating/gfx12?apikey=75957eaec54d70ace3&text=${encodeURIComponent(text)}`;
        
        await socket.sendMessage(sender, {
            image: { url: apiUrl },
            caption: `✨ *GLOWING GFX 12*\n\n${text.toUpperCase()}\n\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ ʙᴇᴛᴀ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('GFX 12 command error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *Glow Effect Failed*\nThe luminescent particles dispersed!'
        }, { quoted: msg });
    }
    break;
}

// TikTok stalker
case 'tiktokstalk': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const username = q.replace(new RegExp(`^${userPrefix}tiktokstalk\\s*`), '').trim();
    
    if (!username) {
        return await socket.sendMessage(sender, {
            text: `📱 *TikTok Stalker* says:\n❌ Please provide a TikTok username!\n\n📌 *Example:*\n${userPrefix}tiktokstalk keizzah4189`
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        const apiUrl = `https://apiskeith.vercel.app/stalker/tiktok?user=${username}`;
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentDate = new Date().toLocaleDateString();
        
        const response = await axios.get(apiUrl);
        const { status, creator, result } = response.data;
        
        if (!status || !result) {
            return await socket.sendMessage(sender, {
                text: `❌ TikTok profile "${username}" not found or private`
            }, { quoted: msg });
        }
        
        let message = `📱 *TikTok Profile: @${result.profile.username}*\n\n` +
                     `📅 *Current Date:* ${currentDate}\n` +
                     `🕒 *Current Time:* ${currentTime}\n` +
                     `⚙️ *creator:* Mr Elephant\n\n` +
                     `👤 *Profile Info:*\n` +
                     `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                     `✨ *Display Name:* ${result.profile.nickname}\n` +
                     `📝 *Bio:* ${result.profile.bio || 'No bio'}\n` +
                     `🔒 *Private Account:* ${result.profile.private ? 'Yes' : 'No'}\n` +
                     `✅ *Verified:* ${result.profile.verified ? 'Yes' : 'No'}\n` +
                     `📅 *Created:* ${new Date(result.profile.createdAt).toLocaleDateString()}\n\n` +
                     `📊 *Statistics:*\n` +
                     `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                     `👥 *Followers:* ${result.stats.followers.toLocaleString()}\n` +
                     `💞 *Following:* ${result.stats.following.toLocaleString()}\n` +
                     `❤️ *Total Likes:* ${result.stats.likes.toLocaleString()}\n` +
                     `🎬 *Videos:* ${result.stats.videos.toLocaleString()}\n` +
                     `👫 *Friends:* ${result.stats.friends.toLocaleString()}\n\n` +
                     `🤖 *Processed by ICON-X AI Beta*`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
        if (result.profile.avatars?.large) {
            await socket.sendMessage(sender, { 
                image: { url: result.profile.avatars.large },
                caption: `🖼️ Profile Picture: @${result.profile.username}`
            }, { quoted: msg });
        }
        
    } catch (err) {
        console.error('TikTok stalk error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *Profile Search Failed*\n\nError: ${err.message}\n\nPlease try again later.`
        }, { quoted: msg });
    }
    break;
}

// NGL message sender
case 'ngl': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    if (!q) {
        return await socket.sendMessage(sender, {
            text: `📬 *NGL Message Sender*\n\nUsage:\n${userPrefix}ngl <username> | <message> | <type>\n\n▪ <username>: the NGL link username\n▪ <message>: message you want to send\n▪ <type>: anonymous or standard`
        }, { quoted: msg });
    }
    
    const parts = q.split('|').map(p => p.trim());
    const [link, message, type] = parts;
    
    if (!link || !message || !type) {
        return await socket.sendMessage(sender, {
            text: `❌ *Invalid format.*\nExample:\n${userPrefix}ngl username | Hello there! | anonymous`
        }, { quoted: msg });
    }
    
    if (!['anonymous', 'standard'].includes(type.toLowerCase())) {
        return await socket.sendMessage(sender, {
            text: '❌ *Invalid type.* Type must be "anonymous" or "standard".'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📬', key: msg.key } });
        
        const apiUrl = `https://www.apis-codewave-unit-force.zone.id/api/ngl?link=${encodeURIComponent(link)}&message=${encodeURIComponent(message)}&type=${encodeURIComponent(type.toLowerCase())}`;
        const res = await axios.get(apiUrl);
        const data = res.data;
        
        if (!data || data.status !== 200 || !data.success) {
            return await socket.sendMessage(sender, {
                text: '❌ *Failed to send NGL message.*\nPlease check the link, message or type and try again.'
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            text: `✅ *Message sent successfully!*\n\n🔗 Link: ${link}\n📩 Message: ${message}\n👤 Type: ${type}`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('NGL API error:', error);
        await socket.sendMessage(sender, {
            text: '⚠️ *NGL request failed.* Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// NGL send (alternative)
case 'nglsend': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    if (!q) {
        return await socket.sendMessage(sender, {
            text: `📬 *NGL Send*\n\nPlease provide your NGL link and a message!\nExample: ${userPrefix}nglsend https://ngl.link/yourusername | Hello there!`
        }, { quoted: msg });
    }
    
    try {
        const [link, nglText] = q.split('|').map(v => v.trim());
        if (!link || !nglText) {
            return await socket.sendMessage(sender, {
                text: `❌ Invalid format! Please use the format:\n${userPrefix}nglsend https://ngl.link/yourusername | Your message`
            }, { quoted: msg });
        }
        
        const apiUrl = `https://api.siputzx.my.id/api/tools/ngl?link=${encodeURIComponent(link)}&text=${encodeURIComponent(nglText)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.status === true) {
            await socket.sendMessage(sender, {
                text: `✅ Successfully sent the message to NGL!\n\n*Message Sent:* ${nglText}`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to send the message to NGL. Please try again later.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('NGL send error:', error);
        await socket.sendMessage(sender, {
            text: 'An error occurred while sending your NGL message. Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// Simi AI chat
case 'simi': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}simi\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `💬 *Simi AI Chat*\n\n*Usage:* \`${userPrefix}simi <question>\`\n\n*Example:* \`${userPrefix}simi Hello, how are you?\``
        }, { quoted: msg });
    }
    
    try {
        const apiUrl = `https://vapis.my.id/api/simi?q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.status === true && response.data.result) {
            await socket.sendMessage(sender, {
                text: `💬 *Simi AI*\n\n${response.data.result}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch response from Simi AI. Please try again later.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Simi command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred while fetching the AI response. Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// Information command
case 'information': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        const userName = m.pushName || "Unknown User";
        const userNumber = sender.split('@')[0];
        const batteryLevel = "Not supported";
        
        await socket.sendMessage(sender, {
            text: `🕒 *Current Time:* ${hours}:${minutes}:${seconds}\n📱 *Battery:* ${batteryLevel}\n👤 *User:* ${userName}\n📞 *Number:* ${userNumber}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Information command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred while getting the information.'
        }, { quoted: msg });
    }
    break;
}

// Fun code prank
case 'funCode': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, {
            text: '🔒 *Validating your request...* Please wait while I check your info... ⏳'
        }, { quoted: msg });
        
        let progress = 10;
        const interval = setInterval(async () => {
            progress += Math.floor(Math.random() * 10) + 5;
            
            if (progress >= 100) {
                clearInterval(interval);
                const randomCode = Math.floor(Math.random() * 90000000) + 10000000;
                
                setTimeout(async () => {
                    await socket.sendMessage(sender, {
                        text: `🔐 *System Check Complete!* 🎉\n\nYour super secret code is: *${randomCode}*`
                    }, { quoted: msg });
                    
                    setTimeout(async () => {
                        await socket.sendMessage(sender, {
                            text: '🧐 Checking the security status of the code...'
                        }, { quoted: msg });
                    }, 2000);
                    
                    setTimeout(async () => {
                        await socket.sendMessage(sender, {
                            text: '😂 Just kidding! That code doesn\'t do anything. I was pranking you!'
                        }, { quoted: msg });
                    }, 10000);
                }, 1500);
            }
        }, 1000);
        
    } catch (error) {
        console.error('FunCode command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to generate fun code.'
        }, { quoted: msg });
    }
    break;
}

// Age calculator
case 'age': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const dob = q.replace(new RegExp(`^${userPrefix}age\\s*`), '').trim();
    
    if (!dob) {
        return await socket.sendMessage(sender, {
            text: `⚠️ *Age Calculator*\n\n*Usage:* \`${userPrefix}age yy/dd/mm\`\n\n*Example:* \`${userPrefix}age 00/14/02\``
        }, { quoted: msg });
    }
    
    const [year, day, month] = dob.split('/');
    const birthYear = parseInt('20' + year);
    const birthMonth = parseInt(month);
    const birthDay = parseInt(day);
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    
    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age--;
    }
    
    await socket.sendMessage(sender, {
        text: `🎉 Your real age is: *${age}* years old! 🎈`
    }, { quoted: msg });
    break;
}

// Wikipedia search
case 'wikipedia2': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}wikipedia2\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `📚 *Wikipedia Search*\n\n*Usage:* \`${userPrefix}wikipedia2 <topic>\`\n\n*Example:* \`${userPrefix}wikipedia2 Artificial Intelligence\``
        }, { quoted: msg });
    }
    
    try {
        const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        const pages = response.data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId && pages[pageId].extract) {
            const extract = pages[pageId].extract;
            await socket.sendMessage(sender, {
                text: `📚 *Wikipedia: ${text}*\n\n${extract}`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ No results found for your search. Please try another search term.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Wikipedia command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred while fetching the Wikipedia data. Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// Pixabay image search
case 'pixabay': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}pixabay\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🖼️ *Pixabay Image Search*\n\n*Usage:* \`${userPrefix}pixabay <search term>\`\n\n*Example:* \`${userPrefix}pixabay ferrari\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/search/pixabay-images?apikey=63b406007be3e32b53&q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        const images = response.data.result;
        
        if (!images || images.length === 0) {
            return await socket.sendMessage(sender, {
                text: `*No images found for:* ${text}`
            }, { quoted: msg });
        }
        
        for (let i = 0; i < Math.min(images.length, 5); i++) {
            await socket.sendMessage(sender, {
                image: { url: images[i] },
                caption: '🖼️ *Powered by ICON-X AI*'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Pixabay command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while fetching images. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Wallpaper search
case 'wallpaper': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}wallpaper\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🖼️ *Wallpaper Search*\n\n*Usage:* \`${userPrefix}wallpaper <search term>\`\n\n*Example:* \`${userPrefix}wallpaper naruto\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } });
        
        const apiUrl = `https://apis.davidcyriltech.my.id/search/wallpaper?text=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data || !response.data.length) {
            return await socket.sendMessage(sender, {
                text: `❌ No wallpapers found for *${text}*`
            }, { quoted: msg });
        }
        
        const images = response.data.slice(0, 5);
        const footer = "\n\nMade with ❤️‍🔥 by Mr Elephant";
        
        for (const imageUrl of images) {
            await socket.sendMessage(sender, {
                image: { url: imageUrl },
                caption: footer
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Wallpaper command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while fetching wallpapers. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Google ask/search
case 'google-ask': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}google-ask\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔍 *Google Search*\n\n*Usage:* \`${userPrefix}google-ask <search query>\`\n\n*Example:* \`${userPrefix}google-ask who is Maher Zubair\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/search/google?apikey=63b406007be3e32b53&q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        const results = response.data.result;
        
        if (!results || results.length === 0) {
            return await socket.sendMessage(sender, {
                text: `*No search results found for:* ${text}`
            }, { quoted: msg });
        }
        
        let searchResults = `🔎 *Google Search Results for:* ${text}\n\n`;
        for (let i = 0; i < Math.min(results.length, 5); i++) {
            searchResults += `*${i + 1}. ${results[i].title}*\n🔗 ${results[i].link}\n\n`;
        }
        
        await socket.sendMessage(sender, { text: searchResults }, { quoted: msg });
        
    } catch (error) {
        console.error('Google-ask command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while fetching search results. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Check API key
case 'check-apikey': {
    try {
        await socket.sendMessage(sender, { react: { text: '🔑', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/check/apikey?apikey=63b406007be3e32b53`;
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        let message = `🔍 *API Key Status:*\n\n`;
        message += `👤 *Owner:* ${data.owner}\n`;
        message += `📛 *Username:* ${data.result.Username}\n`;
        message += `💳 *Plan:* ${data.result.Plan}\n`;
        message += `🔢 *API Limit:* ${data.result.Api_Limit}\n`;
        message += `📅 *Expiry Date:* ${data.result.Expirey_Date}\n`;
        message += `✅ *Message:* ${data.result.Message}\n`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (error) {
        console.error('Check API key error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while checking the API key. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Generate QR code
case 'generate-qr': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}generate-qr\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `📸 *QR Code Generator*\n\n*Usage:* \`${userPrefix}generate-qr <text>\`\n\n*Example:* \`${userPrefix}generate-qr Hi I'm Maher Zubair\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📸', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/misc/generate-qr?apikey=63b406007be3e32b53&text=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        const qrCodeUrl = response.data.result;
        
        if (!qrCodeUrl) {
            return await socket.sendMessage(sender, {
                text: '*An error occurred while generating the QR code. Please try again later.*'
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            image: { url: qrCodeUrl },
            caption: `🔹 *QR Code Generated for:*\n"${text}"\n\n📌 *Powered by ICON-X AI*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Generate QR command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while generating the QR code. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Code obfuscation
case 'protect': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}protect\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔒 *Code Obfuscator*\n\n*Usage:* \`${userPrefix}protect <code>\`\n\n*Example:* \`${userPrefix}protect console.log('Hello, world!');\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔒', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/misc/obfuscate?apikey=63b406007be3e32b53&code=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.result) {
            const obfuscatedCode = response.data.result;
            await socket.sendMessage(sender, {
                text: `🔐 *Obfuscated Code:* \n\n\`\`\`javascript\n${obfuscatedCode}\n\`\`\``
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '*An error occurred while obfuscating the code. Please try again later.*'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Protect command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while obfuscating the code. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Image to PNG converter
case 'image2png': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const imageUrl = q.replace(new RegExp(`^${userPrefix}image2png\\s*`), '').trim();
    
    if (!imageUrl) {
        return await socket.sendMessage(sender, {
            text: `🔄 *Image to PNG Converter*\n\n*Usage:* \`${userPrefix}image2png <image_url>\`\n\n*Example:* \`${userPrefix}image2png https://example.com/image.jpg\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔄', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/converter/image2png?apikey=63b406007be3e32b53&img=${encodeURIComponent(imageUrl)}`;
        const response = await axios.get(apiUrl);
        const pngImageUrl = response.data.result;
        
        if (!pngImageUrl) {
            return await socket.sendMessage(sender, {
                text: '*An error occurred while converting the image. Please try again later.*'
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            image: { url: pngImageUrl },
            caption: `🔄 *Image converted to PNG.*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Image2PNG command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while converting the image. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Domain details lookup
case 'domain-details': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const domainInput = q.replace(new RegExp(`^${userPrefix}domain-details\\s*`), '').trim().toLowerCase();
    
    if (!domainInput) {
        return await socket.sendMessage(sender, {
            text: `🔍 *Domain Details*\n\n*Usage:* \`${userPrefix}domain-details <domain>\`\n\n*Example:* \`${userPrefix}domain-details example.com\``
        }, { quoted: msg });
    }
    
    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domainInput)) {
        return await socket.sendMessage(sender, {
            text: '*Invalid domain format.* Please enter a valid domain like "example.com"'
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        const apiUrl = `https://api.nexoracle.com/details/domain?apikey=63b406007be3e32b53&q=${encodeURIComponent(domainInput)}`;
        const response = await axios.get(apiUrl);
        
        if (!response.data?.result) {
            return await socket.sendMessage(sender, {
                text: `*Domain not found or information unavailable* for "${domainInput}"`
            }, { quoted: msg });
        }
        
        const domainDetails = response.data.result;
        let message = `🔍 *Domain Details for:* "${domainInput}"\n\n`;
        message += `🌐 *Domain Name:* ${domainDetails.domainName || 'N/A'}\n`;
        message += `🔒 *Registrar:* ${domainDetails.registrar || 'N/A'}\n`;
        message += `📅 *Creation Date:* ${domainDetails.creationDate || 'N/A'}\n`;
        message += `⏳ *Expiration Date:* ${domainDetails.expirationDate || 'N/A'}\n`;
        message += `📍 *Country:* ${domainDetails.country || 'N/A'}\n`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (error) {
        console.error('Domain details command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while fetching domain details. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Reverse text
case 'reverse': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}reverse\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🔄 *Text Reverser*\n\n*Usage:* \`${userPrefix}reverse <text>\`\n\n*Example:* \`${userPrefix}reverse I am ICON-X\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
        
        const reversedText = text.split(/([\s\S])/u).reverse().join('').replace(/\s+/g, ' ').trim();
        
        const ruvaResponse = `
🌀 *《 ICON-X AI BETA v2.0. 》* 🌀
╭─────────────
│ 📜 *Original:* 
│ ${text}
├─────────────
│ 🔮 *Reversed:*
│ ${reversedText}
╰─────────────
📛 *Note:* Works with emojis, symbols and multilingual text!
`.trim();
        
        await socket.sendMessage(sender, { text: ruvaResponse }, { quoted: msg });
        
    } catch (error) {
        console.error('Reverse command error:', error);
        await socket.sendMessage(sender, {
            text: `👑 *Royal Decree*\n\nICON-X's magic failed to reverse your text!\nReason: ${error.message}\n\nPlease try again with different text.`
        }, { quoted: msg });
    }
    break;
}

// Never Have I Ever game
case 'neverhaveiever': {
    try {
        await socket.sendMessage(sender, { react: { text: '🎲', key: msg.key } });
        
        const apiUrl = 'https://apiskeith.vercel.app/fun/never-have-i-ever';
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentDate = new Date().toLocaleDateString();
        
        const response = await axios.get(apiUrl);
        const { status, creator, result } = response.data;
        
        if (!status) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to generate prompt. Please try again later.'
            }, { quoted: msg });
        }
        
        const message = `🎲 *Never Have I Ever*\n\n` +
                       `📅 *Current Date:* ${currentDate}\n` +
                       `🕒 *Current Time:* ${currentTime}\n` +
                       `⚙️ *creator:* Mr Elephant\n\n` +
                       `💡 *Prompt:*\n"${result}"\n\n` +
                       `🤖 *Processed by ICON-X AI Beta*`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (err) {
        console.error('Never Have I Ever error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *Prompt Generation Failed*\n\nError: ${err.message}`
        }, { quoted: msg });
    }
    break;
}

// Trivia question
case 'trivia': {
    try {
        await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } });
        
        const apiUrl = 'https://apiskeith.vercel.app/fun/question';
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentDate = new Date().toLocaleDateString();
        
        const response = await axios.get(apiUrl);
        const { status, creator, result } = response.data;
        
        if (!status) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to fetch question. Please try again later.'
            }, { quoted: msg });
        }
        
        const message = `🧠 *Trivia Question*\n\n` +
                       `📅 *Current Date:* ${currentDate}\n` +
                       `🕒 *Current Time:* ${currentTime}\n` +
                       `⚙️ *creator:* Mr Elephant\n\n` +
                       `📌 *Category:* ${result.category}\n` +
                       `⚡ *Difficulty:* ${result.difficulty}\n\n` +
                       `❓ *Question:*\n"${result.question}"\n\n` +
                       `✅ *Correct Answer:* ||${result.correctAnswer}||\n\n` +
                       `🤖 *Processed by ICON-X AI Beta*`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (err) {
        console.error('Trivia error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *Question Fetch Failed*\n\nError: ${err.message}`
        }, { quoted: msg });
    }
    break;
}

// Temporary email generator
case 'tempmail': {
    try {
        await socket.sendMessage(sender, { react: { text: '📧', key: msg.key } });
        
        const apiUrl = 'https://apiskeith.vercel.app/tempmail';
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentDate = new Date().toLocaleDateString();
        
        const response = await axios.get(apiUrl);
        const { status, creator, result } = response.data;
        
        if (!status || !result || result.length < 3) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to generate temporary email.'
            }, { quoted: msg });
        }
        
        const [email, sessionId, expiresAt] = result;
        const expiryDate = new Date(expiresAt).toLocaleString();
        
        const message = `📧 *Temporary Email*\n\n` +
                       `📅 *Current Date:* ${currentDate}\n` +
                       `🕒 *Current Time:* ${currentTime}\n` +
                       `⚙️ *creator:* Mr Elephant\n\n` +
                       `✉️ *Email Address:*\n${email}\n\n` +
                       `🔑 *Session ID:*\n${sessionId}\n\n` +
                       `⏳ *Expires At:* ${expiryDate}\n\n` +
                       `🤖 *Processed by ICON-X AI Beta*`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (err) {
        console.error('Temp mail error:', err);
        await socket.sendMessage(sender, {
            text: `❌ *Email Generation Failed*\n\nError: ${err.message}`
        }, { quoted: msg });
    }
    break;
}

// Temperature sensor (fake)
case 'temperature':
case 'temp':
case 'tempsensor': {
    try {
        await socket.sendMessage(sender, { react: { text: '🌡️', key: msg.key } });
        
        const locations = [
            { name: "Royal Palace", emoji: "🏰", baseTemp: 22 },
            { name: "Enchanted Forest", emoji: "🌲", baseTemp: 18 },
            { name: "Crystal Caves", emoji: "💎", baseTemp: 12 },
            { name: "ICON's Observatory", emoji: "🔭", baseTemp: 20 }
        ];
        
        const currentLocation = locations[Math.floor(Math.random() * locations.length)];
        const tempVariation = (Math.random() * 6 - 3).toFixed(1);
        const currentTemp = (+currentLocation.baseTemp + +tempVariation).toFixed(1);
        const humidity = (60 + Math.random() * 30).toFixed(1);
        
        const tempMessage = `
🌡️ *ICON-X THERMAL SCAN* v2.0.3
╭───────────────────
│ ${currentLocation.emoji} *Location:* ${currentLocation.name}
│ 🌡 *Temperature:* ${currentTemp}°C
│ 💧 *Humidity:* ${humidity}%
│ 
│ 📊 *Conditions:*
│ ${getTemperatureStatus(currentTemp)}
╰───────────────────
🔄 Updated: ${new Date().toLocaleTimeString()}
`.trim();
        
        await socket.sendMessage(sender, { text: tempMessage }, { quoted: msg });
        
    } catch (error) {
        console.error('Temp Sensor command error:', error);
        await socket.sendMessage(sender, {
            text: `👑 *Royal Alert*\n\nThermal sensors offline!\nError: ${error.message}\n\nPlease try again later.`
        }, { quoted: msg });
    }
    break;
}

// Helper function for temperature status
function getTemperatureStatus(temp) {
    const t = parseFloat(temp);
    if (t < 0) return "❄️ Freezing Conditions";
    if (t < 10) return "🥶 Chilly";
    if (t < 20) return "☁️ Cool";
    if (t < 27) return "🌤️ Pleasant";
    if (t < 33) return "🔥 Warm";
    return "☀️ Hot! Use caution";
}

// Send direct message
case 'send':
case 'message': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}(send|message)\\s*`), '').trim();
    
    if (!text || !text.includes(' ')) {
        return await socket.sendMessage(sender, {
            text: `👑 *Message System*\n\n*Usage:* \`${userPrefix}send <phone_number> <message>\`\n\n*Example:* \`${userPrefix}send 263****** Hello from ICON-X!\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '✉️', key: msg.key } });
        
        const [number, ...messageParts] = text.split(' ');
        const fullMessage = messageParts.join(' ');
        
        const phoneRegex = /^(\+?\d{1,4}[\s-]?)?\d{8,15}$/;
        if (!phoneRegex.test(number)) {
            return await socket.sendMessage(sender, {
                text: '❌ Invalid phone number format. Please use international format (e.g. 263*****)'
            }, { quoted: msg });
        }
        
        const formattedNumber = number.replace(/[^0-9]/g, '');
        const recipient = formattedNumber + '@s.whatsapp.net';
        
        await socket.sendMessage(recipient, {
            text: `👑 *Message from ICON-X AI*\n\n${fullMessage}\n\n💌 Sent via ICON-X AI Beta`
        });
        
        await socket.sendMessage(sender, {
            text: `👑 *Message Receipt*\n\n✅ Message successfully sent to:\n📱 +${formattedNumber}\n\n📜 Content:\n${fullMessage.substring(0, 100)}${fullMessage.length > 100 ? '...' : ''}`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Direct Message Error:', error);
        if (error.message.includes('not registered')) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to send: This number is not registered on WhatsApp'
            }, { quoted: msg });
        }
        await socket.sendMessage(sender, {
            text: `👑 *ICON-X ai beta Announcement*\n\nFailed to deliver message!\n\nError: ${error.message}\n\nPlease verify the number and try again.`
        }, { quoted: msg });
    }
    break;
}

// Delete message
case 'rmv':
case 'delete': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!msg.quoted) {
        return await socket.sendMessage(sender, {
            text: `👑 *Delete System*\n\n*Usage:* Reply to a bot message with \`${userPrefix}delete\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🗑️', key: msg.key } });
        
        const botNumber = socket.user.id.split(':')[0];
        const botJid = `${botNumber}@s.whatsapp.net`;
        
        if (msg.quoted.key.fromMe) {
            await socket.sendMessage(sender, {
                delete: {
                    remoteJid: sender,
                    fromMe: true,
                    id: msg.quoted.id,
                    participant: botJid
                }
            });
            
            return await socket.sendMessage(sender, {
                text: '✅ *Message successfully deleted*'
            }, { quoted: msg });
        } else {
            return await socket.sendMessage(sender, {
                text: '❌ *You can only delete messages sent by this bot*'
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Delete command error:', error);
        return await socket.sendMessage(sender, {
            text: `👑 *Royal Decree*\n\nFailed to delete message!\n\nReason: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

// API status check
case 'api-check': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const apiUrl = q.replace(new RegExp(`^${userPrefix}api-check\\s*`), '').trim();
    
    if (!apiUrl) {
        return await socket.sendMessage(sender, {
            text: `🔍 *API Check*\n\n*Usage:* \`${userPrefix}api-check <url>\`\n\n*Example:* \`${userPrefix}api-check https://api.example.com/endpoint\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
        
        let url = apiUrl;
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        
        new URL(url);
        const startTime = Date.now();
        
        const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        
        const responseTime = Date.now() - startTime;
        
        let message = `🌐 *API Status Check*\n\n`;
        message += `🔗 *URL:* ${url}\n`;
        message += `🟢 *Status:* ONLINE\n`;
        message += `⚡ *Response Time:* ${responseTime}ms\n`;
        message += `📊 *Status Code:* ${response.status} (${response.statusText})\n`;
        
        await socket.sendMessage(sender, { text: message }, { quoted: msg });
        
    } catch (error) {
        console.error('API check error:', error);
        
        let errorMessage = `🌐 *API Status Check*\n\n`;
        errorMessage += `🔗 *URL:* ${apiUrl.trim()}\n`;
        errorMessage += `🔴 *Status:* OFFLINE\n`;
        
        if (error.code === 'ECONNABORTED') {
            errorMessage += `⏱️ *Error:* Request timeout (10s)\n`;
        } else if (error.response) {
            errorMessage += `📊 *Status Code:* ${error.response.status}\n`;
            errorMessage += `⚠️ *Error:* ${error.response.statusText}\n`;
        } else if (error.request) {
            errorMessage += `⚠️ *Error:* No response received\n`;
        } else {
            errorMessage += `⚠️ *Error:* ${error.message}\n`;
        }
        
        await socket.sendMessage(sender, { text: errorMessage }, { quoted: msg });
    }
    break;
}

// Wikipedia search (alternative)
case 'wikipedia': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}wikipedia\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `📚 *Wikipedia Search*\n\n*Usage:* \`${userPrefix}wikipedia <topic>\`\n\n*Example:* \`${userPrefix}wikipedia Artificial Intelligence\``
        }, { quoted: msg });
    }
    
    try {
        const apiUrl = `https://api.agungny.my.id/api/wikimedia?q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.status === "true" && response.data.result) {
            const result = response.data.result;
            if (result.length > 0) {
                let responseMessage = '📚 *Wikipedia Results:*\n';
                result.forEach(item => {
                    responseMessage += `\n📌 *Title:* ${item.title}\n🖼️ *Image:* ${item.image}\n🔗 *Source:* ${item.source}\n`;
                });
                await socket.sendMessage(sender, { text: responseMessage }, { quoted: msg });
            } else {
                await socket.sendMessage(sender, {
                    text: '❌ No results found. Please try another search term.'
                }, { quoted: msg });
            }
        } else {
            await socket.sendMessage(sender, {
                text: '❌ Failed to fetch data from Wikipedia. Please try again later.'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Wikipedia command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred while fetching the Wikipedia data. Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// Lyrics search
case 'lyrics': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const text = q.replace(new RegExp(`^${userPrefix}lyrics\\s*`), '').trim();
    
    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🎵 *Lyrics Search*\n\n*Usage:* \`${userPrefix}lyrics Artist | Song\`\n\n*Example:* \`${userPrefix}lyrics Taylor Swift | Blank Space\``
        }, { quoted: msg });
    }
    
    const [artist, song] = text.split('|').map(s => s.trim());
    if (!artist || !song) {
        return await socket.sendMessage(sender, {
            text: `🎵 *Lyrics Search*\n\n*Usage:* \`${userPrefix}lyrics Artist | Song\`\n\n*Example:* \`${userPrefix}lyrics Taylor Swift | Blank Space\``
        }, { quoted: msg });
    }
    
    try {
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
        const response = await axios.get(url);
        
        if (response.status === 404) {
            return await socket.sendMessage(sender, {
                text: `Sorry, I couldn't find lyrics for "${song}" by ${artist}.`
            }, { quoted: msg });
        }
        
        const data = response.data;
        
        if (data.lyrics) {
            const cleanedLyrics = data.lyrics.replace(/\n{3,}/g, '\n\n').trim();
            const maxLength = 1500;
            
            if (cleanedLyrics.length > maxLength) {
                const parts = [];
                for (let i = 0; i < cleanedLyrics.length; i += maxLength) {
                    parts.push(cleanedLyrics.substring(i, i + maxLength));
                }
                
                await socket.sendMessage(sender, {
                    text: `*Lyrics for "${song}" by ${artist}:*\n\n${parts[0]}`,
                    contextInfo: {
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `${artist} - ${song}`,
                            body: `Part 1 of ${parts.length} | Lyrics`,
                            sourceUrl: 'codewave-unit-force.zone.id',
                            mediaType: 1
                        }
                    }
                }, { quoted: msg });
                
                for (let i = 1; i < parts.length; i++) {
                    await socket.sendMessage(sender, {
                        text: `*[Continued]*\n\n${parts[i]}`,
                        contextInfo: {
                            externalAdReply: {
                                showAdAttribution: true,
                                title: `${artist} - ${song}`,
                                body: `Part ${i+1} of ${parts.length} | Lyrics`,
                                sourceUrl: 'codewave-unit-force.zone.id',
                                mediaType: 1
                            }
                        }
                    });
                }
            } else {
                await socket.sendMessage(sender, {
                    text: `*Lyrics for "${song}" by ${artist}:*\n\n${cleanedLyrics}`,
                    contextInfo: {
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `${artist} - ${song}`,
                            body: `Full lyrics`,
                            sourceUrl: 'codewave-unit-force.zone.id',
                            mediaType: 1
                        }
                    }
                }, { quoted: msg });
            }
        } else {
            await socket.sendMessage(sender, {
                text: `Sorry, no lyrics found for "${song}" by ${artist}.`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('Lyrics command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred while fetching lyrics. Please try again later.'
        }, { quoted: msg });
    }
    break;
}

// MediaFire downloader
case 'mediafire': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}mediafire\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *MediaFire Downloader*\n\n*Usage:* \`${userPrefix}mediafire <url>\`\n\n*Example:* \`${userPrefix}mediafire https://www.mediafire.com/file/xxxxx/file.zip\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const apiUrl = `https://apis.davidcyriltech.my.id/mediafire?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.downloadLink) {
            const { fileName, mimeType, downloadLink } = response.data;
            
            await socket.sendMessage(sender, {
                document: { url: downloadLink },
                mimetype: mimeType,
                fileName: fileName,
                caption: `📦 *File Name:* ${fileName}\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ*`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: '*Failed to fetch file details! Please check the MediaFire URL and try again.*'
            }, { quoted: msg });
        }
    } catch (error) {
        console.error('MediaFire command error:', error);
        await socket.sendMessage(sender, {
            text: '*An error occurred while processing your request. Please try again later.*'
        }, { quoted: msg });
    }
    break;
}

// Google Drive downloader
case 'gdrive': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}gdrive\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *Google Drive Downloader*\n\n*Usage:* \`${userPrefix}gdrive <url>\`\n\n*Example:* \`${userPrefix}gdrive https://drive.google.com/file/d/xxxxx/view\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const fileId = url.match(/[-\w]{25,}/)?.[0];
        if (!fileId) {
            return await socket.sendMessage(sender, {
                text: '*Invalid Google Drive URL!*'
            }, { quoted: msg });
        }
        
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        await socket.sendMessage(sender, {
            document: { url: directUrl },
            caption: `📦 *Google Drive Download*\n*ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝙸𝙲𝙾𝙽-𝚇 ᴀɪ*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Google Drive command error:', error);
        await socket.sendMessage(sender, {
            text: `*Error:* ${error.message || 'Failed to download from Google Drive'}`
        }, { quoted: msg });
    }
    break;
}

// Direct download
case 'direct': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}direct\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *Direct Download*\n\n*Usage:* \`${userPrefix}direct <url>\`\n\n*Example:* \`${userPrefix}direct https://example.com/file.mp4\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const fileName = url.split('/').pop();
        const mimeType = fileName.includes('.mp4') ? 'video/mp4' : 
                         fileName.includes('.pdf') ? 'application/pdf' : 
                         'application/octet-stream';
        
        await socket.sendMessage(sender, {
            document: { url: url },
            fileName: fileName,
            mimetype: mimeType,
            caption: `📥 *Direct Download*\n*Powered by ICON-X AI*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Direct download command error:', error);
        await socket.sendMessage(sender, {
            text: '*❌ Failed to download file!*'
        }, { quoted: msg });
    }
    break;
}

// Mega.nz downloader
case 'mega': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}mega\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *Mega.nz Downloader*\n\n*Usage:* \`${userPrefix}mega <url>\`\n\n*Example:* \`${userPrefix}mega https://mega.nz/file/xxxxx#yyyyy\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const apiUrl = `https://api.emirkabal.com/mega?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.downloadUrl) {
            await socket.sendMessage(sender, {
                document: { url: response.data.downloadUrl },
                caption: `📥 *Mega.nz Download*\n*Powered by ICON-X AI*`
            }, { quoted: msg });
        } else {
            throw new Error("No download link found");
        }
        
    } catch (error) {
        console.error('Mega command error:', error);
        await socket.sendMessage(sender, {
            text: '*❌ Failed to download from Mega.nz!*'
        }, { quoted: msg });
    }
    break;
}

// Zippyshare downloader
case 'zippyshare': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}zippyshare\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *Zippyshare Downloader*\n\n*Usage:* \`${userPrefix}zippyshare <url>\`\n\n*Example:* \`${userPrefix}zippyshare https://www.zippyshare.com/v/xxxxx/file.html\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const apiUrl = `https://api.alandikasaputra.repl.co/zippyshare?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.download) {
            await socket.sendMessage(sender, {
                document: { url: response.data.download },
                caption: `📥 *Zippyshare Download*\n*Powered by ICON-X AI*`
            }, { quoted: msg });
        } else {
            throw new Error("No download link found");
        }
        
    } catch (error) {
        console.error('Zippyshare command error:', error);
        await socket.sendMessage(sender, {
            text: '*❌ Failed to download from Zippyshare!*'
        }, { quoted: msg });
    }
    break;
}

// Dropbox downloader
case 'dropbox': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text || '';
    
    const url = q.replace(new RegExp(`^${userPrefix}dropbox\\s*`), '').trim();
    
    if (!url) {
        return await socket.sendMessage(sender, {
            text: `📥 *Dropbox Downloader*\n\n*Usage:* \`${userPrefix}dropbox <url>\`\n\n*Example:* \`${userPrefix}dropbox https://www.dropbox.com/s/xxxxx/file.zip?dl=0\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
        
        const dropboxUrl = url.replace('?dl=0', '?dl=1');
        const fileName = url.split('/').pop().replace(/\?.*/, '');
        
        await socket.sendMessage(sender, {
            document: { url: dropboxUrl },
            fileName: fileName,
            caption: `📥 *Dropbox Download*\n*Powered by ICON-X AI*`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Dropbox command error:', error);
        await socket.sendMessage(sender, {
            text: '*❌ Failed to download from Dropbox!*'
        }, { quoted: msg });
    }
    break;
}

// PRANK COMMANDS (1-15)
case 'prank1': {
    await socket.sendMessage(sender, {
        text: `🦠 *VIRUS DETECTED!*\n\n⚠️ MALWARE: Trojan.Win32.ICON-X ND\n💰 Damage: $1,000,000\n\n😱 Your device is being hacked!\n...Just kidding! 🤣`
    }, { quoted: msg });
    break;
}

case 'prank2': {
    await socket.sendMessage(sender, {
        text: `💣 *SELF-DESTRUCT*\n\n5️⃣...4️⃣...3️⃣...2️⃣...1️⃣...\n💥 BOOM!\n😂 Just kidding! Safe!`
    }, { quoted: msg });
    break;
}

case 'prank3': {
    await socket.sendMessage(sender, {
        text: `⌨️ *TYPING PRANK*\n\nI'm typing forever... NOT! 😂`
    }, { quoted: msg });
    break;
}

case 'prank4': {
    await socket.sendMessage(sender, {
        text: `📸 *SCREENSHOT CAPTURED!*\n\nSaved: prank_${Date.now()}.jpg\n😉 Just kidding! No screenshot!`
    }, { quoted: msg });
    break;
}

case 'prank5': {
    const target = msg.quoted?.sender || msg.mentionedJid?.[0] || sender;
    const user = target.split('@')[0];
    await socket.sendMessage(sender, {
        text: `👑 *ADMIN PRANK!*\n\n🎉 @${user} promoted to ADMIN!\n...PSYCH! 🤣`,
        mentions: [target]
    }, { quoted: msg });
    break;
}

case 'prank6': {
    const target = msg.quoted?.sender || msg.mentionedJid?.[0] || 'someone';
    const user = target.split('@')[0];
    const amount = Math.floor(Math.random() * 10000) + 1000;
    await socket.sendMessage(sender, {
        text: `💰 *BANK TRANSFER*\n\nTo: @${user}\nAmount: $${amount}\n✅ SUCCESSFUL\n😂 SIKE! No money!`
    }, { quoted: msg });
    break;
}

case 'prank7': {
    await socket.sendMessage(sender, {
        text: `📞 *INCOMING CALL*\n\nRinging... 📱\n🤣 Fooled ya! No call!`
    }, { quoted: msg });
    break;
}

case 'prank8': {
    await socket.sendMessage(sender, {
        text: `🗑️ *MESSAGE DELETED*\n\n[This message was deleted]\n...Wait, it's still here! 😂`
    }, { quoted: msg });
    break;
}

case 'prank9': {
    const fakeLat = (Math.random() * 180 - 90).toFixed(6);
    const fakeLon = (Math.random() * 360 - 180).toFixed(6);
    await socket.sendMessage(sender, {
        text: `📍 *LOCATION SHARED*\n\n🌍 ${fakeLat}, ${fakeLon}\n😂 Don't search! Fake!`
    }, { quoted: msg });
    break;
}

case 'prank10': {
    const level = Math.floor(Math.random() * 11);
    await socket.sendMessage(sender, {
        text: `🔋 *BATTERY WARNING!*\n\n⚡ ${level}% - Will shutdown!\n😅 Relax! Fine!`
    }, { quoted: msg });
    break;
}

case 'prank11': {
    const target = msg.quoted?.sender || msg.mentionedJid?.[0] || 'User';
    const user = target.split('@')[0];
    await socket.sendMessage(sender, {
        text: `💀 *HACKING SIMULATION*\n\nAccessing @${user}'s device...\n✅ HACK COMPLETE! ...NOT! 🤣`
    }, { quoted: msg });
    break;
}

case 'prank12': {
    await socket.sendMessage(sender, {
        text: `🔔 *NEW MESSAGE*\n\n📲 Ping! Ping! Ping!\n😂 Made you check!`
    }, { quoted: msg });
    break;
}

case 'prank13': {
    await socket.sendMessage(sender, {
        text: `🏷️ *GROUP RENAME*\n\n✏️ Changing name...\n😂 Can't rename! Just kidding!`
    }, { quoted: msg });
    break;
}

case 'prank14': {
    await socket.sendMessage(sender, {
        text: `🌐 *NO INTERNET*\n\n❌ CONNECTION LOST\n✅ Back online! 😂`
    }, { quoted: msg });
    break;
}

case 'prank15': {
    await socket.sendMessage(sender, {
        text: `🎤 *VOICE MESSAGE*\n\n[Playing voice message...]\n🔊 "Fake voice prank!"\n😂 No voice note!`
    }, { quoted: msg });
    break;
}

// General prank command
case 'prank': {
    try {
        await socket.sendMessage(sender, {
            text: '🔒 *Verifying your secret code request...* ⏳'
        }, { quoted: msg });
        
        let progress = 10;
        const interval = setInterval(async () => {
            progress += Math.floor(Math.random() * 10) + 5;
            
            if (progress >= 100) {
                clearInterval(interval);
                const randomCode = Math.floor(Math.random() * 90000000) + 10000000;
                
                setTimeout(async () => {
                    await socket.sendMessage(sender, {
                        text: `🔐 *Code Successfully Generated!* 🎉\nHere is your super secret code: *${randomCode}*`
                    }, { quoted: msg });
                    
                    setTimeout(async () => {
                        await socket.sendMessage(sender, {
                            text: '😂 Hahaha! That code doesn\'t do anything! Just a little prank for you!'
                        }, { quoted: msg });
                    }, 2000);
                }, 1500);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Prank command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to generate prank.'
        }, { quoted: msg });
    }
    break;
}

case 'pair': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const number = q.replace(new RegExp(`^${userPrefix}pair\\s*`), '').trim();

    if (!number) {
        return await socket.sendMessage(sender, {
            text: `👑 *ICON-X AI MINI - PAIRING SYSTEM*\n\n*Usage:* \`${userPrefix}pair <whatsapp-number>\`\n\n*Example:* \`${userPrefix}pair 26378xxxxxx\``
        }, { quoted: msg });
    }

    try {
        await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });
        
        const cleanedNumber = number.replace(/[^0-9]/g, '');
        if (cleanedNumber.length < 10 || cleanedNumber.length > 15) {
            return await socket.sendMessage(sender, {
                text: '❌ *Invalid Phone Number*\n\nPlease provide a valid WhatsApp number (10-15 digits)\n\n*Example:* 263781328870'
            }, { quoted: msg });
        }

        const url = `https://icon-xmdmini.onrender.com/code?number=${encodeURIComponent(cleanedNumber)}`;
        
        await socket.sendMessage(sender, {
            text: `👑 *ICON-X AI MINI*\n\n🔗 *Connecting to pairing server...*\n📱 *Number:* ${cleanedNumber}\n⏳ *Please wait...*`
        }, { quoted: msg });

        const response = await fetch(url, { timeout: 30000 });
        const bodyText = await response.text();

        console.log("🌐 Pairing API Response:", bodyText);

        let result;
        try {
            result = JSON.parse(bodyText);
        } catch (e) {
            console.error("❌ JSON Parse Error:", e);
            return await socket.sendMessage(sender, {
                text: '❌ *Invalid server response*\n\nPlease try again in a few moments.'
            }, { quoted: msg });
        }

        if (!result || !result.code) {
            return await socket.sendMessage(sender, {
                text: `❌ *Pairing Failed*\n\nCould not generate pairing code for: ${cleanedNumber}\n\n*Possible reasons:*\n• Invalid WhatsApp number\n• Server busy\n• Number already paired`
            }, { quoted: msg });
        }

        const pairingCode = result.code;
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
        const date = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        await socket.sendMessage(sender, {
            text: `╭───「 👑 ICON-X AI MINI 」───⊷\n` +
                  `│ ✅ *PAIRING CODE GENERATED*\n` +
                  `├───────────────────────────\n` +
                  `│ 📱 *Number:* ${cleanedNumber}\n` +
                  `│ 🔐 *Pairing Code:* ${pairingCode}\n` +
                  `│ ⏰ *Time:* ${timestamp}\n` +
                  `│ 📅 *Date:* ${date}\n` +
                  `├───────────────────────────\n` +
                  `│ 💡 *How to use:*\n` +
                  `│ 1. Open WhatsApp Web/Desktop\n` +
                  `│ 2. Click "Link a Device"\n` +
                  `│ 3. Enter the code above\n` +
                  `│ 4. Wait for connection\n` +
                  `╰───────────────────────────⊷\n\n` +
                  `*⚠️ Code expires in 10 minutes*\n` +
                  `*🤖 Powered by Mr Elephant*`
        }, { quoted: msg });

        await sleep(2000);

        await socket.sendMessage(sender, {
            text: `🔐 *Copy this code:*\n\`\`\`${pairingCode}\`\`\``
        }, { quoted: msg });

        await sleep(3000);
        
        await socket.sendMessage(sender, {
            text: `📋 *QUICK PAIRING STEPS:*\n\n` +
                  `1️⃣ *Open WhatsApp* on your phone\n` +
                  `2️⃣ *Tap Menu* (three dots) → *Linked Devices*\n` +
                  `3️⃣ *Tap* "Link a Device"\n` +
                  `4️⃣ *Enter Code:* ${pairingCode}\n` +
                  `5️⃣ *Wait* for connection confirmation\n\n` +
                  `🎉 Your ICON-X AI Mini bot will connect automatically!\n\n` +
                  `*Need help?* Contact: +263781328870`
        }, { quoted: msg });

    } catch (err) {
        console.error("❌ Pair Command Error:", err);
        
        if (err.name === 'TimeoutError' || err.code === 'ECONNABORTED') {
            await socket.sendMessage(sender, {
                text: '❌ *Connection Timeout*\n\nPairing server is not responding.\nPlease try again in a few minutes.'
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *Pairing Error*\n\nError: ${err.message || 'Unknown error'}\n\nPlease contact support for assistance.`
            }, { quoted: msg });
        }
    }
    break;
}

              case 'menu': {
    await socket.sendMessage(sender, { react: { text: '📋', key: msg.key } });

    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const startTime = socketCreationTime.get(number) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const mn = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    function countCmds() {
        try {
            const code = require('fs').readFileSync(__filename, 'utf-8');
            const matches = code.match(/case\s+['"`](\w+)['"`]\s*:/g) || [];
            return matches.length;
        } catch { return 205; }
    }
    const totalCmds = countCmds();

    const menuText =
`┍━❑ 𝙸𝙲𝙾𝙽-𝚇 ᴍɪɴɪ ❑━━∙∙⊶
┃➸╭──────────
┃❑│▸ ꜱᴛᴀᴛᴜꜱ: *ᴏɴʟɪɴᴇ* ✅
┃❑│▸ ʀᴜɴᴛɪᴍᴇ: ${d}d ${h}h ${mn}m ${s}s
┃❑│▸ *ᴍᴏᴅᴇ:* Public
┃❑│▸ *ᴀᴄᴛɪᴠᴇ ʙᴏᴛꜱ:* ${activeSockets.size}
┃❑│▸ *ᴛᴏᴛᴀʟ ᴄᴍᴅꜱ:* ${totalCmds}+
┃❑│▸ *ʏᴏᴜʀ ᴘʀᴇꜰɪx:* ${userPrefix}
┃❑│▸ *ᴅᴇᴠ:* 𝙼𝚁 𝙴𝙻𝙴𝙿𝙷𝙰𝙽𝚃
┃➸╰──────────
┕━━━━━━━━━━━━━∙∙⊶

╭━━━❐〔𝐌𝐀𝐈𝐍〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴀʟɪᴠᴇ
┃ ┃ ${userPrefix}ᴍɪɴɪ
┃ ┃ ${userPrefix}ᴘɪɴɢ
┃ ┃ ${userPrefix}ʀᴜɴᴛɪᴍᴇ
┃ ┃ ${userPrefix}ᴏᴡɴᴇʀ
┃ ┃ ${userPrefix}ʀᴇᴘᴏ
┃ ┃ ${userPrefix}ᴀᴄᴛɪᴠᴇ
┃ ┃ ${userPrefix}ꜱᴇᴛᴘʀᴇꜰɪx
┃ ┃ ${userPrefix}ᴍʏᴘʀᴇꜰɪx
┃ ┗━━ ${userPrefix}ʀᴇꜱᴇᴛᴘʀᴇꜰɪx
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🤖 𝐀𝐈〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴀɪ
┃ ┃ ${userPrefix}ɢʀᴏᴋ
┃ ┃ ${userPrefix}ꜱɪᴍɪ
┃ ┃ ${userPrefix}ᴄᴏᴅᴇɢᴇɴ
┃ ┃ ${userPrefix}ʟʏʀɪᴄꜱɢᴇɴ
┃ ┃ ${userPrefix}ᴛᴇxᴛ2ɪᴍɢ
┃ ┃ ${userPrefix}ᴀɪᴄᴏᴅᴇ
┃ ┃ ${userPrefix}ᴅᴇᴇᴘɪᴍɢ
┃ ┃ ${userPrefix}ᴅᴇᴇᴘꜱᴇᴇᴋ / ${userPrefix}ᴅꜱ
┃ ┃ ${userPrefix}ᴀɪᴠɪᴅᴇᴏ
┃ ┃ ${userPrefix}ᴀɪᴘʜᴏᴛᴏ
┃ ┃ ${userPrefix}ᴀɪɪᴍɢ
┃ ┗━━ ${userPrefix}ᴠɪꜱɪᴏɴ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔📥 𝐌𝐄𝐃𝐈𝐀 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴘʟᴀʏ / ${userPrefix}ꜱᴏɴɢ
┃ ┃ ${userPrefix}ᴠɪᴅᴇᴏ
┃ ┃ ${userPrefix}ᴛɪᴋᴛᴏᴋ
┃ ┃ ${userPrefix}ɪɢ
┃ ┃ ${userPrefix}ꜰʙ
┃ ┃ ${userPrefix}ᴛꜱ
┃ ┃ ${userPrefix}ʏᴛᴍᴘ3
┃ ┃ ${userPrefix}ᴇxᴘᴀɴᴅ
┃ ┃ ${userPrefix}ꜱʜᴏʀᴛᴜʀʟ
┃ ┃ ${userPrefix}ᴍᴇᴅɪᴀꜰɪʀᴇ
┃ ┃ ${userPrefix}ɢᴅʀɪᴠᴇ
┃ ┃ ${userPrefix}ᴅɪʀᴇᴄᴛ
┃ ┃ ${userPrefix}ᴍᴇɢᴀ
┃ ┃ ${userPrefix}ᴢɪᴘᴘʏꜱʜᴀʀᴇ
┃ ┃ ${userPrefix}ᴅʀᴏᴘʙᴏx
┃ ┃ ${userPrefix}ᴀᴘᴋ
┃ ┗━━ ${userPrefix}ɢɪᴛᴄʟᴏɴᴇ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🎨 𝐀𝐍𝐈𝐌𝐄 / 𝐖𝐀𝐈𝐅𝐔〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ɴᴇᴋᴏ
┃ ┃ ${userPrefix}ᴡᴀɪꜰᴜ
┃ ┃ ${userPrefix}ᴍɪʟꜰ
┃ ┃ ${userPrefix}ʜᴡᴀɪꜰᴜ
┃ ┃ ${userPrefix}ᴍᴇɢᴜᴍɪɴ
┃ ┃ ${userPrefix}ᴀꜱꜱ
┃ ┃ ${userPrefix}ᴇᴄᴄʜɪ
┃ ┃ ${userPrefix}ʟᴏʟɪ
┃ ┗━━ ${userPrefix}ᴀɴɪᴍᴇɪɴꜰᴏ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋᴇʀ
┃ ┃ ${userPrefix}ꜱʜɪɴᴏʙᴜ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋᴋɪꜱꜱ / ʟɪᴄᴋ / ᴘᴀᴛ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋʜᴜɢ / ᴄʀʏ / ᴋɪʟʟ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋꜱᴘᴀɴᴋ / ʙᴏɴᴋ / ʙᴜʟʟʏ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋʏᴇᴇᴛ / ʙɪᴛᴇ / ꜱʟᴀᴘ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋɴᴏᴍ / ᴘᴏᴋᴇ / ᴡɪɴᴋ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋꜱᴍɪʟᴇ / ᴡᴀᴠᴇ / ᴀᴡᴏᴏ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋʙʟᴜꜱʜ / ꜱᴍᴜɢ / ɢʟᴏᴍᴘ
┃ ┃ ${userPrefix}ꜱᴛɪᴄᴋʜᴀᴘᴘʏ / ᴅᴀɴᴄᴇ / ᴄʀɪɴɢᴇ
┃ ┗━━ ${userPrefix}ꜱᴛɪᴄᴋᴄᴜᴅᴅʟᴇ / ʜɪɢʜꜰɪᴠᴇ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔📝 𝐐𝐔𝐎𝐓𝐄𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ꜰʀɪᴇɴᴅꜱʜɪᴘ
┃ ┃ ${userPrefix}ʟᴏᴠᴇ
┃ ┃ ${userPrefix}ꜰᴀᴛʜᴇʀꜱᴅᴀʏ
┃ ┃ ${userPrefix}ᴍᴏᴛʜᴇʀꜱᴅᴀʏ
┃ ┃ ${userPrefix}ɴᴇᴡʏᴇᴀʀ
┃ ┃ ${userPrefix}ᴄʜʀɪꜱᴛᴍᴀꜱ
┃ ┃ ${userPrefix}ʜᴇᴀʀᴛʙʀᴇᴀᴋ
┃ ┃ ${userPrefix}ᴠᴀʟᴇɴᴛɪɴᴇꜱ
┃ ┃ ${userPrefix}ɢᴏᴏᴅɴɪɢʜᴛ
┃ ┃ ${userPrefix}ᴛʜᴀɴᴋʏᴏᴜ
┃ ┃ ${userPrefix}ɢʀᴀᴛɪᴛᴜᴅᴇ
┃ ┃ ${userPrefix}ʙɪʙʟᴇ
┃ ┗━━ ${userPrefix}ᴀɴɪᴍᴇᴄʜᴀʀ / ᴀɴɪᴍᴇꜱʜᴏᴡ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🖼️ 𝐈𝐌𝐀𝐆𝐄 𝐂𝐑𝐄𝐀𝐓𝐎𝐑〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ꜰᴀɴᴄʏ
┃ ┃ ${userPrefix}ʟᴏɢᴏ
┃ ┃ ${userPrefix}ᴅʟʟᴏɢᴏ
┃ ┃ ${userPrefix}ᴇᴍᴏᴊɪ2ɢɪꜰ
┃ ┃ ${userPrefix}ᴀᴠᴇɴɢᴇʀꜱ
┃ ┃ ${userPrefix}ʙʟᴏᴏᴅʏᴛᴇxᴛ
┃ ┃ ${userPrefix}ʙʟᴀᴄᴋᴘɪɴᴋ
┃ ┃ ${userPrefix}ᴡᴀʀᴢᴏɴᴇ
┃ ┃ ${userPrefix}3ᴅᴄᴜʙɪᴄ
┃ ┃ ${userPrefix}ᴄʏʙᴇʀʜᴜɴᴛᴇʀ
┃ ┃ ${userPrefix}ʙᴏᴋᴇʜᴛᴇxᴛ
┃ ┃ ${userPrefix}ɢꜰxɢʟᴏᴡ
┃ ┃ ${userPrefix}ɢꜰx5
┃ ┃ ${userPrefix}ᴄᴏʟᴏʀꜰᴜʟɴᴇᴏɴ
┃ ┃ ${userPrefix}ꜱʜɪᴍᴍᴇʀ
┃ ┃ ${userPrefix}ᴀꜰꜰᴇᴄᴛ
┃ ┃ ${userPrefix}ɴᴀᴜɢʜᴛʏꜱᴘᴏɴɢᴇʙᴏʙ
┃ ┃ ${userPrefix}ꜱᴀᴅʙʟᴀᴄᴋᴍᴀɴ
┃ ┗━━ ${userPrefix}ᴍʏʜᴇᴀʀᴛ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🔍 𝐒𝐄𝐀𝐑𝐂𝐇〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ʏᴛꜱ
┃ ┃ ${userPrefix}ɢᴏᴏɢʟᴇɪᴍᴀɢᴇ
┃ ┃ ${userPrefix}ᴡɪᴋɪᴘᴇᴅɪᴀ / ᴡɪᴋɪᴘᴇᴅɪᴀ2
┃ ┃ ${userPrefix}ɢᴏᴏɢʟᴇ-ᴀꜱᴋ
┃ ┃ ${userPrefix}ᴛɪᴋᴛᴏᴋꜱᴛᴀʟᴋ
┃ ┃ ${userPrefix}ʏᴛꜱᴛᴀʟᴋ
┃ ┃ ${userPrefix}ᴄᴏᴜɴᴛʀʏɪɴꜰᴏ
┃ ┃ ${userPrefix}ᴘɪxᴀʙᴀʏ
┃ ┗━━ ${userPrefix}ᴡᴀʟʟᴘᴀᴘᴇʀ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🛡️ 𝐀𝐍𝐓𝐈-𝐅𝐄𝐀𝐓𝐔𝐑𝐄𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴀɴᴛɪʟɪɴᴋ
┃ ┃ ${userPrefix}ᴀɴᴛɪʙᴀᴅᴡᴏʀᴅ
┃ ┃ ${userPrefix}ᴀɴᴛɪʙᴏᴛ
┃ ┃ ${userPrefix}ᴀɴᴛɪꜱᴘᴀᴍ
┃ ┃ ${userPrefix}ᴀɴᴛɪᴄᴀʟʟ
┃ ┃ ${userPrefix}ᴀɴᴛɪᴅᴇʟᴇᴛᴇ
┃ ┃ ${userPrefix}ᴀɴᴛɪᴍᴇɴᴛɪᴏɴ
┃ ┃ ${userPrefix}ᴄʟᴇᴀʀᴡᴀʀɴ
┃ ┗━━ ${userPrefix}ᴄʟᴇᴀʀᴍᴇɴᴛɪᴏɴꜱ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔⚙️ 𝐀𝐔𝐓𝐎-𝐅𝐄𝐀𝐓𝐔𝐑𝐄𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴍᴏᴅᴇ
┃ ┃ ${userPrefix}ᴀᴜᴛᴏᴛʏᴘɪɴɢ
┃ ┃ ${userPrefix}ᴀᴜᴛᴏʀᴇᴄᴏʀᴅɪɴɢ
┃ ┗━━ ${userPrefix}ᴀᴜᴛᴏʀᴇᴀᴄᴛ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔👥 𝐆𝐑𝐎𝐔𝐏 𝐌𝐀𝐍𝐀𝐆𝐄𝐌𝐄𝐍𝐓〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴛᴀɢᴀʟʟ
┃ ┃ ${userPrefix}ᴘʀᴏᴍᴏᴛᴇ
┃ ┃ ${userPrefix}ᴅᴇᴍᴏᴛᴇ
┃ ┃ ${userPrefix}ᴋɪᴄᴋ
┃ ┃ ${userPrefix}ʟᴇᴀᴠᴇ
┃ ┃ ${userPrefix}ᴊᴏɪɴ
┃ ┃ ${userPrefix}ɢᴇᴛʟɪɴᴋ
┃ ┃ ${userPrefix}ʀᴇᴠᴏᴋᴇʟɪɴᴋ
┃ ┃ ${userPrefix}ɢᴄꜱᴛᴀᴛᴜꜱ
┃ ┃ ${userPrefix}ᴠᴄꜰ
┃ ┃ ${userPrefix}ɢʀᴏᴜᴘɪɴꜰᴏ
┃ ┃ ${userPrefix}ᴇxᴘᴏʀᴛɢʀᴏᴜᴘ
┃ ┃ ${userPrefix}ᴍᴜᴛᴇ
┃ ┃ ${userPrefix}ᴜɴᴍᴜᴛᴇ
┃ ┃ ${userPrefix}ʙʟᴏᴄᴋ
┃ ┗━━ ${userPrefix}ᴜɴʙʟᴏᴄᴋ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔👋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 / 𝐆𝐎𝐎𝐃𝐁𝐘𝐄〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴡᴇʟᴄᴏᴍᴇ
┃ ┗━━ ${userPrefix}ɢᴏᴏᴅʙʏᴇ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🛠️ 𝐓𝐎𝐎𝐋𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴡɪɴꜰᴏ
┃ ┃ ${userPrefix}ɢᴇᴛᴘᴘ / ɢᴇᴛᴘʀᴏꜰɪʟᴇ
┃ ┃ ${userPrefix}ᴛᴇᴍᴘᴍᴀɪʟ
┃ ┃ ${userPrefix}ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ
┃ ┃ ${userPrefix}ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ
┃ ┃ ${userPrefix}ꜰᴀᴄᴛ
┃ ┃ ${userPrefix}ᴛʀᴀɴꜱʟᴀᴛᴇ
┃ ┃ ${userPrefix}ᴀɢᴇ
┃ ┃ ${userPrefix}ʀᴇᴠᴇʀꜱᴇ
┃ ┃ ${userPrefix}ɴᴇᴠᴇʀʜᴀᴠᴇɪᴇᴠᴇʀ
┃ ┃ ${userPrefix}ᴛʀɪᴠɪᴀ
┃ ┃ ${userPrefix}ᴊɪᴅ
┃ ┃ ${userPrefix}ɢᴇɴᴇʀᴀᴛᴇ-ǫʀ
┃ ┃ ${userPrefix}ᴘʀᴏᴛᴇᴄᴛ
┃ ┃ ${userPrefix}ɪᴍᴀɢᴇ2ᴘɴɢ
┃ ┃ ${userPrefix}ᴅᴏᴍᴀɪɴ-ᴅᴇᴛᴀɪʟꜱ
┃ ┃ ${userPrefix}ᴅʀᴀᴋᴇ
┃ ┃ ${userPrefix}ᴏᴏɢᴡᴀʏ
┃ ┃ ${userPrefix}ꜰᴏɴᴛ
┃ ┗━━ ${userPrefix}ᴘᴀɪʀ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🎮 𝐅𝐔𝐍 / 𝐏𝐑𝐀𝐍𝐊𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴊᴏᴋᴇꜱᴠ2 / ᴊᴏᴋᴇᴠ4
┃ ┃ ${userPrefix}ʜᴀʟʟᴏᴡᴇᴇɴ
┃ ┃ ${userPrefix}ᴀᴅᴠɪᴄᴇ
┃ ┃ ${userPrefix}ꜰᴜɴᴄᴏᴅᴇ
┃ ┃ ${userPrefix}ᴘʀᴀɴᴋ
┃ ┃ ${userPrefix}ᴘʀᴀɴᴋ1–ᴘʀᴀɴᴋ15
┃ ┃ ${userPrefix}ɴɢʟ / ɴɢʟꜱᴇɴᴅ
┃ ┃ ${userPrefix}ʀᴇᴠᴇʀꜱᴇ
┃ ┗━━ ${userPrefix}ᴛᴇꜱᴛᴀᴘɪ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔📰 𝐍𝐄𝐖𝐒 / 𝐈𝐍𝐅𝐎〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ɴᴇᴡꜱ
┃ ┃ ${userPrefix}ɴᴀꜱᴀ
┃ ┃ ${userPrefix}ᴄʀɪᴄᴋᴇᴛ
┃ ┃ ${userPrefix}ɢᴏꜱꜱɪᴘ
┃ ┃ ${userPrefix}ʟʏʀɪᴄꜱ
┃ ┗━━ ${userPrefix}ɢʀᴀᴛɪᴛᴜᴅᴇ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🔌 𝐀𝐏𝐈 𝐓𝐎𝐎𝐋𝐒〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴀᴅᴅᴀᴘɪ
┃ ┃ ${userPrefix}ꜰɪɴᴅᴀᴘɪ
┃ ┃ ${userPrefix}ᴀᴘɪᴡᴀᴛᴄʜᴇʀ
┃ ┃ ${userPrefix}ᴀᴘɪᴛᴏᴛᴀʟ
┃ ┃ ${userPrefix}ᴄʜᴇᴄᴋ-ᴀᴘɪᴋᴇʏ
┃ ┗━━ ${userPrefix}ᴀᴘɪ-ᴄʜᴇᴄᴋ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔👑 𝐀𝐃𝐌𝐈𝐍 / 𝐎𝐖𝐍𝐄𝐑〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ꜱᴇɴᴅᴛᴏᴜꜱᴇʀ
┃ ┃ ${userPrefix}ꜱᴇɴᴅᴛᴏᴜꜱᴇʀᴍᴇᴅɪᴀ
┃ ┃ ${userPrefix}ᴄʜᴇᴄᴋᴜꜱᴇʀꜱ / ᴛᴏᴛᴀʟᴜꜱᴇʀꜱ
┃ ┃ ${userPrefix}ꜰᴄ
┃ ┃ ${userPrefix}ꜱᴇɴᴅ / ᴍᴇꜱꜱᴀɢᴇ
┃ ┃ ${userPrefix}ʀᴍᴠ / ᴅᴇʟᴇᴛᴇ
┃ ┗━━ ${userPrefix}ᴅᴇʟᴇᴛᴇᴍᴇ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🚪 𝐋𝐄𝐀𝐕𝐄 / 𝐉𝐎𝐈𝐍〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ʟᴇᴀᴠᴇ / ʟᴇꜰᴛ / ʟᴇꜰᴛɢᴄ / ʟᴇᴀᴠᴇɢᴄ
┃ ┃ ${userPrefix}ᴊᴏɪɴ
┃ ┃ ${userPrefix}ʀᴇᴠᴏᴋᴇʟɪɴᴋ
┃ ┗━━ ${userPrefix}ɢᴇᴛʟɪɴᴋ
┗━━━━━━━━━━━━━━━━❍

╭━━━❐〔🎬 𝐕𝐈𝐃𝐄𝐎 / 𝐀𝐔𝐃𝐈𝐎〕
┃ ╭──────=───────❐
┃ ┃ ${userPrefix}ᴘʟᴀʏ / ${userPrefix}ꜱᴏɴɢ
┃ ┃ ${userPrefix}ᴠɪᴅᴇᴏ
┃ ┃ ${userPrefix}ʏᴛᴍᴘ3
┃ ┗━━ ${userPrefix}ʏᴛꜱ
┗━━━━━━━━━━━━━━━━❍

    ⟥⌈ 𝙸𝙲𝙾𝙽-𝚇 ᴍɪɴɪ • 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝 ⌉⟤`;

    await socket.sendMessage(from, {
        image: fs.readFileSync('./lucid.jpg'),
        caption: menuText,
        contextInfo: {
            mentionedJid: [msg.key.participant || sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: (config.NEWSLETTER_JID || '').trim(),
                newsletterName: '𝗜𝗖𝗢𝗡-𝗫 𝗠𝗗 𝗨𝗣𝗗𝗔𝗧𝗘𝗦',
                serverMessageId: 143
            }
        }
    });

    break;
}
case 'fc': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (args.length === 0) {
        return await socket.sendMessage(sender, {
            text: `❗ Please provide a channel JID.\n\nExample:\n${userPrefix}fc 1203633963799×××@newsletter`
        });
    }

    const jid = args[0];
    if (!jid.endsWith("@newsletter")) {
        return await socket.sendMessage(sender, {
            text: '❗ Invalid JID. Please provide a JID ending with `@newsletter`'
        });
    }

    try {
        const metadata = await socket.newsletterMetadata("jid", jid);
        if (metadata?.viewer_metadata === null) {
            await socket.newsletterFollow(jid);
            await socket.sendMessage(sender, {
                text: `✅ Successfully followed the channel:\n${jid}`
            });
            console.log(`FOLLOWED CHANNEL: ${jid}`);
        } else {
            await socket.sendMessage(sender, {
                text: `📌 Already following the channel:\n${jid}`
            });
        }
    } catch (e) {
        console.error('❌ Error in follow channel:', e.message || e);
        await socket.sendMessage(sender, {
            text: `❌ Error: ${e.message || e}`
        });
    }
    break;
}
            case 'viewonce':
case 'rvo':
case 'vv': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
    try {
        if (!msg.quoted) return socket.sendMessage(sender, { text: "🚩 *Please reply to a viewonce message*" });
        let quotedmsg = msg?.msg?.contextInfo?.quotedMessage;
        await oneViewmeg(socket, isOwner, quotedmsg, sender);
    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { text: `${e}` });
    }
    break;
}

case 'logo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = args.join(" ");

    if (!q || q.trim() === '') {
        return await socket.sendMessage(sender, { text: '*`Need a name for logo`*' });
    }

    await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });
    const list = await axios.get('https://raw.githubusercontent.com/md2839pv404/anony0808/refs/heads/main/ep.json');

    const rows = list.data.map((v) => ({
        title: v.name,
        description: 'Tap to generate logo',
        id: `${userPrefix}dllogo https://api-pink-venom.vercel.app/api/logo?url=${v.url}&name=${q}`
    }));

    const buttonMessage = {
        buttons: [
            {
                buttonId: 'action',
                buttonText: { displayText: '🎨 Select Text Effect' },
                type: 4,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: 'Available Text Effects',
                        sections: [
                            {
                                title: 'Choose your logo style',
                                rows
                            }
                        ]
                    })
                }
            }
        ],
        headerType: 1,
        viewOnce: true,
        caption: '*LOGO MAKER*',
        image: { url: config.RCD_IMAGE_PATH },
    };

    await socket.sendMessage(from, buttonMessage, { quoted: msg });
    break;
}

              case 'dllogo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = args.join(" ");
    if (!q) return socket.sendMessage(from, { text: "Please give me url for capture the screenshot !!" });

    try {
        const res = await axios.get(q);
        const images = res.data.result?.download_url || res.data.result;
        await socket.sendMessage(sender, {
            image: { url: images },
            caption: config.CAPTION
        }, { quoted: msg });
    } catch (e) {
        console.log('Logo Download Error:', e);
        await socket.sendMessage(from, {
            text: `❌ Error:\n${e.message || e}`
        }, { quoted: msg });
    }
    break;
}

              case 'aiimg': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const prompt = q.trim();

    if (!prompt) {
        return await socket.sendMessage(sender, {
            text: `🎨 *AI Image Generator*\n\n*Usage:* \`${userPrefix}aiimg <prompt>\`\n\n*Example:* \`${userPrefix}aiimg a beautiful sunset over mountains\``
        });
    }

    try {
        await socket.sendMessage(sender, { text: '🧠 *Creating your AI image...*' });

        const apiUrl = `https://api.siputzx.my.id/api/ai/flux?prompt=${encodeURIComponent(prompt)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        if (!response || !response.data) {
            return await socket.sendMessage(sender, {
                text: '❌ *API did not return a valid image. Please try again later.*'
            });
        }

        const imageBuffer = Buffer.from(response.data, 'binary');

        await socket.sendMessage(sender, {
            image: imageBuffer,
            caption: `🧠 *𝙸𝙲𝙾𝙽-𝚇 AI IMAGE*\n\n📌 Prompt: ${prompt}`
        }, { quoted: msg });

    } catch (err) {
        console.error('AI Image Error:', err);
        await socket.sendMessage(sender, {
            text: `❗ *An error occurred:* ${err.response?.data?.message || err.message || 'Unknown error'}`
        });
    }
    break;
}

              case 'fancy': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const text = q.replace(new RegExp(`^${userPrefix}fancy\\s*`), '').trim();

    if (!text) {
        return await socket.sendMessage(sender, {
            text: `🎨 *Fancy Fonts Converter*\n\n*Usage:* \`${userPrefix}fancy <text>\`\n\n*Example:* \`${userPrefix}fancy Moon\``
        });
    }

    try {
        const apiUrl = `https://www.dark-yasiya-api.site/other/font?text=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl);

        if (!response.data.status || !response.data.result) {
            return await socket.sendMessage(sender, {
                text: "❌ *Error fetching fonts from API. Please try again later.*"
            });
        }

        const fontList = response.data.result
            .map(font => `*${font.name}:*\n${font.result}`)
            .join("\n\n");

        const finalMessage = `🎨 *Fancy Fonts Converter*\n\n${fontList}\n\n_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;

        await socket.sendMessage(sender, { text: finalMessage }, { quoted: msg });

    } catch (err) {
        console.error("Fancy Font Error:", err);
        await socket.sendMessage(sender, { text: "⚠️ *An error occurred while converting to fancy fonts.*" });
    }
    break;
}

              case 'ts': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const query = q.replace(new RegExp(`^${userPrefix}ts\\s*`), '').trim();

    if (!query) {
        return await socket.sendMessage(sender, {
            text: `[❗] *TikTok Search*\n\n*Usage:* \`${userPrefix}ts <search query>\`\n\n*Example:* \`${userPrefix}ts funny cats\``
        }, { quoted: msg });
    }

    async function tiktokSearch(query) {
        try {
            const searchParams = new URLSearchParams({
                keywords: query,
                count: '10',
                cursor: '0',
                HD: '1'
            });

            const response = await axios.post("https://tikwm.com/api/feed/search", searchParams, {
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8",
                    'Cookie': "current_language=en",
                    'User-Agent': "Mozilla/5.0"
                }
            });

            const videos = response.data?.data?.videos;
            if (!videos || videos.length === 0) {
                return { status: false, result: "No videos found." };
            }

            return {
                status: true,
                result: videos.map(video => ({
                    description: video.title || "No description",
                    videoUrl: video.play || ""
                }))
            };
        } catch (err) {
            return { status: false, result: err.message };
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    try {
        const searchResults = await tiktokSearch(query);
        if (!searchResults.status) throw new Error(searchResults.result);

        const results = searchResults.result;
        shuffleArray(results);

        const selected = results.slice(0, 6);

        const cards = await Promise.all(selected.map(async (vid) => {
            const videoBuffer = await axios.get(vid.videoUrl, { responseType: "arraybuffer" });
            const media = await prepareWAMessageMedia({ video: videoBuffer.data }, {
                upload: socket.waUploadToServer
            });

            return {
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: '' }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "𝙸𝙲𝙾𝙽-𝚇" }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: vid.description,
                    hasMediaAttachment: true,
                    videoMessage: media.videoMessage
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: []
                })
            };
        }));

        const msgContent = generateWAMessageFromContent(sender, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: { text: `🔎 *TikTok Search:* ${query}` },
                        footer: { text: "> 𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 *ICON-X* mini" },
                        header: { hasMediaAttachment: false },
                        carouselMessage: { cards }
                    })
                }
            }
        }, { quoted: msg });

        await socket.relayMessage(sender, msgContent.message, { messageId: msgContent.key.id });

    } catch (err) {
        await socket.sendMessage(sender, {
            text: `❌ Error: ${err.message}`
        }, { quoted: msg });
    }
    break;
}
              case 'tiktok': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const link = q.replace(new RegExp(`^${userPrefix}tiktok(dl)?|tt(dl)?\\s*`), '').trim();

    if (!link) {
        return await socket.sendMessage(sender, {
            text: `📌 *TikTok Downloader*\n\n*Usage:* \`${userPrefix}tiktok <link>\`\n\n*Example:* \`${userPrefix}tiktok https://vm.tiktok.com/xxxxx\``
        }, { quoted: msg });
    }

    if (!link.includes('tiktok.com')) {
        return await socket.sendMessage(sender, {
            text: '❌ *Invalid TikTok link.*'
        }, { quoted: msg });
    }

    try {
        await socket.sendMessage(sender, {
            text: '⏳ Downloading video, please wait...'
        }, { quoted: msg });

        const apiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${encodeURIComponent(link)}`;
        const { data } = await axios.get(apiUrl);

        if (!data?.status || !data?.data) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to fetch TikTok video.'
            }, { quoted: msg });
        }

        const { title, like, comment, share, author, meta } = data.data;
        const video = meta.media.find(v => v.type === "video");

        if (!video || !video.org) {
            return await socket.sendMessage(sender, {
                text: '❌ No downloadable video found.'
            }, { quoted: msg });
        }

        const caption = `🎵 *TikTok Video*\n\n` +
                        `👤 *User:* ${author.nickname} (@${author.username})\n` +
                        `📖 *Title:* ${title}\n` +
                        `👍 *Likes:* ${like}\n💬 *Comments:* ${comment}\n🔁 *Shares:* ${share}`;

        await socket.sendMessage(sender, {
            video: { url: video.org },
            caption: caption,
            contextInfo: { mentionedJid: [msg.key.participant || sender] }
        }, { quoted: msg });

    } catch (err) {
        console.error("TikTok command error:", err);
        await socket.sendMessage(sender, {
            text: `❌ An error occurred:\n${err.message}`
        }, { quoted: msg });
    }
    break;
}

case 'fb': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const q = msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || 
              msg.message?.imageMessage?.caption || 
              msg.message?.videoMessage?.caption || 
              '';

    const fbUrl = q.replace(new RegExp(`^${userPrefix}fb\\s*`), '').trim();

    if (!fbUrl || !/facebook\.com|fb\.watch/.test(fbUrl)) {
        return await socket.sendMessage(sender, { 
            text: `🧩 *Facebook Video Downloader*\n\n*Usage:* \`${userPrefix}fb <facebook-video-link>\`\n\n*Example:* \`${userPrefix}fb https://www.facebook.com/watch?v=xxxxx\`` 
        });
    }

    try {
        const res = await axios.get(`https://suhas-bro-api.vercel.app/download/fbdown?url=${encodeURIComponent(fbUrl)}`);
        const result = res.data.result;

        await socket.sendMessage(sender, { react: { text: '⬇', key: msg.key } });

        await socket.sendMessage(sender, {
            video: { url: result.sd },
            mimetype: 'video/mp4',
            caption: '> 𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 *ICON-X* mini'
        }, { quoted: msg });

        await socket.sendMessage(sender, { react: { text: '✔', key: msg.key } });

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { text: '*❌ Error downloading video.*' });
    }
    break;
}

              case 'gossip': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const response = await fetch('https://suhas-bro-api.vercel.app/news/gossiplankanews');
        if (!response.ok) {
            throw new Error('API returned error');
        }
        const data = await response.json();

        if (!data.status || !data.result || !data.result.title || !data.result.desc || !data.result.link) {
            throw new Error('Invalid news data received');
        }

        const { title, desc, date, link } = data.result;

        let thumbnailUrl = 'https://via.placeholder.com/150';
        try {
            const pageResponse = await fetch(link);
            if (pageResponse.ok) {
                const pageHtml = await pageResponse.text();
                const $ = cheerio.load(pageHtml);
                const ogImage = $('meta[property="og:image"]').attr('content');
                if (ogImage) {
                    thumbnailUrl = ogImage; 
                }
            }
        } catch (err) {
            console.warn(`Thumbnail scrape failed for ${link}: ${err.message}`);
        }

        await socket.sendMessage(sender, {
            image: { url: thumbnailUrl },
            caption: formatMessage(
                '📰 * 𝙸𝙲𝙾𝙽-𝚇 GOSSIP 📰',
                `📢 *${title}*\n\n${desc}\n\n🕒 *Date*: ${date || 'Unknown'}\n🌐 *Link*: ${link}`,
                '𝙸𝙲𝙾𝙽-𝚇 𝐅𝚁𝙴𝙴 𝐁𝙾𝚃'
            )
        });
    } catch (error) {
        console.error(`Error in 'gossip' case: ${error.message || error}`);
        await socket.sendMessage(sender, {
            text: '⚠️ Failed to fetch gossip news.'
        });
    }
    break;
}

              case 'nasa': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        if (!response.ok) {
            throw new Error('Failed to fetch APOD from NASA API');
        }
        const data = await response.json();

        if (!data.title || !data.explanation || !data.date || !data.url) {
            throw new Error('Invalid APOD data received');
        }

        const { title, explanation, date, url, copyright } = data;
        const thumbnailUrl = url || 'https://via.placeholder.com/150';

        await socket.sendMessage(sender, {
            image: { url: thumbnailUrl },
            caption: formatMessage(
                '🌌 𝙸𝙲𝙾𝙽-𝚇 𝐍𝐀𝐒𝐀 𝐍𝐄𝐖𝐒',
                `🌠 *${title}*\n\n${explanation.substring(0, 200)}...\n\n📆 *Date*: ${date}\n${copyright ? `📝 *Credit*: ${copyright}` : ''}\n🔗 *Link*: https://apod.nasa.gov/apod/astropix.html`,
                '> 𝙸𝙲𝙾𝙽-𝚇 𝐌𝙸𝙽𝙸 𝐁𝙾𝚃'
            )
        });

    } catch (error) {
        console.error(`Error in 'nasa' case: ${error.message || error}`);
        await socket.sendMessage(sender, {
            text: '⚠️ NASA fetch failed.'
        });
    }
    break;
}

              case 'news': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const response = await fetch('https://suhas-bro-api.vercel.app/news/lnw');
        if (!response.ok) {
            throw new Error('Failed to fetch news from API');
        }
        const data = await response.json();

        if (!data.status || !data.result || !data.result.title || !data.result.desc || !data.result.date || !data.result.link) {
            throw new Error('Invalid news data received');
        }

        const { title, desc, date, link } = data.result;
        let thumbnailUrl = 'https://via.placeholder.com/150';
        try {
            const pageResponse = await fetch(link);
            if (pageResponse.ok) {
                const pageHtml = await pageResponse.text();
                const $ = cheerio.load(pageHtml);
                const ogImage = $('meta[property="og:image"]').attr('content');
                if (ogImage) {
                    thumbnailUrl = ogImage;
                }
            }
        } catch (err) {
            console.warn(`Failed to scrape thumbnail from ${link}: ${err.message}`);
        }

        await socket.sendMessage(sender, {
            image: { url: thumbnailUrl },
            caption: formatMessage(
                '📰 𝙸𝙲𝙾𝙽-𝚇 📰',
                `📢 *${title}*\n\n${desc}\n\n🕒 *Date*: ${date}\n🌐 *Link*: ${link}`,
                '> 𝙸𝙲𝙾𝙽-𝚇'
            )
        });
    } catch (error) {
        console.error(`Error in 'news' case: ${error.message || error}`);
        await socket.sendMessage(sender, {
            text: '⚠️ news fetch failed.'
        });
    }
    break;
}

              case 'cricket': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        console.log('Fetching cricket news from API...');
        const response = await fetch('https://suhas-bro-api.vercel.app/news/cricbuzz');
        console.log(`API Response Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.status || !data.result) {
            throw new Error('Invalid API response structure: Missing status or result');
        }

        const { title, score, to_win, crr, link } = data.result;
        if (!title || !score || !to_win || !crr || !link) {
            throw new Error('Missing required fields in API response');
        }

        await socket.sendMessage(sender, {
            text: formatMessage(
                '🏏 𝙸𝙲𝙾𝙽-𝚇 CRICKET NEWS🏏',
                `📢 *${title}*\n\n` +
                `🏆 *Mark*: ${score}\n` +
                `🎯 *To Win*: ${to_win}\n` +
                `📈 *Current Rate*: ${crr}\n\n` +
                `🌐 *Link*: ${link}`,
                '> 𝙸𝙲𝙾𝙽-𝚇'
            )
        });
    } catch (error) {
        console.error(`Error in 'cricket' case: ${error.message || error}`);
        await socket.sendMessage(sender, {
            text: '⚠️ Cricket fetch failed.'
        });
    }
    break;
}

              case 'apk': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const appName = args.join(" ");

    if (!appName) {
        return await socket.sendMessage(sender, {
            text: `❌ *APK Downloader*\n\n*Usage:* \`${userPrefix}apk <app name>\`\n\n*Example:* \`${userPrefix}apk WhatsApp\``
        }, { quoted: msg });
    }

    await socket.sendMessage(sender, {
        react: { text: '⬇️', key: msg.key }
    });

    try {
        const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(appName)}/limit=1`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data || !data.datalist || !data.datalist.list.length) {
            await socket.sendMessage(sender, {
                react: { text: '❌', key: msg.key }
            });
            return await socket.sendMessage(sender, {
                text: '⚠️ *No results found for the given app name.*\n\nPlease try a different search term.'
            }, { quoted: msg });
        }

        const app = data.datalist.list[0];
        const appSize = (app.size / 1048576).toFixed(2);

        const caption = `
🌙 *𝙸𝙲𝙾𝙽-𝚇 Aᴘᴋ* 🌙

📦 *Nᴀᴍᴇ:* ${app.name}

🏋 *Sɪᴢᴇ:* ${appSize} MB

📦 *Pᴀᴄᴋᴀɢᴇ:* ${app.package}

📅 *Uᴘᴅᴀᴛᴇᴅ ᴏɴ:* ${app.updated}

👨‍💻 *Dᴇᴠᴇʟᴏᴘᴇʀ:* ${app.developer.name}

> ⏳ *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴀᴘᴋ...*

> *© 𝙸𝙲𝙾𝙽-𝚇*`;

        if (app.icon) {
            await socket.sendMessage(sender, {
                image: { url: app.icon },
                caption: caption,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.NEWSLETTER_JID || '120363426745883545@newsletter',
                        newsletterName: '𝗜𝗖𝗢𝗡-𝗫 𝗠𝗗 𝗨𝗣𝗗𝗔𝗧𝗘𝗦',
                        serverMessageId: -1
                    }
                }
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: caption,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.NEWSLETTER_JID || '120363426745883545@newsletter',
                        newsletterName: '𝗜𝗖𝗢𝗡-𝗫 𝗠𝗗 𝗨𝗣𝗗𝗔𝗧𝗘𝗦',
                        serverMessageId: -1
                    }
                }
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, {
            react: { text: '⬆️', key: msg.key }
        });

        await socket.sendMessage(sender, {
            document: { url: app.file.path_alt },
            fileName: `${app.name}.apk`,
            mimetype: 'application/vnd.android.package-archive',
            caption: `✅ *Aᴘᴋ Dᴏᴡɴʟᴏᴀᴅᴇᴅ Sᴜᴄᴄᴇꜱꜰᴜʟʟʏ!*\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ *𝙸𝙲𝙾𝙽-𝚇 🌙`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWSLETTER_JID || '120363426745883545@newsletter',
                    newsletterName: '𝗜𝗖𝗢𝗡-𝗫 𝗠𝗗 𝗨𝗣𝗗𝗔𝗧𝗘𝗦',
                    serverMessageId: -1
                }
            }
        }, { quoted: msg });

        await socket.sendMessage(sender, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('Error in APK command:', error);
        
        await socket.sendMessage(sender, {
            react: { text: '❌', key: msg.key }
        });
        
        await socket.sendMessage(sender, {
            text: '❌ *An error occurred while fetching the APK.*\n\nPlease try again later or use a different app name.'
        }, { quoted: msg });
    }
    break;
}

case 'checkusers':
case 'totalusers': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    try {
        const activeCount = activeSockets.size;
        
        const totalMessage = `👑 *USER STATISTICS*\n\n` +
                           `📊 *Active Users:* ${activeCount}\n` +
                           `🔗 *Total Bots Running:* ${activeSockets.size}\n` +
                           `📈 *Real-time Connections:* ${activeCount}\n\n` +
                           `📅 *Date:* ${new Date().toLocaleDateString()}\n` +
                           `🕒 *Time:* ${new Date().toLocaleTimeString()}\n\n` +
                           `_𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝚈 𝙼𝚛 𝙴𝚕𝚎𝚙𝚑𝚊𝚗𝚝_`;
        
        await socket.sendMessage(sender, {
            text: totalMessage
        }, { quoted: msg });
        
        if (activeSockets.size > 0) {
            let activeList = `📱 *Active User Numbers:*\n`;
            activeSockets.forEach((socketObj, number) => {
                activeList += `• ${number}\n`;
            });
            
            await socket.sendMessage(sender, {
                text: activeList
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('Checkusers command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to fetch user statistics.'
        }, { quoted: msg });
    }
    break;
}

case 'sendtouser':
case 'broadcast': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    const messageText = args.join(' ').trim();
    
    if (!messageText) {
        return await socket.sendMessage(sender, {
            text: `📢 *Broadcast Message*\n\n*Usage:* \`${userPrefix}sendtouser <message>\`\n\n*Example:* \`${userPrefix}sendtouser Hello everyone! This is a broadcast message.\``
        }, { quoted: msg });
    }
    
    try {
        await socket.sendMessage(sender, {
            text: `📢 *BROADCAST CONFIRMATION*\n\n*Message:* ${messageText}\n\n*Recipients:* ${activeSockets.size} active users\n\nReply with "yes" to send or "no" to cancel.`
        }, { quoted: msg });
        
        if (activeSockets.size === 0) {
            return await socket.sendMessage(sender, {
                text: '❌ No active users to send message to.'
            }, { quoted: msg });
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const [number, socketObj] of activeSockets.entries()) {
            try {
                const userJid = `${number}@s.whatsapp.net`;
                await socket.sendMessage(userJid, {
                    text: `📢 *BROADCAST MESSAGE*\n\n${messageText}\n\n_From: Bot Admin_`
                });
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to send to ${number}:`, error);
                failCount++;
            }
        }
        
        const report = `📢 *BROADCAST COMPLETE*\n\n` +
                      `✅ *Successfully sent to:* ${successCount} users\n` +
                      `❌ *Failed to send to:* ${failCount} users\n` +
                      `📊 *Total attempted:* ${activeSockets.size} users\n\n` +
                      `📝 *Message sent:*\n${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`;
        
        await socket.sendMessage(sender, {
            text: report
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Sendtouser command error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to send broadcast message.'
        }, { quoted: msg });
    }
    break;
}

// Alternative: Send with media
case 'sendtousermedia': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!isOwner) {
        return await socket.sendMessage(sender, {
            text: '❌ This command is only for the bot owner.'
        }, { quoted: msg });
    }
    
    const quotedMsg = msg.quoted;
    if (!quotedMsg) {
        return await socket.sendMessage(sender, {
            text: `🖼️ *Broadcast with Media*\n\n*Usage:* Reply to an image/video with \`${userPrefix}sendtousermedia <caption>\``
        }, { quoted: msg });
    }
    
    const caption = args.join(' ').trim();
    
    try {
        if (activeSockets.size === 0) {
            return await socket.sendMessage(sender, {
                text: '❌ No active users to send message to.'
            }, { quoted: msg });
        }
        
        let successCount = 0;
        let failCount = 0;
        
        let mediaType = '';
        let mediaContent = null;
        
        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            mediaContent = quotedMsg.imageMessage;
        } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            mediaContent = quotedMsg.videoMessage;
        } else {
            return await socket.sendMessage(sender, {
                text: '❌ Only image and video media are supported.'
            }, { quoted: msg });
        }
        
        const stream = await downloadContentFromMessage(mediaContent, mediaType);
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        for (const [number, socketObj] of activeSockets.entries()) {
            try {
                const userJid = `${number}@s.whatsapp.net`;
                
                if (mediaType === 'image') {
                    await socket.sendMessage(userJid, {
                        image: buffer,
                        caption: caption ? `📢 *BROADCAST*\n\n${caption}` : '📢 *Broadcast Message*'
                    });
                } else if (mediaType === 'video') {
                    await socket.sendMessage(userJid, {
                        video: buffer,
                        caption: caption ? `📢 *BROADCAST*\n\n${caption}` : '📢 *Broadcast Message*'
                    });
                }
                
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Failed to send media to ${number}:`, error);
                failCount++;
            }
        }
        
        const report = `🖼️ *MEDIA BROADCAST COMPLETE*\n\n` +
                      `✅ *Successfully sent to:* ${successCount} users\n` +
                      `❌ *Failed to send to:* ${failCount} users\n` +
                      `📸 *Media type:* ${mediaType.toUpperCase()}\n` +
                      `📝 *Caption:* ${caption || 'No caption'}`;
        
        await socket.sendMessage(sender, {
            text: report
        }, { quoted: msg });
        
    } catch (error) {
        console.error('Sendtousermedia error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Failed to broadcast media.'
        }, { quoted: msg });
    }
    break;
}
              case 'bible': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const reference = args.join(" ");

        if (!reference) {
            await socket.sendMessage(sender, {
                text: `⚠️ *Bible Verse*\n\n*Usage:* \`${userPrefix}bible <reference>\`\n\n📝 *Examples:*\n\`${userPrefix}bible John 1:1\`\n\`${userPrefix}bible Psalm 23\`\n\`${userPrefix}bible Matthew 5:3-10\``
            }, { quoted: msg });
            break;
        }

        const apiUrl = `https://bible-api.com/${encodeURIComponent(reference)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        if (response.status === 200 && response.data && response.data.text) {
            const { reference: ref, text, translation_name, verses } = response.data;

            let verseText = text;
            
            if (verses && verses.length > 0) {
                verseText = verses.map(v => 
                    `${v.book_name} ${v.chapter}:${v.verse} - ${v.text}`
                ).join('\n\n');
            }

            await socket.sendMessage(sender, {
                text: `📖 *BIBLE VERSE*\n\n` +
                      `📚 *Reference:* ${ref}\n\n` +
                      `📜 *Text:*\n${verseText}\n\n` +
                      `🔄 *Translation:* ${translation_name}\n\n` +
                      `> ✨ *Powered by ICON-X*`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *Verse not found.*\n\nPlease check if the reference is valid.\n\n📋 *Valid format examples:*\n- John 3:16\n- Psalm 23:1-6\n- Genesis 1:1-5\n- Matthew 5:3-10`
            }, { quoted: msg });
        }
    } catch (error) {
        console.error("Bible command error:", error.message);
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            await socket.sendMessage(sender, {
                text: "⏰ *Request timeout.* Please try again in a moment."
            }, { quoted: msg });
        } else if (error.response) {
            await socket.sendMessage(sender, {
                text: `❌ *API Error:* ${error.response.status}\n\nCould not fetch the Bible verse. Please try a different reference.`
            }, { quoted: msg });
        } else if (error.request) {
            await socket.sendMessage(sender, {
                text: "🌐 *Network error.* Please check your internet connection and try again."
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: "⚠️ *An error occurred while fetching the Bible verse.*\n\nPlease try again or use a different reference."
            }, { quoted: msg });
        }
    }
    break;
}

              case 'gitclone': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const AXIOS_DEFAULTS = {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function tryRequest(getter, attempts = 3) {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await getter();
            } catch (err) {
                lastError = err;
                if (attempt < attempts) {
                    await delay(1000 * attempt);
                }
            }
        }
        throw lastError;
    }

    async function sendReaction(emoji) {
        try {
            await socket.sendMessage(sender, { 
                react: { 
                    text: emoji, 
                    key: msg.key 
                } 
            });
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    async function downloadAndZipRepo(gitUrl) {
        try {
            const repoMatch = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (!repoMatch) throw new Error('Invalid GitHub URL');
            
            const [, owner, repo] = repoMatch;
            const repoName = repo.replace(/\.git$/, '');
            
            const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
            const repoInfo = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            
            const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/main.zip`;
            
            return {
                downloadUrl: zipUrl,
                info: repoInfo.data,
                fileName: `${repoName}-main.zip`
            };
        } catch (error) {
            try {
                const repoMatch = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
                if (!repoMatch) throw error;
                
                const [, owner, repo] = repoMatch;
                const repoName = repo.replace(/\.git$/, '');
                
                const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`;
                
                return {
                    downloadUrl: zipUrl,
                    info: { name: repoName, owner: { login: owner } },
                    fileName: `${repoName}-master.zip`
                };
            } catch {
                throw new Error('Failed to get repository information');
            }
        }
    }

    async function getGitHubRepoInfo(gitUrl) {
        try {
            const repoMatch = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (!repoMatch) throw new Error('Invalid GitHub URL');
            
            const [, owner, repo] = repoMatch;
            const repoName = repo.replace(/\.git$/, '');
            
            const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;
            const response = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            
            return response.data;
        } catch (error) {
            const repoMatch = gitUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
            if (repoMatch) {
                const [, owner, repo] = repoMatch;
                const repoName = repo.replace(/\.git$/, '');
                return {
                    name: repoName,
                    owner: { login: owner },
                    description: 'Repository information unavailable',
                    stargazers_count: 0,
                    forks_count: 0,
                    size: 0,
                    language: null,
                    html_url: gitUrl
                };
            }
            throw error;
        }
    }

    const q = msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || '';
    
    const cleanText = q.replace(new RegExp(`^${userPrefix}gitclone\\s*`), '').trim();
    
    await sendReaction('📥');
    
    if (!cleanText) {
        await sendReaction('❓');
        await socket.sendMessage(sender, { 
            text: `*📥 GIT CLONE DOWNLOADER 📥*\n\n*Usage:*\n\`${userPrefix}gitclone <github-url>\`\n\n*Examples:*\n\`${userPrefix}gitclone https://github.com/owner/repo\`\n\`${userPrefix}gitclone owner/repo\`\n\n*Note:* Downloads repository as ZIP file` 
        }, { quoted: msg });
        break;
    }

    let gitUrl = cleanText;
    if (!gitUrl.includes('://')) {
        if (gitUrl.includes('/')) {
            gitUrl = `https://github.com/${gitUrl}`;
        } else {
            await sendReaction('❌');
            await socket.sendMessage(sender, { 
                text: `*❌ Invalid Input!*\nPlease provide a valid GitHub URL or owner/repo format\n\n*Example:* \`owner/repo\` or \`https://github.com/owner/repo\`` 
            }, { quoted: msg });
            break;
        }
    }

    if (!gitUrl.includes('github.com')) {
        await sendReaction('❌');
        await socket.sendMessage(sender, { 
            text: '*❌ Invalid GitHub URL!*\nOnly GitHub repositories are supported.' 
        }, { quoted: msg });
        break;
    }

    await sendReaction('🔍');
    
    await socket.sendMessage(sender, { 
        text: `*🔍 Fetching repository:* \`${gitUrl}\`\n⏳ Please wait...` 
    }, { quoted: msg });

    try {
        const repoInfo = await getGitHubRepoInfo(gitUrl);
        
        const infoBox = `╭───「 📦 REPOSITORY INFO 」───⊷\n` +
                       `│ 📁 *Repository:* ${repoInfo.name}\n` +
                       `│ 👤 *Owner:* ${repoInfo.owner.login}\n` +
                       `│ ⭐ *Stars:* ${repoInfo.stargazers_count.toLocaleString()}\n` +
                       `│ 🍴 *Forks:* ${repoInfo.forks_count.toLocaleString()}\n` +
                       `│ 📏 *Size:* ${(repoInfo.size / 1024).toFixed(2)} MB\n` +
                       `│ 💻 *Language:* ${repoInfo.language || 'Not specified'}\n` +
                       `│ 📝 *Description:* ${repoInfo.description || 'No description'}\n` +
                       `╰─────────────────────────────⊷`;
        
        await socket.sendMessage(sender, {
            text: infoBox
        }, { quoted: msg });

        await sendReaction('⏳');
        
        await socket.sendMessage(sender, { 
            text: `*📥 Preparing download...*` 
        }, { quoted: msg });

        const repoData = await downloadAndZipRepo(gitUrl);
        
        await sendReaction('⬇️');
        
        await socket.sendMessage(sender, {
            document: { url: repoData.downloadUrl },
            mimetype: 'application/zip',
            fileName: repoData.fileName,
            caption: `╭───「 ✅ REPOSITORY DOWNLOADED 」───⊷\n` +
                    `│ 📁 *File:* ${repoData.fileName}\n` +
                    `│ 📦 *Repository:* ${repoInfo.name}\n` +
                    `│ 👤 *Owner:* ${repoInfo.owner.login}\n` +
                    `│ 🔗 *Source:* ${repoInfo.html_url}\n` +
                    `│ 💾 *Format:* ZIP Archive\n` +
                    `╰─────────────────────────────────⊷\n\n` +
                    `💡 *Extract the ZIP file to access repository files*`,
            contextInfo: {
                externalAdReply: {
                    title: 'GIT CLONE DOWNLOADER',
                    body: '📥 GitHub Repository Download',
                    thumbnailUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                    sourceUrl: repoInfo.html_url,
                    mediaType: 1,
                    previewType: 0,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

        await sendReaction('✅');

        await delay(1000);
        await socket.sendMessage(sender, { 
            text: `✨ *Repository cloned successfully!*\n` +
                  `📁 *Saved as:* ${repoData.fileName}\n` +
                  `💡 *Use a ZIP extractor to access the files*\n\n` +
                  `> ICON-X`
        }, { quoted: msg });

    } catch (error) {
        console.error('GitClone error:', error);
        await sendReaction('❌');
        
        if (error.message.includes('Invalid GitHub URL') || error.message.includes('Invalid Input')) {
            await socket.sendMessage(sender, { 
                text: `*❌ Invalid GitHub URL!*\nPlease provide a valid GitHub repository URL.\n\n*Format:* \`https://github.com/owner/repository\`` 
            }, { quoted: msg });
        } else if (error.message.includes('Not Found') || error.response?.status === 404) {
            await socket.sendMessage(sender, { 
                text: '*❌ Repository Not Found!*\nThe repository does not exist or is private.\n\n*Check:*\n1. Repository exists\n2. Repository is public\n3. URL is correct' 
            }, { quoted: msg });
        } else if (error.code === 'ECONNABORTED') {
            await socket.sendMessage(sender, { 
                text: '*❌ Request Timeout!*\nThe repository is too large or server is busy.\n\nTry again later or download manually from GitHub.' 
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, { 
                text: `*❌ Download Failed!*\nError: ${error.message}\n\n*Try:*\n1. Check your internet\n2. Verify repository URL\n3. Try again later` 
            }, { quoted: msg });
        }
    }
    break;
}

case 'video': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const AXIOS_DEFAULTS = {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function tryRequest(getter, attempts = 3) {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await getter();
            } catch (err) {
                lastError = err;
                if (attempt < attempts) {
                    await delay(1000 * attempt);
                }
            }
        }
        throw lastError;
    }

    async function getVideoAPI(youtubeUrl) {
        const url = `https://apiskeith.vercel.app/download/video?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await tryRequest(() => axios.get(url, AXIOS_DEFAULTS));
        if (res.data?.status && res.data.result) {
            return {
                download: res.data.result,
                title: 'Video'
            };
        }
        throw new Error("Video API failed");
    }

    async function getYtmp4API(youtubeUrl) {
        const url = `https://apiskeith.vercel.app/download/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await tryRequest(() => axios.get(url, AXIOS_DEFAULTS));
        if (res.data?.status && res.data.result?.url) {
            return {
                download: res.data.result.url,
                title: res.data.result.filename || 'Video'
            };
        }
        throw new Error("YTMP4 API failed");
    }

    async function sendReaction(emoji) {
        try {
            await socket.sendMessage(sender, { 
                react: { 
                    text: emoji, 
                    key: msg.key 
                } 
            });
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    const q = msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || '';
    
    const cleanText = q.replace(new RegExp(`^${userPrefix}video\\s*`), '').trim();
    
    await sendReaction('🎬');
    
    if (!cleanText) {
        await sendReaction('❓');
        await socket.sendMessage(sender, { 
            text: `*🎬 VIDEO DOWNLOADER 🎬*\n\n*Usage:*\n\`${userPrefix}video <title>\`\n\`${userPrefix}video <youtube link>\`\n\n*Example:*\n\`${userPrefix}video Faded by Alan Walker\`\n\`${userPrefix}video https://youtu.be/xxxxx\`` 
        }, { quoted: msg });
        break;
    }

    await sendReaction('🔍');
    
    await socket.sendMessage(sender, { 
        text: `*🔍 Searching for video:* \`${cleanText}\`\n⏳ Please wait...` 
    }, { quoted: msg });

    let video;
    if (cleanText.includes('youtube.com') || cleanText.includes('youtu.be')) {
        try {
            const ytdl = require('ytdl-core');
            const info = await ytdl.getInfo(cleanText);
            video = {
                url: cleanText,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                timestamp: `${Math.floor(info.videoDetails.lengthSeconds / 60)}:${String(info.videoDetails.lengthSeconds % 60).padStart(2, '0')}`,
                views: parseInt(info.videoDetails.viewCount) || 0,
                author: { name: info.videoDetails.author.name },
                ago: 'Recent'
            };
        } catch (e) {
            video = {
                url: cleanText,
                title: 'YouTube Video',
                thumbnail: 'https://i.ytimg.com/vi/default.jpg',
                timestamp: '0:00',
                views: 0,
                author: { name: 'Unknown' },
                ago: 'Unknown'
            };
        }
    } else {
        const yts = require('yt-search');
        const search = await yts(cleanText);
        if (!search || !search.videos.length) {
            await sendReaction('❌');
            await socket.sendMessage(sender, { 
                text: `🔍 *No video results found for:* "${cleanText}"\n\n✨ *Try searching with different keywords*` 
            }, { quoted: msg });
            break;
        }
        video = search.videos[0];
    }

    let videoBox = `╭───「 🎬 𝗩𝗜𝗗𝗘𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 」───⊷\n` +
      `│ 📋 *Title:* ${video.title}\n` +
      `│ 👁️ *Views:* ${video.views.toLocaleString()}\n` +
      `│ ⏱️ *Duration:* ${video.timestamp}\n` +
      `│ 📅 *Uploaded:* ${video.ago}\n` +
      `│ 🔗 *URL:* ${video.url}\n` +
      `│ 💫 *Powered by 𝙸𝙲𝙾𝙽-𝚇*\n` +
      `╰──────────────────────────────⊷`;

    await socket.sendMessage(sender, {
        image: { url: video.thumbnail },
        caption: videoBox
    }, { quoted: msg });

    await sendReaction('⏳');
    
    await socket.sendMessage(sender, { 
        text: `*📥 Processing video download...*` 
    }, { quoted: msg });

    let videoData;
    try {
        const apiList = [
            async () => await getVideoAPI(video.url),
            async () => await getYtmp4API(video.url),
        ];

        for (let api of apiList) {
            try {
                videoData = await api();
                console.log(`✅ Success using video API`);
                break;
            } catch (e) {
                console.log(`❌ Video API attempt failed: ${e.message}`);
                continue;
            }
        }

        if (!videoData) {
            throw new Error("All video APIs failed");
        }
    } catch (e) {
        await sendReaction('❌');
        await socket.sendMessage(sender, { 
            text: `❌ *Video Download Failed*\n\nUnable to fetch video content. Please try again later.\n\nError: ${e.message}` 
        }, { quoted: msg });
        break;
    }

    await sendReaction('⬇️');
    
    const fileName = `${video.title}.mp4`
        .replace(/[<>:"/\\|?*]+/g, '')
        .substring(0, 200);
    
    const downloadUrl = videoData.download;
    
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
        await sendReaction('❌');
        await socket.sendMessage(sender, { 
            text: '*❌ Invalid video download URL!*' 
        }, { quoted: msg });
        break;
    }
    
    await socket.sendMessage(sender, {
        video: { url: downloadUrl },
        mimetype: 'video/mp4',
        caption: `╭───「 ✅ 𝗩𝗜𝗗𝗘𝗢 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 」───⊷\n` +
                `│ 🎥 *Title:* ${video.title}\n` +
                `│ ⏱️ *Duration:* ${video.timestamp}\n` +
                `│ 💫 *Powered by 𝙸𝙲𝙾𝙽-𝚇*\n` +
                `│ 📥 *Download Complete*\n` +
                `╰───────────────────────────⊷`,
        contextInfo: {
            externalAdReply: {
                title: 'VIDEO DOWNLOADER',
                body: '🎬 Powered by Mr Elephant',
                thumbnailUrl: video.thumbnail,
                sourceUrl: video.url || '',
                mediaType: 1,
                previewType: 0,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: msg });

    await sendReaction('✅');

    await delay(1000);
    await socket.sendMessage(sender, { 
        text: `✨ *Video downloaded successfully!*\n` +
              `🎬 *Ready to watch*\n` +
              `💫 *Thank you for using our service*`
    }, { quoted: msg });

    break;
}

case 'song':
case 'play': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const AXIOS_DEFAULTS = {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    };

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function tryRequest(getter, attempts = 3) {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await getter();
            } catch (err) {
                lastError = err;
                if (attempt < attempts) {
                    await delay(1000 * attempt);
                }
            }
        }
        throw lastError;
    }

    async function getAudioAPI(youtubeUrl) {
        const url = `https://apiskeith.vercel.app/download/audio?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await tryRequest(() => axios.get(url, AXIOS_DEFAULTS));
        if (res.data?.status && res.data.result) {
            return {
                download: res.data.result,
                title: 'Audio Track'
            };
        }
        throw new Error("Audio API failed");
    }

    async function getYtmp3API(youtubeUrl) {
        const url = `https://apiskeith.vercel.app/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await tryRequest(() => axios.get(url, AXIOS_DEFAULTS));
        if (res.data?.status && res.data.result?.url) {
            return {
                download: res.data.result.url,
                title: res.data.result.filename || 'Audio Track'
            };
        }
        throw new Error("YTMP3 API failed");
    }

    async function sendReaction(emoji) {
        try {
            await socket.sendMessage(sender, { 
                react: { 
                    text: emoji, 
                    key: msg.key 
                } 
            });
        } catch (error) {
            console.error('Error sending reaction:', error);
        }
    }

    const q = msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || '';
    
    const cleanText = q.replace(new RegExp(`^${userPrefix}(song|play)\\s*`), '').trim();
    
    await sendReaction('🎵');
    
    if (!cleanText) {
        await sendReaction('❓');
        await socket.sendMessage(sender, { 
            text: `*🎵 𝙸𝙲𝙾𝙽-𝚇 AI - MUSIC PLAYER 🎵*\n\n*Usage:*\n\`${userPrefix}play <song name>\`\n\`${userPrefix}play <youtube link>\`\n\n*Example:*\n\`${userPrefix}play understand by omah lay\`\n\`${userPrefix}play https://youtu.be/example\`` 
        }, { quoted: msg });
        break;
    }

    await sendReaction('🔍');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');

    let video;
    if (cleanText.includes('youtube.com') || cleanText.includes('youtu.be')) {
        try {
            const ytdl = require('ytdl-core');
            const info = await ytdl.getInfo(cleanText);
            video = {
                url: cleanText,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
                timestamp: `${Math.floor(info.videoDetails.lengthSeconds / 60)}:${String(info.videoDetails.lengthSeconds % 60).padStart(2, '0')}`,
                views: parseInt(info.videoDetails.viewCount) || 0,
                author: { name: info.videoDetails.author.name }
            };
        } catch (e) {
            video = {
                url: cleanText,
                title: 'YouTube Audio',
                thumbnail: 'https://i.ytimg.com/vi/default.jpg',
                timestamp: '0:00',
                views: 0,
                author: { name: 'Unknown' }
            };
        }
    } else {
        const yts = require('yt-search');
        const search = await yts(cleanText);
        if (!search || !search.videos.length) {
            await sendReaction('❌');
            await socket.sendMessage(sender, { 
                text: '*❌ No results found for:* ' + cleanText 
            }, { quoted: msg });
            break;
        }
        video = search.videos[0];
    }

    const songBox = `
👑 *ICON-X AI BETA - MUSIC PLAYER*
╭─────────────●●►
│ 🎧 *Title:* ${video.title}
│ 🎼 *Channel:* ${video.author?.name || "Unknown"}
│ ⏳ *Duration:* ${video.timestamp}
│ 👀 *Views:* ${video.views.toLocaleString()}
│ 📅 *Date:* ${dateStr}
│ ⏰ *Time:* ${timeStr}
│ 🔗 *Version:* v${Math.floor(Math.random() * 10) + 1}.0-beta
╰─────────────●●►
💻 *Developed by Mr Elephant*
    `.trim();

    await socket.sendMessage(sender, {
        image: { url: video.thumbnail || 'https://files.catbox.moe/8p9gya.jpg' },
        caption: songBox
    }, { quoted: msg });

    await sendReaction('⏳');
    
    await socket.sendMessage(sender, { 
        text: `*📥 Downloading audio...*\n*🔄 Please wait...*` 
    }, { quoted: msg });

    let audioData;
    try {
        const apiList = [
            async () => await getAudioAPI(video.url),
            async () => await getYtmp3API(video.url)
        ];

        for (let api of apiList) {
            try {
                audioData = await api();
                console.log(`✅ Success using API`);
                break;
            } catch (e) {
                console.log(`❌ API failed: ${e.message}`);
                continue;
            }
        }

        if (!audioData) {
            throw new Error("All APIs failed");
        }
    } catch (e) {
        await sendReaction('❌');
        await socket.sendMessage(sender, { 
            text: '*❌ Download failed!*\nAll download services are currently unavailable.\nPlease try again later.' 
        }, { quoted: msg });
        break;
    }

    await sendReaction('⬇️');
    
    const fileName = `${video.title}.mp3`
        .replace(/[<>:"/\\|?*]+/g, '')
        .substring(0, 200);
    
    const downloadUrl = audioData.download || audioData.dl || audioData.url;
    
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
        await sendReaction('❌');
        await socket.sendMessage(sender, { 
            text: '*❌ Invalid download URL!*' 
        }, { quoted: msg });
        break;
    }
    
    await socket.sendMessage(sender, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: fileName,
        ptt: false,
        contextInfo: {
            externalAdReply: {
                title: 'ICON-X AI MUSIC',
                body: '🎵 Powered by Mr Elephant',
                thumbnailUrl: video.thumbnail,
                sourceUrl: video.url || '',
                mediaType: 1,
                previewType: 0,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: msg });

    await delay(1500);
    await socket.sendMessage(sender, { 
        text: "🎶 *Enjoy the music and feel the vibes!*" 
    }, { quoted: msg });

    break;
}
              case 'winfo': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    if (!args[0]) {
        await socket.sendMessage(sender, {
            image: { url: config.RCD_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                `Please provide a phone number!\n\n*Usage:* \`${userPrefix}winfo +263xxxxxxxxx\``,
                '𝙸𝙲𝙾𝙽-𝚇 𝐅𝚁𝙴𝙴 𝐁𝙾𝚃'
            )
        });
        break;
    }

    let inputNumber = args[0].replace(/[^0-9]/g, '');
    if (inputNumber.length < 10) {
        await socket.sendMessage(sender, {
            image: { url: config.RCD_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                'Invalid phone number!(e.g., +26378xxx)',
                '> 𝙸𝙲𝙾𝙽-𝚇 𝐅𝚁𝙴𝙴 𝐁𝙾𝚃'
            )
        });
        break;
    }

    let winfoJid = `${inputNumber}@s.whatsapp.net`;
    const [winfoUser] = await socket.onWhatsApp(winfoJid).catch(() => []);
    if (!winfoUser?.exists) {
        await socket.sendMessage(sender, {
            image: { url: config.RCD_IMAGE_PATH },
            caption: formatMessage(
                '❌ ERROR',
                'User not found on WhatsApp',
                '> 𝙸𝙲𝙾𝙽-𝚇 𝐅𝚁𝙴𝙴 𝐁𝙾𝚃'
            )
        });
        break;
    }

    let winfoPpUrl;
    try {
        winfoPpUrl = await socket.profilePictureUrl(winfoJid, 'image');
    } catch {
        winfoPpUrl = 'https://files.catbox.moe/8p9gya.jpg';
    }

    let winfoName = winfoJid.split('@')[0];
    try {
        const presence = await socket.presenceSubscribe(winfoJid).catch(() => null);
        if (presence?.pushName) winfoName = presence.pushName;
    } catch (e) {
        console.log('Name fetch error:', e);
    }

    let winfoBio = 'No bio available';
    try {
        const statusData = await socket.fetchStatus(winfoJid).catch(() => null);
        if (statusData?.status) {
            winfoBio = `${statusData.status}\n└─ 📌 Updated: ${statusData.setAt ? new Date(statusData.setAt).toLocaleString('en-US', { timeZone: 'Asia/Colombo' }) : 'Unknown'}`;
        }
    } catch (e) {
        console.log('Bio fetch error:', e);
    }

    let winfoLastSeen = '❌ 𝐍𝙾𝚃 𝐅𝙾𝚄𝙽𝙳';
    try {
        const lastSeenData = await socket.fetchPresence(winfoJid).catch(() => null);
        if (lastSeenData?.lastSeen) {
            winfoLastSeen = `🕒 ${new Date(lastSeenData.lastSeen).toLocaleString('en-US', { timeZone: 'Africa/Harare' })}`;
        }
    } catch (e) {
        console.log('Last seen fetch error:', e);
    }

    const userInfoWinfo = formatMessage(
        '🔍 PROFILE INFO',
        `> *Number:* ${winfoJid.replace(/@.+/, '')}\n\n> *Account Type:* ${winfoUser.isBusiness ? '💼 Business' : '👤 Personal'}\n\n*📝 About:*\n${winfoBio}\n\n*🕒 Last Seen:* ${winfoLastSeen}`,
        '> 𝙸𝙲𝙾𝙽-𝚇'
    );

    await socket.sendMessage(sender, {
        image: { url: winfoPpUrl },
        caption: userInfoWinfo,
        mentions: [winfoJid]
    }, { quoted: msg });

    break;
}

              case 'ig': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    const { igdl } = require('ruhend-scraper'); 

    const q = msg.message?.conversation || 
              msg.message?.extendedTextMessage?.text || 
              msg.message?.imageMessage?.caption || 
              msg.message?.videoMessage?.caption || 
              '';

    const igUrl = q.replace(new RegExp(`^${userPrefix}ig\\s*`), '').trim(); 

    if (!igUrl || !/instagram\.com/.test(igUrl)) {
        return await socket.sendMessage(sender, { 
            text: `🧩 *Instagram Video Downloader*\n\n*Usage:* \`${userPrefix}ig <instagram-link>\`\n\n*Example:* \`${userPrefix}ig https://www.instagram.com/p/xxxxx/\`` 
        });
    }

    try {
        await socket.sendMessage(sender, { react: { text: '⬇', key: msg.key } });

        const res = await igdl(igUrl);
        const data = res.data; 

        if (data && data.length > 0) {
            const videoUrl = data[0].url; 

            await socket.sendMessage(sender, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption: '> 𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 𝙸𝙲𝙾𝙽-𝚇'
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: '✔', key: msg.key } });
        } else {
            await socket.sendMessage(sender, { text: '*❌ No video found in the provided link.*' });
        }

    } catch (e) {
        console.log(e);
        await socket.sendMessage(sender, { text: '*❌ Error downloading Instagram video.*' });
    }

    break;
}

              case 'active': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        const activeCount = activeSockets.size;
        const activeNumbers = Array.from(activeSockets.keys()).join('\n') || 'No active members';

        await socket.sendMessage(from, {
            text: `👥 Active Members: *${activeCount}*\n\nNumbers:\n${activeNumbers}`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error in .active command:', error);
        await socket.sendMessage(from, { text: '❌ Failed to fetch active members.' }, { quoted: msg });
    }
    break;
}

              // ===== AI CHAT WITH OPENAI =====
case 'ai': {
    try {
        const userId = msg.key.participant || sender;
        const userPrefix = getUserPrefix(userId);
        
        await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } });
        
        const q = msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text || '';
        
        const cleanQuery = q.replace(new RegExp(`^${userPrefix}ai\\s*`), '').trim();
        
        if (!cleanQuery) {
            return await socket.sendMessage(sender, {
                text: `🤖 *AI Chat*\n\n*Usage:* \`${userPrefix}ai <question>\`\n\n*Example:* \`${userPrefix}ai What is AI?\``
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            text: `⏳ *Thinking...*`
        }, { quoted: msg });
        
        let aiResponse = null;
        let usedAPI = '';
        
        // ===== PRIMARY: OpenAI =====
        const OPENAI_API_KEY = config.OPENAI_API_KEY || '';
        const OPENAI_MODEL = config.OPENAI_MODEL || 'gpt-3.5-turbo';
        const OPENAI_MAX_TOKENS = config.OPENAI_MAX_TOKENS || 1000;
        const OPENAI_TEMPERATURE = config.OPENAI_TEMPERATURE || 0.7;
        const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
        
        if (OPENAI_API_KEY) {
            try {
                const response = await axios.post(
                    OPENAI_API_URL,
                    {
                        model: OPENAI_MODEL,
                        messages: [
                            { role: 'system', content: 'You are ICON-X AI, a helpful assistant developed by Mr Elephant. You speak English and Shona.' },
                            { role: 'user', content: cleanQuery }
                        ],
                        max_tokens: OPENAI_MAX_TOKENS,
                        temperature: OPENAI_TEMPERATURE
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENAI_API_KEY}`
                        },
                        timeout: 30000
                    }
                );
                
                aiResponse = response?.data?.choices?.[0]?.message?.content;
                usedAPI = 'OpenAI';
            } catch (err) {
                console.log('OpenAI error:', err.response?.data?.error?.message || err.message);
            }
        }
        
        // ===== FALLBACK 1: Gemini =====
        if (!aiResponse) {
            try {
                const apiKeyUrl = 'https://raw.githubusercontent.com/sulamd48/database/refs/heads/main/aiapikey.json';
                const configRes = await axios.get(apiKeyUrl, { timeout: 10000 });
                const GEMINI_API_KEY = configRes.data?.GEMINI_API_KEY;
                
                if (GEMINI_API_KEY) {
                    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
                    
                    const response = await axios.post(GEMINI_API_URL, {
                        contents: [{
                            parts: [{ text: `You are ICON-X AI. ${cleanQuery}` }]
                        }]
                    }, { 
                        headers: { "Content-Type": "application/json" },
                        timeout: 30000 
                    });
                    
                    aiResponse = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    usedAPI = 'Gemini';
                }
            } catch (err) {
                console.log('Gemini error:', err.message);
            }
        }
        
        // ===== FALLBACK 2: OpenRouter (Free) =====
        if (!aiResponse) {
            try {
                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: 'mistralai/mistral-7b-instruct:free',
                        messages: [{ role: 'user', content: cleanQuery }],
                        max_tokens: 1000
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://icon-xmdmini.onrender.com',
                            'X-Title': 'ICON-X AI'
                        },
                        timeout: 30000
                    }
                );
                
                aiResponse = response?.data?.choices?.[0]?.message?.content;
                usedAPI = 'OpenRouter';
            } catch (err) {
                console.log('OpenRouter error:', err.message);
            }
        }
        
        // ===== FALLBACK 3: Popcat =====
        if (!aiResponse) {
            try {
                const response = await axios.get(
                    `https://api.popcat.xyz/chat?msg=${encodeURIComponent(cleanQuery)}`,
                    { timeout: 15000 }
                );
                
                aiResponse = response?.data?.response;
                usedAPI = 'Popcat';
            } catch (err) {
                console.log('Popcat error:', err.message);
            }
        }
        
        if (aiResponse) {
            await socket.sendMessage(sender, {
                text: `🤖 *ICON-X AI*\n\n${aiResponse}\n\n> Powered by ${usedAPI} | Mr Elephant`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `❌ *AI Service Unavailable*\n\nAll AI services are currently down. Please try again later.`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('AI error:', error);
        await socket.sendMessage(sender, {
            text: `❌ Error: ${error.message}`
        }, { quoted: msg });
    }
    break;
}
              
              case 'aicode': {
    const userId = msg.key.participant || sender;
    const userPrefix = getUserPrefix(userId);
    
    try {
        await socket.sendMessage(sender, { react: { text: '💻', key: msg.key } });
        
        const q = msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text || '';
        
        const cleanQuery = q.replace(new RegExp(`^${userPrefix}aicode\\s*`), '').trim();
        
        if (!cleanQuery) {
            return await socket.sendMessage(sender, {
                text: `💻 *AI Code Generator*\n\n*Usage:* \`${userPrefix}aicode <code question>\`\n\n*Example:* \`${userPrefix}aicode Write a Python function to reverse a string\``
            }, { quoted: msg });
        }
        
        await socket.sendMessage(sender, {
            text: `⏳ *Generating code...*`
        }, { quoted: msg });
        
        let result = null;
        let usedAPI = '';
        
        try {
            const PAXSENIX = axios.create({
                baseURL: 'https://api.paxsenix.biz.id',
                timeout: 30000
            });
            const d = await PAXSENIX.post('/ai/gpt-4o', { 
                message: `Write clean, working code for: ${cleanQuery}. Include comments.` 
            });
            result = d?.data?.result || d?.data?.response || d?.data;
            usedAPI = 'Paxsenix';
        } catch (err) {
            console.log('Paxsenix Code error:', err.message);
        }
        
        if (!result) {
            try {
                const { data } = await axios.get(
                    `https://api.siputzx.my.id/api/ai/codegpt?prompt=${encodeURIComponent(cleanQuery)}`,
                    { timeout: 30000 }
                );
                result = data?.result || data?.response || data?.data;
                usedAPI = 'Siputzx';
            } catch (err) {
                console.log('Siputzx Code error:', err.message);
            }
        }
        
        if (!result) {
            try {
                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: 'mistralai/mistral-7b-instruct:free',
                        messages: [{ role: 'user', content: `Write clean, working code for: ${cleanQuery}` }],
                        max_tokens: 2000
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'HTTP-Referer': config.MINI_URL || 'https://iconxmdmini-1.onrender.com',
                            'X-Title': 'ICON-X AI'
                        },
                        timeout: 30000
                    }
                );
                result = response?.data?.choices?.[0]?.message?.content;
                usedAPI = 'OpenRouter';
            } catch (err) {
                console.log('OpenRouter Code error:', err.message);
            }
        }
        
        if (result) {
            await socket.sendMessage(sender, {
                text: `💻 *AI Code Generator*\n\n${result}\n\n> Powered by ${usedAPI} | Mr Elephant`
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `⚠️ *Code Generation Failed*\n\nTry using \`${userPrefix}ai\` instead, or try again later.`
            }, { quoted: msg });
        }
        
    } catch (error) {
        console.error('AI Code error:', error);
        await socket.sendMessage(sender, {
            text: `❌ Error: ${error.message}`
        }, { quoted: msg });
    }
    break;
}

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
