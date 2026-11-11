import {
  BusinessProfile,
  Customer,
  LuckyDrawWinner,
  MonthlyCustomerStatement,
  PakistaniPaymentChannels,
  ProductBroadcast,
  ReminderTemplate,
  Transaction,
} from '../types';

export function cleanPhoneNumber(rawPhone: string): string {
  // Strip non-digits
  let digits = rawPhone.replace(/\D/g, '');

  // If Pakistani 11-digit mobile starting with 03 (e.g. 03125256266 or 03001234567), change leading 0 to 92
  if (digits.startsWith('03') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('3')) {
    // 3125256266 -> 923125256266
    digits = `92${digits}`;
  }

  return digits;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function openWhatsAppDirect(phone: string, message: string): void {
  const url = generateWhatsAppLink(phone, message);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('WhatsApp link error:', err);
  }
}

export function formatPaymentChannelsText(profileOrChannels: BusinessProfile | PakistaniPaymentChannels): string {
  const ch = 'paymentChannels' in profileOrChannels ? profileOrChannels.paymentChannels : profileOrChannels;
  const lines: string[] = [];

  if (ch.easyPaisa?.enabled && ch.easyPaisa.accountNumber) {
    lines.push(`• *EasyPaisa:* ${ch.easyPaisa.accountNumber} (${ch.easyPaisa.accountTitle})`);
  }
  if (ch.jazzCash?.enabled && ch.jazzCash.accountNumber) {
    lines.push(`• *JazzCash:* ${ch.jazzCash.accountNumber} (${ch.jazzCash.accountTitle})`);
  }
  if (ch.sadaPay?.enabled && (ch.sadaPay.accountNumber || ch.sadaPay.sadaTag)) {
    const tag = ch.sadaPay.sadaTag ? ` | Tag: ${ch.sadaPay.sadaTag}` : '';
    const iban = ch.sadaPay.iban ? ` | IBAN: ${ch.sadaPay.iban}` : '';
    lines.push(`• *SadaPay:* ${ch.sadaPay.accountNumber} (${ch.sadaPay.accountTitle}${tag}${iban})`);
  }
  if (ch.bankDetails?.enabled && ch.bankDetails.accountNumber) {
    lines.push(
      `• *Bank Account:* ${ch.bankDetails.bankName}\n  A/C Title: ${ch.bankDetails.accountTitle}\n  A/C No: ${ch.bankDetails.accountNumber}\n  IBAN: ${ch.bankDetails.iban}`
    );
  }

  return lines.length > 0 ? lines.join('\n') : 'Payment details available on request: 03125256266';
}

export function formatTemplateMessage(
  templateContent: string,
  variables: {
    customerName: string;
    amount: number;
    currency: string;
    dueDate?: string;
    daysOverdue?: number;
    businessName: string;
    paymentChannelsText?: string;
    paymentTerms?: number;
    invoiceNo?: string;
    invoiceTitle?: string;
    paymentMode?: string;
    remainingBalance?: number;
    date?: string;
    productName?: string;
    productDescription?: string;
    price?: number;
    productLink?: string;
    savings?: number;
    marketPrice?: number;
    voucherCode?: string;
    prizeTitle?: string;
  }
): string {
  const todayStr = new Date().toISOString().split('T')[0];

  let formatted = templateContent;
  formatted = formatted.replace(/{CUSTOMER_NAME}/g, variables.customerName || 'Valued Customer');
  formatted = formatted.replace(/{AMOUNT}/g, variables.amount?.toLocaleString('en-PK') || '0');
  formatted = formatted.replace(/{CURRENCY}/g, variables.currency || 'Rs.');
  formatted = formatted.replace(/{DUE_DATE}/g, variables.dueDate || 'Immediate');
  formatted = formatted.replace(/{DAYS_OVERDUE}/g, String(variables.daysOverdue ?? 0));
  formatted = formatted.replace(/{BUSINESS_NAME}/g, variables.businessName || '100DAGAR · مدینہ مارکیٹ');
  formatted = formatted.replace(/{PAYMENT_CHANNELS}/g, variables.paymentChannelsText || '');
  formatted = formatted.replace(/{PAYMENT_TERMS}/g, String(variables.paymentTerms ?? 14));
  formatted = formatted.replace(/{CURRENT_DATE}/g, todayStr);
  formatted = formatted.replace(/{INVOICE_NO}/g, variables.invoiceNo || 'INV-100D');
  formatted = formatted.replace(/{INVOICE_TITLE}/g, variables.invoiceTitle || 'Wholesale Order');
  formatted = formatted.replace(/{PAYMENT_MODE}/g, variables.paymentMode?.toUpperCase() || 'ONLINE');
  formatted = formatted.replace(/{REMAINING_BALANCE}/g, variables.remainingBalance?.toLocaleString('en-PK') || '0');
  formatted = formatted.replace(/{DATE}/g, variables.date || todayStr);

  // Customer savings & pricing tags
  formatted = formatted.replace(/{SAVINGS}/g, variables.savings ? variables.savings.toLocaleString('en-PK') : '0');
  formatted = formatted.replace(/{MARKET_PRICE}/g, variables.marketPrice ? variables.marketPrice.toLocaleString('en-PK') : '0');

  // Product broadcast tags
  formatted = formatted.replace(/{PRODUCT_NAME}/g, variables.productName || 'New Arrival');
  formatted = formatted.replace(/{PRODUCT_DESCRIPTION}/g, variables.productDescription || '');
  formatted = formatted.replace(/{PRICE}/g, variables.price ? variables.price.toLocaleString('en-PK') : '0');
  formatted = formatted.replace(/{PRODUCT_LINK}/g, variables.productLink || '');

  // Lucky Draw tags
  formatted = formatted.replace(/{VOUCHER_CODE}/g, variables.voucherCode || '');
  formatted = formatted.replace(/{PRIZE}/g, variables.prizeTitle || '');

  return formatted;
}

export function calculateDaysOverdue(dueDateStr?: string): number {
  if (!dueDateStr) return 0;
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Generate payment reminder message for a customer based on overdue status
export function buildCustomerPaymentReminderMessage(
  customer: Customer,
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  options?: { customDueDate?: string; customNote?: string; preferredTemplateId?: string }
): string {
  const daysOverdue = calculateDaysOverdue(options?.customDueDate);
  let template = options?.preferredTemplateId
    ? templates.find((t) => t.id === options.preferredTemplateId)
    : undefined;

  if (!template) {
    if (daysOverdue > 0) {
      template = templates.find((t) => t.type === 'overdue_3days') || templates.find((t) => t.type === 'overdue') || templates[0];
    } else {
      template = templates.find((t) => t.type === 'weekly_due') || templates[0];
    }
  }

  const paymentChannelsText = formatPaymentChannelsText(profile);

  let message = formatTemplateMessage(template.content, {
    customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
    amount: Math.abs(customer.balance),
    currency: profile.currencySymbol,
    dueDate: options?.customDueDate,
    daysOverdue,
    businessName: profile.name,
    paymentChannelsText,
    paymentTerms: customer.paymentTermsDays,
  });

  if (options?.customNote) {
    message += `\n\n*Note:* ${options.customNote}`;
  }

  return message;
}

// Generate sale invoice with clear savings calculation
export function buildSaleInvoiceMessage(
  customer: Customer,
  tx: Transaction,
  profile: BusinessProfile
): string {
  const paymentChannelsText = formatPaymentChannelsText(profile);
  const isCredit = tx.type === 'credit';
  const totalSavings = tx.totalSavings || 0;

  let msg = `*${profile.name} · مدینہ مارکیٹ*\n`;
  msg += `🧾 *${isCredit ? 'Sale Invoice / نیا بل' : 'Payment Receipt / وصولی رسید'}*\n`;
  msg += `Invoice #: *${tx.invoiceNumber || 'INV-100D'}*\n`;
  msg += `Date: ${tx.date}\n`;
  msg += `Customer: *${customer.name}* ${customer.urduName ? `(${customer.urduName})` : ''} [${customer.customerType === 'retail' ? 'ریٹیلر' : 'انفرادی'}]\n\n`;

  if (tx.items && tx.items.length > 0) {
    msg += `*Items Ordered / سامان کی تفصیل:*\n`;
    tx.items.forEach((item, idx) => {
      const itemSave = item.customerSavings ? ` (بچت: ${profile.currencySymbol}${item.customerSavings.toLocaleString('en-PK')})` : '';
      msg += `${idx + 1}. ${item.description} - ${item.quantity}x @ ${profile.currencySymbol}${item.unitPrice.toLocaleString('en-PK')}${itemSave}\n`;
    });
    msg += `\n`;
  }

  msg += `Total Amount / کل رقم: *${profile.currencySymbol}${tx.amount.toLocaleString('en-PK')}*\n`;

  if (totalSavings > 0) {
    msg += `🌟 *Your Total Savings / آپ کی کل بچت:* *${profile.currencySymbol}${totalSavings.toLocaleString('en-PK')}* 🌟\n`;
  }

  const isCOD = tx.saleType === 'cod' || tx.paymentMode === 'cod' || (tx.paymentMode === 'cash' && tx.saleType !== 'partial' && tx.saleType !== 'time_credit');

  if (isCOD) {
    msg += `\n🚚 *Order Mode / طریقہ آرڈر:* Cash on Delivery (COD / کیش آن ڈلیوری)\n`;
    msg += `💵 *Pay to Rider upon Delivery / رائیڈر کو نقد ادائیگی:* *${profile.currencySymbol}${tx.amount.toLocaleString('en-PK')}*\n`;
    msg += `(نوٹ: کیش آن ڈلیوری کے لیے اکاؤنٹ ٹرانسفر کی ضرورت نہیں ہے، رقم پارسل موصول ہونے پر رائیڈر کو نقد ادا فرمائیں۔)\n\n`;
  } else {
    if (tx.saleType === 'partial') {
      msg += `Advance Paid / ادا کردہ پیشگی: *${profile.currencySymbol}${(tx.paidAmount || 0).toLocaleString('en-PK')}*\n`;
      msg += `Due Balance / باقی واجب الادا: *${profile.currencySymbol}${(tx.dueBalance || 0).toLocaleString('en-PK')}*\n`;
      msg += `Payment Terms Due Date: *${tx.dueDate}*\n`;
    } else if (tx.saleType === 'time_credit') {
      msg += `Sale Mode: *Time-Based Credit (ادھار کھاتہ)*\n`;
      msg += `Due Date / آخری تاریخ ادائیگی: *${tx.dueDate}* (${tx.paymentTermsDays || 14} Days Terms)\n`;
    }

    msg += `\n*Payment Accounts (EasyPaisa / JazzCash / SadaPay: 03125256266):*\n${paymentChannelsText}\n\n`;
  }

  msg += `کاروبار کرنے کا بہت شکریہ! جزاک اللہ۔`;

  return msg;
}

// Generate Lucky Draw Winner Announcement
export function buildLuckyDrawWinnerMessage(
  winner: LuckyDrawWinner,
  profile: BusinessProfile,
  templates: ReminderTemplate[]
): string {
  const tpl = templates.find((t) => t.type === 'lucky_draw_winner') || templates[0];

  const rewardValueStr = winner.lastPurchaseAmount && winner.rank === 1
    ? `${profile.currencySymbol}${winner.lastPurchaseAmount.toLocaleString('en-PK')} (پچھلے آرڈر کی مکمل رقم کیش بیک)`
    : winner.isUpcomingGift
    ? `تحفہ: نئے آنے والے آئٹم کا تحفہ (${winner.prizeTitle})`
    : winner.discountValue;

  return formatTemplateMessage(tpl.content, {
    customerName: winner.customerName,
    amount: winner.lastPurchaseAmount || 0,
    currency: profile.currencySymbol,
    businessName: profile.name,
    productName: winner.prizeTitle,
    productLink: winner.voucherCode,
    price: winner.lastPurchaseAmount || 0,
    voucherCode: winner.voucherCode,
    prizeTitle: `${winner.prizeTitle} [${rewardValueStr}]`,
  });
}

// Generate Product Broadcast message
export function buildProductBroadcastMessage(
  customer: Customer,
  product: ProductBroadcast,
  profile: BusinessProfile,
  templates: ReminderTemplate[]
): string {
  const template = templates.find((t) => t.type === 'product_broadcast') || templates[0];

  return formatTemplateMessage(template.content, {
    customerName: customer.name,
    amount: 0,
    currency: profile.currencySymbol,
    businessName: profile.name,
    productName: product.productName + (product.urduName ? ` (${product.urduName})` : ''),
    productDescription: product.description,
    price: product.price,
    productLink: product.productLink,
  });
}

// Generate Monthly Customer Statement message with Lucky Draw Winnings
// USER DIRECTIVE: "keep monthly statement for all customers who purchase in entire month and if get wining amount"
export function buildMonthlyStatementWhatsAppMessage(
  statement: MonthlyCustomerStatement,
  profile: BusinessProfile
): string {
  const cust = statement.customer;
  const curr = profile.currencySymbol;

  let msg = `*📊 ماہانہ کسٹمر اسٹیٹمنٹ - ${profile.name} · مدینہ مارکیٹ*\n`;
  msg += `*Monthly Customer Account Statement - ${statement.monthName}*\n\n`;

  msg += `محترم *${cust.name}*${cust.urduName ? ` (${cust.urduName})` : ''} صاحب،\n`;
  if (cust.city) msg += `شہر / علاقہ: ${cust.city}${cust.area ? `, ${cust.area}` : ''}\n`;
  msg += `امید ہے آپ بخیریت ہوں گے۔ پورے مہینے میں آپ کے خریداری و ادائیگی کا خلاصہ درج ذیل ہے:\n\n`;

  msg += `📋 *خریداری تفصیل (Purchases Summary):*\n`;
  msg += `• کل آرڈرز / بل: *${statement.invoicesCount}*\n`;
  msg += `• پورے مہینے کی کل خریداری: *${curr} ${statement.totalPurchases.toLocaleString('en-PK')}*\n`;
  msg += `• وصول شدہ / ادا کردہ رقم: *${curr} ${statement.totalPaid.toLocaleString('en-PK')}*\n`;
  msg += `• کسٹمر بچت (Your Savings): *${curr} ${statement.totalSavings.toLocaleString('en-PK')}*\n`;
  msg += `• موجودہ بقایا بیلنس (Balance Due): *${curr} ${statement.closingBalance.toLocaleString('en-PK')}*\n\n`;

  // IF CUSTOMER WON IN LUCKY DRAW (User directive!)
  if (statement.luckyDrawWinnings?.hasWon) {
    const win = statement.luckyDrawWinnings;
    msg += `🎉 *🏆 مبارکباد! آپ اس مہینے کے لکی ڈرا فاتح ہیں!* 🏆\n`;
    msg += `*Congratulations! You Won in ${profile.name} Lucky Draw:*\n`;
    msg += `🎁 انعام / Prize: *${win.prizeTitle}*\n`;
    msg += `🎟️ انعامی واؤچر کوڈ: *${win.voucherCode}*\n`;
    msg += `💰 انعام کی مالیت: *${win.discountValue}*\n`;
    msg += `_(یہ واؤچر آپ کے اگلے ہول سیل آرڈر پر فلیٹ کیش بیک یا ڈسکاؤنٹ کے طور پر لاگو ہوگا)_\n\n`;
  }

  // Payment Accounts if balance is positive
  if (statement.closingBalance > 0) {
    msg += `*ادائیگی کے ذرائع (EasyPaisa / JazzCash / SadaPay: 03125256266):*\n`;
    msg += `${formatPaymentChannelsText(profile.paymentChannels)}\n\n`;
    msg += `براہ کرم بقایا رقم بروقت منتقل فرما کر سکرین شاٹ بھیج دیں۔\n`;
  } else {
    msg += `✅ *آپ کا کھاتہ مکمل طور پر کلیئر ہے۔ بروقت ادائیگی اور بھروسے پر ہم آپ کے شکر گزار ہیں۔*\n\n`;
  }

  msg += `*100DAGAR مدینہ مارکیٹ* کے ساتھ خریداری پر شکریہ!\nجزاک اللہ خیراً۔`;

  return msg;
}
