import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, ShoppingCart, Users, Truck, FileText, Settings as SettingsIcon, Receipt, Gamepad2, Sun, Moon, ChevronUp, User, LogIn, LogOut, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';

export default function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const { user, login, signUp, logout, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [bgImage, setBgImage] = useState<string>('/background.jpg');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    const loadSettings = () => {
      setBgImage(localStorage.getItem('app_background') || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop');
      setLogoImage(localStorage.getItem('app_logo') || null);
    };

    loadSettings();
    window.addEventListener('settings_updated', loadSettings);
    return () => window.removeEventListener('settings_updated', loadSettings);
  }, []);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setShowScrollTop(mainRef.current.scrollTop > 300);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Estoque', href: '/inventory', icon: Smartphone },
    { name: 'Consoles', href: '/consoles', icon: Gamepad2 },
    { name: 'Vendas', href: '/sales', icon: ShoppingCart },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Fornecedores', href: '/suppliers', icon: Truck },
    { name: 'Notas Fiscais', href: '/invoices', icon: Receipt },
    { name: 'Tabela de Preços', href: '/prices', icon: FileText },
  ];

  return (
    <div 
      className={cn(
        "flex flex-col h-[100dvh] overflow-hidden text-foreground font-sans transition-colors duration-500 relative",
        theme === 'dark' ? 'dark' : ''
      )}
    >
      {/* Fixed Background Layer to avoid bg-fixed mobile issues */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, ${theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}, ${theme === 'dark' ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.9)'}), url(${bgImage})`,
        }}
      />

      {/* Metallic Glow Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-30 mix-blend-screen z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-white/5 blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className={cn(
        "backdrop-blur-2xl border-b flex items-center px-4 sm:px-6 py-3 shrink-0 z-50 shadow-2xl transition-colors duration-500",
        theme === 'dark' ? "bg-background/20 border-white/5" : "bg-white/40 border-black/5"
      )}>
        <div className="flex-1 flex items-center gap-2">
          {/* Left side spacer */}
        </div>
        
        <div className="flex-none flex items-center justify-center py-2 gap-2 sm:gap-4 max-w-[70%] sm:max-w-none">
          <div className="flex items-center gap-2 sm:gap-5 group cursor-default">
            {logoImage ? (
              <div className="relative shrink-0">
                <div className={cn(
                  "absolute -inset-1 rounded-lg sm:rounded-2xl blur-[3px] opacity-60",
                  theme === 'dark' ? "bg-gradient-to-b from-white/40 to-transparent" : "bg-gradient-to-b from-black/20 to-transparent"
                )}></div>
                <img 
                  src={logoImage} 
                  alt="Logo" 
                  className={cn(
                    "relative h-10 w-10 sm:h-24 sm:w-24 object-cover rounded-lg sm:rounded-2xl shadow-2xl border-2 transition-all duration-500 group-hover:scale-105",
                    theme === 'dark' ? "border-white/30" : "border-black/15"
                  )} 
                />
              </div>
            ) : (
              <div className={cn(
                "p-2 sm:p-5 rounded-lg sm:rounded-2xl border-2 shadow-inner shrink-0 transition-all duration-500 group-hover:scale-105",
                theme === 'dark' ? "bg-white/5 border-white/20" : "bg-black/5 border-black/15"
              )}>
                <Smartphone className={cn("h-6 w-6 sm:h-14 sm:w-14", theme === 'dark' ? "text-white/90" : "text-black/90")} />
              </div>
            )}
            <div className="flex flex-col items-center min-w-0">
              <h1 className="text-xl sm:text-6xl tracking-[0.15em] sm:tracking-[0.2em] leading-none flex items-baseline truncate">
                <span className={cn(
                  "font-black transition-all duration-500 group-hover:tracking-[0.2em]",
                  theme === 'dark' ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "text-black drop-shadow-[0_0_15px_rgba(0,0,0,0.15)]"
                )}>
                  GOD
                </span>
                <span className={cn("font-thin ml-1 transition-colors", theme === 'dark' ? "text-white/80" : "text-black/70")}>
                  SHOP
                </span>
              </h1>
              <div className={cn(
                "h-[2px] w-full mt-1.5 sm:mt-3 transition-all duration-700 group-hover:w-[120%]",
                theme === 'dark' ? "bg-gradient-to-r from-transparent via-white/50 to-transparent" : "bg-gradient-to-r from-transparent via-black/30 to-transparent"
              )}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-end items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-lg border transition-all shadow-xl group",
              theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/10"
            )}
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-white/80 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-black/80 group-hover:-rotate-12 transition-transform" />
            )}
          </button>
          
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all shadow-xl group",
              theme === 'dark'
                ? (isAuthenticated ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80")
                : (isAuthenticated ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-600 hover:bg-emerald-500/10" : "bg-black/5 hover:bg-black/10 border-black/10 text-black/80")
            )}
            title={isAuthenticated ? `Conectado: ${user?.email}` : "Entrar ou Sincronizar Nuvem"}
          >
            {isAuthenticated ? (
              <User className="h-4 w-4 text-emerald-400" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isAuthenticated ? "Minha Conta" : "Sincronizar"}
            </span>
          </button>

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all shadow-xl group",
              theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/80" : "bg-black/5 hover:bg-black/10 border-black/10 text-black/80"
            )}
            title="Configurações"
          >
            <SettingsIcon className="h-4 w-4 sm:h-4 sm:w-4 group-hover:rotate-90 transition-transform duration-500" />
            <span className="hidden sm:inline">Ajustes</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 touch-pan-y scroll-smooth custom-scrollbar"
      >
        <div className="max-w-6xl mx-auto pb-24 sm:pb-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-24 right-6 z-[60] p-3 rounded-full shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
            theme === 'dark'
              ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/10"
              : "bg-black/10 text-slate-900 hover:bg-black/20 backdrop-blur-md border border-black/5"
          )}
          title="Voltar ao topo"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav className={cn(
        "backdrop-blur-3xl border-t shrink-0 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-colors duration-500",
        theme === 'dark' ? "bg-background/10 border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" : "bg-white/60 border-black/5"
      )}>
        <div className="flex items-center justify-start md:justify-center overflow-x-auto px-2 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-1 sm:gap-3 min-w-max mx-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 min-w-[76px] sm:min-w-[96px] p-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 relative group",
                    isActive 
                      ? (theme === 'dark' ? "text-white scale-105" : "text-black scale-105")
                      : (theme === 'dark' ? "text-white/40 hover:text-white/70" : "text-black/40 hover:text-black/70")
                  )}
                >
                  {isActive && (
                    <div className={cn(
                      "absolute inset-0 rounded-xl blur-[2px] border shadow-inner transition-colors",
                      theme === 'dark' ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10"
                    )}></div>
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 relative z-10 transition-all",
                    isActive 
                      ? (theme === 'dark' ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]") 
                      : "opacity-70"
                  )} />
                  <span className="text-center leading-tight tracking-wide relative z-10">{item.name}</span>
                  {isActive && (
                    <div className={cn(
                      "absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-colors",
                      theme === 'dark' ? "bg-white shadow-[0_0_8px_white]" : "bg-black shadow-[0_0_8px_black]"
                    )}></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Account / Sync Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => {
              if (!authLoading) setIsAuthModalOpen(false);
            }}
          />
          
          <div className={cn(
            "relative w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden transition-all duration-300 animate-in zoom-in-95",
            theme === 'dark' 
              ? "bg-zinc-900 border-white/10 text-white" 
              : "bg-white border-black/10 text-zinc-900"
          )}>
            <button
              onClick={() => setIsAuthModalOpen(false)}
              disabled={authLoading}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition"
            >
              <X className="h-5 w-5 opacity-70" />
            </button>

            {isAuthenticated ? (
              <div className="flex flex-col items-center text-center py-4">
                <div className="p-4 bg-emerald-500/10 rounded-full mb-4 border border-emerald-500/20">
                  <User className="h-10 w-10 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-1">Backup na Nuvem Ativo</h3>
                <p className="text-sm opacity-70 mb-5">Seus dados e relatórios estão salvos de forma segura.</p>
                
                <div className="w-full text-left p-3 rounded-xl mb-6 text-xs font-mono break-all dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                  <span className="opacity-50 block mb-0.5 text-[10px]">EMAIL VINCULADO</span>
                  {user?.email}
                </div>

                <button
                  onClick={async () => {
                    setAuthLoading(true);
                    try {
                      await logout();
                      toast.success('Desconectado com sucesso!');
                      setIsAuthModalOpen(false);
                    } catch (e) {
                      toast.error('Erro ao desconectar.');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold mb-1 text-center">
                  {isSignUpMode ? 'Criar Nova Conta' : 'Sincronizar Cloud'}
                </h3>
                <p className="text-xs opacity-60 text-center mb-6">
                  {isSignUpMode 
                    ? 'Registre-se para salvar seus preços, clientes e notas com segurança na nuvem.' 
                    : 'Acesse de qualquer lugar e recupere seus clientes, vendas e tabela de preços.'}
                </p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!authEmail || !authPassword) {
                    toast.error('Por favor, preencha todos os campos!');
                    return;
                  }
                  setAuthLoading(true);
                  try {
                    let result;
                    if (isSignUpMode) {
                      result = await signUp(authEmail, authPassword);
                      if (result.error) throw result.error;
                      toast.success('Conta criada e sincronizada com sucesso!');
                    } else {
                      result = await login(authEmail, authPassword);
                      if (result.error) throw result.error;
                      toast.success('Login efetuado e banco de dados sincronizado!');
                    }
                    setIsAuthModalOpen(false);
                    // Force refresh queries
                    window.location.reload();
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || 'Erro ao processar requisição.');
                  } finally {
                    setAuthLoading(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      required
                      className="w-full p-3 rounded-xl border dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 opacity-70 uppercase tracking-wider">Senha</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full p-3 rounded-xl border dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition duration-200 mt-2"
                  >
                    {authLoading ? 'Processando...' : (isSignUpMode ? 'Cadastrar e Conectar' : 'Entrar e Sincronizar')}
                  </button>
                </form>

                <div className="mt-5 text-center text-xs">
                  <button
                    onClick={() => setIsSignUpMode(!isSignUpMode)}
                    className="text-emerald-500 hover:underline font-bold"
                  >
                    {isSignUpMode ? 'Já tem uma conta? Fazer Login' : 'Não tem uma conta? Cadastre-se'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
