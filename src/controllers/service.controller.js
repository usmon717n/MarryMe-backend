'use strict';

const prisma = require('../config/prisma');

// Format package — filter translations by lang in JS, not in Prisma query
const fmtPackage = (p, lang) => {
  const tr = p.translations?.find(t => t.lang === lang)
    || p.translations?.find(t => t.lang === 'UZ')
    || p.translations?.[0];

  const subServices = (p.subServices || []).map(ss => {
    const str = ss.translations?.find(t => t.lang === lang)
      || ss.translations?.find(t => t.lang === 'UZ')
      || ss.translations?.[0];
    return {
      id:        ss.id,
      slug:      ss.slug,
      emoji:     ss.emoji,
      images:    ss.images,
      name:      str?.name      ?? ss.slug,
      shortDesc: str?.shortDesc ?? '',
      fullDesc:  str?.fullDesc  ?? '',
    };
  }).sort((a, b) => (p.subServices.find(s=>s.id===a.id)?.sortOrder||0) - (p.subServices.find(s=>s.id===b.id)?.sortOrder||0));

  return {
    id:          p.id,
    slug:        p.slug,
    price:       p.price,
    isPopular:   p.isPopular,
    emoji:       p.emoji     ?? '🎁',
    regions:     p.regions   ?? [],
    name:        tr?.name     ?? p.slug,
    includes:    tr?.includes ?? [],
    subServices,
  };
};

exports.getServices = async (req, res, next) => {
  try {
    const lang     = (req.query.lang || 'UZ').toUpperCase();
    const category = req.query.category;

    const services = await prisma.service.findMany({
      where: { isActive: true, ...(category && { category }) },
      include: {
        translations: true,
        packages: {
          include: { translations: true },
          orderBy: { price: 'asc' },
        },
        reviews: { where: { isVisible: true }, select: { rating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = services.map(s => {
      const tr = s.translations.find(t => t.lang === lang)
        || s.translations.find(t => t.lang === 'UZ')
        || s.translations[0];
      return {
        id:             s.id,
        slug:           s.slug,
        category:       s.category,
        customCategory: s.customCategory ?? null,
        basePrice:      s.basePrice,
        coverImage:     s.coverImage ?? '',
        images:         s.images,
        regions:        s.regions ?? [],
        name:        tr?.name        ?? s.slug,
        description: tr?.description ?? '',
        features:    tr?.features    ?? [],
        rating:      s.reviews.length > 0
          ? Math.round((s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length) * 10) / 10
          : 0,
        reviewCount: s.reviews.length,
        packages: s.packages.map(p => {
          const ptr = p.translations.find(t => t.lang === lang)
            || p.translations.find(t => t.lang === 'UZ')
            || p.translations[0];
          return {
            id: p.id, slug: p.slug, price: p.price,
            isPopular: p.isPopular,
            name:     ptr?.name    ?? p.slug,
            includes: ptr?.includes ?? [],
          };
        }),
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getService = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const lang     = (req.query.lang || 'UZ').toUpperCase();

    const service = await prisma.service.findUnique({
      where: { slug },
      include: {
        translations: true,
        packages: {
          include: {
            translations: true,
            subServices: {
              include: { translations: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { price: 'asc' },
        },
        reviews: {
          where: { isVisible: true },
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!service)
      return res.status(404).json({ success: false, message: 'Service not found' });

    const tr = service.translations.find(t => t.lang === lang)
      || service.translations.find(t => t.lang === 'UZ')
      || service.translations[0];

    return res.json({
      success: true,
      data: {
        id:             service.id,
        slug:           service.slug,
        category:       service.category,
        customCategory: service.customCategory ?? null,
        basePrice:      service.basePrice,
        coverImage:     service.coverImage ?? '',
        images:         service.images,
        regions:        service.regions ?? [],
        name:        tr?.name        ?? service.slug,
        description: tr?.description ?? '',
        features:    tr?.features    ?? [],
        packages:    service.packages.map(p => fmtPackage(p, lang)),
        reviews:     service.reviews.map(r => ({
          id:        r.id,
          rating:    r.rating,
          comment:   r.comment,
          createdAt: r.createdAt,
          user: {
            name:   `${r.user.profile?.firstName ?? ''} ${r.user.profile?.lastName ?? ''}`.trim(),
            avatar: r.user.profile?.avatar ?? null,
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
