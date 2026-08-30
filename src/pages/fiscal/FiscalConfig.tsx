
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, Key, Building2, Save, MapPin } from 'lucide-react';
import { db } from '../../services/db';
import { toast } from 'sonner';

export default function FiscalConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    business_name: '',
    cnpj: '',
    ie: '',
    tax_regime: 'Simples Nacional',
    address: '',
    city: '',
    state: '',
    provider: '',
    environment: 'homolog'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await db.fiscal_configs.get();
      if (data) {
        setConfig({
          business_name: data.business_name || '',
          cnpj: data.cnpj || '',
          ie: data.ie || '',
          tax_regime: data.tax_regime || 'Simples Nacional',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          provider: data.provider || '',
          environment: data.environment || 'homolog'
        });
      }
    } catch (err) {
      console.error('Error loading fiscal config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.fiscal_configs.update(config);
      toast.success('Configurações fiscais salvas com sucesso!');
    } catch (err) {
      console.error('Error saving fiscal config:', err);
      toast.error('Erro ao salvar configurações fiscais.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Configuração Fiscal</h1>
          <p className="text-muted-foreground text-sm">Configure os dados da sua empresa e integração com provedor fiscal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Dados da Empresa */}
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Dados da Empresa (Emissor)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Razão Social / Nome da Loja</label>
                <input 
                  value={config.business_name}
                  onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  placeholder="Ex: Sua Loja Ltda" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">CNPJ</label>
                  <input 
                    value={config.cnpj}
                    onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                    placeholder="00.000.000/0001-00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Inscrição Estadual</label>
                  <input 
                    value={config.ie}
                    onChange={(e) => setConfig({ ...config, ie: e.target.value })}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Endereço Completo</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input 
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="w-full bg-muted/20 border border-white/10 p-3 pl-10 rounded-xl outline-none" 
                    placeholder="Rua, Número, Bairro" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Cidade</label>
                  <input 
                    value={config.city}
                    onChange={(e) => setConfig({ ...config, city: e.target.value })}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Estado (UF)</label>
                  <input 
                    value={config.state}
                    onChange={(e) => setConfig({ ...config, state: e.target.value })}
                    className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none" 
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Regime Tributário</label>
                <select 
                  value={config.tax_regime}
                  onChange={(e) => setConfig({ ...config, tax_regime: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none"
                >
                  <option>Simples Nacional</option>
                  <option>Lucro Presumido</option>
                  <option>Lucro Real</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Integração Fiscal */}
          <div className="bg-card/50 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" />
              Integração com Provedor
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Provedor de NF-e</label>
                <select 
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  className="w-full bg-muted/20 border border-white/10 p-3 rounded-xl outline-none"
                >
                  <option value="">Selecione um provedor...</option>
                  <option value="focus">Focus NFe</option>
                  <option value="plugnotas">PlugNotas (TecnoSpeed)</option>
                  <option value="enotas">E-notas</option>
                </select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="env" 
                    id="homolog" 
                    checked={config.environment === 'homolog'}
                    onChange={() => setConfig({ ...config, environment: 'homolog' })}
                  />
                  <label htmlFor="homolog" className="text-xs font-bold">Homologação</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="env" 
                    id="prod" 
                    checked={config.environment === 'prod'}
                    onChange={() => setConfig({ ...config, environment: 'prod' })}
                  />
                  <label htmlFor="prod" className="text-xs font-bold">Produção</label>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="animate-pulse">SALVANDO...</span>
            ) : (
              <>
                <Save className="h-5 w-5" />
                SALVAR CONFIGURAÇÕES FISCAIS
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
