class OrderItem {
  constructor(product, quantity) {
    this.product = product;
    this.quantity = quantity || 1;
  }
}

module.exports = OrderItem;
