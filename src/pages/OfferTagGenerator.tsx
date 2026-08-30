import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { 
  Sparkles, Download, Copy, Send, Smartphone, Tag, 
  ShieldCheck, Zap, Gift, Image as ImageIcon,
  CheckCircle2, Upload, X, Store, Truck, Box, Package,
  Phone, Instagram, RefreshCw, Palette, Dices, Layers,
  Sliders, Maximize2, RotateCw, Wand2, Sun, Moon, Database, HardDrive, FolderOpen, Type
} from 'lucide-react';
import { toast } from 'sonner';
import { captureElementToCanvas } from '../lib/html2canvasUtils';
import ProductPhotosGalleryModal, { SAMPLE_PRODUCT_PHOTOS } from '../components/ProductPhotosGalleryModal';

type ThemeOption = 
  | 'crimson_red' 
  | 'dark_gold' 
  | 'emerald_tech' 
  | 'royal_purple' 
  | 'sapphire_blue' 
  | 'sunset_orange' 
  | 'obsidian_black' 
  | 'clean_light';

type AspectRatioOption = 'story' | 'feed' | 'banner';
type BlendModeOption = 'none' | 'screen' | 'lighten' | 'multiply';
type DesignVariant = 
  | 'classic' 
  | 'neon_edge' 
  | 'minimal_luxury' 
  | 'cyber_tech'
  | 'badge_poster'
  | 'glassmorphism'
  | 'retro_gold'
  | 'futuristic_glitch';

type FontOption = 
  | 'bebas' 
  | 'montserrat' 
  | 'playfair' 
  | 'orbitron' 
  | 'oswald' 
  | 'cinzel' 
  | 'space_grotesk' 
  | 'rubik_mono' 
  | 'outfit';

interface FontConfig {
  id: FontOption;
  name: string;
  family: string;
  label: string;
}

const FONT_OPTIONS: FontConfig[] = [
  { id: 'bebas', name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", label: '🔤 Impacto Comercial' },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", label: '🔤 Moderno High-End' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", label: '🔤 Elegância Luxo' },
  { id: 'orbitron', name: 'Orbitron Tech', family: "'Orbitron', sans-serif", label: '🔤 Cyber Sci-Fi' },
  { id: 'oswald', name: 'Oswald Poster', family: "'Oswald', sans-serif", label: '🔤 Pôster Destaque' },
  { id: 'cinzel', name: 'Cinzel Imperial', family: "'Cinzel', serif", label: '🔤 Imperial Premium' },
  { id: 'space_grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", label: '🔤 Digital Tech' },
  { id: 'rubik_mono', name: 'Rubik Mono', family: "'Rubik Mono One', monospace", label: '🔤 Bloco Pesado' },
  { id: 'outfit', name: 'Outfit Clean', family: "'Outfit', sans-serif", label: '🔤 Apple Clean' }
];

interface SampleProduct {
  id: string;
  name: string;
  category: string;
  url: string;
}

const ALL_THEMES: ThemeOption[] = [
  'crimson_red', 'dark_gold', 'emerald_tech', 'royal_purple',
  'sapphire_blue', 'sunset_orange', 'obsidian_black', 'clean_light'
];

const BADGE_PRESETS = [
  '🔥 OFERTA DA SEMANA',
  '⚡ PREÇO IMBATÍVEL PIX',
  '💎 OPORTUNIDADE ÚNICA',
  '🚀 IMPERDÍVEL HOJE',
  '👑 SELEÇÃO GODSHOP',
  '💥 DESCONTO ESPECIAL',
  '⭐ DESTAQUE DA LOJA',
  '✨ SEMINOVO PREMIUM'
];

export default function OfferTagGenerator() {
  const queryClient = useQueryClient();
  const cardRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Gallery Modal State
  const [isPhotosGalleryOpen, setIsPhotosGalleryOpen] = useState(false);

  // Fetch product photos from database
  const { data: savedPhotos = [] } = useQuery({
    queryKey: ['product_photos'],
    queryFn: () => db.product_photos.list(),
  });

  // Logo State (Persisted in localStorage)
  const [storeLogo, setStoreLogo] = useState<string | null>(() => {
    return localStorage.getItem('godshop_store_logo') || null;
  });

  // Store Metadata
  const [storeName, setStoreName] = useState('GODSHOP');
  const [storeSlogan, setStoreSlogan] = useState('TECNOLOGIA QUE CONECTA VOCÊ');

  // Product Photo State & Correction Tools
  const [productImage, setProductImage] = useState<string | null>(null);
  const [useSampleImage, setUseSampleImage] = useState<string | null>(SAMPLE_PRODUCT_PHOTOS[0].url);
  const [imageBlendMode, setImageBlendMode] = useState<BlendModeOption>('none');
  const [imageScale, setImageScale] = useState<number>(100);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [imageGlow, setImageGlow] = useState<'3d_studio' | 'neon' | 'soft' | 'none'>('3d_studio');

  // Form States
  const [productModel, setProductModel] = useState('IPHONE 12');
  const [productStorage, setProductStorage] = useState('64GB');
  const [badgeText, setBadgeText] = useState('OFERTA DA SEMANA');
  const [condition, setCondition] = useState('SEMINOVO');
  const [colorText, setColorText] = useState('VERMELHO PURPURA');
  const [battery, setBattery] = useState('100%');
  
  // Pricing
  const [showOriginalPrice, setShowOriginalPrice] = useState(true);
  const [originalPrice, setOriginalPrice] = useState<number>(2454);
  const [priceCash, setPriceCash] = useState<number>(2080);
  const [priceCard, setPriceCard] = useState<number>(2246);
  const [cardInstallments, setCardInstallments] = useState<number>(12);
  const [enablePixInstallment, setEnablePixInstallment] = useState(false);
  const [pixDownPaymentPercent, setPixDownPaymentPercent] = useState<number>(20); // Default 20%
  const [pixInstallments, setPixInstallments] = useState<number>(4); // Default 4x

  // Perks toggles
  const [includeCase, setIncludeCase] = useState(true);
  const [includeFilm, setIncludeFilm] = useState(true);
  const [includeCharger, setIncludeCharger] = useState(true);
  const [includeWarranty, setIncludeWarranty] = useState(true);
  const [includeFreeShipping, setIncludeFreeShipping] = useState(true);
  const [customPerk, setCustomPerk] = useState('');

  // Contact Info
  const [storeHandle, setStoreHandle] = useState('@godshop');
  const [storePhone, setStorePhone] = useState(() => {
    return localStorage.getItem('auto_store_phone') || '5532999634583';
  });

  // Theme, Variation, Font & Aspect
  const [theme, setTheme] = useState<ThemeOption>('crimson_red');
  const [designVariant, setDesignVariant] = useState<DesignVariant>('classic');
  const [fontOption, setFontOption] = useState<FontOption>('bebas');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('story');
  const [autoRotateThemeOnDownload, setAutoRotateThemeOnDownload] = useState(true);

  const currentFontObj = FONT_OPTIONS.find(f => f.id === fontOption) || FONT_OPTIONS[0];
  const currentFontFamily = currentFontObj.family;

  // Load Inventory & Price Table for Quick Select
  const { data: iphones = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [] } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: prices = [] } = useQuery({
    queryKey: ['prices'],
    queryFn: () => db.prices.list(),
  });

  // Pricing Handlers
  const handlePriceCashChange = (val: number) => {
    setPriceCash(val);
    if (val > 0) {
      // Auto recalculate card total & original price when cash price changes
      const calculatedCard = Math.round(val * 1.08);
      setPriceCard(calculatedCard);
      if (originalPrice < val) {
        setOriginalPrice(Math.round(val * 1.18));
      }
    }
  };

  const handleInstallmentValChange = (installmentVal: number) => {
    if (installmentVal >= 0 && cardInstallments > 0) {
      setPriceCard(Math.round(installmentVal * cardInstallments));
    }
  };

  // Calculate card installment value
  const cardInstallmentVal = cardInstallments > 0 ? priceCard / cardInstallments : priceCard;

  // Calculate PIX installment values (based on credit card total price)
  const pixDownPaymentVal = priceCard * (pixDownPaymentPercent / 100);
  const pixRemainingVal = priceCard - pixDownPaymentVal;
  const pixInstallmentVal = pixInstallments > 0 ? pixRemainingVal / pixInstallments : pixRemainingVal;
  
  // Calculate discount percentage
  const discountPercent = originalPrice > priceCash ? Math.round(((originalPrice - priceCash) / originalPrice) * 100) : 15;

  // Theme Styles Configuration
  const getThemeStyles = (themeName: ThemeOption = theme) => {
    switch (themeName) {
      case 'crimson_red':
        return {
          name: 'Vermelho Rubi',
          cardBg: 'linear-gradient(170deg, #100a0e 0%, #0a0608 50%, #050304 100%)',
          cardBorder: 'rgba(239, 68, 68, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(220, 38, 38, 0.35) 0%, transparent 65%)',
          badgeBg: 'rgba(220, 38, 38, 0.25)',
          badgeText: '#fca5a5',
          badgeBorder: '#ef4444',
          accentColor: '#ef4444',
          subAccent: '#fca5a5',
          boxBg: 'rgba(20, 14, 18, 0.95)',
          boxBorder: 'rgba(239, 68, 68, 0.35)',
          iconBg: 'rgba(220, 38, 38, 0.15)',
          iconBorder: 'rgba(239, 68, 68, 0.5)',
          iconColor: '#ef4444',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'dark_gold':
        return {
          name: 'Dourado Titânio',
          cardBg: 'linear-gradient(170deg, #12100a 0%, #0c0a06 50%, #050403 100%)',
          cardBorder: 'rgba(245, 158, 11, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(245, 158, 11, 0.3) 0%, transparent 65%)',
          badgeBg: 'rgba(245, 158, 11, 0.25)',
          badgeText: '#fcd34d',
          badgeBorder: '#f59e0b',
          accentColor: '#f59e0b',
          subAccent: '#fcd34d',
          boxBg: 'rgba(22, 19, 14, 0.95)',
          boxBorder: 'rgba(245, 158, 11, 0.35)',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconBorder: 'rgba(245, 158, 11, 0.5)',
          iconColor: '#f59e0b',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'emerald_tech':
        return {
          name: 'Verde Esmeralda',
          cardBg: 'linear-gradient(170deg, #07120e 0%, #040c09 50%, #020604 100%)',
          cardBorder: 'rgba(16, 185, 129, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.3) 0%, transparent 65%)',
          badgeBg: 'rgba(16, 185, 129, 0.25)',
          badgeText: '#6ee7b7',
          badgeBorder: '#10b981',
          accentColor: '#10b981',
          subAccent: '#6ee7b7',
          boxBg: 'rgba(12, 24, 18, 0.95)',
          boxBorder: 'rgba(16, 185, 129, 0.35)',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          iconBorder: 'rgba(16, 185, 129, 0.5)',
          iconColor: '#10b981',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'royal_purple':
        return {
          name: 'Roxo Pro',
          cardBg: 'linear-gradient(170deg, #10081a 0%, #090410 50%, #040207 100%)',
          cardBorder: 'rgba(168, 85, 247, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(168, 85, 247, 0.35) 0%, transparent 65%)',
          badgeBg: 'rgba(168, 85, 247, 0.25)',
          badgeText: '#e9d5ff',
          badgeBorder: '#a855f7',
          accentColor: '#a855f7',
          subAccent: '#e9d5ff',
          boxBg: 'rgba(20, 14, 28, 0.95)',
          boxBorder: 'rgba(168, 85, 247, 0.35)',
          iconBg: 'rgba(168, 85, 247, 0.15)',
          iconBorder: 'rgba(168, 85, 247, 0.5)',
          iconColor: '#a855f7',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'sapphire_blue':
        return {
          name: 'Azul Safira',
          cardBg: 'linear-gradient(170deg, #080f1e 0%, #040812 50%, #020409 100%)',
          cardBorder: 'rgba(59, 130, 246, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(59, 130, 246, 0.35) 0%, transparent 65%)',
          badgeBg: 'rgba(59, 130, 246, 0.25)',
          badgeText: '#bfdbfe',
          badgeBorder: '#3b82f6',
          accentColor: '#3b82f6',
          subAccent: '#bfdbfe',
          boxBg: 'rgba(14, 20, 32, 0.95)',
          boxBorder: 'rgba(59, 130, 246, 0.35)',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          iconBorder: 'rgba(59, 130, 246, 0.5)',
          iconColor: '#3b82f6',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'sunset_orange':
        return {
          name: 'Laranja Amber',
          cardBg: 'linear-gradient(170deg, #1c0d06 0%, #0f0703 50%, #080301 100%)',
          cardBorder: 'rgba(249, 115, 22, 0.4)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(249, 115, 22, 0.35) 0%, transparent 65%)',
          badgeBg: 'rgba(249, 115, 22, 0.25)',
          badgeText: '#ffedd5',
          badgeBorder: '#f97316',
          accentColor: '#f97316',
          subAccent: '#ffedd5',
          boxBg: 'rgba(28, 16, 10, 0.95)',
          boxBorder: 'rgba(249, 115, 22, 0.35)',
          iconBg: 'rgba(249, 115, 22, 0.15)',
          iconBorder: 'rgba(249, 115, 22, 0.5)',
          iconColor: '#f97316',
          textMain: '#ffffff',
          textMuted: '#9ca3af'
        };
      case 'obsidian_black':
        return {
          name: 'Obsidiana Stealth',
          cardBg: 'linear-gradient(170deg, #141416 0%, #0b0b0c 50%, #050506 100%)',
          cardBorder: 'rgba(226, 232, 240, 0.3)',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(255, 255, 255, 0.15) 0%, transparent 65%)',
          badgeBg: 'rgba(255, 255, 255, 0.15)',
          badgeText: '#f8fafc',
          badgeBorder: '#cbd5e1',
          accentColor: '#e2e8f0',
          subAccent: '#f8fafc',
          boxBg: 'rgba(20, 20, 22, 0.95)',
          boxBorder: 'rgba(255, 255, 255, 0.2)',
          iconBg: 'rgba(255, 255, 255, 0.1)',
          iconBorder: 'rgba(255, 255, 255, 0.3)',
          iconColor: '#ffffff',
          textMain: '#ffffff',
          textMuted: '#a1a1aa'
        };
      case 'clean_light':
        return {
          name: 'Apple Light Clean',
          cardBg: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
          cardBorder: '#cbd5e1',
          glowBg: 'radial-gradient(circle at 75% 25%, rgba(239, 68, 68, 0.08) 0%, transparent 65%)',
          badgeBg: '#fee2e2',
          badgeText: '#991b1b',
          badgeBorder: '#fca5a5',
          accentColor: '#dc2626',
          subAccent: '#991b1b',
          boxBg: '#ffffff',
          boxBorder: '#e2e8f0',
          iconBg: '#fee2e2',
          iconBorder: '#fca5a5',
          iconColor: '#dc2626',
          textMain: '#0f172a',
          textMuted: '#64748b'
        };
    }
  };

  const currentStyle = getThemeStyles();

  // Randomize / Vary Style, Color, Typography & Layout Design
  const handleRandomizeStyle = () => {
    // 1. Pick a random color theme (different from current)
    const availableThemes = ALL_THEMES.filter(t => t !== theme);
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    setTheme(randomTheme);

    // 2. Pick a random design layout variant (different from current)
    const variants: DesignVariant[] = [
      'classic', 'neon_edge', 'minimal_luxury', 'cyber_tech',
      'badge_poster', 'glassmorphism', 'retro_gold', 'futuristic_glitch'
    ];
    const availableVariants = variants.filter(v => v !== designVariant);
    const nextVariant = availableVariants[Math.floor(Math.random() * availableVariants.length)];
    setDesignVariant(nextVariant);

    // 3. Pick a random font / typography style (different from current)
    const fontIds: FontOption[] = FONT_OPTIONS.map(f => f.id);
    const availableFonts = fontIds.filter(f => f !== fontOption);
    const nextFont = availableFonts[Math.floor(Math.random() * availableFonts.length)];
    setFontOption(nextFont);

    // 4. Pick a random eye-catching Portuguese commercial badge
    const nextBadge = BADGE_PRESETS[Math.floor(Math.random() * BADGE_PRESETS.length)];
    setBadgeText(nextBadge);

    // 5. Vary product image glow & rotation angle
    const glows: ('3d_studio' | 'neon' | 'soft' | 'none')[] = ['3d_studio', 'neon', 'soft'];
    const nextGlow = glows[Math.floor(Math.random() * glows.length)];
    setImageGlow(nextGlow);

    const randomRot = Math.floor(Math.random() * 9) - 4; // -4deg to 4deg
    setImageRotation(randomRot);

    const themeStyle = getThemeStyles(randomTheme);
    const fontObj = FONT_OPTIONS.find(f => f.id === nextFont);
    const variantNames: Record<DesignVariant, string> = {
      classic: '💎 Clássico Luxo',
      neon_edge: '⚡ Neon Tech',
      minimal_luxury: '🍏 Minimal Apple',
      cyber_tech: '🚀 Cyber Tag',
      badge_poster: '🖼️ Moldura Pôster',
      glassmorphism: '❄️ Frosted Glass',
      retro_gold: '👑 Premium Dourado',
      futuristic_glitch: '👾 Gamer High-Speed'
    };

    toast.success(`✨ Novo Estilo Sorteado!
🎨 Arte: ${variantNames[nextVariant]} (${themeStyle.name})
🔤 Letras: ${fontObj?.name || nextFont}`);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem da logo deve ser menor que 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setStoreLogo(result);
        localStorage.setItem('godshop_store_logo', result);
        toast.success('Logo da loja atualizada e salva!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setStoreLogo(null);
    localStorage.removeItem('godshop_store_logo');
    toast.info('Logo removida. Usando emblema vetor da loja.');
  };

  // Handle Product Image Upload
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('A foto do produto deve ser menor que 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProductImage(dataUrl);
        setUseSampleImage(null);
        // Automatically default to screen blend mode if image might have dark background
        setImageBlendMode('screen');
        
        // Persist photo into database so it is never lost
        const photoName = (file.name ? file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : productModel).toUpperCase();
        db.product_photos.create({
          name: photoName,
          data_url: dataUrl,
          category: productModel || 'Aparelho',
          created_at: new Date().toISOString()
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['product_photos'] });
          toast.success('📸 Foto salva no Banco de Dados com sucesso!');
        }).catch(err => {
          console.warn('Erro ao salvar no banco:', err);
          toast.success('Foto do produto adicionada!');
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Quick Select Item
  const handleSelectFromStock = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;

    if (val.startsWith('iphone_')) {
      const id = val.replace('iphone_', '');
      const item = iphones.find(i => i.id === id);
      if (item) {
        const parts = item.model.toUpperCase().split(' ');
        if (parts.length > 1) {
          setProductModel(parts.slice(0, 2).join(' '));
          setProductStorage(item.storage || parts.slice(2).join(' ') || '128GB');
        } else {
          setProductModel(item.model.toUpperCase());
          setProductStorage(item.storage || '128GB');
        }
        setCondition(item.condition ? item.condition.toUpperCase() : 'SEMINOVO');
        setColorText(item.color ? item.color.toUpperCase() : 'MEIA-NOITE');
        setBattery(item.battery_health ? `${item.battery_health}%` : '100%');
        const sellP = item.sell_price || (item.buy_price ? item.buy_price * 1.3 : 2500);
        setPriceCash(sellP);
        setOriginalPrice(Math.round(sellP * 1.18));
        setPriceCard(Math.round(sellP * 1.08));
        toast.success(`Aparelho "${item.model}" carregado!`);
      }
    } else if (val.startsWith('console_')) {
      const id = val.replace('console_', '');
      const item = consoles.find(c => c.id === id);
      if (item) {
        setProductModel(item.model.toUpperCase());
        setProductStorage(item.version ? item.version.toUpperCase() : 'PREMIUM');
        setCondition(item.condition ? item.condition.toUpperCase() : 'EXCELENTE ESTADO');
        setColorText('PRETO');
        const priceVal = item.sell_price || (item.buy_price ? item.buy_price * 1.3 : 1500);
        setPriceCash(priceVal);
        setOriginalPrice(Math.round(priceVal * 1.18));
        setPriceCard(Math.round(priceVal * 1.08));
        toast.success(`Eletrônico "${item.model}" carregado!`);
      }
    } else if (val.startsWith('price_')) {
      const id = val.replace('price_', '');
      const item = prices.find(p => p.id === id);
      if (item) {
        setProductModel(item.model.toUpperCase());
        setProductStorage(item.storage ? item.storage.toUpperCase() : '128GB');
        setCondition(item.condition ? item.condition.toUpperCase() : 'SEMINOVO');
        setPriceCash(item.price);
        setOriginalPrice(Math.round(item.price * 1.18));
        setPriceCard(Math.round(item.price * 1.08));
        toast.success(`Modelo "${item.model}" selecionado da Tabela!`);
      }
    }
  };

  // Active Image Source
  const activeProductImageSrc = productImage || useSampleImage;

  // Caption Generator
  const captionText = `🔥 *${badgeText.toUpperCase()} - ${storeName}* 🔥

📱 *${productModel} ${productStorage}*
✨ *Condição:* ${condition} ${battery ? `(Bateria ${battery})` : ''}
🎨 *Cor:* ${colorText || 'Disponível em estoque'}

${showOriginalPrice && originalPrice > priceCash ? `❌ ~De: ${formatBRL(originalPrice)}~\n` : ''}💰 *À Vista no PIX:* ${formatBRL(priceCash)}
${enablePixInstallment ? `💸 *Parcelado no PIX:* Entrada de ${formatBRL(pixDownPaymentVal)} (${pixDownPaymentPercent}%) + ${pixInstallments}x de ${formatBRL(pixInstallmentVal)}\n` : ''}💳 *No Cartão:* até ${cardInstallments}x de ${formatBRL(cardInstallmentVal)}

🎁 *BRINDES & BENEFÍCIOS INCLUÍDOS:*
${includeCase ? '✅ Capinha de Proteção de Brinde\n' : ''}${includeFilm ? '✅ Película 3D Aplicada\n' : ''}${includeCharger ? '✅ Fonte / Carregador 20W\n' : ''}${includeWarranty ? '✅ Garantia Total da Loja\n' : ''}${includeFreeShipping ? '✅ Entrega Grátis na Sua Região\n' : ''}${customPerk ? `✅ ${customPerk}\n` : ''}
📍 *GARANTA JÁ O SEU:*
📲 WhatsApp: ${storePhone}
📸 Instagram: ${storeHandle}
${storeName} — ${storeSlogan}`;

  // Actions
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    const toastId = toast.loading('Gerando arte em altíssima definição HD...');
    try {
      const canvas = await captureElementToCanvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        onclone: (_doc, clonedEl) => {
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.overflow = 'visible';
        }
      });
      const link = document.createElement('a');
      link.download = `Tag_Oferta_${productModel.replace(/\s+/g, '_')}_${theme}_${storeName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(`Arte baixada no estilo ${currentStyle.name}!`, { id: toastId });

      // Auto Rotate Theme if enabled
      if (autoRotateThemeOnDownload) {
        const nextIndex = (ALL_THEMES.indexOf(theme) + 1) % ALL_THEMES.length;
        setTheme(ALL_THEMES[nextIndex]);
      }
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao baixar arte.', { id: toastId });
    }
  };

  // Download Package with 3 Color Varieties
  const handleDownloadVarietyPack = async () => {
    if (!cardRef.current) return;
    const toastId = toast.loading('Gerando pacote de 3 artes em cores variadas...');
    const themesToDownload: ThemeOption[] = ['crimson_red', 'dark_gold', 'sapphire_blue'];

    try {
      for (let i = 0; i < themesToDownload.length; i++) {
        const selectedTheme = themesToDownload[i];
        setTheme(selectedTheme);

        // Wait brief delay for DOM style update
        await new Promise(res => setTimeout(res, 250));

        if (cardRef.current) {
          const canvas = await captureElementToCanvas(cardRef.current, {
            scale: 3,
            backgroundColor: null,
            onclone: (_doc, clonedEl) => {
              clonedEl.style.maxHeight = 'none';
              clonedEl.style.overflow = 'visible';
            }
          });
          const link = document.createElement('a');
          link.download = `Tag_Oferta_${productModel.replace(/\s+/g, '_')}_${selectedTheme}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }
      toast.success('Pacote de 3 artes em cores variadas baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error('Erro ao baixar pacote:', err);
      toast.error('Erro ao gerar variedade de artes.', { id: toastId });
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(captionText);
    toast.success('Legenda profissional copiada!');
  };

  const handleSendWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(captionText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-foreground">
            <Sparkles className="h-6 w-6 text-red-500 animate-pulse" />
            Gerador de Encartes & Tags de Luxo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie encartes publicitários ultra-profissionais com a logo da sua loja, cores variadas e fotos tratadas para Stories, Feed e WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleRandomizeStyle}
            className="bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-purple-500/30 transition-all shadow-sm"
            title="Variar Cores e Estilo Visual"
          >
            <Dices className="h-4 w-4" />
            <span>Variar Cores</span>
          </button>
          <button
            onClick={handleCopyCaption}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-sm transition-all"
          >
            <Copy className="h-4 w-4" />
            <span>Copiar Legenda</span>
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
          >
            <Send className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleDownloadImage}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:shadow-red-500/25 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Imagem HD</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Form Controls (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-6 bg-card border rounded-2xl p-6 shadow-sm">
          
          {/* 1. Logo & Store Info */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
              <Store className="h-4 w-4" />
              1. Logo & Nome da Sua Loja
            </label>

            <div className="flex items-center gap-3">
              {storeLogo ? (
                <div className="relative group">
                  <div className="h-14 w-28 bg-black/60 border border-zinc-700 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                    <img src={storeLogo} alt="Logo da Loja" className="max-h-full max-w-full object-contain" />
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full text-xs shadow hover:bg-rose-700 transition"
                    title="Remover Logo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-14 w-28 border-2 border-dashed border-red-500/30 rounded-xl flex items-center justify-center text-xs text-muted-foreground bg-red-950/10 font-bold">
                  Emblema VETOR
                </div>
              )}

              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{storeLogo ? 'Trocar Logo' : 'Enviar Sua Logo (PNG/JPG)'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <label className="block font-semibold mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-background font-bold text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Slogan / Subtítulo</label>
                <input
                  type="text"
                  value={storeSlogan}
                  onChange={e => setStoreSlogan(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-background text-xs"
                />
              </div>
            </div>
          </div>

          {/* Quick Select Stock */}
          <div className="border-t pt-4">
            <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-red-500" />
              Carregar Direto do Estoque / Tabela
            </label>
            <select
              onChange={handleSelectFromStock}
              className="w-full p-3 border rounded-xl bg-background text-xs font-bold focus:ring-2 focus:ring-red-500 shadow-sm"
            >
              <option value="">Selecione um aparelho do seu estoque...</option>
              <optgroup label="Estoque de iPhones">
                {iphones.map(i => (
                  <option key={i.id} value={`iphone_${i.id}`}>
                    {i.model} - {i.storage} ({i.color}) - {formatBRL(i.sell_price || (i.buy_price ? i.buy_price * 1.3 : 0))}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Estoque de Eletrônicos">
                {consoles.map(c => (
                  <option key={c.id} value={`console_${c.id}`}>
                    {c.model} - {c.version || ''} - {formatBRL(c.sell_price || (c.buy_price ? c.buy_price * 1.3 : 0))}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tabela de Preços">
                {prices.map(p => (
                  <option key={p.id} value={`price_${p.id}`}>
                    {p.model} {p.storage || ''} - {formatBRL(p.price)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 2. Product Photo Upload & Image Correction Tools */}
          <div className="border-t pt-4 space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-red-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                2. Foto do Aparelho & Ferramentas de Correção
              </span>
              {productImage && (
                <button
                  onClick={() => {
                    setProductImage(null);
                    setUseSampleImage(SAMPLE_PRODUCT_PHOTOS[0].url);
                    setImageBlendMode('none');
                  }}
                  className="text-[10px] text-rose-500 hover:underline font-bold"
                >
                  Restaurar Render Exemplo
                </button>
              )}
            </label>

            {/* Main Action Bar: Database Gallery & Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPhotosGalleryOpen(true)}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Database className="h-4 w-4" />
                <span>Painel de Fotos Salvas ({savedPhotos.length})</span>
              </button>

              <div className="relative">
                <input
                  type="file"
                  ref={productImageInputRef}
                  onChange={handleProductImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => productImageInputRef.current?.click()}
                  className="w-full bg-muted/70 hover:bg-muted border border-dashed border-red-500/30 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Upload className="h-4 w-4 text-red-500" />
                  <span>{productImage ? 'Alterar Foto (Salva no Banco)' : 'Enviar Foto do Aparelho'}</span>
                </button>
              </div>
            </div>

            {/* Quick Sample Renders Strip */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground">
                  Atalhos Rápidos de Renders 3D:
                </span>
                <button
                  type="button"
                  onClick={() => setIsPhotosGalleryOpen(true)}
                  className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  Ver Todas na Galeria →
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {SAMPLE_PRODUCT_PHOTOS.slice(0, 5).map(sample => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setProductImage(null);
                      setUseSampleImage(sample.url);
                      setImageBlendMode('none');
                      toast.info(`Render "${sample.name}" selecionado!`);
                    }}
                    className={`p-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-2 shrink-0 ${
                      useSampleImage === sample.url && !productImage
                        ? 'border-red-500 bg-red-500/10 text-red-500 ring-2 ring-red-500/20'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <img src={sample.url} alt={sample.name} className="h-8 w-8 object-contain" />
                    <span className="whitespace-nowrap pr-1">{sample.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CORRECTION TOOLS FOR UPLOADED IMAGES (e.g. Removing Dark Boxes) */}
            <div className="bg-muted/40 p-3 rounded-xl border border-border space-y-2 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-foreground text-[11px]">
                <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                Correção & Ajustes na Imagem do Produto:
              </span>

              {/* Mode Blend Selection */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Mesclagem de Fundo (Corrige caixas pretas/escuras ao redor do celular):
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setImageBlendMode('none')}
                    className={`p-1.5 rounded-lg border text-center ${
                      imageBlendMode === 'none' ? 'bg-red-600 text-white border-red-600' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    Normal (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageBlendMode('screen')}
                    className={`p-1.5 rounded-lg border text-center ${
                      imageBlendMode === 'screen' ? 'bg-purple-600 text-white border-purple-600' : 'bg-background hover:bg-muted'
                    }`}
                    title="Remove o fundo escuro/quadrado preto da foto enviada"
                  >
                    Remover Fundo Escuro (Tela)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageBlendMode('lighten')}
                    className={`p-1.5 rounded-lg border text-center ${
                      imageBlendMode === 'lighten' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    Suavizar (Clarear)
                  </button>
                </div>
              </div>

              {/* Scale & Rotation Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold mb-1">
                    <span>Tamanho:</span>
                    <span>{imageScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={imageScale}
                    onChange={e => setImageScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold mb-1">
                    <span>Rotação:</span>
                    <span>{imageRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={imageRotation}
                    onChange={e => setImageRotation(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields: Device Details */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-xs uppercase text-red-500 tracking-wider">
              3. Detalhes do Aparelho
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Modelo Aparelho</label>
                <input
                  type="text"
                  value={productModel}
                  onChange={e => setProductModel(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border rounded-xl bg-background font-black text-xs"
                  placeholder="Ex: IPHONE 12"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Capacidade / Linha</label>
                <input
                  type="text"
                  value={productStorage}
                  onChange={e => setProductStorage(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border rounded-xl bg-background font-black text-xs"
                  placeholder="Ex: 64GB ou 128GB"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tag do Topo</label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={e => setBadgeText(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-background font-bold text-xs"
                  placeholder="Ex: OFERTA DA SEMANA"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Selo Condição</label>
                <input
                  type="text"
                  value={condition}
                  onChange={e => setCondition(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                  placeholder="Ex: SEMINOVO"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nome da Cor</label>
                <input
                  type="text"
                  value={colorText}
                  onChange={e => setColorText(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                  placeholder="Ex: VERMELHO PURPURA"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Saúde Bateria</label>
                <input
                  type="text"
                  value={battery}
                  onChange={e => setBattery(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                  placeholder="Ex: 100% ou 90%"
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                4. Preços & Parcelas
              </h3>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOriginalPrice}
                  onChange={e => setShowOriginalPrice(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Exibir De/Por (-OFF)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {showOriginalPrice && (
                <div>
                  <label className="block font-semibold mb-1 text-muted-foreground">Preço De (Original)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={e => setOriginalPrice(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl bg-background font-semibold text-xs text-rose-500"
                  />
                </div>
              )}

              <div className={showOriginalPrice ? '' : 'sm:col-span-2'}>
                <label className="block font-bold mb-1 text-emerald-600 dark:text-emerald-400">À Vista PIX (Por)</label>
                <input
                  type="number"
                  value={priceCash}
                  onChange={e => handlePriceCashChange(Number(e.target.value))}
                  className="w-full p-2.5 border-2 border-emerald-500/40 rounded-xl bg-background font-black text-emerald-600 text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold">Total Cartão (R$)</label>
                  <button
                    type="button"
                    onClick={() => setPriceCard(Math.round(priceCash * 1.08))}
                    className="text-[10px] text-emerald-600 font-bold hover:underline"
                    title="Recalcular com taxa padrão (+8%)"
                  >
                    +8% Auto
                  </button>
                </div>
                <input
                  type="number"
                  value={priceCard}
                  onChange={e => setPriceCard(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Valor de Cada Parcela (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={Math.round(cardInstallmentVal * 100) / 100}
                  onChange={e => handleInstallmentValChange(Number(e.target.value))}
                  className="w-full p-2.5 border border-purple-500/40 rounded-xl bg-background text-xs font-black text-purple-600 dark:text-purple-400"
                  placeholder="Ex: 187.17"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Qtd Parcelas Cartão</label>
                <select
                  value={cardInstallments}
                  onChange={e => setCardInstallments(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                >
                  <option value={1}>1x sem juros</option>
                  <option value={2}>2x sem juros</option>
                  <option value={3}>3x sem juros</option>
                  <option value={4}>4x sem juros</option>
                  <option value={5}>5x sem juros</option>
                  <option value={6}>6x sem juros</option>
                  <option value={7}>7x sem juros</option>
                  <option value={8}>8x sem juros</option>
                  <option value={9}>9x sem juros</option>
                  <option value={10}>10x sem juros</option>
                  <option value={11}>11x sem juros</option>
                  <option value={12}>12x sem juros</option>
                  <option value={15}>15x sem juros</option>
                  <option value={18}>18x sem juros</option>
                  <option value={21}>21x sem juros</option>
                  <option value={24}>24x sem juros</option>
                </select>
              </div>

              {/* Opção de Parcelamento no PIX */}
              <div className="sm:col-span-2 border-t pt-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-all">
                  <input
                    type="checkbox"
                    checked={enablePixInstallment}
                    onChange={e => setEnablePixInstallment(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">Habilitar Parcelamento no PIX</span>
                    <span className="text-[10px] text-muted-foreground">Exibe a opção de pagar uma entrada e o restante parcelado no PIX</span>
                  </div>
                </label>

                {enablePixInstallment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold text-emerald-700 dark:text-emerald-300">Entrada (%)</label>
                        <span className="font-black text-emerald-600 text-[11px]">{formatBRL(pixDownPaymentVal)}</span>
                      </div>
                      <select
                        value={pixDownPaymentPercent}
                        onChange={e => setPixDownPaymentPercent(Number(e.target.value))}
                        className="w-full p-2 border-2 border-emerald-500/20 rounded-xl bg-background text-xs font-bold"
                      >
                        <option value={10}>10% de Entrada</option>
                        <option value={15}>15% de Entrada</option>
                        <option value={20}>20% de Entrada</option>
                        <option value={25}>25% de Entrada</option>
                        <option value={30}>30% de Entrada</option>
                        <option value={35}>35% de Entrada</option>
                        <option value={40}>40% de Entrada</option>
                        <option value={45}>45% de Entrada</option>
                        <option value={50}>50% de Entrada</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold text-emerald-700 dark:text-emerald-300">Restante no PIX</label>
                        <span className="font-black text-emerald-600 text-[11px]">{pixInstallments}x de {formatBRL(pixInstallmentVal)}</span>
                      </div>
                      <select
                        value={pixInstallments}
                        onChange={e => setPixInstallments(Number(e.target.value))}
                        className="w-full p-2 border-2 border-emerald-500/20 rounded-xl bg-background text-xs font-bold"
                      >
                        <option value={2}>2x no PIX</option>
                        <option value={3}>3x no PIX</option>
                        <option value={4}>4x no PIX</option>
                        <option value={5}>5x no PIX</option>
                        <option value={6}>6x no PIX</option>
                        <option value={8}>8x no PIX</option>
                        <option value={10}>10x no PIX</option>
                        <option value={12}>12x no PIX</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. BRINDES & ESTILOS DE ENCARTE / TAGS (ALINHADOS LADO A LADO) */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-amber-500" />
                5. Brindes & Estilos de Encartes / Tags
              </h3>
              <button
                type="button"
                onClick={handleRandomizeStyle}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <Dices className="h-3.5 w-3.5" />
                Variar Cores
              </button>
            </div>

            {/* Side-by-Side Grid: Brindes do Lado do Seletor de Encartes/Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Box 1 (Esquerda): Brindes Incluídos */}
              <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border text-xs">
                <h4 className="font-extrabold text-foreground text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-amber-500" />
                  🎁 Brindes Incluídos
                </h4>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-background transition">
                    <input
                      type="checkbox"
                      checked={includeCase}
                      onChange={e => setIncludeCase(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-xs">Capinha de Brinde</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-background transition">
                    <input
                      type="checkbox"
                      checked={includeFilm}
                      onChange={e => setIncludeFilm(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-xs">Película 3D</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-background transition">
                    <input
                      type="checkbox"
                      checked={includeCharger}
                      onChange={e => setIncludeCharger(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-xs">Fonte 20W Incluída</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-background transition">
                    <input
                      type="checkbox"
                      checked={includeWarranty}
                      onChange={e => setIncludeWarranty(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-xs">Garantia da Loja</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-background transition">
                    <input
                      type="checkbox"
                      checked={includeFreeShipping}
                      onChange={e => setIncludeFreeShipping(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">Entrega Grátis</span>
                  </label>
                </div>
              </div>

              {/* Box 2 (Direita): Encartes & Tags / Estilos Visuais */}
              <div className="space-y-2.5 bg-muted/30 p-3.5 rounded-xl border border-border text-xs">
                <h4 className="font-extrabold text-foreground text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-purple-500" />
                    🏷️ Encartes & Tags
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">8 Temas</span>
                </h4>

                {/* Theme Palette Buttons Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_THEMES.map(t => {
                    const style = getThemeStyles(t);
                    const isSelected = theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        className={`p-2 rounded-lg border text-[10px] font-bold transition flex items-center gap-1.5 text-left truncate ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30'
                            : 'border-border bg-background hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <span 
                          className="h-3 w-3 rounded-full shrink-0 border border-white/20 shadow-sm inline-block"
                          style={{ backgroundColor: style.accentColor }} 
                        />
                        <span className="truncate">{style.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Design Variant Layout Selector */}
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">Modelo da Arte (Estilo Visual):</label>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                    {(['classic', 'neon_edge', 'minimal_luxury', 'cyber_tech', 'badge_poster', 'glassmorphism', 'retro_gold', 'futuristic_glitch'] as DesignVariant[]).map(v => {
                      const labels: Record<DesignVariant, string> = {
                        classic: '💎 Clássico Luxo',
                        neon_edge: '⚡ Neon Tech',
                        minimal_luxury: '🍏 Minimal Apple',
                        cyber_tech: '🚀 Cyber Tag',
                        badge_poster: '🖼️ Moldura Pôster',
                        glassmorphism: '❄️ Frosted Glass',
                        retro_gold: '👑 Premium Dourado',
                        futuristic_glitch: '👾 Gamer High-Speed'
                      };
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDesignVariant(v)}
                          className={`p-1.5 rounded-md border text-left truncate transition ${
                            designVariant === v
                              ? 'bg-purple-600 text-white border-purple-600 shadow'
                              : 'bg-background hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {labels[v]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Typography Selector */}
                <div className="pt-2.5 border-t border-border/50">
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Type className="h-3 w-3 text-indigo-500" />
                      Fonte & Letras:
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold text-[9.5px]">{currentFontObj.name}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                    {FONT_OPTIONS.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontOption(f.id)}
                        style={{ fontFamily: f.family }}
                        className={`p-1.5 rounded-md border text-center truncate transition ${
                          fontOption === f.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow ring-1 ring-indigo-400'
                            : 'bg-background hover:bg-muted text-muted-foreground'
                        }`}
                        title={f.name}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">Formato da Tag:</label>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('story')}
                      className={`p-1.5 rounded-md border text-center ${
                        aspectRatio === 'story' ? 'bg-red-600 text-white border-red-600' : 'bg-background hover:bg-muted'
                      }`}
                    >
                      Story (9:16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('feed')}
                      className={`p-1.5 rounded-md border text-center ${
                        aspectRatio === 'feed' ? 'bg-red-600 text-white border-red-600' : 'bg-background hover:bg-muted'
                      }`}
                    >
                      Feed (1:1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('banner')}
                      className={`p-1.5 rounded-md border text-center ${
                        aspectRatio === 'banner' ? 'bg-red-600 text-white border-red-600' : 'bg-background hover:bg-muted'
                      }`}
                    >
                      Vitrine (16:9)
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-bold text-xs uppercase text-blue-600 dark:text-blue-400 tracking-wider">
              6. Contato & Redes Sociais
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-semibold mb-1">Instagram</label>
                <input
                  type="text"
                  value={storeHandle}
                  onChange={e => setStoreHandle(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-background font-bold text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={e => setStorePhone(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-background font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Download Variation Controls */}
          <div className="border-t pt-4 space-y-3 bg-purple-950/10 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-500/20">
            <h3 className="font-bold text-xs uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Dices className="h-4 w-4" />
                Variação de Estilos no Download
              </span>
              <span className="text-[10px] text-purple-400 font-extrabold">AUTO-ESTILOS</span>
            </h3>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={autoRotateThemeOnDownload}
                  onChange={e => setAutoRotateThemeOnDownload(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Variar cor automaticamente a cada download efetuado</span>
              </label>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownloadVarietyPack}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Layers className="h-4 w-4" />
                  <span>Baixar Pacote de 3 Estilos em Cores Variadas</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live HD Preview Card (lg:col-span-6) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center sticky top-6 space-y-4">
          <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-muted-foreground">
            <span>PREVIEW DA ARTE HD</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomizeStyle}
                className="text-purple-500 hover:underline flex items-center gap-1 text-[11px]"
              >
                <Dices className="h-3.5 w-3.5" />
                Sortear Estilo
              </button>
              <span className="text-red-500 uppercase font-black">{aspectRatio} • {currentStyle.name} • Letra: {currentFontObj.name}</span>
            </div>
          </div>

          {/* THE LUXURY GENERATED TAG CARD CONTAINER */}
          <div
            ref={cardRef}
            style={{
              fontFamily: currentFontFamily,
              background: currentStyle.cardBg,
              color: currentStyle.textMain,
              borderColor: designVariant === 'retro_gold' ? '#f59e0b' : currentStyle.cardBorder,
              borderWidth: designVariant === 'minimal_luxury' ? '1px' : designVariant === 'retro_gold' ? '3px' : '2px',
              borderStyle: 'solid',
              boxShadow: designVariant === 'neon_edge' 
                ? `0 0 35px ${currentStyle.accentColor}70, 0 0 15px ${currentStyle.accentColor}40` 
                : designVariant === 'retro_gold'
                ? `0 0 30px rgba(245, 158, 11, 0.35)`
                : undefined
            }}
            className={`relative transition-all shadow-2xl flex flex-col justify-between select-none ${
              aspectRatio === 'story'
                ? 'w-full max-w-[390px] aspect-[9/16] rounded-[28px] overflow-hidden p-4 sm:p-5'
                : aspectRatio === 'feed'
                ? 'w-full max-w-[420px] aspect-square rounded-[28px] overflow-hidden p-3.5 sm:p-4'
                : 'w-full max-w-[540px] aspect-[16/9] rounded-2xl overflow-hidden p-3 sm:p-3.5'
            }`}
          >

            {/* Background Radial Glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: currentStyle.glowBg }}
            />

            {/* Cyber Tech Top Accent Bar */}
            {designVariant === 'cyber_tech' && (
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 z-20" 
                style={{ background: `linear-gradient(90deg, transparent 0%, ${currentStyle.accentColor} 50%, transparent 100%)` }}
              />
            )}

            {/* Moldura Pôster (Badge Poster Overlay) */}
            {designVariant === 'badge_poster' && (
              <div 
                className="absolute inset-2 pointer-events-none rounded-[22px] border-2 border-dashed z-20"
                style={{ borderColor: `${currentStyle.accentColor}50` }}
              />
            )}

            {/* Retro Gold Metallic Highlight */}
            {designVariant === 'retro_gold' && (
              <div 
                className="absolute inset-1.5 pointer-events-none rounded-[24px] border border-amber-500/40 z-20"
                style={{ boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.2)' }}
              />
            )}

            {/* Frosted Glass Overlay */}
            {designVariant === 'glassmorphism' && (
              <div 
                className="absolute inset-0 pointer-events-none z-0 backdrop-blur-[3px] bg-white/[0.02]"
              />
            )}

            {/* Gamer / Futuristic Glitch Corner Accents */}
            {designVariant === 'futuristic_glitch' && (
              <>
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 z-20" style={{ borderColor: currentStyle.accentColor }} />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 z-20" style={{ borderColor: currentStyle.accentColor }} />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 z-20" style={{ borderColor: currentStyle.accentColor }} />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 z-20" style={{ borderColor: currentStyle.accentColor }} />
              </>
            )}

            {aspectRatio === 'banner' ? (
              /* ------------------------------------------------------------- */
              /* 16:9 VITRINE LANDSCAPE 2-COLUMN SPLIT LAYOUT                  */
              /* ------------------------------------------------------------- */
              <div className="relative z-10 grid grid-cols-12 gap-3 h-full items-center">
                
                {/* LEFT COLUMN: BRAND, SPECS, PERKS & CONTACT */}
                <div className="col-span-7 flex flex-col justify-between h-full py-0.5 space-y-1">
                  
                  {/* Brand Header */}
                  <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-2">
                      {storeLogo ? (
                        <div className="h-6 max-w-[110px] flex items-center justify-start">
                          <img src={storeLogo} alt="Logo" className="max-h-full max-w-full object-contain filter drop-shadow" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center font-black text-white text-xs bg-zinc-800 border border-white/20">
                            G
                          </div>
                          <div>
                            <h2 className="font-black text-xs leading-none" style={{ color: currentStyle.textMain }}>{storeName}</h2>
                            <p className="text-[7.5px] uppercase font-bold tracking-widest" style={{ color: currentStyle.textMuted }}>{storeSlogan}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider shadow-sm"
                      style={{
                        backgroundColor: currentStyle.badgeBg,
                        borderColor: currentStyle.badgeBorder,
                        color: currentStyle.badgeText
                      }}
                    >
                      <Tag className="h-2.5 w-2.5 shrink-0" style={{ color: currentStyle.badgeBorder }} />
                      <span>{badgeText}</span>
                    </div>
                  </div>

                  {/* Product Title & Badges */}
                  <div>
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                      <span
                        className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderColor: 'rgba(255,255,255,0.15)',
                          color: currentStyle.textMain
                        }}
                      >
                        {condition}
                      </span>
                      {battery && (
                        <span
                          className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-0.5"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#34d399'
                          }}
                        >
                          <Zap className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                          BAT. {battery}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-black tracking-tight leading-none uppercase" style={{ color: currentStyle.textMain }}>
                      {productModel}
                    </h3>
                    <h4 className="text-lg sm:text-xl font-black tracking-tight leading-none uppercase mt-0.5" style={{ color: currentStyle.textMain }}>
                      {productStorage}
                    </h4>

                    {colorText && (
                      <p className="text-[8.5px] font-extrabold uppercase tracking-wider mt-0.5">
                        <span style={{ color: currentStyle.textMuted }}>COR: </span>
                        <span style={{ color: currentStyle.accentColor }}>{colorText}</span>
                      </p>
                    )}
                  </div>

                  {/* Compact Perks Grid */}
                  <div
                    className="p-1.5 rounded-lg border backdrop-blur-md text-[8px] font-bold grid grid-cols-2 gap-1"
                    style={{ background: currentStyle.boxBg, borderColor: currentStyle.boxBorder }}
                  >
                    {includeCase && <span className="flex items-center gap-1 truncate" style={{ color: currentStyle.textMain }}>🎁 Capinha Brinde</span>}
                    {includeFilm && <span className="flex items-center gap-1 truncate" style={{ color: currentStyle.textMain }}>📱 Película 3D</span>}
                    {includeCharger && <span className="flex items-center gap-1 truncate" style={{ color: currentStyle.textMain }}>⚡ Fonte 20W</span>}
                    {includeWarranty && <span className="flex items-center gap-1 truncate" style={{ color: currentStyle.textMain }}>🛡️ Garantia da Loja</span>}
                    {includeFreeShipping && (
                      <span className="col-span-2 text-emerald-400 flex items-center gap-1 truncate">
                        🚚 Entrega Grátis na Sua Região
                      </span>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="flex items-center justify-between text-[8px] font-bold pt-0.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)', color: currentStyle.textMuted }}>
                    <span className="flex items-center gap-1">
                      <Instagram className="h-2.5 w-2.5 shrink-0" style={{ color: currentStyle.accentColor }} />
                      {storeHandle}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5 shrink-0" style={{ color: currentStyle.accentColor }} />
                      {storePhone}
                    </span>
                  </div>

                </div>

                {/* RIGHT COLUMN: PRODUCT PHOTO & PRICE CARD */}
                <div className="col-span-5 flex flex-col justify-between items-center h-full py-0.5 space-y-1">
                  
                  {/* Full Display Product Photo */}
                  <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden p-1">
                    {activeProductImageSrc ? (
                      <img
                        src={activeProductImageSrc}
                        alt="Produto"
                        style={{
                          mixBlendMode: imageBlendMode !== 'none' ? (imageBlendMode as any) : undefined,
                          transform: `scale(${imageScale / 100}) rotate(${imageRotation}deg)`,
                          filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.85))'
                        }}
                        className="max-h-28 sm:max-h-32 object-contain transition-all duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="h-20 w-full rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-zinc-500 text-[9px] text-center p-2">
                        Foto do Aparelho
                      </div>
                    )}
                  </div>

                  {/* Price Box Card */}
                  <div
                    className="w-full p-2 rounded-xl border shadow-xl space-y-0.5 text-center backdrop-blur-md"
                    style={{ background: currentStyle.boxBg, borderColor: currentStyle.boxBorder }}
                  >
                    <div className="flex items-center justify-between text-[8px] font-black uppercase">
                      <span style={{ color: currentStyle.accentColor }}>À VISTA PIX</span>
                      {showOriginalPrice && discountPercent > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-white text-[7.5px]" style={{ backgroundColor: currentStyle.accentColor }}>
                          -{discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {showOriginalPrice && originalPrice > priceCash && (
                      <div className="text-[9.5px] line-through font-bold text-left" style={{ color: currentStyle.textMuted }}>
                        DE: {formatBRL(originalPrice)}
                      </div>
                    )}

                    <div className="text-2xl font-black tracking-tight leading-none text-left" style={{ color: currentStyle.textMain }}>
                      {formatBRL(priceCash)}
                    </div>

                    <div className="pt-1 border-t flex justify-between items-center text-[8px]" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <span className="font-bold uppercase text-[7.5px]" style={{ color: currentStyle.textMuted }}>NO CARTÃO:</span>
                      <span className="font-black text-[9px]" style={{ color: currentStyle.textMain }}>
                        {cardInstallments}x {formatBRL(cardInstallmentVal)}
                      </span>
                    </div>

                    {enablePixInstallment && (
                      <div className="pt-1 border-t flex justify-between items-center text-[8px]" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <span className="font-bold uppercase text-[7.5px]" style={{ color: currentStyle.accentColor }}>NO PIX:</span>
                        <span className="font-black text-[8.5px]" style={{ color: currentStyle.textMain }}>
                          {pixDownPaymentPercent}% + {pixInstallments}x {formatBRL(pixInstallmentVal)}
                        </span>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            ) : (
              /* ------------------------------------------------------------- */
              /* STORY (9:16) AND FEED (1:1) VERTICAL POSTER LAYOUTS           */
              /* ------------------------------------------------------------- */
              <>
                {/* Top Brand Header */}
                <div className={`relative z-10 flex items-center justify-between border-b ${aspectRatio === 'feed' ? 'pb-2' : 'pb-2.5'}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-2">
                    {storeLogo ? (
                      <div className={`${aspectRatio === 'feed' ? 'h-7 max-w-[110px]' : 'h-9 max-w-[130px]'} flex items-center justify-start`}>
                        <img src={storeLogo} alt="Logo" className="max-h-full max-w-full object-contain filter drop-shadow" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className={`${aspectRatio === 'feed' ? 'h-7 w-7 rounded-lg text-sm' : 'h-9 w-9 rounded-xl text-base'} flex items-center justify-center font-black text-white shadow-xl relative overflow-hidden`}
                          style={{
                            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                            border: '1.5px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          G
                        </div>
                        <div>
                          <h2 className={`${aspectRatio === 'feed' ? 'text-sm' : 'text-base'} font-black tracking-tight leading-none`} style={{ color: currentStyle.textMain }}>
                            {storeName}
                          </h2>
                          <p className="text-[8px] tracking-widest uppercase font-extrabold mt-0.5" style={{ color: currentStyle.textMuted }}>
                            {storeSlogan}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tag Badge Pill */}
                  <div
                    className={`flex items-center gap-1.5 ${aspectRatio === 'feed' ? 'px-2.5 py-0.5 text-[8.5px]' : 'px-3 py-1 text-[9.5px]'} rounded-full border shadow-md font-black uppercase tracking-wider`}
                    style={{
                      backgroundColor: currentStyle.badgeBg,
                      borderColor: currentStyle.badgeBorder,
                      color: currentStyle.badgeText
                    }}
                  >
                    <Tag className="h-3 w-3 shrink-0" style={{ color: currentStyle.badgeBorder }} />
                    <span>{badgeText}</span>
                  </div>
                </div>

                {/* Upper Middle Section: Specs & Product Image */}
                <div className={`relative z-10 my-auto ${aspectRatio === 'feed' ? 'py-1' : 'py-1.5'} grid grid-cols-12 gap-2 items-center`}>
                  
                  {/* Left Specs Column */}
                  <div className="col-span-7 space-y-1">
                    
                    {/* Condition & Battery Badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          borderColor: 'rgba(255,255,255,0.15)',
                          color: currentStyle.textMain
                        }}
                      >
                        {condition}
                      </span>

                      {battery && (
                        <span
                          className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#34d399'
                          }}
                        >
                          <Zap className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                          BAT. {battery}
                        </span>
                      )}
                    </div>

                    {/* Product Title */}
                    <div>
                      <h3
                        className={`${aspectRatio === 'feed' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-black tracking-tight leading-none uppercase`}
                        style={{ color: currentStyle.textMain }}
                      >
                        {productModel}
                      </h3>
                      <h4
                        className={`${aspectRatio === 'feed' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-black tracking-tight leading-none uppercase mt-0.5`}
                        style={{ color: currentStyle.textMain }}
                      >
                        {productStorage}
                      </h4>
                    </div>

                    {/* Color Accent */}
                    {colorText && (
                      <p className="text-[9.5px] font-extrabold uppercase tracking-wider mt-0.5">
                        <span style={{ color: currentStyle.textMuted }}>COR: </span>
                        <span style={{ color: currentStyle.accentColor }}>{colorText}</span>
                      </p>
                    )}
                  </div>

                  {/* Right Product Image Container */}
                  <div className="col-span-5 flex justify-center items-center relative overflow-hidden">
                    {activeProductImageSrc ? (
                      <div className="relative group flex items-center justify-center">
                        <img
                          src={activeProductImageSrc}
                          alt="Produto"
                          style={{
                            mixBlendMode: imageBlendMode !== 'none' ? (imageBlendMode as any) : undefined,
                            transform: `scale(${imageScale / 100}) rotate(${imageRotation}deg)`,
                            filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.85))'
                          }}
                          className={`${aspectRatio === 'feed' ? 'max-h-24 sm:max-h-28' : 'max-h-32 sm:max-h-36'} object-contain transition-all duration-300 hover:scale-105`}
                        />
                      </div>
                    ) : (
                      <div className={`${aspectRatio === 'feed' ? 'h-24' : 'h-28'} w-full rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-zinc-500 text-[10px] text-center p-2`}>
                        Foto do Aparelho
                      </div>
                    )}
                  </div>

                </div>

                {/* Price Box Card */}
                <div
                  className={`relative z-10 ${aspectRatio === 'feed' ? 'p-2.5 sm:p-3 space-y-1' : 'p-3 sm:p-3.5 space-y-1.5'} rounded-xl border shadow-xl backdrop-blur-md`}
                  style={{
                    background: currentStyle.boxBg,
                    borderColor: currentStyle.boxBorder
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: currentStyle.accentColor }}>
                      À VISTA NO PIX
                    </span>

                    {showOriginalPrice && discountPercent > 0 && (
                      <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full tracking-wider" style={{ backgroundColor: currentStyle.accentColor, color: '#ffffff' }}>
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {showOriginalPrice && originalPrice > priceCash && (
                    <div className="text-[10px] line-through font-bold" style={{ color: currentStyle.textMuted }}>
                      DE: {formatBRL(originalPrice)}
                    </div>
                  )}

                  <div className={`${aspectRatio === 'feed' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} font-black tracking-tight leading-none`} style={{ color: currentStyle.textMain }}>
                    {formatBRL(priceCash)}
                  </div>

                  <div className="pt-1 border-t flex justify-between items-center text-xs" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className="font-bold tracking-wider uppercase text-[8.5px]" style={{ color: currentStyle.textMuted }}>
                      OU NO CARTÃO:
                    </span>
                    <span className="font-black text-xs sm:text-sm" style={{ color: currentStyle.textMain }}>
                      {cardInstallments}x de {formatBRL(cardInstallmentVal)}
                    </span>
                  </div>

                  {enablePixInstallment && (
                    <div className="pt-1 border-t flex justify-between items-center text-xs" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <span className="font-bold tracking-wider uppercase text-[8.5px]" style={{ color: currentStyle.accentColor }}>
                        OU PARCELADO NO PIX:
                      </span>
                      <span className="font-black text-xs sm:text-sm" style={{ color: currentStyle.textMain }}>
                        Entr. {formatBRL(pixDownPaymentVal)} + {pixInstallments}x {formatBRL(pixInstallmentVal)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Perks Grid Box */}
                <div
                  className={`relative z-10 ${aspectRatio === 'feed' ? 'p-2 space-y-1' : 'p-2.5 sm:p-3 my-1'} rounded-xl border backdrop-blur-md`}
                  style={{
                    background: currentStyle.boxBg,
                    borderColor: currentStyle.boxBorder
                  }}
                >
                  <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                    {includeCase && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: currentStyle.iconBg, borderColor: currentStyle.iconBorder, color: currentStyle.iconColor }}>
                          <Gift className="h-3 w-3" />
                        </div>
                        <span className="font-extrabold uppercase text-[8.5px]" style={{ color: currentStyle.textMain }}>CAPINHA BRINDE</span>
                      </div>
                    )}

                    {includeFilm && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: currentStyle.iconBg, borderColor: currentStyle.iconBorder, color: currentStyle.iconColor }}>
                          <Box className="h-3 w-3" />
                        </div>
                        <span className="font-extrabold uppercase text-[8.5px]" style={{ color: currentStyle.textMain }}>PELÍCULA 3D</span>
                      </div>
                    )}

                    {includeCharger && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: currentStyle.iconBg, borderColor: currentStyle.iconBorder, color: currentStyle.iconColor }}>
                          <Zap className="h-3 w-3" />
                        </div>
                        <span className="font-extrabold uppercase text-[8.5px]" style={{ color: currentStyle.textMain }}>FONTE 20W INCLUÍDA</span>
                      </div>
                    )}

                    {includeWarranty && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: currentStyle.iconBg, borderColor: currentStyle.iconBorder, color: currentStyle.iconColor }}>
                          <ShieldCheck className="h-3 w-3" />
                        </div>
                        <span className="font-extrabold uppercase text-[8.5px]" style={{ color: currentStyle.textMain }}>GARANTIA DA LOJA</span>
                      </div>
                    )}

                    {includeFreeShipping && (
                      <div className="flex items-center gap-1.5 col-span-2 pt-0.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: currentStyle.iconBg, borderColor: currentStyle.iconBorder, color: currentStyle.iconColor }}>
                          <Truck className="h-3 w-3" />
                        </div>
                        <span className="font-extrabold uppercase text-[8.5px] text-emerald-400">ENTREGA GRÁTIS NA SUA REGIÃO</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Details */}
                <div className="relative z-10 pt-0.5 space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider" style={{ color: currentStyle.textMain }}>
                    <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: currentStyle.accentColor }} />
                    <span>GARANTA JÁ O SEU!</span>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] font-bold" style={{ color: currentStyle.textMuted }}>
                    <span className="flex items-center gap-1">
                      <Instagram className="h-3 w-3 shrink-0" style={{ color: currentStyle.accentColor }} />
                      {storeHandle}
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" style={{ color: currentStyle.accentColor }} />
                      {storePhone}
                    </span>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
      {/* Product Photos Gallery Modal */}
      <ProductPhotosGalleryModal
        isOpen={isPhotosGalleryOpen}
        onClose={() => setIsPhotosGalleryOpen(false)}
        onSelectPhoto={(url, name) => {
          setProductImage(url);
          setUseSampleImage(null);
          setImageBlendMode('screen');
          setIsPhotosGalleryOpen(false);
          if (name) {
            toast.success(`Foto "${name}" aplicada ao encarte!`);
          }
        }}
        selectedPhotoUrl={productImage || useSampleImage}
      />
    </div>
  );
}
