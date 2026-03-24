'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma  = require('../config/prisma');
const emailSvc = require('../services/email.service');
const { createNotification } = require('./notification.controller');

const makeToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const raw     = (process.env.JWT_EXPIRES_IN || '7d').trim();
  const expires = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
  return jwt.sign({ userId }, secret, { expiresIn: expires });
};

const safeUser = (user) => ({
  id:           user.id,
  email:        user.email,
  phone:        user.phone        ?? null,
  role:         user.role,
  authProvider: user.authProvider,
  createdAt:    user.createdAt,
  profile: user.profile ? {
    firstName: user.profile.firstName,
    lastName:  user.profile.lastName,
    avatar:    user.profile.avatar ?? null,
    city:      user.profile.city   ?? null,
    lang:      user.profile.lang,
  } : null,
});

async function afterRegister(user) {
  const firstName = user.profile?.firstName ?? 'Foydalanuvchi';
  // Fire-and-forget — don't block response
  Promise.all([
    emailSvc.sendWelcome({ email: user.email, firstName }),
    createNotification({
      userId: user.id,
      type:   'WELCOME',
      title:  "MarryMe'ga xush kelibsiz! 🎉",
      body:   `Hurmatli ${firstName}, platformamizga xush kelibsiz! Xizmatlarimiz bilan tanishing.`,
    }),
  ]).catch(err => console.error('[AFTER_REGISTER]', err.message));
}

exports.registerValidation = [
  body('email')    .isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password') .isLength({ min: 6 }).withMessage('Min 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name required'),
  body('lastName') .notEmpty().trim().withMessage('Last name required'),
  body('phone')    .optional({ nullable: true, checkFalsy: true }).trim(),
];

exports.register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password, firstName, lastName, phone, lang = 'UZ' } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await prisma.user.create({
      data: {
        email, phone: phone || null, password: hashed, authProvider: 'LOCAL',
        profile: { create: { firstName, lastName, lang } },
      },
      include: { profile: true },
    });

    afterRegister(user);

    return res.status(201).json({
      success: true,
      data: { token: makeToken(user.id), user: safeUser(user) },
    });
  } catch (err) { next(err); }
};

exports.loginValidation = [
  body('email')   .isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user || !user.password)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    return res.json({ success: true, data: { token: makeToken(user.id), user: safeUser(user) } });
  } catch (err) { next(err); }
};

exports.googleToken = async (req, res, next) => {
  const { accessToken } = req.body;
  if (!accessToken)
    return res.status(400).json({ success: false, message: 'accessToken required' });

  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok)
      return res.status(401).json({ success: false, message: 'Invalid Google token' });

    const { sub: googleId, email, given_name, family_name, picture } = await resp.json();
    if (!email)
      return res.status(400).json({ success: false, message: 'No email from Google' });

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { profile: true },
    });

    let isNew = false;
    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId, authProvider: 'GOOGLE',
            ...(!user.profile?.avatar && picture ? { profile: { update: { avatar: picture } } } : {}),
          },
          include: { profile: true },
        });
      }
    } else {
      isNew = true;
      user = await prisma.user.create({
        data: {
          email, googleId, authProvider: 'GOOGLE',
          profile: { create: { firstName: given_name || 'User', lastName: family_name || '', avatar: picture || null, lang: 'UZ' } },
        },
        include: { profile: true },
      });
    }

    if (isNew) afterRegister(user);

    return res.json({ success: true, data: { token: makeToken(user.id), user: safeUser(user) } });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { profile: true } });
    return res.json({ success: true, data: safeUser(user) });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, city, lang } = req.body;
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { ...(phone !== undefined && { phone: phone || null }) } }),
      prisma.profile.update({
        where: { userId: req.user.id },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName  ? { lastName  } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          ...(lang      ? { lang      } : {}),
        },
      }),
    ]);
    return res.json({ success: true, data: safeUser({ ...updatedUser, profile: updatedProfile }) });
  } catch (err) { next(err); }
};
