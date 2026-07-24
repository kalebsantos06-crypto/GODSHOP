import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Smartphone, ShoppingCart, Users, Truck, FileText, 
  Settings as SettingsIcon, Receipt, Gamepad2, Sun, Moon, ChevronUp, 
  User, LogIn, LogOut, X, Download, Eye, EyeOff, Tv,
  Bell, AlertCircle, AlertTriangle, Calendar, MessageSquare, ExternalLink, Check, DollarSign, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';
import { db } from '../services/db';
import { useQuery } from '@tanstack/react-query';
import { parseLocalDate } from '../lib/dateUtils';
import { addDays, addMonths, startOfDay, differenceInDays, format } from 'date-fns';
import { formatBRL } from '../lib/formatCurrency';

interface NotificationItem {
  id: string;
  clientName: string;
  clientPhone: string;
  itemName: string;
  installmentIndex: number;
  expectedAmount: number;
  dueDate: Date;
  status: 'fully_paid' | 'pending';
  daysDiff: number;
  saleId: string;
  saleData: any;
  clientData: any;
  iphoneData: any;
  consoleData: any;
}

export default function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const { user, login, signUp, logout, isAuthenticated, isOfflineMode } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Notifications state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'recent' | 'all'>('recent');
  const [activeFloatingNotif, setActiveFloatingNotif] = useState<NotificationItem | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('godshop_notif_force_enabled') === 'true') {
        return 'granted';
      }
      if ('Notification' in window) {
        return Notification.permission;
      }
    }
    return 'default';
  });
  const [isNotifGuideOpen, setIsNotifGuideOpen] = useState(false);

  // Fetch data for notifications
  const { data: salesList = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
    enabled: isAuthenticated
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
    enabled: isAuthenticated
  });

  const { data: iphonesList = [] } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
    enabled: isAuthenticated
  });

  const { data: consolesList = [] } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
    enabled: isAuthenticated
  });

  // Installment helpers
  const getInstallmentDate = (sale: any, index: number) => {
    const baseDate = sale.first_installment_date ? parseLocalDate(sale.first_installment_date) : parseLocalDate(sale.sale_date);
    const intervalMultiplier = sale.first_installment_date ? (index - 1) : index;
    if (sale.installment_frequency === 'Semanal') {
      return addDays(baseDate, intervalMultiplier * 7);
    } else if (sale.installment_frequency === 'Quinzenal') {
      return addDays(baseDate, intervalMultiplier * 15);
    } else {
      return addMonths(baseDate, intervalMultiplier);
    }
  };

  const getCalculatedInstallments = (
    sale: any,
    customPayments: { [key: number]: number }
  ) => {
    if (!sale) return [];
    const totalAmount = sale.sell_price - (sale.down_payment || 0);
    const baseInstCount = sale.installments || 1;

    const list: {
      index: number;
      expectedAmount: number;
      paidAmount: number;
      dueDate: Date;
      status: 'fully_paid' | 'pending';
    }[] = [];
    
    let totalPaid = 0;
    const paidIndices: number[] = [];
    const unpaidIndices: number[] = [];

    for (let i = 1; i <= baseInstCount; i++) {
      const p = customPayments[i] || 0;
      if (p > 0.005) {
        totalPaid += p;
        paidIndices.push(i);
      } else {
        unpaidIndices.push(i);
      }
    }

    let remainingUnpaid = totalAmount - totalPaid;
    let extraIndex = baseInstCount + 1;
    while (true) {
      const p = customPayments[extraIndex] || 0;
      if (p > 0.005) {
        totalPaid += p;
        remainingUnpaid = totalAmount - totalPaid;
        paidIndices.push(extraIndex);
        extraIndex++;
      } else {
        break;
      }
    }

    if (remainingUnpaid > 0.01 && unpaidIndices.length === 0) {
      unpaidIndices.push(extraIndex);
    }

    const allIndices = Array.from(new Set([...paidIndices, ...unpaidIndices])).sort((a, b) => a - b);

    if (unpaidIndices.length > 0) {
      const expectedPerUnpaid = Number((remainingUnpaid / unpaidIndices.length).toFixed(2));
      const totalPaidExpected = paidIndices.reduce((sum, idx) => sum + (customPayments[idx] || 0), 0);
      const countExceptLast = unpaidIndices.length - 1;
      const sumExceptLast = countExceptLast * expectedPerUnpaid;
      const lastUnpaidIndex = unpaidIndices[unpaidIndices.length - 1];
      const lastExpected = Number((totalAmount - totalPaidExpected - sumExceptLast).toFixed(2));
      
      const expectedMap: { [key: number]: number } = {};
      for (const idx of paidIndices) {
        expectedMap[idx] = customPayments[idx] || 0;
      }
      for (let i = 0; i < unpaidIndices.length - 1; i++) {
        expectedMap[unpaidIndices[i]] = expectedPerUnpaid;
      }
      expectedMap[lastUnpaidIndex] = lastExpected;

      for (const idx of allIndices) {
        const isPaid = paidIndices.includes(idx);
        const paidVal = customPayments[idx] || 0;
        const expectedVal = expectedMap[idx];

        list.push({
          index: idx,
          expectedAmount: expectedVal,
          paidAmount: paidVal,
          dueDate: getInstallmentDate(sale, idx),
          status: isPaid ? 'fully_paid' : 'pending'
        });
      }
    } else {
      for (const idx of allIndices) {
        const paidVal = customPayments[idx] || 0;
        list.push({
          index: idx,
          expectedAmount: paidVal,
          paidAmount: paidVal,
          dueDate: getInstallmentDate(sale, idx),
          status: 'fully_paid'
        });
      }
    }

    return list;
  };

  // Compile notifications list
  const notifications: NotificationItem[] = [];
  
  if (isAuthenticated && salesList && salesList.length > 0) {
    const today = startOfDay(new Date());
    
    for (const sale of salesList) {
      if (!sale.installments || sale.installments <= 1) continue;
      
      let customPayments: { [key: number]: number } = {};
      try {
        const stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (stored) {
          customPayments = JSON.parse(stored);
        } else {
          const instAmount = Number(((sale.sell_price - (sale.down_payment || 0)) / sale.installments).toFixed(2));
          for (let i = 1; i <= sale.installments; i++) {
            customPayments[i] = i <= (sale.installments_paid || 0) ? instAmount : 0;
          }
        }
      } catch (e) {
        console.error('Error parsing custom payments:', e);
      }
      
      const calculatedList = getCalculatedInstallments(sale, customPayments);
      const client = clientsList.find((c: any) => c.id === sale.client_id);
      const iphone = iphonesList.find((p: any) => p.id === sale.iphone_id);
      const consoleObj = consolesList.find((p: any) => p.id === sale.console_id);
      
      const categoryName = consoleObj ? (consoleObj.category === 'tv' ? 'TV' : (consoleObj.category === 'rice_cooker' ? 'Panela Elétrica' : (consoleObj.category === 'outro' ? 'Eletro' : 'Console'))) : 'Aparelho';
      const itemName = iphone ? `${iphone.model} ${iphone.storage}` : (consoleObj ? `${categoryName} ${consoleObj.model} - ${consoleObj.version}` : 'Aparelho');
      
      for (const inst of calculatedList) {
        if (inst.status === 'pending') {
          const dueDay = startOfDay(inst.dueDate);
          const daysDiff = differenceInDays(dueDay, today);
          
          notifications.push({
            id: `${sale.id}_inst_${inst.index}`,
            clientName: client?.name || 'Cliente Sem Nome',
            clientPhone: client?.phone ? client.phone.replace(/\D/g, '') : '',
            itemName,
            installmentIndex: inst.index,
            expectedAmount: inst.expectedAmount,
            dueDate: inst.dueDate,
            status: inst.status,
            daysDiff,
            saleId: sale.id,
            saleData: sale,
            clientData: client,
            iphoneData: iphone,
            consoleData: consoleObj
          });
        }
      }
    }
  }

  // Filter notifications
  const recentNotifications = notifications.filter(n => n.daysDiff <= 3).sort((a, b) => a.daysDiff - b.daysDiff);
  const allNotifications = notifications.sort((a, b) => a.daysDiff - b.daysDiff);
  const badgeCount = recentNotifications.length;

  // Request native phone push permission
  const requestPushPermission = async () => {
    if (typeof window !== 'undefined') {
      // First try requesting native notification permission
      if ('Notification' in window) {
        try {
          const permission = await Notification.requestPermission();
          setNotifPermission(permission);
          if (permission === 'granted') {
            localStorage.setItem('godshop_notif_force_enabled', 'true');
            toast.success('Notificações nativas ativadas! 🔔');
            try {
              new Notification("GODSHOP Ativado ⚡", {
                body: "Você agora receberá alertas diretamente na barra de notificações do seu celular!",
                icon: logoImage || "/favicon.ico"
              });
            } catch (e) {
              console.log("Could not trigger initial notification: ", e);
            }
            return;
          }
        } catch (err) {
          console.error('Error requesting native permission:', err);
        }
      }

      // If native permission was denied, not supported, or failed (e.g. inside an iframe),
      // gracefully enable internal app notification system and save preference so they are never blocked.
      localStorage.setItem('godshop_notif_force_enabled', 'true');
      setNotifPermission('granted');
      toast.success('Notificações ativadas no sistema do aplicativo! 🔔');
    } else {
      toast.error('Este dispositivo/navegador não suporta notificações.');
    }
  };

  // Synchronize and trigger floating system-style reminders
  useEffect(() => {
    if (isAuthenticated && recentNotifications.length > 0) {
      // 1. Native OS notification bar triggers (runs once per new ID)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const alreadySent = JSON.parse(localStorage.getItem('godshop_sent_push_alerts') || '[]');
          const newSent = [...alreadySent];
          let updated = false;

          recentNotifications.forEach(n => {
            if (!alreadySent.includes(n.id)) {
              let msg = `A ${n.installmentIndex}ª parcela de ${formatBRL(n.expectedAmount)} do item ${n.itemName} `;
              if (n.daysDiff === 0) msg += "vence HOJE!";
              else if (n.daysDiff === 1) msg += "vence AMANHÃ!";
              else if (n.daysDiff === 2) msg += "vence em 2 dias!";
              else if (n.daysDiff === 3) msg += "vence em 3 dias!";
              else if (n.daysDiff === -1) msg += "venceu ONTEM!";
              else if (n.daysDiff === -2) msg += "venceu há 2 dias!";
              else if (n.daysDiff === -3) msg += "venceu há 3 dias!";
              else msg += `vence em ${n.daysDiff} dias!`;

              new Notification(`GODSHOP: ${n.clientName}`, {
                body: msg,
                icon: logoImage || "/favicon.ico",
                tag: n.id,
                requireInteraction: true
              });
              newSent.push(n.id);
              updated = true;
            }
          });

          if (updated) {
            localStorage.setItem('godshop_sent_push_alerts', JSON.stringify(newSent));
          }
        } catch (e) {
          console.error('Error triggering native push notification:', e);
        }
      }

      // 2. Beautiful floating system island popup on page load
      const sessionSeen = JSON.parse(sessionStorage.getItem('godshop_session_seen_alerts') || '[]');
      const firstUnseen = recentNotifications.find(n => !sessionSeen.includes(n.id));

      if (firstUnseen) {
        setActiveFloatingNotif(firstUnseen);
        sessionStorage.setItem('godshop_session_seen_alerts', JSON.stringify([...sessionSeen, firstUnseen.id]));

        // Plays a subtle chime if desired or simply auto dismisses after 12s
        const timer = setTimeout(() => {
          setActiveFloatingNotif(null);
        }, 12000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, recentNotifications.length]);
  
  const [bgImage, setBgImage] = useState<string>('/background.jpg');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [isNavBarVisible, setIsNavBarVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_nav_bar_visible');
    return saved !== 'false';
  });

  const toggleNavBar = () => {
    setIsNavBarVisible(prev => {
      const next = !prev;
      localStorage.setItem('app_nav_bar_visible', String(next));
      return next;
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      // Set local first as immediate state
      setBgImage(localStorage.getItem('app_background') || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop');
      setLogoImage(localStorage.getItem('app_logo') || null);

      try {
        const queryParams = user?.id ? `?userId=${user.id}` : '';
        const res = await fetch(`/api/settings${queryParams}`);
        if (res.ok) {
          const serverSettings = await res.json();
          if (serverSettings.app_background) {
            localStorage.setItem('app_background', serverSettings.app_background);
            setBgImage(serverSettings.app_background);
          }
          if (serverSettings.app_logo !== undefined) {
            if (serverSettings.app_logo) {
              localStorage.setItem('app_logo', serverSettings.app_logo);
              setLogoImage(serverSettings.app_logo);
            } else {
              localStorage.removeItem('app_logo');
              setLogoImage(null);
            }
          }
        }
      } catch (err) {
        console.error("Error loading settings from server:", err);
      }
    };

    loadSettings();
    window.addEventListener('settings_updated', loadSettings);
    return () => window.removeEventListener('settings_updated', loadSettings);
  }, [user?.id]);

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

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme', next);
      window.dispatchEvent(new Event('theme_changed'));
      return next;
    });
  };

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    const handleThemeChange = () => {
      const saved = localStorage.getItem('app_theme') as 'light' | 'dark';
      if (saved) {
        setTheme(saved);
      }
    };
    window.addEventListener('open_auth_modal', handleOpenAuth);
    window.addEventListener('theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('open_auth_modal', handleOpenAuth);
      window.removeEventListener('theme_changed', handleThemeChange);
    };
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Estoque', href: '/inventory', icon: Smartphone },
    { name: 'Eletrônicos', href: '/consoles', icon: Tv },
    { name: 'Vendas', href: '/sales', icon: ShoppingCart },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Fornecedores', href: '/suppliers', icon: Truck },
    { name: 'Notas Fiscais', href: '/invoices', icon: Receipt },
    { name: 'Tabela de Preços', href: '/prices', icon: FileText },
    { name: 'Usuários', href: '/users', icon: User },
  ];

  return (
    <div 
      className={cn(
        "flex flex-col h-[100dvh] overflow-hidden text-foreground font-sans transition-colors duration-500 relative",
        theme === 'dark' ? 'dark' : ''
      )}
    >
      {/* Real Smartphone-Style Floating Notification Banner */}
      {activeFloatingNotif && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[9999] animate-in slide-in-from-top-12 duration-500">
          <div className={cn(
            "p-4 rounded-2xl border shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all relative flex flex-col gap-3",
            theme === 'dark' 
              ? "bg-zinc-950/95 border-white/10 text-white" 
              : "bg-white/95 border-black/10 text-zinc-900 shadow-xl"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                  <Bell className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[10px] tracking-widest uppercase text-emerald-500">GODSHOP NOTIFICAÇÃO</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-500"></span>
                    <span className="text-[10px] text-muted-foreground font-medium">Agora mesmo</span>
                  </div>
                  <h5 className="font-bold text-sm">Lembrete de Vencimento!</h5>
                </div>
              </div>
              <button 
                onClick={() => setActiveFloatingNotif(null)}
                className="p-1 rounded-lg hover:bg-muted/15 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 opacity-60 hover:opacity-100" />
              </button>
            </div>

            <div className="space-y-1 pl-1">
              <p className="text-xs font-semibold">
                A <span className="text-emerald-500 font-bold">{activeFloatingNotif.installmentIndex}ª parcela</span> de <span className="font-bold underline decoration-emerald-500">{activeFloatingNotif.clientName}</span> está pendente!
              </p>
              <p className="text-[11px] text-muted-foreground">
                Item: {activeFloatingNotif.itemName} • Vence: <span className="font-bold text-amber-500">{
                  activeFloatingNotif.daysDiff === 0 ? "HOJE" : 
                  activeFloatingNotif.daysDiff === 1 ? "AMANHÃ" : 
                  activeFloatingNotif.daysDiff === 2 ? "EM 2 DIAS" : 
                  activeFloatingNotif.daysDiff === 3 ? "EM 3 DIAS" : 
                  activeFloatingNotif.daysDiff === -1 ? "ONTEM" : 
                  activeFloatingNotif.daysDiff === -2 ? "HÁ 2 DIAS" : 
                  activeFloatingNotif.daysDiff === -3 ? "HÁ 3 DIAS" : 
                  `há ${Math.abs(activeFloatingNotif.daysDiff)} dias`
                }</span>
              </p>
            </div>

            <div className="flex items-center justify-between bg-muted/30 px-3 py-2.5 rounded-xl border border-muted/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Cobrado</span>
              <span className="font-black text-emerald-500 text-lg">{formatBRL(activeFloatingNotif.expectedAmount)}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveFloatingNotif(null)}
                className="flex-1 py-2 text-xs font-semibold bg-muted/40 hover:bg-muted/60 rounded-xl border border-muted/20 transition cursor-pointer text-center"
              >
                Lembrar Depois
              </button>
              
              {activeFloatingNotif.clientPhone ? (
                <a
                  href={`https://api.whatsapp.com/send?phone=${activeFloatingNotif.clientPhone}&text=${encodeURIComponent(
                    `Olá, *${activeFloatingNotif.clientName}*! 😊 Passando para lembrar que a *${activeFloatingNotif.installmentIndex}ª Parcela* de *${formatBRL(activeFloatingNotif.expectedAmount)}* referente à compra do *${activeFloatingNotif.itemName}* ` +
                    (activeFloatingNotif.daysDiff === 0 ? "vence *HOJE*!" : activeFloatingNotif.daysDiff === 1 ? "vence *AMANHÃ*!" : activeFloatingNotif.daysDiff === 2 ? "vence em *2 DIAS*!" : activeFloatingNotif.daysDiff === 3 ? "vence em *3 DIAS*!" : activeFloatingNotif.daysDiff === -1 ? "venceu *ONTEM*. Caso já tenha pago, favor desconsiderar." : activeFloatingNotif.daysDiff === -2 ? "venceu há *2 DIAS*. Caso já tenha pago, favor desconsiderar." : activeFloatingNotif.daysDiff === -3 ? "venceu há *3 DIAS*. Caso já tenha pago, favor desconsiderar." : `venceu em ${format(activeFloatingNotif.dueDate, 'dd/MM/yyyy')}. Caso já tenha pago, favor desconsiderar.`) +
                    ` Se precisar do Pix da GODSHOP, estamos à disposição! 🤍`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setActiveFloatingNotif(null)}
                  className="flex-1 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition cursor-pointer text-center"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Cobrar WhatsApp
                </a>
              ) : (
                <span className="flex-1 py-2 text-xs font-bold bg-muted text-muted-foreground rounded-xl flex items-center justify-center gap-1 text-[10px] select-none">
                  Sem Telefone
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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
          {/* Notifications Bell & Dropdown */}
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={cn(
                  "p-1.5 sm:p-2 rounded-lg border transition-all shadow-xl group relative flex items-center justify-center cursor-pointer",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/10",
                  isNotifOpen ? "ring-2 ring-emerald-500/50" : ""
                )}
                title="Notificações de Parcelas"
              >
                <Bell className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 transition-transform", 
                  theme === 'dark' ? "text-white/80" : "text-black/80",
                  badgeCount > 0 ? "animate-wiggle" : ""
                )} />
                
                {/* Badge for active notifications */}
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                      {badgeCount}
                    </span>
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotifOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsNotifOpen(false)} 
                  />
                  <div className={cn(
                    "fixed left-4 right-4 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:w-96 sm:mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200",
                    theme === 'dark' 
                      ? "bg-zinc-950/95 border-white/10 text-white backdrop-blur-xl" 
                      : "bg-white/95 border-black/10 text-zinc-900 backdrop-blur-xl"
                  )}>
                    <div className="p-4 border-b border-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <h4 className="font-bold text-sm">Controle de Parcelas</h4>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        badgeCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                       )}>
                        {badgeCount} Alertas
                      </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-muted/30 text-xs">
                      <button
                        onClick={() => setNotifTab('recent')}
                        className={cn(
                          "flex-1 py-2 text-center font-semibold border-b-2 transition-colors cursor-pointer",
                          notifTab === 'recent'
                            ? "border-emerald-500 text-emerald-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Atrasadas / Recentes
                      </button>
                      <button
                        onClick={() => setNotifTab('all')}
                        className={cn(
                          "flex-1 py-2 text-center font-semibold border-b-2 transition-colors cursor-pointer",
                          notifTab === 'all'
                            ? "border-emerald-500 text-emerald-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Pendentes ({allNotifications.length})
                      </button>
                    </div>

                    {/* Native system notification prompt (Compact Horizontal Design) */}
                    {notifPermission !== 'granted' && (
                      <div className="p-3 bg-emerald-500/5 border-b border-emerald-500/15 flex items-center justify-between gap-3 text-left">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <Bell className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                            Avisos no Celular
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                            Receba alertas de vencimento na barra do aparelho.
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={requestPushPermission}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black rounded-lg transition cursor-pointer shadow-sm uppercase tracking-wider text-center"
                          >
                            Ativar
                          </button>
                          <button
                            onClick={() => setIsNotifGuideOpen(true)}
                            className="text-[9px] text-emerald-500 hover:underline text-center cursor-pointer"
                          >
                            Ajuda?
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scrollable List */}
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-muted/15 custom-scrollbar">
                      {(notifTab === 'recent' ? recentNotifications : allNotifications).length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                          <Check className="h-8 w-8 text-emerald-500 mx-auto" />
                          <p className="font-medium">Nenhuma parcela pendente nesta lista!</p>
                          <p className="text-[10px] opacity-70">Bom trabalho! Seus recebimentos estão em dia.</p>
                        </div>
                      ) : (
                        (notifTab === 'recent' ? recentNotifications : allNotifications).map((item) => {
                          // Define friendly diff text
                          let diffLabel = '';
                          let diffClass = '';
                          
                          if (item.daysDiff === 0) {
                            diffLabel = 'Vence Hoje';
                            diffClass = 'bg-amber-500/10 text-amber-500 font-bold border-amber-500/20';
                          } else if (item.daysDiff === 1) {
                            diffLabel = 'Vence Amanhã';
                            diffClass = 'bg-blue-500/10 text-blue-500 font-medium border-blue-500/20';
                          } else if (item.daysDiff === 2) {
                            diffLabel = 'Vence em 2 dias';
                            diffClass = 'bg-blue-500/5 text-blue-400 border-blue-500/10';
                          } else if (item.daysDiff === 3) {
                            diffLabel = 'Vence em 3 dias';
                            diffClass = 'bg-blue-500/5 text-blue-400 border-blue-500/10';
                          } else if (item.daysDiff === -1) {
                            diffLabel = 'Venceu Ontem';
                            diffClass = 'bg-red-500/10 text-red-500 font-bold border-red-500/20 animate-pulse';
                          } else if (item.daysDiff === -2) {
                            diffLabel = 'Venceu há 2 dias';
                            diffClass = 'bg-red-500/10 text-red-500 font-bold border-red-500/20';
                          } else if (item.daysDiff === -3) {
                            diffLabel = 'Venceu há 3 dias';
                            diffClass = 'bg-red-500/10 text-red-500 font-bold border-red-500/20';
                          } else if (item.daysDiff < -3) {
                            diffLabel = `Atrasada há ${Math.abs(item.daysDiff)} dias`;
                            diffClass = 'bg-rose-500/10 text-rose-500 font-bold border-rose-500/20';
                          } else {
                            diffLabel = `Vence em ${item.daysDiff} dias`;
                            diffClass = 'bg-neutral-500/10 text-neutral-400 border-neutral-500/15';
                          }

                          return (
                            <div key={item.id} className="p-3.5 hover:bg-muted/10 transition-colors space-y-2 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="font-bold flex items-center gap-1">
                                    <span className="truncate block">{item.clientName}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                                    <span className="truncate">{item.itemName}</span>
                                    <span>•</span>
                                    <span className="font-medium shrink-0">{item.installmentIndex}ª Parc.</span>
                                  </div>
                                </div>
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0", diffClass)}>
                                  {diffLabel}
                                </span>
                              </div>

                              <div className="flex items-center justify-between bg-muted/25 p-2 rounded-lg border border-muted/30">
                                <span className="text-muted-foreground text-[10px]">VALOR DA PARCELA</span>
                                <span className="font-black text-emerald-500 text-sm">{formatBRL(item.expectedAmount)}</span>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1">
                                {item.clientPhone ? (
                                  <a
                                    href={`https://api.whatsapp.com/send?phone=${item.clientPhone}&text=${encodeURIComponent(
                                      `Olá, *${item.clientName}*! 😊 Passando para lembrar que a *${item.installmentIndex}ª Parcela* de *${formatBRL(item.expectedAmount)}* referente à compra do *${item.itemName}* ` +
                                      (item.daysDiff === 0 ? "vence *HOJE*!" : item.daysDiff === 1 ? "vence *AMANHÃ*!" : item.daysDiff === 2 ? "vence em *2 DIAS*!" : item.daysDiff === 3 ? "vence em *3 DIAS*!" : item.daysDiff === -1 ? "venceu *ONTEM*. Caso já tenha pago, favor desconsiderar." : item.daysDiff === -2 ? "venceu há *2 DIAS*. Caso já tenha pago, favor desconsiderar." : item.daysDiff === -3 ? "venceu há *3 DIAS*. Caso já tenha pago, favor desconsiderar." : `venceu em ${format(item.dueDate, 'dd/MM/yyyy')}. Caso já tenha pago, favor desconsiderar.`) +
                                      ` Se precisar do Pix da GODSHOP, estamos à disposição! 🤍`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Cobrar WhatsApp
                                  </a>
                                ) : (
                                  <span className="flex-1 py-1.5 px-2 bg-muted text-muted-foreground font-bold rounded-lg flex items-center justify-center gap-1 text-[10px] select-none">
                                    Sem Telefone
                                  </span>
                                )}
                                
                                <Link
                                  to="/sales"
                                  onClick={() => setIsNotifOpen(false)}
                                  className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg flex items-center justify-center gap-1 transition border border-zinc-700"
                                  title="Ver na página de Vendas"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="p-3 bg-muted/20 border-t border-muted/50 text-center">
                      <Link
                        to="/sales"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[10px] font-black text-emerald-500 hover:underline"
                      >
                        ABRIR TELA DE VENDAS & CARNÊS →
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={toggleNavBar}
            className={cn(
              "p-1.5 sm:p-2 rounded-lg border transition-all shadow-xl group cursor-pointer",
              theme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-black/5 hover:bg-black/10 border-black/10"
            )}
            title={isNavBarVisible ? 'Ocultar Barra de Funções' : 'Mostrar Barra de Funções'}
          >
            {isNavBarVisible ? (
              <EyeOff className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform", theme === 'dark' ? "text-white/80" : "text-black/80")} />
            ) : (
              <Eye className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform", theme === 'dark' ? "text-white/80" : "text-black/80")} />
            )}
          </button>

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all shadow-xl group cursor-pointer",
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
        <div className={cn(
          "max-w-6xl mx-auto animate-fade-in sm:pb-6",
          isNavBarVisible ? "pb-24" : "pb-12"
        )}>
          {isOfflineMode && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 text-sm flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span><strong>Modo Offline Ativo:</strong> Você está trabalhando com dados locais salvos no seu navegador. Os dados serão sincronizados quando a conexão for reestabelecida.</span>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={cn(
            "fixed right-6 z-[60] p-3 rounded-full shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
            isNavBarVisible ? "bottom-24" : "bottom-6",
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
      {isNavBarVisible ? (
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
      ) : null}

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
                    <div className="relative">
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full p-3 pr-10 rounded-xl border dark:bg-white/5 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showAuthPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
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

      {/* Notification Guide Modal */}
      {isNotifGuideOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsNotifGuideOpen(false)}
          />
          
          <div className={cn(
            "relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 overflow-hidden transition-all duration-300 animate-in zoom-in-95 max-h-[90vh] flex flex-col",
            theme === 'dark' 
              ? "bg-zinc-900 border-white/10 text-white" 
              : "bg-white border-black/10 text-zinc-900"
          )}>
            <button
              onClick={() => setIsNotifGuideOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X className="h-5 w-5 opacity-70" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Bell className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">Como Ativar Notificações</h3>
                <p className="text-xs opacity-60">Siga as instruções para liberar alertas no seu celular</p>
              </div>
            </div>

            {/* Check if inside iframe warning */}
            {typeof window !== 'undefined' && window.self !== window.top && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 text-left flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 text-amber-400">Aviso: Painel de Testes do Sistema (Iframe)</strong>
                  Você está visualizando o app em uma janela simulada de desenvolvimento. Navegadores bloqueiam solicitações de notificação por segurança aqui.
                  <button 
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                    }}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black rounded-lg transition cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    ABRIR EM NOVA ABA (CELULAR / PC)
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-left custom-scrollbar text-sm">
              <div className="border-b dark:border-white/10 border-black/10 pb-4">
                <h4 className="font-bold text-emerald-500 flex items-center gap-1.5 mb-2">
                  <Smartphone className="h-4 w-4" /> 
                  Celular Android (Chrome, Samsung Internet)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-xs opacity-90">
                  <li>No topo direito do navegador, toque nos <strong>três pontinhos (Menu)</strong>.</li>
                  <li>Vá em <strong>Configurações</strong> e procure por <strong>Configurações do site</strong>.</li>
                  <li>Toque em <strong>Notificações</strong>.</li>
                  <li>Se estiver em "Bloqueado", altere para "Permitido". Se houver uma lista de sites, procure por este link e clique em <strong>Permitir Notificações</strong>.</li>
                </ol>
              </div>

              <div className="border-b dark:border-white/10 border-black/10 pb-4">
                <h4 className="font-bold text-emerald-500 flex items-center gap-1.5 mb-2">
                  <User className="h-4 w-4" /> 
                  iPhone / iOS (Safari)
                </h4>
                <div className="space-y-2 text-xs opacity-90 pl-1">
                  <p>O iOS (sistema do iPhone) exige que você adicione o aplicativo à sua <strong>Tela de Início</strong> para permitir avisos nativos:</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>No Safari, toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com uma seta para cima na barra inferior).</li>
                    <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> (Add to Home Screen).</li>
                    <li>Abra o aplicativo através do novo ícone criado na tela de aplicativos do seu iPhone.</li>
                    <li>Abra o painel de notificações e toque em <strong>ATIVAR NOTIFICAÇÕES</strong> novamente.</li>
                  </ol>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-emerald-500 flex items-center gap-1.5 mb-2">
                  <SettingsIcon className="h-4 w-4" /> 
                  Computador (Chrome, Edge, Firefox)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-xs opacity-90">
                  <li>Na barra de endereços (onde fica o link), clique no <strong>ícone de cadeado</strong> que fica do lado esquerdo do endereço.</li>
                  <li>Ative a opção de <strong>Notificações</strong> (mude para "Permitir").</li>
                  <li>Atualize a página do aplicativo e clique em <strong>ATIVAR NOTIFICAÇÕES</strong> novamente.</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t dark:border-white/10 border-black/10 flex justify-end">
              <button
                onClick={() => setIsNotifGuideOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
