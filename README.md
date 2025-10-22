# Valorant Skirmish Bot 🕹️

This bot manages a 1v1 Valorant Skirmish League with a custom SR (Skirmish Rating) system.

## 🚀 Setup

### 1️⃣ Clone the repo
```bash
git clone https://github.com/yourusername/valorant-skirmish-bot.git
cd valorant-skirmish-bot
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Create a `.env` file
```
BOT_TOKEN=your-discord-bot-token
CLIENT_ID=your-client-id
GUILD_ID=your-guild-id
MONGO_URI=your-mongo-uri
LEADERBOARD_CHANNELS=123456789012345678:sr
```

### 4️⃣ Run locally
```bash
node bot.js
```

### 5️⃣ Deploy to Render
1. Push to GitHub.
2. On Render, create a new Web Service → connect this repo.
3. Set environment variables as above.
4. Build command: `npm install`
5. Start command: `node bot.js`
6. Deploy 🎉

### 🧠 Commands
- `/report_match` — Admin-only match report
- `/leaderboard` — Show leaderboard
- `/reset_season` — Reset season stats
