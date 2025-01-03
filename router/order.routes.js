const express = require('express');
const {
  createOrder,
  getOrder,
  getOrderById,
  getAllOrders,
  getAllOrdersForCustomer,
  updateOrderStatus,
  deleteAllOrders,
  getShippingDetails,
  getMyOrders,
} = require('../controller/orderController');

const authenticateCustomer = require('../middlewares/authenticateCustomer');
const { validateObjectId } = require('../middlewares/validateObjectId');
const authenticateAdmin = require('../middlewares/authenticateAdmin');
const router = express.Router();

router.post('/create', authenticateCustomer, createOrder);
router.get('/getOrder', authenticateCustomer, getOrder);

// GET ALL ORDERS ONLY FOR SUPER ADMIN
router.get('/getAllOrders', authenticateAdmin, getAllOrders);
// GET ALL ORDERS FOR A CUSTOMER [ADMIN ONLY]
router.get(
  '/getAllOrdersForCustomer/:customerId',
  authenticateAdmin,
  getAllOrdersForCustomer
);

// Update order status
router.put('/updateOrderStatus/:orderId', authenticateAdmin, updateOrderStatus);

// get shipping details
router.post('/getShippingDetails', authenticateCustomer, getShippingDetails);

// Delete all orders [DANGEROUS]
router.delete('/deleteAllOrders', authenticateAdmin, deleteAllOrders);

//  get my orders
router.get('/myOrders', authenticateCustomer, getMyOrders);
router.get('/getOrderById/:id', authenticateCustomer, getOrderById);

module.exports = router;
