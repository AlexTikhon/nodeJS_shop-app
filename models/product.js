const mongodb = require('mongodb');

const getDb = require('../util/database').getDb;
const ObjectId = mongodb.ObjectId;

class Product {
  constructor(title, price, description, imageUrl, id, userId) {
    this.title = title;
    this.price = price;
    this.description = description;
    this.imageUrl = imageUrl;
    this.userId = userId ? new ObjectId(userId) : null;
    this._id = id ? new ObjectId(id) : null;
  }

  save() {
    const db = getDb();

    if (this._id) {
      return db.collection('products').updateOne(
        { _id: this._id },
        {
          $set: {
            title: this.title,
            price: this.price,
            description: this.description,
            imageUrl: this.imageUrl
          }
        }
      );
    }

    return db.collection('products').insertOne(this);
  }

  static fetchAll() {
    const db = getDb();
    return db.collection('products').find().toArray();
  }

  static findById(prodId) {
    const db = getDb();
    return db.collection('products').findOne({ _id: new ObjectId(prodId) });
  }

  static deleteById(prodId) {
    const db = getDb();
    return db.collection('products').deleteOne({ _id: new ObjectId(prodId) });
  }
}

module.exports = Product;
