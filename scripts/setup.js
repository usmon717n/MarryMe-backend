'use strict';

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const ALL_REGIONS = ['Toshkent sh.', 'Toshkent v.', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon', "Farg'ona"];
const MAIN_REGIONS = ['Toshkent sh.', 'Toshkent v.', 'Samarqand'];

const SERVICES = [
  {
    slug: 'wedding', category: 'WEDDING', basePrice: 15000000,
    images: [], regions: ALL_REGIONS,
    translations: {
      UZ: { name: "To'y Marosimi", description: "Eng yaxshi to'y tashkilotchisi. Samarqand uslubidan zamonaviy chic gacha.", features: ['Dekoratsiya', 'Fotograf', 'Videograf', 'Koordinator'] },
      RU: { name: 'Свадебная церемония', description: 'Лучший организатор свадеб. От самаркандского стиля до современного шика.', features: ['Декор', 'Фотограф', 'Видеограф', 'Координатор'] },
      EN: { name: 'Wedding Ceremony', description: 'Best wedding organizer. From Samarkand style to modern chic.', features: ['Decoration', 'Photographer', 'Videographer', 'Coordinator'] },
    },
    packages: [
      {
        slug: 'silver', price: 15000000, isPopular: false, emoji: '💍', regions: MAIN_REGIONS,
        translations: {
          UZ: { name: 'Silver', includes: ['Dekoratsiya', 'Fotograf (4 soat)', 'Koordinator'] },
          RU: { name: 'Серебро', includes: ['Декор', 'Фотограф (4 часа)', 'Координатор'] },
          EN: { name: 'Silver', includes: ['Decoration', 'Photographer (4h)', 'Coordinator'] },
        },
        subServices: [
          { slug: 'decoration', emoji: '🌸', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Dekoratsiya', shortDesc: 'Temalı bezash', fullDesc: "To'y zaliga mos rang va uslubda professional dekoratsiya. Gul kompozitsiyalari, parda va chiroqlar, stol bezaklari. 3 soat oldin o'rnatiladi." },
            RU: { name: 'Декорация', shortDesc: 'Тематическое оформление', fullDesc: 'Профессиональная декорация под цвет свадьбы. Цветочные композиции, шторы, освещение, украшения столов.' },
            EN: { name: 'Decoration', shortDesc: 'Themed decoration', fullDesc: 'Professional decoration matching wedding style. Floral compositions, drapes, lighting, table decorations.' },
          }},
          { slug: 'photographer', emoji: '📸', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Fotograf', shortDesc: '4 soat suratga olish', fullDesc: "Professional fotograf 4 soat davomida barcha muhim lahzalarni suratga oladi. 100+ tahrirlangan rasm 5 ish kuni ichida." },
            RU: { name: 'Фотограф', shortDesc: 'Съёмка 4 часа', fullDesc: 'Профессиональный фотограф 4 часа. 100+ обработанных фото за 5 рабочих дней.' },
            EN: { name: 'Photographer', shortDesc: '4 hour shoot', fullDesc: 'Professional photographer for 4 hours. 100+ edited photos in 5 days.' },
          }},
          { slug: 'coordinator', emoji: '📋', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Koordinator', shortDesc: 'Butun tadbir davomida', fullDesc: "Tajribali koordinator barcha jarayonlarni nazorat qiladi: mehmonlar kutib olish, dastur tartibiga rioya, pudratchilar bilan muloqot." },
            RU: { name: 'Координатор', shortDesc: 'Весь день', fullDesc: 'Координатор контролирует все процессы: встреча гостей, программа, подрядчики.' },
            EN: { name: 'Coordinator', shortDesc: 'Throughout the event', fullDesc: 'Coordinator manages all: guest reception, program, contractors.' },
          }},
        ],
      },
      {
        slug: 'gold', price: 28000000, isPopular: true, emoji: '👑', regions: ALL_REGIONS,
        translations: {
          UZ: { name: 'Gold', includes: ['Premium dekoratsiya', 'Fotograf (8 soat)', 'Videograf', 'Koordinator'] },
          RU: { name: 'Золото', includes: ['Премиум декор', 'Фотограф (8 часов)', 'Видеограф', 'Координатор'] },
          EN: { name: 'Gold', includes: ['Premium decoration', 'Photographer (8h)', 'Videographer', 'Coordinator'] },
        },
        subServices: [
          { slug: 'premium-decoration', emoji: '🌹', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Premium dekoratsiya', shortDesc: 'Eksklyuziv dizayn', fullDesc: "Dizayner tomonidan eksklyuziv dekoratsiya. LED perda, neon yozuvlar, jonli gul devori, havo sharlari kompozitsiyasi." },
            RU: { name: 'Премиум декор', shortDesc: 'Эксклюзивный дизайн', fullDesc: 'Эксклюзивная декорация от дизайнера. LED-занавес, неон, живая цветочная стена.' },
            EN: { name: 'Premium decoration', shortDesc: 'Exclusive design', fullDesc: 'Designer decoration. LED curtain, neon signs, live flower wall, balloon arch.' },
          }},
          { slug: 'photographer-8h', emoji: '📸', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Fotograf (8 soat)', shortDesc: 'Nikoh + ziyofat', fullDesc: "2 ta fotograf 8 soat. 200+ tahrirlangan rasm, 7 kunda yetkazish." },
            RU: { name: 'Фотограф (8 часов)', shortDesc: 'Никах + банкет', fullDesc: '2 фотографа 8 часов. 200+ фото, 7 дней.' },
            EN: { name: 'Photographer (8h)', shortDesc: 'Nikah + banquet', fullDesc: '2 photographers 8 hours. 200+ photos, 7 days.' },
          }},
          { slug: 'videographer', emoji: '🎬', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Videograf', shortDesc: "Highlight + to'liq video", fullDesc: "4K sifatda butun tadbir. 10 daqiqalik highlight + 2 soatlik to'liq yozuv. 14 kunda USB." },
            RU: { name: 'Видеограф', shortDesc: 'Хайлайт + полное видео', fullDesc: '4K съёмка. 10-мин хайлайт + 2-часовая запись. USB за 14 дней.' },
            EN: { name: 'Videographer', shortDesc: 'Highlight + full', fullDesc: '4K. 10-min highlight + 2-hour full recording. USB in 14 days.' },
          }},
          { slug: 'coordinator-gold', emoji: '📋', images: [], sortOrder: 3, translations: {
            UZ: { name: 'Bosh koordinator', shortDesc: 'Tadbir boshidan oxirigacha', fullDesc: "Bosh koordinator + 2 ta yordamchi. Rejalashtirish uchrashuvlari, pudratchilar bilan shartnoma, kunlik nazorat." },
            RU: { name: 'Главный координатор', shortDesc: 'От начала до конца', fullDesc: 'Главный + 2 помощника. Встречи, договора, ежедневный контроль.' },
            EN: { name: 'Lead coordinator', shortDesc: 'Start to finish', fullDesc: 'Lead + 2 assistants. Planning, contracts, daily oversight.' },
          }},
        ],
      },
    ],
  },
  {
    slug: 'birthday', category: 'BIRTHDAY', basePrice: 3000000,
    images: [], regions: ALL_REGIONS,
    translations: {
      UZ: { name: "Tug'ilgan Kun", description: "Bolalar va kattalar uchun kreativ tug'ilgan kun. Temalı bezash, professional animatorlar va suratga olish.", features: ['Tema tanlash', 'Dekoratsiya', 'Animator', 'Fotograf'] },
      RU: { name: 'День Рождения', description: 'Креативный день рождения для детей и взрослых.', features: ['Выбор темы', 'Декорация', 'Аниматор', 'Фотограф'] },
      EN: { name: 'Birthday Party', description: 'Creative birthday for kids and adults. Themed decoration and animators.', features: ['Theme', 'Decoration', 'Animator', 'Photographer'] },
    },
    packages: [
      {
        slug: 'fun', price: 3000000, isPopular: false, emoji: '🎈', regions: MAIN_REGIONS,
        translations: {
          UZ: { name: 'Fun', includes: ['Dekoratsiya', 'Animator (2 soat)', 'Fotograf'] },
          RU: { name: 'Фан', includes: ['Декор', 'Аниматор (2 часа)', 'Фотограф'] },
          EN: { name: 'Fun', includes: ['Decoration', 'Animator (2h)', 'Photographer'] },
        },
        subServices: [
          { slug: 'decoration-birthday', emoji: '🎀', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Dekoratsiya', shortDesc: 'Temalı bezash', fullDesc: "Farzandingiz sevgan ranglar va qahramonlar asosida. Sharlar, bannerlar, tort stoli, kirish arcade. 2 soat oldin o'rnatiladi." },
            RU: { name: 'Декорация', shortDesc: 'Тематическое', fullDesc: 'По любимым героям ребёнка. Шары, баннеры, стол торта, входная арка.' },
            EN: { name: 'Decoration', shortDesc: 'Themed setup', fullDesc: "Based on child's favorites. Balloons, banners, cake table, entrance arch." },
          }},
          { slug: 'animator-2h', emoji: '🤹', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Animator', shortDesc: '2 soat dastur', fullDesc: "Professional animator 2 soat davomida o'yinlar, raqslar va konkurslar. Sovg'alar va ballar tizimi bor." },
            RU: { name: 'Аниматор', shortDesc: '2 часа', fullDesc: 'Аниматор 2 часа — игры, танцы, конкурсы. Призы и система баллов.' },
            EN: { name: 'Animator', shortDesc: '2 hour program', fullDesc: 'Animator runs games, dances, contests for 2 hours. Prizes included.' },
          }},
          { slug: 'photographer-birthday', emoji: '📸', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Fotograf', shortDesc: '3 soat', fullDesc: "Tort kesish, o'yinlar, guruh suratlar — barcha muhim lahzalar. 80+ tahrirlangan rasm." },
            RU: { name: 'Фотограф', shortDesc: '3 часа', fullDesc: 'Торт, игры, группы — все важные моменты. 80+ обработанных фото.' },
            EN: { name: 'Photographer', shortDesc: '3 hours', fullDesc: 'Cake, games, groups — all key moments. 80+ edited photos.' },
          }},
        ],
      },
      {
        slug: 'party', price: 6000000, isPopular: true, emoji: '🎪', regions: ALL_REGIONS,
        translations: {
          UZ: { name: 'Party', includes: ['Premium dekoratsiya', 'Animator (4 soat)', 'Fotograf + video'] },
          RU: { name: 'Пати', includes: ['Премиум декор', 'Аниматор (4 часа)', 'Фото + видео'] },
          EN: { name: 'Party', includes: ['Premium decoration', 'Animator (4h)', 'Photo + video'] },
        },
        subServices: [
          { slug: 'premium-deco-bday', emoji: '✨', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Premium dekoratsiya', shortDesc: 'Eksklyuziv tema', fullDesc: "LED neon yozuv bilan ismi, balloon garland, photo zone, kirish arcade, tort stoli kamari." },
            RU: { name: 'Премиум декор', shortDesc: 'Эксклюзивная тема', fullDesc: 'LED-неон с именем, balloon garland, фотозона, входная арка, баннер торта.' },
            EN: { name: 'Premium decoration', shortDesc: 'Exclusive theme', fullDesc: 'LED neon name, balloon garland, photo zone, entrance arch, cake banner.' },
          }},
          { slug: 'animator-4h', emoji: '🎭', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Animator (4 soat)', shortDesc: "To'liq bayram dasturi", fullDesc: "2 ta professional animator: shou dasturi, musiqa va tanlovlar, fokus va o'yinlar, sovg'alar." },
            RU: { name: 'Аниматор (4 часа)', shortDesc: 'Полная программа', fullDesc: '2 аниматора: шоу, музыка, конкурсы, фокусы, призы.' },
            EN: { name: 'Animator (4h)', shortDesc: 'Full program', fullDesc: '2 animators: show, music, contests, magic, prizes.' },
          }},
          { slug: 'photo-video-bday', emoji: '🎬', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Fotograf + videograf', shortDesc: "To'liq media", fullDesc: "150+ tahrirlangan rasm + 5 daqiqalik highlight video. 10 kun ichida yetkazish." },
            RU: { name: 'Фото + видео', shortDesc: 'Полное медиа', fullDesc: '150+ фото + 5-мин хайлайт. 10 дней.' },
            EN: { name: 'Photo + video', shortDesc: 'Full media', fullDesc: '150+ photos + 5-min highlight. 10 days.' },
          }},
        ],
      },
      {
        slug: 'vip', price: 12000000, isPopular: false, emoji: '👑', regions: ALL_REGIONS,
        translations: {
          UZ: { name: 'VIP', includes: ['Eksklyuziv bezak', 'Animator + shou', 'Drone video', 'DJ'] },
          RU: { name: 'VIP', includes: ['Эксклюзивный декор', 'Аниматор + шоу', 'Дрон видео', 'DJ'] },
          EN: { name: 'VIP', includes: ['Exclusive decor', 'Animator + show', 'Drone video', 'DJ'] },
        },
        subServices: [
          { slug: 'exclusive-decor-vip', emoji: '🌟', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Eksklyuziv bezak', shortDesc: 'Dizayner tomonidan', fullDesc: "Individual dizayner har bir detal ustida. Jonli gullar, custom neon, LED wall." },
            RU: { name: 'Эксклюзивный декор', shortDesc: 'От дизайнера', fullDesc: 'Дизайнер над каждой деталью. Живые цветы, custom неон, LED wall.' },
            EN: { name: 'Exclusive decor', shortDesc: 'By designer', fullDesc: 'Designer on every detail. Live flowers, custom neon, LED wall.' },
          }},
          { slug: 'animator-show', emoji: '🎪', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Animator + shou', shortDesc: '6 soat + maxsus shou', fullDesc: "3 professional animator + maxsus shou: fokus, kichik tsirk yoki musiqali spektakl." },
            RU: { name: 'Аниматор + шоу', shortDesc: '6 часов + спецшоу', fullDesc: '3 аниматора + спецшоу: фокусы, мини-цирк или музыкальный спектакль.' },
            EN: { name: 'Animator + show', shortDesc: '6h + special show', fullDesc: '3 animators + special show: magic, mini circus, or musical.' },
          }},
          { slug: 'drone-video', emoji: '🚁', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Drone video', shortDesc: 'Aerial 4K', fullDesc: "Professional drone + 2 yerdan videograf. 4K, professional montaj. 14 kunda USB." },
            RU: { name: 'Дрон видео', shortDesc: 'Аэросъёмка 4K', fullDesc: 'Дрон + 2 видеографа. 4K, монтаж. USB за 14 дней.' },
            EN: { name: 'Drone video', shortDesc: 'Aerial 4K', fullDesc: 'Drone + 2 videographers. 4K, editing. USB in 14 days.' },
          }},
          { slug: 'dj', emoji: '🎵', images: [], sortOrder: 3, translations: {
            UZ: { name: 'DJ', shortDesc: '4 soat professional musiqa', fullDesc: "Premium uskunalar: subwoofer, LED panel, lazer. Istalgan janr. Soundcheck 2 soat oldin." },
            RU: { name: 'DJ', shortDesc: '4 часа музыки', fullDesc: 'Премиум оборудование: сабвуфер, LED, лазер. Любой жанр. Саундчек за 2 часа.' },
            EN: { name: 'DJ', shortDesc: '4h music', fullDesc: 'Premium equipment: subwoofer, LED, laser. Any genre. Soundcheck 2h before.' },
          }},
        ],
      },
    ],
  },
  {
    slug: 'love-story', category: 'LOVE_STORY', basePrice: 2000000,
    images: [], regions: ALL_REGIONS,
    translations: {
      UZ: { name: 'Love Story', description: "Registon, Buxoro, Chorvoq — eng go'zal joylarda romantik fotosessiya.", features: ['2-4 soat sessiya', 'Professional fotograf', 'Online galereya', 'Tahrirlangan rasmlar'] },
      RU: { name: 'Love Story', description: 'Регистан, Бухара, Чарвак — романтическая фотосессия.', features: ['2-4 часа', 'Фотограф', 'Онлайн галерея', 'Обработанные фото'] },
      EN: { name: 'Love Story', description: 'Registan, Bukhara, Charvak — romantic photoshoot at beautiful places.', features: ['2-4 hours', 'Photographer', 'Online gallery', 'Edited photos'] },
    },
    packages: [
      {
        slug: 'basic', price: 2000000, isPopular: false, emoji: '💕', regions: MAIN_REGIONS,
        translations: {
          UZ: { name: 'Basic', includes: ['2 soat', '30+ foto', '1 lokatsiya'] },
          RU: { name: 'Базовый', includes: ['2 часа', '30+ фото', '1 локация'] },
          EN: { name: 'Basic', includes: ['2 hours', '30+ photos', '1 location'] },
        },
        subServices: [
          { slug: 'photo-session-basic', emoji: '📸', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Fotosessiya', shortDesc: '2 soat, 1 lokatsiya', fullDesc: "Professional fotograf bilan 2 soatlik sessiya. Poza ko'rsatmalari, natural rasmlar. 30+ tahrirlangan rasm 5 kunda." },
            RU: { name: 'Фотосессия', shortDesc: '2 часа, 1 локация', fullDesc: '2 часа с фотографом. Позирование, естественные фото. 30+ за 5 дней.' },
            EN: { name: 'Photo session', shortDesc: '2h, 1 location', fullDesc: '2-hour session with posing guidance. 30+ edited photos in 5 days.' },
          }},
        ],
      },
      {
        slug: 'premium', price: 3500000, isPopular: true, emoji: '💑', regions: ALL_REGIONS,
        translations: {
          UZ: { name: 'Premium', includes: ['4 soat', '80+ foto', '2 lokatsiya', 'Video klip'] },
          RU: { name: 'Премиум', includes: ['4 часа', '80+ фото', '2 локации', 'Видеоклип'] },
          EN: { name: 'Premium', includes: ['4 hours', '80+ photos', '2 locations', 'Video clip'] },
        },
        subServices: [
          { slug: 'photo-session-premium', emoji: '📸', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Fotosessiya', shortDesc: '4 soat, 2 lokatsiya', fullDesc: "2 ta lokatsiyada 4 soatlik sessiya. Tabiiy muhit va shahar. 80+ tahrirlangan rasm 7 kunda." },
            RU: { name: 'Фотосессия', shortDesc: '4 часа, 2 локации', fullDesc: '4 часа в 2 локациях. Природа и город. 80+ фото за 7 дней.' },
            EN: { name: 'Photo session', shortDesc: '4h, 2 locations', fullDesc: '4 hours, 2 locations. Nature and city. 80+ photos in 7 days.' },
          }},
          { slug: 'video-clip', emoji: '🎬', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Video klip', shortDesc: '2-3 daqiqalik romantic', fullDesc: "2-3 daqiqalik romantik video klip. Musiqa va professional montaj. 14 kunda." },
            RU: { name: 'Видеоклип', shortDesc: '2-3 минуты', fullDesc: 'Романтический клип 2-3 мин. Музыка и монтаж. 14 дней.' },
            EN: { name: 'Video clip', shortDesc: '2-3 minute', fullDesc: '2-3 minute romantic clip. Music and editing. 14 days.' },
          }},
        ],
      },
    ],
  },
  {
    slug: 'proposal', category: 'PROPOSAL', basePrice: 1500000,
    images: [], regions: MAIN_REGIONS,
    translations: {
      UZ: { name: 'Surprise Proposal', description: "Unutilmas taklifnoma marosimi. Yashirin kamera, gul ko'chasi, surprise dinner.", features: ['Maxsus joy bezash', 'Yashirin fotograf', 'Gul kompozitsiyasi', 'Video yozuv'] },
      RU: { name: 'Сюрприз-предложение', description: 'Незабываемая церемония предложения. Скрытая камера, цветочная дорожка.', features: ['Оформление места', 'Скрытый фотограф', 'Цветочная композиция', 'Видеозапись'] },
      EN: { name: 'Surprise Proposal', description: 'Unforgettable proposal ceremony. Hidden camera, flower path, surprise dinner.', features: ['Venue setup', 'Hidden photographer', 'Flower arrangement', 'Video'] },
    },
    packages: [
      {
        slug: 'romantic', price: 1500000, isPopular: false, emoji: '💝', regions: MAIN_REGIONS,
        translations: {
          UZ: { name: 'Romantic', includes: ['Joy bezash', 'Yashirin fotograf', "Gul yo'lak"] },
          RU: { name: 'Романтик', includes: ['Оформление', 'Скрытый фотограф', 'Цветочная дорожка'] },
          EN: { name: 'Romantic', includes: ['Setup', 'Hidden photographer', 'Flower path'] },
        },
        subServices: [
          { slug: 'venue-setup', emoji: '🌹', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Joy bezash', shortDesc: 'Romantik muhit', fullDesc: "Gul yo'lak, shamlar va bezaklar. Tadbir boshlanishidan 1 soat oldin barcha tayyorlanadi." },
            RU: { name: 'Оформление места', shortDesc: 'Романтика', fullDesc: 'Цветочная дорожка, свечи и декор. За 1 час до события всё готово.' },
            EN: { name: 'Venue setup', shortDesc: 'Romantic atmosphere', fullDesc: 'Flower path, candles and decorations ready 1 hour before.' },
          }},
          { slug: 'hidden-photographer', emoji: '📸', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Yashirin fotograf', shortDesc: 'Tabiiy lahzalar', fullDesc: "Fotograf yashirincha barcha muhim lahzalarni suratga oladi: taklif, javob, quchoqlashish. 50+ tabiiy rasm." },
            RU: { name: 'Скрытый фотограф', shortDesc: 'Естественные моменты', fullDesc: 'Фотограф незаметно снимает предложение и эмоции. 50+ естественных фото.' },
            EN: { name: 'Hidden photographer', shortDesc: 'Natural moments', fullDesc: 'Photographer captures proposal and emotions discreetly. 50+ natural photos.' },
          }},
        ],
      },
      {
        slug: 'dream', price: 3000000, isPopular: true, emoji: '💍', regions: MAIN_REGIONS,
        translations: {
          UZ: { name: 'Dream', includes: ['Premium bezash', 'Fotograf + videograf', 'Surprise dinner'] },
          RU: { name: 'Мечта', includes: ['Премиум оформление', 'Фото + видео', 'Ужин-сюрприз'] },
          EN: { name: 'Dream', includes: ['Premium setup', 'Photo + video', 'Surprise dinner'] },
        },
        subServices: [
          { slug: 'premium-setup', emoji: '✨', images: [], sortOrder: 0, translations: {
            UZ: { name: 'Premium bezash', shortDesc: 'Eksklyuziv romantika', fullDesc: "Jonli gullardan yo'lak, float shamlar, LED yulduzlar, gul devori photo zone." },
            RU: { name: 'Премиум оформление', shortDesc: 'Эксклюзивная романтика', fullDesc: 'Живые цветы, float свечи, LED звёзды, цветочная фотостена.' },
            EN: { name: 'Premium setup', shortDesc: 'Exclusive romance', fullDesc: 'Live flower path, floating candles, LED stars, flower wall photo zone.' },
          }},
          { slug: 'photo-video-proposal', emoji: '🎬', images: [], sortOrder: 1, translations: {
            UZ: { name: 'Fotograf + videograf', shortDesc: 'Butun lahza yoziladi', fullDesc: "50+ rasm + 3 daqiqalik emotional video. 10 kunda yetkazish." },
            RU: { name: 'Фото + видео', shortDesc: 'Весь момент записан', fullDesc: '50+ фото + 3-минутное видео за 10 дней.' },
            EN: { name: 'Photo + video', shortDesc: 'Every moment', fullDesc: '50+ photos + 3-minute video in 10 days.' },
          }},
          { slug: 'surprise-dinner', emoji: '🍷', images: [], sortOrder: 2, translations: {
            UZ: { name: 'Surprise dinner', shortDesc: 'Premium restoran', fullDesc: "Eng yaxshi restoranlardan birida maxsus stol: shampan, sevimli taomlar, individual menyu." },
            RU: { name: 'Ужин-сюрприз', shortDesc: 'Премиум ресторан', fullDesc: 'Специальный столик: шампанское, любимые блюда, меню.' },
            EN: { name: 'Surprise dinner', shortDesc: 'Premium restaurant', fullDesc: 'Special table booked: champagne, favorite dishes, custom menu.' },
          }},
        ],
      },
    ],
  },
];

async function upsertService(prisma, svc) {
  const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });

  if (existing) {
    // Update service base fields
    await prisma.service.update({
      where: { slug: svc.slug },
      data: { category: svc.category, basePrice: svc.basePrice, images: svc.images, regions: svc.regions },
    });

    // Upsert service translations
    for (const [lang, t] of Object.entries(svc.translations)) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_lang: { serviceId: existing.id, lang } },
        update: { name: t.name, description: t.description, features: t.features },
        create: { serviceId: existing.id, lang, name: t.name, description: t.description, features: t.features },
      });
    }

    // Delete ALL existing packages (onDelete:SetNull → Order.packageId becomes null safely)
    await prisma.package.deleteMany({ where: { serviceId: existing.id } });

    // Recreate all packages fresh
    for (const pkg of svc.packages) {
      await prisma.package.create({
        data: {
          serviceId: existing.id,
          slug: pkg.slug, price: pkg.price, isPopular: pkg.isPopular, emoji: pkg.emoji, regions: pkg.regions,
          translations: {
            create: Object.entries(pkg.translations).map(([lang, t]) => ({ lang, name: t.name, includes: t.includes })),
          },
          subServices: {
            create: (pkg.subServices || []).map(ss => ({
              slug: ss.slug, emoji: ss.emoji, images: ss.images, sortOrder: ss.sortOrder,
              translations: {
                create: Object.entries(ss.translations).map(([lang, t]) => ({ lang, name: t.name, shortDesc: t.shortDesc, fullDesc: t.fullDesc })),
              },
            })),
          },
        },
      });
    }
    console.log(`Updated: ${svc.slug}`);

  } else {
    await prisma.service.create({
      data: {
        slug: svc.slug, category: svc.category, basePrice: svc.basePrice, images: svc.images, regions: svc.regions,
        translations: {
          create: Object.entries(svc.translations).map(([lang, t]) => ({ lang, name: t.name, description: t.description, features: t.features })),
        },
        packages: {
          create: svc.packages.map(pkg => ({
            slug: pkg.slug, price: pkg.price, isPopular: pkg.isPopular, emoji: pkg.emoji, regions: pkg.regions,
            translations: {
              create: Object.entries(pkg.translations).map(([lang, t]) => ({ lang, name: t.name, includes: t.includes })),
            },
            subServices: {
              create: (pkg.subServices || []).map(ss => ({
                slug: ss.slug, emoji: ss.emoji, images: ss.images, sortOrder: ss.sortOrder,
                translations: {
                  create: Object.entries(ss.translations).map(([lang, t]) => ({ lang, name: t.name, shortDesc: t.shortDesc, fullDesc: t.fullDesc })),
                },
              })),
            },
          })),
        },
      },
    });
    console.log(`Created: ${svc.slug}`);
  }
}

async function seed(prisma) {
  console.log('\nSeeding...');

  const hashed = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@marryme.uz' },
    update: {},
    create: {
      email: 'admin@marryme.uz', password: hashed,
      role: 'SUPER_ADMIN', authProvider: 'LOCAL',
      profile: { create: { firstName: 'Admin', lastName: 'MarryMe', lang: 'UZ' } },
    },
  });
  console.log('Admin: admin@marryme.uz / admin123');

  for (const svc of SERVICES) {
    await upsertService(prisma, svc);
  }
  console.log('\nSeed complete!');
}

async function main() {
  console.log('Setup starting...\n');
  run('npx prisma db push --accept-data-loss');
  console.log('Schema synced\n');
  const prisma = new PrismaClient();
  try { await seed(prisma); }
  finally { await prisma.$disconnect(); }
  console.log('\nReady!\n');
}

main().catch(err => { console.error('Setup failed:', err.message); process.exit(1); });
