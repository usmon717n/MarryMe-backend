'use strict';

const { body, validationResult } = require('express-validator');
const prisma   = require('../config/prisma');
const emailSvc = require('../services/email.service');
const { createNotification } = require('./notification.controller');

const STATUS_META = {
  PENDING:     { uz: "Ko'rib chiqilmoqda", emoji: '⏳' },
  CONFIRMED:   { uz: 'Tasdiqlandi',        emoji: '✅' },
  IN_PROGRESS: { uz: 'Jarayonda',          emoji: '🔄' },
  COMPLETED:   { uz: 'Bajarildi',          emoji: '🎉' },
  CANCELLED:   { uz: 'Bekor qilindi',      emoji: '❌' },
};

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n);

function formatOrder(o) {
  const svcTr = o.service?.translations?.find(t => t.lang === 'UZ') ?? o.service?.translations?.[0];
  const pkgTr = o.package?.translations?.find(t => t.lang === 'UZ') ?? o.package?.translations?.[0];
  return {
    id:             o.id,
    orderNumber:    o.orderNumber,
    status:         o.status,
    eventDate:      o.eventDate,
    eventType:      o.eventType,
    guestCount:     o.guestCount,
    venue:          o.venue,
    notes:          o.notes,
    totalPrice:     o.totalPrice,
    advancePayment: o.advancePayment,
    createdAt:      o.createdAt,
    service:        svcTr?.name ?? '',
    package:        pkgTr?.name ?? null,
  };
}

const ORDER_INCLUDE = {
  service: { include: { translations: true } },
  package: { include: { translations: true } },
};

exports.createOrderValidation = [
  body('serviceId') .notEmpty().withMessage('Service required'),
  body('eventDate') .isISO8601().withMessage('Valid date required'),
  body('eventType') .notEmpty().trim().withMessage('Event type required'),
  body('totalPrice').isInt({ min: 0 }).withMessage('Valid price required'),
];

exports.createOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { serviceId, packageId, eventDate, eventType, guestCount, venue, notes, totalPrice } = req.body;

    const service = await prisma.service.findUnique({
      where:   { id: serviceId },
      include: { translations: true },
    });
    if (!service)
      return res.status(404).json({ success: false, message: 'Service not found' });

    const total   = parseInt(totalPrice);
    const advance = Math.round(total * 0.3);

    const order = await prisma.order.create({
      data: {
        userId: req.user.id, serviceId,
        packageId:      packageId || null,
        eventDate:      new Date(eventDate),
        eventType, guestCount: guestCount ? parseInt(guestCount) : null,
        venue:          venue || null, notes: notes || null,
        totalPrice:     total, advancePayment: advance,
      },
      include: { ...ORDER_INCLUDE, package: { include: { translations: true } } },
    });

    const user      = req.user;
    const firstName = user.profile?.firstName ?? 'Foydalanuvchi';
    const svcName   = service.translations.find(t => t.lang === 'UZ')?.name ?? service.translations[0]?.name ?? 'Xizmat';
    const pkgName   = order.package?.translations?.find(t => t.lang === 'UZ')?.name ?? null;
    const num       = order.orderNumber.slice(-6).toUpperCase();

    Promise.all([
      emailSvc.sendOrderCreated({ email: user.email, firstName, order, serviceName: svcName, packageName: pkgName }),
      createNotification({
        userId:  user.id,
        type:    'ORDER_CREATED',
        title:   `Buyurtma qabul qilindi #${num}`,
        body:    `${svcName}${pkgName ? ` — ${pkgName}` : ''} uchun buyurtmangiz qabul qilindi. Avans: ${fmt(advance)} so'm`,
        orderId: order.id,
      }),
    ]).catch(err => console.error('[ORDER_NOTIFY]', err.message));

    return res.status(201).json({ success: true, data: formatOrder(order) });
  } catch (err) { next(err); }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where:   { userId: req.user.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: orders.map(formatOrder) });
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where:   { id: req.params.id, userId: req.user.id },
      include: ORDER_INCLUDE,
    });
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: formatOrder(order) });
  } catch (err) { next(err); }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['PENDING', 'CONFIRMED'].includes(order.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

    const updated = await prisma.order.update({
      where:   { id: order.id },
      data:    { status: 'CANCELLED' },
      include: { ...ORDER_INCLUDE, service: { include: { translations: true } } },
    });

    const user      = req.user;
    const firstName = user.profile?.firstName ?? 'Foydalanuvchi';
    const svcName   = updated.service?.translations?.find(t => t.lang === 'UZ')?.name ?? 'Xizmat';
    const num       = updated.orderNumber.slice(-6).toUpperCase();

    Promise.all([
      emailSvc.sendOrderStatusChanged({ email: user.email, firstName, order: updated, serviceName: svcName, newStatus: 'CANCELLED' }),
      createNotification({
        userId:  user.id,
        type:    'ORDER_STATUS',
        title:   `Buyurtma bekor qilindi #${num}`,
        body:    `${svcName} uchun buyurtmangiz bekor qilindi.`,
        orderId: order.id,
      }),
    ]).catch(err => console.error('[CANCEL_NOTIFY]', err.message));

    return res.json({ success: true, data: formatOrder(updated) });
  } catch (err) { next(err); }
};
