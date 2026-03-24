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
  const { title, imageUrl, price, description } = req.body;

  req.user
    .createProduct({
      title,
      imageUrl,
      price,
      description
    })
    .then(() => {
      res.redirect('/');
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
  Product.findByPk(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect('/');
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
  const { productId, title, imageUrl, price, description } = req.body;

  Product.findByPk(productId)
    .then((product) => {
      if (!product) {
        return res.redirect('/admin/products');
      }

      product.title = title;
      product.imageUrl = imageUrl;
      product.price = price;
      product.description = description;

      return product.save();
    })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};

exports.getProducts = (req, res) => {
  req.user
    .getProducts()
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

  Product.findByPk(prodId)
    .then((product) => {
      if (!product) {
        return null;
      }

      return product.destroy();
    })
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/admin/products');
    });
};
