const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const Student = require('../models/Student');

const router = express.Router();

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// POST /api/register
router.post('/', upload.fields([
  { name: 'nationalIdCopy', maxCount: 1 },
  { name: 'userLogo', maxCount: 1 }
]), async (req, res) => {
  console.log('REQ.BODY:', req.body);
  console.log('REQ.FILES:', req.files);

  try {
    const { firstName, middleName, lastName, phone, fatherPhone, gender, government, grade, email, password } = req.body;
    if (!firstName || !middleName || !lastName || !phone || !fatherPhone || !gender || !government || !grade || !password) {
      return res.status(400).json({ msg: 'يرجى إدخال جميع الحقول المطلوبة' });
    }

    // تحقق من وجود مستخدم بنفس الهاتف أو الإيميل
    const exists = await Student.findOne({ $or: [{ phone }, { email }] });
    if (exists) {
      return res.status(409).json({ ok: false, msg: 'رقم الهاتف أو البريد مسجل من قبل.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
   const nationalIdPath = req.files?.nationalIdCopy
  ? `/uploads/nationalIdPath/${req.files.nationalIdCopy[0].filename}`
  : undefined;

const userLogo = req.files?.userLogo
  ? `/uploads/userLogo/${req.files.userLogo[0].filename}`
  : undefined;


    const student = new Student({
      firstName,
      middleName,
      lastName,
      phone,
      fatherPhone,
      gender,
      government,
      grade,
      email,
      passwordHash,
      nationalIdPath,
      userLogo,
      isActive: true
    });

    await student.save();
    res.status(201).json({ ok: true, msg: 'تم التسجيل بنجاح', data: { id: student._id } });

  } catch (err) {
    console.error('Error in /api/register:', err);
    res.status(500).json({ ok: false, msg: err.message, stack: err.stack });
  }
});

module.exports = router;
