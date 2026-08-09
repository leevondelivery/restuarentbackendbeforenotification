const mongoose = require('mongoose');

const rejectedOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String },
    items: { type: Array, default: [] },
    totalCount: { type: Number },
    totalPrice: { type: Number },
    commission: { type: Number, default: 12 },
    gst: { type: Number },
    platformFee: { type: Number },
    grandTotal: { type: Number },
    couponCode: { type: String, default: null },
    influencerName: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentStatus: { type: String },
    coinsEarned: { type: Number },
    userName: { type: String },
    userEmail: { type: String },
    userPhone: { type: String },
    isPhoneVerified: { type: Boolean },
    flatNo: { type: String },
    street: { type: String },
    landmark: { type: String },
    deliveryAddress: { type: String },
    restaurantId: { type: String },
    restaurantName: { type: String },
    userCoordinates: { type: Object },
    deliveryDistance: { type: String },
    deliveryFee: { type: Number },
    aa: { type: String, default: 'gg' },
    orderDate: { type: Date },
    status: { type: String, default: 'rejected' },
    rejectedAt: { type: Date, default: Date.now },
  },
  { strict: false, collection: 'rejectedorders' }
);

module.exports = mongoose.model('RejectedOrder', rejectedOrderSchema);
