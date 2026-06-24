import React, { useState, useEffect } from 'react';
import { Upload, LogOut, Image as ImageIcon, Smartphone } from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';

export default function Settings() {
  const { logout } = useAuth();
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setBgPreview(localStorage.getItem('app_background') || '/background.jpg');
    setLogoPreview(localStorage.getItem('app_logo') || null);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        try {
          localStorage.setItem(key, base64String);
          setPreview(base64String);
          window.dispatchEvent(new Event('settings_updated'));
          toast.success('Imagem atualizada com sucesso!');
        } catch (err) {
          toast.error('Erro ao salvar imagem. O arquivo pode ser muito grande.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>, defaultVal: string | null) => {
    localStorage.removeItem(key);
    setPreview(defaultVal);
    window.dispatchEvent(new Event('settings_updated'));
    toast.success('Imagem removida com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Settings */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            Logo do Aplicativo
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden shadow-inner">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-cover" />
              ) : (
                <Smartphone className="h-10 w-10 text-muted-foreground opacity-50" />
              )}
            </div>
            <div className="flex gap-2 w-full">
              <label className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                <Upload className="h-4 w-4 inline-block mr-2" />
                Alterar Logo
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'app_logo', setLogoPreview)}
                />
              </label>
              {logoPreview && (
                <button 
                  onClick={() => handleRemoveImage('app_logo', setLogoPreview, null)}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recomendado: Imagem quadrada (PNG/JPG) de até 2MB.
            </p>
          </div>
        </div>

        {/* Background Settings */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-primary" />
            Plano de Fundo
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-full rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative">
              {bgPreview ? (
                <img src={bgPreview} alt="Background Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2 w-full">
              <label className="flex-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                <Upload className="h-4 w-4 inline-block mr-2" />
                Alterar Fundo
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, 'app_background', setBgPreview)}
                />
              </label>
              {bgPreview !== '/background.jpg' && (
                <button 
                  onClick={() => handleRemoveImage('app_background', setBgPreview, '/background.jpg')}
                  className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                >
                  Restaurar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recomendado: Imagem vertical (PNG/JPG) de até 2MB.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-white/10 rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
          <LogOut className="h-5 w-5" />
          Sessão
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deseja encerrar sua sessão atual no aplicativo?
        </p>
        <button
          onClick={logout}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sair do Aplicativo
        </button>
      </div>
    </div>
  );
}
