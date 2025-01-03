const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Base product images
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        altText: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Basic product details
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxLength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxLength: [200, 'Short description cannot exceed 200 characters'],
    },

    // Product categorization
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'category',
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'subCategory',
      // required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shop',
      required: true,
    },

    // Product specifications
    specifications: {
      // Common specifications for all handloom products
      material: {
        type: String,
        default: 'Other',
        // Examples: Cotton, Silk, Wool, Linen, Jute, Khadi,
        // Chanderi silk, Tussar silk, Muga silk, Kanchipuram silk,
        // Banarasi silk, Pochampally ikat, Maheshwari cotton
      },
      weaveType: {
        type: String,
      },
      craftTechnique: String,
      careInstructions: String,

      // Optional specifications based on product type
      fabricCount: String, // For sarees, dhotis etc
      borderType: String,
      borderWidth: String,
      palluDetails: String,
      threadCount: Number,
      zariType: String,
    },

    // Target audience
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Unisex'],
      default: 'Unisex',
    },
    ageGroup: {
      type: String,
      enum: ['Adult', 'Kids', 'All'],
      default: 'Adult',
    },

    // Product status and visibility
    // Status field to track the product's publishing state:
    // - draft: Product is still being worked on and not ready for public view
    // - published: Product is live and visible to customers
    // - archived: Product has been taken down but data is preserved
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    isVisible: {
      type: Boolean,
      default: true,
    },

    // SEO fields
    metaTitle: {
      type: String,
      maxLength: [60, 'Meta title should not exceed 60 characters'],
      trim: true,
      // Example: "Handwoven Silk Saree with Zari Border | Traditional Kanchipuram"
    },
    metaDescription: {
      type: String,
      maxLength: [160, 'Meta description should not exceed 160 characters'],
      trim: true,
      // Example: "Elegant handcrafted Kanchipuram silk saree with pure zari border. Features traditional temple designs and contrast pallu. Perfect for weddings and festivals."
    },
    keywords: [
      {
        type: String,
        trim: true,
        // Examples: ["silk saree", "kanchipuram silk", "wedding saree", "traditional saree", "handloom", "zari work"]
      },
    ],

    // // Ratings and reviews
    // averageRating: {
    //   type: Number,
    //   default: 0,
    //   min: 0,
    //   max: 5,
    // },
    // totalReviews: {
    //   type: Number,
    //   default: 0,
    // },

    // // Artisan/Weaver information
    // artisan: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'artisan',
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for variants
productSchema.virtual('variants', {
  ref: 'productVariants',
  localField: '_id',
  foreignField: 'product',
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ 'specifications.material': 1 });
productSchema.index({ category: 1, subcategory: 1 });

// Note: To get variants with find() or findById(), you need to populate:
// await ProductModel.findById(id).populate('variants')
// await ProductModel.find().populate('variants')

const productModel = mongoose.model('product', productSchema);

module.exports = productModel;
