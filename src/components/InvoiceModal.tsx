import React from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { BusinessProfile, Customer, Transaction } from '../types';
import { generateWhatsAppLink, formatPaymentChannelsText } from '../utils/whatsapp';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  customer: Customer;
  profile: BusinessProfile;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  transaction,
  customer,
  profile,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCredit = transaction.type === 'credit';
  const docTitle = isCredit ? 'BILL OF SUPPLY / انوائس' : 'PAYMENT RECEIPT / وصولی رسید';
  const invoiceNum = transaction.invoiceNumber || `REC-${transaction.id.slice(-6).toUpperCase()}`;

  const paymentText = formatPaymentChannelsText(profile);
  const shareText = `*${docTitle}* from *${profile.name}*\nNumber: ${invoiceNum}\nDate: ${transaction.date}\nAmount: ${profile.currencySymbol} ${transaction.amount.toLocaleString('en-PK')}\nCustomer: ${customer.name}\n${isCredit && transaction.dueDate ? `Due Date: ${transaction.dueDate}\n` : ''}\n*Payment Channels:*\n${paymentText}`;

  const waLink = generateWhatsAppLink(customer.phone, shareText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header toolbar (no-print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {docTitle} #{invoiceNum}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp Share
            </a>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div id="printable-invoice" className="p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
          {/* Business & Document Header */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {profile.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {profile.tagline}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
                {profile.address}
              </p>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>Phone: <span className="font-mono text-slate-700 dark:text-slate-300">{profile.phone}</span></p>
                <p>Email: <span className="font-mono text-slate-700 dark:text-slate-300">{profile.email}</span></p>
                {profile.ntnNumber && <p>NTN: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{profile.ntnNumber}</span></p>}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                {docTitle}
              </div>
              <p className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
                #{invoiceNum}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Date: <span className="font-mono text-slate-800 dark:text-slate-200">{transaction.date}</span>
              </p>
              {transaction.dueDate && isCredit && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Due Date: <span className="font-mono">{transaction.dueDate}</span>
                </p>
              )}
              {transaction.paymentMode && (
                <p className="text-xs text-slate-500 mt-1">
                  Mode: <span className="font-semibold uppercase">{transaction.paymentMode}</span>
                </p>
              )}
            </div>
          </div>

          {/* Billed To / Party Details */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-850 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mb-6 text-xs">
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mb-1">
                {isCredit ? 'Billed To (خریدار / کسٹمر)' : 'Received From (کسٹمر)'}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {customer.name} {customer.urduName && <span className="font-normal font-sans text-slate-500">({customer.urduName})</span>}
              </p>
              {customer.address && <p className="text-slate-600 dark:text-slate-400 mt-1">{customer.address}</p>}
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Phone: <span className="font-mono">{customer.phone}</span>
              </p>
              {customer.ntnNumber && (
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  NTN: <span className="font-mono">{customer.ntnNumber}</span>
                </p>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] mb-1">
                Ledger Status / کھاتہ تفصیل
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Current Due: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{profile.currencySymbol} {customer.balance.toLocaleString('en-PK')}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Credit Terms: <span className="font-mono">{customer.paymentTermsDays} Days</span>
              </p>
              {transaction.notes && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Reference/Notes: <span className="italic">{transaction.notes}</span>
                </p>
              )}
            </div>
          </div>

          {/* Itemized Table if items exist or single summary row */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Description / تفصیل سامان</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty / تعداد</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Unit Price / ریٹ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total / کل رقم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transaction.items && transaction.items.length > 0 ? (
                  transaction.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {profile.currencySymbol} {item.unitPrice.toLocaleString('en-PK')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {profile.currencySymbol} {item.amount.toLocaleString('en-PK')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-3 text-slate-400 font-mono">1</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {transaction.notes || (isCredit ? 'Credit Goods / Services Dispatched' : 'Payment Received Against Account')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">1</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {profile.currencySymbol} {transaction.amount.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {profile.currencySymbol} {transaction.amount.toLocaleString('en-PK')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Pakistani Payment Channels Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
            <div className="text-xs bg-slate-50 dark:bg-slate-850 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Payment Channels / ادائیگی کے ذرائع:
              </p>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                {profile.paymentChannels.easyPaisa?.enabled && (
                  <p>
                    <b className="text-emerald-600 dark:text-emerald-400">EasyPaisa:</b>{' '}
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {profile.paymentChannels.easyPaisa.accountNumber}
                    </span>{' '}
                    ({profile.paymentChannels.easyPaisa.accountTitle})
                  </p>
                )}
                {profile.paymentChannels.jazzCash?.enabled && (
                  <p>
                    <b className="text-amber-600 dark:text-amber-400">JazzCash:</b>{' '}
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {profile.paymentChannels.jazzCash.accountNumber}
                    </span>{' '}
                    ({profile.paymentChannels.jazzCash.accountTitle})
                  </p>
                )}
                {profile.paymentChannels.sadaPay?.enabled && (
                  <p>
                    <b className="text-blue-600 dark:text-blue-400">SadaPay:</b>{' '}
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {profile.paymentChannels.sadaPay.accountNumber}
                    </span>{' '}
                    {profile.paymentChannels.sadaPay.sadaTag && `(${profile.paymentChannels.sadaPay.sadaTag})`}
                  </p>
                )}
                {profile.paymentChannels.bankDetails?.enabled && (
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.paymentChannels.bankDetails.bankName}
                    </p>
                    <p>A/C Title: {profile.paymentChannels.bankDetails.accountTitle}</p>
                    <p>A/C No: <span className="font-mono">{profile.paymentChannels.bankDetails.accountNumber}</span></p>
                    <p>IBAN: <span className="font-mono">{profile.paymentChannels.bankDetails.iban}</span></p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <span>Subtotal / رقم:</span>
                <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {profile.currencySymbol} {transaction.amount.toLocaleString('en-PK')}
                </span>
              </div>

              {transaction.totalSavings !== undefined && transaction.totalSavings > 0 && (
                <div className="flex justify-between py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/50 rounded text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  <span>Customer Savings / کسٹمر بچت:</span>
                  <span className="font-mono tabular-nums">
                    {profile.currencySymbol} {transaction.totalSavings.toLocaleString('en-PK')}
                  </span>
                </div>
              )}

              {transaction.saleType === 'partial' && (
                <>
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Advance Paid / ادا شدہ:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {profile.currencySymbol} {(transaction.paidAmount || 0).toLocaleString('en-PK')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600 dark:text-red-400 font-bold">
                    <span>Remaining Due / باقی واجب الادا:</span>
                    <span className="font-mono">
                      {profile.currencySymbol} {(transaction.dueBalance || 0).toLocaleString('en-PK')}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-2 border-b-2 border-slate-900 dark:border-slate-100 text-sm font-bold text-slate-900 dark:text-white">
                <span>{isCredit ? 'Total Payable / کل رقم:' : 'Total Received / کل وصولی:'}</span>
                <span className="font-mono tabular-nums text-base">
                  {profile.currencySymbol} {transaction.amount.toLocaleString('en-PK')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-right mt-1">
                Computer generated bill for 100DAGAR · مدینہ مارکیٹ (0312 5256 266)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
