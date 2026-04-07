const path = require('path');

const Product = require('../models/product');
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file');

// Render the shared add/edit product form with a normalized view model.
const renderEditProduct = (res, options) => {
  res.status(options.statusCode || 200).render('admin/edit-product', {
    pageTitle: options.editing ? 'Edit Product' : 'Add Product',
    path: options.editing ? '/admin/products' : '/admin/add-product',
    editing: options.editing,
    product: options.product,
    hasError: options.hasError || false,
    errorMessage: options.errorMessage || null,
    validationErrors: options.validationErrors || []
  });
};

// Normalize uploaded Windows file paths into URL-friendly relative paths.
const toRelativeImagePath = (filePath) => filePath.split(path.sep).join('/');

// Delete a product only when it belongs to the current user.
const deleteOwnedProduct = (prodId, userId) => {
  return Product.findOne({ _id: prodId, userId })
    .then((product) => {
      if (!product) {
        return false;
      }

      return fileHelper.deleteFile(product.imageUrl).then(() => {
        return Product.deleteOne({ _id: prodId, userId }).then(() => true);
      });
    });
};

// Render an empty form for creating a new product.
exports.getAddProduct = (req, res) => {
  renderEditProduct(res, {
    editing: false,
    product: {
      title: '',
      price: '',
      description: '',
      imageUrl: ''
    }
  });
};

// Create a new product after validating text fields and image upload.
exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = Number(req.body.price);
  const description = req.body.description;
  const image = req.file;
  const errors = validationResult(req);

  if (!image) {
    return renderEditProduct(res, {
      statusCode: 422,
      editing: false,
      hasError: true,
      errorMessage: 'Please upload a valid image (PNG, JPG, or JPEG).',
      product: {
        title,
        price: req.body.price,
        description,
        imageUrl: ''
      },
      validationErrors: errors.array()
    });
  }

  if (!errors.isEmpty()) {
    return fileHelper
      .deleteFile(image.path)
      .then(() => {
        renderEditProduct(res, {
          statusCode: 422,
          editing: false,
          hasError: true,
          errorMessage: errors.array()[0].msg,
          product: {
            title,
            price: req.body.price,
            description,
            imageUrl: ''
          },
          validationErrors: errors.array()
        });
      })
      .catch((err) => next(err));
  }

  const product = new Product({
    title,
    price,
    description,
    imageUrl: toRelativeImagePath(image.path),
    userId: req.user
  });

  product
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      next(err);
    });
};

// Load the edit form for a product owned by the current user.
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }

  const prodId = req.params.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/admin/products');
  }

  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        return res.redirect('/admin/products');
      }

      renderEditProduct(res, {
        editing: editMode,
        product,
        validationErrors: []
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Update an owned product and replace its image when a new file is provided.
exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const title = req.body.title;
  const description = req.body.description;
  const errors = validationResult(req);
  const image = req.file;

  if (!errors.isEmpty()) {
    const cleanup = image ? fileHelper.deleteFile(image.path) : Promise.resolve();

    return cleanup
      .then(() => Product.findOne({ _id: prodId, userId: req.user._id }))
      .then((product) => {
        renderEditProduct(res, {
          statusCode: 422,
          editing: true,
          hasError: true,
          errorMessage: errors.array()[0].msg,
          product: {
            _id: prodId,
            title,
            price: req.body.price,
            description,
            imageUrl: product ? product.imageUrl : ''
          },
          validationErrors: errors.array()
        });
      })
      .catch((err) => next(err));
  }

  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        if (image) {
          return fileHelper.deleteFile(image.path).then(() => res.redirect('/admin/products'));
        }

        return res.redirect('/admin/products');
      }

      const oldImageUrl = product.imageUrl;
      product.title = title;
      product.price = Number(req.body.price);
      product.description = description;

      if (image) {
        product.imageUrl = toRelativeImagePath(image.path);
      }

      return product.save().then(() => {
        if (image && oldImageUrl && oldImageUrl !== product.imageUrl) {
          return fileHelper.deleteFile(oldImageUrl);
        }
      });
    })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      next(err);
    });
};

// Render the admin product list for the current user.
exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Delete a product through the async admin fetch flow.
exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: errors.array()[0].msg
    });
  }

  deleteOwnedProduct(prodId, req.user._id)
    .then((deleted) => {
      if (!deleted) {
        return res.status(404).json({
          message: 'Product not found.'
        });
      }

      res.status(200).json({
        message: 'Success!'
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Delete a product through the classic form-post fallback flow.
exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/admin/products');
  }

  deleteOwnedProduct(prodId, req.user._id)
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      next(err);
    });
};
