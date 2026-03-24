CREATE DATABASE IF NOT EXISTS node_complete;
USE node_complete;

CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  price DOUBLE NOT NULL,
  imageUrl VARCHAR(1000) NOT NULL,
  description TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT NOT NULL AUTO_INCREMENT,
  cartId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY cart_product_unique (cartId, productId),
  CONSTRAINT fk_cart_items_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);
