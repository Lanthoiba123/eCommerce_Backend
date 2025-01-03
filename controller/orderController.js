const asyncHandler = require('express-async-handler');
const expressAsyncHandler = require('express-async-handler');
const {
  ADMIN_ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PRODUCT_VARIANT_STATUS,
} = require('../constants/constants');
const orderModel = require('../models/orderModel');
const { default: mongoose } = require('mongoose');
const userModel = require('../models/user');
const productModel = require('../models/productModel');
const shippingCalculator = require('../utils/shipping-calculator-class');

const createOrder = asyncHandler(async (req, res) => {
  const { amount, payment, payment_type, products, shipping_address, ...rest } =
    req.body;

  if (!amount || !payment_type || !products || !shipping_address) {
    res.statusCode = 400;
    throw new Error('Please provide all the required fields');
  }

  // check if user exists
  const user = await userModel.findById(req.user._id);
  if (!user) {
    res.statusCode = 404;
    throw new Error('User not found');
  }

  if (!Array.isArray(products) || products.length === 0) {
    res.statusCode = 400;
    throw new Error('Please provide valid products');
  }

  const productIdsWithVariant = products.map((product) => ({
    productId: product.productId,
    variantId: product.variantId,
    quantity: product.quantity,
  }));

  console.log(productIdsWithVariant, 'productIdsWithVariant');

  const productsAvailable = await Promise.all(
    productIdsWithVariant.map(async ({ productId, variantId, quantity }) => {
      // find the product by id and populate the variants
      const productExists = await productModel
        .findById(productId)
        .populate('variants');

      if (!productExists)
        return {
          product: products.find((p) => p.productId === productId),
          status: 'not_found',
          message: 'Product not found',
        };

      // find the variant by id and check if it is in stock
      const variantExists = productExists.variants.find(
        (v) => v?._id.toString() === variantId
      );

      // if (!variantExists)
      //   return {
      //     product: productExists,
      //     status: 'not_found',
      //     message: 'Variant not found',
      //   };

      if (variantExists?.stock?.status === PRODUCT_VARIANT_STATUS.OUT_OF_STOCK)
        return {
          product: productExists,
          status: 'not_found',
          message: 'Variant OUT OF STOCK',
        };

      console.log(productExists, 'productExists');

      return {
        orderProduct: productExists,
        variant: variantExists || {
          price: {
            basePrice: productExists?._doc?.price,
            discount: productExists?._doc?.discount,
            discountedPrice: productExists?._doc?.discountedPrice,
          },
        },
        quantity: quantity,
      };
    })
  );

  // Filter out any null values (products/variants that weren't found)
  const validProducts = productsAvailable.filter(
    (product) => product?.status !== 'not_found'
  );

  // if the number of products available is not equal to the number of product ids,
  // then throw an error
  if (validProducts?.length !== productIdsWithVariant?.length) {
    const productsNotAvailable = productsAvailable.filter(
      (product) => product?.status === 'not_found'
    );

    res.statusCode = 400;
    throw new Error(
      `${productsNotAvailable?.map((product) => product?.message)?.join(', ')}`
    );
  }

  // validate shipping address fields
  const requiredFields = [
    'full_name',
    'address_line1',
    'city',
    'state',
    'pincode',
    'phone',
  ];

  // validate payment fields
  if (payment) {
    const { status, amount: paymentAmount } = payment;

    if (!Object.values(PAYMENT_STATUS).includes(status)) {
      res.statusCode = 400;
      throw new Error(
        'Payment status should be either Pending, Success or Failed'
      );
    }

    if (!paymentAmount || paymentAmount !== amount) {
      res.statusCode = 400;
      throw new Error('Payment amount does not match order amount');
    }
  }

  if (amount <= 0) {
    res.statusCode = 400;
    throw new Error('Amount must be greater than zero');
  }

  const missingFields = requiredFields.filter(
    (field) => !shipping_address[field]
  );
  if (missingFields.length > 0) {
    res.statusCode = 400;
    throw new Error(
      `Please provide ${missingFields.join(', ')} in shipping address`
    );
  }

  const shippingDetails = await shippingCalculator.calculateShipping({
    origin: process.env.ORIGIN_COORDINATES || '24.817, 93.9368', // Imphal, Manipur coordinates
    destination: `${shipping_address.pincode}, ${shipping_address.state}, IN`,
    shipmentDate: new Date().toISOString(),
    country: 'IN',
  });

  // calculate the total amount in backend
  // Calculate product total first for debugging
  const productTotal = validProducts.reduce((acc, product) => {
    console.log(product, 'product');
    // Check for both new and old price structure
    const price = product?.variant?.price?.discountedPrice;
    if (!price) {
      throw new Error(
        `Could not determine price for product ${product?.orderProduct?._id}`
      );
    }
    return acc + price * product.quantity;
  }, 0);

  // Log shipping cost
  console.log('Shipping cost:', shippingDetails.shippingCost);

  const totalAmount = productTotal + shippingDetails.shippingCost;

  // Log final total
  console.log('Total amount:', totalAmount);

  if (totalAmount !== amount) {
    console.log(totalAmount, amount, 'totalAmount');
    res.statusCode = 400;
    throw new Error('Total amount does not match order amount');
  }

  const order = await orderModel.create({
    user_id: user._id,
    amount: totalAmount,
    payment,
    payment_type,
    products: validProducts.map((product) => {
      const productData = {
        product: product.orderProduct._id,
        name: product.orderProduct.name,
        price: product?.variant?.price?.discountedPrice,
        quantity: product?.quantity,
      };

      if (product.variant?._id) {
        productData.variant = product.variant._id;
      }

      return productData;
    }),
    shipping_address,
    shipping_details: {
      distance_km: shippingDetails.distanceInKm,
      shipping_charge: shippingDetails.shippingCost,
      estimated_delivery_date: shippingDetails.estimatedDeliveryDate,
    },
    ...rest,
  });

  res.status(201).json({
    success: true,
    message: 'Order successfully created',
    order,
  });
});
// const getOrder = async (req, res) => {
//   try {
//     const order = await orderModel.find();
//     res.status(200).json({
//       success: true,
//       message: "order succesfully fetched",
//       order,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const getOrder = asyncHandler(async (req, res) => {
  const orders =
    (await orderModel
      .find({ user_id: req.user._id })
      .sort({ createdAt: -1 })) || [];

  res.status(200).json({
    success: true,
    message: 'Orders fetched successfully',
    orders,
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.user._id)) {
    res.statusCode = 400;
    throw new Error('Invalid user id');
  }

  const user = await userModel.findById(req.user._id);
  if (!user) {
    res.statusCode = 400;
    throw new Error('User not found');
  }

  const orders = (await orderModel.find({ user_id: req.user._id })) || [];

  res.status(200).json({
    success: true,
    message: 'Orders fetched successfully',
    orders,
  });
});

const getAllOrders = expressAsyncHandler(async (req, res) => {
  console.log(req.admin);

  if (ADMIN_ROLES.SUPER_ADMIN !== req?.admin?.role) {
    throw new Error('You are not authorized to access this route');
  }

  const orders = (await orderModel.find()) || [];

  res.status(200).json({
    success: true,
    message: 'Orders succesfully fetched',
    orders,
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.statusCode = 400;
    throw new Error('Invalid order Id');
  }

  console.log(id);
  if (!id) {
    res.statusCode = 400;
    throw new Error('Invalid order Id');
  }

  // Populate product and variant references to get their full details
  // This is needed because the order only stores ObjectIds for products and variants
  // By populating, we get access to all product/variant fields like name, description, etc.
  const order = await orderModel
    .findById(id)
    .populate({
      path: 'products.product',
    })
    .populate({
      path: 'products.variant',
    })
    .populate({
      path: 'user_id',
    });

  if (!order) {
    res.statusCode = 404;
    throw new Error('Order not found');
  }

  if (!order.user_id._id.equals(req.user._id)) {
    res.statusCode = 401;
    throw new Error('You are not authorized to view this order');
  }

  res.status(200).json({
    success: true,
    message: 'Particular order fetched successfully',
    order,
  });
});

const getAllOrdersForCustomer = expressAsyncHandler(async (req, res) => {
  if (ADMIN_ROLES.SUPER_ADMIN !== req?.admin?.role) {
    res.statusCode = 403;
    throw new Error('You are not authorized to access this route');
  }

  const { customerId } = req.params;

  if (!mongoose.isValidObjectId(customerId)) {
    res.statusCode = 400;
    throw new Error('Invalid customer ID');
  }

  // check if the customer exists
  const customer = await userModel.findById(customerId);
  if (!customer) {
    res.statusCode = 404;
    throw new Error('Customer not found');
  }

  const orders = (await orderModel.find({ user_id: customerId })) || [];

  res.status(200).json({
    success: true,
    message: 'Orders succesfully fetched',
    orders,
  });
});

const updateOrderStatus = expressAsyncHandler(async (req, res) => {
  if (!Object.values(ADMIN_ROLES).includes(req?.admin?.role)) {
    res.statusCode = 403;
    throw new Error('You are not authorized to access this route');
  }

  const { orderId } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(orderId)) {
    res.statusCode = 400;
    throw new Error('Invalid order ID');
  }

  if (!status) {
    res.statusCode = 400;
    throw new Error('status is required');
  }

  if (!Object.values(ORDER_STATUS).includes(status)) {
    res.statusCode = 400;
    throw new Error(
      'Invalid status. Please use either Pending, Processing, Shipped, Delivered, or Cancelled'
    );
  }

  const order = await orderModel.findByIdAndUpdate(
    orderId,
    { status },
    { new: true }
  );

  if (!order) {
    res.statusCode = 404;
    throw new Error('Order not found');
  }

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    order,
  });
});

const deleteAllOrders = expressAsyncHandler(async (req, res) => {
  if (ADMIN_ROLES.SUPER_ADMIN !== req?.admin?.role) {
    res.statusCode = 403;
    throw new Error('You are not authorized to access this route');
  }

  const orders = await orderModel.deleteMany({});

  if (!orders) {
    res.statusCode = 404;
    throw new Error('No orders found');
  }

  res.status(200).json({
    success: true,
    message: 'All orders deleted successfully',
    orders,
  });
});

const getShippingDetails = expressAsyncHandler(async (req, res) => {
  const address = req.body;
  const shippingDetails = await shippingCalculator.calculateShipping({
    origin: process.env.ORIGIN_COORDINATES || '24.817, 93.9368', // Imphal, Manipur coordinates
    destination: `${address.pincode}, ${address.state}, IN`,
    shipmentDate: new Date().toISOString(),
    country: 'IN',
  });

  res.status(200).json({
    success: true,
    message: 'Shipping details fetched successfully',
    shippingDetails,
  });
});

module.exports = {
  createOrder,
  getOrder,
  getOrderById,
  getAllOrders,
  getAllOrdersForCustomer,
  updateOrderStatus,
  deleteAllOrders,
  getShippingDetails,
  getMyOrders,
};
