const mongoose = require('mongoose');

const acceptedByRestaurantSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    userId: { type: String },
    items: { type: Array, default: [] },
    totalCount: { type: Number },
    totalPrice: { type: Number },
    commissionRate: { type: Number, default: 12 },
    commissionAmount: { type: Number },
    totalPriceAfterCommission: { type: Number },
    netEarnings: { type: Number },
    preparationTime: { type: Number },
    estimatedPrepEndTime: { type: Date },
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
    rest: { type: String },
    restaurantId: { type: String },
    restaurantName: { type: String },
    restaurantLocation: { type: Object },
    userCoordinates: { type: Object },
    deliveryDistance: { type: String },
    deliveryFee: { type: Number },
    aa: { type: String, default: 'gg' },
    orderDate: { type: Date },
    status: { type: String, default: 'accepted' },
    acceptedAt: { type: Date, default: Date.now },
  },
  { strict: false, collection: 'acceptedbyrestorents' }
);


// Fast MongoDB lookup indexing (<10ms)
acceptedByRestaurantSchema.index({ restaurantId: 1, restId: 1, createdAt: -1 });

module.exports = mongoose.model(
  'AcceptedByRestaurant',
  acceptedByRestaurantSchema
);
