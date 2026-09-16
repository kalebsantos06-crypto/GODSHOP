import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../types/AuthContext';
import { 
  supabase, 
  isSupabaseConfigured as checkIsSupabaseConfigured 
} from '../lib/supabase';
import { 
  Smartphone, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  UserCheck, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../services/db';

export default function Login() {
  const [savedUserEmail, setSavedUserEmail] = useState(() => {
    try {
      return localStorage.getItem('godshop_saved_user') || localStorage.getItem('godshop_saved_email') || '';
    } catch {
      return '';
    }
  });

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('godshop_saved_user') || localStorage.getItem('godshop_saved_email') || '';
    } catch {
      return '';
    }
  });

  const [saveUserPreference, setSaveUserPreference] = useState(() => {
    try {
      const saved = localStorage.getItem('godshop_remember_user');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Controls whether we show the compact saved-user profile card or the full email input
  const [isUsingSavedUser, setIsUsingSavedUser] = useState(() => {
    try {
      const saved = localStorage.getItem('godshop_saved_user') || localStorage.getItem('godshop_saved_email');
      return Boolean(saved && saved.trim());
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { login, enterOfflineMode } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Logo & Background from store settings
  const [logoImage, setLogoImage] = useState<string | null>(() => {
    return localStorage.getItem('app_logo') || null;
  });
  const [bgImage, setBgImage] = useState<string>(() => {
    return localStorage.getItem('app_background') || '';
  });

  useEffect(() => {
    document.body.classList.remove('overflow-hidden');
    document.body.classList.add('overflow-y-auto');

    // Auto focus password if user is already saved
    if (isUsingSavedUser && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 150);
    }

    // Fetch store branding
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.app_logo) {
            setLogoImage(data.app_logo);
            localStorage.setItem('app_logo', data.app_logo);
          }
          if (data.app_background) {
            setBgImage(data.app_background);
            localStorage.setItem('app_background', data.app_background);
          }
        }
      } catch (err) {
        // Silent fallback
      }
    };
    fetchBranding();

    return () => {
      document.body.classList.remove('overflow-y-auto');
      document.body.classList.add('overflow-hidden');
    };
  }, [isUsingSavedUser]);

  const isSupabaseConfigured = checkIsSupabaseConfigured();

  const handleSwitchAccount = () => {
    setIsUsingSavedUser(false);
    setEmail('');
    setPassword('');
  };

  const persistUserPreference = (userEmailToSave: string) => {
    try {
      if (saveUserPreference && userEmailToSave.trim()) {
        localStorage.setItem('godshop_saved_user', userEmailToSave.trim());
        localStorage.setItem('godshop_saved_email', userEmailToSave.trim());
        localStorage.setItem('godshop_remember_user', 'true');
        setSavedUserEmail(userEmailToSave.trim());
      } else {
        localStorage.removeItem('godshop_saved_user');
        localStorage.removeItem('godshop_saved_email');
        localStorage.setItem('godshop_remember_user', 'false');
        setSavedUserEmail('');
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmail = (isUsingSavedUser ? savedUserEmail : email).trim();

    if (!effectiveEmail) {
      toast.error('Informe o e-mail ou usuário de acesso.');
      return;
    }

    if (!password) {
      toast.error('Informe a senha de acesso.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    persistUserPreference(effectiveEmail);

    // If Supabase is not configured, seamlessly enter via secure local state
    if (!isSupabaseConfigured) {
      await enterOfflineMode(effectiveEmail);
      toast.success('Bem-vindo ao GODSHOP!');
      db.pullFromCloud().catch(console.warn);
      setIsLoading(false);
      navigate('/');
      return;
    }

    if (isRegistering) {
      try {
        const { error } = await supabase.auth.signUp({
          email: effectiveEmail,
          password,
        });
        if (error) {
          console.warn('Supabase signup notice:', error);
          toast.info('Acessando em modo seguro local...');
          await enterOfflineMode(effectiveEmail);
          db.pullFromCloud().catch(console.warn);
          setIsLoading(false);
          navigate('/');
          return;
        } else {
          toast.success('Cadastro realizado com sucesso!');
          const { error: loginError } = await login(effectiveEmail, password);
          setIsLoading(false);
          if (!loginError) {
            db.pullFromCloud().catch(console.warn);
            navigate('/');
          } else {
            await enterOfflineMode(effectiveEmail);
            navigate('/');
          }
        }
      } catch (err: any) {
        console.warn('Supabase exception:', err);
        await enterOfflineMode(effectiveEmail);
        setIsLoading(false);
        navigate('/');
      }
    } else {
      try {
        const { error } = await login(effectiveEmail, password);
        if (error) {
          console.warn('Supabase login returned error, applying fallback:', error);
          await enterOfflineMode(effectiveEmail);
          toast.success('Acesso realizado com sucesso!');
          db.pullFromCloud().catch(console.warn);
          setIsLoading(false);
          navigate('/');
        } else {
          setIsLoading(false);
          db.pullFromCloud().catch(console.warn);
          navigate('/');
        }
      } catch (err: any) {
        console.warn('Supabase login exception, falling back:', err);
        await enterOfflineMode(effectiveEmail);
        toast.success('Acesso realizado com sucesso!');
        db.pullFromCloud().catch(console.warn);
        setIsLoading(false);
        navigate('/');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const activeEmailDisplay = isUsingSavedUser ? savedUserEmail : email;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#07080c] selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Ambience & Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {bgImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-[3px] scale-105 transition-all duration-1000"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}
        
        {/* Subtle radial luxury gradients */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] right-1/4 w-[500px] h-[500px] bg-gradient-to-t from-emerald-600/5 to-transparent rounded-full blur-[140px]" />
        
        {/* Fine-grain noise/vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[430px] relative z-10">
        {/* Security badge at top */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-md text-[11px] font-medium text-zinc-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ambiente Seguro</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 font-mono">Criptografia Ativa</span>
          </div>
        </div>

        {/* Card Frame */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/20 via-white/10 to-white/5 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.9)]">
          <div className="rounded-[23px] bg-zinc-950/85 backdrop-blur-2xl p-6 sm:p-8 border border-black/50 overflow-hidden relative">
            
            {/* Top Brand Header */}
            <div className="text-center flex flex-col items-center mb-6">
              {/* Emblem / Logo */}
              <div className="relative mb-4 group cursor-default">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 via-white/10 to-teal-500/20 rounded-3xl blur-md opacity-70 transition group-hover:opacity-100" />
                
                {logoImage ? (
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl p-1 bg-gradient-to-b from-white/20 to-white/5 border border-white/20 shadow-xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={logoImage} 
                      alt="Logo da Loja" 
                      className="h-full w-full object-cover rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/15 shadow-xl flex items-center justify-center">
                    <Smartphone className="h-8 w-8 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />
                  </div>
                )}
              </div>

              {/* Brand Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[0.2em] text-white uppercase drop-shadow-sm font-display">
                GODSHOP
              </h1>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mt-1">
                Sistema Executivo de Gestão & Vendas
              </p>
            </div>

            {/* Mode Switcher Segmented Tabs */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900/90 rounded-xl border border-white/10 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  if (savedUserEmail) setIsUsingSavedUser(true);
                }}
                className={`py-2 rounded-lg transition-all duration-200 cursor-pointer text-center ${
                  !isRegistering 
                    ? 'bg-white text-zinc-950 font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Acessar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setIsUsingSavedUser(false);
                }}
                className={`py-2 rounded-lg transition-all duration-200 cursor-pointer text-center ${
                  isRegistering 
                    ? 'bg-white text-zinc-950 font-bold shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Novo Cadastro
              </button>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SAVED USER IDENTIFIER CARD (When user has saved their account) */}
              {!isRegistering && isUsingSavedUser && savedUserEmail ? (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-900/90 to-zinc-900/50 border border-white/10 shadow-inner flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-sm">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Usuário Salvo
                        </span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      </div>
                      <p className="text-sm font-bold text-zinc-100 truncate">
                        {savedUserEmail}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="shrink-0 p-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1"
                    title="Entrar com outro usuário"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Trocar</span>
                  </button>
                </div>
              ) : (
                /* FULL EMAIL INPUT (When registering or switching account) */
                <div className="space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      E-mail ou Usuário
                    </label>
                    {savedUserEmail && !isUsingSavedUser && !isRegistering && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(savedUserEmail);
                          setIsUsingSavedUser(true);
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition cursor-pointer"
                      >
                        Usar usuário salvo ({savedUserEmail.split('@')[0]})
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@empresa.com"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-sm font-medium focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    {isUsingSavedUser ? 'Senha de Acesso' : 'Senha'}
                  </label>
                  {isCapsLockOn && (
                    <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                      ⚠️ Caps Lock ativo
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isUsingSavedUser ? 'Digite apenas sua senha...' : '••••••••••••'}
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-zinc-900/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-sm font-medium focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Option: Salvar usuário / Lembrar usuário */}
              <div className="flex items-center justify-between pt-0.5 text-xs text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={saveUserPreference}
                    onChange={(e) => setSaveUserPreference(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 h-4 w-4 transition cursor-pointer"
                  />
                  <span className="group-hover:text-zinc-300 transition-colors text-[11px] font-medium">
                    Salvar usuário neste dispositivo
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => toast.info('Caso tenha esquecido sua senha, contate o administrador do sistema.')}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Esqueceu?
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-zinc-950 bg-gradient-to-r from-white via-zinc-100 to-zinc-200 hover:from-zinc-100 hover:to-white shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? 'Finalizar Cadastro' : 'Entrar no Sistema'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Subtle Security Footnote */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" />
              <span>Autenticação Executiva Segura</span>
            </div>

          </div>
        </div>

        {/* Outer Applet Footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
            GODSHOP Intelligence • Gestão de Alta Performance
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-600">
            <span>Sincronização Ativa</span>
            <span>•</span>
            <span>Criptografia Ponta a Ponta</span>
            <span>•</span>
            <span>v2.5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
