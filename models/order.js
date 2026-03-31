const mongodb = require('mongodb');

const getDb = require('../util/database').getDb;
const ObjectId = mongodb.ObjectId;

class Order {
  constructor(items, user) {
    this.items = items;
    this.user = user;
  }

  save() {
    const db = getDb();
    return db.collection('orders').insertOne(this);
  }

  static fetchAll(userId) {
    const db = getDb();
    return db
      .collection('orders')
      .find({ 'user._id': new ObjectId(userId) })
      .toArray();
  }
}

module.exports = Order;
