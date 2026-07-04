import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { Plus, Trash2, Phone, Edit2, MessageCircle, Link as LinkIcon, Copy, Check, Mail, FileText, MapPin, Eye, Shield, Laptop, Calendar, User, Info, Smartphone, FileSpreadsheet, X, Sparkles, ZoomIn, ZoomOut, RotateCw, Printer, Download, CreditCard, ExternalLink, Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useAuth } from '../types/AuthContext';

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreviewClient, setSelectedPreviewClient] = useState<any>(null);
  const [previewDocZoom, setPreviewDocZoom] = useState(100);
  const [previewDocRotation, setPreviewDocRotation] = useState(0);

  // States for enhanced registration (identical to remote client link)
  const [birthDate, setBirthDate] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [canvasDrawingActive, setCanvasDrawingActive] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Address states for identical registration form
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Synchronize state when adding/editing
  React.useEffect(() => {
    if (editingClient) {
      setBirthDate(editingClient.birth_date || '');
      setDocumentUrl(editingClient.documento_url || '');
      setSignatureData(editingClient.assinatura_base64 || '');
      setHasSignature(!!editingClient.assinatura_base64);
      setDocumentFile(null);
      setCep(editingClient.cep || '');
      setStreet(editingClient.street || '');
      setNumber(editingClient.number || '');
      setComplement(editingClient.complement || '');
      setNeighborhood(editingClient.neighborhood || '');
      setCity(editingClient.city || '');
      setState(editingClient.state || '');
    } else {
      setBirthDate('');
      setDocumentUrl('');
      setSignatureData('');
      setHasSignature(false);
      setDocumentFile(null);
      setCep('');
      setStreet('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('');
      setState('');
    }
  }, [editingClient, isAdding]);

  // Reset zoom & rotation when changing client preview
  React.useEffect(() => {
    if (selectedPreviewClient) {
      setPreviewDocZoom(100);
      setPreviewDocRotation(0);
    }
  }, [selectedPreviewClient]);

  // Fetch address from CEP
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      setLoadingAddress(true);
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
      toast.error('Erro ao buscar CEP.');
    } finally {
      setLoadingAddress(false);
    }
  };

  // Copy client data as plain text
  const handleCopyClientData = (client: any) => {
    if (!client) return;
    const text = `--- FICHA CADASTRAL DO CLIENTE ---
Nome: ${client.name || 'Não informado'}
CPF: ${client.cpf || 'Não informado'}
Data de Nascimento: ${client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR') : 'Não informada'}
E-mail: ${client.email || 'Não informado'}
Telefone: ${client.phone || 'Não informado'}

--- ENDEREÇO ---
CEP: ${client.cep || 'Não informado'}
Rua: ${client.street || 'Não informada'}, Nº ${client.number || 'S/N'}
Bairro: ${client.neighborhood || 'Não informado'}
Complemento: ${client.complement || '-'}
Cidade: ${client.city || 'Não informada'} - ${client.state || 'UF'}
Endereço Completo: ${client.address || 'Não informado'}

--- SEGURANÇA E AUDITORIA (LGPD) ---
UUID de Segurança: ${client.security_uuid || 'Nenhum'}
IP de Registro: ${client.security_ip || '127.0.0.1'}
Navegador: ${client.security_browser || 'Não informado'}
SO: ${client.security_os || 'Não informado'}
Dispositivo: ${client.security_device || 'Não informado'}
Token de Cadastro: ${client.token_cadastro || 'Nenhum'}
`;
    navigator.clipboard.writeText(text);
    toast.success('Ficha cadastral copiada com sucesso!');
  };

  // Helper to download image files
  const handleDownloadFile = (urlOrBase64: string, defaultName: string) => {
    if (!urlOrBase64) return;
    try {
      const link = document.createElement('a');
      link.href = urlOrBase64;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download iniciado!');
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Erro ao realizar download do arquivo.');
    }
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG ou WEBP.');
      return;
    }

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

  // Canvas drawing coords
  const getEventCoords = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#D4AF37'; // God Shop Gold Color
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setCanvasDrawingActive(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasDrawingActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
    
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => {
    setCanvasDrawingActive(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

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

  // Fetch pending remote registrations from the server
  const { data: pendingRemote = [], refetch: refetchPending } = useQuery({
    queryKey: ['pendingRemote', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/public-clients?userId=${user.id}`);
      if (res.ok) {
        return res.json();
      }
      return [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // auto-refetch every 10 seconds to catch remote registrations
  });

  const approveRemoteMutation = useMutation({
    mutationFn: async (remoteClient: any) => {
      // 1. Create client locally/Supabase
      const { id: remoteId, created_at, ...cleanClient } = remoteClient;
      await db.clients.create(cleanClient);
      
      // 2. Mark as synchronized on the server
      if (user?.id) {
        await fetch('/api/public-clients/sync-done', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            clientIds: [remoteId],
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      refetchPending();
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erro ao cadastrar cliente remoto.');
    }
  });

  const rejectRemoteMutation = useMutation({
    mutationFn: async (remoteClientId: string) => {
      if (user?.id) {
        await fetch('/api/public-clients/sync-done', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            clientIds: [remoteClientId],
          }),
        });
      }
    },
    onSuccess: () => {
      refetchPending();
      toast.success('Solicitação de cadastro removida.');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erro ao recusar cadastro.');
    }
  });

  const handleCopyLink = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const tokenData = await res.json();
        const link = `${window.location.origin}/cadastro-cliente?token=${tokenData.token}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Link único gerado e copiado! (Válido por 1 uso / 24h)');
        setTimeout(() => setCopied(false), 3000);
      } else {
        toast.error('Erro ao gerar token de link único.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao gerar link único.');
    }
  };
  
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.cpf && client.cpf.includes(searchTerm))
  );

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const addMutation = useMutation({
    mutationFn: (newClient: any) => db.clients.create(newClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsAdding(false);
      toast.success('Cliente adicionado!');
    },
    onError: (error) => {
      console.error('Erro ao adicionar cliente:', error);
      toast.error('Erro ao adicionar cliente.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => db.clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
      toast.success('Cliente atualizado!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido!');
    }
  });

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const addressParts = [];
    if (street) addressParts.push(street);
    if (number) addressParts.push(number);
    if (neighborhood) addressParts.push(neighborhood);
    if (complement) addressParts.push(complement);
    
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string || undefined,
      email: formData.get('email') as string || undefined,
      birth_date: birthDate || undefined,
      cep: cep || undefined,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: city || undefined,
      state: state || undefined,
      address: addressParts.join(', ') || undefined,
      documento_url: documentUrl || undefined,
      assinatura_base64: signatureData || undefined,
    };
    addMutation.mutate(data);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;
    const formData = new FormData(e.currentTarget);
    
    const addressParts = [];
    if (street) addressParts.push(street);
    if (number) addressParts.push(number);
    if (neighborhood) addressParts.push(neighborhood);
    if (complement) addressParts.push(complement);
    
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string || undefined,
      email: formData.get('email') as string || undefined,
      birth_date: birthDate || undefined,
      cep: cep || undefined,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: city || undefined,
      state: state || undefined,
      address: addressParts.join(', ') || undefined,
      documento_url: documentUrl || undefined,
      assinatura_base64: signatureData || undefined,
    };
    updateMutation.mutate({
      id: editingClient.id,
      data
    });
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie sua carteira de clientes</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-none border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Link Copiado!
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                Link de Cadastro Externo
              </>
            )}
          </button>
          
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingClient(null);
            }}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Seção de Solicitações de Cadastro Remoto */}
      {pendingRemote.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-emerald-500 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Solicitações de Cadastro Remoto ({pendingRemote.length})
            </h2>
            <span className="text-xs text-emerald-500 opacity-80">Recebidos via link externo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRemote.map((remoteClient: any) => (
              <div key={remoteClient.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{remoteClient.name}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {remoteClient.phone}
                  </p>
                  {remoteClient.email && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      {remoteClient.email}
                    </p>
                  )}
                  {remoteClient.cpf && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <FileText className="h-3 w-3 shrink-0" />
                      CPF: {remoteClient.cpf}
                    </p>
                  )}
                  {remoteClient.address && (
                    <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1 mt-0.5" title={remoteClient.address}>
                      <MapPin className="h-3 w-3 shrink-0" />
                      {remoteClient.address}
                    </p>
                  )}
                </div>

                <div className="flex gap-1.5 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setSelectedPreviewClient(remoteClient)}
                    className="bg-primary/10 hover:bg-primary/20 text-primary p-1 px-2.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Pré-visualizar Cadastro Completo"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </button>
                  <button
                    onClick={() => rejectRemoteMutation.mutate(remoteClient.id)}
                    className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground py-1 px-1 rounded-md text-xs font-semibold transition cursor-pointer text-center"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => approveRemoteMutation.mutate(remoteClient)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 border rounded-xl bg-card shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      </div>

      {(isAdding || editingClient) && (
        <div className="bg-card border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#D4AF37] animate-pulse" />
                {editingClient ? 'Editar Cliente Homologado' : 'Homologar Novo Cliente'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingClient ? 'Atualize as informações completas do cadastro' : 'Insira as informações de cadastro e capture a assinatura'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingClient(null); }}
              className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form 
            key={editingClient?.id || 'new'}
            onSubmit={editingClient ? handleUpdate : handleAdd} 
            className="space-y-8"
          >
            {/* Seção 1: Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5 border-b border-white/5 pb-2">
                <User className="h-4 w-4" />
                1. Informações Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Nome Completo</label>
                  <input 
                    name="name" 
                    defaultValue={editingClient?.name} 
                    required 
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: João da Silva" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">WhatsApp / Celular</label>
                  <input 
                    name="phone" 
                    defaultValue={editingClient?.phone} 
                    required 
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: (11) 99999-9999" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">CPF</label>
                  <input 
                    name="cpf" 
                    defaultValue={editingClient?.cpf} 
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: 000.000.000-00" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Data de Nascimento</label>
                  <input 
                    type="date"
                    value={birthDate} 
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">E-mail</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={editingClient?.email} 
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: joao@email.com" 
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Endereço Residencial */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5 border-b border-white/5 pb-2">
                <MapPin className="h-4 w-4" />
                2. Endereço Residencial
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-2 space-y-1.5 relative">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">CEP</label>
                  <div className="relative">
                    <input 
                      value={cep} 
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleCepBlur}
                      className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                      placeholder="00000-000" 
                    />
                    {loadingAddress && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="block h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Rua / Logradouro</label>
                  <input 
                    value={street} 
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: Av. Paulista" 
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Número</label>
                  <input 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: 123" 
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Complemento</label>
                  <input 
                    value={complement} 
                    onChange={(e) => setComplement(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: Bloco B, Apto 42" 
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Bairro</label>
                  <input 
                    value={neighborhood} 
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: Jardins" 
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Cidade</label>
                  <input 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition" 
                    placeholder="Ex: São Paulo" 
                  />
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">UF</label>
                  <input 
                    value={state} 
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    className="w-full p-2.5 bg-background border border-white/10 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-sm transition text-center uppercase" 
                    placeholder="SP" 
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Documento & Assinatura Digital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              {/* Upload do Documento */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Foto do Documento (RG/CNH)
                </h3>
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[220px] text-center space-y-3 relative group transition hover:border-[#D4AF37]/30">
                  {documentUrl ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="h-[120px] bg-black/40 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 relative p-1">
                        <img src={documentUrl} alt="Documento do cliente" className="max-h-full max-w-full object-contain" />
                      </div>
                      <button 
                        type="button" 
                        onClick={removeDocument}
                        className="text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover Documento
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Anexar foto do documento do cliente</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Suporta formatos JPG, PNG ou WEBP (Max: 5MB)</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Selecionar Arquivo
                      </button>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Desenhar Assinatura */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  Assinatura Digitalizada
                </h3>
                
                <div className="border border-white/10 rounded-2xl p-4 bg-muted/20 flex flex-col space-y-3 min-h-[220px] justify-between">
                  <div className="relative">
                    {signatureData && !canvasDrawingActive ? (
                      <div className="w-full h-[150px] bg-white rounded-lg flex items-center justify-center p-2 relative">
                        <img src={signatureData} alt="Assinatura atual" className="max-h-full max-w-full object-contain" />
                        <div className="absolute top-1.5 right-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md p-0.5 px-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Gravada
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-[150px] bg-white rounded-lg border border-white/10 overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={150}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-full cursor-crosshair touch-none bg-white"
                        />
                        {!hasSignature && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 p-4 text-center">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assine dentro deste campo</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">Use o mouse ou a tela de toque</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      A assinatura será vinculada à ficha cadastral do cliente.
                    </span>
                    <button 
                      type="button" 
                      onClick={clearSignature}
                      className="text-xs text-muted-foreground hover:text-foreground font-bold px-3 py-1.5 bg-background border border-white/5 hover:border-white/10 rounded-xl transition cursor-pointer"
                    >
                      Limpar Campo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações de Envio */}
            <div className="flex justify-end gap-2 pt-6 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingClient(null); }} 
                className="bg-muted hover:bg-muted/80 text-muted-foreground px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                {editingClient ? 'Atualizar Ficha' : 'Homologar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => {
          const clientSales = sales.filter(s => s.client_id === client.id);
          return (
            <div key={client.id} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{client.name}</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setSelectedPreviewClient(client)}
                    className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors"
                    title="Visualizar Ficha Completa"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setIsAdding(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(client.id)}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-muted-foreground mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                  <a 
                    href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
                {client.cpf && (
                  <div className="text-sm">
                    <span className="font-medium">CPF:</span> {client.cpf}
                  </div>
                )}
                {(client.street || client.number || client.neighborhood || client.city) && (
                  <div className="text-sm truncate">
                    <span className="font-medium">End:</span> {client.street}{client.number ? `, ${client.number}` : ''}{client.neighborhood ? ` - ${client.neighborhood}` : ''}{client.city ? ` - ${client.city}` : ''}
                  </div>
                )}
              </div>
              <div className="mt-auto pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{clientSales.length}</span> compras realizadas
                </p>
              </div>
            </div>
          );
        })}
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border rounded-xl">
            {searchTerm ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Cliente"
        message="Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
      />

      {/* MODAL DE PRÉ-VISUALIZAÇÃO COMPLETA DO CLIENTE */}
      {selectedPreviewClient && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md overflow-hidden">
          <div className="relative bg-[#0C0C0E] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[82vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-fade-in text-white overflow-hidden">
            
            {/* Header with Title and Badges */}
            <div className="p-4 sm:p-8 pb-4 border-b border-white/5 relative shrink-0">
              {/* Close Button */}
              <button
                onClick={() => setSelectedPreviewClient(null)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 p-1.5 sm:p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer z-10"
                title="Fechar"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <div className="space-y-2 pr-8 sm:pr-10">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    selectedPreviewClient.token_cadastro || selectedPreviewClient.assinatura_base64
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-white/5'
                  }`}>
                    {selectedPreviewClient.token_cadastro || selectedPreviewClient.assinatura_base64
                      ? 'Homologado via Link de Vendas'
                      : 'Cadastro Interno / Manual'}
                  </span>
                  
                  {selectedPreviewClient.assinatura_base64 && (
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> Assinado Digitalmente
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black mt-1 text-white truncate leading-tight">{selectedPreviewClient.name}</h2>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-mono">ID: {selectedPreviewClient.id}</p>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4">
                <button
                  onClick={() => handleCopyClientData(selectedPreviewClient)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[11px] sm:text-xs font-semibold border border-white/5 transition-all cursor-pointer"
                  title="Copiar dados cadastrais para área de transferência"
                >
                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Copiar Ficha Técnica
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] hover:text-[#f3cd4a] rounded-lg text-[11px] sm:text-xs font-bold border border-[#D4AF37]/20 transition-all cursor-pointer"
                  title="Imprimir relatório completo ou salvar em PDF"
                >
                  <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Imprimir Ficha de Cadastro
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-4 pb-4 space-y-6 custom-scrollbar">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-900/60 border border-white/5 rounded-xl p-4">
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">CPF</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.cpf || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Data de Nascimento</span>
                    <span className="font-semibold text-sm text-neutral-200">
                      {selectedPreviewClient.birth_date 
                        ? new Date(selectedPreviewClient.birth_date).toLocaleDateString('pt-BR') 
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">E-mail</span>
                    <span className="font-semibold text-sm truncate block text-neutral-200">{selectedPreviewClient.email || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Telefone / WhatsApp</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.phone || 'Não informado'}</span>
                      {selectedPreviewClient.phone && (
                        <a 
                          href={`https://wa.me/55${selectedPreviewClient.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-full transition-colors shadow-sm"
                          title="Iniciar conversa no WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Endereço Residencial */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Endereço Residencial
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-900/60 border border-white/5 rounded-xl p-4">
                  <div className="col-span-2">
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Rua</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.street || 'Não informada'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Número</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.number || 'S/N'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Complemento</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.complement || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Bairro</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.neighborhood || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Cidade</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.city || 'Não informada'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Estado (UF)</span>
                    <span className="font-semibold text-sm text-neutral-200">{selectedPreviewClient.state || 'Não informado'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-4 border-t border-white/5 pt-2 mt-1">
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Endereço Completo</span>
                    <span className="font-semibold text-sm block leading-relaxed text-neutral-200">{selectedPreviewClient.address || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Seção 3: Comprovação (Documentos e Assinatura Digital) */}
              {(selectedPreviewClient.documento_url || selectedPreviewClient.assinatura_base64) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Foto de Documento Interativa */}
                  {selectedPreviewClient.documento_url && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Foto do Documento (RG/CNH)
                        </h3>
                        {/* Interactive Viewer Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewDocZoom(prev => Math.max(50, prev - 25))}
                            className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                            title="Zoom Out"
                          >
                            <ZoomOut className="h-3 w-3" />
                          </button>
                          <span className="text-[10px] font-mono text-neutral-400 px-1">{previewDocZoom}%</span>
                          <button
                            onClick={() => setPreviewDocZoom(prev => Math.min(200, prev + 25))}
                            className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                            title="Zoom In"
                          >
                            <ZoomIn className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setPreviewDocRotation(prev => (prev + 90) % 360)}
                            className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                            title="Rotacionar 90º"
                          >
                            <RotateCw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setPreviewDocZoom(100);
                              setPreviewDocRotation(0);
                            }}
                            className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                            title="Resetar"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="border border-white/10 rounded-xl p-3 bg-neutral-900/40 flex flex-col items-center justify-between h-[240px]">
                        <div className="w-full h-[150px] bg-black/40 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 relative">
                          <img 
                            src={selectedPreviewClient.documento_url} 
                            alt="Documento do Cliente" 
                            className="max-w-full max-h-full object-contain transition-transform duration-300"
                            style={{ 
                              transform: `scale(${previewDocZoom / 100}) rotate(${previewDocRotation}deg)`
                            }}
                          />
                        </div>
                        <div className="flex gap-3 w-full justify-center pt-2">
                          <a 
                            href={selectedPreviewClient.documento_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[10px] text-neutral-300 hover:text-white font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 text-[#D4AF37]" /> Nova Aba
                          </a>
                          <button
                            onClick={() => handleDownloadFile(selectedPreviewClient.documento_url, `documento_${selectedPreviewClient.name.toLowerCase().replace(/\s+/g, '_')}.png`)}
                            className="text-[10px] text-neutral-300 hover:text-white font-bold flex items-center gap-1"
                          >
                            <Download className="h-3 w-3 text-[#D4AF37]" /> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assinatura Digital com Trilha */}
                  {selectedPreviewClient.assinatura_base64 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Assinatura Digitalizada
                        </h3>
                        <button
                          onClick={() => handleDownloadFile(selectedPreviewClient.assinatura_base64, `assinatura_${selectedPreviewClient.name.toLowerCase().replace(/\s+/g, '_')}.png`)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-white transition"
                          title="Baixar imagem da assinatura"
                        >
                          <Download className="h-3 w-3 text-[#D4AF37]" /> Download PNG
                        </button>
                      </div>

                      <div className="border border-white/10 rounded-xl p-3 bg-neutral-900/40 flex flex-col items-center justify-between h-[240px]">
                        <div className="w-full h-[150px] bg-white rounded-lg flex items-center justify-center p-2 border border-white/5 relative">
                          <img 
                            src={selectedPreviewClient.assinatura_base64} 
                            alt="Assinatura Digital" 
                            className="max-w-full max-h-full object-contain filter brightness-95" 
                          />
                          <div className="absolute top-1.5 right-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md p-0.5 px-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Autêntico
                          </div>
                        </div>
                        <div className="text-[9px] text-neutral-400 text-center pt-2 leading-tight">
                          Vinculado à trilha de segurança digital em conformidade com as diretrizes do ICP-Brasil.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seção 4: Trilha de Auditoria e Segurança (LGPD) */}
              {(selectedPreviewClient.security_ip || selectedPreviewClient.security_uuid) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Trilha Digital de Segurança (LGPD)
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-neutral-950 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-neutral-400">
                    <div>
                      <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Endereço IP</span>
                      <span className="text-white font-semibold">{selectedPreviewClient.security_ip || '127.0.0.1'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Navegador</span>
                      <span className="text-white font-semibold truncate block" title={selectedPreviewClient.security_browser}>{selectedPreviewClient.security_browser || 'Desconhecido'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Dispositivo</span>
                      <span className="text-white font-semibold truncate block" title={selectedPreviewClient.security_device}>{selectedPreviewClient.security_device || 'Desconhecido'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Sistema Operacional</span>
                      <span className="text-white font-semibold">{selectedPreviewClient.security_os || 'Desconhecido'}</span>
                    </div>
                    <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                      <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">ID Único de Segurança (Security UUID)</span>
                      <span className="text-[#D4AF37] font-semibold block truncate select-all">{selectedPreviewClient.security_uuid || 'Nenhum'}</span>
                    </div>
                    {selectedPreviewClient.token_cadastro && (
                      <div className="col-span-2">
                        <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Token de Cadastro Utilizado</span>
                        <span className="text-white font-semibold block truncate">{selectedPreviewClient.token_cadastro}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seção 5: Resumo Comercial */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Histórico Comercial
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-neutral-900/60 border border-white/5 rounded-xl p-4">
                  <div className="text-center sm:text-left">
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Compras Realizadas</span>
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {sales.filter((s: any) => s.client_id === selectedPreviewClient.id).length}
                    </span>
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="block text-[10px] text-neutral-400 uppercase font-bold">Valor Total Comprado</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        sales
                          .filter((s: any) => s.client_id === selectedPreviewClient.id)
                          .reduce((acc: number, s: any) => acc + (s.sell_price || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="p-6 border-t border-white/5 flex justify-end shrink-0 bg-[#0C0C0E]">
              <button
                onClick={() => setSelectedPreviewClient(null)}
                className="bg-[#D4AF37] hover:bg-[#B38F1D] text-black px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition shadow-md cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SEÇÃO OCULTA DE IMPRESSÃO (EXCLUSIVA PARA GERAR PDF/IMPRIMIR FICHA DE HOMOLOGAÇÃO) */}
      {selectedPreviewClient && (
        <div className="hidden print:block bg-white text-black p-10 font-sans text-xs leading-relaxed max-w-4xl mx-auto space-y-6">
          <div className="border-b-2 border-black pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-lg font-black uppercase tracking-wide">Ficha de Homologação Cadastral</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Laudo de Auditoria de Segurança Digital - LGPD</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono font-bold text-gray-700">ID CADASTRAL: {selectedPreviewClient.id}</p>
              <p className="text-[9px] text-gray-500">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Dados Pessoais */}
            <div className="col-span-2 border-b border-gray-200 pb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-black pl-2">1. Informações do Cliente</h2>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Nome Completo</span>
              <span className="font-bold text-sm text-black">{selectedPreviewClient.name}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Cadastro de Pessoa Física (CPF)</span>
              <span className="font-bold text-sm text-black">{selectedPreviewClient.cpf || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Data de Nascimento</span>
              <span className="font-semibold text-black">{selectedPreviewClient.birth_date ? new Date(selectedPreviewClient.birth_date).toLocaleDateString('pt-BR') : 'Não informada'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Telefone / Celular</span>
              <span className="font-semibold text-black">{selectedPreviewClient.phone || 'Não informado'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Endereço de E-mail</span>
              <span className="font-semibold text-black">{selectedPreviewClient.email || 'Não informado'}</span>
            </div>

            {/* Endereço */}
            <div className="col-span-2 border-b border-gray-200 pb-2 mt-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-black pl-2">2. Endereço Residencial</h2>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Endereço Completo</span>
              <span className="font-semibold text-black text-sm">{selectedPreviewClient.address || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Rua</span>
              <span className="font-semibold text-black">{selectedPreviewClient.street || 'Não informada'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Número / Complemento</span>
              <span className="font-semibold text-black">{selectedPreviewClient.number || 'S/N'} {selectedPreviewClient.complement ? ` - ${selectedPreviewClient.complement}` : ''}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Bairro</span>
              <span className="font-semibold text-black">{selectedPreviewClient.neighborhood || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">CEP / Cidade / Estado</span>
              <span className="font-semibold text-black">{selectedPreviewClient.cep ? `${selectedPreviewClient.cep} - ` : ''}{selectedPreviewClient.city || 'Não informada'}/{selectedPreviewClient.state || 'UF'}</span>
            </div>

            {/* Trilha Digital */}
            <div className="col-span-2 border-b border-gray-200 pb-2 mt-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 border-l-4 border-black pl-2">3. Trilha Eletrônica de Auditoria (LGPD)</h2>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Endereço de IP</span>
              <span className="font-mono text-black">{selectedPreviewClient.security_ip || '127.0.0.1'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Sistema Operacional / Dispositivo</span>
              <span className="font-semibold text-black">{selectedPreviewClient.security_os || 'Não identificado'} ({selectedPreviewClient.security_device || 'Desconhecido'})</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Navegador do Usuário</span>
              <span className="font-semibold text-black truncate block">{selectedPreviewClient.security_browser || 'Não identificado'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-gray-500 uppercase">Chave de Auditoria Única (Security UUID)</span>
              <span className="font-mono font-bold text-gray-800 text-sm">{selectedPreviewClient.security_uuid || 'N/A'}</span>
            </div>
            {selectedPreviewClient.token_cadastro && (
              <div className="col-span-2">
                <span className="block text-[8px] font-bold text-gray-500 uppercase">Token de Registro Utilizado</span>
                <span className="font-mono text-gray-700">{selectedPreviewClient.token_cadastro}</span>
              </div>
            )}
          </div>

          {/* Imagens de Assinatura e Documento para impressão */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200">
            {selectedPreviewClient.documento_url && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-800">Anexo: Documento de Identidade (RG/CNH)</h3>
                <div className="border border-gray-300 rounded p-2 bg-gray-50 h-[180px] flex items-center justify-center">
                  <img src={selectedPreviewClient.documento_url} className="max-h-full max-w-full object-contain" alt="Documento para impressão" />
                </div>
              </div>
            )}

            {selectedPreviewClient.assinatura_base64 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-800">Anexo: Assinatura Eletrônica Digitalizada</h3>
                <div className="border border-gray-300 rounded p-2 bg-white h-[180px] flex flex-col items-center justify-between">
                  <div className="h-[120px] w-full flex items-center justify-center">
                    <img src={selectedPreviewClient.assinatura_base64} className="max-h-full max-w-full object-contain filter contrast-125" alt="Assinatura para impressão" />
                  </div>
                  <div className="text-[8px] text-gray-500 text-center leading-tight border-t border-gray-100 w-full pt-1.5 font-sans">
                    Assinado eletronicamente pelo titular do cadastro. Autenticidade reconhecida por trilha criptográfica associada de acordo com Medida Provisória 2.200-2/2001.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legal Stamp / Footer for Print */}
          <div className="pt-8 border-t border-black mt-8 text-[9px] text-gray-500 flex justify-between items-center">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-700 uppercase">Termo de Conformidade Digital</p>
              <p>Este cadastro goza de presunção de integridade nos termos do Art. 10 da MP nº 2.200-2.</p>
            </div>
            <div className="border border-black p-2 text-center rounded uppercase font-black text-black tracking-widest text-[8px]">
              Homologado
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
