const express = require('express');
const {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductById,
  getProductsBySellerId,
  getProductsByShopId,
  createProductTypes,
  getProductTypes,
  updateProductFav,
  filterByPrice,
  filterAllProductByPrice,
  getProductsByCategoryId,
  getTotalProductCount,
  getProductWithComments,
  // getCollectionNamesByCategory,
  getCollectionNamesByCategoryAndSubcategory,
  getFilteredProducts,
  getCarouselProducts,
} = require('../controller/productController');
const multer = require('multer');
const authenticateAdmin = require('../middlewares/authenticateAdmin');
const { validateObjectId } = require('../middlewares/validateObjectId');

const router = express.Router();
const upload = multer();
//category router
router.post(
  '/create',
  authenticateAdmin,
  upload.array('image_id'),
  createProduct
);
router.get('/allproducts', getAllProducts);
router.get('/carousel', getCarouselProducts);
router.get('/getOneProduct/:id', getProductById);
router.put(
  '/update/:id',
  authenticateAdmin,
  validateObjectId,
  upload.array('image_id'),
  updateProduct
);
router.delete(
  '/delete/:id',
  authenticateAdmin,
  validateObjectId,
  deleteProduct
);
router.get('/shop/:id', validateObjectId, getProductsByShopId);
router.get('/seller/:id', validateObjectId, getProductsBySellerId);
router.get(
  '/filterbyprice/:category/:subcategory?/:discountedPrice',
  filterByPrice
);

router.get('/filterbyprice/:new_price', filterAllProductByPrice);
router.get('/products/:productId/comments', getProductWithComments);
router.put('/updatefav/:id', updateProductFav);
router.get('/query', getProductById);
router.post('/createProductType', createProductTypes);
router.get('/getproductType/:types', getProductTypes);
router.get('/getProductsCategoryById', getProductsByCategoryId);
router.get('/total', getTotalProductCount);
router.get('/filterbyprice/:new_price', filterAllProductByPrice);
router.get('/allproduct', getAllProducts);
router.get('/products/:productId/comments', getProductWithComments);
router.put('/update/:id', upload.array('image_id'), updateProduct);
router.put('/updatefav/:id', updateProductFav);
router.delete('/delete/:id', deleteProduct);
router.get('/getOneProduct/:id', getProductById);
router.get('/query', getProductById);
router.post('/createProductType', createProductTypes);
router.get('/getproductType/:types', getProductTypes);
router.get('/getProductsCategoryById', getProductsByCategoryId);
router.get('/total', getTotalProductCount);
router.get(
  '/sorted/:categoryId/:subcategoryId?',
  getCollectionNamesByCategoryAndSubcategory
);
router.get('/collectionfiltername', getFilteredProducts);

// route.delete("/delete/:id", deleteCategory);
// route.put("/update/:id", updateCategory);
module.exports = router;
