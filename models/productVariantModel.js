const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema(
  {
    // Color and design variations
    color: {
      name: {
        type: String,
        required: [true, 'Color name is required'],
      },
      code: String, // Hex or RGB code
      description: String,
    },
    pattern: {
      name: String,
      description: String,
    },

    // Size variations
    size: {
      value: {
        type: String,
        required: [true, 'Size value is required'],
      },
      measurements: {
        length: {
          value: Number,
          unit: {
            type: String,
            enum: ['cm', 'inches', 'meters'],
            default: 'cm',
          },
        },
        width: {
          value: Number,
          unit: {
            type: String,
            enum: ['cm', 'inches', 'meters'],
            default: 'cm',
          },
        },
      },
      sizeChart: String, // URL to size chart image
    },

    // Pricing and stock
    price: {
      basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative'],
      },
      discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
      },
      discountedPrice: {
        type: Number,
        default: function () {
          return this.price.basePrice * (1 - this.price.discount / 100);
        },
      },
    },

    stock: {
      quantity: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: 0,
      },
      status: {
        type: String,
        enum: ['in_stock', 'out_of_stock', 'low_stock'],
        default: 'in_stock',
      },
    },

    // Reference to parent product
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'product',
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review',
      },
    ],

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    showInCarousel: {
      type: Boolean,
      default: false,
    },

    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'artisan',
    },

    // Certifications and authenticity
    certifications: [
      {
        name: String,
        certificateNumber: String,
        issuedBy: String,
        validUntil: Date,
      },
    ],

    // Geographic indication
    geographicIndication: {
      region: String, // Example: "Kanchipuram"
      state: String, // Example: "Tamil Nadu"
      isGICertified: Boolean, // Example: true - indicates product has GI certification
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
productVariantSchema.index({ 'stock.status': 1 });
productVariantSchema.index({ product: 1 });

const productVariantModel = mongoose.model(
  'productVariants',
  productVariantSchema
);

module.exports = productVariantModel;
