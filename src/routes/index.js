'use strict';

const { Router }                  = require('express');
const { body, validationResult }  = require('express-validator');
const prisma                      = require('../config/prisma');
const authCtrl                    = require('../controllers/auth.controller');
const serviceCtrl                 = require('../controllers/service.controller');
const orderCtrl                   = require('../controllers/order.controller');
const adminCtrl                   = require('../controllers/admin.controller');
const notifCtrl                   = require('../controllers/notification.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// ─── AUTH ─────────────────────────────────────────────────
const authRouter = Router();
authRouter.post('/register',     authCtrl.registerValidation, authCtrl.register);
authRouter.post('/login',        authCtrl.loginValidation,    authCtrl.login);
authRouter.post('/google-token', authCtrl.googleToken);
authRouter.get ('/me',           authenticate, authCtrl.getMe);
authRouter.put ('/profile',      authenticate, authCtrl.updateProfile);
module.exports.authRouter = authRouter;

// ─── SERVICES ─────────────────────────────────────────────
const serviceRouter = Router();
serviceRouter.get('/',      serviceCtrl.getServices);
serviceRouter.get('/:slug', serviceCtrl.getService);
module.exports.serviceRouter = serviceRouter;

// ─── ORDERS ───────────────────────────────────────────────
const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.post('/',           orderCtrl.createOrderValidation, orderCtrl.createOrder);
orderRouter.get ('/',           orderCtrl.getMyOrders);
orderRouter.get ('/:id',        orderCtrl.getOrder);
orderRouter.put ('/:id/cancel', orderCtrl.cancelOrder);
module.exports.orderRouter = orderRouter;

// ─── NOTIFICATIONS ────────────────────────────────────────
const notifRouter = Router();
notifRouter.use(authenticate);
notifRouter.get ('/',               notifCtrl.getNotifications);
notifRouter.put ('/read-all',       notifCtrl.markAllRead);
notifRouter.put ('/:id/read',       notifCtrl.markRead);
module.exports.notifRouter = notifRouter;

// ─── ADMIN ────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get ('/dashboard',               adminCtrl.getDashboard);
adminRouter.get ('/orders',                  adminCtrl.getAllOrders);
adminRouter.put ('/orders/:id/status',       adminCtrl.updateOrderStatus);
adminRouter.get ('/contacts',                adminCtrl.getContacts);
adminRouter.put ('/contacts/:id/status',     adminCtrl.updateContactStatus);
// Services CRUD
adminRouter.get ('/services',                adminCtrl.getAdminServices);
adminRouter.put ('/services/:id',            adminCtrl.updateService);
adminRouter.post('/services/:serviceId/packages',     adminCtrl.createPackage);
adminRouter.put ('/packages/:id',            adminCtrl.updatePackage);
adminRouter.delete('/packages/:id',          adminCtrl.deletePackage);
adminRouter.post ('/services',                 adminCtrl.createService);
adminRouter.post ('/contacts/:id/reply',       adminCtrl.replyContact);
module.exports.adminRouter = adminRouter;

// ─── CONTACT ──────────────────────────────────────────────
const contactRouter = Router();
contactRouter.post('/', [
  body('name')   .notEmpty().trim(),
  body('phone')  .notEmpty().trim(),
  body('message').notEmpty().trim(),
  body('email')  .optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, phone, email, message } = req.body;
    const contact = await prisma.contactRequest.create({ data: { name, phone, email: email || null, message } });
    return res.status(201).json({ success: true, data: contact });
  } catch (err) { next(err); }
});
module.exports.contactRouter = contactRouter;

// ─── PORTFOLIO ────────────────────────────────────────────
const portfolioRouter = Router();
portfolioRouter.get('/', async (req, res, next) => {
  try {
    const { lang = 'UZ', category } = req.query;
    const items = await prisma.portfolio.findMany({
      where:   { isPublished: true, ...(category && { category }) },
      include: { translations: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      success: true,
      data: items.map(p => {
        const tr = p.translations.find(t => t.lang === lang) ?? p.translations[0];
        return { id: p.id, category: p.category, coverImage: p.coverImage, images: p.images, videoUrl: p.videoUrl, eventDate: p.eventDate, title: tr?.title ?? '', description: tr?.description ?? '', location: tr?.location ?? '' };
      }),
    });
  } catch (err) { next(err); }
});
module.exports.portfolioRouter = portfolioRouter;

// ─── REVIEWS ──────────────────────────────────────────────
const reviewRouter = Router();
reviewRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { serviceId, rating, comment } = req.body;
    if (!serviceId || !rating || !comment)
      return res.status(400).json({ success: false, message: 'serviceId, rating, comment required' });
    const review = await prisma.review.create({ data: { userId: req.user.id, serviceId, rating: parseInt(rating, 10), comment } });
    return res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
});
module.exports.reviewRouter = reviewRouter;
