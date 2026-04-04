const Product = require('../models/product');

exports.getAddProduct = (req, res) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    product: null
  });
};

exports.postAddProduct = (req, res) => {
  const title = req.body.title;
  const imageUrl = req.body.imageUrl;
  const price = Number(req.body.price);
  const description = req.body.description;

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
  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        return res.redirect('/admin/products');
      }

      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/products',
        editing: editMode,
        product
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};

exports.postEditProduct = (req, res) => {
  const prodId = req.body.productId;

  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        return res.redirect('/admin/products');
      }

      product.title = req.body.title;
      product.price = Number(req.body.price);
      product.description = req.body.description;
      product.imageUrl = req.body.imageUrl;

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

  Product.deleteOne({ _id: prodId, userId: req.user._id })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};
