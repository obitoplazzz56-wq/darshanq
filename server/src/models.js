const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  pincode: { type: String, required: true },
  local: { type: Boolean, default: false },
  role: { type: String, enum: ['devotee', 'admin'], default: 'devotee' },
  done: { type: Number, default: 0 },    // completed check-ins
  streak: { type: Number, default: 0 },  // weekly streak
  ns: { type: Number, default: 0 },      // no-shows
  lc: { type: Number, default: 0 },      // late cancels
  prefs: { sms: { type: Boolean, default: false }, wa: { type: Boolean, default: false } },
  log: [{ _id: false, t: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true }));

const bookingSchema = new Schema({
  code: { type: String, unique: true, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },   // YYYY-MM-DD (IST)
  slot: { type: Number, required: true },   // index into SL
  party: { type: Number, default: 1, min: 1, max: 4 },
  assist: { type: Boolean, default: false },
  status: { type: String, enum: ['booked', 'done', 'noshow', 'cancelled'], default: 'booked' },
}, { timestamps: true });
bookingSchema.index({ date: 1, slot: 1, status: 1 });
const Booking = mongoose.model('Booking', bookingSchema);

const Config = mongoose.model('Config', new Schema({
  key: { type: String, default: 'main', unique: true },
  paused: { type: Boolean, default: false },
  cap: { type: Number, default: 14 },
  announcement: { type: String, default: '' },
}));

const Report = mongoose.model('Report', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  minutes: { type: Number, min: 5, max: 240, required: true },
}, { timestamps: true }));

module.exports = { User, Booking, Config, Report };
