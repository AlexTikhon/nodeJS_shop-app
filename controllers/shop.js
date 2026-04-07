const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Stripe = require('stripe');

const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const { validationResult } = require('express-validator');

const ITEMS_PER_PAGE = 6;
const appUrl = process.env.APP_URL || 'http://localhost:3000';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Normalize the requested page number and fall back to page 1 for invalid input.
const parsePage = (page) => {
  const parsedPage = Number.parseInt(page, 10);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
};

// Build the visible pagination model including ellipsis placeholders.
const buildPageButtons = (currentPage, totalPages) => {
  if (totalPages <= 1) {
    return [];
  }

  const pages = [];
  const visiblePages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = [...visiblePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (index > 0 && page - previousPage > 1) {
      pages.push({ type: 'ellipsis', value: `ellipsis-${previousPage}-${page}` });
    }

    pages.push({ type: 'page', value: page });
  });

  return pages;
};

// Render a paginated product listing for the shop home or catalog page.
const renderProductPage = (req, res, next, view, pageTitle, pathValue) => {
  const requestedPage = parsePage(req.query.page);
  let totalItems = 0;

  Product.countDocuments()
    .then((count) => {
      totalItems = count;

      const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
      const currentPage = Math.min(requestedPage, totalPages);

      return Product.find()
        .skip((currentPage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .then((products) => ({ products, currentPage, totalPages }));
    })
    .then(({ products, currentPage, totalPages }) => {
      res.render(view, {
        prods: products,
        pageTitle,
        path: pathValue,
        pagination: {
          currentPage,
          totalPages,
          hasPreviousPage: currentPage > 1,
          hasNextPage: currentPage < totalPages,
          previousPage: currentPage - 1,
          nextPage: currentPage + 1,
          pages: buildPageButtons(currentPage, totalPages)
        }
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Populate the cart with products and calculate the current total.
const getCartSummary = (user) => {
  return user.populate('cart.items.productId').then((populatedUser) => {
    const products = populatedUser.cart.items.filter((item) => item.productId);
    const totalPrice = products.reduce(
      (sum, item) => sum + Number(item.productId.price) * item.quantity,
      0
    );

    return {
      products,
      totalPrice
    };
  });
};

// Convert a paid Stripe Checkout session into a local order snapshot.
const createOrderFromStripeSession = (user, session, lineItems) => {
  const products = lineItems.data.map((item) => {
    const quantity = item.quantity || 1;
    const unitAmount = typeof item.amount_total === 'number' ? item.amount_total / quantity : 0;

    return {
      quantity,
      product: {
        title: item.description,
        price: unitAmount / 100
      }
    };
  });

  const order = new Order({
    products,
    user: {
      name: user.name,
      userId: user
    },
    stripeCheckoutSessionId: session.id
  });

  return order.save().then(() => user.clearCart());
};

// Create a local order from a completed Stripe session only once.
const syncStripeOrder = async (session) => {
  if (!session || session.payment_status !== 'paid') {
    return false;
  }

  const existingOrder = await Order.findOne({ stripeCheckoutSessionId: session.id });
  if (existingOrder) {
    return false;
  }

  const userId = session.metadata && session.metadata.userId;
  if (!userId) {
    const error = new Error('Stripe session is missing user metadata.');
    error.httpStatusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User for Stripe session not found.');
    error.httpStatusCode = 404;
    throw error;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  await createOrderFromStripeSession(user, session, lineItems);
  return true;
};

// Render the paginated product catalog page.
exports.getProducts = (req, res, next) => {
  renderProductPage(req, res, next, 'shop/product-list', 'All Products', '/products');
};

// Render the product detail page for one valid product id.
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

// Render the paginated shop landing page.
exports.getIndex = (req, res, next) => {
  renderProductPage(req, res, next, 'shop/index', 'Shop', '/');
};

// Render the current user's cart with populated product data.
exports.getCart = (req, res, next) => {
  getCartSummary(req.user)
    .then(({ products, totalPrice }) => {
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

// Add a product to the cart or increment its quantity.
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

// Remove a product from the current user's cart.
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

// Create an order directly from the cart using the existing non-Stripe flow.
exports.postOrder = (req, res, next) => {
  getCartSummary(req.user)
    .then(({ products }) => {
      const orderProducts = products.map((item) => {
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
        products: orderProducts
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

// Render all orders that belong to the current user.
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

// Generate and stream a PDF invoice for an authorized order.
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

// Render the checkout summary page before the Stripe redirect.
exports.getCheckout = (req, res, next) => {
  getCartSummary(req.user)
    .then(({ products, totalPrice }) => {
      if (products.length === 0) {
        req.flash('error', 'Add products to your cart before starting checkout.');
        return res.redirect('/cart');
      }

      res.render('shop/checkout', {
        pageTitle: 'Checkout',
        path: '/checkout',
        products,
        totalPrice,
        stripeEnabled: Boolean(stripe)
      });
    })
    .catch((err) => {
      next(err);
    });
};

// Create a Stripe Checkout session from the current cart contents.
exports.postCreateCheckoutSession = (req, res, next) => {
  if (!stripe) {
    req.flash('error', 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to continue.');
    return res.redirect('/checkout');
  }

  getCartSummary(req.user)
    .then(({ products }) => {
      if (products.length === 0) {
        req.flash('error', 'Your cart is empty. Add products before checkout.');
        return res.redirect('/cart');
      }

      return stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: req.user.email,
        metadata: {
          userId: req.user._id.toString()
        },
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel`,
        line_items: products.map((item) => {
          return {
            quantity: item.quantity,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(Number(item.productId.price) * 100),
              product_data: {
                name: item.productId.title,
                description: item.productId.description
              }
            }
          };
        })
      });
    })
    .then((session) => {
      if (!session || !session.url) {
        return null;
      }

      res.redirect(303, session.url);
    })
    .catch((err) => {
      next(err);
    });
};

// Accept Stripe webhook events and finalize paid orders on the server side.
exports.postStripeWebhook = (req, res, next) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(400).send('Stripe webhook is not configured.');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing Stripe signature.');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  Promise.resolve()
    .then(() => {
      if (
        event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded'
      ) {
        return syncStripeOrder(event.data.object);
      }

      return null;
    })
    .then(() => {
      res.status(200).json({ received: true });
    })
    .catch((err) => {
      next(err);
    });
};

// Verify the Stripe session and send the user to the orders page.
exports.getCheckoutSuccess = async (req, res, next) => {
  if (!stripe) {
    req.flash('error', 'Stripe is not configured yet.');
    return res.redirect('/checkout');
  }

  const sessionId = req.query.session_id;
  if (!sessionId) {
    req.flash('error', 'Stripe checkout session is missing.');
    return res.redirect('/checkout');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      req.flash('error', 'Payment has not been completed yet.');
      return res.redirect('/checkout');
    }

    if (!session.metadata || session.metadata.userId !== req.user._id.toString()) {
      const error = new Error('Unauthorized');
      error.httpStatusCode = 403;
      throw error;
    }

    const existingOrder = await Order.findOne({ stripeCheckoutSessionId: session.id });
    if (existingOrder) {
      req.flash('success', 'Payment confirmed. Your order is available below.');
      return res.redirect('/orders');
    }

    req.flash('success', 'Payment confirmed. We are finalizing your order now.');
    res.redirect('/orders');
  } catch (err) {
    next(err);
  }
};

// Handle a canceled Stripe checkout and return the user to the summary page.
exports.getCheckoutCancel = (req, res) => {
  req.flash('error', 'Stripe checkout was canceled. You can review your cart and try again.');
  res.redirect('/checkout');
};
