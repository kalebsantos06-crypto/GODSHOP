import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../services/db';
import { ProductPhoto } from '../types';
import { 
  X, Upload, Search, Trash2, Check, Image as ImageIcon, 
  Sparkles, Database, Layers, Plus, HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductPhotosGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (photoUrl: string, photoName?: string) => void;
  selectedPhotoUrl?: string | null;
}

export const SAMPLE_PRODUCT_PHOTOS = [
  { id: 'iphone_12_red', name: 'iPhone 12 Vermelho (Duplo)', category: 'iPhone', url: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=600&q=80' },
  { id: 'iphone_13_dark', name: 'iPhone 13 Meia-Noite', category: 'iPhone', url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=600&q=80' },
  { id: 'iphone_14_pro', name: 'iPhone 14 Pro Dourado', category: 'iPhone', url: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&w=600&q=80' },
  { id: 'moto_g_series', name: 'Motorola Moto G / Smartphone', category: 'Android', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
  { id: 'samsung_galaxy', name: 'Samsung Galaxy Ultra', category: 'Android', url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80' },
  { id: 'ps5_console', name: 'PlayStation 5 Console', category: 'Games', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80' },
  { id: 'apple_watch', name: 'Apple Watch Ultra', category: 'Watch', url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80' },
];

export default function ProductPhotosGalleryModal({
  isOpen,
  onClose,
  onSelectPhoto,
  selectedPhotoUrl
}: ProductPhotosGalleryModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'samples'>('all');
  const [uploading, setUploading] = useState(false);

  // Fetch saved photos from IndexedDB & Cloud DB
  const { data: savedPhotos = [], isLoading } = useQuery<ProductPhoto[]>({
    queryKey: ['product_photos'],
    queryFn: () => db.product_photos.list(),
    enabled: isOpen,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.product_photos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_photos'] });
      toast.success('Foto removida do banco de dados!');
    },
    onError: () => toast.error('Erro ao remover foto.')
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newPhoto: Omit<ProductPhoto, 'id'>) => db.product_photos.create(newPhoto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product_photos'] });
      toast.success('📸 Foto salva no banco de dados com sucesso!');
      if (data && data.data_url) {
        onSelectPhoto(data.data_url, data.name);
      }
    },
    onError: () => toast.error('Erro ao salvar foto no banco de dados.')
  });

  if (!isOpen) return null;

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const nameClean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      createMutation.mutate({
        name: nameClean.toUpperCase(),
        data_url: dataUrl,
        category: 'Aparelho',
        created_at: new Date().toISOString()
      });
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error('Erro ao carregar a imagem.');
    };
    reader.readAsDataURL(file);
  };

  // Filtered lists
  const filteredSaved = savedPhotos.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSamples = SAMPLE_PRODUCT_PHOTOS.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/10 text-red-600 rounded-xl">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                Painel de Fotos dos Aparelhos
                <span className="text-[10px] bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                  {savedPhotos.length} Salvas no Banco
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Suas fotos são salvas permanentemente no banco de dados local e sincronizadas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Search, Filters, Upload */}
        <div className="p-4 border-b border-border bg-muted/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do aparelho, marca ou modelo..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            {/* Upload Button */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>{uploading ? 'Salvando Foto...' : 'Enviar e Salvar Nova Foto'}</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 text-xs font-bold overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Todas ({savedPhotos.length + SAMPLE_PRODUCT_PHOTOS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span>Minhas Fotos Salvas ({savedPhotos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('samples')}
              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'samples'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Renders 3D Prontos ({SAMPLE_PRODUCT_PHOTOS.length})</span>
            </button>
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[60vh]">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando fotos do banco de dados...
            </div>
          ) : (
            <>
              {/* SECTION: SAVED PHOTOS */}
              {(activeTab === 'all' || activeTab === 'saved') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                      <HardDrive className="h-4 w-4 text-red-500" />
                      Minhas Fotos Enviadas ({filteredSaved.length})
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Salvas no banco de dados do seu dispositivo
                    </span>
                  </div>

                  {filteredSaved.length === 0 ? (
                    <div className="p-8 border border-dashed border-border rounded-2xl bg-muted/20 text-center space-y-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="text-xs font-bold text-muted-foreground">
                        {searchTerm ? 'Nenhuma foto encontrada para a pesquisa.' : 'Nenhuma foto enviada ainda.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-red-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Clique para enviar e salvar a 1ª foto
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {filteredSaved.map((photo) => {
                        const isSelected = selectedPhotoUrl === photo.data_url;
                        return (
                          <div
                            key={photo.id}
                            className={`group relative bg-background border rounded-2xl p-2.5 flex flex-col items-center gap-2 transition-all ${
                              isSelected
                                ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/5 shadow-md'
                                : 'border-border hover:border-red-500/50 hover:shadow-sm'
                            }`}
                          >
                            {/* Selection badge */}
                            {isSelected && (
                              <div className="absolute top-2 left-2 z-10 bg-red-600 text-white p-1 rounded-full shadow">
                                <Check className="h-3 w-3" />
                              </div>
                            )}

                            {/* Image container */}
                            <div className="w-full h-28 bg-muted/40 rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-border/50">
                              <img
                                src={photo.data_url}
                                alt={photo.name}
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>

                            {/* Details */}
                            <div className="w-full space-y-1 text-center">
                              <p className="text-[11px] font-black text-foreground truncate" title={photo.name}>
                                {photo.name}
                              </p>
                              {photo.created_at && (
                                <p className="text-[9px] text-muted-foreground font-semibold">
                                  {format(new Date(photo.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectPhoto(photo.data_url, photo.name);
                                  toast.success(`Foto "${photo.name}" selecionada!`);
                                }}
                                className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                                  isSelected
                                    ? 'bg-red-600 text-white'
                                    : 'bg-muted hover:bg-red-600 hover:text-white text-foreground'
                                }`}
                              >
                                {isSelected ? 'Em Uso' : 'Selecionar'}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remover "${photo.name}" do banco de dados?`)) {
                                    deleteMutation.mutate(photo.id);
                                  }
                                }}
                                className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition"
                                title="Excluir do Banco de Dados"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: SAMPLE RENDERS */}
              {(activeTab === 'all' || activeTab === 'samples') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Renders 3D Transparentes Prontos ({filteredSamples.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredSamples.map((sample) => {
                      const isSelected = selectedPhotoUrl === sample.url;
                      return (
                        <div
                          key={sample.id}
                          className={`group bg-background border rounded-2xl p-2.5 flex flex-col items-center gap-2 transition-all ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/5 shadow-md'
                              : 'border-border hover:border-purple-500/50 hover:shadow-sm'
                          }`}
                        >
                          <div className="w-full h-28 bg-muted/40 rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-border/50">
                            <img
                              src={sample.url}
                              alt={sample.name}
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>

                          <div className="w-full space-y-0.5 text-center">
                            <p className="text-[11px] font-black text-foreground truncate" title={sample.name}>
                              {sample.name}
                            </p>
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full inline-block">
                              {sample.category}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectPhoto(sample.url, sample.name);
                              toast.info(`Render "${sample.name}" selecionado!`);
                            }}
                            className={`w-full py-1.5 px-2 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-muted hover:bg-purple-600 hover:text-white text-foreground'
                            }`}
                          >
                            {isSelected ? 'Em Uso' : 'Usar Render'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            Fotos armazenadas no IndexedDB & Sincronizador de Nuvem
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
}
