import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';
import { supabase, isSupabaseConfigured as checkIsSupabaseConfigured, setCustomSupabaseCredentials, clearCustomSupabaseCredentials } from '../lib/supabase';
import { Smartphone, Eye, EyeOff, Database, Key, Settings, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showOfflineOption, setShowOfflineOption] = useState(false);
  const { login, enterOfflineMode } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Supabase Configuration Modal/Drawer State
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [showHostGuide, setShowHostGuide] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [copiedVar, setCopiedVar] = useState(false);

  React.useEffect(() => {
    document.body.classList.remove('overflow-hidden');
    document.body.classList.add('overflow-y-auto');
    return () => {
      document.body.classList.remove('overflow-y-auto');
      document.body.classList.add('overflow-hidden');
    };
  }, []);
  
  const isSupabaseConfigured = checkIsSupabaseConfigured();

  const handleSaveCustomSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      toast.error('Preencha a URL e a Chave Anônima (Anon Key) do Supabase.');
      return;
    }
    setCustomSupabaseCredentials(inputUrl, inputKey);
    toast.success('Chaves salvas com sucesso! Reconectando ao Supabase...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleClearCustomSupabase = () => {
    clearCustomSupabaseCredentials();
    toast.info('Chaves customizadas removidas. Recarregando...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleCopyHostVars = () => {
    const text = `VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=`;
    navigator.clipboard.writeText(text);
    setCopiedVar(true);
    toast.success('Nomes das variáveis copiadas!');
    setTimeout(() => setCopiedVar(false), 2000);
  };

  const handleOfflineLogin = async () => {
    setIsLoading(true);
    try {
      await enterOfflineMode(email);
      toast.success('Entrando em Modo Offline (Resiliência Local)');
      navigate('/');
    } catch (err) {
      toast.error('Erro ao acessar o modo offline.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowOfflineOption(false);
    
    if (!isSupabaseConfigured) {
      try {
        await enterOfflineMode(email);
        toast.success('Iniciando em Modo Local/Offline (Banco de Dados Local Ativo) ⚡');
        navigate('/');
      } catch (err) {
        toast.error('Erro ao acessar o modo offline.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        const errorMsg = String(error.message || error).toLowerCase();
        const isNetwork = errorMsg.includes('failed to fetch') || errorMsg.includes('network') || errorMsg.includes('load') || errorMsg.includes('cors') || errorMsg.includes('typeerror');
        
        if (isNetwork) {
          toast.warning('Erro de conexão. Entrando em Modo Offline...');
          try {
            await enterOfflineMode(email);
            navigate('/');
          } catch (offlineErr) {
            toast.error('Falha ao entrar no modo offline.');
          }
        } else {
          toast.error('Erro ao cadastrar: ' + error.message);
        }
        setIsLoading(false);
      } else {
        toast.success('Cadastro realizado com sucesso!');
        // Tenta fazer login automaticamente
        const { error: loginError } = await login(email, password);
        setIsLoading(false);
        if (!loginError) {
          navigate('/');
        } else {
          toast.info('Verifique se recebeu um e-mail de confirmação ou faça login.');
          setIsRegistering(false);
        }
      }
    } else {
      const { error } = await login(email, password);
      setIsLoading(false);
      if (error) {
        const errorMsg = String(error.message || error).toLowerCase();
        const isNetwork = errorMsg.includes('failed to fetch') || errorMsg.includes('network') || errorMsg.includes('load') || errorMsg.includes('cors') || errorMsg.includes('typeerror');
        
        if (isNetwork) {
          toast.warning('Servidor inacessível. Entrando em Modo Offline...');
          try {
            await enterOfflineMode(email);
            navigate('/');
          } catch (offlineErr) {
            toast.error('Falha ao entrar no modo offline.');
          }
        } else {
          toast.error('Erro ao fazer login: ' + error.message);
        }
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background blobs / metallic styling matching main style */}
      <div className="fixed inset-0 pointer-events-none opacity-45 mix-blend-screen z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-white/5 blur-[150px]"></div>
      </div>
      
      <Card className="w-full max-w-md backdrop-blur-md bg-card/30 border-white/10 z-10 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight">GODSHOP</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isRegistering ? 'Crie uma nova conta de acesso' : 'Faça login para acessar o sistema'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSupabaseConfigured && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 space-y-2 mb-2 shadow-inner">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Modo Demonstração / Offline Ativo</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  As chaves do Supabase não foram detectadas nesta hospedagem. Você pode entrar normalmente digitando <strong>qualquer e-mail e senha</strong> para usar todo o sistema no banco local!
                </p>

                <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowSupabaseConfig(!showSupabaseConfig)}
                    className="w-full text-left py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer text-[11px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-400" />
                      Inserir Chaves do Supabase no Navegador
                    </span>
                    {showSupabaseConfig ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showSupabaseConfig && (
                    <div className="p-2.5 bg-black/40 border border-amber-500/30 rounded-lg space-y-2 mt-1">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">URL do Supabase</label>
                        <input
                          type="url"
                          placeholder="https://seu-projeto.supabase.co"
                          value={inputUrl}
                          onChange={e => setInputUrl(e.target.value)}
                          className="w-full p-1.5 mt-0.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Chave Anônima (Anon Key)</label>
                        <input
                          type="text"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
                          value={inputKey}
                          onChange={e => setInputKey(e.target.value)}
                          className="w-full p-1.5 mt-0.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveCustomSupabase}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Zap className="h-3 w-3 text-amber-300" />
                          Salvar e Conectar
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowHostGuide(!showHostGuide)}
                    className="w-full text-left py-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300/80 hover:text-amber-200 font-medium rounded-lg flex items-center justify-between transition-colors cursor-pointer text-[11px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-amber-400/80" />
                      Como Configurar na Hospedagem (Netlify/Vercel/Cloudflare)
                    </span>
                    {showHostGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showHostGuide && (
                    <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 space-y-2 mt-1">
                      <p className="font-bold text-amber-300">Como configurar as variáveis de ambiente:</p>
                      <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 pl-1 leading-relaxed">
                        <li>Acesse o painel da sua hospedagem (<strong>Netlify, Vercel ou Cloudflare Pages</strong>) e abra o seu projeto.</li>
                        <li>Vá nas configurações do site (<strong>Environment variables / Variáveis de Ambiente</strong>).</li>
                        <li>Adicione as duas chaves abaixo com seus respectivos valores do Supabase:
                          <ul className="list-disc list-inside pl-3 my-1 font-mono text-[10px] text-emerald-400 space-y-0.5">
                            <li>VITE_SUPABASE_URL</li>
                            <li>VITE_SUPABASE_ANON_KEY</li>
                          </ul>
                        </li>
                        <li>Limpe o cache e refaça o deploy (<strong>Redeploy / Clear cache and deploy</strong>).</li>
                      </ol>
                      <button
                        type="button"
                        onClick={handleCopyHostVars}
                        className="w-full py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedVar ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedVar ? 'Nomes Copiados!' : 'Copiar Nomes das Variáveis'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">E-mail</label>
              <input 
                type="email" 
                required
                className="w-full p-2 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent" 
                placeholder="exemplo@dominio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  className="w-full p-2 pr-10 border border-white/10 rounded-md bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                isRegistering ? 'Cadastrar e Entrar' : 'Entrar'
              )}
            </button>

            {showOfflineOption && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-500 text-center space-y-2">
                <p>O servidor está inacessível no momento (rede instável ou offline).</p>
                <button
                  type="button"
                  onClick={handleOfflineLogin}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 rounded transition-colors cursor-pointer"
                >
                  Entrar em Modo Offline
                </button>
              </div>
            )}
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Ainda não tem conta? Cadastre-se'}
              </button>
            </div>

            <div className="text-center pt-2 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={handleOfflineLogin}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Trabalhar Offline (Sem Internet)
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
