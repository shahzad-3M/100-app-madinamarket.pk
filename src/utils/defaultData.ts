import {
  AttendanceRecord,
  BroadcastContact,
  BusinessProfile,
  CODOrder,
  Customer,
  Employee,
  LuckyDrawEvent,
  LoginAuditRecord,
  ProductBroadcast,
  ProductItem,
  RecurringInvoice,
  ReminderTemplate,
  Reseller,
  ReviewRewardSubmission,
  SavedBroadcastCampaign,
  Transaction,
  WhatsAppNotification,
} from '../types';

export const defaultBusinessProfile: BusinessProfile = {
  name: '100DAGAR',
  tagline: 'مدینہ مارکیٹ · Wholesale & Retail Distribution',
  phone: '0312 5256 266',
  email: 'info@100dagar.pk',
  address: 'Shop # 14, Madina Market (مدینہ مارکیٹ), Shah Alam, Lahore, Pakistan',
  ntnNumber: '7654321-9',
  currencySymbol: 'Rs.',
  weeklyReminderDay: 'Monday',
  monthlyReminderDay: 1,
  autoSendEnabled: true,
  defaultPaymentTermsDays: 7,
  paymentChannels: {
    easyPaisa: {
      enabled: true,
      accountTitle: '100DAGAR / مدینہ مارکیٹ',
      accountNumber: '03125256266',
    },
    jazzCash: {
      enabled: true,
      accountTitle: '100DAGAR / مدینہ مارکیٹ',
      accountNumber: '03125256266',
    },
    sadaPay: {
      enabled: true,
      accountTitle: '100DAGAR Business',
      sadaTag: '@100dagar',
      accountNumber: '03125256266',
      iban: 'PK82SADA0000001234567890',
    },
    bankDetails: {
      enabled: true,
      bankName: 'Meezan Bank Ltd (Islamic Banking)',
      accountTitle: '100DAGAR Enterprises',
      accountNumber: '01020304050607',
      iban: 'PK36MEZN0001020304050607',
      branchName: 'Shah Alam Market Branch, Lahore',
    },
  },
  shippingPartner: {
    name: 'WASAL delivery',
    apiKey: 'SHIPDAY_API_KEY_LIVE_100D',
    shipperPhone: '0312 5256 266',
    helpline: '0312 5256 266',
    originAddress: 'Shop # 14, Madina Market (مدینہ مارکیٹ), Shah Alam, Lahore, Pakistan',
    enabled: true,
    autoSync: true,
  },
  adminPin: '580987', // USER DIRECTIVE: Owner default pin is 580987 and resettable in backend
};

// USER DIRECTIVE: Single pristine demo item with full pictures, sizes, specs & details!
export const defaultProducts: ProductItem[] = [
  {
    id: 'prod_1',
    name: '5-in-1 Hot Air Styler & Hair Dryer Brush',
    urduName: 'فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر ملٹی فنکشن',
    category: 'Cosmetics & Personal Care',
    sku: 'ELEC-HAIR-001',
    costPrice: 2250,
    marketPrice: 6980,
    ourPrice: 3490,
    stockQty: 80,
    minStockAlert: 10,
    salesCount: 25,
    totalRevenue: 87250,
    totalProfit: 31000,
    isWinningItem: true,
    badgeText: '-50%',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    pictures: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
    ],
    sizes: ['Standard 5-Head Salon Kit', 'Compact Travel Case Edition'],
    selectedSize: 'Standard 5-Head Salon Kit',
    specifications: {
      'Brand / Series': '100DAGAR Salon Series Pro 5-in-1',
      'Power Consumption': '1000W High Speed Ceramic Airflow Motor',
      'Voltage': '220V - 240V, 50/60Hz (Pak Standard)',
      'Attachments Included': 'Airwrap Barrel (Left & Right), Smoothing Dryer, Round Volumizing Brush, Pre-styling Nozzle',
      'Heat / Speed Levels': '3 Temperature Settings + Cool Shot Lock',
      'Cord Length': '1.8 Meter 360° Anti-Tangle Swivel Wire',
      'Material': 'Heat-Resistant ABS Shell + Negative Ion Tourmaline Ceramic',
      'Warranty': '6 Months Local Replacement Warranty',
      'Origin': 'Grade-A Wholesale Lot Import (Guaranteed Salon Quality)',
    },
    features: [
      'One-Step Hair Drying, Volumizing & Curling without Extreme Heat Damage',
      'Negative Ion Technology seals hair cuticles for instant frizz-free salon shine',
      'Includes 5 interchangeable brush attachments for straight, wavy, or bouncy curls',
      'Ergonomic lightweight grip designed for both personal grooming and wholesale salons',
    ],
    details:
      'The 100DAGAR 5-in-1 Hot Air Styler & Hair Dryer Brush is a complete hair styling salon in a single box. Engineered with aerodynamic Coanda-effect airflow, it shapes and curls hair automatically while drying. Retail market price is Rs. 6,980 across major stores; our direct wholesale lot rate is Rs. 3,490, giving customers an instant 50% cash saving.',
    websiteUrl: 'https://100dagar.pk/products/5-in-1-hot-air-styler',
    description: 'High-demand salon grade multi-head hair styling tool. High turnover wholesale lot with 50% instant savings.',
    createdAt: '2026-03-01',
  },
];

export const defaultCustomers: Customer[] = [
  {
    id: 'cust_1',
    name: 'Al-Madina Cosmetics & General Store',
    urduName: 'المدینہ کاسمیٹکس اینڈ جنرل اسٹور',
    customerType: 'retail',
    phone: '03001234567',
    email: 'madinastore@gmail.com',
    city: 'Lahore',
    area: 'Anarkali Bazaar',
    gender: 'male',
    ageGroup: '26-35',
    creditLimit: 5000, // USER DIRECTIVE: keep credit limit 5000 by default
    paymentTermsDays: 7, // USER DIRECTIVE: payment terms 7 days
    pin: '234567', // USER DIRECTIVE: Default 6-digit pin is last 6 digits of mobile number 03001234567
    notes: 'Regular wholesale buyer in Madina Market.',
    createdAt: '2026-02-15',
    balance: 17450,
    status: 'active',
    lastReminderSentAt: '2026-03-01',
    totalPurchases: 34900,
    ordersCount: 2,
    lastPurchaseAmount: 34900,
    lastPaidAmount: 17450, // USER DIRECTIVE: lucky draw is not total of purchase amount its to total of paid amount of last purchase items
    lastPurchaseDate: '2026-03-01',
  },
];

export const defaultTransactions: Transaction[] = [
  {
    id: 'tx_1',
    customerId: 'cust_1',
    type: 'credit',
    amount: 34900,
    paidAmount: 17450,
    dueBalance: 17450,
    saleType: 'partial',
    date: '2026-03-01',
    dueDate: '2026-03-08', // 7 days payment terms
    paymentTermsDays: 7,
    softReminderDate: '2026-03-05', // 3 days before terms day
    maxGraceDate: '2026-03-15', // 1 week after terms day
    invoiceNumber: 'INV-100D-001',
    notes: 'Sale: 5-in-1 Hot Air Styler (10x)',
    items: [
      {
        productId: 'prod_1',
        description: '5-in-1 Hot Air Styler & Hair Dryer Brush',
        quantity: 10,
        unitPrice: 3490,
        marketPrice: 6980,
        amount: 34900,
        customerSavings: 34900,
      },
    ],
    totalSavings: 34900,
    createdAt: '2026-03-01T10:30:00Z',
  },
];

export const defaultBroadcastContacts: BroadcastContact[] = [
  {
    id: 'contact_1',
    name: 'Chaudhry Bilal (Wholesale Retailer)',
    phone: '03019876543',
    city: 'Faisalabad',
    area: 'Katchery Bazaar',
    gender: 'male',
    ageGroup: '26-35',
    type: 'retail',
    notes: 'Retail chain with 3 shops in Faisalabad',
    createdAt: '2026-03-01',
  },
  {
    id: 'contact_2',
    name: 'Mrs. Saima Rashid (Boutique)',
    phone: '03456667788',
    city: 'Lahore',
    area: 'Gulberg III',
    gender: 'female',
    ageGroup: '26-35',
    type: 'individual',
    notes: 'Home boutique reselling cosmetics & fashion',
    createdAt: '2026-03-02',
  },
];

export const defaultSavedBroadcasts: SavedBroadcastCampaign[] = [
  {
    id: 'camp_1',
    title: '5-in-1 Hot Air Styler New Arrival Alert',
    productName: '5-in-1 Hot Air Styler & Hair Dryer Brush',
    productLink: 'https://100dagar.pk/products/5-in-1-hot-air-styler',
    messageText: '📢 New wholesale arrival available with 50% discount. Click link to order!',
    filters: {
      area: 'All Cities',
      ageGroup: 'All',
      gender: 'All',
      customerGroup: 'All Customers & Contacts',
    },
    recipientsCount: 3,
    sentCount: 3,
    sentAt: '2026-03-01T14:00:00Z',
    createdAt: '2026-03-01T14:00:00Z',
  },
];

export const defaultRecurringInvoices: RecurringInvoice[] = [
  {
    id: 'rec_1',
    customerId: 'cust_1',
    title: 'Bi-Weekly Fast Movers Restock',
    frequency: 'biweekly',
    items: [
      { description: '5-in-1 Hot Air Styler (10x)', quantity: 10, unitPrice: 3490, amount: 34900 },
    ],
    totalAmount: 34900,
    startDate: '2026-03-01',
    nextBillingDate: '2026-03-15',
    status: 'active',
    autoSendWhatsApp: true,
    createdAt: '2026-03-01T00:00:00Z',
  },
];

export const defaultWhatsAppNotifications: WhatsAppNotification[] = [];

export const defaultProductBroadcasts: ProductBroadcast[] = [
  {
    id: 'bcast_1',
    productName: '5-in-1 Hot Air Styler & Hair Dryer Brush',
    urduProductName: 'فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر',
    description: 'High demand salon grade styler in stock now. Market Price: Rs. 6,980. Our Wholesale: Rs. 3,490 only (-50% OFF).',
    price: 3490,
    productLink: 'https://100dagar.pk/products/5-in-1-hot-air-styler',
    createdAt: '2026-03-01',
  },
];

export const defaultReminderTemplates: ReminderTemplate[] = [
  {
    id: 'tpl_pre_due_soft',
    title: 'Soft Reminder 3 Days Before Due (نرم یاددہانی ۳ دن قبل)',
    titleUrdu: 'ادائیگی کی تاریخ سے ۳ دن پہلے نرم یاددہانی',
    type: 'pre_due_soft',
    content: `*Gentle Payment Notice (3 Days Notice) / قبل از وقت نرم یاد دہانی*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nامید ہے آپ خیریت سے ہوں گے۔ آپ کے کھاتے میں بل برائے رقم *{CURRENCY} {AMOUNT}* کی ادائیگی کی تاریخ *{DUE_DATE}* (آج سے ۳ دن بعد) ہے۔\n\nThis is a polite reminder that your invoice balance of *{CURRENCY} {AMOUNT}* is scheduled for payment on *{DUE_DATE}* (in 3 days).\n\n*Payment Channels / ادائیگی کے اکاؤنٹس:*\n{PAYMENT_CHANNELS}\n\nبروقت تعاون کے پیش نظر پیشگی شکریہ!`,
  },
  {
    id: 'tpl_due_today',
    title: 'Payment Due Today Alert (آج ادائیگی کی تاریخ ہے)',
    titleUrdu: 'آج ادائیگی کی تاریخ پر یاددہانی',
    type: 'due_today',
    content: `🔔 *Payment Due Today / آج ادائیگی کی آخری تاریخ ہے*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nآپ کے کھاتے میں واجب الادا رقم: *{CURRENCY} {AMOUNT}*\nآج ({DUE_DATE}) آپ کی ادائیگی کی آخری تاریخ ہے۔\n\nYour payment terms balance of *{CURRENCY} {AMOUNT}* is due today. Kindly transfer via EasyPaisa, JazzCash, or Bank.\n\n*Direct Accounts:*\n{PAYMENT_CHANNELS}\n\nادائیگی کے بعد اسی نمبر پر اسکرین شاٹ لازمی شیئر فرمائیں۔ جزاک اللہ!`,
  },
  {
    id: 'tpl_overdue_3days',
    title: 'Overdue Follow-up Every 3 Days (ہر ۳ دن بعد تاخیری نوٹس)',
    titleUrdu: 'ہر ۳ دن بعد تاخیری نوٹس تا وقتِ ادائیگی',
    type: 'overdue_3days',
    content: `⚠️ *Overdue Payment Notice ({DAYS_OVERDUE} Days Overdue) / واجب الادا بقایا جات نوٹس*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nآپ کا بل برائے رقم *{CURRENCY} {AMOUNT}* کی آخری تاریخ گزر چکی ہے اور یہ *{DAYS_OVERDUE} دن زائد المیعاد* ہو چکا ہے۔\n\nNotice: Your balance of *{CURRENCY} {AMOUNT}* is now {DAYS_OVERDUE} days overdue. Kindly settle this outstanding amount today to keep your supply chain and credit terms active.\n\n*Payment Accounts:*\n{PAYMENT_CHANNELS}\n\nفوری ادائیگی فرما کر کھاتہ کلیئر کریں۔ شکریہ!`,
  },
  {
    id: 'tpl_weekly_due',
    title: 'Weekly Due Balance Reminder (ہفتہ وار واجب الادا بل)',
    titleUrdu: 'ہفتہ وار واجب الادا رقم کی یاد دہانی',
    type: 'weekly_due',
    content: `*Weekly Due Payment Statement / ہفتہ وار واجب الادا یاد دہانی*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nآپ کے کھاتے میں موجودہ واجب الادا رقم: *{CURRENCY} {AMOUNT}*\nKindly clear your due balance for this week.\n\n*Payment Channels / ادائیگی کے ذرائع:*\n{PAYMENT_CHANNELS}\n\nبروقت ادائیگی پر آپ کے تعاون کے شکر گزار ہیں۔ جزاک اللہ!`,
  },
  {
    id: 'tpl_lucky_draw',
    title: 'Top Buyer Lucky Draw Winner (لکی ڈرا انعام مبارکباد)',
    titleUrdu: 'لکی ڈرا جیتنے پر مبارکباد کا واٹس ایپ پیغام',
    type: 'lucky_draw_winner',
    content: `🎉 *LUCKY DRAW WINNER ANNOUNCEMENT! / لکی ڈرا مبارکباد*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nبہت بہت مبارک ہو! آپ ہمارے *لکی ڈرا* میں فاتح قرار پائے ہیں! 🏆\n\n🎁 *Prize / انعام:* {PRODUCT_NAME}\n🎟️ *Winning Voucher Code / واؤچر کوڈ:* *{PRODUCT_LINK}*\n💰 *Voucher Reward Value:* {PRICE}\n\nآپ یہ واؤچر اپنے اگلے آرڈر پر کیش یا فلیٹ ڈسکاؤنٹ کے طور پر حاصل کر سکتے ہیں۔ 100DAGAR مدینہ مارکیٹ کے ساتھ جڑے رہنے کا بہت شکریہ!\nReply to this message to claim your reward voucher.`,
  },
  {
    id: 'tpl_product_broadcast',
    title: 'New Product Broadcast & Link (نئی پروڈکٹ اور لنک کا پیغام)',
    titleUrdu: 'تمام کسٹمرز کو نئی پروڈکٹ کی اطلاع',
    type: 'product_broadcast',
    content: `📢 *New Arrival & Wholesale Deal! / نئی پروڈکٹ کی آمد*\n*{BUSINESS_NAME}*\n\nمحترم کسٹمر، ہمارے پاس نیا اسٹاک آ گیا ہے!\n\n📦 *{PRODUCT_NAME}*\n📝 {PRODUCT_DESCRIPTION}\n💰 Wholesale Price: *{CURRENCY} {PRICE}*\n\n🔗 *Product Website Details / کیٹلاگ ویب سائٹ لنک:*\n{PRODUCT_LINK}\n\nآرڈر بک کروانے کے لیے اسی واٹس ایپ پر رابطہ کریں۔ محدود اسٹاک!\nFor instant booking, reply directly to this message.`,
  },
  {
    id: 'tpl_receipt',
    title: 'Payment Received Acknowledgment (ادائیگی کی وصولی رسید)',
    titleUrdu: 'رقم وصولی کی تصدیقی رسید',
    type: 'receipt_thanks',
    content: `✅ *Payment Received / رقم موصول ہو گئی ہے*\n*{BUSINESS_NAME}*\n\nمحترم {CUSTOMER_NAME} صاحب،\nہمیں آپ کی طرف سے *{CURRENCY} {AMOUNT}* بذریعہ {PAYMENT_MODE} موصول ہو گئے ہیں۔\n\nآپ کا باقی بقایا لیجر بیلنس: *{CURRENCY} {REMAINING_BALANCE}*\n\nThank you for your prompt payment! بروقت ادائیگی پر بہت شکریہ۔`,
  },
];

export const defaultLuckyDrawEvents: LuckyDrawEvent[] = [
  {
    id: 'lucky_demo_1',
    title: 'Grand Monthly Live Lucky Draw (ماہانہ لکی ڈرا)',
    date: '2026-03-01',
    totalParticipants: 1,
    status: 'conducted',
    upcomingItemGift: 'Wireless Smart Nano Mist Sprayer',
    winners: [
      {
        rank: 1,
        customerId: 'cust_1',
        customerName: 'Al-Madina Cosmetics & General Store',
        phone: '03001234567',
        prizeTitle: '1st Prize: 100% Discount Coupon Equal to Last Purchase (Top 10 Buyers Shuffle)',
        voucherCode: 'LUCKY-100D-TOP10-17450',
        discountValue: 'Rs. 17,450 (100% Paid Amount Coupon)',
        customerType: 'retail',
        lastPurchaseAmount: 34900,
        lastPaidAmount: 17450,
        categoryRule: '1st Prize: 100% coupon equal to amount of last purchase shuffled among Top 10 buyers of the previous month',
      },
      {
        rank: 2,
        customerId: 'cust_1',
        customerName: 'Al-Madina Cosmetics & General Store',
        phone: '03001234567',
        prizeTitle: '2nd Prize: 50% Coupon Code of Last Purchase (All Monthly Customers Shuffle)',
        voucherCode: 'LUCKY-100D-ALLMONTH-8725',
        discountValue: 'Rs. 8,725 (50% Coupon Code)',
        customerType: 'retail',
        lastPurchaseAmount: 34900,
        lastPaidAmount: 17450,
        categoryRule: '2nd Prize: 50% coupon code of last purchased amount randomly shuffled from all customers who shopped during last month',
      },
      {
        rank: 3,
        customerId: 'cust_1',
        customerName: 'Al-Madina Cosmetics & General Store',
        phone: '03001234567',
        prizeTitle: '3rd Prize: Rs. 500 Coupon Code for Product Review & Social Media Share',
        voucherCode: 'LUCKY-100D-REVIEW-500',
        discountValue: 'Rs. 500 Flat Coupon Code',
        customerType: 'retail',
        reviewPlatform: 'WhatsApp Status & Instagram',
        categoryRule: '3rd Prize: Rs. 500 coupon code for reviewing purchased item and sharing review or product on social media',
      },
    ],
    notes: 'Official 3-tier rules: 1st Prize: 100% coupon of last purchase among Top 10 buyers; 2nd Prize: 50% coupon of last purchase among all monthly buyers; 3rd Prize: Rs. 500 review & social share voucher.',
    createdAt: '2026-03-01T18:00:00Z',
  },
];

// COD ORDERS DEFAULT DATA
export const defaultCODOrders: CODOrder[] = [
  {
    id: 'cod_1',
    orderNumber: 'COD-100D-501',
    customerId: 'cust_1',
    customerName: 'Al-Madina Cosmetics & General Store',
    phone: '03001234567',
    city: 'Lahore',
    address: 'Shop # 12, Anarkali Market, Lahore',
    items: [
      {
        productId: 'prod_1',
        description: '5-in-1 Hot Air Styler & Hair Dryer Brush',
        quantity: 1,
        unitPrice: 3490,
        marketPrice: 6980,
        amount: 3490,
        customerSavings: 3490,
      },
    ],
    subtotal: 3490,
    deliveryFee: 250,
    totalAmount: 3740,
    courierPartner: 'WASAL delivery',
    trackingNumber: 'WSL-998822',
    status: 'dispatched',
    resellerCode: 'RES-100D-01',
    commissionAmount: 90, // Rs. 30 per Rs. 1000 on Rs. 3490
    notes: 'Urgent delivery requested via WASAL delivery',
    createdAt: '2026-03-02T10:00:00Z',
    dispatchedAt: '2026-03-02T14:30:00Z',
  },
  {
    id: 'cod_2',
    orderNumber: 'COD-100D-502',
    customerName: 'Haji Aslam (Retailer)',
    phone: '03217654321',
    city: 'Gujranwala',
    address: 'Rail Bazaar, Near Clock Tower, Gujranwala',
    items: [
      {
        productId: 'prod_1',
        description: '5-in-1 Hot Air Styler & Hair Dryer Brush',
        quantity: 2,
        unitPrice: 3490,
        marketPrice: 6980,
        amount: 6980,
        customerSavings: 6980,
      },
    ],
    subtotal: 6980,
    deliveryFee: 300,
    totalAmount: 7280,
    courierPartner: 'WASAL delivery',
    trackingNumber: 'WSL-12345678',
    status: 'pending',
    resellerCode: 'RES-100D-01',
    commissionAmount: 180, // Rs. 30 * 6 = 180
    notes: 'Call before dispatching parcel',
    createdAt: '2026-03-03T09:15:00Z',
  },
];

// HR EMPLOYEES DEFAULT DATA
export const defaultEmployees: Employee[] = [
  {
    id: 'emp_1',
    name: 'Asif Mehmood',
    urduName: 'آصف محمود',
    phone: '03009876541',
    cnic: '35201-1234567-1',
    role: 'manager',
    baseSalary: 45000,
    allowances: {
      medical: 5000,
      fuel: 8000,
      food: 6000,
      bonus: 3000,
    },
    joiningDate: '2025-01-15',
    status: 'active',
    notes: 'Store operations & wholesale accounts manager',
  },
  {
    id: 'emp_2',
    name: 'Salman Khan',
    urduName: 'سلمان خان',
    phone: '03224455667',
    cnic: '35202-9876543-3',
    role: 'cashier',
    baseSalary: 32000,
    allowances: {
      medical: 3000,
      fuel: 4000,
      food: 5000,
      bonus: 2000,
    },
    joiningDate: '2025-05-01',
    status: 'active',
    notes: 'POS billing and cash counter management',
  },
  {
    id: 'emp_3',
    name: 'Hamza Tariq',
    urduName: 'حمزہ طارق',
    phone: '03159988776',
    cnic: '35201-5544332-5',
    role: 'dispatcher',
    baseSalary: 28000,
    allowances: {
      medical: 2500,
      fuel: 3500,
      food: 5000,
      bonus: 1500,
    },
    joiningDate: '2025-08-10',
    status: 'active',
    notes: 'COD packaging, courier manifest and dispatch',
  },
  {
    id: 'emp_4',
    name: 'Kashif Ali',
    urduName: 'کاشف علی',
    phone: '03331122334',
    cnic: '35201-7788990-7',
    role: 'rider',
    baseSalary: 25000,
    allowances: {
      medical: 2000,
      fuel: 10000,
      food: 4000,
      bonus: 2000,
    },
    joiningDate: '2025-11-01',
    status: 'active',
    notes: 'Direct Lahore city rider delivery and cash collection',
  },
];

// HR ATTENDANCE DEFAULT DATA
export const defaultAttendance: AttendanceRecord[] = [
  {
    id: 'att_1',
    employeeId: 'emp_1',
    date: '2026-03-03',
    status: 'present',
    checkInTime: '09:00 AM',
  },
  {
    id: 'att_2',
    employeeId: 'emp_2',
    date: '2026-03-03',
    status: 'present',
    checkInTime: '09:10 AM',
  },
  {
    id: 'att_3',
    employeeId: 'emp_3',
    date: '2026-03-03',
    status: 'late',
    checkInTime: '09:45 AM',
    notes: 'Traffic delay on Ring Road',
  },
  {
    id: 'att_4',
    employeeId: 'emp_4',
    date: '2026-03-03',
    status: 'present',
    checkInTime: '08:55 AM',
  },
];

// RESELLERS DEFAULT DATA (Rs. 30 per Rs. 1,000 paid)
export const defaultResellers: Reseller[] = [
  {
    id: 'res_1',
    name: 'Usman Ghani',
    urduName: 'عثمان غنی (ری سیلر)',
    phone: '03125256266',
    city: 'Lahore',
    referralCode: 'RES-100D-01',
    paymentChannel: 'easypaisa',
    accountTitle: 'Usman Ghani',
    accountNumber: '03125256266',
    creditLimit: 25000,
    pin: '526266', // Default: last 6 digits of 03125256266
    totalReferredOrders: 5,
    totalSales: 34900,
    totalPaidSales: 20000,
    earnedCommission: 600, // 20 units of 1,000 * 30 = 600
    paidCommission: 300,
    status: 'active',
    createdAt: '2026-02-10',
  },
  {
    id: 'res_2',
    name: 'Syed Faizan Ali',
    urduName: 'سید فیضان علی (آن لائن ری سیلر)',
    phone: '03214567890',
    city: 'Karachi',
    referralCode: 'RES-100D-02',
    paymentChannel: 'jazzcash',
    accountTitle: 'Syed Faizan Ali',
    accountNumber: '03214567890',
    creditLimit: 25000,
    pin: '567890', // Default: last 6 digits of 03214567890
    totalReferredOrders: 3,
    totalSales: 17450,
    totalPaidSales: 17450,
    earnedCommission: 510, // 17 units * 30 = 510
    paidCommission: 0,
    status: 'active',
    createdAt: '2026-02-20',
  },
];

// REVIEW REWARDS DEFAULT DATA (Rs. 500 Coupon)
export const defaultReviewRewards: ReviewRewardSubmission[] = [
  {
    id: 'rev_1',
    customerId: 'cust_1',
    customerName: 'Al-Madina Cosmetics & General Store',
    phone: '03001234567',
    productName: '5-in-1 Hot Air Styler & Hair Dryer Brush',
    platform: 'whatsapp',
    reviewText: 'بہترین کوالٹی اور مارکیٹ سے 50 فیصد کم ریٹ پر مل گیا۔ گاہکوں کو بہت پسند آیا۔ 100DAGAR کا بہت شکریہ!',
    postLink: 'WhatsApp Status Screenshot Attached',
    status: 'approved',
    voucherCode: 'LUCKY-100D-REVIEW-500',
    discountAmount: 500,
    createdAt: '2026-03-01T15:00:00Z',
    approvedAt: '2026-03-01T16:00:00Z',
  },
];

// LOGIN AUDIT LOGS (Owner & Admin View)
export const defaultLoginAuditLogs: LoginAuditRecord[] = [
  {
    id: 'log_1',
    userName: 'Al-Haj Muhammad Asif',
    phone: '03125256266',
    role: 'admin',
    timestamp: '2026-03-02T09:15:00Z',
    status: 'success',
    ipOrDevice: 'Main Office Terminal (Lahore)',
    notes: 'Owner Master Login verified with PIN',
    usedPin: '••••••',
  },
  {
    id: 'log_2',
    userName: 'Al-Madina Cosmetics & General Store',
    phone: '03001234567',
    role: 'customer',
    timestamp: '2026-03-02T11:30:00Z',
    status: 'success',
    ipOrDevice: 'Mobile Web (Safari / iOS)',
    notes: 'Customer Mobile OTP/PIN Login',
    usedPin: '••••••',
  },
  {
    id: 'log_3',
    userName: 'Usman Ghani',
    phone: '03125256266',
    role: 'reseller',
    timestamp: '2026-03-02T14:45:00Z',
    status: 'success',
    ipOrDevice: 'Android Chrome (Karachi)',
    notes: 'Reseller Portal Login with PIN',
    usedPin: '••••••',
  },
];


