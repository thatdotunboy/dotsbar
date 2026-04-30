# Dotsbar Full Platform Build Plan
## Features: User auth, Live streaming, Chat, Creator profiles, Tipping/gifts

## Information Gathered
- Current: WebRTC voice chat prototype (Express + Socket.io rooms)
- Backend: server.js (no DB/auth)
- Frontend: Basic HTML/JS/CSS (bar.html, index.html, rooms.js)
- Tech: Node.js, extend with MongoDB, JWT, Stripe, WebRTC video

## Plan (Phased)

### Phase 1: Foundation - DB & Auth
1. [ ] package.json: Add deps (mongoose, bcryptjs, jsonwebtoken, cors, dotenv, stripe, express-session)
2. [ ] .env: DB_URI, JWT_SECRET, STRIPE_KEY
3. [ ] models/User.js: Schema (email, password, username, isCreator, balance, profilePic)
4. [ ] models/Room.js: Schema (name, creatorId, viewers[], chatMessages[])
5. [ ] server.js: Connect DB, auth routes (/register, /login, /profile), middleware
6. [ ] Test: npm install, npm start, curl auth endpoints

### Phase 2: Profiles & Rooms
7. [ ] server.js: Profile endpoints (GET /profile/:id, PUT /profile)
8. [ ] rooms.html: Creator dashboard to create rooms
9. [ ] index.html: Login/register forms, profile link

### Phase 3: Live Streaming (WebRTC Video + existing audio)
10. [ ] server.js: Update socket for video streams, creator mode
11. [ ] bar.html/script.js: Video elements, stream controls (creator/viewer)

### Phase 4: Chat & Tipping
12. [ ] server.js: Socket chat events per room
13. [ ] bar.html: Chat UI
14. [ ] server.js: Stripe tipping endpoints/socket gifts
15. [ ] Frontend: Tip buttons

### Phase 5: Polish & Deploy
16. [ ] styles.css: Theme updates
17. [ ] Docker/nginx: Prod config
18. [ ] Test full flow

## Dependent Files
- package.json → all
- server.js → core
- New: models/, .env

## Followup Steps
- User approval
- npm install
- mongo setup (local/Docker)
- Test each phase
