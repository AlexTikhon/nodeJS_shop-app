const Product = require('../models/product');
const Cart = require('../models/cart');

exports.getProducts = (req, res) => {
  Product.fetchAll()
    .then(([rows]) => {
      res.render('shop/product-list', {
        prods: rows,
        pageTitle: 'All Products',
        path: '/products'
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/');
    });
};

exports.getProduct = (req, res) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(([product]) => {
      if (!product.length) {
        return res.redirect('/products');
      }

      res.render('shop/product-detail', {
        product: product[0],
        pageTitle: product[0].title,
        path: '/products'
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/products');
    });
};

exports.getIndex = (req, res) => {
  Product.fetchAll()
    .then(([rows]) => {
      res.render('shop/index', {
        prods: rows,
        pageTitle: 'Shop',
        path: '/'
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/products');
    });
};

exports.getCart = (req, res) => {
  Cart.getCart()
    .then(([products]) => {
      const totalPrice = products.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0);

      res.render('shop/cart', {
        pageTitle: 'Your Cart',
        path: '/cart',
        products,
        totalPrice
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/products');
    });
};

exports.postCart = (req, res) => {
  const prodId = req.body.productId;

  Cart.addProduct(prodId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/products');
    });
};

exports.postCartDeleteProduct = (req, res) => {
  const prodId = req.body.productId;

  Cart.deleteProduct(prodId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/cart');
    });
};

exports.getOrders = (req, res) => {
  res.render('shop/orders', {
    pageTitle: 'Your Orders',
    path: '/orders'
  });
};

exports.getCheckout = (req, res) => {
  res.render('shop/checkout', {
    pageTitle: 'Checkout',
    path: '/checkout'
  });
};
