require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { MONGODB_URI, JWT_SECRET, PORT = 5000, CLIENT_URL = 'http://localhost:5173' } = process.env;
if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Missing MONGODB_URI or JWT_SECRET. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: CLIENT_URL.split(',').map(s => s.trim()) }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// Optional: serve the built React app (run `npm run build` in /client) from the same server
const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

mongoose.connect(MONGODB_URI)
  .then(() => { console.log('MongoDB connected'); app.listen(PORT, () => console.log('DarshanQ API running on http://localhost:' + PORT)); })
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
