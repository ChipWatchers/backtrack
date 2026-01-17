const fs = require('fs');
const path = require('path');

console.log("🏥 Running Health Check...");

// 1. Check Secrets
const secretsPath = path.join(__dirname, '../config/secrets.env');
if (!fs.existsSync(secretsPath)) {
    console.error("❌ CRTICAL: config/secrets.env is missing!");
    process.exit(1);
} else {
    console.log("✅ Secrets file found.");
}

// 2. Check Package.json
try {
    const pkg = require('../package.json');
    if (!pkg.dependencies['node-telegram-bot-api']) {
        console.error("❌ CRITICAL: node-telegram-bot-api dependency missing!");
        process.exit(1);
    }
    console.log("✅ Dependencies check pass.");
} catch (e) {
    console.error("❌ Package.json error:", e.message);
}

// 3. Syntax Check Bot
try {
    require('../telegram/config.js');
    console.log("✅ Bot Config syntax is valid.");
} catch (e) {
    console.error("❌ Bot Config syntax error:", e.message);
    process.exit(1);
}

console.log("🚀 Ready for Deployment!");
process.exit(0);
