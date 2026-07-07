/**
 * First vertical preset — «مزون» (bridal / eveningwear gallery). Encodes the
 * rent+deposit+calendar, fitting, and sale knowledge from the master plan §8.
 */
import type { VerticalPreset } from './types.js';

export const mazon: VerticalPreset = {
  id: 'mazon',
  requiredFacts: ['shipping', 'hours', 'rent_terms', 'deposit', 'fitting'],
  tools: [
    'search_products',
    'get_product',
    'check_availability',
    'get_fact',
    'create_lead',
    'register_interest',
    'book_slot',
    'escalate_to_owner',
    'log_unanswered',
  ],
  intents: [
    { id: 'price_query', examples: ['قیمت این لباس چنده؟', 'این مدل چند؟'] },
    { id: 'rent_query', examples: ['اجاره‌ش چطوریه؟', 'کرایه‌ی این لباس چنده؟'] },
    { id: 'size_query', examples: ['سایز ۳۸ دارید؟', 'این تا چه سایزی هست؟'] },
    { id: 'availability_query', examples: ['برای ۱۵ مرداد آزاده؟', 'این هفته موجوده؟'] },
    { id: 'fitting_booking', examples: ['میشه بیام پرو؟', 'برای پرو وقت میخوام'] },
  ],
  toneOptions: [
    {
      id: 'luxury',
      label: 'لوکس-رسمی',
      system: 'لحن محترمانه، شیک و مطمئن؛ کوتاه و بدون شوخی اضافه.',
    },
    { id: 'friendly', label: 'صمیمی', system: 'گرم و خودمانی اما مؤدب.' },
    { id: 'young', label: 'جوان', system: 'پرانرژی و امروزی، با ایموجی محدود.' },
  ],
  sampleDialogs: [
    { customer: 'سلام، لباس عروس دنباله‌دار دارید؟', agent: 'سلام و درود 🌸 بله، چند مدل دنباله‌دار موجود داریم. سایز موردنظرتان چنده تا دقیق‌تر راهنمایی کنم؟' },
    { customer: 'اجاره‌ی مدل ماهی چقدره؟', agent: 'برای مدل ماهی، اجاره‌ی سه‌روزه به همراه ودیعه است. اگر کد لباس را بفرمایید مبلغ دقیقش را می‌گویم.' },
  ],
  campaignTemplates: [
    { id: 'sale_news', label: 'خبر حراج', template: 'سلام {name} عزیز 🌸 این جمعه حراج ویژه‌ی مزون داریم؛ منتظرت هستیم!' },
    { id: 'fitting_reminder', label: 'یادآوری پرو', template: 'سلام {name}، یادآوری وقت پروی لباس برای {date}. اگر تغییری هست خبر بده.' },
  ],
  onboardingQuestions: [
    { factKey: 'shipping', prompt: 'ارسال به شهرستان داری؟ اگر آره با چه پیکی؟' },
    { factKey: 'hours', prompt: 'ساعت کاری مزون چنده؟' },
    { factKey: 'rent_terms', prompt: 'شرایط اجاره‌ات چیه؟ (چند روزه، محدودیت‌ها)' },
    { factKey: 'deposit', prompt: 'ودیعه می‌گیری؟ معمولاً چقدر؟' },
    { factKey: 'fitting', prompt: 'برای پرو باید وقت بگیرن یا حضوری میان؟' },
  ],
};
