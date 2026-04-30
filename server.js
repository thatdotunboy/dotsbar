const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dotsbar_super_secret_key_2026';

// ── In-memory stores ──────────────────────────────
let users = [];
let rooms = [];
let events = [
  { id:'1', title:'Arsenal vs Chelsea Watch Party', host:'DotsBar HQ', category:'sports', datetime: new Date().toISOString(), type:'Free', viewers: 1204 },
  { id:'2', title:'DJ Kicks Saturday Night Set', host:'DJ Kicks', category:'music', datetime: new Date(Date.now()+86400000).toISOString(), type:'Ticketed', price:500, viewers:0 },
  { id:'3', title:'Pub Quiz Championship', host:'QuizMasterK', category:'talk', datetime: new Date(Date.now()+172800000).toISOString(), type:'Free', viewers:312 },
];

const products = [
  { id:1, name:'Guinness Draft', emoji:'🍺', desc:'The classic. Cold, dark & smooth.', price:120, cat:'drinks', badge:'Best Seller' },
  { id:2, name:'Heineken Bottle', emoji:'🍶', desc:'Crisp & refreshing lager.', price:100, cat:'drinks' },
  { id:3, name:'Craft IPA', emoji:'🍻', desc:'Hoppy, bold, and local.', price:130, cat:'drinks' },
  { id:4, name:'Neon Spritz', emoji:'🍹', desc:'Pink, fizzy, legendary.', price:200, cat:'cocktails', badge:'Fan Fave' },
  { id:5, name:'Mojito', emoji:'🌿', desc:'Mint, lime, perfection.', price:180, cat:'cocktails' },
  { id:6, name:'Smoky Scotch', emoji:'🥃', desc:'Highland single malt.', price:350, cat:'shots', badge:'Premium' },
  { id:7, name:'Tequila Shot', emoji:'🍋', desc:'Salt. Shot. Lime. Repeat.', price:150, cat:'shots' },
  { id:8, name:'Loaded Nachos', emoji:'🧀', desc:'Cheese, jalapeño, guacamole.', price:150, cat:'food' },
  { id:9, name:'Chicken Wings', emoji:'🍗', desc:'Sticky BBQ glazed wings.', price:200, cat:'food', badge:'Match Day' },
  { id:10, name:'DotsBar Tee', emoji:'👕', desc:'Official DotsBar streetwear.', price:800, cat:'merch', badge:'Limited' },
  { id:11, name:'Gold Pint Badge', emoji:'🏅', desc:'Exclusive collector badge.', price:500, cat:'collectibles', badge:'Rare' },
  { id:12, name:'Match Day Trophy NFT', emoji:'🏆', desc:'Limited edition match day drop.', price:1000, cat:'collectibles', badge:'Ultra Rare' },
];

// Live Premier League match stubs (rotate scores over time for realism)
let matchMinutes = { 0: 72, 1: 34, 2: 58, 3: 81, 4: 45, 5: 22 };
const matchData = [
  { home:'Arsenal', homeCode:'ARS', away:'Chelsea', awayCode:'CHE', score:[2,1], homeEmoji:'🔴', awayEmoji:'🔵' },
  { home:'Man City', homeCode:'MCI', away:'Liverpool', awayCode:'LIV', score:[0,0], homeEmoji:'💙', awayEmoji:'❤️' },
  { home:'Spurs', homeCode:'TOT', away:'Man Utd', awayCode:'MUN', score:[1,2], homeEmoji:'⬜', awayEmoji:'🔴' },
  { home:'Newcastle', homeCode:'NEW', away:'Everton', awayCode:'EVE', score:[3,0], homeEmoji:'⚫', awayEmoji:'💙' },
  { home:'Brighton', homeCode:'BHA', away:'Wolves', awayCode:'WOL', score:[1,1], homeEmoji:'🔵', awayEmoji:'🟡' },
  { home:'West Ham', homeCode:'WHU', away:'Brentford', awayCode:'BRE', score:[0,1], homeEmoji:'⚒️', awayEmoji:'🐝' },
];

// Tick match minutes every 60s
setInterval(() => {
  Object.keys(matchMinutes).forEach(k => {
    if (matchMinutes[k] < 90) matchMinutes[k]++;
  });
}, 60000);

// ── Middleware ─────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Auth routes ────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, isCreator } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      id: Date.now().toString(), username, email,
      password: hashedPassword, isCreator: isCreator || false,
      balance: 1000, // starter DotsCoins
      createdAt: new Date().toISOString()
    };
    users.push(user);
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id:user.id, username, email, isCreator:user.isCreator, balance:user.balance } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id:user.id, username:user.username, email, isCreator:user.isCreator, balance:user.balance } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/profile/:id', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id:user.id, username:user.username, email:user.email, isCreator:user.isCreator, balance:user.balance, createdAt:user.createdAt });
});

app.put('/api/profile', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { username, bio } = req.body;
  if (username) user.username = username;
  if (bio) user.bio = bio;
  res.json({ id:user.id, username:user.username, email:user.email, isCreator:user.isCreator, balance:user.balance });
});

// ── Matches API (Premier League stub) ──────────────
app.get('/api/matches', (req, res) => {
  const data = matchData.map((m, i) => ({
    ...m,
    minute: matchMinutes[i],
    status: matchMinutes[i] >= 90 ? 'FT' : 'LIVE',
    league: 'Premier League',
    season: '2025/26',
    viewers: Math.floor(500 + Math.random() * 1500)
  }));
  res.json({ matches: data, updatedAt: new Date().toISOString() });
});

// ── Events API ─────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.json({ events, total: events.length });
});

app.post('/api/events', verifyToken, (req, res) => {
  try {
    const { title, category, datetime, type, price } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const user = users.find(u => u.id === req.user.id);
    const event = {
      id: Date.now().toString(), title,
      host: user?.username || 'Anonymous',
      hostId: req.user.id,
      category: category || 'general',
      datetime: datetime || new Date().toISOString(),
      type: type || 'Free',
      price: price || 0,
      viewers: 0,
      createdAt: new Date().toISOString()
    };
    events.push(event);
    io.emit('new-event', event);
    res.json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/events/:id', verifyToken, (req, res) => {
  const idx = events.findIndex(e => e.id === req.params.id && e.hostId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found or not authorised' });
  events.splice(idx, 1);
  res.json({ success: true });
});

// ── Products / Marketplace ─────────────────────────
app.get('/api/products', (req, res) => {
  const { cat } = req.query;
  const filtered = cat ? products.filter(p => p.cat === cat) : products;
  res.json({ products: filtered, total: filtered.length });
});

// ── Rooms ──────────────────────────────────────────
app.post('/api/rooms', verifyToken, (req, res) => {
  try {
    const { name, description } = req.body;
    const room = {
      id: Date.now().toString(), name, description,
      creatorId: req.user.id, viewers: [], chatMessages: [], tipsTotal: 0,
      createdAt: new Date().toISOString()
    };
    rooms.push(room);
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/rooms', (req, res) => {
  const list = rooms.map(r => ({
    ...r,
    creator: users.find(u => u.id === r.creatorId)?.username || 'Unknown',
    viewerCount: r.viewers.length
  }));
  res.json({ rooms: list, total: list.length });
});

// ── Serve static files ─────────────────────────────
app.use(express.static('.'));

// ── Socket.io ──────────────────────────────────────
const activeRooms = new Map();
const socketUsers = new Map(); // socketId → user info

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Auth handshake
  socket.on('auth', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socketUsers.set(socket.id, { id: decoded.id, username: decoded.username });
      socket.emit('auth-ok', { username: decoded.username });
    } catch {
      socket.emit('auth-error', 'Invalid token');
    }
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Set());
    activeRooms.get(roomId).add(socket.id);

    const count = activeRooms.get(roomId).size;
    io.to(roomId).emit('viewer-count', { roomId, count });
    socket.to(roomId).emit('user-joined', { socketId: socket.id, username: socketUsers.get(socket.id)?.username || 'Anonymous' });

    console.log(`📺 ${socket.id} joined room ${roomId} (${count} viewers)`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(socket.id);
      const count = activeRooms.get(roomId).size;
      io.to(roomId).emit('viewer-count', { roomId, count });
    }
    socket.to(roomId).emit('user-left', { socketId: socket.id });
  });

  // WebRTC signalling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
  });
  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
  });
  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  // Chat
  socket.on('chat-message', ({ roomId, message }) => {
    const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
    const msg = { username: user.username, message, timestamp: new Date().toISOString(), socketId: socket.id };
    io.to(roomId).emit('chat-message', msg);
    // Persist in room
    const room = rooms.find(r => r.name === roomId || r.id === roomId);
    if (room) room.chatMessages.push(msg);
  });

  // Global bar chat
  socket.on('bar-chat', ({ message }) => {
    const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
    io.emit('bar-chat', { username: user.username, message, timestamp: new Date().toISOString() });
  });

  // Reactions
  socket.on('reaction', ({ roomId, emoji }) => {
    const user = socketUsers.get(socket.id) || { username: 'Anonymous' };
    io.to(roomId).emit('reaction', { emoji, username: user.username });
  });

  // Tip
  socket.on('tip', ({ roomId, amount, creatorId }) => {
    const fromUser = users.find(u => u.id === socketUsers.get(socket.id)?.id);
    const toUser = users.find(u => u.id === creatorId);
    if (fromUser && toUser && fromUser.balance >= amount) {
      fromUser.balance -= amount;
      toUser.balance += amount;
      const room = rooms.find(r => r.id === roomId);
      if (room) room.tipsTotal += amount;
      io.to(roomId).emit('tip-received', { from: fromUser.username, amount, creatorId });
      socket.emit('tip-sent', { amount, newBalance: fromUser.balance });
    } else if (fromUser && fromUser.balance < amount) {
      socket.emit('error', 'Insufficient DotsCoins');
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected:', socket.id);
    activeRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        io.to(roomId).emit('viewer-count', { roomId, count: users.size });
      }
    });
    socketUsers.delete(socket.id);
  });
});

// ── Start ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
🍺 ===================================
   DotsBar Server Running!
   http://localhost:${PORT}
🍺 ===================================
  `);
});
