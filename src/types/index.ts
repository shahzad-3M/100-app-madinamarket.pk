export type TransactionType = 'credit' | 'debit'; // credit = You gave (Udhaar / Receivable), debit = You got (Jama / Payment received)

export type PaymentMode = 'cash' | 'easypaisa' | 'jazzcash' | 'sadapay' | 'bank_transfer' | 'cheque' | 'cod' | 'other';

export type CustomerType = 'individual' | 'retail';

export type GenderType = 'male' | 'female' | 'unspecified';

export type AgeGroupType = '18-25' | '26-35' | '36-50' | '50+';

export interface Customer {
  id: string;
  name: string;
  urduName?: string;
  customerType: CustomerType; // Individual or Retail Store
  phone: string;
  email?: string;
  address?: string;
  city?: string; // Area / City for broadcast segmentation
  area?: string;
  gender?: GenderType;
  ageGroup?: AgeGroupType;
  ntnNumber?: string; // National Tax Number in Pakistan
  cnic?: string; // Pakistani Computerized National Identity Card
  creditLimit: number;
  paymentTermsDays: number; // e.g. 7, 14, 21, 30 days
  pin?: string; // 6-digit security PIN (default: last 6 digits of mobile number)
  notes?: string;
  createdAt: string;
  balance: number; // positive: customer owes you (receivable); negative: you owe customer
  status: 'active' | 'archived';
  lastReminderSentAt?: string;
  totalPurchases?: number;
  ordersCount?: number;
  lastPurchaseAmount?: number;
  lastPaidAmount?: number; // Total paid amount of last purchase items (used for dynamic 1st prize in lucky draw)
  lastPurchaseDate?: string;
}

export type SalePaymentType = 'full' | 'partial' | 'time_credit' | 'cod';

export interface TransactionItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  marketPrice?: number;
  amount: number;
  customerSavings?: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  paidAmount?: number;
  dueBalance?: number;
  saleType?: SalePaymentType;
  date: string; // ISO date YYYY-MM-DD
  dueDate?: string; // ISO date YYYY-MM-DD
  paymentTermsDays?: number;
  softReminderDate?: string; // 3 days before dueDate
  maxGraceDate?: string; // 1 week after dueDate
  lastOverdueReminderSent?: string;
  invoiceNumber?: string;
  notes?: string;
  paymentMode?: PaymentMode;
  items?: TransactionItem[];
  totalSavings?: number; // Total amount saved by customer compared to market price
  createdAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  urduName?: string;
  category: string;
  sku: string;
  costPrice: number; // For wholesale profit calculation (hidden in customer view)
  marketPrice: number; // Retail market price (strike-through)
  ourPrice: number; // Our selling/wholesale price
  stockQty: number; // Inventory available
  minStockAlert: number; // Low stock threshold
  salesCount: number; // Units sold
  totalRevenue: number;
  totalProfit: number; // (ourPrice - costPrice) * salesCount (hidden in customer view)
  isWinningItem: boolean; // Winning item based on profit & velocity
  badgeText?: string; // e.g. '-50%', 'HOT DEAL', 'TOP SELLER'
  imageUrl?: string;
  pictures?: string[]; // Multiple high-res images / gallery
  sizes?: string[]; // Available sizes or dimensions (e.g. Standard, Small, Medium, Large)
  selectedSize?: string;
  specifications?: Record<string, string>; // Full specs (Material, Power, Voltage, Dimensions, Warranty, Origin)
  details?: string; // Comprehensive description
  features?: string[]; // Bulleted feature highlights
  websiteUrl?: string; // Link to see more details on external/store website
  sourceUrl?: string; // Imported from link
  description?: string;
  rating?: number;
  createdAt: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number; // ourPrice by default
  marketPrice: number;
  unitSavings: number; // marketPrice - ourPrice
  totalAmount: number;
  totalSavings: number; // unitSavings * quantity
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export interface RecurringInvoice {
  id: string;
  customerId: string;
  title: string;
  frequency: RecurringFrequency;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  totalAmount: number;
  startDate: string; // YYYY-MM-DD
  nextBillingDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string;
  status: 'active' | 'paused' | 'completed';
  autoSendWhatsApp: boolean;
  notes?: string;
  createdAt: string;
}

export type NotificationType =
  | 'scheduled_date'
  | 'weekly_due'
  | 'monthly_auto'
  | 'pre_due_soft' // Soft reminder 3 days before terms day
  | 'due_date' // Payment due today
  | 'overdue_3days' // Overdue reminder every 3 days until settled
  | 'payment_reminder'
  | 'product_broadcast'
  | 'recurring_invoice'
  | 'payment_receipt'
  | 'lucky_draw_winner';

export type NotificationStatus = 'pending' | 'sent' | 'cancelled';

export interface WhatsAppNotification {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  amount: number;
  dueDate?: string;
  scheduledFor: string; // YYYY-MM-DD
  type: NotificationType;
  status: NotificationStatus;
  messageText: string;
  sentAt?: string;
  notes?: string;
  createdAt: string;
  productLink?: string;
  voucherCode?: string;
  daysOverdue?: number;
}

export interface PakistaniPaymentChannels {
  easyPaisa: {
    enabled: boolean;
    accountTitle: string;
    accountNumber: string;
  };
  jazzCash: {
    enabled: boolean;
    accountTitle: string;
    accountNumber: string;
  };
  sadaPay: {
    enabled: boolean;
    accountTitle: string;
    sadaTag: string;
    accountNumber: string;
    iban?: string;
  };
  bankDetails: {
    enabled: boolean;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    branchName?: string;
  };
}

export interface ShippingPartnerSettings {
  name: string; // Default: 'WASAL delivery'
  apiKey: string; // Shipday API Key
  shipperPhone: string; // '0312 5256 266'
  helpline: string; // '0312 5256 266'
  originAddress: string;
  enabled: boolean;
  autoSync: boolean;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  ntnNumber: string;
  paymentChannels: PakistaniPaymentChannels;
  shippingPartner: ShippingPartnerSettings;
  currencySymbol: string; // 'Rs.'
  weeklyReminderDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  monthlyReminderDay: number; // e.g. 1st, 5th
  autoSendEnabled: boolean;
  defaultPaymentTermsDays: number;
  adminPin?: string; // Owner Master PIN (default: '580987', resettable in settings)
}

export interface ReminderTemplate {
  id: string;
  title: string;
  titleUrdu?: string;
  type:
    | 'weekly_due'
    | 'pre_due_soft'
    | 'due_today'
    | 'overdue'
    | 'overdue_3days'
    | 'monthly_statement'
    | 'invoice_new'
    | 'receipt_thanks'
    | 'product_broadcast'
    | 'lucky_draw_winner';
  content: string; // English + Urdu bilingual
}

export interface ProductBroadcast {
  id: string;
  productName: string;
  urduProductName?: string;
  urduName?: string;
  title?: string;
  description: string;
  price?: number;
  productLink: string;
  imageUrl?: string;
  targetArea?: string;
  targetAgeGroup?: string;
  targetGender?: string;
  createdAt: string;
}

export interface BroadcastContact {
  id: string;
  name: string;
  phone: string;
  city: string; // e.g. Lahore, Karachi, Rawalpindi
  area?: string; // e.g. Shah Alam, DHA, Saddar
  gender: GenderType;
  ageGroup: AgeGroupType;
  type: 'retail' | 'individual' | 'lead';
  notes?: string;
  createdAt: string;
}

export interface SavedBroadcastCampaign {
  id: string;
  title: string;
  productName: string;
  productLink?: string;
  messageText: string;
  filters: {
    area?: string;
    ageGroup?: string;
    gender?: string;
    customerGroup?: string;
  };
  recipientsCount: number;
  sentCount?: number;
  sentAt: string;
  createdAt: string;
}

export interface TopBuyer {
  customer: Customer;
  rank: number;
  totalPurchases: number;
  totalOrders: number;
  lastPurchaseAmount: number;
  lastPaidAmount: number; // Total paid amount of last purchase items (used for 1st prize)
  luckyDrawTokens: number;
  isRetail: boolean;
}

export interface LuckyDrawWinner {
  rank: 1 | 2 | 3;
  customerId: string;
  customerName: string;
  phone: string;
  prizeTitle: string;
  voucherCode: string;
  discountValue: string;
  customerType: CustomerType;
  lastPurchaseAmount?: number;
  lastPaidAmount?: number; // Total paid amount of last purchase items
  categoryRule: string; // 1st: 100% of last purchase among top 10 buyers; 2nd: 50% among all monthly buyers; 3rd: Rs. 500 social review
  reviewPlatform?: string;
  isUpcomingGift?: boolean;
}

export interface LuckyDrawEvent {
  id: string;
  title: string;
  date: string;
  totalParticipants: number;
  winners: LuckyDrawWinner[];
  upcomingItemGift?: string;
  status: 'conducted' | 'notified';
  notes?: string;
  createdAt: string;
}

export interface MonthlyCustomerStatement {
  customer: Customer;
  month: number; // 1-12
  year: number; // e.g. 2026
  monthName: string; // e.g. 'March 2026'
  totalPurchases: number;
  totalPaid: number;
  closingBalance: number;
  totalSavings: number;
  transactions: Transaction[];
  invoicesCount: number;
  luckyDrawWinnings?: {
    hasWon: boolean;
    rank?: 1 | 2 | 3;
    prizeTitle?: string;
    voucherCode?: string;
    discountValue?: string;
    winningAmount?: number;
  };
}

// USER ROLES & PERMISSIONS
export type UserRole = 'admin' | 'manager' | 'reseller' | 'customer';

export interface AppUser {
  id: string;
  name: string;
  urduName?: string;
  role: UserRole;
  phone: string;
  resellerCode?: string;
  customerId?: string;
  mustChangePassword?: boolean;
  hasDefaultPin?: boolean;
}

// CASH ON DELIVERY (COD) ORDERS MANAGEMENT
export type CODOrderStatus = 'pending' | 'dispatched' | 'delivered' | 'returned';

export interface CODOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  items: TransactionItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  courierPartner: 'WASAL delivery' | 'TCS' | 'Leopards' | 'Trax' | 'PostEx' | 'Rider' | 'Self';
  trackingNumber?: string;
  status: CODOrderStatus;
  resellerCode?: string;
  commissionAmount?: number;
  notes?: string;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
}

// HR HIRING, ALLOWANCES & ATTENDANCE
export type EmployeeRole = 'manager' | 'cashier' | 'dispatcher' | 'rider' | 'warehouse_staff';

export interface EmployeeAllowances {
  medical: number;
  fuel: number;
  food: number;
  bonus: number;
}

export interface Employee {
  id: string;
  name: string;
  urduName?: string;
  phone: string;
  cnic: string;
  role: EmployeeRole;
  baseSalary: number;
  allowances: EmployeeAllowances;
  joiningDate: string;
  status: 'active' | 'on_leave' | 'resigned';
  notes?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
}

// RESELLER ACCOUNTS (Rs. 30 per Rs. 1000 Paid)
export interface Reseller {
  id: string;
  name: string;
  urduName?: string;
  phone: string;
  city: string;
  referralCode: string; // e.g. RES-100D-01
  paymentChannel: 'easypaisa' | 'jazzcash' | 'sadapay' | 'bank' | 'cash';
  accountTitle: string;
  accountNumber: string;
  creditLimit: number; // Rs. 25,000 default credit limit
  currentCreditUsed?: number;
  totalReferredOrders: number;
  totalSales: number;
  totalPaidSales: number;
  earnedCommission: number; // Rs. 30 per 1000 on paid amount
  paidCommission: number;
  pin?: string; // 6-digit PIN (default: last 6 digits of phone)
  status: 'active' | 'inactive';
  createdAt: string;
}

// SOCIAL MEDIA REVIEW FOR RS. 500 COUPON
export interface ReviewRewardSubmission {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  productName: string;
  platform: 'whatsapp' | 'facebook' | 'tiktok' | 'instagram';
  reviewText: string;
  postLink?: string;
  status: 'pending' | 'approved' | 'rejected';
  voucherCode?: string;
  discountAmount: number; // 500
  createdAt: string;
  approvedAt?: string;
}

// LOGIN SECURITY & AUDIT RECORD
export interface LoginAuditRecord {
  id: string;
  userId?: string;
  userName: string;
  phone: string;
  role: UserRole;
  timestamp: string; // ISO string
  status: 'success' | 'failed';
  ipOrDevice?: string;
  notes?: string;
  usedPin?: string;
}


