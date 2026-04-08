const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadWithMocks } = require('./helpers/load-with-mocks');

const controllerPath = path.join(__dirname, '..', 'controllers', 'auth.js');

function createResponseDouble() {
  return {
    statusCode: 200,
    rendered: null,
    redirectedTo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, payload) {
      this.rendered = { view, payload };
      return this;
    },
    redirect(url) {
      this.redirectedTo = url;
      return this;
    }
  };
}

test('postLogin stores the session and redirects on valid credentials', async () => {
  const user = { _id: 'user-1', email: 'john@example.com', password: 'hashed-password' };

  const authController = loadWithMocks(controllerPath, {
    '../models/user': {
      findOne: () => Promise.resolve(user)
    },
    bcryptjs: {
      compare: () => Promise.resolve(true),
      hash: () => Promise.resolve('unused')
    },
    nodemailer: {
      createTransport: () => ({ sendMail: () => Promise.resolve() })
    },
    'nodemailer-sendgrid-transport': () => ({})
  });

  const req = {
    body: { email: 'john@example.com', password: 'secret1' },
    session: {
      save(callback) {
        callback();
      }
    }
  };
  const res = createResponseDouble();

  await new Promise((resolve, reject) => {
    authController.postLogin(req, res, reject);
    setImmediate(resolve);
  });

  assert.equal(req.session.isLoggedIn, true);
  assert.equal(req.session.user, user);
  assert.equal(res.redirectedTo, '/');
});

test('postLogin renders a validation error when the user password does not match', async () => {
  const user = { _id: 'user-1', email: 'john@example.com', password: 'hashed-password' };

  const authController = loadWithMocks(controllerPath, {
    '../models/user': {
      findOne: () => Promise.resolve(user)
    },
    bcryptjs: {
      compare: () => Promise.resolve(false),
      hash: () => Promise.resolve('unused')
    },
    nodemailer: {
      createTransport: () => ({ sendMail: () => Promise.resolve() })
    },
    'nodemailer-sendgrid-transport': () => ({})
  });

  const req = {
    body: { email: 'john@example.com', password: 'secret1' },
    session: {}
  };
  const res = createResponseDouble();

  await new Promise((resolve, reject) => {
    authController.postLogin(req, res, reject);
    setImmediate(resolve);
  });

  assert.equal(res.statusCode, 422);
  assert.equal(res.rendered.view, 'auth/login');
  assert.equal(res.rendered.payload.errorMessage, 'Invalid email or password.');
});
