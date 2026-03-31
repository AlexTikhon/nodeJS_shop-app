class CartItem {
  constructor(productId, quantity) {
    this.productId = productId;
    this.quantity = quantity || 1;
  }
}

module.exports = CartItem;
