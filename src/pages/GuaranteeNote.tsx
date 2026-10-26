import React, { useRef, useState, useEffect, useMemo } from 'react';
import { getBaseUrl, copyToClipboard, shareContent } from '../utils/url';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { supabase } from '../lib/supabase';
import { formatBRL } from '../lib/formatCurrency';
import { format, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate, getSaleClient } from '../lib/dateUtils';
import { getConditionLabel, getWarrantyMonths } from '../lib/utils';
import { Printer, ArrowLeft, Download, MessageCircle, FileDown, Smartphone, Share2, Copy, Check, ExternalLink, ShieldCheck, PenTool, Camera, Trash2, Plus, Image as ImageIcon, Lock, AlertTriangle, Eye, RefreshCw, Sparkles, CheckSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import SignatureDisplay from '../components/SignatureDisplay';
import LoadingScreen from '../components/LoadingScreen';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { checkAndRequestStoragePermission } from '../utils/permissionUtils';
import { safeSetLocalStorage } from '../utils/imageStorageUtils';

// Helper local storage accessors for robust sales fallback syncing
const getLocalSales = () => {
  try {
    const data = localStorage.getItem('db_fallback_sales');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalSales = (sales: any[]) => {
  try {
    const sliced = Array.isArray(sales) ? sales.slice(-40) : [];
    const sanitized = sliced.map(s => {
      if (!s) return s;
      // DO NOT TRUNCATE signature_data anymore, as it causes loss of signature in PDFs and local view
      return { ...s };
    });
    safeSetLocalStorage('db_fallback_sales', JSON.stringify(sanitized));
  } catch (e) {}
};

// Checklist and Photo configurations
const CHECKLIST_ITEMS = {
  physical: [
    { key: 'tela_sem_riscos', label: 'Tela sem riscos ou trincas' },
    { key: 'carcaca_integra', label: 'Carcaça íntegra' },
    { key: 'botoes_funcionando', label: 'Botões funcionando' },
    { key: 'entradas_funcionando', label: 'Entradas funcionando' },
    { key: 'sem_oxidacao', label: 'Sem oxidação' },
    { key: 'produto_higienizado', label: 'Produto higienizado' },
    { key: 'estado_estetico', label: 'Estado estético conferido' }
  ],
  smartphone: [
    { key: 'tela_funcionando', label: 'Tela funcionando' },
    { key: 'touch_funcionando', label: 'Touch funcionando' },
    { key: 'face_touch_id', label: 'Face ID / Touch ID' },
    { key: 'camera_frontal', label: 'Câmera frontal' },
    { key: 'camera_traseira', label: 'Câmera traseira' },
    { key: 'flash', label: 'Flash' },
    { key: 'alto_falante', label: 'Alto-falante' },
    { key: 'microfone', label: 'Microfone' },
    { key: 'wifi', label: 'Wi-Fi' },
    { key: 'bluetooth', label: 'Bluetooth' },
    { key: 'rede_movel', label: 'Rede móvel' },
    { key: 'carregamento', label: 'Carregamento' },
    { key: 'imei_conferido', label: 'IMEI conferido' }
  ],
  console: [
    { key: 'liga_normalmente', label: 'Liga normalmente' },
    { key: 'hdmi_funcionando', label: 'HDMI funcionando' },
    { key: 'leitor_disco', label: 'Leitor de disco' },
    { key: 'controle_funcionando', label: 'Controle funcionando' },
    { key: 'wifi_console', label: 'Wi-Fi' },
    { key: 'bluetooth_console', label: 'Bluetooth' },
    { key: 'usb_funcionando', label: 'USB funcionando' },
    { key: 'inicializacao_normal', label: 'Inicialização normal' },
    { key: 'serie_conferido', label: 'Número de série conferido' }
  ],
  tv: [
    { key: 'liga_normalmente', label: 'Liga normalmente' },
    { key: 'entradas_hdmi_funcionando', label: 'Entradas HDMI e USB funcionando' },
    { key: 'tela_sem_manchas', label: 'Tela sem manchas ou pixels queimados' },
    { key: 'controle_remoto_conferido', label: 'Controle remoto funcionando' },
    { key: 'wifi_smart_tv', label: 'Wi-Fi e Smart TV configurados/conferidos' },
    { key: 'som_limpo', label: 'Alto-falantes / Áudio limpo' },
    { key: 'acessorios_cabos', label: 'Pés/Suporte e cabos inclusos' },
    { key: 'serie_conferido', label: 'Número de série conferido' }
  ],
  rice_cooker: [
    { key: 'liga_normalmente_aquecendo', label: 'Liga normalmente e aquece' },
    { key: 'botoes_alavanca', label: 'Botões de ligar e alavanca funcionando' },
    { key: 'cuba_sem_riscos', label: 'Cuba antiaderente sem riscos ou amassados' },
    { key: 'tampa_vedacao', label: 'Tampa e vedação de borracha íntegras' },
    { key: 'acessorios_panela', label: 'Copo medidor e colher inclusos' },
    { key: 'cabo_energia', label: 'Cabo de energia incluso e funcional' },
    { key: 'limpo_higienizado', label: 'Produto limpo e higienizado' }
  ],
  accessories: [
    { key: 'fonte', label: 'Fonte' },
    { key: 'cabo_usb', label: 'Cabo USB' },
    { key: 'cabo_hdmi', label: 'Cabo HDMI' },
    { key: 'controle', label: 'Controle' },
    { key: 'caixa', label: 'Caixa' },
    { key: 'manual', label: 'Manual' },
    { key: 'outro', label: 'Outro' }
  ]
};

const PHOTO_CATEGORIES = [
  { id: 'frente', label: 'Frente' },
  { id: 'traseira', label: 'Traseira' },
  { id: 'lateral_direita', label: 'Lateral Direita' },
  { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { id: 'tela_ligada', label: 'Tela Ligada' },
  { id: 'imei_serial', label: 'IMEI/Número de Série' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'foto_extra1', label: 'Foto Extra 1' },
  { id: 'foto_extra2', label: 'Foto Extra 2' },
  { id: 'foto_extra3', label: 'Foto Extra 3' }
];

const requiredPhysicalKeys = [
  'tela_sem_riscos',
  'carcaca_integra',
  'botoes_funcionando',
  'entradas_funcionando',
  'sem_oxidacao',
  'produto_higienizado',
  'estado_estetico'
];

const requiredSmartphoneKeys = [
  'tela_funcionando',
  'touch_funcionando',
  'face_touch_id',
  'camera_frontal',
  'camera_traseira',
  'flash',
  'alto_falante',
  'microfone',
  'wifi',
  'bluetooth',
  'rede_movel',
  'carregamento',
  'imei_conferido'
];

const requiredConsoleKeys = [
  'liga_normalmente',
  'hdmi_funcionando',
  'leitor_disco',
  'controle_funcionando',
  'wifi_console',
  'bluetooth_console',
  'usb_funcionando',
  'inicializacao_normal',
  'serie_conferido'
];

const requiredTvKeys = [
  'liga_normalmente',
  'entradas_hdmi_funcionando',
  'tela_sem_manchas',
  'controle_remoto_conferido',
  'wifi_smart_tv',
  'som_limpo',
  'acessorios_cabos',
  'serie_conferido'
];

const requiredRiceCookerKeys = [
  'liga_normalmente_aquecendo',
  'botoes_alavanca',
  'cuba_sem_riscos',
  'tampa_vedacao',
  'acessorios_panela',
  'cabo_energia',
  'limpo_higienizado'
];

export default function GuaranteeNote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // 1. ALL HOOKS MUST BE AT THE TOP
  const [isDownloading, setIsDownloading] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<{
    signature_data?: string;
    signed_at?: string;
    signed_ip?: string;
    client_name?: string;
    witness1_name?: string;
    witness1_cpf?: string;
    witness1_signature?: string;
    witness2_name?: string;
    witness2_cpf?: string;
    witness2_signature?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({});
  const [deliveryObservations, setDeliveryObservations] = useState('');
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [checklistVerifiedAt, setChecklistVerifiedAt] = useState<string | null>(null);
  const [checklistVerifiedBy, setChecklistVerifiedBy] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [hasLoadedChecklist, setHasLoadedChecklist] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const { data: iphones = [], isLoading: isLoadingIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [], isLoading: isLoadingConsoles } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const { data: prices = [], isLoading: isLoadingPrices } = useQuery({
    queryKey: ['prices'],
    queryFn: () => db.prices.list(),
  });

  const isLoading = isLoadingSales || isLoadingIphones || isLoadingConsoles || isLoadingClients || isLoadingPrices;

  // Derive data only after hooks
  const sale = useMemo(() => sales.find(s => s.id === id), [sales, id]);
  const client = useMemo(() => sale ? getSaleClient(sale, clients) : null, [sale, clients]);
  const saleItems = sale?.items || [];
  
  const iphone = useMemo(() => {
    const itemFromItems = saleItems.find(item => item.type === 'iphone');
    if (itemFromItems) return iphones.find(i => i.id === itemFromItems.id);
    return sale ? iphones.find(i => i.id === sale.iphone_id) : null;
  }, [sale, saleItems, iphones]);

  const consoleItem = useMemo(() => {
    const itemFromItems = saleItems.find(item => item.type === 'console');
    if (itemFromItems) return consoles.find(c => c.id === itemFromItems.id);
    return sale ? consoles.find(c => c.id === sale.console_id) : null;
  }, [sale, saleItems, consoles]);

  const warrantyMonths = useMemo(() => {
    if (sale?.warranty_months) return Number(sale.warranty_months);
    return getWarrantyMonths(iphone?.condition || consoleItem?.condition);
  }, [sale, iphone, consoleItem]);
  const saleDate = useMemo(() => sale ? parseLocalDate(sale.sale_date) : new Date(), [sale]);
  const endDate = useMemo(() => addMonths(saleDate, warrantyMonths), [saleDate, warrantyMonths]);

  useEffect(() => {
    import('jspdf');
    import('html2canvas-pro');
    setLogoImage(localStorage.getItem('app_logo') || '/logo.png');
  }, []);

  const checkSignature = async () => {
    if (!id || id.startsWith('pair_')) return;

    // 1. Check Supabase 'public_sales' table first (Crucial for Capacitor APK/EXE where local Express /api is not present)
    try {
      const { data: supaData, error: supaErr } = await supabase
        .from('public_sales')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!supaErr && supaData) {
        const sigInfo = supaData.sale_data?.signatureInfo || {};
        const sigData = supaData.signature_data || sigInfo.signature_data || supaData.sale_data?.signature_data;
        const signedAt = supaData.signed_at || sigInfo.signed_at || supaData.sale_data?.signed_at;
        const clientName = supaData.client_name || sigInfo.client_name || supaData.sale_data?.client_name || client?.name;

        if (supaData.checklist) setChecklist(supaData.checklist);
        if (supaData.delivery_observations) setDeliveryObservations(supaData.delivery_observations);
        if (supaData.photos) setPhotos(supaData.photos);
        if (supaData.checklist_verified_at) setChecklistVerifiedAt(supaData.checklist_verified_at);
        if (supaData.checklist_verified_by) setChecklistVerifiedBy(supaData.checklist_verified_by);

        if (sigData) {
          setSignatureInfo({
            signature_data: sigData,
            signed_at: signedAt,
            signed_ip: supaData.signed_ip || sigInfo.signed_ip,
            client_name: clientName,
            witness1_name: supaData.witness1_name || sigInfo.witness1_name,
            witness1_cpf: supaData.witness1_cpf || sigInfo.witness1_cpf,
            witness1_signature: supaData.witness1_signature || sigInfo.witness1_signature,
            witness2_name: supaData.witness2_name || sigInfo.witness2_name,
            witness2_cpf: supaData.witness2_cpf || sigInfo.witness2_cpf,
            witness2_signature: supaData.witness2_signature || sigInfo.witness2_signature
          });
          return;
        }
      }
    } catch (supaFetchErr) {
      console.warn('Supabase checkSignature error:', supaFetchErr);
    }

    // 2. Check local sale object prop
    if (sale && (sale.signature_data || sale.signed_at)) {
      setSignatureInfo({
        signature_data: sale.signature_data,
        signed_at: sale.signed_at,
        signed_ip: sale.signed_ip,
        client_name: sale.client_name || client?.name,
        witness1_name: sale.witness1_name,
        witness1_cpf: sale.witness1_cpf,
        witness1_signature: sale.witness1_signature,
        witness2_name: sale.witness2_name,
        witness2_cpf: sale.witness2_cpf,
        witness2_signature: sale.witness2_signature
      });
      return;
    }

    // 3. Try Express server API as fallback (for web dev environment)
    try {
      const res = await fetch(`/api/public-sales/${id}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json) {
          if (json.checklist) setChecklist(json.checklist);
          if (json.delivery_observations) setDeliveryObservations(json.delivery_observations);
          if (json.photos) setPhotos(json.photos);
          if (json.checklist_verified_at) setChecklistVerifiedAt(json.checklist_verified_at);
          if (json.checklist_verified_by) setChecklistVerifiedBy(json.checklist_verified_by);
          
          const sigData = json.signature_data || 
            json.signatureInfo?.signature_data || 
            json.sale?.signature_data || 
            json.sale_data?.signature_data || 
            json.sale_data?.signatureInfo?.signature_data;

          if (sigData) {
            setSignatureInfo({
              signature_data: sigData,
              signed_at: json.signed_at || json.signatureInfo?.signed_at || json.sale?.signed_at,
              signed_ip: json.signed_ip || json.signatureInfo?.signed_ip || json.sale?.signed_ip,
              client_name: json.client_name || json.signatureInfo?.client_name || client?.name,
              witness1_name: json.witness1_name || json.signatureInfo?.witness1_name,
              witness1_cpf: json.witness1_cpf || json.signatureInfo?.witness1_cpf,
              witness1_signature: json.witness1_signature || json.signatureInfo?.witness1_signature,
              witness2_name: json.witness2_name || json.signatureInfo?.witness2_name,
              witness2_cpf: json.witness2_cpf || json.signatureInfo?.witness2_cpf,
              witness2_signature: json.witness2_signature || json.signatureInfo?.witness2_signature
            });
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    checkSignature();
    const pollInterval = setInterval(checkSignature, 15000);
    return () => clearInterval(pollInterval);
  }, [id, sale]);

  useEffect(() => {
    const registerPublicContract = async () => {
      if (!sale || !client) return;
      const payload = {
        id, 
        sale, 
        client, 
        product: iphone || consoleItem,
        products: saleItems.length > 0 ? saleItems : (iphone || consoleItem ? [iphone || consoleItem] : []),
        warrantyMonths, 
        warrantyStartDate: saleDate.toISOString(), 
        warrantyEndDate: endDate.toISOString(),
        checklist, 
        delivery_observations: deliveryObservations, 
        photos,
        checklist_verified_at: checklistVerifiedAt, 
        checklist_verified_by: checklistVerifiedBy
      };
      try {
        await supabase.from('public_sales').upsert({
          id, 
          sale_data: { ...payload, signatureInfo },
          client_name: signatureInfo?.client_name, 
          signature_data: signatureInfo?.signature_data,
          signed_at: signatureInfo?.signed_at, 
          signed_ip: signatureInfo?.signed_ip
        });
      } catch (e) {}
      try {
        await fetch('/api/public-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}
    };
    registerPublicContract();
  }, [sale, client, iphone, consoleItem, saleItems, warrantyMonths, id, saleDate, endDate, signatureInfo]);

  // Image compressor helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const saveChecklistAndPhotos = async (
    currentChecklist = checklist,
    currentObs = deliveryObservations,
    currentPhotos = photos
  ) => {
    if (!sale || !client) return;
    setSavingChecklist(true);

    let verifiedAt = checklistVerifiedAt;
    let verifiedBy = checklistVerifiedBy;

    const physicalComplete = requiredPhysicalKeys.every(k => !!currentChecklist[k]);
    const specificComplete = iphone 
      ? requiredSmartphoneKeys.every(k => !!currentChecklist[k]) 
      : (consoleItem?.category === 'tv' 
          ? requiredTvKeys.every(k => !!currentChecklist[k]) 
          : (consoleItem?.category === 'rice_cooker' 
              ? requiredRiceCookerKeys.every(k => !!currentChecklist[k]) 
              : (consoleItem ? requiredConsoleKeys.every(k => !!currentChecklist[k]) : true)));

    if (physicalComplete && specificComplete && !verifiedAt) {
      verifiedAt = new Date().toISOString();
      verifiedBy = 'Kaleb Santos';
      setChecklistVerifiedAt(verifiedAt);
      setChecklistVerifiedBy(verifiedBy);
    }

    try {
      await supabase.from('public_sales').upsert({
        id,
        sale_data: {
          id, sale, client, checklist: currentChecklist, delivery_observations: currentObs, photos: currentPhotos,
          checklist_verified_at: verifiedAt, checklist_verified_by: verifiedBy, signatureInfo
        },
        client_name: signatureInfo?.client_name,
        signature_data: signatureInfo?.signature_data
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingChecklist(false);
    }
  };

  const handlePhotoUpload = async (category: string, file: File) => {
    const toastId = toast.loading('Processando imagem...');
    try {
      const base64 = await compressImage(file);
      const updatedPhotos = { ...photos, [category]: base64 };
      setPhotos(updatedPhotos);
      await saveChecklistAndPhotos(checklist, deliveryObservations, updatedPhotos);
      toast.success('Foto anexada!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao processar imagem.', { id: toastId });
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) return toast.error('Pop-up bloqueado!');
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');
    printWindow.document.write(`<html><head><title>Termo de Garantia</title>${styles}</head><body class="p-6">${printContent.innerHTML}<script>window.onload=()=>setTimeout(()=>{window.print();window.close()},1000);</script></body></html>`);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const toastId = toast.loading('Gerando PDF do Termo de Garantia...');
    try {
      // 1. Pre-load all images including logos
      const images = Array.from(printContent.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      // 2. Wait for signature rasterization to complete
      const waitForSignatures = async () => {
        let attempts = 0;
        while (attempts < 60) {
          const signatureElements = Array.from(printContent.querySelectorAll('[data-signature-loaded]'));
          const wrappers = Array.from(printContent.querySelectorAll('.signature-wrapper'));
          
          if (wrappers.length > 0) {
            const allLoaded = signatureElements.length === wrappers.length && 
                             signatureElements.every(el => el.getAttribute('data-signature-loaded') === 'true');
            if (allLoaded) break;
          } else if (attempts > 5) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
      };
      await waitForSignatures();

      // 3. Prepare for capture: temporary scroll and layout freeze
      const originalStyle = printContent.style.cssText;
      const originalScrollY = window.scrollY;
      
      // Force the content to be fully visible and wide enough for A4 proportions
      // Using a fixed width and letting height be auto ensures consistent aspect ratio
      printContent.style.width = '794px'; // A4 width at 96 DPI
      printContent.style.height = 'auto';
      printContent.style.maxHeight = 'none';
      printContent.style.overflow = 'visible';
      printContent.style.position = 'absolute';
      printContent.style.left = '0';
      printContent.style.top = '0';
      printContent.style.zIndex = '9999';
      printContent.style.backgroundColor = '#ffffff';

      window.scrollTo(0, 0);
      // Give more time for the layout to settle and images to be painted
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(printContent, {
        scale: 3, // Higher quality for better text and signature legibility
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: printContent.scrollHeight + 40, // Add some padding at the bottom
        windowWidth: 794,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, element) => {
          const el = element as HTMLElement;
          el.style.width = '794px';
          el.style.height = 'auto';
          el.style.padding = '40px';
          
          // Ensure all elements are visible in clone and prevent cutoffs
          const allElements = el.querySelectorAll('*');
          allElements.forEach(item => {
            const node = item as HTMLElement;
            if (node.style.overflow === 'hidden' || node.style.overflowY === 'auto') {
              node.style.overflow = 'visible';
              node.style.maxHeight = 'none';
              node.style.height = 'auto';
            }
            // Fix for some CSS properties that can break canvas rendering
            if (node.style.backdropFilter) node.style.backdropFilter = 'none';
          });
        }
      });

      // Restore original state
      printContent.style.cssText = originalStyle;
      window.scrollTo(0, originalScrollY);

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate how many pages we need
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfImgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfImgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Add subsequent pages if content is longer than one A4
      while (heightLeft > 0) {
        position = heightLeft - pdfImgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfImgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      const cleanClientName = (client?.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
      const dateStr = format(saleDate, 'dd_MM_yyyy');
      const fileName = `Termo_Garantia_${cleanClientName}_${dateStr}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = pdf.output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];

        try {
          // Check for storage permission on Android
          await checkAndRequestStoragePermission();
          
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true
          });
          
          const uriResult = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
          });

          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: 'Termo de Garantia GODSHOP',
            text: `Termo de Garantia - ${client?.name} (${dateStr})`,
            url: uriResult.uri,
            dialogTitle: 'Compartilhar Termo em PDF'
          });
          toast.success('PDF pronto para compartilhar!', { id: toastId });
        } catch (e) {
          console.error('Mobile PDF error:', e);
          pdf.save(fileName);
          toast.success('PDF baixado (diretório padrão)!', { id: toastId });
        }
      } else {
        pdf.save(fileName);
        toast.success('PDF baixado com sucesso!', { id: toastId });
      }
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF: ' + (err?.message || 'Falha desconhecida'), { id: toastId });
    }
  };

  // 2. CONDITIONAL RENDER (AFTER ALL HOOKS)
  if (isLoading) return <LoadingScreen message="Preparando Termo de Garantia..." />;
  if (!sale) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <ArrowLeft className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-bold mb-2">Venda não encontrada</h2>
      <button onClick={() => navigate('/sales')} className="bg-primary text-white px-6 py-2 rounded-lg mt-4">Voltar</button>
    </div>
  );

  const signatureOrigin = getBaseUrl().replace('ais-dev-', 'ais-pre-');
  const signatureLink = `${signatureOrigin}/#/assinar/${id}`;
  const currentSignatureData = signatureInfo?.signature_data || sale?.signature_data || client?.assinatura_base64;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <button onClick={() => navigate('/sales')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex flex-wrap gap-2">
          {client?.phone && (
            <a href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${client.name}! Termo de Garantia gerado: ${sale.id}`)}`} target="_blank" rel="noreferrer" className="bg-emerald-500 text-white px-3 py-2 rounded-md flex items-center gap-1.5 text-xs font-bold shadow-lg">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md flex items-center gap-1.5 text-xs font-bold shadow-lg cursor-pointer">
            <Download className="h-4 w-4" /> Baixar PDF
          </button>
          <button onClick={handlePrint} className="bg-primary text-primary-foreground px-3 py-2 rounded-md flex items-center gap-1.5 text-xs font-bold shadow-lg cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm flex items-center gap-2"><PenTool className="h-4 w-4 text-blue-600" /> Status da Assinatura do Cliente</h3>
          {currentSignatureData ? (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Assinado
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              Pendente
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { copyToClipboard(signatureLink); toast.success('Link copiado!'); }} className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"><Copy className="h-4 w-4" /> Copiar Link</button>
          <button 
            onClick={async () => {
              const shared = await shareContent({
                title: 'Assinar Termo de Garantia GODSHOP',
                text: `Olá ${client?.name || 'Cliente'}, por favor assine o seu Termo de Garantia e Contrato GODSHOP aqui:`,
                url: signatureLink,
                dialogTitle: 'Compartilhar Link de Assinatura'
              });
              if (!shared) {
                copyToClipboard(signatureLink);
                toast.success('Link copiado para a área de transferência!');
              }
            }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="h-4 w-4" /> Compartilhar Link
          </button>
          <button onClick={async () => { await checkSignature(); toast.success('Status atualizado!'); }} className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" /> Atualizar Status</button>
        </div>
        {currentSignatureData ? (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-xs space-y-1">
            <p className="font-semibold text-emerald-900">✓ Contrato assinado com sucesso</p>
            <p><strong>Assinado por:</strong> {signatureInfo?.client_name || sale?.client_name || client?.name}</p>
            <p><strong>Data/Hora:</strong> {signatureInfo?.signed_at ? new Date(signatureInfo.signed_at).toLocaleString() : (sale?.signed_at ? new Date(sale.signed_at).toLocaleString() : 'N/A')}</p>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-xs space-y-1">
            <p className="font-semibold text-amber-900">⚠️ Aguardando assinatura do cliente</p>
            <p className="text-amber-700">Envie o link de assinatura acima para o cliente assinar digitalmente pelo celular ou computador.</p>
          </div>
        )}
      </div>

      <div className="bg-white border shadow-sm rounded-xl max-h-[82vh] overflow-y-auto">
        <div ref={printRef} className="p-6 sm:p-10 w-full space-y-6 text-slate-900 bg-white text-xs sm:text-sm">
          {/* Header */}
          <div className="border-b-2 border-[#D4AF37] pb-6 text-center relative">
            {logoImage && <img src={logoImage} alt="Logo" className="h-20 w-20 object-contain mx-auto mb-3" />}
            <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900">Termo de Garantia</h1>
            <p className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest mt-1">Contrato de Compra e Venda - GODSHOP</p>
            
            <div className="mt-4 flex justify-between items-end text-left px-2 border-t border-[#D4AF37]/20 pt-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block leading-none tracking-tighter">Cliente</span>
                <span className="text-sm font-black text-slate-900 leading-none">{client?.name || 'Cliente não identificado'}</span>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase block leading-none tracking-tighter">Data da Venda</span>
                <span className="text-sm font-black text-slate-900 leading-none">{format(saleDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            {sale.warranty_term_id && (
              <div className="absolute top-0 right-0 text-right print:top-0">
                <span className="text-[8px] font-black text-slate-400 uppercase block">Termo Nº</span>
                <span className="text-xs font-black text-slate-900 font-mono">{sale.warranty_term_id}</span>
              </div>
            )}
          </div>

          {/* Section 1: Customer Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-2">
              <User className="h-4 w-4 text-[#D4AF37]" /> Dados do Titular
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
              <p><span className="font-bold text-slate-900 uppercase text-[10px] block text-slate-400">Nome completo</span> {client?.name}</p>
              <p><span className="font-bold text-slate-900 uppercase text-[10px] block text-slate-400">Telefone/WhatsApp</span> {client?.phone || 'Não informado'}</p>
              {client?.cpf && <p><span className="font-bold text-slate-900 uppercase text-[10px] block text-slate-400">CPF</span> {client.cpf}</p>}
              {client?.email && <p><span className="font-bold text-slate-900 uppercase text-[10px] block text-slate-400">E-mail</span> {client.email}</p>}
              {(client?.address || client?.city) && (
                <p className="md:col-span-2">
                  <span className="font-bold text-slate-900 uppercase text-[10px] block text-slate-400">Endereço de Registro</span> {client.address || ''} {client.city ? `- ${client.city}/${client.state || ''}` : ''}
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Product Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#D4AF37]" /> Identificação do Equipamento
            </h3>
            <div className="space-y-3">
              {saleItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {saleItems.map((it: any, idx: number) => (
                    <div key={idx} className="p-3 border-l-4 border-[#D4AF37] bg-slate-50/80 rounded-r-xl">
                      <p className="font-black text-slate-900 uppercase text-xs">{it.name || it.model}</p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] text-slate-600 font-medium">
                        {it.storage && <p>Capacidade: {it.storage}</p>}
                        {it.color && <p>Cor: {it.color}</p>}
                        {it.imei && <p className="col-span-2 font-mono text-[10px] tracking-tight">IMEI/SN: {it.imei}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 border-l-4 border-[#D4AF37] bg-slate-50/80 rounded-r-xl">
                  <p className="font-black text-slate-900 uppercase text-sm">{iphone ? `iPhone ${iphone.model}` : (consoleItem ? `${consoleItem.model}` : 'Equipamento')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-[11px] text-slate-600 font-bold uppercase tracking-tight">
                    {iphone?.storage && <div><span className="block text-[9px] text-slate-400">Armazenamento</span>{iphone.storage}</div>}
                    {iphone?.color && <div><span className="block text-[9px] text-slate-400">Cor</span>{iphone.color}</div>}
                    {iphone?.condition && <div><span className="block text-[9px] text-slate-400">Condição</span>{getConditionLabel(iphone.condition)}</div>}
                    {iphone?.imei && <div className="col-span-2"><span className="block text-[9px] text-slate-400">Número de Série / IMEI</span><span className="font-mono text-xs">{iphone.imei}</span></div>}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Sale Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D4AF37]" /> Condições Comerciais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block mb-0.5">Data da Operação</span>
                <span className="font-semibold">{format(saleDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[9px] block mb-0.5">Valor Total</span>
                <span className="font-black text-slate-900">{formatBRL(sale.sell_price)}</span>
              </div>
              <div className="col-span-2">
                <span className="font-bold text-slate-400 uppercase text-[9px] block mb-0.5">Forma de Pagamento</span>
                <span className="font-semibold">{sale.payment_method || 'PIX'} {sale.installments && sale.installments > 1 && `(${sale.installments}x)`}</span>
              </div>
            </div>

            {sale.installments && sale.installments > 1 && (
              <div className="bg-slate-900 p-4 rounded-xl border border-[#D4AF37]/30 mt-3 space-y-1 text-white shadow-lg">
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.1em]">Plano de Pagamento Parcelado</p>
                <p className="text-lg font-black tracking-tight">
                  {sale.installments} parcelas de {formatBRL((sale.sell_price - (sale.down_payment || 0)) / sale.installments)}
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  * Periodicidade: {sale.installment_frequency || 'Mensal'}. O atraso superior a 10 dias poderá ensejar as medidas previstas na cláusula de Reserva de Domínio.
                </p>
              </div>
            )}
          </section>

          {/* Section 4: Checklist de Entrega e Conferência (Premium Layout) */}
          {(sale.delivery_checklist || checklistVerifiedAt) && (
            <section className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-inner">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 border-b border-slate-200 pb-2">
                <CheckSquare className="h-3.5 w-3.5 text-[#D4AF37]" /> Checklist de Conferência do Equipamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Condition and Marks */}
                <div className="md:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block">Estado de Conservação</span>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#D4AF37]"></span>
                      <span className="text-xs font-black uppercase text-slate-900">
                        {sale.delivery_checklist?.condition === 'lacrado' ? 'Novo / Lacrado' : (sale.delivery_checklist?.condition === 'seminovo' ? 'Seminovo / Usado' : (sale.delivery_checklist?.condition || 'Não informado'))}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block">Marcas de Uso / Observações</span>
                    <p className="text-[10px] font-medium text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60 italic">
                      {sale.delivery_checklist?.marks_of_use || 'Nenhuma avaria ou marca de uso significativa identificada no ato da entrega.'}
                    </p>
                  </div>
                </div>

                {/* Accessories Grid */}
                <div className="md:col-span-7 space-y-2">
                  <span className="font-bold text-slate-400 uppercase text-[9px] block mb-2">Acessórios e Itens Entregues</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sale.delivery_checklist?.accessories ? (
                      <>
                        {[
                          { key: 'box', label: 'Caixa Original' },
                          { key: 'charger', label: 'Carregador' },
                          { key: 'cable', label: 'Cabo USB' },
                          { key: 'manual', label: 'Manual/Docs' },
                          { key: 'hdmi_cable', label: 'Cabo HDMI' },
                          { key: 'power_cable', label: 'Cabo Força' }
                        ].map(acc => sale.delivery_checklist.accessories[acc.key] && (
                          <div key={acc.key} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-[9px] font-bold text-emerald-800 uppercase">{acc.label}</span>
                          </div>
                        ))}
                        {sale.delivery_checklist.accessories.controls > 0 && (
                          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-[9px] font-bold text-emerald-800 uppercase">{sale.delivery_checklist.accessories.controls} Controle(s)</span>
                          </div>
                        )}
                        {sale.delivery_checklist.accessories.others && (
                          <div className="col-span-2 flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
                            <Check className="h-3 w-3 text-blue-600" />
                            <span className="text-[9px] font-bold text-blue-800 uppercase truncate">Outro: {sale.delivery_checklist.accessories.others}</span>
                          </div>
                        )}
                        {!Object.values(sale.delivery_checklist.accessories).some(v => v === true || (typeof v === 'number' && v > 0) || (typeof v === 'string' && v.length > 0)) && (
                          <span className="text-[10px] text-slate-400 italic col-span-3">Somente o aparelho principal (sem acessórios).</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic col-span-3">Informação não registrada.</span>
                    )}
                  </div>
                  
                  {checklistVerifiedAt && (
                    <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Conferido em: {format(new Date(checklistVerifiedAt), 'dd/MM/yyyy HH:mm')}</span>
                      <span>Por: {checklistVerifiedBy || 'Sistema'}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Improved Warranty Redação */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1.5 flex items-center gap-2">
              Cláusulas e Condições de Garantia
            </h3>
            
            <div className="space-y-6 text-[10px] sm:text-[11px] leading-relaxed text-slate-700 text-justify">
              {/* Cláusula 1: Prazo e Cobertura */}
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">01</span> Prazo e Cobertura da Garantia
                </p>
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2 text-[10px]">
                  <p>A garantia oferecida pela <strong>GODSHOP</strong> compreende o período total de <strong>{warrantyMonths} meses</strong>, contados a partir da data de emissão deste termo ({format(saleDate, "dd/MM/yyyy")}). Este prazo já inclui os 90 dias de garantia legal previstos no Art. 26, II, do Código de Defesa do Consumidor (CDC).</p>
                  <p>A cobertura abrange exclusivamente defeitos de fabricação ou vícios ocultos de hardware que se manifestem sob condições normais de uso. Componentes sujeitos a desgaste natural, como baterias e acessórios, possuem cobertura limitada de 90 dias conforme legislação.</p>
                </div>
              </div>

              {/* Cláusula 2: Exclusões */}
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">02</span> Hipóteses de Exclusão da Cobertura
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50/30 border border-red-100 rounded-lg">
                    <p className="font-bold text-red-900 mb-1">Danos Físicos e Líquidos</p>
                    <ul className="space-y-1 text-[10px]">
                      <li>• Quedas, impactos, pressão física ou torção do chassi.</li>
                      <li>• Contato com líquidos, umidade excessiva ou oxidação.</li>
                      <li>• Telas quebradas, trincadas ou com manchas de pressão.</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-lg">
                    <p className="font-bold text-amber-900 mb-1">Uso Inadequado e Intervenções</p>
                    <ul className="space-y-1 text-[10px]">
                      <li>• Uso de acessórios (carregadores/cabos) incompatíveis.</li>
                      <li>• Reparos ou abertura por técnicos não autorizados.</li>
                      <li>• Violação dos selos internos de segurança da loja.</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[10px] bg-slate-100 p-2 rounded border-l-2 border-slate-400">
                  <strong className="text-slate-900">Nota:</strong> A presença de riscos estéticos ou marcas de uso leve, sem relação causal com o defeito reclamado, não enseja a perda automática da garantia.
                </p>
              </div>

              {/* Cláusula 3: Atendimento */}
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">03</span> Procedimento para Acionamento
                </p>
                <div className="p-4 border border-dashed border-slate-300 rounded-xl">
                  <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 list-decimal list-inside text-[10px]">
                    <li>Contatar a GODSHOP pelos canais oficiais registrados.</li>
                    <li>Apresentar o número deste termo ou comprovante de venda.</li>
                    <li>Relatar detalhadamente a falha técnica identificada.</li>
                    <li>Entregar o produto para avaliação técnica (prazo legal de até 30 dias).</li>
                  </ol>
                </div>
              </div>

              {/* Cláusula 4: Backup e Dados */}
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">04</span> Backup e Privacidade de Dados
                </p>
                <p>É responsabilidade exclusiva do cliente realizar o backup de seus dados antes da entrega do aparelho. A GODSHOP não se responsabiliza por perdas de informações decorrentes de reparos necessários. O acesso técnico será limitado ao necessário para a solução do vício.</p>
              </div>
            </div>
          </section>

          {/* Section 5: LGPD e Privacidade */}
          <div className="mt-6 p-4 bg-slate-50 border-t border-[#D4AF37] rounded-b-xl text-[9px] text-slate-400 leading-tight">
            <p className="font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Proteção de Dados (LGPD)
            </p>
            <p>Em conformidade com a Lei nº 13.709/2018, os dados pessoais aqui registrados (Nome, CPF, Endereço, Contatos e Identificadores do Produto) são utilizados estritamente para a finalidade de gestão comercial, controle de garantia e cumprimento de obrigações fiscais e legais, sendo vedado o compartilhamento com terceiros sem base legal ou consentimento expresso.</p>
          </div>

          {/* Termo de Aceite */}
          <section className="space-y-4 pt-4">
            <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200 text-[11px] text-slate-700 leading-relaxed text-center italic">
              “Declaro que recebi o(s) produto(s) identificado(s) neste documento e que tive a oportunidade de conferir suas condições externas, seu funcionamento, quando possível, e os acessórios entregues, conforme os registros preenchidos neste termo. Declaro também que recebi as informações sobre as condições de garantia aplicáveis, sem que este aceite implique renúncia aos direitos assegurados pela legislação.”
            </div>
          </section>

          {/* Signatures organized side by side */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center" style={{ minHeight: '180px' }}>
            {/* Buyer Side */}
            <div className="flex flex-col items-center justify-end">
              <div className="min-h-[90px] flex items-center justify-center mb-2 w-full overflow-visible">
                {currentSignatureData ? (
                  <SignatureDisplay 
                    signatureData={currentSignatureData} 
                    signerName={signatureInfo?.client_name || client?.name} 
                    className="w-full max-w-[240px] h-auto object-contain" 
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 italic font-medium uppercase tracking-widest border border-slate-100 px-4 py-2 rounded-lg">Pendente de Assinatura</span>
                )}
              </div>
              <div className="border-t-2 border-slate-900 w-full pt-2">
                <p className="font-black text-[11px] text-slate-900 uppercase tracking-tighter text-slate-400">Assinatura do Comprador</p>
                <p className="text-[10px] text-slate-900 font-black uppercase mt-0.5">{client?.name}</p>
                {client?.cpf && <p className="text-[8px] text-slate-400 font-mono">CPF: {client.cpf}</p>}
              </div>
            </div>

            {/* Merchant Side */}
            <div className="flex flex-col items-center justify-end">
              <div className="min-h-[90px] flex items-center justify-center mb-2 w-full">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 border-2 border-[#D4AF37]/20 rounded-full flex items-center justify-center mb-1">
                     <ShieldCheck className="h-8 w-8 text-[#D4AF37]" />
                  </div>
                  <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest">GODSHOP Verificado</span>
                </div>
              </div>
              <div className="border-t-2 border-slate-900 w-full pt-2">
                <p className="font-black text-[11px] text-slate-900 uppercase tracking-tighter text-slate-400">Representante GODSHOP</p>
                <p className="text-[10px] text-slate-900 font-black uppercase mt-0.5">Kaleb Santos</p>
                <p className="text-[8px] text-slate-400 uppercase tracking-tighter text-slate-300">Selo de Autenticidade Digital</p>
              </div>
            </div>
          </div>

          {/* Page numbering placeholder for PDF engine */}
          <div className="pt-8 text-center text-[8px] text-slate-300 uppercase tracking-[0.3em] font-black">
            Documento Autenticado Digitalmente • {format(new Date(), "yyyy")} • Página 1 de 1
          </div>
        </div>
      </div>
    </div>
  );
}
