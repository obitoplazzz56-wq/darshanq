const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { LOCAL_PIN } = require('../utils');
const { addLog, userView } = require('../services');

const check = b => {
  const name = String(b.name || '').trim(), phone = String(b.phone || '').trim(), pincode = String(b.pincode || '').trim();
  if (name.length < 2) return { error: 'Enter your full name.' };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Enter a valid 10-digit mobile number starting with 6–9.' };
  if (!/^\d{6}$/.test(pincode)) return { error: 'Enter a 6-digit pincode.' };
  return { name, phone, pincode };
};
const DEMO_OTP = () => process.env.DEMO_OTP || '482910';

// Step 1: validate details. OTP delivery is simulated (no SMS provider).
router.post('/send-otp', (req, res) => {
  const v = check(req.body || {});
  if (v.error) return res.status(400).json({ error: v.error });
  res.json({ ok: true, demoOtp: DEMO_OTP() });
});

// Step 2: verify OTP, create or update the account, return a JWT
router.post('/verify', async (req, res) => {
  const body = req.body || {};
  const v = check(body);
  if (v.error) return res.status(400).json({ error: v.error });
  if (String(body.otp || '').trim() !== DEMO_OTP()) return res.status(400).json({ error: 'That code is incorrect. Use the demo code shown above.' });

  const local = LOCAL_PIN.test(v.pincode);
  const admins = (process.env.ADMIN_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
  let user = await User.findOne({ phone: v.phone });
  if (!user) {
    user = new User({ name: v.name, phone: v.phone, pincode: v.pincode, local, done: local ? 9 : 0, streak: local ? 4 : 0 });
    if (local) { addLog(user, 'Verified as Ujjain local'); addLog(user, '9 earlier check-ins imported (demo history)'); }
    else addLog(user, 'Verified as visitor');
  } else {
    user.name = v.name; user.pincode = v.pincode; user.local = local;
  }
  user.role = admins.includes(v.phone) ? 'admin' : 'devotee';
  await user.save();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: userView(user) });
});

module.exports = router;
