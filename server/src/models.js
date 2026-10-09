const mongoose = require('mongoose');
const { Schema } = mongoose;

// A devotee account (one per phone number). Per-temple stats live in Standing.
const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  pincode: { type: String, required: true },
  role: { type: String, enum: ['devotee', 'admin'], default: 'devotee' },
  prefs: { sms: { type: Boolean, default: false }, wa: { type: Boolean, default: false } },
}, { timestamps: true }));

// A devotee's trust record at ONE temple
const standingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  temple: { type: String, required: true },
  done: { type: Number, default: 0 },    // completed check-ins
  streak: { type: Number, default: 0 },  // weekly streak
  ns: { type: Number, default: 0 },      // no-shows
  lc: { type: Number, default: 0 },      // late cancels
  log: [{ _id: false, t: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
standingSchema.index({ user: 1, temple: 1 }, { unique: true });
const Standing = mongoose.model('Standing', standingSchema);

const bookingSchema = new Schema({
  code: { type: String, unique: true, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  temple: { type: String, required: true },
  date: { type: String, required: true },   // YYYY-MM-DD (IST)
  slot: { type: Number, required: true },   // index into the temple's slots
  party: { type: Number, default: 1, min: 1, max: 4 },
  assist: { type: Boolean, default: false },
  status: { type: String, enum: ['booked', 'done', 'noshow', 'cancelled'], default: 'booked' },
}, { timestamps: true });
bookingSchema.index({ temple: 1, date: 1, slot: 1, status: 1 });
const Booking = mongoose.model('Booking', bookingSchema);

// Per-temple settings (key = temple id)
const Config = mongoose.model('Config', new Schema({
  key: { type: String, required: true, unique: true },
  paused: { type: Boolean, default: false },
  cap: { type: Number, default: 14 },
  announcement: { type: String, default: '' },
}));

const Report = mongoose.model('Report', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  temple: { type: String, required: true, index: true },
  minutes: { type: Number, min: 5, max: 240, required: true },
}, { timestamps: true }));

module.exports = { User, Standing, Booking, Config, Report };
