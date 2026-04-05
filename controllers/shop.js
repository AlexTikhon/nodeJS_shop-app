const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');
const { validationResult } = require('express-validator');

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products'
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/products');
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect('/products');
      }

      res.render('shop/product-detail', {
        product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/'
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then((user) => {
      const products = user.cart.items.filter((item) => item.productId);
      const totalPrice = products.reduce(
        (sum, item) => sum + Number(item.productId.price) * item.quantity,
        0
      );

      res.render('shop/cart', {
        pageTitle: 'Your Cart',
        path: '/cart',
        products,
        totalPrice
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/products');
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return null;
      }

      return req.user.addToCart(product);
    })
    .then((result) => {
      if (!result) {
        return res.redirect('/products');
      }

      res.redirect('/cart');
    })
    .catch((err) => {
      next(err);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/cart');
  }

  req.user
    .removeFromCart(prodId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      next(err);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then((user) => {
      const products = user.cart.items
        .filter((item) => item.productId)
        .map((item) => {
          return {
            quantity: item.quantity,
            product: { ...item.productId._doc }
          };
        });

      const order = new Order({
        user: {
          name: req.user.name,
          userId: req.user
        },
        products
      });

      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch((err) => {
      next(err);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then((orders) => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders
      });
    })
    .catch((err) => {
      next(err);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.redirect('/orders');
  }

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        const error = new Error('No order found.');
        error.httpStatusCode = 404;
        throw error;
      }

      if (order.user.userId.toString() !== req.user._id.toString()) {
        const error = new Error('Unauthorized');
        error.httpStatusCode = 403;
        throw error;
      }

      const invoiceName = `invoice-${orderId}.pdf`;
      const invoicePath = path.join('data', 'invoices', invoiceName);
      const pdfDoc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.fontSize(14).text(
          `${prod.product.title} - ${prod.quantity} x $${Number(prod.product.price).toFixed(2)}`
        );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text(`Total Price: $${totalPrice.toFixed(2)}`);
      pdfDoc.end();
    })
    .catch((err) => next(err));
};

exports.getCheckout = (req, res) => {
  res.render('shop/checkout', {
    pageTitle: 'Checkout',
    path: '/checkout'
  });
};
