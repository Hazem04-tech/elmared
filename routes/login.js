const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const student = await Student.findOne({
      $or: [{ phone: emailOrPhone }, { email: emailOrPhone }]
    });

    if (!student) return res.status(404).json({ ok: false, msg: 'الحساب غير موجود.' });

    if (!student.isActive) return res.status(403).json({ ok: false, msg: 'الحساب غير مفعل.' });

    const match = await bcrypt.compare(password, student.passwordHash);
    if (!match) return res.status(401).json({ ok: false, msg: 'كلمة المرور غير صحيحة.' });

    const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ ok: true, msg: 'تم تسجيل الدخول بنجاح', token, data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء تسجيل الدخول.' });
  }
});

module.exports = router;
