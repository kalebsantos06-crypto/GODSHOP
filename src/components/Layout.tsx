import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, ShoppingCart, Users, Truck, FileText, Settings as SettingsIcon, Receipt, Gamepad2 } from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();
  const { logout } = useAuth();
  
  const [bgImage, setBgImage] = useState<string>('/background.jpg');
  const [logoImage, setLogoImage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = () => {
      setBgImage(localStorage.getItem('app_background') || '/background.jpg');
      setLogoImage(localStorage.getItem('app_logo') || null);
    };

    loadSettings();
    window.addEventListener('settings_updated', loadSettings);
    return () => window.removeEventListener('settings_updated', loadSettings);
  }, []);

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
    <div className="dark flex flex-col h-screen bg-cover bg-center bg-no-repeat bg-fixed transition-all duration-500 text-foreground" style={{ backgroundImage: `url(${bgImage})`, backgroundColor: '#000' }}>
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center px-4 sm:px-6 py-3 shrink-0">
        <div className="flex-1"></div>
        
        <div className="flex items-center justify-center py-1 gap-2">
          <h1 className="text-xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            {logoImage ? (
              <img src={logoImage} alt="Logo" className="h-8 w-8 sm:h-14 sm:w-14 object-contain rounded-lg shadow-sm" />
            ) : (
              <Smartphone className="h-6 w-6 sm:h-10 sm:w-10" />
            )}
            GODSHOP
          </h1>
        </div>

        <div className="flex-1 flex justify-end">
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            title="Configurações"
          >
            <SettingsIcon className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-black/40 backdrop-blur-md border-t border-white/10 shrink-0">
        <div className="flex items-center justify-start md:justify-center overflow-x-auto px-2 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center gap-1 sm:gap-2 min-w-max mx-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                               (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 min-w-[76px] sm:min-w-[88px] p-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 sm:h-6 sm:w-6", isActive ? "text-primary" : "")} />
                  <span className="text-center leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
