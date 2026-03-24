const db = require('../util/database');

module.exports = class Cart {
  static addProduct(productId) {
    return db
      .execute('SELECT id, quantity FROM cart_items WHERE cartId = 1 AND productId = ?', [productId])
      .then(([rows]) => {
        if (rows.length > 0) {
          const oldQuantity = rows[0].quantity;
          return db.execute(
            'UPDATE cart_items SET quantity = ? WHERE id = ?',
            [oldQuantity + 1, rows[0].id]
          );
        }

        return db.execute(
          'INSERT INTO cart_items (cartId, productId, quantity) VALUES (1, ?, 1)',
          [productId]
        );
      });
  }

  static getCart() {
    return db.execute(
      'SELECT p.id, p.title, p.imageUrl, p.price, ci.quantity FROM cart_items ci INNER JOIN products p ON ci.productId = p.id WHERE ci.cartId = 1'
    );
  }

  static deleteProduct(productId) {
    return db.execute('DELETE FROM cart_items WHERE cartId = 1 AND productId = ?', [productId]);
  }
};
