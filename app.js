require('dotenv').config();
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');

const errorController = require('./controllers/error');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const sequelize = require('./util/database');

const Product = require('./models/product');
const User = require('./models/user');
const Cart = require('./models/cart');
const CartItem = require('./models/cart-item');
const Order = require('./models/order');
const OrderItem = require('./models/order-item');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findByPk(1)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

Product.belongsTo(User, { constraints: true, onDelete: 'CASCADE' });
User.hasMany(Product);
User.hasOne(Cart);
Cart.belongsTo(User);
Cart.belongsToMany(Product, { through: CartItem });
Product.belongsToMany(Cart, { through: CartItem });
Order.belongsTo(User);
User.hasMany(Order);
Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

const port = Number(process.env.PORT) || 3000;

sequelize
  .sync()
  .then(() => User.findByPk(1))
  .then((user) => {
    if (user) {
      return user;
    }

    return User.create({ name: 'Max', email: 'test@test.com' });
  })
  .then((user) => {
    return user.getCart().then((cart) => {
      if (cart) {
        return user;
      }

      return user.createCart().then(() => user);
    });
  })
  .then(() => {
    app.listen(port);
  })
  .catch((err) => {
    console.log(err);
  });
