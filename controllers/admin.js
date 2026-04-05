const Product = require('../models/product');
const { validationResult } = require('express-validator');

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

exports.getAddProduct = (req, res) => {
  renderEditProduct(res, {
    editing: false,
    product: {
      title: '',
      imageUrl: '',
      price: '',
      description: ''
    }
  });
};

exports.postAddProduct = (req, res) => {
  const title = req.body.title;
  const imageUrl = req.body.imageUrl;
  const price = Number(req.body.price);
  const description = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return renderEditProduct(res, {
      statusCode: 422,
      editing: false,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title,
        imageUrl,
        price: req.body.price,
        description
      },
      validationErrors: errors.array()
    });
  }

  const product = new Product({
    title,
    price,
    description,
    imageUrl,
    userId: req.user
  });

  product
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/add-product');
    });
};

exports.getEditProduct = (req, res) => {
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
      console.log(err);
      res.redirect('/admin/products');
    });
};

exports.postEditProduct = (req, res) => {
  const prodId = req.body.productId;
  const title = req.body.title;
  const imageUrl = req.body.imageUrl;
  const description = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return renderEditProduct(res, {
      statusCode: 422,
      editing: true,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        _id: prodId,
        title,
        imageUrl,
        price: req.body.price,
        description
      },
      validationErrors: errors.array()
    });
  }

  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        return res.redirect('/admin/products');
      }

      product.title = title;
      product.price = Number(req.body.price);
      product.description = description;
      product.imageUrl = imageUrl;

      return product.save().then(() => {
        res.redirect('/admin/products');
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};

exports.getProducts = (req, res) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/');
    });
};

exports.postDeleteProduct = (req, res) => {
  const prodId = req.body.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/admin/products');
  }

  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};
