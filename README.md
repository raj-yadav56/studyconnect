# StudyConnect — Nexconn Build Challenge 2026
Student chat app: sign-up, student search, 1-to-1 chat, subject study rooms (group channels), typing indicator, read receipts, unread badges.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your App Key and App Secret (secret stays server-side).
3. `npm run dev`, open http://localhost:3000 in two browser windows (use different usernames).

## Deploy
Use a single Node host (Render/Railway): build `npm install && npm run build`, start `npm start`, set the 3 env vars.
The student directory is in memory, so a single instance is required.

## Nexconn usage (all in lib/nexconn.ts)
NCEngine.initialize/connect, MessageHandler, DirectChannel, GroupChannel, SendTextMessageParams. Token minted server-side in app/api/token/route.ts.
