const express = require('express');
const path = require('path');
const db = require('./db');
const auth = require('./lib/auth');
const ordersLib = require('./lib/orders');
const { getPricing } = require('./lib/pricing');
const routeHelpers = require('./lib/route-helpers');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

ordersLib.runOrderMigrations();
setInterval(() => auth.purgeExpiredSessions(), 60 * 60 * 1000);

app.use('/api', (req, res, next) => {
  if (['/auth/status', '/auth/setup', '/auth/login'].includes(req.path)) return next();
  auth.requireAuth(req, res, next);
});

const ctx = {
  auth,
  orders: ordersLib,
  pricing: { getPricing },
  helpers: routeHelpers
};

require('./routes/auth')(app, ctx);
require('./routes/catalog')(app, ctx);
require('./routes/orders')(app, ctx);
require('./routes/operations')(app, ctx);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log('Прокат запущен: http://' + HOST + ':' + PORT);
});