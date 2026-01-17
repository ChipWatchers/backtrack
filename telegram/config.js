const fs = require('fs');
const path = require('path');

// Load BOT_TOKEN from secrets.env
function loadSecrets() {
    const secretsPath = path.join(__dirname, '../config/secrets.env');
    try {
        const secretsContent = fs.readFileSync(secretsPath, 'utf8');
        const secrets = {};

        secretsContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    secrets[key.trim()] = valueParts.join('=').trim();
                }
            }
        });

        return secrets;
    } catch (e) {
        console.error("Could not load secrets.env", e);
        return {};
    }
}

const secrets = loadSecrets();
const BOT_TOKEN = process.env.BOT_TOKEN || secrets.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN is missing! (Not in env var and not in secrets.env)");
}
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

module.exports = {
    BOT_TOKEN,
    TELEGRAM_API_URL
};
