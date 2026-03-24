const Product = require('../models/product');

exports.getProducts = (req, res) => {
  Product.findAll()
    .then((products) => {
      res.render('shop/product-list', {
        prods: products,
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

  Product.findByPk(prodId)
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
      console.log(err);
      res.redirect('/products');
    });
};

exports.getIndex = (req, res) => {
  Product.findAll()
    .then((products) => {
      res.render('shop/index', {
        prods: products,
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
  req.user
    .getCart()
    .then((cart) => cart.getProducts())
    .then((products) => {
      const totalPrice = products.reduce(
        (sum, product) => sum + Number(product.price) * product.cartItem.quantity,
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
      console.log(err);
      res.redirect('/products');
    });
};

exports.postCart = (req, res) => {
  const prodId = req.body.productId;
  let fetchedCart;
  let newQuantity = 1;

  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      if (products.length > 0) {
        const product = products[0];
        newQuantity = product.cartItem.quantity + 1;
        return product;
      }

      return Product.findByPk(prodId);
    })
    .then((product) => {
      if (!product) {
        return null;
      }

      return fetchedCart.addProduct(product, { through: { quantity: newQuantity } });
    })
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

  req.user
    .getCart()
    .then((cart) => cart.getProducts({ where: { id: prodId } }))
    .then((products) => {
      if (products.length === 0) {
        return null;
      }

      return products[0].cartItem.destroy();
    })
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/cart');
    });
};

exports.postOrder = (req, res) => {
  let fetchedCart;

  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts();
    })
    .then((products) => {
      return req.user.createOrder().then((order) => {
        return order.addProducts(
          products.map((product) => {
            product.orderItem = { quantity: product.cartItem.quantity };
            return product;
          })
        );
      });
    })
    .then(() => {
      return fetchedCart.setProducts(null);
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/cart');
    });
};

exports.getOrders = (req, res) => {
  req.user
    .getOrders({ include: ['products'] })
    .then((orders) => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/cart');
    });
};

exports.getCheckout = (req, res) => {
  res.render('shop/checkout', {
    pageTitle: 'Checkout',
    path: '/checkout'
  });
};
