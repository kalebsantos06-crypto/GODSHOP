import React, { useRef, useState, useEffect } from 'react';
import { getBaseUrl, copyToClipboard } from '../utils/url';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { supabase } from '../lib/supabase';
import { formatBRL } from '../lib/formatCurrency';
import { format, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';
import { getConditionLabel, getWarrantyMonths } from '../lib/utils';
import { Printer, ArrowLeft, Download, MessageCircle, FileDown, Smartphone, Share2, Copy, Check, ExternalLink, ShieldCheck, PenTool, Camera, Trash2, Plus, Image as ImageIcon, Lock, AlertTriangle, Eye, RefreshCw, Sparkles, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import SignatureDisplay from '../components/SignatureDisplay';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);

  // Digital Signature State
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
  const appOrigin = getBaseUrl();

  // Checklist & Registration State
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({});
  const [deliveryObservations, setDeliveryObservations] = useState('');
  const [photos, setPhotos] = useState<{ [key: string]: string }>({});
  const [checklistVerifiedAt, setChecklistVerifiedAt] = useState<string | null>(null);
  const [checklistVerifiedBy, setChecklistVerifiedBy] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [hasLoadedChecklist, setHasLoadedChecklist] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    // Pre-load libraries for faster PDF generation and better user gesture preservation
    import('jspdf');
    import('html2canvas-pro');
    
    // Load store logo
    setLogoImage(localStorage.getItem('app_logo') || null);
  }, []);

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

  // Calculate matching items and warranty details
  const sale = sales.find(s => s.id === id);
  const iphone = sale ? iphones.find(i => i.id === sale.iphone_id) : null;
  const consoleItem = sale ? consoles.find(c => c.id === sale.console_id) : null;
  const client = sale ? clients.find(c => c.id === sale.client_id) : null;

  const itemCondition = iphone?.condition || consoleItem?.condition;
  const isLacrado = String(itemCondition || '').startsWith('lacrado');
  const warrantyMonths = getWarrantyMonths(itemCondition);
  
  const saleDate = sale ? parseLocalDate(sale.sale_date) : new Date();
  const endDate = sale ? addMonths(saleDate, warrantyMonths) : new Date();

  const getProductTypeLabel = () => {
    if (iphone) return 'aparelho celular tipo iPhone';
    if (!consoleItem) return 'produto';
    if (consoleItem.category === 'tv') return 'televisor / TV';
    if (consoleItem.category === 'rice_cooker') return 'eletrodoméstico (panela elétrica de arroz)';
    if (consoleItem.category === 'outro') return 'aparelho eletrônico / eletro';
    return 'console de videogame';
  };

  const getProductShortLabel = () => {
    if (iphone) return 'aparelho';
    if (!consoleItem) return 'produto';
    if (consoleItem.category === 'tv') return 'televisor';
    if (consoleItem.category === 'rice_cooker') return 'eletrodoméstico';
    if (consoleItem.category === 'outro') return 'aparelho';
    return 'console';
  };

  const currentSignatureData = signatureInfo?.signature_data || sale?.signature_data;
  const currentSignedAt = signatureInfo?.signed_at || sale?.signed_at;
  const currentSignedIp = signatureInfo?.signed_ip || sale?.signed_ip;
  const currentClientName = signatureInfo?.client_name || sale?.client_name || client?.name;

  // Fetch digital signature state on mount and update
  const checkSignature = async () => {
    if (!id) return;

    // 1. Try server API first (which unifies local public_sales.json, cloud_database.json and Supabase)
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
          if (json.checklist || json.delivery_observations) setHasLoadedChecklist(true);
          
          const sigData = json.signature_data || 
            json.signatureInfo?.signature_data || 
            json.sale?.signature_data || 
            json.sale_data?.signature_data || 
            json.sale_data?.signatureInfo?.signature_data;

          if (sigData) {
            const sigAt = json.signed_at || json.signatureInfo?.signed_at || json.sale?.signed_at || json.sale_data?.signed_at || json.sale_data?.signatureInfo?.signed_at;
            const sigIp = json.signed_ip || json.signatureInfo?.signed_ip || json.sale?.signed_ip || json.sale_data?.signed_ip || json.sale_data?.signatureInfo?.signed_ip;
            const clientName = json.client_name || json.signatureInfo?.client_name || json.client?.name || client?.name;

            setSignatureInfo({
              signature_data: sigData,
              signed_at: sigAt,
              signed_ip: sigIp,
              client_name: clientName,
              witness1_name: json.witness1_name || json.signatureInfo?.witness1_name || json.sale?.witness1_name,
              witness1_cpf: json.witness1_cpf || json.signatureInfo?.witness1_cpf || json.sale?.witness1_cpf,
              witness1_signature: json.witness1_signature || json.signatureInfo?.witness1_signature || json.sale?.witness1_signature,
              witness2_name: json.witness2_name || json.signatureInfo?.witness2_name || json.sale?.witness2_name,
              witness2_cpf: json.witness2_cpf || json.signatureInfo?.witness2_cpf || json.sale?.witness2_cpf,
              witness2_signature: json.witness2_signature || json.signatureInfo?.witness2_signature || json.sale?.witness2_signature
            });
            return; // Found signature successfully
          }
        }
      }
    } catch (e) {
      console.warn('Could not check digital signature on server API:', e);
    }

    // 2. Fallback to loaded sale object
    if (sale && sale.signature_data) {
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

    // 3. Fallback to Supabase sales table directly
    try {
      const { data: salesData } = await supabase.from('sales').select('*').eq('id', id).maybeSingle();
      if (salesData && salesData.signature_data) {
        setSignatureInfo({
          signature_data: salesData.signature_data,
          signed_at: salesData.signed_at,
          signed_ip: salesData.signed_ip,
          client_name: salesData.client_name || client?.name,
          witness1_name: salesData.witness1_name,
          witness1_cpf: salesData.witness1_cpf,
          witness1_signature: salesData.witness1_signature,
          witness2_name: salesData.witness2_name,
          witness2_cpf: salesData.witness2_cpf,
          witness2_signature: salesData.witness2_signature
        });
        return;
      }
    } catch (e) {}

    // 2. Fallback to direct Supabase query on public_sales table
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('public_sales')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!dbErr && dbData) {
        const sigInfo = dbData.sale_data?.signatureInfo || {};
        const signature_data = dbData.signature_data || sigInfo.signature_data || dbData.sale_data?.signature_data;

        if (dbData.sale_data) {
          const loadedChecklist = dbData.sale_data.checklist || {};
          const loadedObs = dbData.sale_data.delivery_observations || '';
          const loadedPhotos = dbData.sale_data.photos || {};
          const verifiedAt = dbData.sale_data.checklist_verified_at || null;
          const verifiedBy = dbData.sale_data.checklist_verified_by || null;

          if (!hasLoadedChecklist || signature_data) {
            setChecklist(loadedChecklist);
            setDeliveryObservations(loadedObs);
            setPhotos(loadedPhotos);
            setChecklistVerifiedAt(verifiedAt);
            setChecklistVerifiedBy(verifiedBy);
            setHasLoadedChecklist(true);
          }
        }

        if (signature_data) {
          setSignatureInfo({
            signature_data: signature_data,
            signed_at: dbData.signed_at || sigInfo.signed_at || dbData.sale_data?.signed_at,
            signed_ip: dbData.signed_ip || sigInfo.signed_ip || dbData.sale_data?.signed_ip,
            client_name: dbData.client_name || sigInfo.client_name || client?.name,
            witness1_name: dbData.witness1_name || sigInfo.witness1_name,
            witness1_cpf: dbData.witness1_cpf || sigInfo.witness1_cpf,
            witness1_signature: dbData.witness1_signature || sigInfo.witness1_signature,
            witness2_name: dbData.witness2_name || sigInfo.witness2_name,
            witness2_cpf: dbData.witness2_cpf || sigInfo.witness2_cpf,
            witness2_signature: dbData.witness2_signature || sigInfo.witness2_signature
          });
        }
      }
    } catch (supaErr) {
      console.warn('Supabase not available for checkSignature:', supaErr);
    }
  };

  useEffect(() => {
    checkSignature();
    // Set an interval to poll signature status every 4 seconds if not signed yet
    const pollInterval = setInterval(() => {
      checkSignature();
    }, 4000);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id, sale]);

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
          const max_size = 800; // Optimal resolution for clear printing & quick storage
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const isSmartphone = !!iphone;
  const isConsole = !!consoleItem;

  const isChecklistComplete = () => {
    return true;
  };

  // Save checklist state to database
  const saveChecklistAndPhotos = async (
    currentChecklist = checklist,
    currentObs = deliveryObservations,
    currentPhotos = photos
  ) => {
    if (!sale || !client) return;
    setSavingChecklist(true);

    let verifiedAt = checklistVerifiedAt;
    let verifiedBy = checklistVerifiedBy;

    const isTv = consoleItem?.category === 'tv';
    const isRiceCooker = consoleItem?.category === 'rice_cooker';

    const physicalComplete = requiredPhysicalKeys.every(k => !!currentChecklist[k]);
    const specificComplete = isSmartphone 
      ? requiredSmartphoneKeys.every(k => !!currentChecklist[k]) 
      : (isTv 
          ? requiredTvKeys.every(k => !!currentChecklist[k]) 
          : (isRiceCooker 
              ? requiredRiceCookerKeys.every(k => !!currentChecklist[k]) 
              : (isConsole ? requiredConsoleKeys.every(k => !!currentChecklist[k]) : true)));

    const complete = physicalComplete && specificComplete;

    if (complete && !verifiedAt) {
      verifiedAt = new Date().toISOString();
      verifiedBy = 'Kaleb Santos';
      setChecklistVerifiedAt(verifiedAt);
      setChecklistVerifiedBy(verifiedBy);
    } else if (!complete) {
      verifiedAt = null;
      verifiedBy = null;
      setChecklistVerifiedAt(null);
      setChecklistVerifiedBy(null);
    }

    const payload = {
      id,
      sale,
      client,
      product: iphone || consoleItem,
      warrantyMonths,
      warrantyStartDate: saleDate.toISOString(),
      warrantyEndDate: endDate.toISOString(),
      checklist: currentChecklist,
      delivery_observations: currentObs,
      photos: currentPhotos,
      checklist_verified_at: verifiedAt,
      checklist_verified_by: verifiedBy
    };

    try {
      const upsertData: any = {
        id,
        sale_data: {
          ...payload,
          signatureInfo
        },
        client_name: signatureInfo?.client_name,
        signature_data: signatureInfo?.signature_data,
        signed_at: signatureInfo?.signed_at,
        signed_ip: signatureInfo?.signed_ip,
        witness1_name: signatureInfo?.witness1_name,
        witness1_cpf: signatureInfo?.witness1_cpf,
        witness1_signature: signatureInfo?.witness1_signature,
        witness2_name: signatureInfo?.witness2_name,
        witness2_cpf: signatureInfo?.witness2_cpf,
        witness2_signature: signatureInfo?.witness2_signature
      };

      let dbErr = null;
      let retryCount = 0;

      while (retryCount < 5) {
        const { error } = await supabase.from('public_sales').upsert(upsertData);
        dbErr = error;
        if (!error) break;
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
          const colName = error.message?.match(/column ['"](.+?)['"]/)?.[1] || error.message?.match(/['"](.+?)['"] column/)?.[1];
          if (colName) {
            delete upsertData[colName];
            retryCount++;
            continue;
          }
        }
        break;
      }

      if (!dbErr) {
        // Redundantly write to local storage as fallback
        const localSales = getLocalSales();
        const index = localSales.findIndex((s: any) => s.id === id);
        const updatedSale = {
          ...(localSales[index] || sale),
          checklist: currentChecklist,
          delivery_observations: currentObs,
          photos: currentPhotos,
          checklist_verified_at: verifiedAt,
          checklist_verified_by: verifiedBy
        };
        if (index >= 0) {
          localSales[index] = updatedSale;
        } else {
          localSales.push(updatedSale);
        }
        setLocalSales(localSales);
        
        console.log('Checklist saved successfully');
      } else {
        throw dbErr;
      }
    } catch (err) {
      console.error('Failed to save checklist to Supabase:', err);
    } finally {
      setSavingChecklist(false);
    }
  };

  const handlePhotoUpload = async (category: string, file: File) => {
    const toastId = toast.loading('Processando e enviando imagem...');
    try {
      const compressedBase64 = await compressImage(file);
      const fileName = `${id}/${category}_${Date.now()}.jpg`;

      const resBlob = await fetch(compressedBase64);
      const blob = await resBlob.blob();

      let publicUrl = compressedBase64;

      try {
        const { data: uploadData, error: uploadErr } = await supabase
          .storage
          .from('product-photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase
            .storage
            .from('product-photos')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
            console.log('Uploaded successfully to Supabase Storage:', publicUrl);
          }
        } else {
          console.warn('Storage bucket upload failed, using high-quality compressed Base64 fallback:', uploadErr);
        }
      } catch (storageErr) {
        console.warn('Exception during Supabase storage upload, falling back to Base64:', storageErr);
      }

      const updatedPhotos = {
        ...photos,
        [category]: publicUrl
      };
      setPhotos(updatedPhotos);
      await saveChecklistAndPhotos(checklist, deliveryObservations, updatedPhotos);
      toast.success('Foto anexada com sucesso!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar imagem.', { id: toastId });
    }
  };

  const handlePhotoDelete = async (category: string) => {
    const updatedPhotos = { ...photos };
    delete updatedPhotos[category];
    setPhotos(updatedPhotos);
    await saveChecklistAndPhotos(checklist, deliveryObservations, updatedPhotos);
    toast.success('Foto removida!');
  };

  // Synchronize/register sale in public contract space automatically
  useEffect(() => {
    const registerPublicContract = async () => {
      if (!sale || !client) return;

      const payload = {
        id,
        sale,
        client,
        product: iphone || consoleItem,
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
        // 1. Try saving directly to Supabase public_sales table first
        let upsertData: any = {
          id,
          sale_data: {
            ...payload,
            signatureInfo // Include inside JSON just in case columns are missing
          },
          client_name: signatureInfo?.client_name,
          signature_data: signatureInfo?.signature_data,
          signed_at: signatureInfo?.signed_at,
          signed_ip: signatureInfo?.signed_ip,
          witness1_name: signatureInfo?.witness1_name,
          witness1_cpf: signatureInfo?.witness1_cpf,
          witness1_signature: signatureInfo?.witness1_signature,
          witness2_name: signatureInfo?.witness2_name,
          witness2_cpf: signatureInfo?.witness2_cpf,
          witness2_signature: signatureInfo?.witness2_signature
        };

        let dbErr = null;
        let retryCount = 0;

        while (retryCount < 5) {
          const { error } = await supabase.from('public_sales').upsert(upsertData);
          dbErr = error;
          
          if (!error) break;
          
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
            const columnMatch1 = error.message?.match(/column ['"](.+?)['"]/);
            const columnMatch2 = error.message?.match(/['"](.+?)['"] column/);
            const columnName = (columnMatch2 ? columnMatch2[1] : null) || (columnMatch1 ? columnMatch1[1] : null);
            
            if (columnName) {
              console.warn(`Removing missing column '${columnName}' from public_sales and retrying...`);
              delete upsertData[columnName];
              retryCount++;
              continue;
            }
          }
          break; // Stop if it's not a missing column error
        }

        if (!dbErr) {
          console.log('Contract registered in Supabase successfully');
        } else {
          console.warn('Supabase upsert failed, falling back to local Express server:', dbErr);
        }
      } catch (supaErr) {
        console.warn('Supabase upsert exception, falling back to local Express server:', supaErr);
      }

      // 2. Fallback to Express backend server
      try {
        await fetch('/api/public-sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Failed to register public contract on fallback server:', err);
      }
    };
    
    if (sale && client) {
      registerPublicContract();
    }
  }, [sale, client, iphone, consoleItem, warrantyMonths, id, saleDate, endDate]);

  const signatureOrigin = appOrigin.includes('ais-dev-') 
    ? appOrigin.replace('ais-dev-', 'ais-pre-') 
    : appOrigin;
  const signatureLink = `${signatureOrigin}/#/assinar/${id}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(signatureLink);
    if (success) {
      setCopied(true);
      toast.success('Link de assinatura copiado com sucesso!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.info(`Link de assinatura: ${signatureLink}`);
    }
  };

  if (isLoadingSales || isLoadingIphones || isLoadingConsoles || isLoadingClients || isLoadingPrices) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground animate-pulse font-medium">Preparando seu Termo de Garantia...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <ArrowLeft className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Venda não encontrada</h2>
        <p className="text-muted-foreground mb-6">Não conseguimos localizar os dados desta garantia.</p>
        <button onClick={() => navigate('/sales')} className="bg-primary text-white px-6 py-2 rounded-lg font-medium">
          Voltar para Vendas
        </button>
      </div>
    );
  }

  // Calculate table price and discount
  let originalPrice = sale.sell_price;
  let discount = 0;

  if (iphone) {
    const matchedPrice = prices.find(p => 
      p.category === 'iphone' && 
      p.model.toLowerCase().trim() === iphone.model.toLowerCase().trim() && 
      p.storage.toLowerCase().trim() === iphone.storage.toLowerCase().trim()
    );
    if (matchedPrice && matchedPrice.price > sale.sell_price) {
      originalPrice = matchedPrice.price;
      discount = originalPrice - sale.sell_price;
    }
  } else if (consoleItem) {
    const matchedPrice = prices.find(p => 
      p.category === 'console' && 
      p.model.toLowerCase().trim() === consoleItem.model.toLowerCase().trim()
    );
    if (matchedPrice && matchedPrice.price > sale.sell_price) {
      originalPrice = matchedPrice.price;
      discount = originalPrice - sale.sell_price;
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Abre uma nova janela para contornar bloqueios de impressão dentro de iframes
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      toast.error('Pop-up bloqueado! Permita pop-ups no seu navegador para imprimir a nota.');
      return;
    }

    // Copia os estilos (Tailwind) da janela atual para a nova janela
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Termo de Garantia e Comprovante - ${client?.name || 'Cliente'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          ${styles}
          <style>
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: #ffffff !important; }
              .no-print { display: none !important; }
            }
            body {
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body class="p-6 max-w-4xl mx-auto bg-white">
          <div class="print:p-0">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async (direct = false) => {
    if (isDownloading || !client || (!iphone && !consoleItem)) return;
    if (!isChecklistComplete() || !signatureInfo?.signature_data) {
      toast.error('Checklist incompleto ou assinatura pendente! Conclua o checklist e colete a assinatura para gerar o PDF.');
      return;
    }
    
    const toastId = toast.loading(direct ? 'Iniciando download...' : 'Gerando pré-visualização...');
    setIsDownloading(true);
    
    try {
      const pageIds = ['page-termo'];
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      
      const originalGetComputedStyle = window.getComputedStyle;
      const unparseableColorRegex = /(okl(ch|ab)|lch|lab|color\([^)]+\)|var\([^)]+\))/gi;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1;
      tempCanvas.height = 1;
      const tempCtx = tempCanvas.getContext('2d');

      const ensureSafeColor = (val: string, propName?: string): string => {
        if (!val || typeof val !== 'string') return val;
        const trimmed = val.trim();
        if (trimmed === 'transparent' || trimmed === 'inherit' || trimmed === 'initial' || trimmed === 'rgba(0, 0, 0, 0)') {
          return 'transparent';
        }

        // If simple hex or standard rgb/rgba
        if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed;
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(trimmed)) return trimmed;

        // Try converting using canvas fillStyle
        if (tempCtx) {
          try {
            tempCtx.fillStyle = '#00000000';
            tempCtx.fillStyle = trimmed;
            const computed = tempCtx.fillStyle;
            if (computed && computed !== '#00000000' && !computed.includes('okl') && !computed.includes('color(') && !computed.includes('var(')) {
              return computed;
            }
          } catch (e) {
            // ignore
          }
        }

        // Fallback for unparseable color formats:
        const prop = (propName || '').toLowerCase();
        if (prop.includes('background') || prop.includes('bg') || prop.includes('fill')) {
          return '#ffffff';
        }
        if (prop.includes('border') || prop.includes('stroke')) {
          return '#e2e8f0';
        }
        return '#1e293b';
      };

      const patchGetComputedStyle = (style: CSSStyleDeclaration) => {
        return new Proxy(style, {
          get(target, prop) {
            const value = Reflect.get(target, prop);
            const propStr = String(prop);
            if (typeof value === 'string' && (value.includes('okl') || value.includes('lch') || value.includes('lab') || value.includes('color(') || value.includes('var('))) {
              return ensureSafeColor(value, propStr);
            }
            if (typeof value === 'function') {
              if (prop === 'getPropertyValue') {
                return function(propertyName: string) {
                  const val = target.getPropertyValue(propertyName);
                  if (typeof val === 'string' && (val.includes('okl') || val.includes('lch') || val.includes('lab') || val.includes('color(') || val.includes('var('))) {
                    return ensureSafeColor(val, propertyName);
                  }
                  return val;
                };
              }
              return value.bind(target);
            }
            return value;
          }
        });
      };

      // Patch the main window
      window.getComputedStyle = function(el, pseudoElt) {
        const style = originalGetComputedStyle.call(window, el, pseudoElt);
        return patchGetComputedStyle(style);
      };

      let pdf: any = null;

      try {
        for (let i = 0; i < pageIds.length; i++) {
          const actualElement = document.getElementById(pageIds[i]);
          if (!actualElement) continue;

          // Capture with high scale (scale: 3 for crisp 300DPI rendering)
          const canvas = await html2canvas(actualElement, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: actualElement.scrollWidth,
            windowHeight: actualElement.scrollHeight,
            onclone: (clonedDocument) => {
              const win = clonedDocument.defaultView || window;
              if (win && win !== window) {
                const origClonedGCS = win.getComputedStyle;
                win.getComputedStyle = function(eEl, pseudo) {
                  const style = origClonedGCS.call(win, eEl, pseudo);
                  return patchGetComputedStyle(style);
                };
              }

              // Process style tags
              const styleTags = clonedDocument.querySelectorAll('style');
              styleTags.forEach(styleTag => {
                if (styleTag.textContent) {
                  try {
                    styleTag.textContent = styleTag.textContent.replace(unparseableColorRegex, (m) => ensureSafeColor(m));
                  } catch (e) {
                    console.warn('Error style tag update:', e);
                  }
                }
              });

              // Process style attributes and inline styles for all elements
              const allElements = clonedDocument.querySelectorAll('*');
              allElements.forEach(item => {
                if (item instanceof HTMLElement) {
                  const styleAttr = item.getAttribute('style');
                  if (styleAttr && (styleAttr.includes('okl') || styleAttr.includes('lch') || styleAttr.includes('lab') || styleAttr.includes('color(') || styleAttr.includes('var('))) {
                    item.setAttribute('style', styleAttr.replace(unparseableColorRegex, (m) => ensureSafeColor(m)));
                  }

                  try {
                    const comp = win.getComputedStyle(item);
                    
                    const bg = comp.backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                      item.style.backgroundColor = ensureSafeColor(bg, 'background');
                    } else if (!item.style.backgroundColor) {
                      item.style.backgroundColor = 'transparent';
                    }

                    const fg = comp.color;
                    if (fg) {
                      item.style.color = ensureSafeColor(fg, 'color');
                    }

                    const bColor = comp.borderColor;
                    if (bColor && bColor !== 'rgba(0, 0, 0, 0)' && bColor !== 'transparent') {
                      item.style.borderColor = ensureSafeColor(bColor, 'border');
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              });
            }
          });

          // Use PNG for lossless text clarity
          const imgData = canvas.toDataURL('image/png');

          // Standard A4 dimensions in mm (210 x 297)
          const pdfWidth = 210;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          if (!pdf) {
            pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: [pdfWidth, Math.max(pdfHeight, 297)]
            });
          } else {
            pdf.addPage([pdfWidth, Math.max(pdfHeight, 297)], 'portrait');
          }

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
      }

      if (!pdf) throw new Error('Falha ao renderizar páginas do PDF');
      
      const safeName = (client?.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Termo_Garantia_${safeName}.pdf`;

      // Generate binary PDF blob
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Copy current app stylesheets for vector HTML preview window if requested
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(style => style.outerHTML)
        .join('\n');
      
      const printContent = printRef.current;
      const previewWindow = !direct ? window.open('', '_blank') : null;
      
      if (previewWindow && !direct) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <title>Termo de Garantia - ${client?.name || 'Cliente'}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
              ${styles}
              <style>
                body, html { margin: 0; padding: 0; min-height: 100vh; background: #323639; font-family: 'Plus Jakarta Sans', sans-serif; }
                .top-bar { position: sticky; top: 0; background: #1e293b; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); z-index: 100; border-b: 1px solid #334155; }
                .title-txt { font-weight: 800; font-size: 15px; color: #f8fafc; display: flex; items-center; gap: 8px; }
                .btn-group { display: flex; gap: 10px; align-items: center; }
                .btn-action { background: #2563eb; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-weight: 700; text-decoration: none; font-size: 13px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(37,99,235,0.3); }
                .btn-action:hover { background: #1d4ed8; transform: translateY(-1px); }
                .btn-secondary { background: #475569; color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; text-decoration: none; }
                .btn-secondary:hover { background: #334155; }
                .doc-wrapper { padding: 32px 16px; display: flex; justify-content: center; }
                .doc-card { background: white; max-width: 820px; width: 100%; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #e2e8f0; color: black; }
                @media print {
                  .top-bar { display: none !important; }
                  .doc-wrapper { padding: 0 !important; }
                  .doc-card { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
                  @page { size: A4 portrait; margin: 12mm; }
                  body { background: white !important; }
                }
                @media (max-width: 640px) {
                  .top-bar { padding: 10px 14px; flex-direction: column; gap: 10px; align-items: stretch; }
                  .btn-group { justify-content: space-between; }
                  .doc-card { padding: 20px 14px; }
                }
              </style>
            </head>
            <body>
              <div class="top-bar">
                <span class="title-txt">📄 Termo de Garantia — ${client?.name || 'Cliente'}</span>
                <div class="btn-group">
                  <button onclick="window.print()" class="btn-action">
                    🖨️ Salvar em PDF / Imprimir
                  </button>
                  <a href="${blobUrl}" download="${fileName}" class="btn-action" style="background:#059669;">
                    💾 Download Direto (.pdf)
                  </a>
                  <button onclick="window.close()" class="btn-secondary">
                    Fechar
                  </button>
                </div>
              </div>
              <div class="doc-wrapper">
                <div class="doc-card">
                  ${printContent ? printContent.innerHTML : ''}
                </div>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
        toast.success('Pré-visualização da nota aberta com sucesso!', { id: toastId });
      } else {
        // Direct download using jsPDF save method or Blob URL anchor
        try {
          pdf.save(fileName);
        } catch (saveErr) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            try {
              if (document.body.contains(link)) document.body.removeChild(link);
            } catch (e) {}
          }, 3000);
        }
        toast.success('Download do PDF concluído!', { id: toastId });
      }

    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Erro ao gerar PDF da nota.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex flex-wrap gap-2">
          {client?.phone && (
            <a 
              href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${client.name}!

É um prazer atendê-lo(a) na GOD SHOP.

Informamos que o seu Termo de Garantia referente à sua compra foi gerado com sucesso.
Protocolo: ${sale.id}

Agradecemos imensamente pela sua preferência e confiança em nossa loja. Estamos à disposição para qualquer dúvida.

Atenciosamente,
Equipe GOD SHOP`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-emerald-600 shadow-lg transition-all active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          <div className="flex items-center shadow-lg rounded-md overflow-hidden">
            <button 
              onClick={() => handleDownloadPDF(true)}
              disabled={isDownloading || !isChecklistComplete() || !currentSignatureData}
              className="bg-blue-600 text-white px-6 py-2 flex items-center gap-2 font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-xs sm:text-sm"
              title={!isChecklistComplete() ? "Preencha o checklist para liberar o PDF" : (!currentSignatureData ? "Aguardando assinatura do cliente" : "Baixar PDF")}
            >
              <Download className="h-5 w-5" />
              {isDownloading ? 'Gerando...' : 'Baixar como PDF'}
            </button>
            <button 
              onClick={() => handleDownloadPDF(false)}
              disabled={isDownloading || !isChecklistComplete() || !currentSignatureData}
              className="bg-blue-600 text-white p-2.5 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border-l border-blue-500/30"
              title="Pré-visualizar PDF"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
          <button 
            onClick={handlePrint}
            disabled={!isChecklistComplete() || !currentSignatureData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-primary/90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            title={!isChecklistComplete() ? "Preencha o checklist para liberar a impressão" : (!currentSignatureData ? "Aguardando assinatura do cliente" : "Imprimir")}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* SEÇÃO DE ASSINATURA VIRTUAL */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <PenTool className="h-4 w-4 text-blue-600" />
              Assinatura Eletrônica do Cliente
            </h3>
            <p className="text-xs text-slate-500">Envie o termo para o seu cliente assinar de forma 100% virtual e segura.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const tid = toast.loading('Verificando assinatura no servidor...');
                await checkSignature();
                setTimeout(() => {
                  if (signatureInfo?.signature_data || sale?.signature_data) {
                    toast.success('Assinatura sincronizada com sucesso!', { id: tid });
                  } else {
                    toast.info('Nenhuma nova assinatura encontrada ainda. Se o cliente já assinou, aguarde alguns segundos ou verifique o link.', { id: tid });
                  }
                }, 400);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              title="Forçar verificação de assinatura"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar Status
            </button>
            {currentSignatureData ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 w-fit">
                <ShieldCheck className="h-4 w-4" />
                Assinado Digitalmente
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 w-fit animate-pulse">
                <PenTool className="h-4 w-4" />
                Pendente de Assinatura
              </span>
            )}
          </div>
        </div>

        {currentSignatureData ? (
          // SUCESSO: Já assinado! Mostra metadados e link do comprovante
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 bg-emerald-50/20 p-4 rounded-lg border border-emerald-100">
            <div className="space-y-1">
              <p><span className="font-semibold text-slate-900">Nome do Assinante:</span> {currentClientName}</p>
              <p><span className="font-semibold text-slate-900">Data da Assinatura:</span> {currentSignedAt ? new Date(currentSignedAt).toLocaleString('pt-BR') : 'N/A'}</p>
              <p><span className="font-semibold text-slate-900">IP de Conexão:</span> {currentSignedIp || 'N/A'}</p>
            </div>
            <div className="flex flex-col justify-center space-y-2 md:items-end">
              <a 
                href={signatureLink}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 text-xs w-fit"
              >
                Ver recibo público da assinatura
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-[10px] text-emerald-600 font-medium italic">✓ Esta assinatura já está incorporada no termo impresso e no PDF gerado.</span>
            </div>
          </div>
        ) : (
          // PENDENTE: Mostra ações para assinar ou compartilhar o link
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyLink}
                disabled={!isChecklistComplete()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-blue-300"
              >
                <Copy className="h-4 w-4" />
                Copiar Link de Assinatura (Usar Este!)
              </button>
              
              {client?.phone && (
                <a
                  href={isChecklistComplete() ? `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${client.name}! 📱

Para sua maior comodidade e segurança, geramos o seu Termo de Garantia do seu ${iphone ? iphone.model : consoleItem?.model} de forma digital.

Por favor, clique no link abaixo para ler os termos, revisar o checklist de entrega e assinar de forma eletrônica direto do seu celular (desenhando com o dedo):
👉 ${signatureLink}

Caso tenha alguma dúvida, estamos à disposição! 👍`)}` : '#'}
                  onClick={(e) => {
                    if (!isChecklistComplete()) {
                      e.preventDefault();
                      toast.error('Preencha todo o checklist de entrega antes de enviar o link para o cliente.');
                    }
                  }}
                  target={isChecklistComplete() ? "_blank" : undefined}
                  rel="noreferrer"
                  className={`bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md active:scale-95 ${!isChecklistComplete() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar por WhatsApp
                </a>
              )}

              <Link
                to={isChecklistComplete() ? `/?assinatura=${id}` : '#'}
                onClick={(e) => {
                  if (!isChecklistComplete()) {
                    e.preventDefault();
                    toast.error('Preencha todo o checklist de entrega antes de assinar no aparelho.');
                  }
                }}
                target={isChecklistComplete() ? "_blank" : undefined}
                className={`bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all border border-slate-300 active:scale-95 ${!isChecklistComplete() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ExternalLink className="h-4 w-4" />
                Assinar no Aparelho da Loja
              </Link>
            </div>

            <div className="bg-slate-50 border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-700">Link público gerado para o cliente:</span>
                <span className="font-mono select-all truncate max-w-md bg-white border px-2 py-1 rounded text-blue-600 font-semibold">{isChecklistComplete() ? signatureLink : 'Preencha o checklist primeiro para habilitar'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium shrink-0">O cliente assina desenhando a tela.</span>
            </div>

            {!isChecklistComplete() && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-900 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Conclua o Checklist para Liberar a Assinatura
                </p>
                <p className="leading-relaxed">
                  Existem itens do checklist que ainda não foram verificados. Conclua a conferência antes de solicitar a assinatura do cliente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>



      {/* PRINTER CONTAINER WRAPPER */}
      <div className="bg-[#ffffff] border shadow-sm rounded-xl print:shadow-none print:border-none overflow-x-auto custom-scrollbar">
        <div 
          id="guarantee-note-content"
          ref={printRef}
          className="text-[#000000] p-10 print:p-0 bg-[#ffffff] min-w-[700px] break-words space-y-12"
        >
          {/* PÁGINA 1: TERMO DE GARANTIA COORDENADO */}
          <div id="page-termo" className="bg-[#ffffff] min-h-[1120px] flex flex-col justify-between">
            <div>
              {/* Header Page 1 */}
              <div className="flex flex-col items-center border-b-2 border-[#000000] pb-6 mb-6">
                {logoImage ? (
                  <img 
                    src={logoImage} 
                    alt="Logo GOD SHOP" 
                    className="h-32 w-32 object-contain mb-4"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                    <Smartphone className="h-16 w-16 text-slate-400" />
                  </div>
                )}
                <h1 className="text-4xl font-black uppercase tracking-[0.2em]">GOD SHOP</h1>
                <h2 className="text-xl font-bold uppercase tracking-wider mt-2">Termo de Garantia</h2>
                <p className="text-[#4b5563] mt-1">Comprovante de Compra e Garantia</p>
              </div>

              <div className="space-y-8">
                <section>
                  <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">Dados do Cliente</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-semibold">Nome:</span> {client?.name}</p>
                    <p><span className="font-semibold">Telefone:</span> {client?.phone}</p>
                    {client?.cpf && <p><span className="font-semibold">CPF:</span> {client.cpf}</p>}
                    {client?.email && <p><span className="font-semibold">Email:</span> {client.email}</p>}
                    {(client?.street || client?.number || client?.neighborhood) && (
                      <p className="col-span-2">
                        <span className="font-semibold">Endereço:</span> {client.street}{client.number ? `, ${client.number}` : ''}{client.neighborhood ? ` - ${client.neighborhood}` : ''}
                        {client.complement && ` (${client.complement})`}
                      </p>
                    )}
                    {(client?.city || client?.state) && (
                      <p className="col-span-2">
                        <span className="font-semibold">Localização:</span> {client.city}{client.city && client.state ? ' - ' : ''}{client.state}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">
                    Detalhes do {iphone ? 'Aparelho' : (consoleItem?.category === 'tv' ? 'Televisor / TV' : (consoleItem?.category === 'rice_cooker' ? 'Eletrodoméstico' : 'Console'))}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {iphone ? (
                      <>
                        <p><span className="font-semibold">Modelo:</span> {iphone.model}</p>
                        <p><span className="font-semibold">IMEI / Serial:</span> <span className="font-mono">{iphone.imei || 'N/A'}</span></p>
                        <p><span className="font-semibold">Armazenamento:</span> {iphone.storage}</p>
                        {iphone.ram && <p><span className="font-semibold">Memória RAM:</span> {iphone.ram}</p>}
                        <p><span className="font-semibold">Cor:</span> {iphone.color}</p>
                        <p><span className="font-semibold">Condição:</span> <span>{getConditionLabel(iphone.condition)}</span></p>
                        <p><span className="font-semibold">Status:</span> {String(iphone.condition || '').startsWith('lacrado') ? 'Novo / Lacrado' : 'Seminovo / Usado'}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-semibold">Modelo:</span> {consoleItem?.model}</p>
                        <p><span className="font-semibold">Versão:</span> {consoleItem?.version}</p>
                        {consoleItem?.ram && <p><span className="font-semibold">Memória RAM:</span> {consoleItem.ram}</p>}
                        <p><span className="font-semibold">Condição:</span> <span>{getConditionLabel(consoleItem?.condition)}</span></p>
                        <p><span className="font-semibold">Status:</span> {String(consoleItem?.condition || '').startsWith('lacrado') ? 'Novo / Lacrado' : 'Seminovo / Usado'}</p>
                      </>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">Detalhes da Venda</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-semibold">ID da Venda:</span> <span className="font-mono text-xs">{sale.id.split('-')[0].toUpperCase()}</span></p>
                    <p><span className="font-semibold">Data da Compra:</span> {format(parseLocalDate(sale.sale_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    
                    {discount > 0 ? (
                      <>
                        <p><span className="font-semibold">Preço de Tabela:</span> {formatBRL(originalPrice)}</p>
                        <p className="text-emerald-600 font-medium"><span className="font-semibold">Desconto Aplicado:</span> -{formatBRL(discount)}</p>
                      </>
                    ) : null}

                    <p><span className="font-semibold">Valor Final do Produto:</span> {formatBRL(sale.sell_price)}</p>
                    
                    {sale.down_payment && sale.down_payment > 0 ? (
                      <>
                        <p><span className="font-semibold">Valor de Entrada (Pago):</span> {formatBRL(sale.down_payment)}</p>
                        <p><span className="font-semibold">Valor Restante:</span> {formatBRL(sale.sell_price - sale.down_payment)}</p>
                      </>
                    ) : null}
                    
                    <p>
                      <span className="font-semibold">Forma de Pagamento:</span> {sale.payment_method}
                      {sale.installments && sale.installments > 1 && (
                        ` (${sale.installments}x ${sale.installment_frequency === 'Semanal' ? 'Semanal' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal')})`
                      )}
                    </p>
                    
                    {sale.installments && sale.installments > 1 ? (
                      <div className="col-span-2 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 mt-2 space-y-3">
                        <div>
                          <span className="font-bold text-emerald-800 block text-xs uppercase tracking-wider">Plano de Parcelamento:</span>
                          <span className="block mt-1 font-bold text-emerald-700 text-sm">
                            {sale.installments} parcelas de {formatBRL((sale.sell_price - (sale.down_payment || 0)) / sale.installments)} ({sale.installment_frequency === 'Semanal' ? 'Semanais' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenais' : 'Mensais')})
                          </span>
                          <span className="text-[11px] text-emerald-600 block mt-1 leading-normal font-medium">
                            * O valor de entrada de {formatBRL(sale.down_payment || 0)} {discount > 0 ? `e o desconto de ${formatBRL(discount)} já foram devidamente aplicados e deduzidos` : 'já foi devidamente aplicado e deduzido'} do saldo parcelado.
                          </span>
                        </div>

                        <div className="border-t border-emerald-100 pt-3">
                          <span className="font-bold text-emerald-800 text-[11px] block mb-2 uppercase tracking-wider">Cronograma de Vencimentos:</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(() => {
                              const baseDate = sale.first_installment_date ? parseLocalDate(sale.first_installment_date) : parseLocalDate(sale.sale_date);
                              const installmentAmount = (sale.sell_price - (sale.down_payment || 0)) / sale.installments;
                              const elements = [];
                              for (let i = 1; i <= sale.installments; i++) {
                                const intervalMultiplier = sale.first_installment_date ? (i - 1) : i;
                                let dueDate;

                                if (sale.installment_frequency === 'Semanal') {
                                  dueDate = addDays(baseDate, intervalMultiplier * 7);
                                } else if (sale.installment_frequency === 'Quinzenal') {
                                  dueDate = addDays(baseDate, intervalMultiplier * 15);
                                } else {
                                  dueDate = addMonths(baseDate, intervalMultiplier);
                                }
                                elements.push(
                                  <div key={i} className="flex justify-between items-center bg-white border border-emerald-100/50 p-2 rounded shadow-sm">
                                    <span className="font-semibold text-emerald-800">{i}ª Parcela</span>
                                    <div className="text-right">
                                      <span className="font-bold text-emerald-700 block">{format(dueDate, 'dd/MM/yyyy')}</span>
                                      <span className="text-[10px] text-emerald-600 font-medium">{formatBRL(installmentAmount)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return elements;
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    <p className="col-span-2 mt-2"><span className="font-semibold">Vendedor:</span> Kaleb Santos</p>
                  </div>
                </section>

                <section className="bg-white p-4 rounded-lg border border-[#e5e7eb] text-sm space-y-3" style={{ backgroundColor: '#ffffff' }}>
                  <h3 className="font-bold text-base mb-2">Termos e Condições de Garantia</h3>
                  <p>1. <strong>Prazo e Cobertura:</strong> Este aparelho possui garantia de {warrantyMonths === 12 ? '1 (um) ano' : '6 (seis) meses'}, cobrindo exclusivamente defeitos de funcionamento de hardware decorrentes de vícios de fabricação. A garantia é válida de {format(saleDate, "dd/MM/yyyy")} até {format(endDate, "dd/MM/yyyy")}.</p>
                  <p>2. <strong>Exclusões:</strong> Esta garantia não cobre danos decorrentes de mau uso, negligência, acidentes, contato com líquidos (oxidação), quedas, quebra de tela, ou qualquer dano físico. Estão excluídos também danos causados por software de terceiros, modificações não autorizadas (jailbreak/root) e uso de acessórios não compatíveis ou não originais. <strong className="text-red-650 bg-red-50 px-1 border border-red-200 rounded">ATENÇÃO: Caso o aparelho apresente qualquer tipo de sinal de dano físico ou marcas, por menor que seja, e o aparelho venha a apresentar defeito, a garantia NÃO cobrirá o mesmo. A cobertura é válida APENAS se o aparelho for apresentado exatamente no mesmo estado de conservação física em que foi adquirido na loja.</strong></p>
                  <p>3. <strong>Violação de Selos:</strong> A remoção, dano ou violação de selos de garantia ou de segurança implica na perda imediata da cobertura.</p>
                  <p>4. <strong>Procedimento:</strong> Para acionar a garantia, é obrigatória a apresentação deste termo. O prazo para análise técnica é de até 30 (trinta) dias, conforme legislação vigente.</p>
                  {iphone && (
                    <p>5. <strong>Brindes:</strong> O aparelho acompanha os seguintes brindes: fone de ouvido, capinha, película e carregador. É de exclusiva responsabilidade do cliente conferir a presença e integridade destes itens no ato da retirada do produto. Não serão fornecidos brindes posteriormente à saída do produto da loja caso não tenham sido verificados no momento da compra.</p>
                  )}
                  <p>{iphone ? '6' : '5'}. <strong>Limitação de Responsabilidade:</strong> A GODSHOP não se responsabiliza por perda de dados ou informações pessoais contidas no aparelho. Recomendamos a realização de backup prévio.</p>
                </section>

                {((sale.installments && sale.installments > 1) || sale.payment_method?.toLowerCase().includes('promissória') || sale.payment_method?.toLowerCase().includes('carnê')) && (
                  <section className="bg-white p-4 rounded-lg border border-[#e5e7eb] text-sm space-y-3" style={{ backgroundColor: '#ffffff' }}>
                    <h3 className="font-bold text-base mb-2">Cláusula de Reserva de Domínio, Inadimplência e Encargos</h3>
                    <p>O {getProductTypeLabel()}, descrito neste documento, é vendido de forma parcelada, com pagamento em parcelas semanais, quinzenais e/ou mensais, permanecendo sua propriedade com o vendedor até a quitação integral do valor acordado, nos termos do art. 521 e seguintes do Código Civil.</p>
                    <p>Até a quitação total, o comprador detém apenas a posse direta do bem, comprometendo-se a mantê-lo em perfeito estado de conservação, ficando expressamente proibido vendê-lo, cedê-lo, transferi-lo ou onerá-lo a terceiros sem autorização formal do vendedor, sob pena de vencimento antecipado da dívida.</p>
                    <p>O não pagamento de qualquer parcela por período superior a 10 (dez) dias caracterizará inadimplência, constituindo o comprador automaticamente em mora.</p>
                    <p>Em caso de atraso, incidirão os seguintes encargos:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Multa moratória de 2% sobre o valor da parcela em atraso;</li>
                      <li>Juros de mora de 1% ao mês, calculados proporcionalmente aos dias de atraso;</li>
                    </ul>
                    <p>Persistindo a inadimplência, poderá o vendedor, a seu exclusivo critério:</p>
                    <ul className="list-[lower-alpha] pl-5 space-y-1">
                      <li>exigir o pagamento imediato da totalidade da dívida vencida e vincenda (vencimento antecipado);</li>
                      <li>rescindir o contrato, com a devolução imediata do {getProductShortLabel()};</li>
                      <li>adotar as medidas judiciais cabíveis para recuperação do bem e/ou cobrança do débito, inclusive ação de busca e apreensão, quando aplicável.</li>
                    </ul>
                    <p>Em caso de devolução, o {getProductShortLabel()} deverá ser restituído nas mesmas condições em que foi entregue, ressalvado o desgaste natural, ficando o comprador responsável por eventuais danos, perdas ou avarias constatadas.</p>
                    <p>Os valores pagos poderão ser retidos, total ou parcialmente, para compensação do uso do bem, depreciação, despesas administrativas e prejuízos decorrentes da inadimplência, nos termos da legislação vigente.</p>
                    <p>Para fins de maior segurança jurídica, o presente instrumento poderá ser utilizado como título comprobatório da obrigação assumida, apto a embasar cobrança judicial mais célere.</p>
                    <p>Fica eleito o foro da comarca do domicílio do vendedor para dirimir quaisquer controvérsias oriundas deste contrato.</p>
                  </section>
                )}

                <div className="pt-8">
                  <div className="text-center bg-white border border-slate-200 p-4 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                    <h3 className="font-bold text-sm mb-2 uppercase text-slate-800 tracking-wider">Termo de Aceite</h3>
                    <p className="text-xs text-slate-600 leading-relaxed text-justify">
                      Declaro que conferi pessoalmente o produto, seus acessórios e seu funcionamento, incluindo os itens marcados como "Verificado" neste checklist. Confirmo que o equipamento foi entregue nas condições descritas e concordo que este checklist e as fotografias anexadas passam a integrar o Termo de Garantia e o Contrato de Compra e Venda para todos os efeitos legais.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé e Assinaturas da Página 1 */}
            <div className="pt-12">
              <div className="grid grid-cols-2 gap-12 text-center">
                <div>
                  <div className="border-t border-[#000000] pt-2 relative">
                    {currentSignatureData && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 flex flex-col items-center select-none pointer-events-none">
                        <SignatureDisplay 
                          signatureData={currentSignatureData} 
                          signerName={currentClientName}
                          alt="Assinatura do Cliente" 
                          className="max-h-12 object-contain"
                        />
                        <span className="text-[6px] text-emerald-600 font-bold tracking-wider uppercase bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded-full scale-90">
                          Assinado Eletronicamente
                        </span>
                      </div>
                    )}
                    <p className="font-bold text-xs">Comprador</p>
                    <p className="text-[10px] text-[#6b7280]">{client?.name}</p>
                    {client?.cpf && <p className="text-[9px] text-[#6b7280]">CPF: {client.cpf}</p>}
                  </div>
                </div>
                <div>
                  <div className="border-t border-[#000000] pt-2 relative">
                    <div className="absolute bottom-full mb-1 left-0 right-0 flex justify-center select-none pointer-events-none">
                      <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-3xl text-blue-900 -rotate-2">Kaleb Santos</span>
                    </div>
                    <p className="font-bold text-xs">Vendedor</p>
                    <p className="text-[10px] text-[#6b7280]">Kaleb Santos</p>
                  </div>
                </div>
              </div>

              {/* Seção Testemunhas se aplicável */}
              {((sale.installments && sale.installments > 1) || signatureInfo?.witness1_name) && (
                <div className="pt-12">
                  <h3 className="font-bold text-xs mb-4 text-center uppercase tracking-wider border-b pb-1">Testemunhas de Contrato</h3>
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-2">
                      <div className="border-b border-[#000000] pb-1 flex items-end min-h-[20px]">
                        <span className="text-[10px] font-semibold mr-1.5 text-slate-500">Nome:</span>
                        <span className="text-xs">{signatureInfo?.witness1_name || ''}</span>
                      </div>
                      <div className="border-b border-[#000000] pb-1 flex items-end min-h-[20px]">
                        <span className="text-[10px] font-semibold mr-1.5 text-slate-500">CPF:</span>
                        <span className="text-xs">{signatureInfo?.witness1_cpf || ''}</span>
                      </div>
                      <div className="border-b border-[#000000] pb-1 flex flex-col justify-end min-h-[40px] relative">
                        <span className="text-[10px] font-semibold text-slate-500 absolute left-0 bottom-1">Assinatura:</span>
                        {signatureInfo?.witness1_signature && (
                          <div className="flex flex-col items-center justify-center pl-20 select-none pointer-events-none">
                            <SignatureDisplay 
                              signatureData={signatureInfo.witness1_signature} 
                              signerName={signatureInfo.witness1_name}
                              alt="Assinatura Testemunha 1" 
                              className="max-h-8 object-contain"
                              fallbackClassName="text-sm text-blue-900 -rotate-2 font-bold"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="border-b border-[#000000] pb-1 flex items-end min-h-[20px]">
                        <span className="text-[10px] font-semibold mr-1.5 text-slate-500">Nome:</span>
                        <span className="text-xs">{signatureInfo?.witness2_name || ''}</span>
                      </div>
                      <div className="border-b border-[#000000] pb-1 flex items-end min-h-[20px]">
                        <span className="text-[10px] font-semibold mr-1.5 text-slate-500">CPF:</span>
                        <span className="text-xs">{signatureInfo?.witness2_cpf || ''}</span>
                      </div>
                      <div className="border-b border-[#000000] pb-1 flex flex-col justify-end min-h-[40px] relative">
                        <span className="text-[10px] font-semibold text-slate-500 absolute left-0 bottom-1">Assinatura:</span>
                        {signatureInfo?.witness2_signature && (
                          <div className="flex flex-col items-center justify-center pl-20 select-none pointer-events-none">
                            <SignatureDisplay 
                              signatureData={signatureInfo.witness2_signature} 
                              signerName={signatureInfo.witness2_name}
                              alt="Assinatura Testemunha 2" 
                              className="max-h-8 object-contain"
                              fallbackClassName="text-sm text-blue-900 -rotate-2 font-bold"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE REGISTRO FOTOGRÁFICO (BENTO STYLE) */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border">
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-slate-900 text-white">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-400" />
                  Registro Fotográfico do Produto
                </h3>
                <p className="text-xs text-slate-300">Anexe fotos de alta definição das partes do equipamento (Até 10 fotos)</p>
              </div>
              <button 
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>

            {/* Grid Bento Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
              {currentSignatureData && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-medium mb-6 flex items-start gap-2">
                  <Lock className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <span>Atenção: O contrato já está assinado. Nenhuma foto pode ser alterada, adicionada ou removida.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {PHOTO_CATEGORIES.map(cat => {
                  const currentImg = photos[cat.id];
                  return (
                    <div key={cat.id} className="bg-white border rounded-xl p-3 flex flex-col justify-between aspect-[3/4] shadow-sm relative group overflow-hidden">
                      <div className="space-y-1 mb-2">
                        <span className="font-bold text-[11px] text-slate-800 block truncate">{cat.label}</span>
                      </div>

                      {currentImg ? (
                        /* Slot Preenchido */
                        <div className="flex-1 relative rounded-lg overflow-hidden border bg-slate-100 flex flex-col justify-center">
                          <img src={currentImg} alt={cat.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                            <button
                              onClick={() => setLightboxImage(currentImg)}
                              className="bg-white text-slate-800 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow hover:bg-slate-100 transition-all"
                            >
                              <Eye className="h-3 w-3" />
                              Visualizar
                            </button>
                            
                            {!currentSignatureData && (
                              <div className="flex gap-1">
                                <label className="bg-white text-blue-600 text-[10px] font-bold p-1 rounded shadow hover:bg-slate-100 transition-all cursor-pointer">
                                  <RefreshCw className="h-3 w-3" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handlePhotoUpload(cat.id, file);
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() => handlePhotoDelete(cat.id)}
                                  className="bg-red-600 text-white text-[10px] font-bold p-1 rounded shadow hover:bg-red-700 transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Slot Vazio */
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center p-3 text-center transition-all group-hover:border-blue-400 group-hover:bg-blue-50/20">
                          <Camera className="h-6 w-6 text-slate-400 mb-1 group-hover:text-blue-500 transition-colors" />
                          <span className="text-[10px] text-slate-500 font-medium group-hover:text-blue-600 transition-colors">Enviar Foto</span>
                          
                          {!currentSignatureData && (
                            <label className="absolute inset-0 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(cat.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-slate-100 flex justify-end">
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2 rounded-xl transition-all"
              >
                Concluir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE IMAGEM */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Floating Download Button for Mobile */}
      <div className="fixed bottom-24 right-6 z-[60] sm:hidden">
        <button
          onClick={() => handleDownloadPDF(true)}
          disabled={isDownloading || !isChecklistComplete() || !currentSignatureData}
          className="bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Baixar PDF"
        >
          {isDownloading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}
