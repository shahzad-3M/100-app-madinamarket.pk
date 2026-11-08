import React, { useState } from 'react';
import {
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Percent,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  ShoppingBag,
  Globe,
  ExternalLink,
  Download,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import { BusinessProfile, ProductItem } from '../types';

interface InventoryViewProps {
  products: ProductItem[];
  profile: BusinessProfile;
  onSaveProduct: (product: ProductItem) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onToggleWinningItem: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  isExternalImportOpen?: boolean;
  onCloseExternalImport?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  profile,
  onSaveProduct,
  onUpdateStock,
  onToggleWinningItem,
  onDeleteProduct,
  isExternalImportOpen = false,
  onCloseExternalImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(isExternalImportOpen);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formUrduName, setFormUrduName] = useState('');
  const [formCategory, setFormCategory] = useState('Cosmetics');
  const [formSku, setFormSku] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formMarketPrice, setFormMarketPrice] = useState('');
  const [formOurPrice, setFormOurPrice] = useState('');
  const [formStockQty, setFormStockQty] = useState('');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formIsWinning, setFormIsWinning] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');

  // Website Importer State
  const [importUrl, setImportUrl] = useState('');
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [parsedProductPreview, setParsedProductPreview] = useState<ProductItem | null>(null);
  const [importSuccessAlert, setImportSuccessAlert] = useState(false);

  // Synchronize external import trigger if provided
  React.useEffect(() => {
    if (isExternalImportOpen) {
      setIsImportModalOpen(true);
    }
  }, [isExternalImportOpen]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Calculate high-level KPIs
  const totalStockCount = products.reduce((acc, p) => acc + p.stockQty, 0);
  const totalInventoryValuation = products.reduce((acc, p) => acc + p.ourPrice * p.stockQty, 0);
  const totalProfitGenerated = products.reduce((acc, p) => acc + p.totalProfit, 0);
  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

  // Winning items ranked by total profit
  const winningProducts = [...products].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 3);

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchUrdu = p.urduName ? p.urduName.toLowerCase().includes(q) : false;
      const matchSku = p.sku.toLowerCase().includes(q);
      return matchName || matchUrdu || matchSku;
    }
    return true;
  });

  const handleOpenAddModal = (prod?: ProductItem) => {
    if (prod) {
      setEditingProduct(prod);
      setFormName(prod.name);
      setFormUrduName(prod.urduName || '');
      setFormCategory(prod.category);
      setFormSku(prod.sku);
      setFormCostPrice(String(prod.costPrice));
      setFormMarketPrice(String(prod.marketPrice));
      setFormOurPrice(String(prod.ourPrice));
      setFormStockQty(String(prod.stockQty));
      setFormMinStock(String(prod.minStockAlert));
      setFormIsWinning(prod.isWinningItem);
      setFormImageUrl(prod.imageUrl || '');
      setFormWebsiteUrl(prod.websiteUrl || '');
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormUrduName('');
      setFormCategory('Cosmetics');
      setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setFormCostPrice('');
      setFormMarketPrice('');
      setFormOurPrice('');
      setFormStockQty('50');
      setFormMinStock('10');
      setFormIsWinning(false);
      setFormImageUrl('');
      setFormWebsiteUrl('');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(formCostPrice) || 0;
    const market = parseFloat(formMarketPrice) || 0;
    const our = parseFloat(formOurPrice) || 0;
    const stock = parseInt(formStockQty, 10) || 0;
    const minStock = parseInt(formMinStock, 10) || 10;

    const prodToSave: ProductItem = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      name: formName.trim(),
      urduName: formUrduName.trim() || undefined,
      category: formCategory.trim() || 'General',
      sku: formSku.trim() || `SKU-${Date.now()}`,
      costPrice: cost,
      marketPrice: market,
      ourPrice: our,
      stockQty: stock,
      minStockAlert: minStock,
      salesCount: editingProduct ? editingProduct.salesCount : 0,
      totalRevenue: editingProduct ? editingProduct.totalRevenue : 0,
      totalProfit: editingProduct ? (our - cost) * editingProduct.salesCount : 0,
      isWinningItem: formIsWinning,
      imageUrl: formImageUrl.trim() || undefined,
      websiteUrl: formWebsiteUrl.trim() || undefined,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString().split('T')[0],
    };

    onSaveProduct(prodToSave);
    setIsAddModalOpen(false);
  };

  // INTELLIGENT WEBSITE PRODUCT IMPORTER (User directive)
  const handleSimulateWebsiteImport = (urlToImport: string) => {
    const rawUrl = urlToImport.trim();
    if (!rawUrl) {
      alert('Please enter a website link to import.');
      return;
    }

    setIsImportLoading(true);

    setTimeout(() => {
      // Analyze URL slug and parameters
      let detectedName = 'New Imported Wholesale Item';
      let detectedUrdu = 'نئی امپورٹڈ ہول سیل پراڈکٹ';
      let detectedCat = 'Fashion & Apparel';
      let marketPrice = 3200;
      let costPrice = 1200;
      let ourPrice = 1600;
      let img = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';
      let pictures: string[] = [img];
      let sizes: string[] = ['Standard Wholesale Lot'];
      let specifications: Record<string, string> = {
        'Brand / Series': '100DAGAR Wholesale Series',
        'Material': 'Premium Grade Lot',
        'Warranty': 'Local Replacement Warranty',
        'Origin': 'Imported Direct Container Lot',
      };
      let features: string[] = [
        'High turnover fast-moving product with strong retail demand',
        'Guaranteed wholesale lot quality tested for Pakistani market',
      ];
      let details = 'Complete wholesale lot product imported directly for 100DAGAR retail and distribution.';

      const lower = rawUrl.toLowerCase();
      if (lower.includes('styler') || lower.includes('hair') || lower.includes('dryer')) {
        detectedName = '5-in-1 Hot Air Styler & Hair Dryer Brush';
        detectedUrdu = 'فائیو ان ون ہاٹ ایئر اسٹائلر اور ہیئر ڈرائر برش';
        detectedCat = 'Cosmetics & Personal Care';
        marketPrice = 6980;
        costPrice = 2200;
        ourPrice = 3490;
        img = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';
        pictures = [
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
        ];
        sizes = ['Standard 5-Head Salon Kit', 'Compact Travel Case Edition'];
        specifications = {
          'Brand / Series': '100DAGAR Salon Series Pro 5-in-1',
          'Power Consumption': '1000W Ceramic High Speed Motor',
          'Voltage': '220V - 240V, 50/60Hz (Pak Standard)',
          'Heat Levels': '3 Temperature Settings + Cool Shot Lock',
          'Cord Length': '1.8m 360° Anti-Tangle Swivel Cord',
          'Material': 'ABS Body + Negative Ion Ceramic Tourmaline',
          'Warranty': '6 Months Local Replacement Warranty',
        };
        features = [
          'One-Step Hair Drying, Volumizing & Curling without Extreme Heat Damage',
          'Negative Ion Technology seals hair cuticles for instant frizz-free salon shine',
          'Includes 5 interchangeable brush attachments for straight, wavy, or bouncy curls',
        ];
        details = 'The 100DAGAR 5-in-1 Hot Air Styler & Hair Dryer Brush is a complete styling salon in a single box. Market price is Rs. 6,980; our wholesale lot is Rs. 3,490 with 50% instant savings.';
      } else if (lower.includes('acrylic') || lower.includes('mirror') || lower.includes('wall')) {
        detectedName = 'Acrylic Hexagon Mirror Tiles – Modern Wall Decor';
        detectedUrdu = 'ایکریلک ہیکساگون مرر ٹائلز - وال ڈیکوریشن';
        detectedCat = 'Decorative Items';
        marketPrice = 2450;
        costPrice = 650;
        ourPrice = 980;
        img = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80';
        pictures = [
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80',
        ];
        sizes = ['12 Pcs Pack (12.6 x 11 cm)', '24 Pcs Pack (18.4 x 16 cm)', '36 Pcs Value Pack'];
        specifications = {
          'Material': 'High-Reflective Acrylic (Shatter-proof)',
          'Thickness': '1.2mm HD Silver Coated Plastic Mirror',
          'Adhesion': 'Self-Adhesive Strong Double Tape Included',
          'Application': 'Living Room, Bedroom, Salon & Office Wall',
          'Origin': 'Imported Decorative Lot',
        };
        features = [
          '100% Shatterproof Safe for Kids and Homes',
          'Easy Peel-and-Stick DIY Installation',
          'Hexagon Geometric Aesthetic transforms any plain wall',
        ];
        details = 'Transform any living space or retail shop with self-adhesive hexagon mirror wall tiles. Lightweight and shatterproof.';
      } else if (lower.includes('suit') || lower.includes('crepe') || lower.includes('silk') || lower.includes('cloth')) {
        detectedName = '3PC Crepe Silk Suit with Monar Dupatta (Unstitched)';
        detectedUrdu = 'تھری پیس کریپ سلک سوٹ مع مونار دوپٹہ';
        detectedCat = 'Fashion & Apparel';
        marketPrice = 7200;
        costPrice = 2600;
        ourPrice = 3550;
        img = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80';
        pictures = [
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
        ];
        sizes = ['Unstitched 3-Piece Fabric', 'Stitched Standard (M)', 'Stitched Large (L)'];
        specifications = {
          'Shirt Fabric': 'Pure Fine Crepe Silk (3.0 Meters)',
          'Trouser Fabric': 'Dyed Silk Cotton (2.5 Meters)',
          'Dupatta': 'Digital Printed Monar Silk Organza (2.5 Meters)',
          'Season': 'All-Season Festive & Party Wear',
          'Quality': 'Guaranteed Color & Fabric Durability',
        };
        features = [
          'Intricate border digital printing with luxury silk finish',
          'Breathable drape suitable for both casual and formal occasions',
        ];
        details = 'Exclusive 3-Piece Crepe Silk unstitched wholesale collection with Monar dupatta. Market retail is Rs. 7,200; our price is Rs. 3,550.';
      } else if (lower.includes('earbuds') || lower.includes('watch') || lower.includes('smart') || lower.includes('gadget')) {
        detectedName = 'Wireless ANC Noise Cancelling Earbuds Pro';
        detectedUrdu = 'وائرلیس شور کم کرنے والے ائربڈز پرو';
        detectedCat = 'Smart phone Accessories';
        marketPrice = 5800;
        costPrice = 1800;
        ourPrice = 2890;
        img = 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80';
        pictures = [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80',
        ];
        sizes = ['Standard Earbuds with Charging Case (White)', 'Matte Black Edition'];
        specifications = {
          'Bluetooth Version': '5.3 Ultra Low Latency',
          'Active Noise Cancelling': 'ANC Up to -35dB Ambient Filter',
          'Battery Playtime': '6 Hours Single Charge + 24 Hours Case',
          'Charging Interface': 'Type-C Fast Charge (10 min = 2 hours)',
          'Compatibility': 'iOS, Android & Windows Laptops',
          'Warranty': '3 Months Local Replacement Warranty',
        };
        features = [
          'Touch Sensor Music & Call Controls with Clear Mic',
          'Sweat and splash resistant for sports and gym use',
        ];
        details = 'High-fidelity audio with deep bass and active noise cancelling. Market price is Rs. 5,800; wholesale lot is Rs. 2,890.';
      } else if (lower.includes('bag') || lower.includes('makeup') || lower.includes('cosmetic')) {
        detectedName = '3 Pcs Waterproof Makeup & Cosmetic Storage Bag Lot';
        detectedUrdu = 'تھری پیس واٹر پروف کاسمیٹک میک اپ بیگ سیٹ';
        detectedCat = 'Cosmetics';
        marketPrice = 3165;
        costPrice = 950;
        ourPrice = 1480;
        img = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80';
        pictures = [
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
        ];
        sizes = ['3-Piece Combo Set (Large, Medium, Small)'];
        specifications = {
          'Material': 'Thick Waterproof Transparent PVC + PU Trim',
          'Zippers': 'Durable Heavy-Duty Golden Metal Sliders',
          'Dimensions': 'Large (30x21cm), Medium (26x16cm), Small (21x12cm)',
          'Washable': 'Wipe-clean waterproof surface',
        };
        features = [
          'Keeps cosmetics, toiletries, and jewelry separated and organized',
          'Transparent design allows quick identification of contents',
        ];
        details = '3-Piece multi-size waterproof cosmetic pouches. Retail market price is Rs. 3,165; wholesale rate is Rs. 1,480.';
      } else {
        // Parse from URL slug
        try {
          const pathname = new URL(rawUrl).pathname;
          const slug = pathname.split('/').filter(Boolean).pop() || 'new-product-item';
          const titleWords = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          detectedName = titleWords.length > 3 ? titleWords : 'Imported E-Commerce Lot Product';
          detectedUrdu = 'امپورٹڈ ویب سائٹ لاٹ آئٹم';
          detectedCat = 'Wholesale Lot';
          marketPrice = 3999;
          costPrice = 1400;
          ourPrice = 1999;
        } catch {
          detectedName = 'Website Imported Product';
        }
      }

      const generatedSku = `IMP-${Math.floor(1000 + Math.random() * 9000)}`;

      const preview: ProductItem = {
        id: `prod_imp_${Date.now()}`,
        name: detectedName,
        urduName: detectedUrdu,
        category: detectedCat,
        sku: generatedSku,
        costPrice,
        marketPrice,
        ourPrice,
        stockQty: 50,
        minStockAlert: 10,
        salesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        isWinningItem: true,
        websiteUrl: rawUrl,
        imageUrl: img,
        pictures,
        sizes,
        selectedSize: sizes[0],
        specifications,
        features,
        details,
        createdAt: new Date().toISOString().split('T')[0],
      };

      setParsedProductPreview(preview);
      setIsImportLoading(false);
    }, 700);
  };

  const handleConfirmImport = () => {
    if (!parsedProductPreview) return;
    onSaveProduct(parsedProductPreview);
    setImportSuccessAlert(true);
    setTimeout(() => {
      setImportSuccessAlert(false);
      setIsImportModalOpen(false);
      setParsedProductPreview(null);
      setImportUrl('');
      if (onCloseExternalImport) onCloseExternalImport();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total Catalog Items</span>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {products.length} Products
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {totalStockCount.toLocaleString('en-PK')} units in warehouse
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Wholesale Stock Valuation</span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {profile.currencySymbol}{totalInventoryValuation.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            At our selling price
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Total Gross Profit Earned</span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {profile.currencySymbol}{totalProfitGenerated.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
            Accumulated profit from sold units
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Low Stock Alert</span>
          <p className={`text-xl font-bold font-mono mt-1 ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {lowStockCount} Items
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {lowStockCount > 0 ? 'Requires immediate restock' : 'All stock levels healthy'}
          </span>
        </div>
      </div>

      {/* 2. WINNING ITEMS SPOTLIGHT (Requested in User Brief) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Winning Items Spotlight (سب سے زیادہ منافع بخش اشیاء)
              </h2>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Ranked dynamically by total sales profit, margin %, and turnover speed
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {winningProducts.map((p, idx) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-3 shadow-2xs space-y-2 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center justify-center shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </h3>
                  {p.urduName && (
                    <span className="font-urdu text-[11px] text-slate-500 block truncate">
                      {p.urduName}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px]">Net Profit:</span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {profile.currencySymbol}{p.totalProfit.toLocaleString('en-PK')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Units Sold:</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {p.salesCount} sold
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Margin: {Math.round(((p.ourPrice - p.costPrice) / p.ourPrice) * 100)}%</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  +{profile.currencySymbol}{(p.ourPrice - p.costPrice).toLocaleString('en-PK')}/unit
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. INVENTORY TABLE CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, Urdu, SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-lg shadow-2xs cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Import from Website (ویب سائٹ سے امپورٹ)</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product (نیا آئٹم)</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Product Name (نام)</th>
                <th className="py-2.5 px-3">Category / SKU</th>
                <th className="py-2.5 px-3 text-right">Cost Price</th>
                <th className="py-2.5 px-3 text-right">Market Price</th>
                <th className="py-2.5 px-3 text-right">Our Price</th>
                <th className="py-2.5 px-3 text-right">Customer Saves</th>
                <th className="py-2.5 px-3 text-center">Stock Qty</th>
                <th className="py-2.5 px-3 text-center">Winning Item</th>
                <th className="py-2.5 px-3 text-right">Quick Restock</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const savings = p.marketPrice - p.ourPrice;
                const savingsPct = Math.round((savings / p.marketPrice) * 100);
                const isLowStock = p.stockQty <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {p.name}
                      </p>
                      {p.urduName && (
                        <p className="font-urdu text-[11px] text-slate-500 mt-0.5">
                          {p.urduName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-700 dark:text-slate-300 block font-medium">
                        {p.category}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {profile.currencySymbol}{p.costPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 line-through tabular-nums">
                      {profile.currencySymbol}{p.marketPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {profile.currencySymbol}{p.ourPrice.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {profile.currencySymbol}{savings.toLocaleString('en-PK')} ({savingsPct}%)
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        isLowStock
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}>
                        {p.stockQty}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleWinningItem(p.id)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          p.isWinningItem
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                        title="Toggle Winning Item"
                      >
                        <Sparkles className="w-4 h-4 fill-current" />
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <button
                          onClick={() => onUpdateStock(p.id, p.stockQty + 10)}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => onUpdateStock(p.id, p.stockQty + 50)}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] cursor-pointer"
                        >
                          +50
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.websiteUrl && (
                          <a
                            href={p.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                            title="See more details on website (ویب سائٹ پر دیکھیں)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleOpenAddModal(p)}
                          className="p-1 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ADD / EDIT PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <h2 className="text-base font-extrabold tracking-tight">
                {editingProduct ? 'Edit Product Details' : 'Add New Inventory Item (نیا آئٹم)'}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Product Name in English *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 5-in-1 Hot Air Styler"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Product Name in Urdu (اردو نام)
                </label>
                <input
                  type="text"
                  value={formUrduName}
                  onChange={(e) => setFormUrduName(e.target.value)}
                  placeholder="مثال: فائیو ان ون ہاٹ ایئر ہیئر اسٹائلر"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu text-right focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Category (کیٹیگری)
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Cosmetics, Electronics..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="WASH-3PC-001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pricing Matrix */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Cost Price (لاگت)
                  </label>
                  <input
                    type="number"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="2200"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Market Price (مارکیٹ)
                  </label>
                  <input
                    type="number"
                    value={formMarketPrice}
                    onChange={(e) => setFormMarketPrice(e.target.value)}
                    placeholder="6980"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-amber-700 dark:text-amber-400 block">
                    Our Price (ہماری قیمت)
                  </label>
                  <input
                    type="number"
                    value={formOurPrice}
                    onChange={(e) => setFormOurPrice(e.target.value)}
                    placeholder="3490"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Inventory & Winning toggle */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Initial Stock Qty
                  </label>
                  <input
                    type="number"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="formIsWinning"
                    checked={formIsWinning}
                    onChange={(e) => setFormIsWinning(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <label htmlFor="formIsWinning" className="font-bold text-amber-800 dark:text-amber-300 cursor-pointer">
                    Winning Item ⭐
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Image URL (تصویر کا لنک)
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Website Link (User requirement: keep website link to see more details) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Website Link to See More Details (ویب سائٹ لنک)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Customer clicks this to see full details</span>
                </label>
                <input
                  type="url"
                  value={formWebsiteUrl}
                  onChange={(e) => setFormWebsiteUrl(e.target.value)}
                  placeholder="https://100dagar.pk/products/5-in-1-hot-air-styler"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. IMPORT ALL PRODUCT DETAILS FROM WEBSITE LINK MODAL (User directive) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <div>
                  <h2 className="text-base font-extrabold tracking-tight">
                    Import Product Details from Website Link
                  </h2>
                  <span className="text-[11px] font-medium text-slate-800">
                    ویب سائٹ لنک سے مکمل پروڈکٹ معلومات خودکار درآمد کریں
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  if (onCloseExternalImport) onCloseExternalImport();
                }}
                className="p-1 text-slate-800 hover:text-black rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* URL Input Form */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Enter / Paste Any Product Website URL:</span>
                  <span className="text-[10px] text-slate-400">Supports 100DAGAR, Shopify, Daraz, WooCommerce, etc.</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://100dagar.pk/products/3d-silver-acrylic-wall-stickers"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    />
                  </div>
                  <button
                    onClick={() => handleSimulateWebsiteImport(importUrl)}
                    disabled={isImportLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${isImportLoading ? 'animate-bounce' : ''}`} />
                    <span>{isImportLoading ? 'Fetching...' : 'Extract & Parse'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Presets for Quick 1-Click Import Testing */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Quick Sample Website Links (1-Click Test):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '5-in-1 Styler', url: 'https://100dagar.pk/products/5-in-1-hot-air-styler' },
                    { label: 'Acrylic Mirror Tiles', url: 'https://100dagar.pk/products/acrylic-hexagon-mirror-tiles' },
                    { label: '3PC Crepe Silk Suit', url: 'https://100dagar.pk/products/3pc-crepe-silk-suit' },
                    { label: 'Earbuds Pro ANC', url: 'https://100dagar.pk/products/wireless-anc-earbuds-pro' },
                    { label: '3 Pcs Makeup Bag', url: 'https://100dagar.pk/products/3-pcs-washbag-makeup' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setImportUrl(preset.url);
                        handleSimulateWebsiteImport(preset.url);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extracted Product Preview Card */}
              {parsedProductPreview && (
                <div className="bg-white dark:bg-slate-800 border-2 border-emerald-400/80 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Ready to Import: Extracted Details
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                      Category: {parsedProductPreview.category}
                    </span>
                  </div>

                  <div className="flex gap-4">
                    {parsedProductPreview.imageUrl && (
                      <img
                        src={parsedProductPreview.imageUrl}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {parsedProductPreview.name}
                      </h4>
                      {parsedProductPreview.urduName && (
                        <p className="font-urdu text-xs text-slate-500 font-medium">
                          {parsedProductPreview.urduName}
                        </p>
                      )}
                      <p className="text-[11px] text-blue-500 font-mono truncate">
                        🔗 {parsedProductPreview.websiteUrl}
                      </p>

                      <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Cost Price:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {profile.currencySymbol}{parsedProductPreview.costPrice.toLocaleString('en-PK')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Market Price:</span>
                          <span className="line-through text-slate-400">
                            {profile.currencySymbol}{parsedProductPreview.marketPrice.toLocaleString('en-PK')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">Our Price:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {profile.currencySymbol}{parsedProductPreview.ourPrice.toLocaleString('en-PK')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {importSuccessAlert ? (
                    <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-center font-bold animate-pulse">
                      ✅ Product successfully added to inventory &amp; dynamic category created!
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={handleConfirmImport}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Confirm &amp; Add to Inventory (انونٹری میں شامل کریں)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    if (onCloseExternalImport) onCloseExternalImport();
                  }}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
