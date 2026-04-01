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

If `MONGODB_URI` is omitted, the app uses `mongodb://127.0.0.1:27017/shop`.

## 4. Start app

```bash
npm run dev
```

or

```bash
npm start
```

App URL: <http://localhost:3000>
