// models/Company.js
const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    gstNumber: {
      type: String,
      required: [true, 'GST number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GST number format',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    companyCode: {
      type: String,
      unique: true,
      sparse: true,       // null until admin approves
      uppercase: true,
    },

    // ── Status lifecycle ──────────────────────────────────────
    // pending   → registered, awaiting admin approval
    // approved  → admin sent credentials via email
    // rejected  → admin rejected the application
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },

    maxDevices: { type: Number, default: 5 },
    isActive:   { type: Boolean, default: true },

    // Admin notes on approval/rejection
    adminNote: { type: String, default: '' },

    // Track when credentials were sent
    credentialsSentAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CompanySchema.index({ companyCode: 1 });
CompanySchema.index({ email: 1 });
CompanySchema.index({ status: 1 });

module.exports = mongoose.model('Company', CompanySchema);