const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadWithMocks } = require('./helpers/load-with-mocks');

const controllerPath = path.join(__dirname, '..', 'controllers', 'admin.js');

function createResponseDouble(resolve) {
  return {
    statusCode: 200,
    jsonPayload: null,
    redirectedTo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      resolve();
      return this;
    },
    redirect(url) {
      this.redirectedTo = url;
      resolve();
      return this;
    }
  };
}

test('deleteProduct removes an owned product and returns JSON success', async () => {
  const deleteCalls = [];
  const fileCalls = [];

  const adminController = loadWithMocks(controllerPath, {
    '../models/product': {
      findOne: () => Promise.resolve({ imageUrl: 'images/demo.jpg' }),
      deleteOne: (query) => {
        deleteCalls.push(query);
        return Promise.resolve({ deletedCount: 1 });
      }
    },
    '../util/file': {
      deleteFile: (filePath) => {
        fileCalls.push(filePath);
        return Promise.resolve();
      }
    },
    'express-validator': {
      validationResult: () => ({ isEmpty: () => true, array: () => [] })
    }
  });

  const req = {
    params: { productId: '507f191e810c19729de860ea' },
    user: { _id: 'user-1' }
  };

  let res;
  await new Promise((resolve, reject) => {
    res = createResponseDouble(resolve);
    adminController.deleteProduct(req, res, reject);
  });

  assert.deepEqual(fileCalls, ['images/demo.jpg']);
  assert.deepEqual(deleteCalls, [{ _id: '507f191e810c19729de860ea', userId: 'user-1' }]);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonPayload, { message: 'Success!' });
});

test('deleteProduct returns 404 when the product is not owned by the user', async () => {
  const adminController = loadWithMocks(controllerPath, {
    '../models/product': {
      findOne: () => Promise.resolve(null),
      deleteOne: () => Promise.resolve({ deletedCount: 0 })
    },
    '../util/file': {
      deleteFile: () => Promise.resolve()
    },
    'express-validator': {
      validationResult: () => ({ isEmpty: () => true, array: () => [] })
    }
  });

  const req = {
    params: { productId: '507f191e810c19729de860ea' },
    user: { _id: 'user-1' }
  };

  let res;
  await new Promise((resolve, reject) => {
    res = createResponseDouble(resolve);
    adminController.deleteProduct(req, res, reject);
  });

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.jsonPayload, { message: 'Product not found.' });
});
