const mongoose = require('mongoose');

const eyongkartInfoSchema = new mongoose.Schema(
  {
    companyInfo: {
      name: {
        type: String,
        required: [true, 'Company name is required'],
      },
      description: {
        type: String,
        required: [true, 'Company description is required'],
      },
      logo: {
        type: String,
      },
    },
    contactInfo: {
      address: {
        type: String,
        required: [true, 'Address is required'],
      },
      mapURL: {
        type: String,
        required: [true, 'Map URL is required'],
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
      },
    },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
    },
    customerService: [
      {
        title: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],
    legalInfo: [
      {
        title: {
          type: String,
        },
        url: {
          type: String,
        },
      },
    ],
    termsAndConditions: {
      content: {
        type: String,
        trim: true,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    shippingPolicy: {
      content: {
        type: String,
        trim: true,
      },
      estimatedDeliveryTime: {
        type: String,
      },
      shippingMethods: [
        {
          name: String,
          cost: Number,
          estimatedDays: String,
        },
      ],
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    returnsAndRefunds: {
      content: {
        type: String,
        trim: true,
      },
      returnPeriod: {
        type: String,
      },
      refundProcessingTime: {
        type: String,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    privacyPolicy: {
      content: {
        type: String,
        trim: true,
      },
      dataCollectionPractices: {
        type: String,
      },
      cookiePolicy: {
        type: String,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    newsletter: {
      enabled: {
        type: Boolean,
      },
      description: {
        type: String,
        default: 'Subscribe to our newsletter for updates',
      },
    },
    copyright: {
      type: String,
      required: [true, 'Copyright text is required'],
    },
    developersMessage: {
      type: String,
      default: 'Crafted with ❤️ for Manipur (Relief Camp) Artisans',
      required: [true, 'Developers message is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for better query performance
eyongkartInfoSchema.index({ 'companyInfo.name': 1 });

module.exports = mongoose.model('eyongkartInfo', eyongkartInfoSchema);
