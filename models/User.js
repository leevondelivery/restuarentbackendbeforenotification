const mongoose = require('mongoose');

const RestaurantUserSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, required: true },
    mobileNumber: { type: String },
    password: { type: String, required: true },
    restId: { type: String, default: '' },
    restLocation: { type: String, default: '' },
    address: { type: String, default: '' },
    fssai: { type: String, default: '' },
    openTime: { type: String, default: '' },
    closeTime: { type: String, default: '' },
    restaurantLocation: { type: mongoose.Schema.Types.Mixed, default: '' },
    commission: { type: mongoose.Schema.Types.Mixed, default: 0 },
    isActive: { type: Boolean, default: true },
    fcmToken: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'restuarentusers', // Explicitly targeting restuarentusers collection
  }
);


// Fast MongoDB lookup indexing (<10ms)
RestaurantUserSchema.index({ restaurantId: 1, restId: 1, createdAt: -1 });

module.exports = mongoose.model('RestaurantUser', RestaurantUserSchema, 'restuarentusers');
