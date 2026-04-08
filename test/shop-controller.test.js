const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadWithMocks } = require('./helpers/load-with-mocks');

const controllerPath = path.join(__dirname, '..', 'controllers', 'shop.js');

function createResponseDouble(resolve) {
  return {
    redirectedTo: null,
    redirectStatus: 302,
    jsonPayload: null,
    sentPayload: null,
    statusCode: 200,
    redirect(statusOrUrl, maybeUrl) {
      if (typeof maybeUrl === 'undefined') {
        this.redirectedTo = statusOrUrl;
      } else {
        this.redirectStatus = statusOrUrl;
        this.redirectedTo = maybeUrl;
      }
      resolve();
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      resolve();
      return this;
    },
    send(payload) {
      this.sentPayload = payload;
      resolve();
      return this;
    }
  };
}

function createShopController({
  createSession = () => Promise.resolve({ url: 'https://stripe.test/checkout/session-1' }),
  retrieveSession = () => Promise.resolve(null),
  listLineItems = () => Promise.resolve({ data: [] }),
  constructEvent = () => ({ type: 'checkout.session.completed', data: { object: {} } }),
  findOrder = () => Promise.resolve(null),
  findUserById = () => Promise.resolve({ name: 'John', clearCart: () => Promise.resolve() }),
  orderSave = () => Promise.resolve(),
  validationResult = () => ({ isEmpty: () => true, array: () => [] })
} = {}) {
  function Order(data) {
    this.data = data;
    this.save = () => orderSave(data);
  }
  Order.findOne = findOrder;

  function StripeMock() {
    return {
      checkout: {
        sessions: {
          create: createSession,
          retrieve: retrieveSession,
          listLineItems
        }
      },
      webhooks: {
        constructEvent
      }
    };
  }

  return loadWithMocks(controllerPath, {
    stripe: StripeMock,
    '../models/product': {
      countDocuments: () => Promise.resolve(0),
      find: () => ({ skip: () => ({ limit: () => Promise.resolve([]) }) }),
      findById: () => Promise.resolve(null)
    },
    '../models/order': Order,
    '../models/user': {
      findById: findUserById
    },
    'express-validator': {
      validationResult
    },
    pdfkit: function PDFDocument() {
      return {
        pipe() { return this; },
        fontSize() { return this; },
        text() { return this; },
        end() {}
      };
    }
  });
}

test('postCreateCheckoutSession redirects to Stripe Checkout', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_demo';
  process.env.APP_URL = 'http://localhost:3000';

  const shopController = createShopController({
    createSession: (payload) => {
      assert.equal(payload.mode, 'payment');
      assert.equal(payload.line_items.length, 1);
      assert.equal(payload.line_items[0].quantity, 2);
      return Promise.resolve({ url: 'https://stripe.test/checkout/session-1' });
    }
  });

  const req = {
    user: {
      email: 'john@example.com',
      _id: { toString: () => 'user-1' },
      populate: () => Promise.resolve({
        cart: {
          items: [
            {
              quantity: 2,
              productId: {
                title: 'Book',
                description: 'Good book',
                price: 12.5
              }
            }
          ]
        }
      })
    },
    flash() {}
  };

  let res;
  await new Promise((resolve, reject) => {
    res = createResponseDouble(resolve);
    shopController.postCreateCheckoutSession(req, res, reject);
  });

  assert.equal(res.redirectStatus, 303);
  assert.equal(res.redirectedTo, 'https://stripe.test/checkout/session-1');
});

test('postStripeWebhook creates an order for a completed checkout session', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_demo';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_demo';

  const savedOrders = [];
  const clearCartCalls = [];

  const shopController = createShopController({
    constructEvent: (body, signature, secret) => {
      assert.equal(signature, 'sig_demo');
      assert.equal(secret, 'whsec_demo');
      assert.ok(Buffer.isBuffer(body));
      return {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { userId: 'user-1' }
          }
        }
      };
    },
    listLineItems: () => Promise.resolve({
      data: [
        { description: 'Book', quantity: 1, amount_total: 2500 }
      ]
    }),
    findOrder: () => Promise.resolve(null),
    findUserById: () => Promise.resolve({
      name: 'John',
      clearCart: () => {
        clearCartCalls.push('called');
        return Promise.resolve();
      }
    }),
    orderSave: (data) => {
      savedOrders.push(data);
      return Promise.resolve();
    }
  });

  const req = {
    body: Buffer.from('{}'),
    headers: { 'stripe-signature': 'sig_demo' }
  };

  let res;
  await new Promise((resolve, reject) => {
    res = createResponseDouble(resolve);
    shopController.postStripeWebhook(req, res, reject);
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonPayload, { received: true });
  assert.equal(savedOrders.length, 1);
  assert.equal(savedOrders[0].stripeCheckoutSessionId, 'cs_test_123');
  assert.deepEqual(clearCartCalls, ['called']);
});

test('getCheckoutSuccess redirects to orders when the webhook-created order exists', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_demo';

  const shopController = createShopController({
    retrieveSession: () => Promise.resolve({
      id: 'cs_test_123',
      payment_status: 'paid',
      metadata: { userId: 'user-1' }
    }),
    findOrder: () => Promise.resolve({ _id: 'order-1' })
  });

  const flashMessages = [];
  const req = {
    query: { session_id: 'cs_test_123' },
    user: { _id: { toString: () => 'user-1' } },
    flash(type, message) {
      flashMessages.push({ type, message });
    }
  };

  let res;
  await new Promise((resolve, reject) => {
    res = createResponseDouble(resolve);
    shopController.getCheckoutSuccess(req, res, reject);
  });

  assert.equal(res.redirectedTo, '/orders');
  assert.deepEqual(flashMessages, [
    { type: 'success', message: 'Payment confirmed. Your order is available below.' }
  ]);
});
