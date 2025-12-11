/**uploads/nationalIdPath 
 uploads/userLogo
*/
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const connectLivereload = require('connect-livereload');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;
app.set('trust proxy', 1); // 👈 ضيفها فوق بعد إنشاء app
// ================== Static Files ==================
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================== Security ==================
app.use(helmet());

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://elmar3dchemistry.vercel.app",
    "https://dragonelmared-production.up.railway.app"
  ],
  credentials: true
}));

// ================== Rate Limiting ==================
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));

// ================== Livereload (Development Only) ==================
if (process.env.NODE_ENV !== 'production') {
  try {
    const livereload = require('livereload');
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch(path.join(__dirname, 'public'));
    app.use(connectLivereload());
    liveReloadServer.server.once('connection', () => {
      setTimeout(() => liveReloadServer.refresh('/'), 100);
    });
  } catch { }
}

// ================== Database Connection ==================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ================== Models ==================
const Student = require('./models/Student');

// ================== Multer Setup ==================
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const baseName = path.basename(file.originalname, ext)
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    cb(null, `${Date.now()}_${baseName}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('نوع الملف غير مسموح (فقط صور أو PDF)'));
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

// ================== Routes ==================
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// 🔹 GET /api/register (للاطلاع فقط)
app.get('/api/register', (req, res) => {
  res.send(`
    <h1>Register Endpoint</h1>
    <p>This endpoint accepts <strong>POST</strong> requests with form-data to register a student.</p>
    <p>Use Postman or a frontend form to send the required data.</p>
  `);
});


app.post(
  '/api/register',
  upload.fields([
    { name: 'nationalIdCopy', maxCount: 1 },
    { name: 'userLogo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        firstName, middleName, lastName,
        phone, fatherPhone,
        gender, government, grade,
        email, password, confirmPassword,
      } = req.body;

      if (!firstName || !middleName || !lastName || !phone || !fatherPhone ||
        !gender || !government || !grade || !password) {
        return res.status(400).json({ ok: false, msg: 'من فضلك اكمل كل البيانات المطلوبة.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ ok: false, msg: 'كلمة السر غير متطابقة.' });
      }

      const exists = await Student.findOne({ $or: [{ phone }, { email }] });
      if (exists) {
        return res.status(409).json({ ok: false, msg: 'رقم الهاتف أو البريد مسجل من قبل.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
     const nationalIdPath = req.files?.nationalIdCopy
  ? `/uploads/nationalIdPath/${req.files.nationalIdCopy[0].filename}`
  : undefined;

const userLogo = req.files?.userLogo
  ? `/uploads/userLogo/${req.files.userLogo[0].filename}`
  : undefined;



      const student = await Student.create({
        firstName, middleName, lastName,
        phone, fatherPhone,
        gender, government, grade,
        email: email || undefined,
        passwordHash,
        nationalIdPath,
        userLogo
      });

      return res.status(201).json({
        ok: true,
        msg: 'تم إنشاء الحساب بنجاح',
        data: { id: student._id }
      });
    } catch (err) {
      console.error("❌ Register Error:", err);
      return res.status(500).json({ ok: false, msg: err.message || 'حدث خطأ غير متوقع.' });
    }
  }
);


// باقي الـ CRUD
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ ok: true, data: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء جلب البيانات.' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ ok: false, msg: 'الطالب غير موجود' });
    }
    res.json({ ok: true, msg: 'تم تعديل البيانات بنجاح', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء التعديل.' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ ok: false, msg: 'الطالب غير موجود' });
    }
    res.json({ ok: true, msg: 'تم حذف الطالب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء الحذف.' });
  }
});

app.put('/api/students/:id/activate', async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ ok: false, msg: 'الطالب غير موجود' });
    }
    res.json({ ok: true, msg: 'تم تفعيل الحساب بنجاح', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء التفعيل.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const student = await Student.findOne({
      $or: [{ phone: emailOrPhone }, { email: emailOrPhone }]
    });

    if (!student) {
      return res.status(404).json({ ok: false, msg: 'الحساب غير موجود.' });
    }

    if (!student.isActive) {
      return res.status(403).json({ ok: false, msg: 'حسابك لم يتم تفعيله بعد.' });
    }

    const match = await bcrypt.compare(password, student.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, msg: 'كلمة المرور غير صحيحة.' });
    }

    const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ ok: true, msg: 'تم تسجيل الدخول بنجاح', token, data: { id: student._id, name: student.firstName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'حدث خطأ أثناء تسجيل الدخول.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});
