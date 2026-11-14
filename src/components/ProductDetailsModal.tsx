import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShoppingBag,
  Check,
  Percent,
  Sparkles,
  Phone,
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { BusinessProfile, ProductItem } from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface ProductDetailsModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: ProductItem, qty: number, selectedSize?: string) => void;
  profile: BusinessProfile;
  isCustomerView?: boolean;
}

const getVariationLabel = (v: NonNullable<ProductItem['variations']>[number]) =>
  [v.size, v.color, ...Object.values(v.attributes || {})].filter(Boolean).join(' · ') ||
  v.sku ||
  'Variant';

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  profile,
  isCustomerView = false,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;
    setActiveImageIndex(0);
    setQuantity(1);
    setAddedAnimation(false);
    if (product.variations && product.variations.length > 0) {
      setSelectedVariationIndex(0);
      setSelectedSize(getVariationLabel(product.variations[0]));
    } else {
      setSelectedVariationIndex(null);
      setSelectedSize(
        product.selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard')
      );
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const pictures = product.pictures && product.pictures.length > 0
    ? product.pictures
    : product.imageUrl
    ? [product.imageUrl]
    : [];

  const activeVariation =
    selectedVariationIndex !== null && product.variations && product.variations[selectedVariationIndex]
      ? product.variations[selectedVariationIndex]
      : null;

  const activePrice = activeVariation?.salePrice || product.ourPrice;
  const activeMarketPrice = activeVariation?.originalPrice || product.marketPrice;

  const activeImage =
    activeVariation?.image || pictures[activeImageIndex] || product.imageUrl;

  const savings = Math.max(0, activeMarketPrice - activePrice);
  const savingsPercent = activeMarketPrice > 0 ? Math.round((savings / activeMarketPrice) * 100) : 50;

  const handleAdd = () => {
    const productWithVariant: ProductItem = {
      ...product,
      ourPrice: activePrice,
      marketPrice: activeMarketPrice,
      selectedSize,
      imageUrl: activeImage || product.imageUrl,
    };
    onAddToCart(productWithVariant, quantity, selectedSize);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 400);
  };

  const handleDirectWhatsAppOrder = () => {
    const text = `السلام علیکم! 100DAGAR مدینہ مارکیٹ، مجھے یہ پروڈکٹ آرڈر کرنی ہے:\n\n📦 *${product.name}*\n${product.urduName ? `(${product.urduName})\n` : ''}سائز / ویریئنٹ: *${selectedSize}*\nتعداد: *${quantity}*\nہول سیل قیمت: *${profile.currencySymbol}${(product.ourPrice * quantity).toLocaleString('en-PK')}*\nکسٹمر بچت: *${profile.currencySymbol}${(savings * quantity).toLocaleString('en-PK')} (${savingsPercent}%)*\n\nبراہ کرم ڈیلیوری اور ادائیگی تفصیلات شیئر فرمائیں۔`;
    openWhatsAppDirect('03125256266', text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-[#FFD200] px-4 py-2.5 flex items-center justify-between text-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
              100DAGAR Details
            </span>
            <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md">
              {product.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-amber-400 text-slate-900 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* LEFT: PICTURES GALLERY */}
            <div className="space-y-3">
              <div className="relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square flex items-center justify-center">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-16 h-16 text-slate-300" />
                )}

                {/* Savings Badge */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                  <span className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded shadow-md">
                    -{savingsPercent}% OFF
                  </span>
                  {product.isWinningItem && (
                    <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-slate-950" /> WINNING ITEM
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3">
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded shadow-xs ${
                    product.stockQty <= product.minStockAlert
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-900/80 text-white backdrop-blur-xs'
                  }`}>
                    {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {pictures.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {pictures.map((pic, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-amber-500 ring-2 ring-amber-400/50 scale-105'
                          : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={pic} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Original Lot</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Cash on Delivery</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Easy Return Policy</span>
                </div>
              </div>
            </div>

            {/* RIGHT: DETAILS, SPECS, SIZES, AND ACTIONS */}
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">
                  {product.category} · SKU: {product.sku}
                </span>
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug mt-1">
                  {product.name}
                </h1>
                {product.urduName && (
                  <p className="font-urdu text-sm text-slate-600 dark:text-slate-300 mt-1 font-semibold">
                    {product.urduName}
                  </p>
                )}
              </div>

              {/* PRICING & SAVINGS (Strictly Customer Safe) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {profile.currencySymbol}{activePrice.toLocaleString('en-PK')}
                  </span>
                  <span className="text-sm text-slate-400 line-through font-mono">
                    {profile.currencySymbol}{activeMarketPrice.toLocaleString('en-PK')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    -{savingsPercent}% Save
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>کسٹمر بچت (Your Instant Savings):</span>
                  </span>
                  <span className="font-mono font-bold text-sm">
                    {profile.currencySymbol}{savings.toLocaleString('en-PK')}
                  </span>
                </div>

                {/* Internal Wholesale Margin ONLY shown to merchant when not in customer view */}
                {!isCustomerView && (
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Merchant Cost: {profile.currencySymbol}{product.costPrice.toLocaleString('en-PK')}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Profit Margin: {profile.currencySymbol}{(activePrice - product.costPrice).toLocaleString('en-PK')}/unit
                    </span>
                  </div>
                )}
              </div>

              {/* VARIATION SELECTOR (Sizes, Colors, Options) */}
              {product.variations && product.variations.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Select Variation / Option (ویریئنٹ منتخب کریں):</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.variations.map((v, vIdx) => {
                      const isSelected = selectedVariationIndex === vIdx;
                      const label = getVariationLabel(v);
                      return (
                        <button
                          key={v.id || vIdx}
                          type="button"
                          onClick={() => {
                            setSelectedVariationIndex(vIdx);
                            setSelectedSize(label);
                          }}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-400'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {v.image && (
                            <img src={v.image} alt={label} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {label}
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold block">
                              {profile.currencySymbol}{(v.salePrice || product.ourPrice).toLocaleString('en-PK')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : product.sizes && product.sizes.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Select Size / Package (سائز یا پیکج منتخب کریں):</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          selectedSize === s
                            ? 'bg-[#FFD200] text-slate-950 font-bold ring-2 ring-amber-400 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* QUANTITY & ACTIONS */}
              <div className="space-y-2 pt-1">
                {product.isUpcoming ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider block">
                        ✨ Coming Soon / وائرل - جلد دستیاب
                      </span>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                        This item is currently under transit and will be available for checkout soon.
                      </p>
                    </div>

                    {!isCustomerView && (
                      <button
                        type="button"
                        onClick={() => {
                          const text = `السلام علیکم! میں 100DAGAR پر جلد آنے والی پراڈکٹ *${product.name}* کے بارے میں معلومات اور لاٹ بکنگ کروانا چاہتا ہوں۔ براہ کرم تفصیلات رہنمائی فرمائیں۔`;
                          openWhatsAppDirect(product.investorWhatsApp || profile.phone || '03125256266', text);
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Enquire on WhatsApp (واٹس ایپ معلومات و بکنگ)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 py-1.5 font-mono font-bold text-xs text-slate-900 dark:text-white min-w-[2.5rem] text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Option 1: Add to Cart */}
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="flex-1 py-2.5 px-4 bg-[#FFD200] hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {addedAnimation ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Added to Cart!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            <span>Add to Cart ({profile.currencySymbol}{(activePrice * quantity).toLocaleString('en-PK')})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option 2: Direct Business WhatsApp Order (Hidden in Customer View) */}
                    {!isCustomerView && (
                      <button
                        type="button"
                        onClick={handleDirectWhatsAppOrder}
                        className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Order on WhatsApp (واٹس ایپ فوری آرڈر)</span>
                      </button>
                    )}

                    {/* Option 3: Investor WhatsApp Order (Hidden in Customer View) */}
                    {!isCustomerView && product.investorWhatsApp && (
                      <button
                        type="button"
                        onClick={() => {
                          const text = `السلام علیکم! میں *${product.name}* کا آرڈر انویسٹر پارٹنر سے کنفرم کرنا چاہتا ہوں۔\nتعداد: ${quantity}\nقیمت: ${profile.currencySymbol}${(activePrice * quantity).toLocaleString('en-PK')}`;
                          openWhatsAppDirect(product.investorWhatsApp!, text);
                        }}
                        className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Order via Investor WhatsApp ({product.investorWhatsApp})</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* External Website Link */}
              {product.websiteUrl && (
                <a
                  href={product.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>See More Details on Website (ویب سائٹ پر دیکھیں)</span>
                </a>
              )}
            </div>
          </div>

          {/* SPECIFICATIONS & FEATURES TABS / SECTION */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            {/* Features Bullet List */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Key Features &amp; Highlights (اہم خصوصیات):
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  {product.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications Table */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Technical Specifications (تفصیلات و پیمائش):
                </h3>
                <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(product.specifications).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-400 w-1/3 border-r border-slate-100 dark:border-slate-800">
                            {key}
                          </td>
                          <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">
                            {val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed Description */}
            {(product.details || product.description) && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">
                  Detailed Description (مکمل تفصیل):
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {product.details || product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
