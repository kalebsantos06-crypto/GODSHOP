import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, ShoppingCart, Users, Truck, FileText, Settings as SettingsIcon, Receipt, Gamepad2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();
  const { logout } = useAuth();
  
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
        
        <div className="flex-none flex items-center justify-center py-1 gap-1 sm:gap-3 max-w-[50%] sm:max-w-none">
          <div className="flex items-center gap-1.5 sm:gap-3 group cursor-default">
            {logoImage ? (
              <div className="relative shrink-0">
                <div className={cn(
                  "absolute -inset-0.5 rounded-lg sm:rounded-xl blur-[2px] opacity-50",
                  theme === 'dark' ? "bg-gradient-to-b from-white/40 to-transparent" : "bg-gradient-to-b from-black/20 to-transparent"
                )}></div>
                <img 
                  src={logoImage} 
                  alt="Logo" 
                  className={cn(
                    "relative h-7 w-7 sm:h-14 sm:w-14 object-cover rounded-lg sm:rounded-xl shadow-2xl border transition-colors",
                    theme === 'dark' ? "border-white/20" : "border-black/10"
                  )} 
                />
              </div>
            ) : (
              <div className={cn(
                "p-1 sm:p-3 rounded-lg sm:rounded-xl border shadow-inner shrink-0 transition-colors",
                theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
              )}>
                <Smartphone className={cn("h-4 w-4 sm:h-8 sm:w-8", theme === 'dark' ? "text-white/80" : "text-black/80")} />
              </div>
            )}
            <div className="flex flex-col items-center min-w-0">
              <h1 className="text-lg sm:text-4xl tracking-widest leading-none flex items-baseline truncate">
                <span className={cn(
                  "font-extrabold transition-colors",
                  theme === 'dark' ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-black drop-shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                )}>
                  GOD
                </span>
                <span className={cn("font-light ml-0.5 transition-colors", theme === 'dark' ? "text-white/70" : "text-black/60")}>
                  SHOP
                </span>
              </h1>
              <div className={cn(
                "h-[1px] w-full mt-1 sm:mt-1.5 transition-colors",
                theme === 'dark' ? "bg-gradient-to-r from-transparent via-white/40 to-transparent" : "bg-gradient-to-r from-transparent via-black/20 to-transparent"
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
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 overscroll-contain touch-pan-y scroll-smooth">
        <div className="max-w-6xl mx-auto pb-24 sm:pb-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

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
    </div>
  );
}
