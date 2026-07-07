/**
 * Persian (fa-IR) UI strings + number helpers. Per CLAUDE.md: **no hardcoded
 * strings in UI** — everything user-facing comes from `fa` here.
 */

const EN_TO_FA_DIGITS: Record<string, string> = {
  '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
  '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
};

/** Convert ASCII digits in a string/number to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => EN_TO_FA_DIGITS[d] ?? d);
}

/** Format a Toman/Rial amount with thousands separators and Persian digits. */
export function formatToman(amount: number): string {
  const grouped = Math.round(amount).toLocaleString('en-US');
  return `${toPersianDigits(grouped)} تومان`;
}

export const fa = {
  brand: 'خودکار',
  common: {
    continue: 'ادامه',
    confirm: 'تأیید',
    edit: 'ویرایش',
    reject: 'رد',
    send: 'ارسال',
    cancel: 'انصراف',
    back: 'بازگشت',
    loading: 'در حال بارگذاری…',
    retry: 'تلاش دوباره',
    logout: 'خروج',
    soon: 'به‌زودی',
  },
  auth: {
    loginTitle: 'ورود',
    phoneLabel: 'شماره موبایل',
    phonePlaceholder: '۰۹۱۲۳۴۵۶۷۸۹',
    sendCode: 'ارسال کد',
    codeLabel: 'کد تأیید',
    codeSentTo: (phone: string) => `کد به ${phone} پیامک شد`,
    verify: 'تأیید و ورود',
    resend: 'ارسال دوباره‌ی کد',
    invalidPhone: 'شماره موبایل معتبر نیست',
    invalidCode: 'کد واردشده درست نیست',
    expiredCode: 'کد منقضی شده؛ دوباره درخواست بده',
    tooManyAttempts: 'تلاش زیاد؛ کمی بعد دوباره امتحان کن',
    tooManyRequests: 'درخواست زیاد؛ کمی صبر کن',
    welcome: 'خوش آمدی 👋',
  },
  panel: {
    nav: {
      home: 'خانه',
      conversations: 'گفتگوها',
      catalog: 'کاتالوگ',
      campaigns: 'کمپین',
    },
    home: {
      botOn: 'ربات روشن است',
      botOff: 'ربات خاموش است',
      todayChats: 'گفتگوی امروز',
      newLeads: 'لید جدید',
      pendingApproval: 'در انتظار تأیید',
      testAssistant: 'تست دستیار',
    },
    settingsAssistant: 'با دستیارِ تنظیمات حرف بزن',
    switchTenant: 'تغییر کسب‌وکار',
    conversations: {
      title: 'گفتگوها',
      filterPending: 'نیازمند تأیید',
      empty: 'هنوز گفتگویی نیست. وقتی ربات فعال شود این‌جا نمایش داده می‌شود.',
      customerAsked: 'مشتری پرسید',
      proposedReply: 'پاسخ پیشنهادی',
      approve: 'ارسال',
      editSend: 'ویرایش و ارسال',
      editPlaceholder: 'پاسخ را ویرایش کن…',
      sent: 'ارسال شد ✅',
      noPending: 'پیش‌نویسی برای تأیید نداری. 👌',
    },
    unanswered: {
      title: 'سؤال‌های بی‌جواب',
      empty: 'سؤال بی‌جوابی ثبت نشده.',
      answerPlaceholder: 'پاسخ درست را بنویس…',
      convert: 'تبدیل به سؤال متداول',
      converted: 'اضافه شد ✅',
    },
    catalog: {
      title: 'کاتالوگ',
      searchPlaceholder: 'جستجوی محصول…',
      addProduct: 'افزودن محصول',
      titlePlaceholder: 'نام محصول',
      pricePlaceholder: 'قیمت (تومان)',
      imagePlaceholder: 'لینک عکس (اختیاری)',
      save: 'ذخیره',
      added: 'اضافه شد ✅',
      count: (n: string) => `${n} محصول`,
      rent: 'اجاره',
      empty: 'کاتالوگت خالی است. اولین محصول را اضافه کن.',
      noResults: 'محصولی پیدا نشد.',
    },
    widget: {
      title: 'ویجت سایت',
      subtitle: 'این یک خط را داخل سایتت بگذار تا دستیار روی سایتت هم فعال شود:',
      copy: 'کپی',
      copied: 'کپی شد ✅',
    },
    campaigns: {
      title: 'کمپین',
      create: 'ساخت کمپین',
      empty: 'هنوز کمپینی نساخته‌ای.',
    },
  },
  onboarding: {
    title: 'کسب‌وکارت را بساز',
    subtitle: 'صنفت را انتخاب کن و یک اسم بگذار تا شروع کنیم.',
    chooseVertical: 'صنف',
    nameLabel: 'نام کسب‌وکار',
    namePlaceholder: 'مثلاً مزون آرزو',
    create: 'ساخت و ادامه',
    creating: 'در حال ساخت…',
    invalidName: 'نام کسب‌وکار معتبر نیست (۲ تا ۸۰ حرف).',
    invalidVertical: 'لطفاً صنف را انتخاب کن.',
    steps: { catalog: 'کاتالوگ', interview: 'گفتگو', test: 'تست', go: 'فعال‌سازی' },
    crawl: {
      title: 'لینک سایت یا اینستاگرامت را بده',
      subtitle: 'کاتالوگت را خودم می‌خوانم و آماده می‌کنم.',
      placeholder: 'https://example.com',
      start: 'شروع بررسی',
      crawling: 'در حال خواندن سایت…',
      found: (n: string) => `${n} محصول پیدا و ایندکس شد ✅`,
      failed: 'نتوانستم سایت را بخوانم. می‌توانی این مرحله را رد کنی.',
      skip: 'فعلاً رد کن',
      next: 'ادامه',
    },
    interview: {
      title: 'چند سؤال کوتاه',
      subtitle: 'این‌ها را از تو می‌پرسم تا دستیارت درست جواب بدهد.',
      toneTitle: 'لحن دستیارت چطور باشد؟',
      tones: { luxury: 'لوکس-رسمی', friendly: 'صمیمی', young: 'جوان' },
      sampleLabel: 'یک نمونه جواب که خودت به مشتری می‌دهی (اختیاری)',
      samplePlaceholder: 'سلام عزیزم، خوش اومدی…',
      next: 'ادامه',
      saving: 'در حال ذخیره…',
    },
    sandbox: {
      title: 'حالا با دستیارت حرف بزن',
      subtitle: 'یک سؤال مثل مشتری بپرس و جوابش را ببین.',
      testMode: 'حالت آزمایشی',
      placeholder: 'مثلاً: قیمت لباس عروس چنده؟',
      pendingNote: 'این پاسخ در حالت واقعی برای تأیید تو می‌آمد.',
      next: 'ادامه',
    },
    finish: {
      title: 'دستیارت آماده است 🎉',
      subtitle: 'حالا فعالش کن و به پنل برو.',
      activate: 'فعال کن 🚀',
      activating: 'در حال فعال‌سازی…',
    },
  },
  verticals: {
    mazon: 'مزون / گالری عروس',
    boutique: 'بوتیک پوشاک',
    jewelry: 'زیورآلات و اکسسوری',
    salon: 'آرایشگاه / سالن زیبایی',
    restaurant: 'رستوران / کافه',
  },
  agent: {
    holding: 'ممنون از پیامت 🙏 همکارانم به‌زودی برایت پاسخ می‌فرستند.',
    fallback: 'اجازه بده این را از همکارم بپرسم و بهت خبر بدهم.',
  },
  connect: {
    telegramTitle: 'اتصال ربات تلگرام',
    botOffAction: 'اتصال تلگرام',
    connectedAs: (username: string) => `متصل به @${username}`,
    steps: [
      'در تلگرام به @BotFather پیام بده و دستور /newbot را بزن.',
      'یک نام و یک آیدی برای ربات انتخاب کن.',
      'توکنی که BotFather می‌دهد را کپی کن و این‌جا بچسبان.',
    ],
    tokenLabel: 'توکن ربات',
    tokenPlaceholder: '123456:ABC-DEF…',
    connect: 'فعال‌سازی ربات',
    connecting: 'در حال اتصال…',
    invalidToken: 'توکن معتبر نیست. دوباره از BotFather بگیر.',
  },
  errors: {
    generic: 'مشکلی پیش آمد. دوباره تلاش کن.',
    unauthorized: 'لطفاً وارد شو.',
  },
} as const;

export type Messages = typeof fa;
