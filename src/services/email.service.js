'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(n);

const STATUS_META = {
  PENDING:     { uz: "Ko'rib chiqilmoqda", emoji: '⏳', color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  CONFIRMED:   { uz: 'Tasdiqlandi',        emoji: '✅', color: '#10b981', bg: '#d1fae5', text: '#065f46' },
  IN_PROGRESS: { uz: 'Jarayonda',          emoji: '🔄', color: '#3b82f6', bg: '#dbeafe', text: '#1e3a8a' },
  COMPLETED:   { uz: 'Bajarildi',          emoji: '🎉', color: '#8b5cf6', bg: '#ede9fe', text: '#4c1d95' },
  CANCELLED:   { uz: 'Bekor qilindi',      emoji: '❌', color: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
};

const STATUS_MSG = {
  CONFIRMED:   'Xayrli yangilik! Buyurtmangiz tasdiqlandi. Mutaxassislarimiz tadbir kuningizga tayyorgarlik ko\'rishni boshladi.',
  IN_PROGRESS: 'Buyurtmangiz bajarilish jarayonida. Barcha tayyorgarliklar olib borilmoqda.',
  COMPLETED:   'Buyurtmangiz muvaffaqiyatli yakunlandi! Siz bilan ishlash bizga katta zavq berdi.',
  CANCELLED:   'Afsuski, buyurtmangiz bekor qilindi. Savollaringiz bo\'lsa, biz bilan bog\'laning.',
};

function html(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f0f2;color:#1f2937}
.w{max-width:540px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.h{background:linear-gradient(135deg,#f43f5e 0%,#ec4899 100%);padding:36px 32px;text-align:center}
.hl{font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px}
.hs{color:rgba(255,255,255,.75);font-size:13px;margin-top:4px}
.b{padding:32px}
.ei{font-size:52px;display:block;text-align:center;margin-bottom:20px}
.g{font-size:21px;font-weight:600;color:#111827;margin-bottom:10px}
.p{font-size:15px;color:#4b5563;line-height:1.7;margin-bottom:20px}
.c{background:#fdf2f8;border:1px solid #fce7f3;border-radius:14px;padding:4px 0;margin:20px 0}
.r{display:flex;justify-content:space-between;align-items:center;padding:11px 18px;font-size:14px;border-bottom:1px solid #fce7f3}
.r:last-child{border-bottom:none}
.rl{color:#9ca3af}
.rv{font-weight:600;color:#111827}
.badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:600}
.btn{display:block;width:fit-content;margin:24px auto 0;background:linear-gradient(135deg,#f43f5e,#ec4899);color:#fff !important;text-decoration:none;padding:13px 30px;border-radius:12px;font-weight:600;font-size:15px}
.f{background:#f9fafb;padding:18px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}
</style></head><body><div class="w">${content}</div></body></html>`;
}

function head(sub) {
  return `<div class="h"><div class="hl">Marry<span style="opacity:.8">Me</span></div><div class="hs">${sub}</div></div>`;
}
function foot() {
  return `<div class="f">© 2025 MarryMe · Toshkent, O'zbekiston<br>Savollar uchun biz bilan bog'laning</div>`;
}
function btn(url, label) {
  return `<a class="btn" href="${url}">${label} →</a>`;
}

const APP_URL = () => process.env.FRONTEND_URL || 'https://marry-me-frontend.vercel.app';

async function send(to, subject, bodyHtml) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  try {
    await transporter.sendMail({
      from: `"MarryMe 💍" <${process.env.SMTP_USER}>`,
      to, subject,
      html: html(bodyHtml),
    });
  } catch (err) {
    console.error('[EMAIL]', err.message);
  }
}

// ─── WELCOME ──────────────────────────────────────────────
async function sendWelcome({ email, firstName }) {
  await send(email, "MarryMe'ga xush kelibsiz! 🎉", `
    ${head("O'zbekistonning eng yaxshi tadbir platformasi")}
    <div class="b">
      <span class="ei">🎊</span>
      <div class="g">Xush kelibsiz, ${firstName}!</div>
      <p class="p">MarryMe oilasiga qo'shilganingiz bilan tabriklaymiz! Sevimli kunlaringizni unutilmas qilish uchun biz bu yerdamiz.</p>
      <div class="c">
        <div class="r"><span class="rl">To'y marosimlari</span><span class="rv">💍 Premium sifat</span></div>
        <div class="r"><span class="rl">Love Story</span><span class="rv">💕 Romantik kadrlar</span></div>
        <div class="r"><span class="rl">Tug'ilgan kun</span><span class="rv">🎂 Kreativ dastur</span></div>
        <div class="r"><span class="rl">Surprise Proposal</span><span class="rv">💝 Unutilmas lahza</span></div>
      </div>
      ${btn(APP_URL() + '/services', 'Xizmatlarni ko\'rish')}
    </div>
    ${foot()}
  `);
}

// ─── ORDER CREATED ────────────────────────────────────────
async function sendOrderCreated({ email, firstName, order, serviceName, packageName }) {
  const date = new Date(order.eventDate).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const num = order.orderNumber.slice(-6).toUpperCase();
  await send(email, `Buyurtmangiz qabul qilindi! #${num} 📋`, `
    ${head('Buyurtma qabul qilindi')}
    <div class="b">
      <span class="ei">📋</span>
      <div class="g">Buyurtmangiz qabul qilindi!</div>
      <p class="p">Hurmatli ${firstName}, buyurtmangiz muvaffaqiyatli qabul qilindi. Tez orada mutaxassislarimiz siz bilan bog'lanadi.</p>
      <div class="c">
        <div class="r"><span class="rl">Buyurtma raqami</span><span class="rv">#${num}</span></div>
        <div class="r"><span class="rl">Xizmat</span><span class="rv">${serviceName}</span></div>
        ${packageName ? `<div class="r"><span class="rl">Paket</span><span class="rv">${packageName}</span></div>` : ''}
        <div class="r"><span class="rl">Tadbir sanasi</span><span class="rv">${date}</span></div>
        ${order.venue ? `<div class="r"><span class="rl">Manzil</span><span class="rv">${order.venue}</span></div>` : ''}
        <div class="r"><span class="rl">Umumiy narx</span><span class="rv">${fmt(order.totalPrice)} so'm</span></div>
        <div class="r"><span class="rl">Avans (30%)</span><span class="rv" style="color:#f43f5e">${fmt(order.advancePayment)} so'm</span></div>
        <div class="r"><span class="rl">Holat</span><span class="badge" style="background:#fef3c7;color:#92400e">⏳ Ko'rib chiqilmoqda</span></div>
      </div>
      ${btn(APP_URL() + '/dashboard', 'Buyurtmani ko\'rish')}
    </div>
    ${foot()}
  `);
}

// ─── ORDER STATUS CHANGED ─────────────────────────────────
async function sendOrderStatusChanged({ email, firstName, order, serviceName, newStatus }) {
  const st = STATUS_META[newStatus] || STATUS_META.PENDING;
  const msg = STATUS_MSG[newStatus] || "Buyurtmangiz holati o'zgardi.";
  const date = new Date(order.eventDate).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const num = order.orderNumber.slice(-6).toUpperCase();
  await send(email, `Buyurtma holati: ${st.emoji} ${st.uz} — #${num}`, `
    ${head('Buyurtma holati yangilandi')}
    <div class="b">
      <span class="ei">${st.emoji}</span>
      <div class="g">Holat: ${st.uz}</div>
      <p class="p">Hurmatli ${firstName}, ${msg}</p>
      <div class="c">
        <div class="r"><span class="rl">Buyurtma raqami</span><span class="rv">#${num}</span></div>
        <div class="r"><span class="rl">Xizmat</span><span class="rv">${serviceName}</span></div>
        <div class="r"><span class="rl">Tadbir sanasi</span><span class="rv">${date}</span></div>
        <div class="r"><span class="rl">Yangi holat</span><span class="badge" style="background:${st.bg};color:${st.text}">${st.emoji} ${st.uz}</span></div>
      </div>
      ${btn(APP_URL() + '/dashboard', 'Dashboard\'ga o\'tish')}
    </div>
    ${foot()}
  `);
}

module.exports = { sendWelcome, sendOrderCreated, sendOrderStatusChanged };
