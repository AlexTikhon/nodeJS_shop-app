# MVC Product Shop

## 1. Install dependencies

```bash
npm install
```

## 2. Configure MongoDB

Run MongoDB locally or provide a remote connection string.

## 3. Configure environment variables

Set values in `.env`:

- `MONGODB_URI`
- `PORT`
- `SESSION_SECRET`
- `APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `MAIL_FROM`

If `MONGODB_URI` is omitted, the app uses `mongodb://127.0.0.1:27017/shop`.

## 4. Create a user

The app no longer seeds a default account on startup.
Create a user through the signup page before testing authenticated flows.

## 5. Start app

```bash
npm run dev
```

or

```bash
npm start
```

App URL: <http://localhost:3000>
