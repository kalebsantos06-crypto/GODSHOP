export type StudioCanvasFormat = 'story' | 'feed_portrait' | 'square' | 'banner' | 'custom';

export type StudioElementType = 'text' | 'image' | 'badge' | 'price' | 'price_tag' | 'shape' | 'pix_key' | 'divider' | 'logo';

export interface StudioElement {
  id: string;
  type: StudioElementType;
  x: number; // percentage or px
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  locked?: boolean;

  // Text specific
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'medium' | 'bold' | 'extrabold' | 'black';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  shadow?: boolean;
  shadowColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'uppercase' | 'none' | 'lowercase';

  // Image specific
  src?: string;
  borderRadius?: number;
  objectFit?: 'contain' | 'cover' | 'fill';
  blendMode?: string;
  brightness?: number; // 50 to 150 (default 100)
  contrast?: number;   // 50 to 150 (default 100)
  saturation?: number; // 50 to 150 (default 100)
  hasRemovedBg?: boolean;

  // Badge specific
  label?: string;
  badgeBg?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;

  // Price specific
  cashPrice?: number;
  priceText?: string;
  installmentText?: string;
  conditionBadge?: string;
  installmentCount?: number;
  installmentValue?: number;
  downPayment?: number;
  paymentNote?: string;
  highlightColor?: string;

  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'pill' | 'frame';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface StudioLinkedProduct {
  id: string;
  type: 'iphone' | 'console' | 'gift';
  name: string;
  model?: string;
  version?: string;
  storage?: string;
  color?: string;
  condition?: string;
  price: number;
  originalSellPrice: number;
  photoUrl?: string;
  warranty?: string;
}

export interface StudioProject {
  id: string;
  name: string;
  type: 'art' | 'video';
  format: StudioCanvasFormat;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  elements: StudioElement[];
  linkedProduct?: StudioLinkedProduct;
  tags?: string[];
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  previewImage?: string;
}

export interface StudioVideoScene {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  priceText?: string;
  installmentText?: string;
  imageUrl?: string;
  duration: number; // in seconds (2 to 8)
  transition: 'fade' | 'slide' | 'zoom' | 'pulse';
  backgroundColor: string;
  backgroundGradient?: string;
  tagline?: string;
}

export interface StudioVideoProject {
  id: string;
  name: string;
  format: 'story' | 'feed_portrait' | 'square';
  width: number;
  height: number;
  scenes: StudioVideoScene[];
  linkedProduct?: StudioLinkedProduct;
  createdAt: string;
  updatedAt: string;
}

export interface StudioTemplate {
  id: string;
  title: string;
  category: 'iphones' | 'consoles' | 'acessorios' | 'ofertas' | 'lancamentos' | 'queima' | 'comparativo';
  format: StudioCanvasFormat;
  description: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundGradient?: string;
  previewBg: string;
  accentColor: string;
  elements: StudioElement[];
}

export interface StudioCampaign {
  id: string;
  title: string;
  description: string;
  objective: 'lancamento' | 'ofertas' | 'queima' | 'datas_especiais' | 'institucional';
  startDate: string;
  endDate: string;
  status: 'ativa' | 'planejada' | 'concluida';
  linkedProductIds: string[];
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommercialCalculatorState {
  costPrice: number;
  sellPrice: number;
  cardFeePct: number;
  shippingCost: number;
  packagingCost: number;
  warrantyReserve: number;
  otherCosts: number;
}
