const express = require('express');
const { body, param } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../util/is-auth');

const router = express.Router();

const productValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Please enter a title between 3 and 100 characters.'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Please enter a valid price greater than 0.')
    .toFloat(),
  body('description')
    .trim()
    .isLength({ min: 5, max: 400 })
    .withMessage('Please enter a description between 5 and 400 characters.')
];

router.get('/add-product', isAuth, adminController.getAddProduct);
router.get(
  '/edit-product/:productId',
  isAuth,
  [
    param('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.')
  ],
  adminController.getEditProduct
);
router.post('/add-product', isAuth, productValidation, adminController.postAddProduct);
router.post(
  '/edit-product',
  isAuth,
  [
    body('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.'),
    ...productValidation
  ],
  adminController.postEditProduct
);
router.get('/products', isAuth, adminController.getProducts);
router.post(
  '/delete-product',
  isAuth,
  [
    body('productId')
      .trim()
      .isMongoId()
      .withMessage('Invalid product id.')
  ],
  adminController.postDeleteProduct
);

module.exports = router;
