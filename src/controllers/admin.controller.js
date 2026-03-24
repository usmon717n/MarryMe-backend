'use strict';

const prisma   = require('../config/prisma');
const emailSvc = require('../services/email.service');
const { createNotification } = require('./notification.controller');

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n);

const STATUS_META = {
  PENDING:     { uz: "Ko'rib chiqilmoqda", emoji: '⏳' },
  CONFIRMED:   { uz: 'Tasdiqlandi',        emoji: '✅' },
  IN_PROGRESS: { uz: 'Jarayonda',          emoji: '🔄' },
  COMPLETED:   { uz: 'Bajarildi',          emoji: '🎉' },
  CANCELLED:   { uz: 'Bekor qilindi',      emoji: '❌' },
};

// ─── DASHBOARD ────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalOrders, pendingOrders, totalUsers, totalRevenue, contacts] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.order.aggregate({ _sum: { totalPrice: true }, where: { status: { in: ['CONFIRMED', 'COMPLETED', 'IN_PROGRESS'] } } }),
      prisma.contactRequest.count({ where: { status: 'NEW' } }),
    ]);
    return res.json({ success: true, data: { totalOrders, pendingOrders, totalUsers, totalRevenue: totalRevenue._sum.totalPrice ?? 0, newContacts: contacts } });
  } catch (err) { next(err); }
};

// ─── ORDERS ───────────────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where:   status ? { status } : {},
        include: { user: { include: { profile: true } }, service: { include: { translations: true } }, package: { include: { translations: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
      }),
      prisma.order.count({ where: status ? { status } : {} }),
    ]);

    return res.json({
      success: true,
      data: orders.map(o => ({
        id: o.id, orderNumber: o.orderNumber, status: o.status,
        eventDate: o.eventDate, eventType: o.eventType,
        totalPrice: o.totalPrice, advancePayment: o.advancePayment, createdAt: o.createdAt,
        venue: o.venue, notes: o.notes, guestCount: o.guestCount,
        service: o.service?.translations?.find(t => t.lang === 'UZ')?.name ?? '',
        package: o.package?.translations?.find(t => t.lang === 'UZ')?.name ?? null,
        user: { id: o.user.id, email: o.user.email, phone: o.user.phone, name: `${o.user.profile?.firstName ?? ''} ${o.user.profile?.lastName ?? ''}`.trim() },
      })),
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!Object.keys(STATUS_META).includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const order = await prisma.order.update({
      where:   { id: req.params.id },
      data:    { status },
      include: {
        user:    { include: { profile: true } },
        service: { include: { translations: true } },
      },
    });

    const firstName = order.user.profile?.firstName ?? 'Foydalanuvchi';
    const svcName   = order.service?.translations?.find(t => t.lang === 'UZ')?.name ?? 'Xizmat';
    const st        = STATUS_META[status];
    const num       = order.orderNumber.slice(-6).toUpperCase();

    Promise.all([
      emailSvc.sendOrderStatusChanged({ email: order.user.email, firstName, order, serviceName: svcName, newStatus: status }),
      createNotification({
        userId:  order.userId,
        type:    'ORDER_STATUS',
        title:   `Buyurtma holati: ${st.emoji} ${st.uz} #${num}`,
        body:    `${svcName} uchun buyurtmangiz holati "${st.uz}" ga o'zgardi.`,
        orderId: order.id,
      }),
    ]).catch(err => console.error('[STATUS_NOTIFY]', err.message));

    return res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// ─── CONTACTS ─────────────────────────────────────────────
exports.getContacts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const contacts = await prisma.contactRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: contacts });
  } catch (err) { next(err); }
};

exports.updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['NEW', 'IN_REVIEW', 'RESOLVED'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    const contact = await prisma.contactRequest.update({ where: { id: req.params.id }, data: { status } });
    return res.json({ success: true, data: contact });
  } catch (err) { next(err); }
};

// ─── SERVICES CRUD ────────────────────────────────────────
exports.getAdminServices = async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        translations: true,
        packages: { include: { translations: true, subServices: { include: { translations: true } } }, orderBy: { price: 'asc' } },
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: services });
  } catch (err) { next(err); }
};

exports.updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { basePrice, isActive, regions, images, translations, coverImage, customCategory } = req.body;

    await prisma.service.update({
      where: { id },
      data: {
        ...(basePrice  !== undefined && { basePrice:  parseInt(basePrice) }),
        ...(isActive   !== undefined && { isActive }),
        ...(regions    !== undefined && { regions }),
        ...(images     !== undefined && { images }),
      },
    });

    if (translations) {
      for (const [lang, t] of Object.entries(translations)) {
        await prisma.serviceTranslation.upsert({
          where: { serviceId_lang: { serviceId: id, lang } },
          update: { name: t.name, description: t.description, features: t.features ?? [] },
          create: { serviceId: id, lang, name: t.name, description: t.description ?? '', features: t.features ?? [] },
        });
      }
    }

    const updated = await prisma.service.findUnique({ where: { id }, include: { translations: true, packages: { include: { translations: true } } } });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.createPackage = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { slug, price, isPopular, emoji, regions, translations } = req.body;

    if (!slug || !price || !translations)
      return res.status(400).json({ success: false, message: 'slug, price, translations required' });

    const pkg = await prisma.package.create({
      data: {
        serviceId, slug, price: parseInt(price),
        isPopular: isPopular ?? false,
        emoji:     emoji     ?? '🎁',
        regions:   regions   ?? [],
        translations: {
          create: Object.entries(translations).map(([lang, t]) => ({ lang, name: t.name, includes: t.includes ?? [] })),
        },
      },
      include: { translations: true },
    });
    return res.status(201).json({ success: true, data: pkg });
  } catch (err) { next(err); }
};

exports.updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, isPopular, emoji, regions, translations } = req.body;

    await prisma.package.update({
      where: { id },
      data: {
        ...(price     !== undefined && { price: parseInt(price) }),
        ...(isPopular !== undefined && { isPopular }),
        ...(emoji     !== undefined && { emoji }),
        ...(regions   !== undefined && { regions }),
      },
    });

    if (translations) {
      for (const [lang, t] of Object.entries(translations)) {
        await prisma.packageTranslation.upsert({
          where: { packageId_lang: { packageId: id, lang } },
          update: { name: t.name, includes: t.includes ?? [] },
          create: { packageId: id, lang, name: t.name, includes: t.includes ?? [] },
        });
      }
    }

    const updated = await prisma.package.findUnique({ where: { id }, include: { translations: true } });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

exports.deletePackage = async (req, res, next) => {
  try {
    await prisma.package.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ─── CREATE SERVICE ───────────────────────────────────────
exports.createService = async (req, res, next) => {
  try {
    const { slug, category, basePrice, regions, images, translations, coverImage, customCategoryName } = req.body;
    if (!slug || !category || !basePrice || !translations)
      return res.status(400).json({ success: false, message: 'slug, category, basePrice, translations majburiy' });

    const existing = await prisma.service.findUnique({ where: { slug } });
    if (existing)
      return res.status(409).json({ success: false, message: "Bu slug allaqachon mavjud" });

    const service = await prisma.service.create({
      data: {
        slug,
        category: category === 'CUSTOM' ? 'CUSTOM' : category,
        customCategory: category === 'CUSTOM' ? (customCategoryName || slug) : null,
        basePrice: parseInt(basePrice),
        coverImage: coverImage || '',
        regions: regions ?? [],
        images:  images  ?? [],
        translations: {
          create: Object.entries(translations).map(([lang, t]) => ({
            lang, name: t.name, description: t.description ?? '', features: t.features ?? [],
          })),
        },
      },
      include: { translations: true, packages: true },
    });
    return res.status(201).json({ success: true, data: service });
  } catch (err) { next(err); }
};

// ─── REPLY TO CONTACT ─────────────────────────────────────
exports.replyContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message?.trim())
      return res.status(400).json({ success: false, message: 'Xabar matni majburiy' });

    const contact = await prisma.contactRequest.findUnique({ where: { id } });
    if (!contact)
      return res.status(404).json({ success: false, message: 'Murojaat topilmadi' });

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: contact.email
        ? { email: contact.email }
        : { phone: contact.phone },
    });

    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type:   'SYSTEM',
          title:  'Murojaatingizga javob keldi 💬',
          body:   message.trim(),
        },
      });
    }

    // Mark as in-review if still new
    if (contact.status === 'NEW') {
      await prisma.contactRequest.update({ where: { id }, data: { status: 'IN_REVIEW' } });
    }

    return res.json({ success: true, notified: Boolean(user) });
  } catch (err) { next(err); }
};
