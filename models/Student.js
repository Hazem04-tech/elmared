const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },

  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    match: [/^01[0-9]{9}$/, "رقم الهاتف غير صحيح"]
  },

  fatherPhone: { 
    type: String, 
    required: true, 
    trim: true,
    match: [/^01[0-9]{9}$/, "رقم الهاتف غير صحيح"]
  },

  gender: { type: String, required: true, enum: ['ذكر', 'أنثى'] },
  government: { type: String, required: true },
  grade: { type: String, required: true },

  email: { 
    type: String, 
    trim: true, 
    lowercase: true, 
    unique: true, 
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, "البريد الإلكتروني غير صحيح"]
  },

  passwordHash: { type: String, required: true },

  nationalIdPath: { type: String }, // مسار صورة البطاقة
  userLogo: { type: String },       // مسار صورة البروفايل

  isActive: { type: Boolean, default: false }
}, { timestamps: true });

studentSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('Student', studentSchema);
