const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String },
    orderId: { type: String },
    amount: { type: Number, default: 0 },
    date: { type: String },
    time: { type: String },
    status: { type: String, default: 'Paid' },
  },
  { timestamps: true }
);

const pendingPaymentSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true },
    restaurantName: { type: String, default: '' },
    grossTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalCommissionCut: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    transactions: [transactionSchema],
  },
  {
    timestamps: true,
    collection: 'pendingpayments',
  }
);

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema, 'pendingpayments');
