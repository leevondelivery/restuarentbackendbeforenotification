const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const RestaurantUser = require('./models/User');
const RejectedOrder = require('./models/RejectedOrder');
const Review = require('./models/Review');
const AcceptedByRestaurant = require('./models/AcceptedByRestaurant');
const AcceptedOrder = require('./models/AcceptedOrder');
const PendingPayment = require('./models/PendingPayment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Cluster (restuarentusers collection)');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// GET Accepted Orders Endpoint (filtered by restaurantId from acceptedbyrestorents collection)
// GET Accepted Orders Endpoint (queries ONLY 'acceptedorders' collection)
app.get(['/api/orders/acceptedorders', '/api/orders/accepted', '/api/accepted-orders'], async (req, res) => {
  try {
    const { restaurantId, restId, restaurant_id, userId } = req.query;
    const targetRestId = String(restaurantId || restId || restaurant_id || userId || '').trim();

    console.log(`Fetch accepted orders request (acceptedorders collection) for restaurantId: "${targetRestId}"`);

    if (!targetRestId) {
      return res.json({ success: true, count: 0, orders: [] });
    }

    const numId = !isNaN(targetRestId) ? Number(targetRestId) : -999999;
    const query = {
      $or: [
        { restaurantId: targetRestId },
        { restaurantId: numId },
        { restId: targetRestId },
        { restId: numId },
        { restaurant_id: targetRestId },
        { restaurant_id: numId },
        { 'restaurant.restId': targetRestId },
        { 'restaurant.id': targetRestId },
        { 'restaurant._id': targetRestId },
        { rest: targetRestId },
      ],
    };

    let orders = [];
    const db = mongoose.connection.db;

    if (db) {
      const colAcceptedOrders = db.collection('acceptedorders');
      orders = await colAcceptedOrders.find(query).sort({ createdAt: -1, orderDate: -1 }).toArray();
    } else {
      orders = await AcceptedOrder.find(query).sort({ createdAt: -1 });
    }

    if (orders.length === 0 && targetRestId) {
      const colAcceptedOrders = db ? db.collection('acceptedorders') : null;
      const allDocs = colAcceptedOrders
        ? await colAcceptedOrders.find({}).toArray()
        : await AcceptedOrder.find({});

      orders = allDocs.filter((ord) => {
        const idStr = String(
          ord.restaurantId ||
            ord.restId ||
            ord.restaurant_id ||
            (ord.restaurant && (ord.restaurant.restId || ord.restaurant.id)) ||
            ''
        ).trim();
        return idStr === targetRestId || idStr.toLowerCase() === targetRestId.toLowerCase();
      });
    }

    console.log(`Found ${orders.length} orders from acceptedorders collection for restaurantId: "${targetRestId}"`);

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error fetching accepted orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Accepted By Restaurant Orders Endpoint (queries ONLY 'acceptedbyrestorents' collection)
app.get(['/api/orders/acceptedbyrestorents', '/api/orders/acceptedbyrestaurent', '/api/orders/myorders'], async (req, res) => {
  try {
    const { restaurantId, restId, restaurant_id, userId } = req.query;
    const targetRestId = String(restaurantId || restId || restaurant_id || userId || '').trim();

    console.log(`Fetch acceptedbyrestaurant orders request (acceptedbyrestorents collection) for restaurantId: "${targetRestId}"`);

    if (!targetRestId) {
      return res.json({ success: true, count: 0, orders: [] });
    }

    const numId = !isNaN(targetRestId) ? Number(targetRestId) : -999999;
    const query = {
      $or: [
        { restaurantId: targetRestId },
        { restaurantId: numId },
        { restId: targetRestId },
        { restId: numId },
        { restaurant_id: targetRestId },
        { restaurant_id: numId },
        { 'restaurant.restId': targetRestId },
        { 'restaurant.id': targetRestId },
        { 'restaurant._id': targetRestId },
        { rest: targetRestId },
      ],
    };

    let orders = [];
    const db = mongoose.connection.db;

    if (db) {
      const colAcceptedByRestorents = db.collection('acceptedbyrestorents');
      orders = await colAcceptedByRestorents.find(query).sort({ createdAt: -1, orderDate: -1 }).toArray();
    } else {
      orders = await AcceptedByRestaurant.find(query).sort({ createdAt: -1 });
    }

    if (orders.length === 0 && targetRestId) {
      const colAcceptedByRestorents = db ? db.collection('acceptedbyrestorents') : null;
      const allDocs = colAcceptedByRestorents
        ? await colAcceptedByRestorents.find({}).toArray()
        : await AcceptedByRestaurant.find({});

      orders = allDocs.filter((ord) => {
        const idStr = String(
          ord.restaurantId ||
            ord.restId ||
            ord.restaurant_id ||
            (ord.restaurant && (ord.restaurant.restId || ord.restaurant.id)) ||
            ''
        ).trim();
        return idStr === targetRestId || idStr.toLowerCase() === targetRestId.toLowerCase();
      });
    }

    console.log(`Found ${orders.length} orders from acceptedbyrestorents collection for restaurantId: "${targetRestId}"`);

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error fetching acceptedbyrestaurant orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Incoming Orders Endpoint (queries 'orders' collection in MongoDB for restaurantId)
app.get(['/api/orders/incoming', '/api/orders/incomingorders', '/api/incoming-orders', '/incoming-orders/:restId'], async (req, res) => {
  try {
    const { restaurantId, restId, restaurant_id, userId } = req.query;
    const pathRestId = req.params?.restId;
    const targetRestId = String(restaurantId || restId || restaurant_id || userId || pathRestId || '').trim();

    console.log(`Fetch incoming orders request for restaurantId: "${targetRestId}"`);

    if (!targetRestId) {
      console.log('No restaurantId provided for incoming orders — returning 0 orders.');
      return res.json({ success: true, count: 0, orders: [] });
    }

    const numId = !isNaN(targetRestId) ? Number(targetRestId) : -999999;
    const query = {
      $or: [
        { restaurantId: targetRestId },
        { restaurantId: numId },
        { restId: targetRestId },
        { restId: numId },
        { restaurant_id: targetRestId },
        { restaurant_id: numId },
        { 'restaurant.restId': targetRestId },
        { 'restaurant.id': targetRestId },
        { 'restaurant._id': targetRestId },
        { rest: targetRestId },
      ],
    };

    let orders = [];
    const db = mongoose.connection.db;

    if (db) {
      // 1. Search main 'orders' collection in MongoDB
      const colOrders = db.collection('orders');
      const ordersDocs = await colOrders.find(query).sort({ createdAt: -1, orderDate: -1 }).toArray();

      // 2. Search 'incomingorders' collection
      const colIncoming = db.collection('incomingorders');
      const incomingDocs = await colIncoming.find(query).sort({ createdAt: -1, orderDate: -1 }).toArray();

      // Combine results avoiding duplicates
      const seenIds = new Set();
      orders = [...ordersDocs, ...incomingDocs].filter((ord) => {
        const key = String(ord.orderId || ord._id);
        if (seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });
    }

    console.log(`Found ${orders.length} orders from orders DB collection for restaurantId: "${targetRestId}"`);

    res.json({ success: true, count: orders.length, orders, incomingOrders: orders });
  } catch (err) {
    console.error('Error fetching incoming orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Reject Order Endpoint
// Deletes record from 1) 'orders' collection and 2) 'orderstatuses' collection
// Moves record into 3) 'rejectedorders' collection with status "rejected"
app.post(['/api/orders/reject-order', '/reject-order'], async (req, res) => {
  try {
    const { orderId, orderData } = req.body;
    const targetOrderId = String(orderId || req.body?._id || req.body?.orderId || '').trim();

    console.log(`Reject order request received for orderId: "${targetOrderId}"`);

    if (!targetOrderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const db = mongoose.connection.db;
    let queryId = targetOrderId;
    if (mongoose.Types.ObjectId.isValid(targetOrderId)) {
      queryId = new mongoose.Types.ObjectId(targetOrderId);
    }

    let existingOrderDoc = null;

    if (db) {
      // 1. Fetch existing order doc from orders, orderstatuses, or incomingorders before deleting
      existingOrderDoc = await db.collection('orders').findOne({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      if (!existingOrderDoc) {
        existingOrderDoc = await db.collection('orderstatuses').findOne({
          $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
        });
      }

      if (!existingOrderDoc) {
        existingOrderDoc = await db.collection('incomingorders').findOne({
          $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
        });
      }

      // 2. Delete record from 'orders' collection
      const deleteResult1 = await db.collection('orders').deleteMany({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      // 3. Delete record from 'orderstatuses' collection
      const deleteResult2 = await db.collection('orderstatuses').deleteMany({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      // Also clean up incomingorders if present
      await db.collection('incomingorders').deleteMany({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      console.log(`Deleted order #${targetOrderId} from orders (${deleteResult1.deletedCount}) and orderstatuses (${deleteResult2.deletedCount})`);
    }

    // Source data object combining request body and DB document
    const src = { ...(existingOrderDoc || {}), ...(orderData || req.body || {}) };

    // Construct rejected order document with exact requested schema
    const rejectedDoc = {
      _id: src._id || queryId,
      userId: src.userId || 'USER_ID',
      items: src.items || [],
      totalCount: src.totalCount || (src.items ? src.items.length : 1),
      totalPrice: Number(src.totalPrice || 200),
      commission: Number(src.commission ?? req.body?.commission ?? 12),
      gst: Number(src.gst ?? 10),
      platformFee: Number(src.platformFee ?? 2),
      grandTotal: Number(src.grandTotal || 250),
      couponCode: src.couponCode ?? null,
      influencerName: src.influencerName ?? null,
      discountAmount: Number(src.discountAmount ?? 0),
      orderId: targetOrderId,
      razorpayOrderId: src.razorpayOrderId || 'order_mock_12345',
      razorpayPaymentId: src.razorpayPaymentId || 'pay_mock_12345',
      paymentStatus: src.paymentStatus || 'Paid',
      coinsEarned: Number(src.coinsEarned ?? 10),
      userName: src.userName || 'Test User',
      userEmail: src.userEmail || 'test@example.com',
      userPhone: src.userPhone || '9876543210',
      isPhoneVerified: src.isPhoneVerified ?? true,
      flatNo: src.flatNo || '101',
      street: src.street || 'Main Road',
      landmark: src.landmark || 'Near Park',
      deliveryAddress: src.deliveryAddress || '101, Main Road , Near Park',
      restaurantId: src.restaurantId || src.restId || '2',
      restaurantName: src.restaurantName || 'Test Restaurant',
      userCoordinates: src.userCoordinates || {},
      deliveryDistance: src.deliveryDistance || '3.5 km',
      deliveryFee: Number(src.deliveryFee ?? 38),
      aa: src.aa || 'gg',
      orderDate: src.orderDate ? new Date(src.orderDate) : new Date(),
      status: 'rejected',
      rejectedAt: new Date(),
    };

    if (db) {
      const colRejected = db.collection('rejectedorders');
      await colRejected.updateOne(
        { $or: [{ orderId: targetOrderId }, { _id: rejectedDoc._id }] },
        { $set: rejectedDoc },
        { upsert: true }
      );
    } else {
      await RejectedOrder.updateOne(
        { orderId: targetOrderId },
        { $set: rejectedDoc },
        { upsert: true }
      );
    }

    console.log(`Successfully moved order #${targetOrderId} to rejectedorders collection with status "rejected"`);

    res.json({
      success: true,
      message: 'Order rejected and moved to rejectedorders collection',
      rejectedOrder: rejectedDoc,
    });
  } catch (err) {
    console.error('Error rejecting order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Accept Order Endpoint
// 1. Deletes record from 'orders' collection
// 2. Updates 'orderstatuses' collection status to "Waiting for delivery boy to accept"
// 3. Inserts into 'acceptedorders' collection
// 4. Inserts into 'acceptedbyrestorents' collection with selected preparation time
app.post(['/api/orders/accept-order', '/accept-order'], async (req, res) => {
  try {
    const { orderId, preparationTime, estimatedPrepEndTime, orderData, commission, commissionRate } = req.body;
    const targetOrderId = String(orderId || req.body?._id || req.body?.orderId || '').trim();
    const prepMins = Number(preparationTime ?? 15);

    console.log(`Accept order request received for orderId: "${targetOrderId}", prepTime: ${prepMins}m`);

    if (!targetOrderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const db = mongoose.connection.db;
    let queryId = targetOrderId;
    if (mongoose.Types.ObjectId.isValid(targetOrderId)) {
      queryId = new mongoose.Types.ObjectId(targetOrderId);
    }

    let existingOrderDoc = null;

    if (db) {
      existingOrderDoc = await db.collection('orders').findOne({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      if (!existingOrderDoc) {
        existingOrderDoc = await db.collection('incomingorders').findOne({
          $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
        });
      }

      // 1. Delete from 'orders' & 'incomingorders' collections
      await db.collection('orders').deleteMany({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      await db.collection('incomingorders').deleteMany({
        $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }],
      });

      // 2. Update status in 'orderstatuses' collection to "Waiting for delivery boy to accept"
      await db.collection('orderstatuses').updateOne(
        { $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }] },
        {
          $set: {
            orderId: targetOrderId,
            status: 'Waiting for delivery boy to accept',
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const src = { ...(existingOrderDoc || {}), ...(orderData || req.body || {}) };
    const computedPrepEnd = estimatedPrepEndTime
      ? new Date(estimatedPrepEndTime)
      : new Date(Date.now() + prepMins * 60 * 1000);

    const commRate = Number(commissionRate ?? commission ?? src.commissionRate ?? src.commission ?? 12);
    const totalPrice = Number(src.totalPrice || 200);
    const commissionAmount = Number(((totalPrice * commRate) / 100).toFixed(2));
    const totalPriceAfterCommission = Number((totalPrice - commissionAmount).toFixed(2));
    const netEarnings = totalPriceAfterCommission;

    const baseAcceptedDoc = {
      _id: src._id || queryId,
      orderId: targetOrderId,
      preparationTime: prepMins,
      estimatedPrepEndTime: computedPrepEnd,
      aa: src.aa || 'gg',
      coinsEarned: Number(src.coinsEarned ?? 10),
      commissionAmount: commissionAmount,
      commissionRate: commRate,
      couponCode: src.couponCode ?? null,
      deliveryAddress: src.deliveryAddress || '101, Main Road , Near Park',
      deliveryDistance: src.deliveryDistance || '3.5 km',
      deliveryFee: Number(src.deliveryFee ?? 38),
      discountAmount: Number(src.discountAmount ?? 0),
      flatNo: src.flatNo || '101',
      grandTotal: Number(src.grandTotal || 250),
      gst: Number(src.gst ?? 10),
      influencerName: src.influencerName ?? null,
      isPhoneVerified: src.isPhoneVerified ?? true,
      items: src.items || [],
      landmark: src.landmark || 'Near Park',
      netEarnings: netEarnings,
      orderDate: src.orderDate ? new Date(src.orderDate) : new Date(),
      paymentStatus: src.paymentStatus || 'Paid',
      platformFee: Number(src.platformFee ?? 2),
      razorpayOrderId: src.razorpayOrderId || 'order_mock_12345',
      razorpayPaymentId: src.razorpayPaymentId || 'pay_mock_12345',
      rest: src.rest || (src.restaurantLocation?.name) || 'Nandyal Road',
      restaurantId: src.restaurantId || src.restId || '1',
      restaurantLocation: src.restaurantLocation || {},
      restaurantName: src.restaurantName || 'Test Restaurant',
      status: (req.body.status || req.body.orderStatus || (prepMins === 0 ? 'Ready' : 'Preparing')),
      orderStatus: (req.body.status || req.body.orderStatus || (prepMins === 0 ? 'Ready' : 'Preparing')),
      isReady: Boolean(req.body.isReady ?? (prepMins === 0)),
      
      street: src.street || 'Main Road',
      totalCount: Number(src.totalCount || (src.items ? src.items.length : 1)),
      totalPrice: totalPrice,
      totalPriceAfterCommission: totalPriceAfterCommission,
      userCoordinates: src.userCoordinates || {},
      userEmail: src.userEmail || 'test@example.com',
      userId: src.userId || 'USER_ID',
      userName: src.userName || 'Test User',
      userPhone: src.userPhone || '9876543210',
      acceptedAt: new Date(),
    };

    if (db) {
      // 3. Insert/Upsert into 'acceptedorders' collection
      const colAcceptedOrders = db.collection('acceptedorders');
      await colAcceptedOrders.updateOne(
        { $or: [{ orderId: targetOrderId }, { _id: baseAcceptedDoc._id }] },
        { $set: baseAcceptedDoc },
        { upsert: true }
      );

      // 4. Insert/Upsert into 'acceptedbyrestorents' collection with selected preparationTime
      const colAcceptedByRest = db.collection('acceptedbyrestorents');
      const acceptedByRestDoc = {
        ...baseAcceptedDoc,
        preparationTime: prepMins,
        estimatedPrepEndTime: computedPrepEnd,
      };

      await colAcceptedByRest.updateOne(
        { $or: [{ orderId: targetOrderId }, { _id: baseAcceptedDoc._id }] },
        { $set: acceptedByRestDoc },
        { upsert: true }
      );
    } else {
      await AcceptedOrder.updateOne(
        { orderId: targetOrderId },
        { $set: baseAcceptedDoc },
        { upsert: true }
      );

      await AcceptedByRestaurant.updateOne(
        { orderId: targetOrderId },
        {
          $set: {
            ...baseAcceptedDoc,
            preparationTime: prepMins,
            estimatedPrepEndTime: computedPrepEnd,
          },
        },
        { upsert: true }
      );
    }

    console.log(`Successfully accepted order #${targetOrderId} with prepTime ${prepMins}m across all collections`);

    res.json({
      success: true,
      message: 'Order accepted successfully across collections',
      acceptedOrder: baseAcceptedDoc,
    });

// PUT & POST Update Order Prep Status Endpoint (1-minute periodic sync & Items Ready)
app.all(['/api/orders/update-status', '/update-status'], async (req, res) => {
  try {
    const {
      orderId,
      preparationTime,
      prepTime,
      remainingPrepTimeMins,
      status,
      orderStatus,
      isReady,
      readyAt,
    } = req.body;

    const targetOrderId = String(orderId || req.body?._id || '').trim();
    if (!targetOrderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const db = mongoose.connection.db;
    let queryId = targetOrderId;
    if (mongoose.Types.ObjectId.isValid(targetOrderId)) {
      queryId = new mongoose.Types.ObjectId(targetOrderId);
    }

    const prepVal = Number(preparationTime ?? prepTime ?? remainingPrepTimeMins ?? 0);
    const isNowReady = Boolean(isReady || (status && status.toLowerCase() === 'ready') || prepVal <= 0);

    const updateFields = {
      preparationTime: prepVal,
      updatedAt: new Date(),
    };

    if (isNowReady) {
      updateFields.preparationTime = 0;
      updateFields.status = 'Ready';
      updateFields.orderStatus = 'Ready';
      updateFields.isReady = true;
      updateFields.readyAt = readyAt ? new Date(readyAt) : new Date();
    }

    if (db) {
      await db.collection('acceptedorders').updateMany(
        { $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }] },
        { $set: updateFields, $unset: { remainingPrepTimeMins: "" } }
      );
      if (isNowReady) {
        await db.collection('orderstatuses').updateOne(
          { $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }] },
          { $set: { status: 'Ready for pickup', updatedAt: new Date() } },
          { upsert: true }
        );
      }
      return res.json({ success: true, message: 'Order preparationTime updated', updateFields });
    }

    if (readyAt || isNowReady) {
      updateFields.readyAt = readyAt ? new Date(readyAt) : new Date();
    }

    if (db) {
      await db.collection('acceptedorders').updateMany(
        { $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }] },
        { $set: updateFields }
      );
      if (isNowReady) {
        await db.collection('orderstatuses').updateOne(
          { $or: [{ _id: queryId }, { _id: targetOrderId }, { orderId: targetOrderId }] },
          { $set: { status: 'Ready for pickup', updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    res.json({ success: true, message: 'Order prep status updated in MongoDB', updateFields });
  } catch (err) {
    console.error('Error updating order prep status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

  } catch (err) {
    console.error('Error accepting order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});






// GET My Reviews Endpoint (filtered by restaurant_id / restaurantId / restId)
app.get(['/api/reviews', '/api/reviews/restaurant'], async (req, res) => {
  try {
    const { restaurant_id, restaurantId, restId } = req.query;
    const targetRestId = String(restaurant_id || restaurantId || restId || '').trim();

    console.log(`Fetch reviews request for restaurant_id: "${targetRestId}"`);

    let query = {};
    if (targetRestId) {
      query = {
        $or: [
          { restaurant_id: targetRestId },
          { restaurantId: targetRestId },
          { restId: targetRestId },
          { 'restaurant.restId': targetRestId },
          { 'restaurant.id': targetRestId },
        ],
      };
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 });
    console.log(`Found ${reviews.length} reviews for restaurant_id: "${targetRestId}"`);

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Rejected Orders Endpoint (filtered by restaurantId / restId)
app.get(['/api/orders/rejected', '/api/rejected-orders'], async (req, res) => {
  try {
    const { restaurantId, restId } = req.query;
    const targetRestId = String(restaurantId || restId || '').trim();

    console.log(`Fetch rejected orders request for restaurantId: "${targetRestId}"`);

    let query = {};
    if (targetRestId) {
      query = {
        $or: [
          { restaurantId: targetRestId },
          { restId: targetRestId },
          { 'restaurant.restId': targetRestId },
          { 'restaurant.id': targetRestId },
        ],
      };
    }

    const orders = await RejectedOrder.find(query).sort({ createdAt: -1 });
    console.log(`Found ${orders.length} rejected orders for restaurantId: "${targetRestId}"`);

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error fetching rejected orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Payments History Endpoint (filtered by restaurantId / restId)
app.get(['/api/payments', '/api/payments/history'], async (req, res) => {
  try {
    const { restaurantId, restId } = req.query;
    const targetRestId = String(restaurantId || restId || '').trim();

    console.log(`Fetch payments request for restaurantId: "${targetRestId}"`);

    let query = {};
    if (targetRestId) {
      query = {
        $or: [
          { restaurantId: targetRestId },
          { restId: targetRestId },
          { restaurant_id: targetRestId },
          { 'restaurant.restId': targetRestId },
          { 'restaurant.id': targetRestId },
        ],
      };
    }

    // First query pendingpayments collection in MongoDB
    const pendingPaymentDocs = await PendingPayment.find(query).sort({ createdAt: -1 });

    let grossTotal = 0;
    let grandTotal = 0;
    let transactions = [];

    if (pendingPaymentDocs && pendingPaymentDocs.length > 0) {
      console.log(`Found ${pendingPaymentDocs.length} documents in pendingpayments collection`);

      pendingPaymentDocs.forEach((doc, index) => {
        if (doc.grossTotal !== undefined) grossTotal += Number(doc.grossTotal) || 0;
        else if (doc.totalEarnings !== undefined) grossTotal += Number(doc.totalEarnings) || 0;

        if (doc.grandTotal !== undefined) grandTotal += Number(doc.grandTotal) || 0;
        else if (doc.pendingPayment !== undefined) grandTotal += Number(doc.pendingPayment) || 0;

        if (Array.isArray(doc.transactions) && doc.transactions.length > 0) {
          doc.transactions.forEach((tx) => {
            transactions.push({
              _id: tx._id || tx.id,
              transactionId: tx.transactionId || tx.orderId || tx.id || 'TXN-98401',
              amount: Number(tx.amount || 0),
              date: tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB') : '30 Jul 2026'),
              time: tx.time || (tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '02:45 PM'),
              status: tx.status || 'Pending Clearance',
            });
          });
        } else if (doc.amount !== undefined || doc.transactionId || doc.orderId) {
          // Document itself represents a transaction record
          const txDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
          transactions.push({
            _id: doc._id,
            transactionId: doc.transactionId || doc.orderId || doc.orderid || `TXN-${98400 - index}`,
            amount: Number(doc.amount || doc.grandTotal || doc.pendingPayment || 0),
            date: doc.date || txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: doc.time || txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: doc.status || 'Pending Clearance',
          });
        }
      });
    } else {
      // Fallback: Compute from acceptedbyrestorents collection if pendingpayments collection has no records yet
      console.log('pendingpayments collection empty, calculating from acceptedbyrestorents...');
      const acceptedOrders = await AcceptedByRestaurant.find(query).sort({ createdAt: -1 });

      acceptedOrders.forEach((ord, index) => {
        const commRate = ord.commissionRate ?? ord.commission ?? 12;
        let orderTotal = ord.netEarnings ?? 0;

        if (!orderTotal && ord.items && Array.isArray(ord.items)) {
          orderTotal = ord.items.reduce((sum, item) => {
            const p = item.priceAfterCommission ?? item.price ?? item.originalPrice ?? 0;
            return sum + p * (item.quantity || 1);
          }, 0);
        }
        if (!orderTotal) orderTotal = 176.0;

        grossTotal += orderTotal;
        grandTotal += orderTotal;

        const txDate = ord.createdAt ? new Date(ord.createdAt) : new Date();
        const formattedDate = txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        transactions.push({
          _id: ord._id,
          transactionId: ord.transactionId || ord.orderId || ord.orderid || `TXN-${98400 - index}`,
          amount: orderTotal,
          date: formattedDate,
          time: formattedTime,
          status: ord.status || 'Pending Clearance',
        });
      });
    }

    res.json({
      success: true,
      grossTotal: Number(grossTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Restaurant Stats Endpoint (calculated from acceptedbyrestorents collection by restaurantId)
app.get(['/api/restaurant/stats', '/api/orders/acceptedbyrestorents/stats', '/api/stats'], async (req, res) => {
  try {
    const { restaurantId, restId, restaurant_id, userId } = req.query;
    const targetRestId = String(restaurantId || restId || restaurant_id || userId || '').trim();

    console.log(`Fetch restaurant stats request for restaurantId: "${targetRestId}"`);

    let query = {};
    if (targetRestId) {
      const numId = !isNaN(targetRestId) ? Number(targetRestId) : -999999;
      query = {
        $or: [
          { restaurantId: targetRestId },
          { restaurantId: numId },
          { restId: targetRestId },
          { restId: numId },
          { restaurant_id: targetRestId },
          { restaurant_id: numId },
          { 'restaurant.restId': targetRestId },
          { 'restaurant.id': targetRestId },
        ],
      };
    }

    let orders = [];
    const db = mongoose.connection.db;

    if (db) {
      const colAcceptedByRestorents = db.collection('acceptedbyrestorents');
      orders = await colAcceptedByRestorents.find(query).toArray();
    } else {
      orders = await AcceptedByRestaurant.find(query);
    }

    // Fallback: If query returned 0 orders but targetRestId is present, try case-insensitive or string match
    if (orders.length === 0 && targetRestId) {
      const colAcceptedByRestorents = db ? db.collection('acceptedbyrestorents') : null;
      const allDocs = colAcceptedByRestorents
        ? await colAcceptedByRestorents.find({}).toArray()
        : await AcceptedByRestaurant.find({});

      orders = allDocs.filter((ord) => {
        const idStr = String(
          ord.restaurantId ||
            ord.restId ||
            ord.restaurant_id ||
            (ord.restaurant && (ord.restaurant.restId || ord.restaurant.id)) ||
            ''
        ).trim();
        return !targetRestId || idStr === targetRestId || idStr.toLowerCase() === targetRestId.toLowerCase();
      });

      // If still 0 and targetRestId is generic or single restaurant setup, fallback to all docs
      if (orders.length === 0 && allDocs.length > 0) {
        orders = allDocs;
      }
    }

    const now = new Date();
    const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let todayEarnings = 0;
    let todayOrders = 0;
    let totalEarnings = 0;
    let totalOrders = orders.length;

    orders.forEach((ord) => {
      let orderAmount =
        ord.netEarnings ??
        ord.totalEarnings ??
        ord.totalPriceAfterCommission ??
        ord.netAmount ??
        ord.totalPrice ??
        0;

      if (!orderAmount && ord.items && Array.isArray(ord.items)) {
        orderAmount = ord.items.reduce((sum, item) => {
          const p = item.priceAfterCommission ?? item.price ?? item.originalPrice ?? 0;
          return sum + p * (item.quantity || 1);
        }, 0);
      }

      const numAmount = Number(orderAmount) || 0;
      totalEarnings += numAmount;

      const rawDateStr = ord.orderDate || ord.createdAt || ord.date;
      const orderDate = rawDateStr
        ? new Date(rawDateStr)
        : ord._id && ord._id.getTimestamp
        ? ord._id.getTimestamp()
        : null;

      if (orderDate && !isNaN(orderDate.getTime())) {
        const isToday =
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate();

        if (isToday || orderDate >= startOfTodayLocal) {
          todayOrders += 1;
          todayEarnings += numAmount;
        }
      }
    });

    res.json({
      success: true,
      restaurantId: targetRestId,
      todayEarnings: Number(todayEarnings.toFixed(2)),
      todayOrders,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      totalOrders,
    });
  } catch (err) {
    console.error('Error fetching restaurant stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Leevon Restaurant Backend Server API is running' });
});

// GET all users (helper for debugging/inspecting database)
app.get(['/api/auth/users', '/api/users'], async (req, res) => {
  try {
    const users = await RestaurantUser.find({}, { password: 0 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login Handler Function
const handleLogin = async (req, res) => {
  try {
    const { mobileNumber, phone, password } = req.body;
    const inputPhone = String(mobileNumber || phone || '').trim();
    const inputPassword = String(password || '').trim();

    if (!inputPhone || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and password are required',
      });
    }

    console.log(`Login attempt for phone/mobile: "${inputPhone}"`);

    // Search in restuarentusers collection by phone, mobileNumber, or email
    const user = await RestaurantUser.findOne({
      $or: [
        { phone: inputPhone },
        { mobileNumber: inputPhone },
        { email: inputPhone },
        { email: inputPhone.toLowerCase() },
        { name: inputPhone },
        { phone: Number(inputPhone) || -1 },
        { mobileNumber: Number(inputPhone) || -1 },
      ],
    });

    if (!user) {
      console.log(`User not found for: "${inputPhone}"`);
      return res.status(400).json({
        success: false,
        message: 'Email and password is incorrect',
      });
    }

    // Check password (supports both bcrypt hashed passwords and direct plain text matching)
    let isPasswordValid = false;
    const storedPassword = String(user.password || '');

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(inputPassword, storedPassword);
    } else {
      isPasswordValid = inputPassword === storedPassword;
    }

    if (!isPasswordValid) {
      console.log(`Invalid password for user: "${inputPhone}"`);
      return res.status(401).json({
        success: false,
        message: 'Email and password is incorrect',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone || user.mobileNumber },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    const rawComm =
      user.commission ??
      user.commissionRate ??
      user.commission_rate ??
      user.commissionPercent ??
      user.commission_percent ??
      user.commissionPercentage ??
      0;
    const extractedCommission = Number(rawComm) || 0;

    const userData = {
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || user.mobileNumber || inputPhone,
      restId: user.restId || '',
      restLocation: user.restLocation || '',
      address: user.address || '',
      fssai: user.fssai || '',
      openTime: user.openTime || '',
      closeTime: user.closeTime || '',
      restaurantLocation: user.restaurantLocation || '',
      commission: extractedCommission,
      commissionRate: extractedCommission,
      isActive: user.isActive !== undefined ? user.isActive : true,
    };

    // Save fcmToken directly if passed during login request
    if (req.body.fcmToken) {
      try {
        user.fcmToken = req.body.fcmToken;
        await user.save();
        console.log(`Saved FCM token during login for user "${user.name || inputPhone}"`);
      } catch (fcmErr) {
        console.warn('Notice saving FCM token during login:', fcmErr.message);
      }
    }

    console.log(`Login SUCCESS for: "${inputPhone}" (${user.name})`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message,
    });
  }
};

// Map login endpoints (supports /api/auth/login, /api/login, /login)
app.post(['/api/auth/login', '/api/login', '/login'], handleLogin);

// Register Handler Function
const handleRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      mobileNumber,
      password,
      restId,
      restLocation,
      address,
      fssai,
      openTime,
      closeTime,
      restaurantLocation,
      commission,
    } = req.body;

    const inputPhone = String(phone || mobileNumber || '').trim();
    const inputPassword = String(password || '').trim();

    if (!inputPhone || !inputPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required',
      });
    }

    const existingUser = await RestaurantUser.findOne({
      $or: [{ phone: inputPhone }, { mobileNumber: inputPhone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number',
      });
    }

    const newUser = new RestaurantUser({
      name: name || '',
      email: email || '',
      phone: inputPhone,
      mobileNumber: inputPhone,
      password: inputPassword, // Plain text or hashed
      restId: restId || '',
      restLocation: restLocation || '',
      address: address || '',
      fssai: fssai || '',
      openTime: openTime || '',
      closeTime: closeTime || '',
      restaurantLocation: restaurantLocation || '',
      commission: commission || 0,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'User created successfully in restuarentusers collection',
      user: newUser,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// UPDATE Timings Endpoint for restaurant profile in restuarentusers collection
app.put(['/api/restaurant/timings', '/api/users/update-timings', '/api/restaurant/update-timings'], async (req, res) => {
  try {
    const { userId, restId, phone, openTime, closeTime } = req.body;
    console.log('Update timings request:', req.body);

    let query = {};
    if (userId) {
      query._id = userId;
    } else if (restId) {
      query = { $or: [{ restId }, { restaurantId: restId }, { restaurant_id: restId }] };
    } else if (phone) {
      query = { $or: [{ phone }, { mobileNumber: phone }] };
    } else {
      query = {};
    }

    let updatedUser = await RestaurantUser.findOneAndUpdate(
      query,
      { $set: { openTime: openTime || '', closeTime: closeTime || '' } },
      { new: true }
    );

    if (!updatedUser) {
      console.warn('[Timings Update] No matching restaurant user found.');
      return res.status(404).json({ success: false, error: 'Restaurant user not found' });
    }

    console.log(`Timings updated to: openTime="${openTime}", closeTime="${closeTime}"`);

    res.json({
      success: true,
      message: 'Timings updated successfully',
      openTime: openTime || '',
      closeTime: closeTime || '',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error updating timings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE Status (isActive) Endpoint for restaurant user in restuarentusers collection
app.put(['/api/restaurant/status', '/api/restaurant/toggle-status', '/api/users/update-status'], async (req, res) => {
  try {
    const { userId, restId, phone, isActive } = req.body;
    console.log('Update status request:', req.body);

    const activeBool = typeof isActive === 'boolean' ? isActive : Boolean(isActive);

    let query = {};
    if (userId) {
      query._id = userId;
    } else if (restId) {
      query = { $or: [{ restId }, { restaurantId: restId }, { restaurant_id: restId }] };
    } else if (phone) {
      query = { $or: [{ phone }, { mobileNumber: phone }] };
    } else {
      query = {};
    }

    let updatedUser = await RestaurantUser.findOneAndUpdate(
      query,
      { $set: { isActive: activeBool, isManuallyToggled: true, manualStatusUpdatedAt: new Date() } },
      { new: true }
    );

    if (!updatedUser) {
      console.warn('[Status Update] No matching restaurant user found.');
      return res.status(404).json({ success: false, error: 'Restaurant user not found' });
    }

    console.log(`Status (isActive) updated in restuarentusers collection to: ${activeBool}`);

    res.json({
      success: true,
      message: `Status updated to ${activeBool}`,
      isActive: activeBool,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Menu Items Endpoint from all collections in restuarents DB by restaurantId
app.get(['/api/menu', '/api/menu/items'], async (req, res) => {
  try {
    const { restId, restaurantId, restaurant_id, name, phone, userId } = req.query;
    console.log('Fetch menu request query:', req.query);

    const targetRestId = String(restaurantId || restId || restaurant_id || userId || '').trim();
    const targetName = String(name || '').trim().toLowerCase();

    const db = mongoose.connection.client.db('restuarents');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log(`Searching menu items across ${collectionNames.length} collections in restuarents DB for restaurantId: "${targetRestId}", name: "${targetName}"`);

    let allMatchedItems = [];

    for (const colName of collectionNames) {
      let queryOr = [];
      if (targetRestId) {
        queryOr.push({ restaurantId: targetRestId });
        queryOr.push({ restId: targetRestId });
        queryOr.push({ restaurant_id: targetRestId });
        queryOr.push({ 'restaurant.id': targetRestId });
        queryOr.push({ 'restaurant.restId': targetRestId });
      }

      let colQuery = queryOr.length > 0 ? { $or: queryOr } : {};

      let docs = await db.collection(colName).find(colQuery).toArray();

      // If no docs matched by restaurantId in this collection, but collection name equals targetRestId / targetName
      if (docs.length === 0 && targetRestId && (colName.toLowerCase() === targetRestId.toLowerCase() || colName.toLowerCase().includes(targetRestId.toLowerCase()))) {
        docs = await db.collection(colName).find({}).toArray();
      }

      if (docs.length === 0 && targetName && colName.toLowerCase().includes(targetName)) {
        docs = await db.collection(colName).find({}).toArray();
      }

      for (const doc of docs) {
        // Filter by itemtodisplayintherestuarentapp: if false or "false", do not display in restaurant app
        const displayVal = doc.itemtodisplayintherestuarentapp;
        if (displayVal !== undefined && displayVal !== null) {
          let isDisplay = false;
          if (typeof displayVal === 'boolean') {
            isDisplay = displayVal;
          } else if (typeof displayVal === 'string') {
            isDisplay = displayVal.trim().toLowerCase() === 'true';
          } else {
            isDisplay = Boolean(displayVal);
          }
          if (!isDisplay) {
            continue; // Skip items set to false
          }
        }

        let statusVal = doc.itemStatus;
        if (statusVal === undefined || statusVal === null) {
          statusVal = true;
        } else if (typeof statusVal === 'string') {
          statusVal = statusVal.toLowerCase() === 'true';
        } else {
          statusVal = Boolean(statusVal);
        }

        allMatchedItems.push({
          _id: doc._id.toString(),
          name: doc.name || doc.itemName || doc.title || 'Item',
          price: doc.price || doc.itemPrice || doc.cost || 0,
          itemStatus: statusVal,
          itemtodisplayintherestuarentapp: displayVal,
          category: doc.category || '',
          restaurantId: doc.restaurantId || doc.restId || targetRestId,
          collectionName: colName,
        });
      }
    }

    // Fallback: if still no items matched by specific query, search all docs across all collections
    if (allMatchedItems.length === 0 && collectionNames.length > 0) {
      for (const colName of collectionNames) {
        const docs = await db.collection(colName).find({}).toArray();
        for (const doc of docs) {
          // Filter by itemtodisplayintherestuarentapp: if false or "false", do not display in restaurant app
          const displayVal = doc.itemtodisplayintherestuarentapp;
          if (displayVal !== undefined && displayVal !== null) {
            let isDisplay = false;
            if (typeof displayVal === 'boolean') {
              isDisplay = displayVal;
            } else if (typeof displayVal === 'string') {
              isDisplay = displayVal.trim().toLowerCase() === 'true';
            } else {
              isDisplay = Boolean(displayVal);
            }
            if (!isDisplay) {
              continue; // Skip items set to false
            }
          }

          const docRestId = String(doc.restaurantId || doc.restId || doc.restaurant_id || '').trim();
          if (!targetRestId || docRestId === targetRestId || docRestId.toLowerCase().includes(targetRestId.toLowerCase())) {
            let statusVal = doc.itemStatus;
            if (statusVal === undefined || statusVal === null) {
              statusVal = true;
            } else if (typeof statusVal === 'string') {
              statusVal = statusVal.toLowerCase() === 'true';
            } else {
              statusVal = Boolean(statusVal);
            }

            allMatchedItems.push({
              _id: doc._id.toString(),
              name: doc.name || doc.itemName || doc.title || 'Item',
              price: doc.price || doc.itemPrice || doc.cost || 0,
              itemStatus: statusVal,
              itemtodisplayintherestuarentapp: displayVal,
              category: doc.category || '',
              restaurantId: docRestId || targetRestId,
              collectionName: colName,
            });
          }
        }
      }
    }

    console.log(`Total matched menu items found across restuarents DB: ${allMatchedItems.length}`);

    res.json({
      success: true,
      count: allMatchedItems.length,
      items: allMatchedItems,
    });
  } catch (err) {
    console.error('Error fetching menu items from restuarents DB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE Menu Item Status (itemStatus boolean) in restuarents DB
app.put(['/api/menu/item-status', '/api/menu/toggle-status'], async (req, res) => {
  try {
    const { collectionName, itemId, itemStatus } = req.body;
    console.log('Update itemStatus request:', req.body);

    if (!itemId) {
      return res.status(400).json({ success: false, message: 'itemId is required' });
    }

    const db = mongoose.connection.client.db('restuarents');
    const newStatus = typeof itemStatus === 'boolean' ? itemStatus : Boolean(itemStatus);

    let queryId = itemId;
    if (mongoose.Types.ObjectId.isValid(itemId)) {
      queryId = new mongoose.Types.ObjectId(itemId);
    }

    let targetCols = [];
    if (collectionName) {
      targetCols.push(collectionName);
    } else {
      const collections = await db.listCollections().toArray();
      targetCols = collections.map((c) => c.name);
    }

    let updatedCount = 0;
    for (const colName of targetCols) {
      const result = await db.collection(colName).updateOne(
        { $or: [{ _id: queryId }, { _id: itemId }] },
        { $set: { itemStatus: newStatus } }
      );
      if (result.modifiedCount > 0 || result.matchedCount > 0) {
        updatedCount += (result.modifiedCount || result.matchedCount);
        console.log(`Updated itemStatus in collection "${colName}" for itemId "${itemId}" to: ${newStatus}`);
        break;
      }
    }

    res.json({
      success: true,
      message: `itemStatus updated to ${newStatus}`,
      itemStatus: newStatus,
      updatedCount,
    });
  } catch (err) {
    console.error('Error updating itemStatus in restuarents DB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pendingpayments — Upsert: update existing restaurant doc or create if none exists
app.post('/api/pendingpayments', async (req, res) => {
  try {
    const {
      restaurantId,
      restaurantName,
      grossTotal,
      grandTotal,
      commissionRate,
      totalCommissionCut,
      date,
      orderId,
    } = req.body;

    console.log('pendingpayments POST received:', req.body);

    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'restaurantId is required' });
    }

    const restIdStr = String(restaurantId);
    const grossTotalNum = Number(grossTotal) || 0;
    const grandTotalNum = Number(grandTotal) || 0;
    const commissionRateNum = Number(commissionRate) || 0;
    const totalCommissionCutNum = Number(totalCommissionCut) || 0;
    const dateStr = date || new Date().toISOString();
    const orderIdStr = String(orderId || '');
    const timeStr = new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Build transaction entry to push
    // Build transaction entry
    const newTransaction = {
      orderId: orderIdStr,
      amount: grandTotalNum,
      date: dateStr.split('T')[0],
      time: timeStr,
      status: 'Paid',
    };

    // Find existing doc for this restaurant and increment totals, OR create fresh doc
    const updatedDoc = await PendingPayment.findOneAndUpdate(
      { restaurantId: restIdStr },
      {
        $inc: {
          grossTotal: grossTotalNum,
          grandTotal: grandTotalNum,
          totalCommissionCut: totalCommissionCutNum,
        },
        $set: {
          restaurantId: restIdStr,
          restaurantName: restaurantName || '',
          commissionRate: commissionRateNum,
        },
        $push: {
          transactions: {
            $each: [newTransaction],
            $position: 0,
          },
        },
      },
      { upsert: true, new: true, strict: false }
    );

    console.log(`pendingpayments upserted for restaurantId: "${restIdStr}", orderId: "${orderIdStr}"`);
    console.log(`New grossTotal: ${updatedDoc.grossTotal}, grandTotal: ${updatedDoc.grandTotal}`);

    res.status(200).json({ success: true, message: 'Pending payment updated', data: updatedDoc });
  } catch (err) {
    console.error('Error upserting pendingpayments entry:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/payments — Fetch pending payments for a restaurant (used by payments screen)
app.get('/api/payments', async (req, res) => {
  try {
    const { restaurantId, restId, restaurant_id } = req.query;
    const targetRestId = String(restaurantId || restId || restaurant_id || '').trim();

    console.log(`GET /api/payments for restaurantId: "${targetRestId}"`);

    if (!targetRestId) {
      return res.status(400).json({ success: false, error: 'restaurantId is required' });
    }

    const numId = !isNaN(targetRestId) ? Number(targetRestId) : null;

    const query = {
      $or: [
        { restaurantId: targetRestId },
        { restaurant_id: targetRestId },
        { restId: targetRestId },
        ...(numId !== null ? [{ restaurantId: numId }, { restaurant_id: numId }, { restId: numId }] : []),
      ],
    };

    const entries = await PendingPayment.find(query).sort({ createdAt: -1 });

    // Aggregate totals across all entries for this restaurant
    const grossTotal = entries.reduce((sum, e) => sum + (e.grossTotal || 0), 0);
    const grandTotal = entries.reduce((sum, e) => sum + (e.grandTotal || 0), 0);

    console.log(`Found ${entries.length} pendingpayment entries for restaurantId: "${targetRestId}"`);

    res.json({
      success: true,
      grossTotal,
      grandTotal,
      transactions: entries.flatMap(e => Array.isArray(e.transactions) && e.transactions.length > 0 ? e.transactions : [e]),
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// FIREBASE CLOUD MESSAGING (FCM) INTEGRATION
// ==========================================
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseAdmin = admin;
    console.log('Successfully initialized Firebase Admin SDK from firebase-service-account.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseAdmin = admin;
    console.log('Successfully initialized Firebase Admin SDK from process.env.FIREBASE_SERVICE_ACCOUNT');
  } else {
    console.log('Notice: firebase-service-account.json not found in backend directory. FCM notifications will log locally.');
  }
} catch (e) {
  console.warn('Firebase Admin SDK setup notice:', e.message);
}

// POST /api/restaurant/fcm-token — Save or Update FCM Device Token for a specific Restaurant User
app.post('/api/restaurant/fcm-token', async (req, res) => {
  try {
    const { restaurantId, restId, userId, phone, email, fcmToken } = req.body;
    const targetRestId = String(restaurantId || restId || userId || phone || email || '').trim();

    console.log(`Received FCM token registration for targetRestId "${targetRestId}": ${fcmToken}`);

    if (!fcmToken) {
      return res.status(400).json({ success: false, error: 'fcmToken is required' });
    }

    const numId = targetRestId && !isNaN(targetRestId) ? Number(targetRestId) : null;
    let queryConditions = [];

    if (targetRestId) {
      queryConditions.push({ restId: targetRestId });
      queryConditions.push({ restId: String(targetRestId) });
      queryConditions.push({ restaurantId: targetRestId });
      queryConditions.push({ restaurantId: String(targetRestId) });
      queryConditions.push({ restaurant_id: targetRestId });
      if (mongoose.Types.ObjectId.isValid(targetRestId)) {
        queryConditions.push({ _id: new mongoose.Types.ObjectId(targetRestId) });
        queryConditions.push({ _id: targetRestId });
      }
      queryConditions.push({ phone: targetRestId });
      queryConditions.push({ mobileNumber: targetRestId });
      queryConditions.push({ email: targetRestId });
      if (numId !== null) {
        queryConditions.push({ restId: numId });
        queryConditions.push({ restaurantId: numId });
      }
    }

    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        queryConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
      }
      queryConditions.push({ _id: String(userId) });
    }
    if (phone) {
      queryConditions.push({ phone: String(phone) });
      queryConditions.push({ mobileNumber: String(phone) });
    }
    if (email) {
      queryConditions.push({ email: String(email) });
    }

    const filter = queryConditions.length > 0 ? { $or: queryConditions } : {};

    const result = await RestaurantUser.updateMany(filter, { $set: { fcmToken } });

    const db = mongoose.connection.db;
    let rawResult = null;
    if (db) {
      try {
        rawResult = await db.collection('restuarentusers').updateMany(filter, { $set: { fcmToken } });
      } catch (rawErr) {
        console.warn('Raw MongoDB update notice:', rawErr.message);
      }
    }

    const totalMatched = Math.max(result?.matchedCount || 0, rawResult?.matchedCount || 0);
    const totalModified = Math.max(result?.modifiedCount || 0, rawResult?.modifiedCount || 0);

    console.log(`Updated FCM token in restuarentusers collection for targetRestId "${targetRestId}": (${totalMatched} matched, ${totalModified} modified)`);

    res.json({
      success: true,
      message: 'FCM token registered successfully for restaurant',
      fcmToken,
      matchedCount: totalMatched,
      modifiedCount: totalModified,
    });
  } catch (err) {
    console.error('Error saving FCM token:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function: Send high-priority FCM notification strictly to targeted restaurant device
async function sendFCMOrderNotification(targetRestId, orderData) {
  try {
    const numId = targetRestId && !isNaN(targetRestId) ? Number(targetRestId) : null;
    const userDoc = await RestaurantUser.findOne({
      $or: [
        { restId: String(targetRestId) },
        { restaurantId: String(targetRestId) },
        { restaurant_id: String(targetRestId) },
        { _id: mongoose.Types.ObjectId.isValid(targetRestId) ? new mongoose.Types.ObjectId(targetRestId) : null },
        { phone: String(targetRestId) },
        { mobileNumber: String(targetRestId) },
        { email: String(targetRestId) },
        ...(numId !== null ? [{ restId: numId }, { restaurantId: numId }] : []),
      ],
    });

    // 1. Skip notifications if restaurant partner switched toggle to OFFLINE / CLOSED (isActive === false)
    const rawActive = userDoc ? (userDoc.isActive !== undefined ? userDoc.isActive : userDoc.isOnline) : undefined;
    const isOffline =
      rawActive === false ||
      rawActive === 0 ||
      ['false', 'bfalse', '0', 'closed', 'off', 'offline'].includes(String(rawActive || '').trim().toLowerCase());

    if (!userDoc || isOffline) {
      console.log(`RestaurantId "${targetRestId}" is toggled OFFLINE / CLOSED (isActive: ${userDoc?.isActive}). FCM push notification skipped.`);
      return { success: false, message: 'Restaurant is offline/closed' };
    }

    // 2. Skip notifications if restaurant partner is LOGGED OUT (fcmToken is empty)
    const fcmToken = String(userDoc?.fcmToken || '').trim();
    if (!fcmToken) {
      console.log(`RestaurantId "${targetRestId}" user is LOGGED OUT (no FCM token). FCM push notification skipped.`);
      return { success: false, message: 'Restaurant is logged out' };
    }
    const orderId = orderData.orderId || orderData._id || 'NEW';
    const amount = orderData.grandTotal || orderData.totalPrice || orderData.amount || '0';

    console.log(`Targeting FCM notification for Order #${orderId} (₹${amount}) strictly to restaurantId "${targetRestId}", Found Token: "${fcmToken ? 'YES' : 'NONE'}"`);

    if (!firebaseAdmin) {
      console.warn(`[FCM Dispatch] firebaseAdmin SDK is NOT initialized. Cannot send push notification for Order #${orderId}. Check firebase-service-account.json or credentials.`);
    }

    if (fcmToken && firebaseAdmin) {
      const message = {
        token: fcmToken,
        notification: {
          title: '🔔 NEW ORDER RECEIVED!',
          body: `Order #${orderId} - Total Amount: ₹${amount}`,
        },
        data: {
          title: '🔔 NEW ORDER RECEIVED!',
          body: `Order #${orderId} - Total Amount: ₹${amount}`,
          orderId: String(orderId),
          totalPrice: String(amount),
          grandTotal: String(amount),
          restaurantId: String(targetRestId),
          sound: 'ordernotification',
          channelId: 'order_incoming_channel_v5',
          type: 'NEW_ORDER_ALERT',
        },
        android: {
          priority: 'high',
          directBootOk: true,
          ttl: 0,
          notification: {
            channelId: 'order_incoming_channel_v5',
            sound: 'ordernotification',
            icon: 'ic_stat_notification',
            color: '#000000',
          },
        },
      };

      const response = await firebaseAdmin.messaging().send(message);
      console.log(`[FCM Dispatch] Firebase FCM Push Notification Sent Successfully to restaurantId "${targetRestId}":`, response);
      return { success: true, response };
    } else if (!fcmToken) {
      console.warn(`[FCM Dispatch] No valid FCM token registered in DB for restaurantId "${targetRestId}". Notification skipped. App must register token via /api/restaurant/fcm-token.`);
    }
  } catch (err) {
    console.error('Error sending FCM notification:', err);
    if (
      err?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
      err?.code === 'messaging/registration-token-not-registered' ||
      String(err?.message || '').includes('NotRegistered')
    ) {
      console.warn(`[FCM Clean] Stale token detected for restaurantId "${targetRestId}". Clearing stale FCM token from DB so app re-registers fresh token.`);
      try {
        await RestaurantUser.updateMany(
          {
            $or: [
              { restId: String(targetRestId) },
              { restaurantId: String(targetRestId) },
              { restaurant_id: String(targetRestId) },
              { phone: String(targetRestId) },
              { email: String(targetRestId) },
            ],
          },
          { $set: { fcmToken: '' } }
        );
      } catch (cleanErr) {}
    }
  }
  return { success: false };
}

// POST /api/orders/send-notification — Endpoint to manually or webhook trigger an order push notification
app.post('/api/orders/send-notification', async (req, res) => {
  try {
    const { restaurantId, restId, orderData } = req.body;
    const targetRestId = String(restaurantId || restId || orderData?.restaurantId || orderData?.restId || '').trim();

    if (!targetRestId || !orderData) {
      return res.status(400).json({ success: false, error: 'restaurantId and orderData are required' });
    }

    const result = await sendFCMOrderNotification(targetRestId, orderData);
    res.json({ success: true, message: 'Notification payload processed', result });
  } catch (err) {
    console.error('Error in send-notification endpoint:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-Side Real-Time Background Order Dispatcher
// Automatically checks MongoDB for new incoming orders every 3 seconds and dispatches FCM notifications immediately
// Ensures notifications arrive even when the mobile app is completely CLOSED, KILLED, or phone is LOCKED
setInterval(async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const query = { $or: [{ fcmSent: { $ne: true } }, { fcmSent: { $exists: false } }] };

    const colOrders = db.collection('orders');
    const newOrders = await colOrders.find(query).toArray();

    const colIncoming = db.collection('incomingorders');
    const newIncoming = await colIncoming.find(query).toArray();

    const seenIds = new Set();
    const pendingOrders = [...newOrders, ...newIncoming].filter((ord) => {
      const idStr = String(ord._id || ord.orderId);
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    for (const ord of pendingOrders) {
      const ordId = ord._id || ord.orderId || 'UNKNOWN';
      const targetRestId = String(
        ord.restaurantId ||
          ord.restId ||
          ord.restaurant_id ||
          (ord.restaurant && (ord.restaurant.restId || ord.restaurant.id)) ||
          ''
      ).trim();

      try {
        await colOrders.updateOne(
          { $or: [{ _id: ord._id }, { orderId: String(ordId) }] },
          { $set: { fcmSent: true } }
        );
        await colIncoming.updateOne(
          { $or: [{ _id: ord._id }, { orderId: String(ordId) }] },
          { $set: { fcmSent: true } }
        );
      } catch (e) {}

      if (targetRestId) {
        console.log(`[FCM Background Dispatcher] Auto-dispatching push notification for Order #${ordId} to restaurantId "${targetRestId}"`);
        await sendFCMOrderNotification(targetRestId, ord);
      }
    }
  } catch (err) {
    // Silent catch
  }
}, 3000);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} on all network interfaces (0.0.0.0)`);
});




// Backend 1-Minute Background Timer Sync for Order Preparation Countdown & Auto-Ready
setInterval(async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const now = new Date();
    const nowMs = now.getTime();

    // Fetch active preparing orders from acceptedorders and acceptedbyrestorents
    const preparingOrders = await db.collection('acceptedorders').find({
      status: { $regex: /^preparing$/i }
    }).toArray();

    for (const ord of preparingOrders) {
      if (!ord || !ord.estimatedPrepEndTime) continue;
      const endMs = new Date(ord.estimatedPrepEndTime).getTime();
      const acceptedMs = ord.acceptedAt ? new Date(ord.acceptedAt).getTime() : nowMs;
      
      const totalPrepMins = Number(ord.preparationTime ?? ord.prepTime ?? 15);
      const remainingMins = Math.max(0, Math.ceil((endMs - nowMs) / (60 * 1000)));
      const isExpired = remainingMins <= 0;
      const newStatus = isExpired ? 'Ready' : 'Preparing';

      const updatePayload = {
        preparationTime: remainingMins,
        updatedAt: now,
      };
      if (isExpired) {
        updatePayload.preparationTime = 0;
        updatePayload.status = 'Ready';
        updatePayload.orderStatus = 'Ready';
        updatePayload.isReady = true;
        updatePayload.readyAt = now;
      }

      const queryFilter = { $or: [{ _id: ord._id }, { orderId: ord.orderId }] };

      await db.collection('acceptedorders').updateMany(queryFilter, { $set: updatePayload, $unset: { remainingPrepTimeMins: "" } });
      
      if (isExpired) {
        await db.collection('orderstatuses').updateOne(
          queryFilter,
          { $set: { status: 'Ready for pickup', updatedAt: now } },
          { upsert: true }
        );
      }
    }
  } catch (err) {
    console.error('Error in backend 1-minute order timer interval:', err.message);
  }
}, 60000);
