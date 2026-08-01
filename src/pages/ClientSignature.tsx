import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, PenTool, RotateCcw, FileText, Smartphone, Calendar, DollarSign, MapPin, User, Check, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface PublicSaleData {
  id: string;
  sale: any;
  client: any;
  product: any;
  warrantyMonths: number;
  warrantyStartDate: string;
  warrantyEndDate: string;
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
}

export default function ClientSignature({ id: propId }: { id?: string }) {
  const params = useParams<{ id: string }>();
  const id = propId || params.id;
  const [data, setData] = useState<PublicSaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [fullName, setFullName] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  // Witness 1 State
  const [witness1Name, setWitness1Name] = useState('');
  const [witness1Cpf, setWitness1Cpf] = useState('');
  const [hasDrawnWitness1, setHasDrawnWitness1] = useState(false);

  // Witness 2 State
  const [witness2Name, setWitness2Name] = useState('');
  const [witness2Cpf, setWitness2Cpf] = useState('');
  const [hasDrawnWitness2, setHasDrawnWitness2] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const witness1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingWitness1 = useRef(false);
  const lastXWitness1 = useRef(0);
  const lastYWitness1 = useRef(0);

  const witness2CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingWitness2 = useRef(false);
  const lastXWitness2 = useRef(0);
  const lastYWitness2 = useRef(0);

  // Fetch contract data
  const fetchContract = async () => {
    setLoading(true);
    try {
      // 1. Try reading from Supabase public_sales table first (fully synchronized)
      const { data: dbData, error: dbErr } = await supabase
        .from('public_sales')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!dbErr && dbData) {
        // Handle fallback if columns were stripped and stored in signatureInfo
        const sigInfo = dbData.sale_data?.signatureInfo || {};
        
        const mappedData: PublicSaleData = {
          ...dbData.sale_data,
          id: dbData.id,
          signature_data: dbData.signature_data || sigInfo.signature_data,
          signed_at: dbData.signed_at || sigInfo.signed_at,
          signed_ip: dbData.signed_ip || sigInfo.signed_ip,
          client_name: dbData.client_name || sigInfo.client_name,
          witness1_name: dbData.witness1_name || sigInfo.witness1_name,
          witness1_cpf: dbData.witness1_cpf || sigInfo.witness1_cpf,
          witness1_signature: dbData.witness1_signature || sigInfo.witness1_signature,
          witness2_name: dbData.witness2_name || sigInfo.witness2_name,
          witness2_cpf: dbData.witness2_cpf || sigInfo.witness2_cpf,
          witness2_signature: dbData.witness2_signature || sigInfo.witness2_signature
        };

        setData(mappedData);
        if (mappedData.client?.name) {
          setFullName(mappedData.client_name || mappedData.client.name);
        }
        if (mappedData.witness1_name) setWitness1Name(mappedData.witness1_name);
        if (mappedData.witness1_cpf) setWitness1Cpf(mappedData.witness1_cpf);
        if (mappedData.witness2_name) setWitness2Name(mappedData.witness2_name);
        if (mappedData.witness2_cpf) setWitness2Cpf(mappedData.witness2_cpf);
        setLoading(false);
        return; // Success, skip fallback
      } else if (dbErr) {
        console.warn('Supabase fetchContract error, falling back to server API:', dbErr);
      }
    } catch (supaErr) {
      console.warn('Supabase fetchContract exception, falling back to server API:', supaErr);
    }

    // 2. Fallback to Express server API
    try {
      const response = await fetch(`/api/public-sales/${id}`);
      if (!response.ok) {
        throw new Error('Termo de garantia não localizado no portal de assinaturas.');
      }
      const json = await response.json();
      setData(json);
      if (json.client?.name) {
        setFullName(json.client_name || json.client.name);
      }
      if (json.witness1_name) setWitness1Name(json.witness1_name);
      if (json.witness1_cpf) setWitness1Cpf(json.witness1_cpf);
      if (json.witness2_name) setWitness2Name(json.witness2_name);
      if (json.witness2_cpf) setWitness2Cpf(json.witness2_cpf);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar o documento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchContract();
    }
  }, [id]);

  // Dynamically toggle body overflow so standalone public route can scroll smoothly
  useEffect(() => {
    document.body.style.setProperty('overflow', 'auto', 'important');
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };
  }, []);

  // Non-passive touch listeners for mobile canvas drawing on iOS Safari
  useEffect(() => {
    const bindCanvasTouch = (
      canvas: HTMLCanvasElement | null,
      onStart: (e: TouchEvent) => void,
      onMove: (e: TouchEvent) => void,
      onEnd: () => void
    ) => {
      if (!canvas) return () => {};

      const handleStart = (e: TouchEvent) => {
        e.preventDefault();
        onStart(e);
      };

      const handleMove = (e: TouchEvent) => {
        e.preventDefault();
        onMove(e);
      };

      const handleEnd = () => {
        onEnd();
      };

      canvas.addEventListener('touchstart', handleStart, { passive: false });
      canvas.addEventListener('touchmove', handleMove, { passive: false });
      canvas.addEventListener('touchend', handleEnd);

      return () => {
        canvas.removeEventListener('touchstart', handleStart);
        canvas.removeEventListener('touchmove', handleMove);
        canvas.removeEventListener('touchend', handleEnd);
      };
    };

    const clean1 = bindCanvasTouch(
      canvasRef.current,
      (e) => {
        isDrawing.current = true;
        const { x, y } = getCoordinates(e, canvasRef.current);
        lastX.current = x;
        lastY.current = y;
      },
      (e) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastX.current, lastY.current);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX.current = x;
        lastY.current = y;
        setHasDrawn(true);
      },
      () => { isDrawing.current = false; }
    );

    const clean2 = bindCanvasTouch(
      witness1CanvasRef.current,
      (e) => {
        isDrawingWitness1.current = true;
        const { x, y } = getCoordinates(e, witness1CanvasRef.current);
        lastXWitness1.current = x;
        lastYWitness1.current = y;
      },
      (e) => {
        if (!isDrawingWitness1.current) return;
        const canvas = witness1CanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastXWitness1.current, lastYWitness1.current);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastXWitness1.current = x;
        lastYWitness1.current = y;
        setHasDrawnWitness1(true);
      },
      () => { isDrawingWitness1.current = false; }
    );

    const clean3 = bindCanvasTouch(
      witness2CanvasRef.current,
      (e) => {
        isDrawingWitness2.current = true;
        const { x, y } = getCoordinates(e, witness2CanvasRef.current);
        lastXWitness2.current = x;
        lastYWitness2.current = y;
      },
      (e) => {
        if (!isDrawingWitness2.current) return;
        const canvas = witness2CanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastXWitness2.current, lastYWitness2.current);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastXWitness2.current = x;
        lastYWitness2.current = y;
        setHasDrawnWitness2(true);
      },
      () => { isDrawingWitness2.current = false; }
    );

    return () => {
      clean1();
      clean2();
      clean3();
    };
  }, [loading, error, data?.signature_data]);

  // Handle canvas drawing size & context configuration
  useEffect(() => {
    const setupCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High DPI canvas scaling
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        
        ctx.strokeStyle = '#1e3a8a'; // Deep blue for ink feel
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    if (!loading && !error && !data?.signature_data) {
      setTimeout(() => {
        setupCanvas(canvasRef.current);
        setupCanvas(witness1CanvasRef.current);
        setupCanvas(witness2CanvasRef.current);
      }, 100);
    }
  }, [loading, error, data?.signature_data]);

  // Format currency helpers to avoid dependency problems
  const formatMoney = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDateString = (isoString: string | undefined) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDateTimeString = (isoString: string | undefined) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR');
    } catch (e) {
      return isoString;
    }
  };

  // Canvas Drawing Handlers (Supports Mouse and Touch Screen)
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | TouchEvent, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // CLIENT CANVAS
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    const { x, y } = getCoordinates(e, canvasRef.current);
    lastX.current = x;
    lastY.current = y;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX.current = x;
    lastY.current = y;
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // WITNESS 1 CANVAS
  const startDrawingWitness1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingWitness1.current = true;
    const { x, y } = getCoordinates(e, witness1CanvasRef.current);
    lastXWitness1.current = x;
    lastYWitness1.current = y;
  };

  const drawWitness1 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingWitness1.current) return;
    e.preventDefault();

    const canvas = witness1CanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastXWitness1.current, lastYWitness1.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastXWitness1.current = x;
    lastYWitness1.current = y;
    setHasDrawnWitness1(true);
  };

  const stopDrawingWitness1 = () => {
    isDrawingWitness1.current = false;
  };

  const clearCanvasWitness1 = () => {
    const canvas = witness1CanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnWitness1(false);
  };

  // WITNESS 2 CANVAS
  const startDrawingWitness2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingWitness2.current = true;
    const { x, y } = getCoordinates(e, witness2CanvasRef.current);
    lastXWitness2.current = x;
    lastYWitness2.current = y;
  };

  const drawWitness2 = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingWitness2.current) return;
    e.preventDefault();

    const canvas = witness2CanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastXWitness2.current, lastYWitness2.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastXWitness2.current = x;
    lastYWitness2.current = y;
    setHasDrawnWitness2(true);
  };

  const stopDrawingWitness2 = () => {
    isDrawingWitness2.current = false;
  };

  const clearCanvasWitness2 = () => {
    const canvas = witness2CanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnWitness2(false);
  };
  // Submit digital signature
  const handleSubmitSignature = async () => {
    if (!fullName.trim()) {
      toast.error('Por favor, informe seu nome completo para a assinatura.');
      return;
    }
    if (!hasDrawn || !canvasRef.current) {
      toast.error('Por favor, desenhe sua assinatura no campo indicado.');
      return;
    }

    setSigning(true);
    const toastId = toast.loading('Processando e registrando assinatura eletrônica...');

    try {
      // Extract canvas image data
      const canvas = canvasRef.current;
      const signature_data = canvas.toDataURL('image/png');

      const witness1_signature = hasDrawnWitness1 && witness1CanvasRef.current ? witness1CanvasRef.current.toDataURL('image/png') : undefined;
      const witness2_signature = hasDrawnWitness2 && witness2CanvasRef.current ? witness2CanvasRef.current.toDataURL('image/png') : undefined;

      // Try fetching public client IP
      let clientIp = 'IP desconhecido';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) {
          const ipJson = await ipRes.json();
          if (ipJson.ip) clientIp = ipJson.ip;
        }
      } catch (e) {
        console.warn('Could not fetch public IP client-side:', e);
      }

      const signedAt = new Date().toISOString();

      try {
        // 1. Try writing directly to Supabase public_sales table first
        const signatureInfoToSave = {
          signature_data,
          signed_at: signedAt,
          signed_ip: clientIp,
          client_name: fullName,
          witness1_name: witness1Name || null,
          witness1_cpf: witness1Cpf || null,
          witness1_signature: witness1_signature || null,
          witness2_name: witness2Name || null,
          witness2_cpf: witness2Cpf || null,
          witness2_signature: witness2_signature || null
        };

        // We include sale_data to merge the signatureInfo back inside the JSON 
        // just in case the individual columns do not exist in the database.
        let updateData: any = {
          ...signatureInfoToSave,
          sale_data: {
            ...data,
            signatureInfo: signatureInfoToSave
          }
        };

        let dbErr = null;
        let retryCount = 0;

        while (retryCount < 5) {
          const { error } = await supabase.from('public_sales').update(updateData).eq('id', id);
          dbErr = error;
          
          if (!error) break;

          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
            const columnMatch1 = error.message?.match(/column ['"](.+?)['"]/);
            const columnMatch2 = error.message?.match(/['"](.+?)['"] column/);
            const columnName = (columnMatch2 ? columnMatch2[1] : null) || (columnMatch1 ? columnMatch1[1] : null);
            
            if (columnName) {
              console.warn(`Removing missing column '${columnName}' from public_sales update and retrying...`);
              delete updateData[columnName];
              retryCount++;
              continue;
            }
          }
          break; // Stop if not a missing column error
        }

        if (!dbErr) {
          // Fetch updated record from Supabase to update state
          const { data: dbData } = await supabase
            .from('public_sales')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (dbData) {
            const mappedData: PublicSaleData = {
              ...dbData.sale_data,
              id: dbData.id,
              signature_data: dbData.signature_data,
              signed_at: dbData.signed_at,
              signed_ip: dbData.signed_ip,
              client_name: dbData.client_name,
              witness1_name: dbData.witness1_name,
              witness1_cpf: dbData.witness1_cpf,
              witness1_signature: dbData.witness1_signature,
              witness2_name: dbData.witness2_name,
              witness2_cpf: dbData.witness2_cpf,
              witness2_signature: dbData.witness2_signature
            };
            setData(mappedData);
            toast.success('Termo assinado digitalmente com sucesso!', { id: toastId });
            // Don't return early. We should also save to Express as a redundant fallback
            // in case Supabase RLS policies prevent reading the row later.
          }
        } else {
          console.warn('Supabase signature update failed, falling back to local Express server:', dbErr);
        }
      } catch (supaErr) {
        console.warn('Supabase signature update exception, falling back to local Express server:', supaErr);
      }

      // 2. Fallback to Express server API
      const response = await fetch(`/api/public-sales/${id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signature_data,
          client_name: fullName,
          witness1_name: witness1Name,
          witness1_cpf: witness1Cpf,
          witness1_signature,
          witness2_name: witness2Name,
          witness2_cpf: witness2Cpf,
          witness2_signature
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar assinatura no servidor.');
      }

      const result = await response.json();
      setData(result.data);
      toast.success('Termo assinado digitalmente com sucesso!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao processar assinatura eletrônica.', { id: toastId });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-bold text-slate-800">Carregando Termo de Garantia</h3>
        <p className="text-slate-500 max-w-sm text-sm mt-1">Aguarde enquanto carregamos as informações e validamos o protocolo com a loja...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full text-red-600 mb-4 border border-red-100">
          <X className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Acesso Não Localizado</h3>
        <p className="text-slate-500 max-w-sm text-sm mt-1 mb-6">
          {error || 'Não conseguimos carregar as informações do termo de garantia.'}
        </p>
        <button 
          onClick={fetchContract}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { sale, client, product, warrantyMonths, warrantyStartDate, warrantyEndDate } = data;
  const isSigned = !!data.signature_data;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Branding */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col items-center text-center">
          <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600 mb-3">
            <Smartphone className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black tracking-[0.15em] text-slate-950 uppercase">GOD SHOP</h1>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">Portal de Assinatura Eletrônica</p>
          <p className="text-xs text-slate-400 mt-2">Protocolo Digital de Garantia Homologado</p>
        </div>

        {/* Audit Status Panel */}
        {isSigned ? (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-8 text-emerald-950 flex flex-col items-center justify-center gap-6 shadow-xl relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="h-32 w-32" />
            </div>
            <div className="bg-emerald-500 text-white p-6 rounded-full shadow-lg z-10 animate-in zoom-in duration-500">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <div className="z-10 space-y-3">
              <h4 className="font-black text-2xl tracking-tight">Assinatura Confirmada!</h4>
              <p className="text-emerald-800 font-medium max-w-lg">
                Sua garantia foi homologada com sucesso e está ativa. Uma cópia deste termo pode ser impressa pela loja.
              </p>
              <div className="inline-block mt-4 bg-white/60 p-4 rounded-xl text-left border border-emerald-200">
                <div className="text-xs font-mono text-emerald-800 space-y-1.5">
                  <p>• Assinado por: <span className="font-bold">{data.client_name || client?.name}</span></p>
                  <p>• Data/Hora: <span className="font-bold">{formatDateTimeString(data.signed_at)}</span></p>
                  <p>• Protocolo IP: <span className="font-bold">{data.signed_ip || 'Registrado'}</span></p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-950 flex flex-col md:flex-row items-center gap-4">
            <div className="bg-amber-500 text-white p-3 rounded-full shadow-lg animate-pulse">
              <PenTool className="h-6 w-6" />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h4 className="font-bold text-base md:text-lg">Aguardando sua Assinatura</h4>
              <p className="text-xs text-amber-700 font-medium">Por favor, leia atentamente todos os termos descritos abaixo e assine eletronicamente na área indicada ao final do documento.</p>
            </div>
          </div>
        )}

        {/* Contract Contents Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 md:p-10 text-slate-900 space-y-8">
          <div className="border-b pb-6 text-center">
            <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Termo de Garantia e Contrato de Compra</h2>
            <p className="text-xs text-slate-500 mt-1">Este termo estabelece a cobertura e as cláusulas acordadas para o produto comercializado.</p>
          </div>

          {/* Section 1: Customer Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
              <User className="h-4 w-4 text-slate-400" />
              Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Nome completo:</span> {client?.name}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {client?.phone || 'Não informado'}</p>
              {client?.cpf && <p><span className="font-semibold text-slate-900">CPF:</span> {client.cpf}</p>}
              {client?.email && <p><span className="font-semibold text-slate-900">E-mail:</span> {client.email}</p>}
              {(client?.street || client?.number || client?.neighborhood) && (
                <p className="md:col-span-2">
                  <span className="font-semibold text-slate-900">Endereço:</span> {client.street}{client.number ? `, ${client.number}` : ''}{client.neighborhood ? ` - ${client.neighborhood}` : ''}
                  {client.complement && ` (${client.complement})`}
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Product Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
              <Smartphone className="h-4 w-4 text-slate-400" />
              Detalhes do Aparelho / Equipamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Modelo:</span> {product?.model}</p>
              {product?.imei && <p><span className="font-semibold text-slate-900">IMEI / Serial:</span> <span className="font-mono">{product.imei}</span></p>}
              {product?.storage && <p><span className="font-semibold text-slate-900">Armazenamento:</span> {product.storage}</p>}
              {product?.color && <p><span className="font-semibold text-slate-900">Cor:</span> {product.color}</p>}
              {product?.version && <p><span className="font-semibold text-slate-900">Versão:</span> {product.version}</p>}
              <p><span className="font-semibold text-slate-900">Condição física:</span> <span className="capitalize">{product?.condition || 'Seminovo'}</span></p>
            </div>
          </section>

          {/* Section 3: Sale Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              Dados de Venda e Pagamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Data da Compra:</span> {formatDateString(sale?.sale_date)}</p>
              <p><span className="font-semibold text-slate-900">Valor do Equipamento:</span> {formatMoney(sale?.sell_price)}</p>
              {sale?.down_payment && sale.down_payment > 0 ? (
                <>
                  <p><span className="font-semibold text-slate-900">Valor de Entrada:</span> {formatMoney(sale.down_payment)}</p>
                  <p><span className="font-semibold text-slate-900">Saldo Restante:</span> {formatMoney(sale.sell_price - sale.down_payment)}</p>
                </>
              ) : null}
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-900">Forma de Pagamento acordada:</span> {sale?.payment_method}
                {sale?.installments && sale.installments > 1 && (
                  ` (${sale.installments}x ${sale.installment_frequency === 'Semanal' ? 'Semanal' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal')})`
                )}
              </p>
            </div>

            {sale?.installments && sale.installments > 1 && (
              <div className="bg-slate-50 p-4 rounded-xl border mt-3 space-y-2 text-sm">
                <p className="font-bold text-slate-800">Plano de Parcelamento Ativo:</p>
                <p className="font-semibold text-blue-700">
                  {sale.installments} parcelas de {formatMoney((sale.sell_price - (sale.down_payment || 0)) / sale.installments)} ({sale.installment_frequency === 'Semanal' ? 'Semanais' : (sale.installment_frequency === 'Quinzenal' ? 'Quinzenais' : 'Mensais')})
                </p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  * A entrada de {formatMoney(sale.down_payment || 0)} foi devidamente abatida do saldo parcelado. Os pagamentos deverão ser realizados nos respectivos vencimentos para evitar mora.
                </p>
              </div>
            )}
          </section>

          {/* Section 4: Warranty terms */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Cláusulas de Garantia Legal e Comercial
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>1. <strong>Prazo e Cobertura:</strong> Este aparelho possui garantia de {warrantyMonths} meses, cobrindo exclusivamente defeitos de hardware decorrentes de fabricação. A garantia é válida de {formatDateString(warrantyStartDate)} até {formatDateString(warrantyEndDate)}.</p>
              <p>2. <strong>Exclusões da Garantia:</strong> Não cobrimos em hipótese alguma danos causados por quedas, batidas, tela quebrada ou riscada, trincados, contato com líquidos (água/umidade/oxidação), uso de carregadores paralelos, jailbreak ou software malicioso, nem violações de segurança. <strong className="text-red-700 bg-red-50 px-1 border border-red-100 rounded">ATENÇÃO: Caso o aparelho apresente qualquer sinal físico de dano ou marcas de queda, a cobertura de garantia é perdida imediatamente. O aparelho deve estar no mesmo perfeito estado de conservação em que foi retirado.</strong></p>
              <p>3. <strong>Violação de Selos:</strong> Selos internos e externos rompidos ou removidos anulam imediatamente a cobertura técnica de garantia.</p>
              <p>4. <strong>Backup de Dados:</strong> É de responsabilidade do comprador a preservação de seus dados e mídias. Não nos responsabilizamos por perdas de informações.</p>
            </div>
          </section>

          {/* Section 5: Domain Reserve Clause (if installments exist) */}
          {((sale?.installments && sale.installments > 1) || sale?.payment_method?.toLowerCase().includes('promissória') || sale?.payment_method?.toLowerCase().includes('carnê')) && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                Reserva de Domínio e Inadimplência
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <p>O aparelho objeto deste contrato é vendido sob <strong>Reserva de Domínio</strong> (Art. 521 do Código Civil), permanecendo em propriedade resolúvel do vendedor até que todas as parcelas e encargos sejam quitados integralmente pelo comprador.</p>
                <p>O comprador assume a posse direta e o encargo de depositário, ficando proibido de doar, alienar, vender ou empenhar o aparelho antes da quitação total das obsoletas obrigações contratuais.</p>
                <p>O atraso de qualquer parcela por mais de 10 (dez) dias autoriza o vendedor a declarar antecipadamente vencidas as obrigações e exigir o saldo total restante ou reaver o produto de forma imediata.</p>
              </div>
            </section>
          )}

          {/* Termo de Aceite */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b pb-2">
              <Check className="h-4 w-4 text-slate-400" />
              Termo de Aceite
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 leading-relaxed text-justify">
              Declaro que conferi pessoalmente o produto, seus acessórios e seu funcionamento, incluindo os itens marcados como "Verificado" neste checklist. Confirmo que o equipamento foi entregue nas condições descritas e concordo que este checklist e as fotografias anexadas passam a integrar o Termo de Garantia e o Contrato de Compra e Venda para todos os efeitos legais.
            </div>
          </section>

          {/* Signature Rendering / Signature Input */}
          <div className="pt-8 border-t border-dashed space-y-6">
            {isSigned ? (
              // Document is already signed
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 bg-emerald-50/20 rounded-2xl space-y-4">
                  <div className="text-center space-y-1">
                    <div className="text-emerald-600 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-1">
                      <Check className="h-5 w-5" />
                      Assinado Eletronicamente
                    </div>
                    <p className="text-xs text-slate-500">Representação gráfica das assinaturas capturadas no portal:</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-4">
                    {/* Buyer Signature */}
                    <div className="flex flex-col items-center p-4 bg-white border rounded-xl shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Comprador</span>
                      {data.signature_data && (
                        <img 
                          src={data.signature_data} 
                          alt="Assinatura do Cliente" 
                          className="max-h-20 object-contain"
                        />
                      )}
                      <p className="text-xs font-semibold text-slate-800 mt-2 text-center truncate w-full">{data.client_name || client?.name}</p>
                    </div>

                    {/* Witness 1 Signature */}
                    {data.witness1_signature ? (
                      <div className="flex flex-col items-center p-4 bg-white border rounded-xl shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Testemunha 1</span>
                        <img 
                          src={data.witness1_signature} 
                          alt="Assinatura da Testemunha 1" 
                          className="max-h-20 object-contain"
                        />
                        <p className="text-xs font-semibold text-slate-800 mt-2 text-center truncate w-full">{data.witness1_name}</p>
                        {data.witness1_cpf && <p className="text-[10px] text-slate-400">CPF: {data.witness1_cpf}</p>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed rounded-xl text-slate-400 text-xs text-center">
                        Sem Testemunha 1
                      </div>
                    )}

                    {/* Witness 2 Signature */}
                    {data.witness2_signature ? (
                      <div className="flex flex-col items-center p-4 bg-white border rounded-xl shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Testemunha 2</span>
                        <img 
                          src={data.witness2_signature} 
                          alt="Assinatura da Testemunha 2" 
                          className="max-h-20 object-contain"
                        />
                        <p className="text-xs font-semibold text-slate-800 mt-2 text-center truncate w-full">{data.witness2_name}</p>
                        {data.witness2_cpf && <p className="text-[10px] text-slate-400">CPF: {data.witness2_cpf}</p>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed rounded-xl text-slate-400 text-xs text-center">
                        Sem Testemunha 2
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center text-xs text-slate-400 font-mono pt-4">
                    <p>Audit ID: {data.id?.split('-')[0].toUpperCase()}</p>
                    <p>IP: {data.signed_ip}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Signature capture area
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="font-bold text-lg text-slate-900">Área de Assinatura Eletrônica</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Preencha os campos abaixo e faça as respectivas assinaturas eletrônicas para validar o termo.</p>
                </div>

                <div className="space-y-8 max-w-lg mx-auto">
                  {/* Comprador (Client) Section */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 border-b pb-2 uppercase tracking-wide text-blue-800">1. Assinatura do Comprador (Obrigatório)</h4>
                    
                    {/* Name field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome Completo do Comprador</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Insira seu nome completo"
                        className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Signature Board canvas */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Desenhe sua Assinatura</label>
                        <button 
                          onClick={clearCanvas}
                          className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 py-1 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpar
                        </button>
                      </div>

                      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-inner h-32 relative touch-none">
                        <canvas 
                          ref={canvasRef}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="absolute inset-0 w-full h-full cursor-crosshair bg-transparent"
                        />
                        {!hasDrawn && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs select-none">
                            <PenTool className="h-4 w-4 mb-1 opacity-60" />
                            <span>Escreva a assinatura digital aqui</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Testemunha 1 Section */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 border-b pb-2 uppercase tracking-wide text-blue-800">2. Assinatura da Testemunha 1 (Opcional)</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome da Testemunha 1</label>
                        <input 
                          type="text" 
                          value={witness1Name}
                          onChange={(e) => setWitness1Name(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">CPF da Testemunha 1</label>
                        <input 
                          type="text" 
                          value={witness1Cpf}
                          onChange={(e) => setWitness1Cpf(e.target.value)}
                          placeholder="Apenas números ou CPF"
                          className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* Witness 1 Signature Board canvas */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Desenhe a Assinatura (Testemunha 1)</label>
                        <button 
                          onClick={clearCanvasWitness1}
                          className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 py-1 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpar
                        </button>
                      </div>

                      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-inner h-32 relative touch-none">
                        <canvas 
                          ref={witness1CanvasRef}
                          onMouseDown={startDrawingWitness1}
                          onMouseMove={drawWitness1}
                          onMouseUp={stopDrawingWitness1}
                          onMouseLeave={stopDrawingWitness1}
                          onTouchStart={startDrawingWitness1}
                          onTouchMove={drawWitness1}
                          onTouchEnd={stopDrawingWitness1}
                          className="absolute inset-0 w-full h-full cursor-crosshair bg-transparent"
                        />
                        {!hasDrawnWitness1 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs select-none">
                            <PenTool className="h-4 w-4 mb-1 opacity-60" />
                            <span>Escreva a assinatura digital aqui</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Testemunha 2 Section */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 border-b pb-2 uppercase tracking-wide text-blue-800">3. Assinatura da Testemunha 2 (Opcional)</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome da Testemunha 2</label>
                        <input 
                          type="text" 
                          value={witness2Name}
                          onChange={(e) => setWitness2Name(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">CPF da Testemunha 2</label>
                        <input 
                          type="text" 
                          value={witness2Cpf}
                          onChange={(e) => setWitness2Cpf(e.target.value)}
                          placeholder="Apenas números ou CPF"
                          className="w-full bg-white border border-slate-300 text-slate-900 px-4 py-2.5 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* Witness 2 Signature Board canvas */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Desenhe a Assinatura (Testemunha 2)</label>
                        <button 
                          onClick={clearCanvasWitness2}
                          className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 py-1 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpar
                        </button>
                      </div>

                      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-inner h-32 relative touch-none">
                        <canvas 
                          ref={witness2CanvasRef}
                          onMouseDown={startDrawingWitness2}
                          onMouseMove={drawWitness2}
                          onMouseUp={stopDrawingWitness2}
                          onMouseLeave={stopDrawingWitness2}
                          onTouchStart={startDrawingWitness2}
                          onTouchMove={drawWitness2}
                          onTouchEnd={stopDrawingWitness2}
                          className="absolute inset-0 w-full h-full cursor-crosshair bg-transparent"
                        />
                        {!hasDrawnWitness2 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs select-none">
                            <PenTool className="h-4 w-4 mb-1 opacity-60" />
                            <span>Escreva a assinatura digital aqui</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accept terms confirmation and button */}
                  <button 
                    onClick={handleSubmitSignature}
                    disabled={signing || !fullName.trim() || !hasDrawn}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/15"
                  >
                    <Check className="h-5 w-5" />
                    {signing ? 'Registrando...' : 'Confirmar e Assinar Termo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} GOD SHOP. Todos os direitos reservados.</p>
          <p className="font-mono">Chave de Assinatura: {id?.substring(0, 18).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
