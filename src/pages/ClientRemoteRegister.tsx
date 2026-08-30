import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  X, 
  Upload, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Calendar,
  Lock, 
  Check, 
  FileDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Shield,
  CreditCard,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { getSavedStatusTemplate, formatStatusMessage, buildWhatsAppUrl, getStoreWhatsAppNumber } from '../lib/whatsappUtils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' }
];

export default function ClientRemoteRegister() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const legacyRef = searchParams.get('ref');
  
  // App routing/validation states
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [tokenErrorMsg, setTokenErrorMsg] = useState('');
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // General app state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Step 1: Personal Data
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>(''); // Base64 representation

  // Step 2: Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Step 3: Signature & Final Confirmation
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(''); // Base64
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Real-time Duplicate Check States
  const [duplicateErrors, setDuplicateErrors] = useState({
    cpf: false,
    phone: false,
    email: false
  });

  // UI Settings (Dynamic theme values from Merchant Settings API)
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string>('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop');

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Zoom/Rotate settings for document viewer modal
  const [docZoom, setDocZoom] = useState(100);
  const [docRotation, setDocRotation] = useState(0);

  // Hidden audit logs (automatic tracking)
  const [browserInfo, setBrowserInfo] = useState({
    browser: '',
    os: '',
    device: '',
    ip: '',
    uuid: ''
  });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate Token on Mount
  useEffect(() => {
    const validateTokenAndFetchSettings = async () => {
      setIsValidatingToken(true);
      
      const activeToken = token;
      const refId = legacyRef;

      if (!activeToken && !refId) {
        setIsTokenInvalid(true);
        setTokenErrorMsg('Nenhum código de cadastro ou vendedor foi fornecido.');
        setIsValidatingToken(false);
        return;
      }

      try {
        if (activeToken) {
          const tokenRes = await fetch(`/api/tokens/validate?token=${activeToken}`);
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.valid) {
              setMerchantId(tokenData.userId);
              fetchMerchantSettings(tokenData.userId);
            } else {
              setIsTokenInvalid(true);
              setTokenErrorMsg(tokenData.error || 'Este link é inválido, expirou ou já foi utilizado.');
            }
          } else {
            setIsTokenInvalid(true);
            setTokenErrorMsg('Falha de comunicação com o servidor de validação.');
          }
        } else if (refId) {
          // Legacy direct ref fallback
          setMerchantId(refId);
          fetchMerchantSettings(refId);
        }
      } catch (err) {
        console.error("Token validation error:", err);
        setIsTokenInvalid(true);
        setTokenErrorMsg('Erro de conexão ao validar o link de cadastro.');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateTokenAndFetchSettings();
  }, [token, legacyRef]);

  // Capture user info
  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = 'Outro';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    let os = 'Outro';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Celular' : 'Computador';
    const uuid = `sec-reg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    setBrowserInfo(prev => ({ ...prev, browser, os, device, uuid }));

    // Fetch IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        if (data && data.ip) {
          setBrowserInfo(prev => ({ ...prev, ip: data.ip }));
        }
      })
      .catch(err => console.warn('Could not fetch IP directly. Server will fallback.', err));
  }, []);

  // Fetch Merchant Customization Settings
  const fetchMerchantSettings = async (userId: string) => {
    try {
      const res = await fetch(`/api/settings?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.app_logo) {
          setLogoImage(data.app_logo);
        }
        if (data.app_background) {
          setBgImage(data.app_background);
        }
      }
    } catch (err) {
      console.error("Error fetching merchant settings:", err);
    }
  };

  // Real-time Duplicate Check Debounce effect
  useEffect(() => {
    const checkDuplicates = async () => {
      const cleanCpfVal = cpf.replace(/\D/g, '');
      const cleanPhoneVal = phone.replace(/\D/g, '');
      const cleanEmailVal = email.trim().toLowerCase();

      const validCpf = cleanCpfVal.length === 11;
      const validPhone = cleanPhoneVal.length >= 10;
      const validEmail = cleanEmailVal.includes('@') && cleanEmailVal.includes('.');

      if (validCpf || validPhone || validEmail) {
        try {
          const params = new URLSearchParams();
          if (validCpf) params.append('cpf', cleanCpfVal);
          if (validPhone) params.append('phone', cleanPhoneVal);
          if (validEmail) params.append('email', cleanEmailVal);

          const res = await fetch(`/api/clients/check-duplicate?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setDuplicateErrors({
              cpf: data.duplicateCpf,
              phone: data.duplicatePhone,
              email: data.duplicateEmail
            });
          }
        } catch (err) {
          console.error("Error checking duplicates:", err);
        }
      } else {
        setDuplicateErrors({ cpf: false, phone: false, email: false });
      }
    };

    const timer = setTimeout(() => {
      checkDuplicates();
    }, 500);

    return () => clearTimeout(timer);
  }, [cpf, phone, email]);

  // Enable body scrolling, restore on unmount
  useEffect(() => {
    document.body.style.setProperty('overflow', 'auto', 'important');
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };
  }, []);

  // Masks
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    setCpf(value);
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setBirthDate(value);
  };

  // Fetch address from CEP
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      setLoading(true);
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data && !data.erro) {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        toast.success('Endereço preenchido automaticamente via CEP!');
      } else {
        toast.error('CEP não localizado.');
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setLoading(false);
    }
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG, WEBP ou PDF.');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite máximo é 5MB.');
      return;
    }

    setDocumentFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentUrl(reader.result as string);
      toast.success('Documento anexado com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Documento removido.');
  };

  // Canvas signature logic
  const [canvasDrawingActive, setCanvasDrawingActive] = useState(false);

  // Canvas drawing coords & event binding to prevent mobile page scrolling
  const isDrawingRef = useRef(false);
  const lastCoordsRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (step !== 3) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.strokeStyle = '#D4AF37'; // God Shop Gold Color
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    };

    setupCanvas();
    const timer = setTimeout(setupCanvas, 100);

    const getCoords = (e: MouseEvent | Touch | PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
      isDrawingRef.current = true;
      setCanvasDrawingActive(true);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#D4AF37'; // God Shop Gold Color
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const coords = getCoords(e);
      lastCoordsRef.current = coords;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoords(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastCoordsRef.current = coords;
      setHasSignature(true);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
        setCanvasDrawingActive(false);
        setSignatureData(canvas.toDataURL());
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length === 0) return;
      isDrawingRef.current = true;
      setCanvasDrawingActive(true);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const coords = getCoords(e.touches[0]);
      lastCoordsRef.current = coords;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDrawingRef.current || e.touches.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoords(e.touches[0]);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastCoordsRef.current = coords;
      setHasSignature(true);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setCanvasDrawingActive(false);
        setSignatureData(canvas.toDataURL());
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      clearTimeout(timer);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);

      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [step]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureData('');
    toast.success('Assinatura limpa.');
  };

  // Nav validations
  const validateStep1 = () => {
    if (!name.trim()) return 'Nome Completo é obrigatório.';
    if (name.trim().split(' ').length < 2) return 'Digite seu nome completo (Nome e Sobrenome).';
    if (!birthDate.trim() || birthDate.length !== 10) return 'Data de Nascimento válida é obrigatória.';
    if (!phone.trim() || phone.length < 14) return 'Telefone/WhatsApp válido é obrigatório.';
    if (!cpf.trim() || cpf.length !== 14) return 'CPF válido é obrigatório.';
    if (!email.trim() || !email.includes('@')) return 'E-mail válido é obrigatório.';
    if (!documentUrl) return 'O upload do documento (CPF ou CNH) é obrigatório.';
    
    // Duplicate checks are displayed in real-time under inputs but do not block registration
    return null;
  };

  const validateStep2 = () => {
    if (!cep.trim() || cep.length < 8) return 'CEP válido é obrigatório.';
    if (!street.trim()) return 'Rua é obrigatória.';
    if (!number.trim()) return 'Número é obrigatório.';
    if (!neighborhood.trim()) return 'Bairro é obrigatório.';
    if (!city.trim()) return 'Cidade é obrigatória.';
    if (!state.trim()) return 'Selecione o Estado (UF).';
    return null;
  };

  const handleNextStep = () => {
    if (step === 1) {
      const error = validateStep1();
      if (error) {
        toast.error(error);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const error = validateStep2();
      if (error) {
        toast.error(error);
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = async () => {
    if (!hasSignature || !signatureData) {
      toast.error('Por favor, assine no campo indicado para continuar.');
      return;
    }

    if (!termsAccepted) {
      toast.error('Você deve aceitar a declaração de veracidade.');
      return;
    }

    setLoading(true);
    setShowConfirmModal(false);

    const addressParts = [street.trim(), number.trim(), neighborhood.trim(), complement.trim(), city.trim(), state];

    const finalClientPayload = {
      name: name.trim(),
      phone: phone.trim(),
      cpf: cpf.trim(),
      birth_date: birthDate.trim(),
      email: email.trim(),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state,
      address: addressParts.filter(Boolean).join(', '),
      documento_url: documentUrl,
      assinatura_base64: signatureData,
      token_cadastro: token || '',
      token_utilizado: !!token,
      
      // Security auto-audit tracking (hidden)
      security_uuid: browserInfo.uuid,
      security_ip: browserInfo.ip,
      security_browser: browserInfo.browser,
      security_os: browserInfo.os,
      security_device: browserInfo.device,
    };

    try {
      const response = await fetch('/api/public-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: merchantId,
          client: finalClientPayload,
          token: token
        }),
      });

      if (response.ok) {
        setSuccess(true);
        toast.success('Seu cadastro foi realizado e assinado com sucesso!');
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Erro ao salvar cadastro do cliente.');
      }
    } catch (err) {
      console.error('Error during client save:', err);
      toast.error('Erro de conexão ao enviar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  // Render Token validation loading screen
  if (isValidatingToken) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <RefreshCw className="h-10 w-10 text-[#D4AF37] animate-spin" />
          <p className="text-white/80 font-medium tracking-widest uppercase text-xs">Validando Link de Segurança...</p>
        </div>
      </div>
    );
  }

  // Render Token invalidation error screen
  if (isTokenInvalid) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black text-white relative overflow-y-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 to-black z-0" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 max-w-md w-full p-8 bg-[#0C0C0E] border border-red-500/20 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Link Inválido ou Utilizado</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {tokenErrorMsg || 'Este link de cadastro é temporário, já foi utilizado uma vez ou expirou o prazo limite de preenchimento.'}
            </p>
          </div>

          <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 text-xs text-white/50 text-left leading-relaxed">
            <p className="font-semibold text-red-400 mb-1">Por que isso acontece?</p>
            <p>• Links da GOD SHOP são exclusivos de uso único para proteção de dados do cliente.</p>
            <p>• Assim que concluídos, eles são invalidados automaticamente por conformidade com a LGPD.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Registration success modal/screen
  if (success) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-black text-white relative overflow-y-auto selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
        {/* Background Layer with Dark Overlay & Gold Radial Glow */}
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.92), rgba(0,0,0,0.99)), url(${bgImage})` }}
        />
        
        {/* Subtle Ambient Gold Spotlights */}
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="fixed bottom-0 left-10 w-[300px] h-[300px] bg-emerald-500/3 blur-[100px] rounded-full pointer-events-none z-0" />

        {/* Decorative Grid Accent */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0" />

        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 max-w-2xl w-full p-8 sm:p-12 bg-gradient-to-b from-[#0F0F12] to-[#050507] border border-[#D4AF37]/30 rounded-[32px] text-center space-y-8 shadow-[0_0_80px_rgba(212,175,55,0.15)] my-12"
        >
          {/* Top Brand Logo Container */}
          <div className="flex flex-col items-center gap-3">
            {logoImage ? (
              <motion.img 
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                src={logoImage} 
                alt="Logo GOD SHOP" 
                className="h-20 mx-auto object-contain rounded-2xl border-2 border-[#D4AF37]/40 p-1.5 bg-black/80 shadow-2xl shadow-[#D4AF37]/5" 
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30 flex items-center justify-center shadow-xl">
                <Sparkles className="h-7 w-7 text-[#D4AF37]" />
              </div>
            )}
            <div className="text-center mt-1">
              <span className="block text-[15px] font-black tracking-[0.3em] text-[#D4AF37] uppercase">GOD SHOP</span>
              <span className="block text-[9px] text-white/40 tracking-widest uppercase mt-0.5">Selo de Alta Joalheria & Luxo</span>
            </div>
          </div>

          {/* Success Ring with Gold Particles effect */}
          <div className="relative flex justify-center py-2">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
              className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#D4AF37]/20 to-[#B38F1D]/10 border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              <Check className="h-10 w-10 stroke-[2.5px]" />
            </motion.div>
            
            {/* Pulsing ring in background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-[#D4AF37]/20 animate-ping opacity-70 pointer-events-none" />
          </div>

          {/* Ultra Prominent Thank You Heading */}
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase leading-none">
              A <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFEFA6] via-[#D4AF37] to-[#B38F1D]">GOD SHOP</span> Agradece!
            </h2>
            <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto" />
            <p className="text-white/80 text-sm max-w-lg mx-auto font-medium leading-relaxed pt-1">
              Seu cadastro de alta prioridade foi recebido com sucesso e integrado ao nosso sistema criptografado de homologação de clientes.
            </p>
          </div>

          {/* Luxury Personalized Credentials Card (Wow effect) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative overflow-hidden bg-gradient-to-r from-neutral-950 via-[#0B0B0D] to-neutral-950 border border-white/5 rounded-2xl p-6 text-left shadow-2xl"
          >
            {/* Golden abstract diagonal line */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#D4AF37]/10 to-transparent blur-md pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest block">Cartão Digital de Registro</span>
                <h3 className="text-lg font-black text-white uppercase tracking-wide truncate max-w-[220px] sm:max-w-[340px]">
                  {name || 'Cliente Homologado'}
                </h3>
              </div>
              <Shield className="h-5 w-5 text-[#D4AF37]/70" />
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-white/5 text-[11px] font-mono text-white/50">
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-white/30 mb-0.5">CPF do Titular</p>
                <p className="text-white/80 font-bold">{cpf ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : '***.***.***-**'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-white/30 mb-0.5">Status do Cadastro</p>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> PENDENTE DE VALIDAÇÃO
                </span>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-white/30 mb-0.5">Identificador de Segurança</p>
                <p className="text-white/60 truncate">{browserInfo.uuid?.toUpperCase() || 'SEC-REG-9938'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-white/30 mb-0.5">Data e Hora de Envio</p>
                <p className="text-white/80 font-bold">
                  {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Cryptographic LGPD Tag */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-white/30 uppercase tracking-wider">
              <span>LGPD Compliant • AES-256</span>
              <span className="text-[#D4AF37]/60 font-semibold">Assinado Digitalmente</span>
            </div>
          </motion.div>

          {/* Operational Instructions Section */}
          <div className="p-5 bg-[#121217]/60 rounded-2xl border border-[#D4AF37]/10 text-left space-y-3 shadow-inner">
            <h4 className="font-bold text-white text-xs uppercase tracking-widest flex items-center gap-1.5 text-[#D4AF37]">
              <Shield className="h-4 w-4" /> Próximos Passos & Segurança:
            </h4>
            <div className="text-xs text-white/70 space-y-2 leading-relaxed font-medium">
              <p className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>O link exclusivo gerado para este cadastro foi <strong className="text-white">invalidado permanentemente</strong> por razões de segurança. Nenhuma outra pessoa poderá acessar ou usar este endereço.</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>O vendedor que lhe enviou o link já foi <strong className="text-white">notificado automaticamente</strong> em tempo real e analisará os anexos e assinatura em instantes.</span>
              </p>
              <p className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Certificados de garantia, contratos digitais e recibos de vendas serão gerados usando estas informações validadas.</span>
              </p>
            </div>
          </div>

          {/* WhatsApp Success Notification Button */}
          <div className="pt-2">
            <a
              href={buildWhatsAppUrl(
                getStoreWhatsAppNumber(),
                getSavedStatusTemplate('registration') || "É um prazer tê-lo(a) conosco! Confirmamos que seu cadastro na GODSHOP foi concluído com sucesso em nosso sistema."
              )}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl transition duration-200 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5 text-white animate-pulse" />
              <span>Confirmar no WhatsApp</span>
            </a>
          </div>

          {/* Elegant Footer Disclaimer */}
          <div className="space-y-4 pt-2">
            <p className="text-xs text-white/40">
              Obrigado por sua confiança na excelência de nossos serviços. Você já pode fechar esta página do navegador com total segurança.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-8 px-4 bg-black text-white relative overflow-y-auto font-sans">
      {/* Background layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.91), rgba(0,0,0,0.98)), url(${bgImage})` }}
      />

      {/* Decorative Grid Accent */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main wizard wrapper */}
      <div className="relative z-10 max-w-3xl w-full flex flex-col gap-6">
        
        {/* Header bar */}
        <div className="flex items-center justify-between bg-[#0C0C0E]/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrevStep}
              disabled={step === 1}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-white/5 text-white/70 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">Cadastro de Cliente</h1>
              <p className="text-white/50 text-[11px]">
                {step === 1 && "Preencha os dados pessoais do cliente."}
                {step === 2 && "Informe o endereço do cliente."}
                {step === 3 && "Revise os dados e solicite a assinatura do cliente."}
              </p>
            </div>
          </div>

          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-[13px] font-black tracking-widest text-[#D4AF37] uppercase">GOD SHOP</span>
              <span className="block text-[9px] text-white/40 leading-none">REGISTRATION</span>
            </div>
            {logoImage ? (
              <img src={logoImage} alt="Brand Logo" className="h-8 w-8 object-cover rounded-lg border border-[#D4AF37]/30" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              </div>
            )}
          </div>
        </div>

        {/* Wizard Progress Bar */}
        <div className="bg-[#0C0C0E]/80 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl">
          <div className="relative flex items-center justify-between">
            {/* Line connector */}
            <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-neutral-800 z-0">
              <div 
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B38F1D] transition-all duration-500"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
              />
            </div>

            {/* Step 1 indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2 w-1/3">
              <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > 1 
                  ? "bg-[#D4AF37] border-[#D4AF37] text-black" 
                  : step === 1 
                  ? "bg-black border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]" 
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}>
                {step > 1 ? <Check className="h-4 w-4 stroke-[3px]" /> : <span key="num-1">1</span>}
              </div>
              <span className={`text-[11px] font-semibold tracking-wide transition-all ${
                step === 1 ? "text-[#D4AF37]" : "text-neutral-500"
              }`}>Dados Pessoais</span>
            </div>

            {/* Step 2 indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2 w-1/3">
              <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > 2 
                  ? "bg-[#D4AF37] border-[#D4AF37] text-black" 
                  : step === 2 
                  ? "bg-black border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]" 
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}>
                {step > 2 ? <Check className="h-4 w-4 stroke-[3px]" /> : <span key="num-2">2</span>}
              </div>
              <span className={`text-[11px] font-semibold tracking-wide transition-all ${
                step === 2 ? "text-[#D4AF37]" : "text-neutral-500"
              }`}>Endereço</span>
            </div>

            {/* Step 3 indicator */}
            <div className="relative z-10 flex flex-col items-center gap-2 w-1/3">
              <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step === 3 
                  ? "bg-black border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]" 
                  : "bg-neutral-900 border-neutral-800 text-neutral-500"
              }`}>
                <span key="num-3">3</span>
              </div>
              <span className={`text-[11px] font-semibold tracking-wide transition-all ${
                step === 3 ? "text-[#D4AF37]" : "text-neutral-500"
              }`}>Revisão e Assinatura</span>
            </div>
          </div>
        </div>

        {/* Form Body with Animating Step Wrapper */}
        <div className="bg-[#0C0C0E]/90 backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative">
          
          {/* ETAPA 1: DADOS PESSOAIS */}
          {step === 1 && (
            <div
              key="step-panel-1"
              className="space-y-6 animate-fade-in"
            >
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[#D4AF37] mb-1">
                    <User className="h-4 w-4" /> Dados Pessoais
                  </h2>
                  <p className="text-xs text-white/50">Todos os campos deste formulário são de preenchimento obrigatório.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Nome Completo */}
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Nome Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/70" />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                        placeholder="Ex: João da Silva"
                      />
                      {name.trim().split(' ').length >= 2 && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">CPF *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/70" />
                      <input 
                        type="text" 
                        required
                        value={cpf}
                        onChange={handleCpfChange}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-neutral-950 text-white focus:outline-none transition-all text-sm ${
                          duplicateErrors.cpf ? "border-red-500 focus:border-red-500" : "border-neutral-800 focus:border-[#D4AF37]"
                        }`}
                        placeholder="000.000.000-00"
                      />
                      {cpf.length === 14 && !duplicateErrors.cpf && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                      {duplicateErrors.cpf && (
                        <X className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {duplicateErrors.cpf && (
                      <p className="text-[10px] text-red-500">Este CPF já está cadastrado no sistema.</p>
                    )}
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Data de Nascimento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/70" />
                      <input 
                        type="text" 
                        required
                        value={birthDate}
                        onChange={handleBirthDateChange}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                        placeholder="DD/MM/AAAA"
                      />
                      {birthDate.length === 10 && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Telefone / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/70" />
                      <input 
                        type="text" 
                        required
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-neutral-950 text-white focus:outline-none transition-all text-sm ${
                          duplicateErrors.phone ? "border-red-500 focus:border-red-500" : "border-neutral-800 focus:border-[#D4AF37]"
                        }`}
                        placeholder="(11) 99999-9999"
                      />
                      {phone.length >= 14 && !duplicateErrors.phone && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                      {duplicateErrors.phone && (
                        <X className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {duplicateErrors.phone && (
                      <p className="text-[10px] text-red-500">Este número de telefone já está cadastrado no sistema.</p>
                    )}
                  </div>

                  {/* E-mail */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">E-mail *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/70" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-neutral-950 text-white focus:outline-none transition-all text-sm ${
                          duplicateErrors.email ? "border-red-500 focus:border-red-500" : "border-neutral-800 focus:border-[#D4AF37]"
                        }`}
                        placeholder="joao@email.com"
                      />
                      {email.includes('@') && email.includes('.') && !duplicateErrors.email && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                      {duplicateErrors.email && (
                        <X className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {duplicateErrors.email && (
                      <p className="text-[10px] text-red-500">Este endereço de e-mail já está cadastrado no sistema.</p>
                    )}
                  </div>

                  {/* Document (CPF or CNH) Upload */}
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">Upload do Documento (Frente de CPF ou CNH) *</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-8">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-dashed border-neutral-800 hover:border-[#D4AF37]/60 rounded-xl p-6 bg-neutral-950/60 text-center cursor-pointer transition-all hover:bg-neutral-950 flex flex-col items-center gap-2 group"
                        >
                          <Upload className="h-6 w-6 text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-all group-hover:scale-110" />
                          <p className="text-xs font-medium text-white/80">Selecione ou Arraste o arquivo do Documento</p>
                          <p className="text-[10px] text-white/40">Arquivos válidos: JPG, PNG, WEBP, PDF (Máx 5MB)</p>
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*,.pdf" 
                            onChange={handleFileChange}
                            className="hidden" 
                          />
                        </div>
                      </div>

                      {/* Miniature preview panel */}
                      <div className="sm:col-span-4 bg-neutral-950/40 p-3 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden group">
                        {documentUrl ? (
                          <div className="w-full h-full flex flex-col items-center gap-2 text-center">
                            {documentFile?.type === 'application/pdf' ? (
                              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-[#D4AF37]">
                                <FileText className="h-10 w-10" />
                              </div>
                            ) : (
                              <img src={documentUrl} alt="Preview Documento" className="h-16 w-full object-cover rounded-lg border border-neutral-800 shadow-md" />
                            )}
                            <div className="min-w-0 w-full text-center">
                              <p className="text-[11px] font-bold text-white/90 truncate">{documentFile?.name || 'Documento'}</p>
                              <p className="text-[9px] text-white/40">{( (documentFile?.size || 0) / (1024 * 1024) ).toFixed(2)} MB • {documentFile?.type.split('/')[1].toUpperCase()}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <Check className="h-2.5 w-2.5 stroke-[3px]" /> Documento anexado
                            </span>
                          </div>
                        ) : (
                          <div className="text-center space-y-1">
                            <FileText className="h-8 w-8 text-neutral-600 mx-auto" />
                            <p className="text-[10px] text-neutral-500 font-medium">Aguardando arquivo</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {documentUrl && (
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button 
                          onClick={() => {
                            setDocZoom(100);
                            setDocRotation(0);
                            setShowDocModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white/80 hover:text-white rounded-lg text-xs font-semibold border border-neutral-800 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Visualizar
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white/80 hover:text-white rounded-lg text-xs font-semibold border border-neutral-800 transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Trocar
                        </button>
                        <button 
                          onClick={removeDocument}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold border border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                <div className="pt-4 flex justify-between items-center text-xs text-white/40">
                  <span>Preencha todos os campos obrigatórios (*)</span>
                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#B38F1D] active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    Próximo <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: ENDEREÇO */}
            {step === 2 && (
              <div
                key="step-panel-2"
                className="space-y-6 animate-fade-in"
              >
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[#D4AF37] mb-1">
                    <MapPin className="h-4 w-4" /> Endereço Residencial
                  </h2>
                  <p className="text-xs text-white/50">Por favor, preencha o CEP para que possamos localizar seu endereço automaticamente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  
                  {/* CEP */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">CEP *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={cep}
                        onChange={e => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        onBlur={handleCepBlur}
                        className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                        placeholder="00000-000"
                        maxLength={8}
                      />
                      {cep.length === 8 && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </div>

                  {/* Rua */}
                  <div className="space-y-1.5 md:col-span-4">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Rua *</label>
                    <input 
                      type="text" 
                      required
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                      placeholder="Ex: Avenida Paulista"
                    />
                  </div>

                  {/* Numero */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Número *</label>
                    <input 
                      type="text" 
                      required
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                      placeholder="Ex: 1000"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1.5 md:col-span-4">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Complemento (Opcional)</label>
                    <input 
                      type="text" 
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                      placeholder="Ex: Apto 101, Bloco B"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Bairro *</label>
                    <input 
                      type="text" 
                      required
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                      placeholder="Ex: Centro"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Cidade *</label>
                    <input 
                      type="text" 
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm"
                      placeholder="Ex: São Paulo"
                    />
                  </div>

                  {/* Estado Select */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Estado (UF) *</label>
                    <select
                      required
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-neutral-950 border-neutral-800 focus:border-[#D4AF37] text-white focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione...</option>
                      {BRAZILIAN_STATES.map(s => (
                        <option key={s.value} value={s.value} className="bg-neutral-950">{s.label}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button
                    onClick={handlePrevStep}
                    className="flex items-center gap-1 px-4 py-3 text-white/70 hover:text-white font-semibold rounded-xl hover:bg-white/5 active:scale-95 transition-all text-sm cursor-pointer border border-white/10"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#B38F1D] active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    Próximo <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: REVISÃO E ASSINATURA */}
            {step === 3 && (
              <div
                key="step-panel-3"
                className="space-y-6 animate-fade-in"
              >
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[#D4AF37] mb-1">
                    <CheckCircle className="h-4 w-4" /> Revisão dos Dados
                  </h2>
                  <p className="text-xs text-white/50">Por favor, revise atentamente todos os dados informados antes de assinar.</p>
                </div>

                {/* Grid read-only review cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Dados Pessoais read-only Card */}
                  <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 space-y-2.5">
                    <p className="text-[11px] font-bold text-[#D4AF37] tracking-wider uppercase border-b border-white/5 pb-1 flex items-center justify-between">
                      <span>Dados Pessoais</span>
                      <button onClick={() => setStep(1)} className="text-[10px] text-white/40 hover:text-white transition-all">Editar</button>
                    </p>
                    <div className="text-xs space-y-1">
                      <p><span className="text-white/40">Nome:</span> <span className="text-white/95 font-medium">{name}</span></p>
                      <p><span className="text-white/40">CPF:</span> <span className="text-white/95 font-medium">{cpf}</span></p>
                      <p><span className="text-white/40">Nascimento:</span> <span className="text-white/95 font-medium">{birthDate}</span></p>
                      <p><span className="text-white/40">Telefone:</span> <span className="text-white/95 font-medium">{phone}</span></p>
                      <p className="truncate"><span className="text-white/40">E-mail:</span> <span className="text-white/95 font-medium">{email}</span></p>
                    </div>
                  </div>

                  {/* Endereco read-only Card */}
                  <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 space-y-2.5">
                    <p className="text-[11px] font-bold text-[#D4AF37] tracking-wider uppercase border-b border-white/5 pb-1 flex items-center justify-between">
                      <span>Endereço</span>
                      <button onClick={() => setStep(2)} className="text-[10px] text-white/40 hover:text-white transition-all">Editar</button>
                    </p>
                    <div className="text-xs space-y-1">
                      <p><span className="text-white/40">CEP:</span> <span className="text-white/95 font-medium">{cep}</span></p>
                      <p className="truncate"><span className="text-white/40">Rua:</span> <span className="text-white/95 font-medium">{street}</span></p>
                      <p><span className="text-white/40">Número:</span> <span className="text-white/95 font-medium">{number}</span></p>
                      <p className="truncate"><span className="text-white/40">Bairro:</span> <span className="text-white/95 font-medium">{neighborhood}</span></p>
                      <p className="truncate"><span className="text-white/40">Complemento:</span> <span className="text-white/95 font-medium">{complement}</span></p>
                      <p><span className="text-white/40">Cidade/UF:</span> <span className="text-white/95 font-medium">{city}/{state}</span></p>
                    </div>
                  </div>

                  {/* Document Thumbnail Card */}
                  <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/40 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#D4AF37] tracking-wider uppercase border-b border-white/5 pb-1">Documento</p>
                      <div className="flex items-center gap-3 pt-1">
                        {documentFile?.type === 'application/pdf' ? (
                          <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-[#D4AF37] shrink-0">
                            <FileText className="h-8 w-8" />
                          </div>
                        ) : (
                          <img src={documentUrl} alt="Thumbnail Doc" className="h-12 w-16 object-cover rounded-lg border border-neutral-800 shadow-md shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-white/90 truncate">{documentFile?.name || 'Documento'}</p>
                          <p className="text-[9px] text-white/40">{( (documentFile?.size || 0) / (1024 * 1024) ).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowDocModal(true)}
                      className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-xs font-semibold text-[#D4AF37] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3 w-3" /> Visualizar Documento
                    </button>
                  </div>

                </div>

                {/* Card Exclusivo de Assinatura */}
                <div className="p-5 rounded-3xl border border-[#D4AF37]/20 bg-[#0C0C0E] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#D4AF37]" /> Assinatura do Cliente
                    </h3>
                    <p className="text-[11px] text-white/50 mt-0.5">O cliente confirma que todas as informações fornecidas são verdadeiras.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    {/* Drawing Canvas */}
                    <div className="md:col-span-8 flex flex-col gap-2">
                      <div className="relative border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950 flex flex-col items-center touch-none select-none" style={{ touchAction: 'none' }}>
                        <canvas 
                          ref={canvasRef}
                          width={450}
                          height={180}
                          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                          className="w-full bg-neutral-950/40 cursor-crosshair h-[180px] touch-none select-none"
                        />
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center p-4">
                            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-widest leading-relaxed">Assine Digitalmente Aqui</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={clearSignature}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" /> Limpar Assinatura
                        </button>
                      </div>
                    </div>

                    {/* Metadata confirmation sidebar */}
                    <div className="md:col-span-4 p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold uppercase text-white/40 tracking-wider">Nome do Cliente</label>
                          <p className="text-xs font-semibold text-white/90 truncate">{name || "Aguardando..."}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-white/40 tracking-wider">Data</label>
                            <p className="text-xs font-semibold text-white/90">{new Date().toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold uppercase text-white/40 tracking-wider">Hora</label>
                            <p className="text-xs font-semibold text-white/90">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </div>

                      <label className="relative flex items-start gap-2.5 cursor-pointer select-none group">
                        <input 
                          type="checkbox" 
                          checked={termsAccepted}
                          onChange={e => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 rounded border-neutral-800 text-[#D4AF37] focus:ring-[#D4AF37] bg-neutral-950 cursor-pointer h-4 w-4"
                        />
                        <span className="text-[10px] font-semibold text-white/70 group-hover:text-white leading-relaxed">
                          Confirmo que todas as informações são verdadeiras.
                        </span>
                      </label>
                    </div>

                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button
                    onClick={handlePrevStep}
                    className="flex items-center gap-1 px-4 py-3 text-white/70 hover:text-white font-semibold rounded-xl hover:bg-white/5 active:scale-95 transition-all text-sm cursor-pointer border border-white/10"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      if (!hasSignature || !signatureData) {
                        toast.error('Por favor, assine digitalmente no campo indicado.');
                        return;
                      }
                      if (!termsAccepted) {
                        toast.error('Você deve declarar que as informações são verdadeiras.');
                        return;
                      }
                      setShowConfirmModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-6 py-3 font-bold rounded-xl transition-all text-sm cursor-pointer ${
                      hasSignature && termsAccepted 
                        ? "bg-[#D4AF37] hover:bg-[#B38F1D] text-black shadow-lg shadow-[#D4AF37]/10 active:scale-95" 
                        : "bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50"
                    }`}
                  >
                    Confirmar Assinatura
                  </button>
                </div>
              </div>
            )}

        </div>

        {/* Footer info/badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-[#0C0C0E]/50 border border-white/5 rounded-xl flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-white/80 uppercase leading-none tracking-wider">Link Único</span>
              <span className="text-[8px] text-white/40 block leading-none mt-1">e seguro</span>
            </div>
          </div>
          <div className="p-3 bg-[#0C0C0E]/50 border border-white/5 rounded-xl flex items-center gap-2">
            <X className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-white/80 uppercase leading-none tracking-wider">Uso Único</span>
              <span className="text-[8px] text-white/40 block leading-none mt-1">(inválido após uso)</span>
            </div>
          </div>
          <div className="p-3 bg-[#0C0C0E]/50 border border-white/5 rounded-xl flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-white/80 uppercase leading-none tracking-wider">Proteção</span>
              <span className="text-[8px] text-white/40 block leading-none mt-1">de dados</span>
            </div>
          </div>
          <div className="p-3 bg-[#0C0C0E]/50 border border-white/5 rounded-xl flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-white/80 uppercase leading-none tracking-wider">Assinatura</span>
              <span className="text-[8px] text-white/40 block leading-none mt-1">digital</span>
            </div>
          </div>
          <div className="p-3 bg-[#0C0C0E]/50 border border-white/5 rounded-xl flex items-center col-span-2 sm:col-span-1 gap-2">
            <FileText className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-white/80 uppercase leading-none tracking-wider">Documentos</span>
              <span className="text-[8px] text-white/40 block leading-none mt-1">anexados</span>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: VISUALIZAR DOCUMENTO */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl w-full bg-[#0C0C0E] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Visualizar Documento Anexado</span>
                </div>
                <button 
                  onClick={() => setShowDocModal(false)}
                  className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Viewer body */}
              <div className="p-6 bg-neutral-950 flex items-center justify-center min-h-[350px] max-h-[500px] overflow-auto">
                {documentFile?.type === 'application/pdf' ? (
                  <div className="text-center p-8 space-y-4 max-w-sm">
                    <FileText className="h-16 w-16 text-[#D4AF37] mx-auto" />
                    <p className="text-sm font-bold text-white">Documento em formato PDF</p>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Este documento foi anexado com sucesso. Como está em formato PDF, não pode ser visualizado diretamente no navegador por restrições de iFrame, mas está salvo com segurança.
                    </p>
                    <a 
                      href={documentUrl} 
                      download={documentFile.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-[#D4AF37] transition-all cursor-pointer"
                    >
                      <FileDown className="h-4 w-4" /> Baixar PDF Original
                    </a>
                  </div>
                ) : (
                  <div className="relative overflow-hidden flex items-center justify-center w-full h-full">
                    <img 
                      src={documentUrl} 
                      alt="Documento Grande" 
                      className="max-h-[380px] object-contain rounded-lg transition-all shadow-xl"
                      style={{ 
                        transform: `scale(${docZoom / 100}) rotate(${docRotation}deg)`
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Controls bar */}
              {documentFile?.type !== 'application/pdf' && (
                <div className="flex items-center justify-between p-4 bg-neutral-900/60 border-t border-neutral-800 text-xs">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setDocZoom(prev => Math.max(50, prev - 25))}
                      className="p-2 bg-neutral-950 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-white transition-all cursor-pointer"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-white/80">{docZoom}%</span>
                    <button 
                      onClick={() => setDocZoom(prev => Math.min(200, prev + 25))}
                      className="p-2 bg-neutral-950 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-white transition-all cursor-pointer"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setDocRotation(prev => (prev + 90) % 360)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl font-semibold text-white/85 hover:text-white transition-all cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Rotacionar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CONFIRMAR ASSINATURA */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-[#0C0C0E] border border-[#D4AF37]/30 rounded-3xl p-6 shadow-2xl space-y-6 text-center"
            >
              <div className="h-16 w-16 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl flex items-center justify-center text-[#D4AF37] mx-auto animate-pulse">
                <Check className="h-8 w-8 stroke-[3px]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Confirmar Assinatura?</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Deseja finalizar o cadastro deste cliente? Após confirmar, seus dados serão gravados e o link único de uso exclusivo será invalidado, não podendo ser reutilizado.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-[#D4AF37] hover:bg-[#B38F1D] text-black rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-[#D4AF37]/10 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar Cliente"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
