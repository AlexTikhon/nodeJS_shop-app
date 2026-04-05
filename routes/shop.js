const express = require('express');
const { body, param } = require('express-validator');

const shopController = require('../controllers/shop');
const isAuth = require('../util/is-auth');

const router = express.Router();

router.get('/', shopController.getIndex);
router.get('/products', shopController.getProducts);
router.get(
  '/products/:productId',
  [
    param('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.')
  ],
  shopController.getProduct
);
router.get('/cart', isAuth, shopController.getCart);
router.post(
  '/cart',
  isAuth,
  [
    body('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.')
  ],
  shopController.postCart
);
router.post(
  '/cart-delete-item',
  isAuth,
  [
    body('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.')
  ],
  shopController.postCartDeleteProduct
);
router.post('/create-order', isAuth, shopController.postOrder);
router.get('/orders', isAuth, shopController.getOrders);
router.get('/checkout', isAuth, shopController.getCheckout);

module.exports = router;
