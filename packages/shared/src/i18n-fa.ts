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
  },
  verticals: {
    mazon: 'مزون / گالری عروس',
    boutique: 'بوتیک پوشاک',
    jewelry: 'زیورآلات و اکسسوری',
    salon: 'آرایشگاه / سالن زیبایی',
    restaurant: 'رستوران / کافه',
  },
  errors: {
    generic: 'مشکلی پیش آمد. دوباره تلاش کن.',
    unauthorized: 'لطفاً وارد شو.',
  },
} as const;

export type Messages = typeof fa;
