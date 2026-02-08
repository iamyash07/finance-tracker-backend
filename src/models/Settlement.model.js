import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    description: {
      type: String,
      trim: true,
      default: 'Settlement payment',
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      default: null, // link to specific expense
    },
    splitUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, //  which specific user in splits was paid
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;