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
import { Printer, ArrowLeft, Download, MessageCircle, FileDown, Smartphone, Share2, Copy, Check, ExternalLink, ShieldCheck, PenTool, Camera, Trash2, Plus, Image as ImageIcon, Lock, AlertTriangle, Eye, RefreshCw, Sparkles, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import SignatureDisplay from '../components/SignatureDisplay';
import LoadingScreen from '../components/LoadingScreen';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { checkAndRequestStoragePermission } from '../utils/permissionUtils';

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
    localStorage.setItem('db_fallback_sales', JSON.stringify(sales));
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

  const warrantyMonths = useMemo(() => getWarrantyMonths(iphone?.condition || consoleItem?.condition), [iphone, consoleItem]);
  const saleDate = useMemo(() => sale ? parseLocalDate(sale.sale_date) : new Date(), [sale]);
  const endDate = useMemo(() => addMonths(saleDate, warrantyMonths), [saleDate, warrantyMonths]);

  useEffect(() => {
    import('jspdf');
    import('html2canvas-pro');
    setLogoImage(localStorage.getItem('app_logo') || '/logo.png');
  }, []);

  const checkSignature = async () => {
    if (!id) return;

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
    printWindow.document.write(`<html><head><title>Termo de Garantia</title>${styles}</head><body class="p-6">${printContent.innerHTML}<script>window.onload=()=>setTimeout(()=>{window.print();window.close()},400);</script></body></html>`);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const toastId = toast.loading('Gerando PDF do Termo de Garantia...');
    try {
      // Ensure all images (logos and signatures) are fully loaded before capturing canvas
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

      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: printContent.scrollWidth,
        windowHeight: printContent.scrollHeight,
        height: printContent.scrollHeight,
        scrollY: 0,
        scrollX: 0
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `termo_garantia_${sale.id.slice(0, 8)}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = pdf.output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];

        let savedFileUri = null;
        try {
          const writeFileResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          savedFileUri = writeFileResult.uri;
        } catch (e1) {
          try {
            const writeFileResult = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true
            });
            savedFileUri = writeFileResult.uri;
          } catch (e2) {
            console.error('Filesystem write error:', e2);
          }
        }

        let fileUri = savedFileUri;
        if (!fileUri) {
          try {
            const uriResult = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Documents
            });
            fileUri = uriResult.uri;
          } catch (e3) {}
        }

        const { Share } = await import('@capacitor/share');
        if (Share) {
          try {
            await Share.share({
              title: 'Termo de Garantia GODSHOP',
              text: 'Aqui está o seu Termo de Garantia em PDF.',
              url: fileUri || pdfDataUri,
              dialogTitle: 'Salvar ou Compartilhar PDF'
            });
            toast.success('PDF gerado e pronto para compartilhar!', { id: toastId });
            return;
          } catch (shareErr) {
            console.warn('Share error:', shareErr);
          }
        }

        if (fileUri) {
          toast.success('PDF salvo com sucesso!', { id: toastId });
        } else {
          pdf.save(fileName);
          toast.success('PDF baixado!', { id: toastId });
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
  const currentSignatureData = signatureInfo?.signature_data || sale?.signature_data;

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
          <div className="border-b pb-6 text-center">
            {logoImage && <img src={logoImage} alt="Logo" className="h-16 w-16 object-contain mx-auto mb-3" />}
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Termo de Garantia e Contrato de Compra</h2>
            <p className="text-xs text-slate-500 mt-1">Este termo estabelece a cobertura e as cláusulas acordadas para o produto comercializado.</p>
          </div>

          {/* Section 1: Customer Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Nome completo:</span> {client?.name}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {client?.phone || 'Não informado'}</p>
              {client?.cpf && <p><span className="font-semibold text-slate-900">CPF:</span> {client.cpf}</p>}
              {client?.email && <p><span className="font-semibold text-slate-900">E-mail:</span> {client.email}</p>}
              {(client?.address || client?.city) && (
                <p className="md:col-span-2">
                  <span className="font-semibold text-slate-900">Endereço:</span> {client.address || ''} {client.city ? `- ${client.city}/${client.state || ''}` : ''}
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Product Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Detalhes do Aparelho / Equipamento
            </h3>
            <div className="space-y-3">
              {saleItems.length > 0 ? (
                saleItems.map((it: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-xl bg-slate-50/50">
                    <p className="font-bold text-slate-900">{it.name || it.model}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-slate-500">
                      {it.storage && <p><span>Armazenamento:</span> {it.storage}</p>}
                      {it.color && <p><span>Cor:</span> {it.color}</p>}
                      {it.imei && <p className="col-span-2 font-mono"><span>IMEI/Serial:</span> {it.imei}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-xl bg-slate-50/50">
                  <p className="font-bold text-slate-900">{iphone ? `iPhone ${iphone.model} - ${iphone.storage} (${iphone.color})` : (consoleItem ? `${consoleItem.model} - ${consoleItem.version}` : 'Produto')}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-slate-500">
                    {iphone?.storage && <p><span>Armazenamento:</span> {iphone.storage}</p>}
                    {iphone?.color && <p><span>Cor:</span> {iphone.color}</p>}
                    {iphone?.imei && <p className="col-span-2 font-mono"><span>IMEI/Serial:</span> {iphone.imei}</p>}
                    {iphone?.condition && <p className="capitalize"><span>Condição:</span> {getConditionLabel(iphone.condition)}</p>}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Sale Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Dados de Venda e Pagamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Data da Compra:</span> {format(saleDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><span className="font-semibold text-slate-900">Valor do Equipamento:</span> {formatBRL(sale.sell_price)}</p>
              {sale.down_payment && sale.down_payment > 0 ? (
                <>
                  <p><span className="font-semibold text-slate-900">Valor de Entrada:</span> {formatBRL(sale.down_payment)}</p>
                  <p><span className="font-semibold text-slate-900">Saldo Restante:</span> {formatBRL(sale.sell_price - sale.down_payment)}</p>
                </>
              ) : null}
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-900">Forma de Pagamento acordada:</span> {sale.payment_method || 'PIX'}
                {sale.installments && sale.installments > 1 && (
                  ` (${sale.installments}x ${sale.installment_frequency || 'Mensal'})`
                )}
              </p>
            </div>

            {sale.installments && sale.installments > 1 && (
              <div className="bg-slate-50 p-4 rounded-xl border mt-3 space-y-2 text-sm">
                <p className="font-bold text-slate-800">Plano de Parcelamento Ativo:</p>
                <p className="font-semibold text-blue-700">
                  {sale.installments} parcelas de {formatBRL((sale.sell_price - (sale.down_payment || 0)) / sale.installments)} ({sale.installment_frequency === 'Semanal' ? 'Semanais' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenais' : 'Mensais')})
                </p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  * A entrada de {formatBRL(sale.down_payment || 0)} foi devidamente abatida do saldo parcelado. Os pagamentos deverão ser realizados nos respectivos vencimentos para evitar mora.
                </p>
              </div>
            )}
          </section>

          {/* Section 4: Warranty terms */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Cláusulas de Garantia Legal e Comercial
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>1. <strong>Prazo e Cobertura:</strong> Este aparelho possui garantia de {warrantyMonths} meses, cobrindo exclusivamente defeitos de hardware decorrentes de fabricação. A garantia é válida de {format(saleDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} até {format(endDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.</p>
              <p>2. <strong>Exclusões da Garantia:</strong> Não cobrimos em hipótese alguma danos causados por quedas, batidas, tela quebrada ou riscada, trincados, contato com líquidos (água/umidade/oxidação), uso de carregadores paralelos, jailbreak ou software malicioso, nem violações de segurança. <strong className="text-red-700 bg-red-50 px-1 border border-red-100 rounded">ATENÇÃO: Caso o aparelho apresente qualquer sinal físico de dano ou marcas de queda, a cobertura de garantia é perdida imediatamente. O aparelho deve estar no mesmo perfeito estado de conservação em que foi retirado.</strong></p>
              <p>3. <strong>Violação de Selos:</strong> Selos internos e externos rompidos ou removidos anulam imediatamente a cobertura técnica de garantia.</p>
              <p>4. <strong>Backup de Dados:</strong> É de responsabilidade do comprador a preservação de seus dados e mídias. Não nos responsabilizamos por perdas de informações.</p>
            </div>
          </section>

          {/* Section 5: Domain Reserve Clause (if installments exist) */}
          {((sale.installments && sale.installments > 1) || sale.payment_method?.toLowerCase().includes('promissória') || sale.payment_method?.toLowerCase().includes('carnê')) && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                Reserva de Domínio e Inadimplência
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <p>O aparelho objeto deste contrato é vendido sob <strong>Reserva de Domínio</strong> (Art. 521 do Código Civil), permanecendo em propriedade resolúvel do vendedor até que todas as parcelas e encargos sejam quitados integralmente pelo comprador.</p>
                <p>O comprador assume a posse direta e o encargo de depositário, ficando proibido de doar, alienar, vender ou empenhar o aparelho antes da quitação total das obrigações contratuais.</p>
                <p>O atraso de qualquer parcela por mais de 10 (dez) dias autoriza o vendedor a declarar antecipadamente vencidas as obrigações e exigir o saldo total restante ou reaver o produto de forma imediata.</p>
              </div>
            </section>
          )}

          {/* Termo de Aceite */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Termo de Aceite
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 leading-relaxed text-justify">
              Declaro que conferi pessoalmente o produto, seus acessórios e seu funcionamento, incluindo os itens marcados como "Verificado" neste checklist. Confirmo que o equipamento foi entregue nas condições descritas e concordo que este checklist e as fotografias anexadas passam a integrar o Termo de Garantia e o Contrato de Compra e Venda para todos os efeitos legais.
            </div>
          </section>

          {/* Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-10 text-center border-t border-dashed">
            <div className="pt-3 flex flex-col items-center">
              <div className="h-16 flex items-center justify-center mb-1 w-full">
                {currentSignatureData ? (
                  <SignatureDisplay signatureData={currentSignatureData} signerName={signatureInfo?.client_name || client?.name} className="max-h-14 object-contain" />
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">(Pendente de Assinatura Digital)</span>
                )}
              </div>
              <p className="font-bold text-xs text-slate-900 uppercase">Comprador</p>
              <p className="text-[10px] text-slate-600">{client?.name}</p>
            </div>
            <div className="pt-3 flex flex-col items-center">
              <div className="h-16 flex items-center justify-center mb-1 w-full">
                <span className="text-xl italic font-serif text-blue-900">Kaleb Santos</span>
              </div>
              <p className="font-bold text-xs text-slate-900 uppercase">Vendedor</p>
              <p className="text-[10px] text-slate-600">Kaleb Santos (GODSHOP)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
