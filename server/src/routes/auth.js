const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

  const admins = (process.env.ADMIN_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
  const role = admins.includes(v.phone) ? 'admin' : 'devotee';
  const user = await User.findOneAndUpdate(
    { phone: v.phone },
    { $set: { name: v.name, pincode: v.pincode, role }, $setOnInsert: { phone: v.phone } },
    { upsert: true, new: true }
  );
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;