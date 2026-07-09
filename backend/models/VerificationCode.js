// models/VerificationCode.js
// ─────────────────────────────────────────────
//  Email Verification Code Schema
//  OTP codes sent on company registration
// ─────────────────────────────────────────────

const mongoose = require('mongoose');
const crypto = require('crypto');

const VerificationCodeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    verificationCode: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // Default: 30 minutes from creation
      default: () => new Date(Date.now() + 30 * 60 * 1000),
    },

    isUsed: {
      type: Boolean,
      default: false,
    },

    // Track attempts to prevent brute-force
    attempts: {
      type: Number,
      default: 0,
      max: [5, 'Maximum verification attempts exceeded'],
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire documents after expiresAt using MongoDB TTL index
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerificationCodeSchema.index({ companyId: 1, isUsed: 1 });

// Static: generate a 6-digit OTP code
VerificationCodeSchema.statics.generateCode = function () {
  return crypto.randomInt(100000, 999999).toString();
};

// Instance: check if code is still valid
VerificationCodeSchema.methods.isValid = function () {
  return !this.isUsed && this.expiresAt > new Date() && this.attempts < 5;
};

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
