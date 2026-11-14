import {
  BroadcastContact,
  BusinessProfile,
  Customer,
  LuckyDrawEvent,
  LuckyDrawWinner,
  MonthlyCustomerStatement,
  ProductBroadcast,
  RecurringInvoice,
  ReminderTemplate,
  TopBuyer,
  Transaction,
  WhatsAppNotification,
} from '../types';
import { formatPaymentChannelsText, formatTemplateMessage } from './whatsapp';

export interface AutomationResult {
  generatedInvoicesCount: number;
  newTransactions: Transaction[];
  updatedRecurringInvoices: RecurringInvoice[];
  newNotifications: WhatsAppNotification[];
  scheduledAlertsDueCount: number;
}

export function runRecurringInvoicesCheck(
  recurringInvoices: RecurringInvoice[],
  customers: Customer[],
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  currentDateStr: string = new Date().toISOString().split('T')[0]
): AutomationResult {
  const newTransactions: Transaction[] = [];
  const updatedRecurringInvoices: RecurringInvoice[] = [];
  const newNotifications: WhatsAppNotification[] = [];
  let generatedInvoicesCount = 0;

  const invoiceTemplate = templates.find((t) => t.type === 'invoice_new') || templates[0];
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));
  const paymentChannelsText = formatPaymentChannelsText(profile);

  recurringInvoices.forEach((rec) => {
    if (rec.status !== 'active') {
      updatedRecurringInvoices.push(rec);
      return;
    }

    if (rec.nextBillingDate <= currentDateStr) {
      const customer = customerMap.get(rec.customerId);
      const invoiceNumber = `INV-100D-R${Math.floor(1000 + Math.random() * 9000)}`;
      const termsDays = customer?.paymentTermsDays || profile.defaultPaymentTermsDays || 14;

      const dueDateObj = new Date(currentDateStr);
      dueDateObj.setDate(dueDateObj.getDate() + termsDays);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      // Soft reminder 3 days before terms day
      const softDateObj = new Date(dueDateStr);
      softDateObj.setDate(softDateObj.getDate() - 3);
      const softReminderDate = softDateObj.toISOString().split('T')[0];

      // Max 1 week grace date
      const graceDateObj = new Date(dueDateStr);
      graceDateObj.setDate(graceDateObj.getDate() + 7);
      const maxGraceDate = graceDateObj.toISOString().split('T')[0];

      // 1. Create Transaction
      const tx: Transaction = {
        id: `tx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId: rec.customerId,
        type: 'credit',
        amount: rec.totalAmount,
        dueBalance: rec.totalAmount,
        paidAmount: 0,
        saleType: 'time_credit',
        date: currentDateStr,
        dueDate: dueDateStr,
        paymentTermsDays: termsDays,
        softReminderDate,
        maxGraceDate,
        invoiceNumber,
        notes: `Auto-generated recurring contract bill: ${rec.title}`,
        items: rec.items,
        createdAt: new Date().toISOString(),
      };
      newTransactions.push(tx);
      generatedInvoicesCount++;

      // 2. Advance nextBillingDate
      const nextDate = new Date(rec.nextBillingDate);
      if (rec.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (rec.frequency === 'biweekly') {
        nextDate.setDate(nextDate.getDate() + 14);
      } else if (rec.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (rec.frequency === 'quarterly') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      }

      const nextBillingDateStr = nextDate.toISOString().split('T')[0];

      updatedRecurringInvoices.push({
        ...rec,
        lastGeneratedDate: currentDateStr,
        nextBillingDate: nextBillingDateStr,
      });

      // 3. Queue WhatsApp Notification
      if (rec.autoSendWhatsApp && customer) {
        const msg = formatTemplateMessage(invoiceTemplate.content, {
          customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
          amount: rec.totalAmount,
          currency: profile.currencySymbol,
          dueDate: dueDateStr,
          businessName: profile.name,
          paymentChannelsText,
          invoiceNo: invoiceNumber,
          invoiceTitle: rec.title,
        });

        newNotifications.push({
          id: `notif_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          amount: rec.totalAmount,
          dueDate: dueDateStr,
          scheduledFor: currentDateStr,
          type: 'recurring_invoice',
          status: 'pending',
          messageText: msg,
          notes: `Recurring Invoice Generated for ${rec.title}`,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      updatedRecurringInvoices.push(rec);
    }
  });

  return {
    generatedInvoicesCount,
    newTransactions,
    updatedRecurringInvoices,
    newNotifications,
    scheduledAlertsDueCount: newNotifications.length,
  };
}

// PAYMENT TERMS ALERT ENGINE:
// 1. Soft reminder 3 days before terms day
// 2. Due date alert on payment terms day (maximum 1 week grace period)
// 3. Every 3 days after overdue day until payment is settled
export function generatePaymentTermsAlertsBatch(
  transactions: Transaction[],
  customers: Customer[],
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  targetDate: string = new Date().toISOString().split('T')[0]
): WhatsAppNotification[] {
  const notifications: WhatsAppNotification[] = [];
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const softTpl = templates.find((t) => t.type === 'pre_due_soft') || templates[0];
  const dueTodayTpl = templates.find((t) => t.type === 'due_today') || templates[0];
  const overdue3DaysTpl = templates.find((t) => t.type === 'overdue_3days') || templates[0];
  const paymentChannelsText = formatPaymentChannelsText(profile);

  const todayObj = new Date(targetDate);
  todayObj.setHours(0, 0, 0, 0);

  // Group by customer or scan credit transactions with due balance (exclude COD & fully paid sales)
  transactions
    .filter(
      (tx) =>
        tx.type === 'credit' &&
        (tx.dueBalance === undefined ? tx.amount > 0 : tx.dueBalance > 0) &&
        Boolean(tx.dueDate) &&
        tx.saleType !== 'cod' &&
        tx.saleType !== 'full'
    )
    .forEach((tx) => {
      const customer = customerMap.get(tx.customerId);
      if (!customer || customer.status !== 'active') return;

      const dueObj = new Date(tx.dueDate!);
      dueObj.setHours(0, 0, 0, 0);

      const diffMs = dueObj.getTime() - todayObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)); // >0: days before due, 0: due today, <0: overdue

      const unpaidAmount = tx.dueBalance !== undefined ? tx.dueBalance : tx.amount;
      if (unpaidAmount <= 0) return;

      const maxGraceStr =
        tx.maxGraceDate ||
        (() => {
          const g = new Date(tx.dueDate!);
          g.setDate(g.getDate() + 7);
          return g.toISOString().split('T')[0];
        })();

      // Condition 1: Soft reminder before 3 days
      if (diffDays === 3) {
        const msg = formatTemplateMessage(softTpl.content, {
          customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
          amount: unpaidAmount,
          currency: profile.currencySymbol,
          dueDate: tx.dueDate,
          businessName: profile.name,
          paymentChannelsText,
          paymentTerms: tx.paymentTermsDays || customer.paymentTermsDays || 7,
          invoiceNo: tx.invoiceNumber,
        });

        notifications.push({
          id: `notif_soft_${tx.id}_${targetDate}`,
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          amount: unpaidAmount,
          dueDate: tx.dueDate,
          scheduledFor: targetDate,
          type: 'pre_due_soft',
          status: 'pending',
          messageText: msg,
          notes: `Soft reminder (3 days before due): Rs. ${unpaidAmount.toLocaleString('en-PK')} due on ${tx.dueDate}`,
          createdAt: new Date().toISOString(),
        });
      }
      // Condition 2: Due Date Payment Alert (1 week max grace)
      else if (diffDays === 0) {
        const msg = formatTemplateMessage(dueTodayTpl.content, {
          customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
          amount: unpaidAmount,
          currency: profile.currencySymbol,
          dueDate: tx.dueDate,
          businessName: profile.name,
          paymentChannelsText,
          paymentTerms: tx.paymentTermsDays || customer.paymentTermsDays || 7,
          invoiceNo: tx.invoiceNumber,
        });

        notifications.push({
          id: `notif_today_${tx.id}_${targetDate}`,
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          amount: unpaidAmount,
          dueDate: tx.dueDate,
          scheduledFor: targetDate,
          type: 'due_date',
          status: 'pending',
          messageText: msg,
          notes: `Due Date Alert: Invoice #${tx.invoiceNumber || 'INV'} due today! 1 week max grace ends ${maxGraceStr}.`,
          createdAt: new Date().toISOString(),
        });
      }
      // Condition 3: Overdue reminder every 3 days until settled
      else if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        if (daysOverdue > 0 && daysOverdue % 3 === 0) {
          const msg = formatTemplateMessage(overdue3DaysTpl.content, {
            customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
            amount: unpaidAmount,
            currency: profile.currencySymbol,
            dueDate: tx.dueDate,
            daysOverdue,
            businessName: profile.name,
            paymentChannelsText,
            paymentTerms: tx.paymentTermsDays || customer.paymentTermsDays || 7,
            invoiceNo: tx.invoiceNumber,
          });

          notifications.push({
            id: `notif_ovd3_${tx.id}_${daysOverdue}d_${targetDate}`,
            customerId: customer.id,
            customerName: customer.name,
            phone: customer.phone,
            amount: unpaidAmount,
            dueDate: tx.dueDate,
            daysOverdue,
            scheduledFor: targetDate,
            type: 'overdue_3days',
            status: 'pending',
            messageText: msg,
            notes: `Overdue reminder (every 3 days until settled): ${daysOverdue} days overdue (grace end ${maxGraceStr})`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

  return notifications;
}

// WEEKLY REMINDER FOR ONLY DUE PAYMENTS (balance > 0)
export function generateWeeklyDueRemindersBatch(
  customers: Customer[],
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  targetDate: string = new Date().toISOString().split('T')[0]
): WhatsAppNotification[] {
  const weeklyTemplate = templates.find((t) => t.type === 'weekly_due') || templates[0];
  const paymentChannelsText = formatPaymentChannelsText(profile);
  const notifications: WhatsAppNotification[] = [];

  const dueCustomers = customers.filter(
    (c) => c.status === 'active' && c.balance > 0
  );

  dueCustomers.forEach((customer) => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 7);
    const dueDateStr = nextDue.toISOString().split('T')[0];

    const msg = formatTemplateMessage(weeklyTemplate.content, {
      customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
      amount: customer.balance,
      currency: profile.currencySymbol,
      dueDate: dueDateStr,
      businessName: profile.name,
      paymentChannelsText,
      paymentTerms: customer.paymentTermsDays || 7,
    });

    notifications.push({
      id: `notif_w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      dueDate: dueDateStr,
      scheduledFor: targetDate,
      type: 'weekly_due',
      status: 'pending',
      messageText: msg,
      notes: `Weekly due payment reminder (صرف واجب الادا) for Rs. ${customer.balance.toLocaleString('en-PK')}`,
      createdAt: new Date().toISOString(),
    });
  });

  return notifications;
}

// MONTHLY DUE NOTICES BATCH
export function generateMonthlyRemindersBatch(
  customers: Customer[],
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  targetDate: string = new Date().toISOString().split('T')[0]
): WhatsAppNotification[] {
  const statementTemplate = templates.find((t) => t.type === 'monthly_statement') || templates[0];
  const paymentChannelsText = formatPaymentChannelsText(profile);
  const notifications: WhatsAppNotification[] = [];

  customers.forEach((customer) => {
    if (customer.balance > 0 && customer.status === 'active') {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + (customer.paymentTermsDays || 14));
      const dueDateStr = nextDue.toISOString().split('T')[0];

      const msg = formatTemplateMessage(statementTemplate.content, {
        customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
        amount: customer.balance,
        currency: profile.currencySymbol,
        dueDate: dueDateStr,
        businessName: profile.name,
        paymentChannelsText,
        paymentTerms: customer.paymentTermsDays,
      });

      notifications.push({
        id: `notif_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        amount: customer.balance,
        dueDate: dueDateStr,
        scheduledFor: targetDate,
        type: 'monthly_auto',
        status: 'pending',
        messageText: msg,
        notes: `Monthly statement run for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return notifications;
}

// BROADCAST NEW PRODUCT/THING WITH LINK TO ALL CUSTOMERS
export function generateProductBroadcastBatch(
  product: ProductBroadcast,
  customers: Customer[],
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  targetDate: string = new Date().toISOString().split('T')[0]
): WhatsAppNotification[] {
  const broadcastTemplate = templates.find((t) => t.type === 'product_broadcast') || templates[0];
  const notifications: WhatsAppNotification[] = [];

  customers
    .filter((c) => c.status === 'active')
    .forEach((customer) => {
      const msg = formatTemplateMessage(broadcastTemplate.content, {
        customerName: customer.name + (customer.urduName ? ` (${customer.urduName})` : ''),
        amount: 0,
        currency: profile.currencySymbol,
        businessName: profile.name,
        productName: product.productName + (product.urduName ? ` / ${product.urduName}` : ''),
        productDescription: product.description,
        price: product.price,
        productLink: product.productLink,
      });

      notifications.push({
        id: `notif_bc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        amount: product.price || 0,
        scheduledFor: targetDate,
        type: 'product_broadcast',
        status: 'pending',
        messageText: msg,
        productLink: product.productLink,
        notes: `Product Broadcast: ${product.productName}`,
        createdAt: new Date().toISOString(),
      });
    });

  return notifications;
}

export interface BroadcastSegmentFilters {
  area?: string;
  ageGroup?: string;
  gender?: string;
  group?: string;
  includeCustomers?: boolean;
  includeManualContacts?: boolean;
}

// SEGMENTED BROADCAST (AREA-WISE, AGE-WISE, GENDER-WISE, GROUP-WISE + MANUAL CONTACTS)
export function generateSegmentedBroadcastBatch(
  product: ProductBroadcast,
  customers: Customer[],
  manualContacts: BroadcastContact[],
  filters: BroadcastSegmentFilters,
  profile: BusinessProfile,
  templates: ReminderTemplate[],
  targetDate: string = new Date().toISOString().split('T')[0]
): WhatsAppNotification[] {
  const broadcastTemplate = templates.find((t) => t.type === 'product_broadcast') || templates[0];
  const notifications: WhatsAppNotification[] = [];
  const seenPhones = new Set<string>();

  const matchesFilter = (
    cityOrArea: string | undefined,
    ageGroup: string | undefined,
    gender: string | undefined,
    group: string | undefined
  ) => {
    // Area filter
    if (filters.area && filters.area !== 'all') {
      const areaVal = (cityOrArea || '').toLowerCase();
      const targetArea = filters.area.toLowerCase();
      if (!areaVal.includes(targetArea) && !targetArea.includes(areaVal)) {
        return false;
      }
    }
    // Age group filter
    if (filters.ageGroup && filters.ageGroup !== 'all') {
      if (ageGroup !== filters.ageGroup) {
        return false;
      }
    }
    // Gender filter
    if (filters.gender && filters.gender !== 'all') {
      if (gender !== filters.gender) {
        return false;
      }
    }
    // Group filter
    if (filters.group && filters.group !== 'all') {
      if (group !== filters.group) {
        return false;
      }
    }
    return true;
  };

  // 1. Process regular customers if enabled
  if (filters.includeCustomers !== false) {
    customers
      .filter((c) => c.status === 'active')
      .forEach((cust) => {
        const areaStr = [cust.city, cust.area].filter(Boolean).join(' ');
        if (!matchesFilter(areaStr, cust.ageGroup, cust.gender, cust.customerType)) {
          return;
        }

        const cleanPhone = cust.phone.replace(/\D/g, '');
        if (seenPhones.has(cleanPhone)) return;
        seenPhones.add(cleanPhone);

        const msg = formatTemplateMessage(broadcastTemplate.content, {
          customerName: cust.name + (cust.urduName ? ` (${cust.urduName})` : ''),
          amount: 0,
          currency: profile.currencySymbol,
          businessName: profile.name,
          productName: product.productName + (product.urduName ? ` / ${product.urduName}` : ''),
          productDescription: product.description,
          price: product.price,
          productLink: product.productLink,
        });

        notifications.push({
          id: `notif_bc_cust_${cust.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          customerId: cust.id,
          customerName: cust.name,
          phone: cust.phone,
          amount: product.price || 0,
          scheduledFor: targetDate,
          type: 'product_broadcast',
          status: 'pending',
          messageText: msg,
          productLink: product.productLink,
          notes: `Broadcast to ${cust.name} [${cust.city || 'City'} | ${cust.customerType}]`,
          createdAt: new Date().toISOString(),
        });
      });
  }

  // 2. Process manual broadcast contacts if enabled
  if (filters.includeManualContacts !== false) {
    manualContacts.forEach((contact) => {
      const areaStr = [contact.city, contact.area].filter(Boolean).join(' ');
      if (!matchesFilter(areaStr, contact.ageGroup, contact.gender, contact.type)) {
        return;
      }

      const cleanPhone = contact.phone.replace(/\D/g, '');
      if (seenPhones.has(cleanPhone)) return;
      seenPhones.add(cleanPhone);

      const msg = formatTemplateMessage(broadcastTemplate.content, {
        customerName: contact.name,
        amount: 0,
        currency: profile.currencySymbol,
        businessName: profile.name,
        productName: product.productName + (product.urduName ? ` / ${product.urduName}` : ''),
        productDescription: product.description,
        price: product.price,
        productLink: product.productLink,
      });

      notifications.push({
        id: `notif_bc_man_${contact.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        customerId: `contact_${contact.id}`,
        customerName: contact.name,
        phone: contact.phone,
        amount: product.price || 0,
        scheduledFor: targetDate,
        type: 'product_broadcast',
        status: 'pending',
        messageText: msg,
        productLink: product.productLink,
        notes: `Broadcast to Manual Lead ${contact.name} [${contact.city} | ${contact.type}]`,
        createdAt: new Date().toISOString(),
      });
    });
  }

  return notifications;
}

// COMPUTE TOP 3 BUYERS FOR LUCKY DRAW (tracking paid amount of last purchase items)
export function computeTopBuyers(
  customers: Customer[],
  transactions: Transaction[]
): TopBuyer[] {
  const purchasesMap = new Map<string, number>();
  const ordersMap = new Map<string, number>();
  const lastPurchaseMap = new Map<string, number>();
  const lastPaidMap = new Map<string, number>();

  // Sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sorted
    .filter((tx) => tx.type === 'credit')
    .forEach((tx) => {
      const prevPurchases = purchasesMap.get(tx.customerId) || 0;
      const prevOrders = ordersMap.get(tx.customerId) || 0;
      purchasesMap.set(tx.customerId, prevPurchases + tx.amount);
      ordersMap.set(tx.customerId, prevOrders + 1);
      lastPurchaseMap.set(tx.customerId, tx.amount);
      const paid = tx.paidAmount !== undefined ? tx.paidAmount : (tx.dueBalance === 0 ? tx.amount : 0);
      lastPaidMap.set(tx.customerId, paid);
    });

  const buyers: TopBuyer[] = customers
    .filter((c) => c.status === 'active')
    .map((cust) => {
      const totalPurchases = purchasesMap.get(cust.id) || cust.totalPurchases || 0;
      const totalOrders = ordersMap.get(cust.id) || cust.ordersCount || 1;
      const lastPurchaseAmount = lastPurchaseMap.get(cust.id) || cust.lastPurchaseAmount || totalPurchases || 5000;
      const lastPaidAmount = lastPaidMap.get(cust.id) ?? cust.lastPaidAmount ?? (totalPurchases ? Math.max(0, totalPurchases - (cust.balance || 0)) : 17450);
      // 1 lucky draw token for every Rs. 10,000 spent
      const tokens = Math.max(1, Math.floor(totalPurchases / 10000));

      return {
        customer: cust,
        rank: 0,
        totalPurchases,
        totalOrders,
        lastPurchaseAmount,
        lastPaidAmount: lastPaidAmount > 0 ? lastPaidAmount : lastPurchaseAmount,
        luckyDrawTokens: tokens,
        isRetail: cust.customerType === 'retail',
      };
    })
    .sort((a, b) => b.totalPurchases - a.totalPurchases);

  // Assign ranks
  buyers.forEach((b, index) => {
    b.rank = index + 1;
  });

  return buyers;
}

// CONDUCT LUCKY DRAW ACCORDING TO USER DIRECTIVE:
// 1st Prize: 100% coupon equal to amount of last purchase shuffled among Top 10 buyers of previous month.
// 2nd Prize: 50% coupon code of last purchased amount randomly shuffled from all customers who shopped during last month.
// 3rd Prize: Rs. 500 coupon code for reviewing purchased item and sharing review or our product on their social media.
export function conductLuckyDraw(
  topBuyers: TopBuyer[],
  allCustomers: Customer[] = [],
  title: string = 'Grand Monthly Live Lucky Draw (ماہانہ لکی ڈرا)'
): LuckyDrawEvent {
  const winners: LuckyDrawWinner[] = [];

  // Filter Top 10 Buyers of previous month
  const top10 = topBuyers.slice(0, Math.min(10, topBuyers.length));
  // Pick random winner among top 10 for 1st prize
  const winner1Candidate = top10.length > 0
    ? top10[Math.floor(Math.random() * top10.length)]
    : undefined;

  if (winner1Candidate) {
    const lastPurchaseAmt = winner1Candidate.lastPaidAmount || winner1Candidate.lastPurchaseAmount || 17450;
    winners.push({
      rank: 1,
      customerId: winner1Candidate.customer.id,
      customerName: winner1Candidate.customer.name,
      phone: winner1Candidate.customer.phone,
      prizeTitle: `1st Prize: 100% Discount Coupon Equal to Last Purchase (Rs. ${lastPurchaseAmt.toLocaleString('en-PK')})`,
      voucherCode: `LUCKY-100D-TOP10-${Math.floor(1000 + Math.random() * 9000)}`,
      discountValue: `Rs. ${lastPurchaseAmt.toLocaleString('en-PK')} (100% Coupon Code)`,
      customerType: winner1Candidate.customer.customerType,
      lastPurchaseAmount: winner1Candidate.lastPurchaseAmount,
      lastPaidAmount: lastPurchaseAmt,
      categoryRule: '1st Prize: 100% coupon equal to amount of last purchase shuffled among Top 10 buyers of the previous month',
    });
  }

  // 2nd Prize: Random shuffle from all customers who shopped during last month, amount is 50% of last purchased amount coupon code
  const monthlyShoppers = topBuyers.filter((b) => b.totalPurchases > 0);
  const eligibleFor2nd = monthlyShoppers.length > 1
    ? monthlyShoppers.filter((b) => b.customer.id !== winner1Candidate?.customer.id)
    : monthlyShoppers;
  const winner2Candidate = eligibleFor2nd.length > 0
    ? eligibleFor2nd[Math.floor(Math.random() * eligibleFor2nd.length)]
    : winner1Candidate;

  if (winner2Candidate) {
    const baseAmt = winner2Candidate.lastPaidAmount || winner2Candidate.lastPurchaseAmount || 17450;
    const fiftyPercentVal = Math.round(baseAmt * 0.5);
    winners.push({
      rank: 2,
      customerId: winner2Candidate.customer.id,
      customerName: winner2Candidate.customer.name,
      phone: winner2Candidate.customer.phone,
      prizeTitle: `2nd Prize: 50% Coupon Code of Last Purchased Amount (Rs. ${fiftyPercentVal.toLocaleString('en-PK')})`,
      voucherCode: `LUCKY-100D-ALLMONTH-${Math.floor(1000 + Math.random() * 9000)}`,
      discountValue: `Rs. ${fiftyPercentVal.toLocaleString('en-PK')} (50% Coupon Code)`,
      customerType: winner2Candidate.customer.customerType,
      lastPurchaseAmount: winner2Candidate.lastPurchaseAmount,
      lastPaidAmount: baseAmt,
      categoryRule: '2nd Prize: 50% coupon code of last purchased amount randomly shuffled from all customers who shopped during last month',
    });
  }

  // 3rd Prize: Rs. 500 coupon code for reviewing purchased item and sharing review or product on their social media
  const winner3Candidate = topBuyers.length > 2
    ? topBuyers[Math.floor(Math.random() * topBuyers.length)]
    : (winner1Candidate || topBuyers[0]);

  if (winner3Candidate) {
    winners.push({
      rank: 3,
      customerId: winner3Candidate.customer.id,
      customerName: winner3Candidate.customer.name,
      phone: winner3Candidate.customer.phone,
      prizeTitle: `3rd Prize: Rs. 500 Coupon Code for Product Review & Social Media Share`,
      voucherCode: `LUCKY-100D-REVIEW-${Math.floor(100 + Math.random() * 900)}`,
      discountValue: `Rs. 500 Flat Coupon Code`,
      customerType: winner3Candidate.customer.customerType,
      reviewPlatform: 'WhatsApp Status / Facebook / TikTok / Instagram',
      categoryRule: '3rd Prize: Rs. 500 coupon code for review on purchased item and sharing review or our product on social media',
    });
  }

  return {
    id: `lucky_${Date.now()}`,
    title,
    date: new Date().toISOString().split('T')[0],
    totalParticipants: topBuyers.length,
    winners,
    status: 'conducted',
    notes: 'Official Draw: 1st Prize = 100% coupon of last purchase among Top 10 buyers; 2nd Prize = 50% coupon among all monthly buyers; 3rd Prize = Rs. 500 social media review voucher.',
    createdAt: new Date().toISOString(),
  };
}

// GENERATE MONTHLY STATEMENTS FOR ALL CUSTOMERS WHO PURCHASED IN ENTIRE MONTH
// USER DIRECTIVE: "keep monthly statement for all customers who purchase in entire month and if get wining amount"
export function generateMonthlyCustomerStatements(
  customers: Customer[],
  transactions: Transaction[],
  luckyDraws: LuckyDrawEvent[],
  targetMonth: number = new Date().getMonth() + 1, // 1 - 12
  targetYear: number = new Date().getFullYear()
): MonthlyCustomerStatement[] {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNameStr = `${monthNames[targetMonth - 1]} ${targetYear}`;

  // Filter transactions belonging to this month and year
  const monthlyTxs = transactions.filter((tx) => {
    if (!tx.date) return false;
    const d = new Date(tx.date);
    return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
  });

  // Group by customer
  const customerTxsMap = new Map<string, Transaction[]>();
  monthlyTxs.forEach((tx) => {
    const list = customerTxsMap.get(tx.customerId) || [];
    list.push(tx);
    customerTxsMap.set(tx.customerId, list);
  });

  // Identify lucky draw winners in this month
  const monthlyDrawWinnersMap = new Map<string, LuckyDrawWinner>();
  luckyDraws
    .filter((draw) => {
      if (!draw.date) return false;
      const d = new Date(draw.date);
      return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
    })
    .forEach((draw) => {
      draw.winners.forEach((w) => {
        // Keep the highest rank if multiple
        const prev = monthlyDrawWinnersMap.get(w.customerId);
        if (!prev || w.rank < prev.rank) {
          monthlyDrawWinnersMap.set(w.customerId, w);
        }
      });
    });

  const statements: MonthlyCustomerStatement[] = [];

  // Only customers who made purchases in this entire month
  customers.forEach((customer) => {
    const txs = customerTxsMap.get(customer.id) || [];
    const salesTxs = txs.filter((t) => t.type === 'credit');

    // Customer must have purchased in this entire month
    if (salesTxs.length === 0) return;

    let totalPurchases = 0;
    let totalPaid = 0;
    let totalSavings = 0;

    txs.forEach((tx) => {
      if (tx.type === 'credit') {
        totalPurchases += tx.amount;
        totalSavings += tx.totalSavings || 0;
        if (tx.paidAmount !== undefined) {
          totalPaid += tx.paidAmount;
        } else if (tx.dueBalance === 0) {
          totalPaid += tx.amount;
        }
      } else if (tx.type === 'debit') {
        totalPaid += tx.amount;
      }
    });

    const winningInfo = monthlyDrawWinnersMap.get(customer.id);
    let winningWinnings: MonthlyCustomerStatement['luckyDrawWinnings'] = undefined;

    if (winningInfo) {
      winningWinnings = {
        hasWon: true,
        rank: winningInfo.rank,
        prizeTitle: winningInfo.prizeTitle,
        voucherCode: winningInfo.voucherCode,
        discountValue: winningInfo.discountValue,
        winningAmount: winningInfo.lastPaidAmount || (winningInfo.rank === 3 ? 2500 : undefined),
      };
    }

    statements.push({
      customer,
      month: targetMonth,
      year: targetYear,
      monthName: monthNameStr,
      totalPurchases,
      totalPaid,
      closingBalance: customer.balance,
      totalSavings,
      transactions: txs,
      invoicesCount: salesTxs.length,
      luckyDrawWinnings: winningWinnings,
    });
  });

  return statements.sort((a, b) => b.totalPurchases - a.totalPurchases);
}
