# DarshanQ — Verified Priority Darshan (MERN)

Supports five temples: Mahakaleshwar (Ujjain), Jagannath Puri, Khatu Shyam, Sawariya Seth Ji and Vaishno Devi. Add or edit temples in `server/src/temples.js` (name, local pincodes, slot times, crowd shape, sample aarti timings). Trust score, bookings, capacity, notices and wait reports are all kept per temple.

Full-stack version of the DarshanQ prototype: **React (Vite)** frontend, **Node + Express** API, **MongoDB** (Mongoose).
All business rules (trust score, slot quotas, check-in window, penalties) now run on the server and are stored in MongoDB.

## Quick start

Requires Node 18+ and a MongoDB Atlas cluster (or any MongoDB).

```bash
# 1. install everything
npm run install:all

# 2. configure the backend
cd server
cp .env.example .env      # then edit .env: paste your cluster string into MONGODB_URI, set JWT_SECRET
cd ..

# 3. run (two terminals)
npm run dev:server        # API on http://localhost:5000
npm run dev:client        # app on http://localhost:5173
```

In Atlas, make sure your IP is allowed (Network Access) and the database user has read/write access.

## Demo logins

- OTP is simulated. The demo code is `482910` (set `DEMO_OTP` in `.env`).
- **Local devotee:** pick a temple in the login box and press "Use demo local profile". It fills in a pincode that counts as local for that temple, and local devotees start with 9 imported check-ins, so the free lane is unlocked there. Locality is decided by pincode per temple, so a profile local to one temple is a visitor at the others.
- **Visitor:** any other pincode. Free lane stays locked, forecasts still work.
- **Temple admin:** log in with a phone number listed in `ADMIN_PHONES` (default `9999999999`). The "Temple admin" menu appears only for admins.

## Project layout

```
server/src
  server.js          Express app, CORS, MongoDB connection, optional static serving of client/dist
  temples.js         the temple catalogue (edit this to change temples)
  models.js          User, Standing (trust record per temple), Booking, Config (per temple), Report
  utils.js           slots, crowd model, trust-score formula, IST date helpers
  services.js        shared queries and response shaping
  middleware.js      JWT auth + admin guard
  routes/auth.js     POST /api/auth/send-otp, /verify
  routes/api.js      /config, /crowd, /me, /slots, /bookings (+cancel, reschedule, checkin), /reports
  routes/admin.js    /admin/dashboard, /config, /bookings/:id/noshow, /export (CSV)
client/src
  App.jsx, api.js, util.js, index.css
  pages/Landing.jsx  public page + live crowd demo + score calculator
  pages/Login.jsx    two-step OTP modal
  pages/Portal.jsx   Overview, Reserve, Passes, Trust score, Aarti & reminders
  pages/Admin.jsx    operations dashboard
  components/ui.jsx  Modal, Forecast chart, Ring, notice banner, crowd hook
```

## Rules enforced by the server

- Priority unlocks at trust score 60 and requires a verified local pincode.
- Score = 30 (local) + 5 per completed check-in (max 10) + 2 per streak week (max 6) − 10 per no-show − 4 per late cancel.
- One active booking per day; bookings only today to 2 days ahead; party of 1–4.
- Per-slot places = admin-set capacity − simulated baseline demand − real bookings.
- Check-in opens 30 min before the slot and closes 60 min after. With `DEMO_MODE=true` a devotee may simulate being at the temple outside that window; set `DEMO_MODE=false` to enforce it strictly.
- Cancelling or rescheduling under 2 hours before a slot is a late cancel (−4); rescheduling is blocked in that window.

## Production

```bash
npm run build     # builds client/dist
npm start         # Express serves the API and the built React app on one port
```
Set `CLIENT_URL` to your site origin. If the frontend is hosted separately, set `VITE_API_URL` in `client/.env` to the API origin before building.

## Known prototype limits

- No real SMS/OTP, Aadhaar or WhatsApp integration (OTP is a fixed demo code; reminder toggles only save a preference).
- The queue size and the baseline slot demand are simulated; devotee wait reports do feed the crowd estimate.
- Pass QR images are decorative, not scannable. Slot-capacity checks are not transactional, so two simultaneous bookings for the last place could both pass.
- Before real use you would add rate limiting on the auth routes, real OTP delivery, and HTTPS-only deployment.
