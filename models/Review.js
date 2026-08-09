const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderid: { type: String },
    orderId: { type: String },
    restaurant_id: { type: String },
    restaurantId: { type: String },
    restId: { type: String },
    items: [
      {
        name: { type: String },
        quantity: { type: Number },
        price: { type: Number },
      },
    ],
    restaurantRating: { type: Number, default: 5 },
    restaurantReview: { type: String },
    date: { type: String },
    time: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'reviews' }
);

module.exports = mongoose.model('Review', reviewSchema);
