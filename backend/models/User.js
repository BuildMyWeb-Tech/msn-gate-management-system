// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'operator', 'viewer'],
      default: 'owner',
    },

    // True until the user changes their temporary password
    isTemporaryPassword: {
      type: Boolean,
      default: true,
    },

    isActive:   { type: Boolean, default: true },
    lastLogin:  { type: Date },
  },
  { timestamps: true }
);

// username unique within a company
UserSchema.index({ companyId: 1, username: 1 }, { unique: true });
UserSchema.index({ email: 1 });

UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model('User', UserSchema);