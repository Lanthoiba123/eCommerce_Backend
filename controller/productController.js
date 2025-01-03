const asyncHandler = require('express-async-handler');
const adminModel = require('../models/adminModel');
const productModel = require('../models/productModel');
const productVariantModel = require('../models/productVariantModel');
const productTypesModel = require('../models/productTypesModel');
const { uploadFile } = require('../upload/upload');
const categoryModel = require('../models/categoryModel');
const commentRatingModel = require('../models/commentRatingModel');
const subCategoryModel = require('../models/subCategoryModel');
const mongoose = require('mongoose');
// const sharp = require("sharp");
// const path = require("node:path");
// const fs = require("node:fs");

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, subcategory, shop, variants, ...rest } =
    req.body;

  const { files } = req;

  if (!name || !description || !category || !shop) {
    res.statusCode = 400;
    throw new Error('Name, description, category, and shop are required');
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    res.status(400);
    throw new Error('Invalid category ID');
  }

  if (subcategory && !mongoose.Types.ObjectId.isValid(subcategory)) {
    res.status(400);
    throw new Error('Invalid subcategory ID');
  }

  if (artisan && !mongoose.Types.ObjectId.isValid(artisan)) {
    res.status(400);
    throw new Error('Invalid artisan ID');
  }

  const images = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const fileId = await uploadFile(file);
      images.push({
        url: fileId,
        altText: file.originalname,
      });
    }
  }

  const product = await productModel.create({
    name,
    description,
    category,
    shop,
    images,
    ...rest,
  });

  // create product variants for the prouct
  const variantList = JSON.parse(variants || '[]');
  const createdVariants = [];
  for (const variant of variantList) {
    const productVariant = await productVariantModel.create({
      product: product._id,
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      ...variant,
      // color: variant.color,
      // pattern: variant.pattern,
      // size: variant.size,
      // price: variant.price,
      // stock: variant.stock,
      // isActive: variant.isActive !== undefined ? variant.isActive : true,
    });
    createdVariants.push(productVariant);
  }
  res.status(201).json({
    success: true,
    message: 'Product and variants successfully created',
    product,
    variants: createdVariants,
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const queries = req.query;
  const queryObj = {};
  const populateQueries = {};

  // Basic filters
  if (queries?.category) {
    if (!mongoose.Types.ObjectId.isValid(queries.category)) {
      res.statusCode = 400;
      throw new Error('Invalid category ID');
    }
    queryObj.category = queries.category;
  }
  if (queries?.subcategory) {
    if (!mongoose.Types.ObjectId.isValid(queries.subcategory)) {
      res.statusCode = 400;
      throw new Error('Invalid subcategory ID');
    }
    queryObj.subcategory = queries.subcategory;
  }
  if (queries?.shop) {
    if (!mongoose.Types.ObjectId.isValid(queries.shop)) {
      res.statusCode = 400;
      throw new Error('Invalid shop ID');
    }
    queryObj.shop = queries.shop;
  }

  // Product status and visibility
  if (queries?.status) {
    queryObj.status = queries.status;
  }
  if (queries?.isVisible !== undefined) {
    queryObj.isVisible = queries.isVisible === 'true';
  }

  // Target audience filters
  if (queries?.gender) {
    queryObj.gender = queries.gender;
  }
  if (queries?.ageGroup) {
    queryObj.ageGroup = queries.ageGroup;
  }

  // Specifications filters
  if (queries?.material) {
    queryObj['specifications.material'] = queries.material;
  }
  if (queries?.weaveType) {
    queryObj['specifications.weaveType'] = queries.weaveType;
  }
  if (queries?.craftTechnique) {
    queryObj['specifications.craftTechnique'] = queries.craftTechnique;
  }

  // Geographic filters
  if (queries?.region) {
    queryObj['geographicIndication.region'] = queries.region;
  }
  if (queries?.state) {
    queryObj['geographicIndication.state'] = queries.state;
  }
  if (queries?.isGICertified !== undefined) {
    queryObj['geographicIndication.isGICertified'] =
      queries.isGICertified === 'true';
  }

  // Text search on name and description
  if (queries?.search) {
    // Escape special regex characters to prevent injection
    const escapeRegExp = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const searchRegex = new RegExp(escapeRegExp(queries.search), 'i');
    queryObj.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { 'specifications.material': searchRegex },
      { 'specifications.weaveType': searchRegex },
      { 'specifications.craftTechnique': searchRegex },
    ];
  }

  // Handle populated field queries and comparison operators
  for (const key of Object.keys(queries)) {
    if (key.includes('.')) {
      const [collection, ...pathParts] = key.split('.');

      // Skip if not a valid collection to query
      if (!['variants'].includes(collection)) continue;

      // Extract any comparison operator from the last part
      const lastPart = pathParts[pathParts.length - 1];
      const path = [...pathParts]; // Create a copy to avoid modifying original
      let operator = '$eq';
      let value = queries[key];

      // Check for comparison operators
      const operators = {
        gte: '$gte',
        lte: '$lte',
        gt: '$gt',
        lt: '$lt',
        ne: '$ne',
      };

      // Check if the field name contains operator suffix (e.g. discount_gte)
      for (const [symbol, mongoOp] of Object.entries(operators)) {
        if (lastPart.includes(symbol)) {
          // Split field name into base field and operator
          const [baseField] = lastPart.split(symbol);
          path[path.length - 1] = baseField.split('_')[0].trim();
          operator = mongoOp;
          // Convert to number only for numeric fields
          if (
            [
              'price.basePrice',
              'price.discount',
              'price.discountedPrice',
              'stock.quantity',
            ].includes(path.join('.'))
          ) {
            value = Number(value);
          }
          break;
        }
      }

      // Initialize collection in populateQueries if needed
      if (!populateQueries[collection]) {
        populateQueries[collection] = { match: {} };
      }

      // Build the match condition with operator
      populateQueries[collection].match[path.join('.')] = { [operator]: value };
    }
  }

  // Pagination
  const page = Number.parseInt(queries.page) || 1;
  const limit = Number.parseInt(queries.limit) || 10;
  const skip = (page - 1) * limit;

  // Ensure page and limit are within reasonable bounds
  if (page < 1 || limit < 1 || limit > 100) {
    res.status(400);
    throw new Error('Invalid pagination parameters');
  }

  let productsQuery = productModel.find(queryObj);

  // Apply population with match conditions
  if (populateQueries.variants) {
    productsQuery = productsQuery.populate({
      path: 'variants',
      match: populateQueries.variants.match,
      options: { lean: true },
    });
  } else {
    productsQuery = productsQuery.populate('variants');
  }

  // Get total count for pagination
  const totalProducts = await productModel.countDocuments(queryObj);
  const totalPages = Math.ceil(totalProducts / limit);

  productsQuery = productsQuery
    .populate('category')
    .populate('subcategory')
    .populate('shop')
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  try {
    const products = await productsQuery.exec();

    // Filter out products with no matching variants if variant queries exist
    const filteredProducts = populateQueries.variants
      ? products.filter((product) => product.variants?.length > 0)
      : products;

    res.status(200).json({
      success: true,
      products: filteredProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error fetching products: ${error.message}`);
  }
});

const getCarouselProducts = asyncHandler(async (req, res) => {
  const products = await productModel
    .find()
    .populate({
      path: 'variants',
      match: { showInCarousel: true },
      options: { lean: true },
    })
    .sort({ _id: -1 });

  // Filter out products that have no variants with showInCarousel=true
  const filteredProducts = products.filter(
    (product) => product?.variants?.length > 0
  );

  res.status(200).json({
    success: true,
    products: filteredProducts,
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.statusCode = 400;
    throw new Error('Invalid product Id');
  }

  const product = await productModel
    .findById(id)
    .populate('category')
    .populate('subcategory')
    .populate('shop')
    .populate('variants');

  if (!product) {
    res.statusCode = 404;
    throw new Error('Product not found');
  }

  res.status(200).json({
    success: true,
    message: 'Product successfully fetched',
    product,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const existingProduct = await productModel.findById(id);
  if (!existingProduct) {
    res.statusCode = 404;
    throw new Error('Product not found');
  }

  if (req.files && req.files.length > 0) {
    const fileIds = [];
    for (const file of req.files) {
      const fileId = await uploadFile(file);
      fileIds.push({
        url: fileId,
        altText: file.originalname,
      });
    }
    updatedData.images = fileIds;
  }
  const updatedProduct = await productModel
    .findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    })
    .populate('category')
    .populate('subcategory', 'name')
    .populate('shop')
    .populate('variants');

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product: updatedProduct,
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await productModel.findById(id);

  if (!product) {
    res.statusCode = 404;
    throw new Error('Product not found');
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Product successfully deleted',
  });
});

const getProductsByShopId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const products = await productModel
    .find({ shop: id })
    .populate('category')
    .populate('subcategory')
    .populate('shop')
    .populate('variants');

  if (products.length === 0) {
    res.statusCode = 404;
    throw new Error('No products found for this seller');
  }

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

const getProductsBySellerId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const seller = await adminModel.findById(id);
  if (!seller || !seller.shop) {
    res.statusCode = 404;
    throw new Error('Seller or shop not found');
  }

  const products = await productModel
    .find({ shop: seller.shop })
    .populate('category')
    .populate('subcategory')
    .populate('shop')
    .populate('variants');

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

// const deleteProduct = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const cancel = await productModel.findByIdAndDelete(id);
//     res.status(201).json({
//       success: true,
//       message: "Data successfully Deleted",
//       cancel,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
// const updateProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updatedData = req.body;

//     // Check for uploaded files
//     if (req.files && req.files.length > 0) {
//       const fileIds = [];
//       for (const file of req.files) {
//         const fileId = await uploadFile(file); // Implement upload logic
//         fileIds.push(fileId); // Collect uploaded file IDs
//       }
//       updatedData.image_id = fileIds; // Store file IDs in the database
//     }

//     // Update product with the new data
//     const updatedProduct = await productModel.findByIdAndUpdate(
//       id,
//       updatedData,
//       { new: true }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Product updated successfully",
//       product: updatedProduct,
//     });
//   } catch (err) {
//     console.error("Error in updateProduct:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to update product",
//       error: err.message,
//     });
//   }
// };
const filterAllProductByPrice = async (req, res) => {
  try {
    const { new_price = '' } = req.params;

    const priceRange = new_price.split('-');
    if (priceRange.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid price range format. Use 'lower-upper'.",
      });
    }

    const lowerPrice = Number.parseInt(priceRange[0], 10);
    const upperPrice = Number.parseInt(priceRange[1], 10);

    if (Number.isNaN(lowerPrice) || Number.isNaN(upperPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price values. Please provide valid numbers.',
      });
    }

    const products = await productModel
      .find({
        new_price: { $gte: lowerPrice, $lte: upperPrice },
      })
      .populate('category');

    res.status(200).json({
      success: true,
      message: 'Products successfully fetched',
      products,
    });
  } catch (err) {
    console.error('Error occurred in filterAllProductByPrice:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching products.',
      error: err.message,
    });
  }
};

const filterByPrice = async (req, res) => {
  try {
    const {
      discountedPrice = '',
      category = '',
      subcategory = '',
    } = req.params;

    console.log('Category:', category);
    console.log('Subcategory:', subcategory);
    console.log('Price Range:', discountedPrice);

    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: 'Category is required.' });
    }

    if (!discountedPrice.includes('-')) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid price range format. Use 'lower-upper' (e.g., '0-1000').",
      });
    }

    const [lowerPrice, upperPrice] = discountedPrice.split('-').map(Number);

    if (Number.isNaN(lowerPrice) || Number.isNaN(upperPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Price range must contain valid numbers.',
      });
    }

    let categoryProduct;

    // Check if 'category' is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(category)) {
      console.log('Searching by category ID');
      categoryProduct = await categoryModel.findById(category);
    } else {
      console.log('Searching by category name');
      const newCategory = category.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

      categoryProduct = await categoryModel.findOne({
        name: new RegExp(`^${newCategory}$`, 'i'),
      });
    }

    if (!categoryProduct) {
      return res
        .status(404)
        .json({ success: false, message: 'Category not found.' });
    }

    console.log('Category ID:', categoryProduct._id);

    // Query for products with optional subcategory filter
    const query = {
      category: categoryProduct._id,
      discountedPrice: { $gte: lowerPrice, $lte: upperPrice },
    };

    if (subcategory) {
      query.subcategory = new RegExp(`^${subcategory}$`, 'i'); // Case-insensitive search for subcategory
    }

    const products = await productModel.find(query).populate('category');

    console.log('Products Found:', products);

    res.status(200).json({
      success: true,
      message: 'Products successfully fetched.',
      products,
    });
  } catch (err) {
    console.error('Error in filterByPrice:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred.',
      error: err.message,
    });
  }
};

// const getAllProduct = async (req, res) => {
//   try {
//     const product = await productModel.find().populate("category");
//     res.status(201).json({
//       success: true,
//       message: "Product succesfully fetch",
//       product,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// Get and filtering the products
// const getAllProduct = async (req, res) => {
//   try {
//     const { productName } = req.query;
//     const query = productName
//       ? { name: { $regex: productName, $options: "i" } }
//       : {};
//     const products = await productModel
//       .find(query)
//       .populate("category")
//       .populate("subcategory")
//       .populate("collection")
//       .sort({ createdAt: -1 });

//     const comments = await commentRatingModel
//       .find({ productName })
//       .populate("userId", "name");

//     res.status(200).json({
//       success: true,
//       message: "Product with comments successfully fetched",
//       products,
//       comments,
//     });
//   } catch (err) {
//     console.error("Error occurred in getProductWithComments:", err);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while fetching product with comments",
//       error: err.message,
//     });
//   }

//   //   res.status(200).json({
//   //     success: true,
//   //     message: "Products successfully fetched",
//   //     products,
//   //   });
//   // } catch (err) {
//   //   console.error(err);
//   //   res.status(500).json({
//   //     success: false,
//   //     message: "Internal server error",
//   //     error: err.message,
//   //   });
//   // }
// };

const getProductWithComments = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await productModel
      .findById(productId)
      .populate('category')
      .populate('collection')
      .populate('subcategory')
      .lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    const comments = await commentRatingModel
      .find({ productId })
      .populate('userId', 'name');
    // .populate("productId");

    res.status(200).json({
      success: true,
      message: 'Product with comments successfully fetched',
      product,
      comments,
    });
  } catch (err) {
    console.error('Error occurred in getProductWithComments:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching product with comments.',
      error: err.message,
    });
  }
};

// const updateProduct = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const { name, description, price, quantity, category } = req.body;
//     // console.log(data);
//     const update = await productModel.findByIdAndUpdate(
//       id,
//       { ...req.body },
//       {
//         new: true,
//       }
//     );
//     res.status(201).json({
//       success: true,
//       message: "Data updated",
//       update,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// const updateProduct = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const info = req.body;
//     const fileObject = req.file;
//     const product = await productModel.findById(id);
//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     const updatedFields = {
//       subtitle: info.subtitle || carousel.subtitle,
//       title: info.title || carousel.title,
//       title2: info.title2 || carousel.title2,
//     };

//     // If a new file is provided, upload it and replace the image ID
//     if (fileObject) {
//       const fieldname = await uploadFile(fileObject);
//       updatedFields.img_id = fieldname;
//     }

//     const updatedCarousel = await carouselModel.findByIdAndUpdate(
//       id,
//       updatedFields,
//       {
//         new: true, // Return the updated document
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "Carousel successfully updated",
//       carousel: updatedCarousel,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const updateProductFav = async (req, res) => {
  try {
    const id = req.params.id;
    const { fav } = req.body;
    console.log(fav);
    const update = await productModel.findByIdAndUpdate(
      id,
      { fav },
      {
        new: true,
      }
    );
    res.status(201).json({
      success: true,
      message: 'Item added to wistlist',
      update,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// const getProductById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const product = await productModel.findById(id);
//     res.status(200).json({
//       success: true,
//       message: "Product succesfully fetch",
//       product,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const createProductTypes = async (req, res) => {
  try {
    const { types } = req.body;
    const productTypesExist = await productTypesModel.findOne({ types });
    console.log('productTypesExist');
    if (productTypesExist) return res.json('ProductTypes exist');
    const productTypes = await new productTypesModel({
      types,
    }).save();
    res.status(201).json({
      success: true,
      message: 'productType succesfully Added',
      productTypes,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getProductTypes = async (req, res) => {
  try {
    const { types } = req.params;
    const productType = await productModel.find({ types }).populate('types');
    res.status(200).json({
      success: true,
      message: 'productType succesfully fetch',
      productType,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const getProductsByCategoryId = async (req, res) => {
  try {
    const { id } = req.query;
    // console.log(req.params);
    // const decodedName = decodeURIComponent(name); // Decode the name parameter

    //Rani-Phee
    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }
    //{ name:"rani-phee", _id:"lsjfsd"}
    const products = await productModel.find({ category: id });
    // console.log(decodedName);
    // console.log(category);
    // console.log(product);

    res.status(200).json({
      success: true,
      message: 'Product category succesfully fetch',
      products,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getTotalProductCount = async (req, res) => {
  try {
    const totalProducts = await productModel.countDocuments();
    res.status(200).json({
      success: true,
      message: 'Total product count fetched successfully',
      total: totalProducts,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: 'Error occurred while fetching total product count',
      error: err.message,
    });
  }
};

const getCollectionNamesByCategoryAndSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const query = { category: categoryId };
    if (subcategoryId) {
      query.subcategory = subcategoryId;
    }

    const products = await productModel.find(query).populate('collection');

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: 'No products found for the specified category and subcategory',
      });
    }

    const collections = products
      .filter((product) => product.collection)
      .map((product) => product.collection.name);

    const uniqueCollections = [...new Set(collections)];

    res.status(200).json({
      success: true,
      message: 'Collections fetched successfully',
      collections: uniqueCollections,
    });
  } catch (err) {
    console.error('Error in getCollectionNamesByCategoryAndSubcategory:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching collection names.',
      error: err.message,
    });
  }
};

const getFilteredProducts = async (req, res) => {
  try {
    const { categoryId, subcategoryId, collectionName } = req.query;

    console.log('Received query params:', req.query);

    const query = {};
    if (categoryId) query.category = categoryId;
    if (subcategoryId) query.subcategory = subcategoryId;

    const products = await productModel.find(query).populate({
      path: 'collection',
      match: { name: collectionName },
    });

    const filteredProducts = products.filter((product) => product.collection);

    if (!filteredProducts.length) {
      return res.status(404).json({
        success: false,
        message: 'No products found for the selected filters.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Products successfully fetched.',
      products: filteredProducts,
    });
  } catch (err) {
    console.error('Error in getFilteredProducts:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching products.',
      error: err.message,
    });
  }
};

module.exports = {
  createProduct,
  filterByPrice,
  getProductsBySellerId,
  getProductsByShopId,
  filterAllProductByPrice,
  getAllProducts,
  getProductWithComments,
  updateProduct,
  updateProductFav,
  deleteProduct,
  getProductById,
  createProductTypes,
  getProductTypes,
  getProductsByCategoryId,
  getTotalProductCount,
  getCollectionNamesByCategoryAndSubcategory,
  getFilteredProducts,
  getCarouselProducts,
};
