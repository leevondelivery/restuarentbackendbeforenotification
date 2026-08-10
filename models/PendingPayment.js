const mongoose = require('mongoose');

const pendingPaymentSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true },
    restaurantName: { type: String, default: '' },
    grossTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalCommissionCut: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'pendingpayments',
  }
);

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema, 'pendingpayments');


