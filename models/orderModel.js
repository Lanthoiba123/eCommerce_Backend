const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Order amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
      required: [true, 'Order status is required'],
    },
    payment: {
      transactionId: String,
      status: {
        type: String,
        enum: ['Pending', 'Success', 'Failed'],
        default: 'Pending',
      },
      amount: Number,
      currency: {
        type: String,
        default: 'INR',
      },
      timestamp: Date,
    },
    payment_type: {
      type: String,
      enum: ['COD', 'Online'],
      required: [true, 'Payment type is required'],
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
          required: true,
          autopopulate: true,
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'productVariants',
          autopopulate: true,
        },
        name: {
          type: String,
          required: [true, 'Product name is required'],
          trim: true,
        },
        price: {
          type: Number,
          required: [true, 'Product price is required'],
          min: [0, 'Price cannot be negative'],
        },
        quantity: {
          type: Number,
          required: [true, 'Product quantity is required'],
          min: [1, 'Quantity must be at least 1'],
        },
      },
    ],
    shipping_address: {
      full_name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxLength: [100, 'Name cannot exceed 100 characters'],
      },
      address_line1: {
        type: String,
        required: [true, 'Address line 1 is required'],
        trim: true,
      },
      address_line2: {
        type: String,
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      pincode: {
        type: String,
        required: [true, 'Delivery pincode is required'],
        // validate: {
        //   validator: (pin) => {
        //     // Imphal pincodes start with 795
        //     return /^795\d{3}$/.test(pin);
        //   },
        //   message:
        //     'Delivery is only available in Imphal, Manipur (pincode starting with 795)',
        // },
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        // match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"],
      },
    },
    shipping_details: {
      distance_km: {
        type: Number,
      },
      shipping_charge: {
        type: Number,
        required: [true, 'Shipping charge is required'],
        min: [0, 'Shipping charge cannot be negative'],
      },
      estimated_delivery_date: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual for total items in order
orderSchema.virtual('total_items').get(function () {
  return this.products.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-find middleware to populate product and variant
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'products.product',
  }).populate({
    path: 'products.variant',
  });
  next();
});

const Order = mongoose.model('order', orderSchema);
module.exports = Order;
