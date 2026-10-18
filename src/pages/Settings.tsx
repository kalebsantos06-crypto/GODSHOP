import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, LogOut, Image as ImageIcon, Smartphone, Database, Download, FileJson, Search, 
  Trash2, Plus, Sun, Moon, Cloud, ShieldAlert, ShieldCheck, User, Users, UserCheck, LogIn, MessageSquare, Send, Play, 
  CheckCircle2, AlertTriangle, RefreshCw, Settings as SettingsIcon, FileText, Layers, Bot, ChevronRight, Check,
  Copy, ClipboardPaste, Sparkles, Folder, Eye, EyeOff, Share2, ExternalLink, Building2, CreditCard, MapPin, Lock, KeyRound,
  Mail, Phone, Shield, Activity, Power
} from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';
import { backupService } from '../services/backupService';
import { backgroundService } from '../services/backgroundService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { copyToClipboard, readFromClipboard, shareContent, getCustomAppDomain, setCustomAppDomain } from '../utils/url';
import { isSupabaseConfigured, setCustomSupabaseCredentials, supabase } from '../lib/supabase';
import { addDays, addMonths, startOfDay, differenceInDays, format } from 'date-fns';
import { parseLocalDate, getSaleNotifications } from '../lib/dateUtils';
import { DEFAULT_STATUS_TEMPLATES, dispatchWebhookMessage, WebhookProvider } from '../lib/whatsappUtils';
import { formatBRL } from '../lib/formatCurrency';
import { useSearchParams } from 'react-router-dom';

import { db } from '../services/db';
import StorageExplorer from '../components/StorageExplorer';

const DEFAULT_TEMPLATES = {
  days_3_before: "Olá, {cliente}! 😊 Aqui é a Karen, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nPassando para lembrar que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) vence no dia {vencimento}.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\nChave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves\n\nCaso já tenha realizado o pagamento, por favor desconsidere. Caso precise de ajuda, estamos à disposição! 🤍",
  day_of: "Olá, {cliente}! 😊 Aqui é a Karen, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nPassando para lembrar que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) vence hoje ({vencimento}).\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\nChave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves\n\nCaso já tenha realizado o pagamento, por favor desconsidere. Caso precise de ajuda, estamos à disposição! 🤍",
  overdue: "Olá, {cliente}! 😊 Aqui é a Karen, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nNotamos que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) venceu em {vencimento} e está pendente.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\nChave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves\n\nCaso já tenha realizado o pagamento, por favor desconsidere. Caso precise de ajuda, estamos aqui! 🤍"
};

export default function Settings() {
  const { logout, user, isAuthenticated, isOfflineMode } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isStorageExplorerOpen, setIsStorageExplorerOpen] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');
  const [isCopyingBackup, setIsCopyingBackup] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [showBackupCodeModal, setShowBackupCodeModal] = useState(false);
  const [backupJsonCode, setBackupJsonCode] = useState('');
  
  // Supabase credentials and Cloudflare domain configuration state
  const [supaUrlInput, setSupaUrlInput] = useState(() => localStorage.getItem('custom_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [supaKeyInput, setSupaKeyInput] = useState(() => localStorage.getItem('custom_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [customDomainInput, setCustomDomainInput] = useState(() => getCustomAppDomain() || '');
  const [showSupaKey, setShowSupaKey] = useState(false);
  const [isTestingSupa, setIsTestingSupa] = useState(false);
  const [isSavingSupa, setIsSavingSupa] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Live backup code validation memo
  const pasteValidation = useMemo(() => {
    if (!pasteJsonText.trim()) return null;
    return backupService.validateBackup(pasteJsonText);
  }, [pasteJsonText]);

  const [isBgRunning, setIsBgRunning] = useState(() => backgroundService.isBackgroundEnabled());

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error('Preencha a senha antiga, a nova senha e a confirmação.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('As novas senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // Verify old password against local credentials store
    try {
      const userEmail = user?.email || localStorage.getItem('godshop_saved_email') || 'admin@godshop.com';
      const credsStr = localStorage.getItem('godshop_credentials') || '{}';
      const creds = JSON.parse(credsStr);
      const normalizedEmail = userEmail.toLowerCase();
      if (creds[normalizedEmail] && creds[normalizedEmail] !== oldPassword) {
        toast.error('A senha antiga informada está incorreta.');
        return;
      }
    } catch (e) {}

    setIsChangingPassword(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          throw new Error(error.message);
        }
      }

      try {
        const userEmail = user?.email || localStorage.getItem('godshop_saved_email') || 'admin@godshop.com';
        const credsStr = localStorage.getItem('godshop_credentials') || '{}';
        const creds = JSON.parse(credsStr);
        creds[userEmail.toLowerCase()] = newPassword;
        localStorage.setItem('godshop_credentials', JSON.stringify(creds));
      } catch (e) {}

      toast.success('Senha alterada com sucesso!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('different from the old password')) {
        toast.error('A nova senha deve ser diferente da senha anterior.');
      } else {
        toast.error('Erro ao alterar senha: ' + (msg || err));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // User Profile registration state (fidelização cadastral)
  const [profileData, setProfileData] = useState(() => {
    try {
      const stored = localStorage.getItem('godshop_user_profile');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      fullName: localStorage.getItem('auto_attendant_name') || 'Kaleb dos Santos Gonçalves',
      storeName: 'GODSHOP',
      email: user?.email || localStorage.getItem('godshop_saved_email') || 'kalebsantos06@gmail.com',
      phone: localStorage.getItem('auto_store_phone') || '(32) 99963-4583',
      document: '130.369.426-37',
      role: 'Proprietário / Administrador',
      pixKey: '13036942637',
      cityState: 'Carangola - MG',
      registeredAt: new Date().toLocaleDateString('pt-BR')
    };
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // System users registry state
  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('godshop_system_users');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch {}
    const defaultUser = {
      id: user?.id || 'usr-master-admin',
      name: localStorage.getItem('auto_attendant_name') || 'Kaleb dos Santos Gonçalves',
      email: (user?.email || localStorage.getItem('godshop_saved_email') || 'kalebsantos06@gmail.com').toLowerCase(),
      phone: localStorage.getItem('auto_store_phone') || '(32) 99963-4583',
      role: 'Administrador',
      status: 'Ativo',
      created_at: new Date().toISOString()
    };
    try {
      localStorage.setItem('godshop_system_users', JSON.stringify([defaultUser]));
    } catch {}
    return [defaultUser];
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('Vendedor');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      localStorage.setItem('godshop_user_profile', JSON.stringify(profileData));
      
      if (profileData.fullName) {
        localStorage.setItem('auto_attendant_name', profileData.fullName);
        setAttendantName(profileData.fullName);
      }
      if (profileData.phone) {
        localStorage.setItem('auto_store_phone', profileData.phone);
        setStorePhone(profileData.phone);
      }
      if (profileData.pixKey) {
        const pixFormatted = `Chave Pix: ${profileData.pixKey}\nNome: ${profileData.fullName || 'GODSHOP'}`;
        localStorage.setItem('auto_pix_info', pixFormatted);
        setPixInfo(pixFormatted);
      }

      try {
        if (user?.id) {
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              settings: {
                user_profile: profileData,
                auto_attendant_name: profileData.fullName,
                auto_store_phone: profileData.phone
              }
            })
          }).catch(() => {});
        }
      } catch {}

      toast.success('Cadastro do usuário fidelizado e salvo com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar cadastro: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRegisterNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Nome e E-mail são obrigatórios.');
      return;
    }
    if (newUserPassword && newUserPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsAddingUser(true);
    try {
      const newUserRecord = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: newUserName.trim(),
        email: newUserEmail.toLowerCase().trim(),
        phone: newUserPhone.trim(),
        role: newUserRole,
        status: 'Ativo',
        created_at: new Date().toISOString()
      };

      const updated = [...registeredUsers, newUserRecord];
      setRegisteredUsers(updated);
      localStorage.setItem('godshop_system_users', JSON.stringify(updated));

      if (newUserPassword) {
        try {
          const credsStr = localStorage.getItem('godshop_credentials') || '{}';
          const creds = JSON.parse(credsStr);
          creds[newUserRecord.email] = newUserPassword;
          localStorage.setItem('godshop_credentials', JSON.stringify(creds));
        } catch {}
      }

      try {
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newUserRecord, password: newUserPassword })
        }).catch(() => {});
      } catch {}

      toast.success(`Usuário ${newUserRecord.name} cadastrado com sucesso!`);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserRole('Vendedor');
      setNewUserPassword('');
    } catch (err: any) {
      toast.error('Erro ao cadastrar usuário: ' + err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = (idToDelete: string, name: string) => {
    if (registeredUsers.length <= 1) {
      toast.error('Não é possível excluir o único usuário administrador.');
      return;
    }
    const filtered = registeredUsers.filter(u => u.id !== idToDelete);
    setRegisteredUsers(filtered);
    localStorage.setItem('godshop_system_users', JSON.stringify(filtered));
    toast.success(`Registro do usuário ${name} removido.`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });

  // Navigation tab for settings
  const [activeTab, setActiveTab] = useState<'geral' | 'usuario' | 'backup' | 'automacao'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'usuario') return 'usuario';
    if (tabParam === 'automacao') return 'automacao';
    if (tabParam === 'backup') return 'backup';
    return 'geral';
  });

  // Sync tab state when URL parameters change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'usuario') {
      setActiveTab('usuario');
    } else if (tabParam === 'automacao') {
      setActiveTab('automacao');
    } else if (tabParam === 'backup') {
      setActiveTab('backup');
    } else if (tabParam === 'geral') {
      setActiveTab('geral');
    }
  }, [searchParams]);

  // Automation states
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('auto_webhook_url') || '');
  const [webhookToken, setWebhookToken] = useState(() => localStorage.getItem('auto_webhook_token') || '');
  const [webhookProvider, setWebhookProvider] = useState<WebhookProvider>(() => (localStorage.getItem('auto_webhook_provider') as WebhookProvider) || 'custom');
  const [isWebhookEnabled, setIsWebhookEnabled] = useState(() => localStorage.getItem('auto_webhook_enabled') === 'true');
  const [isFullAutoEnabled, setIsFullAutoEnabled] = useState(() => localStorage.getItem('auto_full_auto_enabled') === 'true');
  const [template3Days, setTemplate3Days] = useState(() => localStorage.getItem('auto_template_3_days') || DEFAULT_TEMPLATES.days_3_before);
  const [templateDayOf, setTemplateDayOf] = useState(() => localStorage.getItem('auto_template_day_of') || DEFAULT_TEMPLATES.day_of);
  const [templateOverdue, setTemplateOverdue] = useState(() => localStorage.getItem('auto_template_overdue') || DEFAULT_TEMPLATES.overdue);

  // Status notification templates (8 Sequential Shipping Steps)
  const [templateRegistration, setTemplateRegistration] = useState(() => localStorage.getItem('auto_template_registration') || DEFAULT_STATUS_TEMPLATES.registration);
  const [templateClientRemoteConfirm, setTemplateClientRemoteConfirm] = useState(() => localStorage.getItem('auto_template_client_remote_confirmation') || DEFAULT_STATUS_TEMPLATES.client_remote_confirmation);
  const [templateOrderConfirmed, setTemplateOrderConfirmed] = useState(() => localStorage.getItem('auto_template_order_confirmed') || DEFAULT_STATUS_TEMPLATES.order_confirmed);
  const [templateOrderPreparing, setTemplateOrderPreparing] = useState(() => localStorage.getItem('auto_template_order_preparing') || DEFAULT_STATUS_TEMPLATES.order_preparing);
  const [templateOrderReady, setTemplateOrderReady] = useState(() => localStorage.getItem('auto_template_order_ready') || DEFAULT_STATUS_TEMPLATES.order_ready);
  const [templateOrderOnWay, setTemplateOrderOnWay] = useState(() => localStorage.getItem('auto_template_order_on_way') || DEFAULT_STATUS_TEMPLATES.order_on_way);
  const [templateOrderDelivered, setTemplateOrderDelivered] = useState(() => localStorage.getItem('auto_template_order_delivered') || DEFAULT_STATUS_TEMPLATES.order_delivered);
  const [templateGuaranteeSent, setTemplateGuaranteeSent] = useState(() => localStorage.getItem('auto_template_guarantee_sent') || DEFAULT_STATUS_TEMPLATES.guarantee_sent);
  const [templateOrderThankYou, setTemplateOrderThankYou] = useState(() => localStorage.getItem('auto_template_order_thank_you') || DEFAULT_STATUS_TEMPLATES.order_thank_you);

  // Attendant, Store Phone and Pix Configuration
  const [attendantName, setAttendantName] = useState(() => localStorage.getItem('auto_attendant_name') || 'Karen');
  const [storePhone, setStorePhone] = useState(() => localStorage.getItem('auto_store_phone') || '5532999634583');
  const [pixInfo, setPixInfo] = useState(() => localStorage.getItem('auto_pix_info') || 'Chave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves');

  // Sent logs history
  const [sentLogs, setSentLogs] = useState<{ id: string; clientName: string; itemName: string; installmentIndex: number; sentAt: string; status: 'success' | 'failed'; method: 'webhook' | 'whatsapp_web' }[]>(() => {
    try {
      const stored = localStorage.getItem('auto_sent_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [isSendingAll, setIsSendingAll] = useState(false);
  const [sendingStatuses, setSendingStatuses] = useState<{ [key: string]: 'idle' | 'sending' | 'success' | 'failed' }>({});
  const [cloudStats, setCloudStats] = useState<any>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const loadCloudStats = async () => {
    try {
      const stats = await db.getCloudStats();
      if (stats) setCloudStats(stats);
    } catch (e) {
      console.warn('Failed to load cloud stats:', e);
    }
  };

  useEffect(() => {
    loadCloudStats();
  }, [activeTab]);

  // Fetch queries to compile notifications
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

  // Real-time notifications for automated messaging dispatch
  const pendingNotifications = isAuthenticated 
    ? getSaleNotifications(salesList, clientsList, iphonesList, consolesList).filter(n => n.daysDiff <= 3) 
    : [];

  const saveAutomationSettings = async () => {
    localStorage.setItem('auto_webhook_url', webhookUrl);
    localStorage.setItem('auto_webhook_token', webhookToken);
    localStorage.setItem('auto_webhook_provider', webhookProvider);
    localStorage.setItem('auto_webhook_enabled', String(isWebhookEnabled));
    localStorage.setItem('auto_full_auto_enabled', String(isFullAutoEnabled));
    localStorage.setItem('auto_template_3_days', template3Days);
    localStorage.setItem('auto_template_day_of', templateDayOf);
    localStorage.setItem('auto_template_overdue', templateOverdue);
    localStorage.setItem('auto_template_registration', templateRegistration);
    localStorage.setItem('auto_template_client_remote_confirmation', templateClientRemoteConfirm);
    localStorage.setItem('auto_template_order_confirmed', templateOrderConfirmed);
    localStorage.setItem('auto_template_order_preparing', templateOrderPreparing);
    localStorage.setItem('auto_template_order_ready', templateOrderReady);
    localStorage.setItem('auto_template_order_on_way', templateOrderOnWay);
    localStorage.setItem('auto_template_order_delivered', templateOrderDelivered);
    localStorage.setItem('auto_template_guarantee_sent', templateGuaranteeSent);
    localStorage.setItem('auto_template_order_thank_you', templateOrderThankYou);
    localStorage.setItem('auto_attendant_name', attendantName);
    localStorage.setItem('auto_store_phone', storePhone);
    localStorage.setItem('auto_pix_info', pixInfo);

    // Sync to server
    if (user?.id) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            settings: {
              webhookUrl,
              webhookToken,
              webhookProvider,
              isWebhookEnabled,
              isFullAutoEnabled,
              template3Days,
              templateDayOf,
              templateOverdue,
              templateRegistration,
              templateClientRemoteConfirm,
              templateOrderConfirmed,
              templateOrderPreparing,
              templateOrderReady,
              templateOrderOnWay,
              templateOrderDelivered,
              templateGuaranteeSent,
              templateOrderThankYou,
              attendantName,
              storePhone,
              pixInfo
            }
          })
        });
      } catch (err) {
        console.warn('Could not sync automation settings to server, saved locally:', err);
      }
    }

    if (isWebhookEnabled && !webhookUrl.trim()) {
      toast.success('Configurações salvas! Nota: Insira a URL do Webhook ou use o modo WhatsApp Web.');
    } else if (isFullAutoEnabled && !isWebhookEnabled) {
      toast.success('Configurações salvas! A automação em 2º plano requer o Webhook ativado.');
    } else {
      toast.success('Configurações de automação salvas com sucesso! 🚀');
    }
  };

  const getMessageText = (item: any) => {
    let template = templateDayOf;
    if (item.daysDiff > 0) {
      template = template3Days;
    } else if (item.daysDiff < 0) {
      template = templateOverdue;
    }

    const dueDateObj = typeof item.dueDate === 'string' ? parseLocalDate(item.dueDate) : item.dueDate;
    const formattedDueDate = format(dueDateObj, 'dd/MM/yyyy');
    const absDays = Math.abs(item.daysDiff);

    let text = template
      .replace(/{cliente}/g, item.clientName)
      .replace(/{aparelho}/g, item.itemName)
      .replace(/{parcela}/g, String(item.installmentIndex))
      .replace(/{valor}/g, formatBRL(item.expectedAmount))
      .replace(/{vencimento}/g, formattedDueDate)
      .replace(/{dias_atraso}/g, String(absDays))
      .replace(/{dias}/g, String(absDays))
      .replace(/{atendente}/g, attendantName)
      .replace(/{pix}/g, pixInfo);

    // Handle legacy/hardcoded template strings dynamically if daysDiff is 1, 2, or 3
    if (item.daysDiff > 0) {
      if (item.daysDiff === 1) {
        text = text.replace(/em 3 dias|in 3 dias|há 3 dias|em 2 dias/gi, 'amanhã');
      } else if (item.daysDiff === 2) {
        text = text.replace(/em 3 dias|in 3 dias|há 3 dias/gi, 'em 2 dias');
      } else if (item.daysDiff === 3) {
        text = text.replace(/in 3 dias/gi, 'em 3 dias');
      }
    }

    return text;
  };

  const handleSendSingle = async (item: any) => {
    const text = getMessageText(item);
    const phone = item.clientPhone;

    if (!phone) {
      toast.error(`Cliente ${item.clientName} não possui telefone cadastrado!`);
      return;
    }

    setSendingStatuses(prev => ({ ...prev, [item.id]: 'sending' }));

    const useWebhook = isWebhookEnabled && Boolean(webhookUrl?.trim());

    if (useWebhook) {
      try {
        await dispatchWebhookMessage({
          phone,
          text,
          clientName: item.clientName,
          itemName: item.itemName,
          installmentIndex: item.installmentIndex,
          expectedAmount: item.expectedAmount,
          dueDate: item.dueDate
        });
        
        toast.success(`Mensagem enviada com sucesso para ${item.clientName}!`);
        setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
        addLog(item, 'success', 'webhook');
      } catch (err) {
        toast.error(`Erro no Webhook. Abrindo via WhatsApp Web para ${item.clientName}...`);
        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
        addLog(item, 'success', 'whatsapp_web');
      }
    } else {
      // Manual fallback via WhatsApp Web
      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
      addLog(item, 'success', 'whatsapp_web');
      toast.success(`WhatsApp aberto para ${item.clientName}!`);
    }
  };

  const addLog = (item: any, status: 'success' | 'failed', method: 'webhook' | 'whatsapp_web') => {
    const newLog = {
      id: `${item.id}_${Date.now()}`,
      clientName: item.clientName,
      itemName: item.itemName,
      installmentIndex: item.installmentIndex,
      sentAt: new Date().toLocaleString('pt-BR'),
      status,
      method
    };
    const updated = [newLog, ...sentLogs].slice(0, 50); // Keep last 50 logs
    setSentLogs(updated);
    localStorage.setItem('auto_sent_logs', JSON.stringify(updated));
  };

  const handleSendAll = async () => {
    if (pendingNotifications.length === 0) {
      toast.info('Não há notificações pendentes para enviar hoje!');
      return;
    }

    const useWebhook = isWebhookEnabled && Boolean(webhookUrl?.trim());

    if (isWebhookEnabled && !webhookUrl?.trim()) {
      toast.info('URL de Webhook não preenchida. Efetuando disparos via WhatsApp Web.');
    }

    setIsSendingAll(true);
    let successCount = 0;

    for (const item of pendingNotifications) {
      if (!item.clientPhone) continue;
      const text = getMessageText(item);
      
      setSendingStatuses(prev => ({ ...prev, [item.id]: 'sending' }));

      if (useWebhook) {
        try {
          await dispatchWebhookMessage({
            phone: item.clientPhone,
            text,
            clientName: item.clientName,
            itemName: item.itemName,
            installmentIndex: item.installmentIndex,
            expectedAmount: item.expectedAmount,
            dueDate: item.dueDate
          });
          
          successCount++;
          setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
          addLog(item, 'success', 'webhook');
        } catch (err) {
          // Fallback to WhatsApp Web if Webhook fails
          const url = `https://api.whatsapp.com/send?phone=${item.clientPhone}&text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
          successCount++;
          setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
          addLog(item, 'success', 'whatsapp_web');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // WhatsApp Web mode
        const url = `https://api.whatsapp.com/send?phone=${item.clientPhone}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
        addLog(item, 'success', 'whatsapp_web');
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    setIsSendingAll(false);
    toast.success(`Automação concluída! ${successCount} de ${pendingNotifications.length} disparos realizados.`);
  };

  const handleClearLogs = () => {
    if (confirm('Tem certeza de que deseja limpar o histórico de disparos?')) {
      setSentLogs([]);
      localStorage.removeItem('auto_sent_logs');
      toast.success('Histórico limpo com sucesso.');
    }
  };

  useEffect(() => {
    const loadServerAndLocalSettings = async () => {
      // Local first
      setBgPreview(localStorage.getItem('app_background') || '/background.jpg');
      setLogoPreview(localStorage.getItem('app_logo') || '/logo.png');

      try {
        const queryParams = user?.id ? `?userId=${user.id}` : '';
        const res = await fetch(`/api/settings${queryParams}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const s = await res.json();
          if (s.app_background) {
            setBgPreview(s.app_background);
            localStorage.setItem('app_background', s.app_background);
          }
          if (s.app_logo !== undefined) {
            if (s.app_logo) {
              setLogoPreview(s.app_logo);
              localStorage.setItem('app_logo', s.app_logo);
            } else {
              setLogoPreview('/logo.png');
              localStorage.removeItem('app_logo');
            }
          }
          if (s.app_theme) {
            setCurrentTheme(s.app_theme);
            localStorage.setItem('app_theme', s.app_theme);
          }
          if (s.attendantName) {
            setAttendantName(s.attendantName);
            localStorage.setItem('auto_attendant_name', s.attendantName);
          }
          if (s.pixInfo) {
            setPixInfo(s.pixInfo);
            localStorage.setItem('auto_pix_info', s.pixInfo);
          }
          if (s.webhookUrl !== undefined) {
            setWebhookUrl(s.webhookUrl);
            localStorage.setItem('auto_webhook_url', s.webhookUrl);
          }
          if (s.webhookToken !== undefined) {
            setWebhookToken(s.webhookToken);
            localStorage.setItem('auto_webhook_token', s.webhookToken);
          }
          if (s.webhookProvider !== undefined) {
            setWebhookProvider(s.webhookProvider as WebhookProvider);
            localStorage.setItem('auto_webhook_provider', s.webhookProvider);
          }
          if (s.isWebhookEnabled !== undefined) {
            setIsWebhookEnabled(s.isWebhookEnabled);
            localStorage.setItem('auto_webhook_enabled', String(s.isWebhookEnabled));
          }
          if (s.isFullAutoEnabled !== undefined) {
            setIsFullAutoEnabled(s.isFullAutoEnabled);
            localStorage.setItem('auto_full_auto_enabled', String(s.isFullAutoEnabled));
          }
          if (s.template3Days) {
            setTemplate3Days(s.template3Days);
            localStorage.setItem('auto_template_3_days', s.template3Days);
          }
          if (s.templateDayOf) {
            setTemplateDayOf(s.templateDayOf);
            localStorage.setItem('auto_template_day_of', s.templateDayOf);
          }
          if (s.templateOverdue) {
            setTemplateOverdue(s.templateOverdue);
            localStorage.setItem('auto_template_overdue', s.templateOverdue);
          }
        }
      } catch (err) {
        console.warn('Could not load settings from server:', err);
      }
    };

    loadServerAndLocalSettings();

    const syncTheme = () => {
      const saved = localStorage.getItem('app_theme') as 'light' | 'dark';
      if (saved) setCurrentTheme(saved);
    };
    window.addEventListener('theme_changed', syncTheme);
    return () => window.removeEventListener('theme_changed', syncTheme);
  }, [user?.id]);

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    localStorage.setItem('app_theme', theme);
    window.dispatchEvent(new Event('theme_changed'));
    if (user?.id) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            settings: { app_theme: theme }
          })
        });
      } catch (e) {
        console.warn(e);
      }
    }
    toast.success(`Tema ${theme === 'dark' ? 'Escuro' : 'Claro'} ativado! ⚡`);
  };

  const handleExport = async () => {
    setIsExportingBackup(true);
    try {
      const data = await backupService.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const fileName = `backup_sistema_godshop_${new Date().toISOString().slice(0, 10)}.json`;

      // Always populate the code state and open modal so the user can easily view, copy, or save
      setBackupJsonCode(jsonStr);
      setShowBackupCodeModal(true);

      // 1. Android APK (Capacitor native platform) - Save to device Documents folder directly
      if (Capacitor.isNativePlatform()) {
        try {
          // Solicitar permissão de escrita
          const status = await Filesystem.checkPermissions();
          if (status.publicStorage !== 'granted') {
            const request = await Filesystem.requestPermissions();
            if (request.publicStorage !== 'granted') {
              toast.error('Permissão de armazenamento negada pelo usuário.');
              return;
            }
          }

          let targetDir = Directory.Documents;
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: jsonStr,
              directory: targetDir,
              encoding: Encoding.UTF8,
              recursive: true
            });
          } catch (docErr) {
            targetDir = Directory.ExternalStorage || Directory.Cache;
            await Filesystem.writeFile({
              path: fileName,
              data: jsonStr,
              directory: targetDir,
              encoding: Encoding.UTF8,
              recursive: true
            });
          }

          const fileUri = await Filesystem.getUri({
            path: fileName,
            directory: targetDir
          });

          try {
            const { Share } = await import('@capacitor/share');
            if (Share && fileUri?.uri) {
              await Share.share({
                title: 'Backup GODSHOP',
                text: 'Arquivo de backup do sistema GODSHOP (.json). Salve no seu aparelho.',
                url: fileUri.uri,
                dialogTitle: 'Salvar Arquivo de Backup'
              });
            }
          } catch (shareFileErr) {
            console.warn('Capacitor Share file error:', shareFileErr);
          }

          toast.success('Backup gerado e salvo na memória do seu celular! Use o modal para gerenciar.');
          return;
        } catch (fsErr: any) {
          console.warn('Capacitor Filesystem write error:', fsErr);
        }
      }

      // 3. FileSaver / Blob fallback for browsers
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const { saveAs } = await import('file-saver');
        saveAs(blob, fileName);
        toast.success('Arquivo de backup baixado com sucesso!');
      } catch (saveErr) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (e) {}
        }, 1000);
        toast.success('Arquivo de backup baixado com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao exportar backup: ' + (err?.message || err));
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleCopyBackupToClipboard = async () => {
    setIsCopyingBackup(true);
    try {
      const data = await backupService.exportData();
      const jsonStr = JSON.stringify(data);
      setBackupJsonCode(jsonStr);
      setShowBackupCodeModal(true);

      const copiedSuccess = await copyToClipboard(jsonStr);
      if (copiedSuccess) {
        toast.success('Código do backup copiado com sucesso! Você também pode visualizá-lo ou compartilhá-lo abaixo.');
      } else {
        toast.info('Código gerado! Você pode visualizá-lo, copiá-lo ou enviá-lo pelo WhatsApp.');
      }
    } catch (err: any) {
      toast.error('Erro ao gerar código de backup: ' + (err?.message || err));
    } finally {
      setIsCopyingBackup(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetInput = e.target;
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || !content.trim()) {
          toast.error('O arquivo selecionado está vazio.');
          return;
        }

        // Validação robusta de sintaxe e estrutura
        const validation = backupService.validateBackup(content);
        if (!validation.isValid) {
          toast.error(validation.error || 'Arquivo de backup inválido ou corrompido', {
            description: validation.errorDetails,
            duration: 9000
          });
          return;
        }

        if (validation.warnings.length > 0) {
          toast.info('Compatibilidade ajustada:', {
            description: validation.warnings[0]
          });
        }

        const result = await backupService.importData(validation.normalizedData);
        if (result.success) {
          toast.success(result.message);
          queryClient.invalidateQueries();
          await db.sales.list().catch(() => {});
          await db.clients.list().catch(() => {});
          setTimeout(() => {
            window.location.reload();
          }, 600);
        } else {
          toast.error(result.message, {
            description: result.details?.[0],
            duration: 8000
          });
        }
      } catch (err: any) {
        toast.error('Falha ao processar arquivo de backup: ' + err.message);
      } finally {
        setIsImporting(false);
        if (targetInput) targetInput.value = '';
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      toast.error('Erro ao ler arquivo no seu dispositivo.');
    };
    reader.readAsText(file);
  };

  const handlePasteBackupSubmit = async () => {
    if (!pasteJsonText.trim()) {
      toast.error('Por favor, cole o código JSON do backup.');
      return;
    }

    setIsImporting(true);
    try {
      const validation = backupService.validateBackup(pasteJsonText);
      if (!validation.isValid) {
        toast.error(validation.error || 'Código de backup inválido ou corrompido', {
          description: validation.errorDetails,
          duration: 10000
        });
        setIsImporting(false);
        return;
      }

      if (validation.warnings.length > 0) {
        toast.info('Compatibilidade do código ajustada:', {
          description: validation.warnings[0]
        });
      }

      const result = await backupService.importData(validation.normalizedData);
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries();
        setShowPasteModal(false);
        setPasteJsonText('');
        await db.sales.list().catch(() => {});
        await db.clients.list().catch(() => {});
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        toast.error(result.message, {
          description: result.details?.[0],
          duration: 8000
        });
      }
    } catch (err: any) {
      toast.error('Código de backup inválido ou corrompido: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          localStorage.setItem(key, base64String);
          setPreview(base64String);
          window.dispatchEvent(new Event('settings_updated'));
          
          if (user?.id) {
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                settings: {
                  [key]: base64String
                }
              })
            });
          }
          
          toast.success('Imagem atualizada com sucesso!');
        } catch (err) {
          toast.error('Erro ao salvar imagem. O arquivo pode ser muito grande.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async (key: string, setPreview: React.Dispatch<React.SetStateAction<string | null>>, defaultVal: string | null) => {
    localStorage.removeItem(key);
    setPreview(defaultVal);
    window.dispatchEvent(new Event('settings_updated'));
    
    if (user?.id) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          settings: {
            [key]: defaultVal
          }
        })
      });
    }
    
    toast.success('Imagem removida com sucesso!');
  };

  const handleRestoreData = async () => {
    if (!confirm('Isso irá restaurar os dados originais dos clientes das notas fiscais. Deseja continuar?')) return;
    
    setIsRestoring(true);
    try {
      const result = await db.restoreFromWarranties();
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao restaurar dados');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSearchStorage = async () => {
    setIsStorageExplorerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie a aparência, backups e automação de mensagens do sistema GODSHOP.</p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex flex-wrap p-1 bg-muted/20 border border-white/5 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('geral')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'geral' 
                ? "bg-white text-black shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            Geral & Design
          </button>
          <button
            onClick={() => setActiveTab('usuario')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'usuario' 
                ? "bg-white text-black shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Dados do Usuário & Senha
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'backup' 
                ? "bg-white text-black shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <Database className="h-3.5 w-3.5" />
            Backup & Nuvem
          </button>
          <button
            onClick={() => setActiveTab('automacao')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition duration-200 flex items-center gap-1.5 cursor-pointer relative",
              activeTab === 'automacao' 
                ? "bg-white text-black shadow-lg" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Automação WhatsApp
            {pendingNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-black font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                {pendingNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER TAB: GERAL & DESIGN */}
      {activeTab === 'geral' && (
        <div className="space-y-6 animate-in fade-in duration-300">


          <div className="grid gap-6 md:grid-cols-2">
            {/* Card: Tema do Sistema */}
            <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-foreground">
                  {currentTheme === 'dark' ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  Tema do Aplicativo
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Personalize a aparência do seu sistema GODSHOP. Alterne instantaneamente entre o modo claro e o modo escuro.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition duration-300 cursor-pointer shadow-sm",
                    currentTheme === 'light'
                      ? "bg-amber-500 text-black border-amber-500 hover:bg-amber-600"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <Sun className="h-4 w-4" />
                  Modo Claro
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition duration-300 cursor-pointer shadow-sm",
                    currentTheme === 'dark'
                      ? "bg-zinc-100 text-black border-zinc-100 hover:bg-white"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <Moon className="h-4 w-4" />
                  Modo Escuro
                </button>
              </div>
            </div>

            {/* Logo Settings */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-primary" />
                Logo do Aplicativo
              </h2>
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden shadow-inner">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      className="h-full w-full object-cover" 
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.includes('logo.png')) {
                          img.src = '/logo.png';
                        }
                      }}
                    />
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

                <div className="w-full p-3 bg-muted/20 border border-border/50 rounded-xl text-left space-y-1">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-primary" />
                    Pasta Oficial de Logos ao Compilar:
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Você também pode colocar seus arquivos <code className="text-primary font-mono font-bold">logo.png</code> e <code className="text-primary font-mono font-bold">icon.png</code> diretamente na pasta <code className="bg-black/30 px-1 py-0.5 rounded text-foreground font-mono">public/logos/</code>. Ao compilar com <code className="text-primary font-mono">npm run build</code>, eles são preservados e embutidos automaticamente no APK e no Cloudflare.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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

            {/* Card: Execução Contínua em Segundo Plano (APK & Executável) */}
            <div className="bg-card border border-emerald-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                    Execução em Segundo Plano
                  </h2>
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1",
                    isBgRunning
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", isBgRunning ? "bg-emerald-400 animate-ping" : "bg-zinc-500")} />
                    {isBgRunning ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Permite que o aplicativo Android (APK) e o executável para computador continuem sincronizando vendas, clientes e notificações mesmo minimizados ou com a tela desligada.
                </p>

                <div className="space-y-2.5 text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-border/50 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-foreground">📱 No Celular (APK):</span>
                    <span>Mantém a sincronização de cadastros remotos e notificações de cobrança rodando sem ser pausado pelo Android.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-foreground">💻 No Computador (.exe):</span>
                    <span>O sistema continua atendendo e sincronizando silenciosamente em segundo plano na bandeja do sistema.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isBgRunning;
                    setIsBgRunning(next);
                    backgroundService.setBackgroundEnabled(next);
                    if (next) {
                      toast.success('Modo segundo plano ativado! O sistema continuará sincronizando minimizado.');
                    } else {
                      toast.info('Modo segundo plano desativado.');
                    }
                  }}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm",
                    isBgRunning
                      ? "bg-emerald-500 text-black hover:bg-emerald-600"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  <Power className="h-4 w-4" />
                  {isBgRunning ? 'Desativar Segundo Plano' : 'Ativar Execução em Segundo Plano'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const opened = await backgroundService.openAndroidBatterySettings();
                    if (!opened) {
                      toast.info('Para garantir que o Android nunca pause o app: vá em Configurações do Celular > Aplicativos > GODSHOP > Bateria > selecione "Sem Restrições".');
                    } else {
                      toast.success('Abrindo configurações do aplicativo no Android...');
                    }
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground py-2 px-3 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border border-border/50"
                >
                  <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                  Configurar Bateria sem Restrições (Android)
                </button>
              </div>
            </div>

            {/* Logout/Session Card */}
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-3">
                  <LogOut className="h-5 w-5" />
                  Sessão do Usuário
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Deseja encerrar sua sessão atual neste dispositivo? Você poderá retornar e sincronizar seus dados a qualquer momento.
                </p>
              </div>
              <button
                onClick={logout}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LogOut className="h-4 w-4" />
                Sair do Aplicativo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB: DADOS DO USUÁRIO & SENHA */}
      {activeTab === 'usuario' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Card 1: Painel do Usuário com Cadastros Básicos (Fidelização do Cadastro) */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  Painel do Usuário & Cadastro da Empresa (Fidelização Cadastral)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mantenha os cadastros básicos do titular e da loja fidelizados para recibos, notas, WhatsApp e identificação no sistema.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Cadastro Ativo & Fidelizado
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome do Titular / Responsável
                  </label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    placeholder="Ex: Kaleb dos Santos Gonçalves"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome da Loja / Empresa
                  </label>
                  <input
                    type="text"
                    value={profileData.storeName}
                    onChange={(e) => setProfileData({ ...profileData, storeName: e.target.value })}
                    placeholder="Ex: GODSHOP"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    E-mail de Acesso Principal
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="seuemail@exemplo.com"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="(32) 99963-4583"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={profileData.document}
                    onChange={(e) => setProfileData({ ...profileData, document: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    Cargo / Perfil de Acesso
                  </label>
                  <select
                    value={profileData.role}
                    onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Proprietário / Administrador">Proprietário / Administrador</option>
                    <option value="Gerente Geral">Gerente Geral</option>
                    <option value="Vendedor Responsável">Vendedor Responsável</option>
                    <option value="Financeiro / Operacional">Financeiro / Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    Chave Pix Padrão da Loja
                  </label>
                  <input
                    type="text"
                    value={profileData.pixKey}
                    onChange={(e) => setProfileData({ ...profileData, pixKey: e.target.value })}
                    placeholder="Telefone, CNPJ ou Aleatória"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Cidade / Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={profileData.cityState}
                    onChange={(e) => setProfileData({ ...profileData, cityState: e.target.value })}
                    placeholder="Carangola - MG"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  Data de Registro: <strong className="text-foreground">{profileData.registeredAt}</strong>
                </span>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {isSavingProfile ? 'Salvando...' : 'Salvar e Fidelizar Cadastro'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Painel de Alteração de Senha & Segurança */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Lock className="h-5 w-5 text-blue-500" />
                  Painel de Alteração de Senha & Segurança
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualize sua senha de acesso ao sistema com validação da senha anterior e segurança reforçada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center"
              >
                <Eye className="h-4 w-4" />
                Ver Dados & Senha Atual
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Senha Antiga
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full p-2.5 pr-10 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-2.5 pr-10 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full p-2.5 pr-10 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Alterando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Atualizar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Registros de Usuários do Sistema (Gestão de Operadores & Equipe) */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Users className="h-5 w-5 text-indigo-400" />
                  Registros de Usuários & Operadores da Equipe ({registeredUsers.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerencie todos os operadores, vendedores e administradores cadastrados com permissão de login no sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Novo Registro de Usuário
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Nome</th>
                    <th className="py-2.5 px-3 font-semibold">E-mail de Acesso</th>
                    <th className="py-2.5 px-3 font-semibold">Telefone</th>
                    <th className="py-2.5 px-3 font-semibold">Cargo / Função</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {registeredUsers.map((regUser) => (
                    <tr key={regUser.id} className="hover:bg-muted/20 transition">
                      <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {regUser.name.charAt(0).toUpperCase()}
                        </div>
                        {regUser.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{regUser.email}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{regUser.phone || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          regUser.role === 'Administrador' 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {regUser.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {regUser.status || 'Ativo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {registeredUsers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(regUser.id, regUser.name)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition cursor-pointer"
                            title="Remover Usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Cadastro de Novo Usuário do Sistema */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                    <Plus className="h-5 w-5 text-indigo-400" />
                    Novo Registro de Usuário / Operador
                  </h3>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRegisterNewUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      E-mail de Acesso / Login
                    </label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="joao@godshop.com"
                      className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="(32) 99999-0000"
                        className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Cargo / Função
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="Vendedor">Vendedor</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Atendente">Atendente</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Senha Inicial de Acesso (Mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewUserPassword ? "text" : "password"}
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Digite a senha do usuário"
                        className="w-full p-2.5 pr-10 rounded-xl bg-background border border-input text-xs text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingUser}
                      className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md"
                    >
                      {isAddingUser ? 'Salvando...' : 'Cadastrar Usuário'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal de Dados Básicos e Visualização de Senha */}
          {showPasswordModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                    <User className="h-5 w-5 text-blue-500" />
                    Dados Básicos do Usuário & Senha
                  </h3>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Titular Cadastrado:</span>
                      <span className="font-semibold text-foreground">{profileData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Empresa / Loja:</span>
                      <span className="font-semibold text-foreground">{profileData.storeName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">E-mail / Usuário:</span>
                      <span className="font-mono font-semibold text-foreground">{user?.email || profileData.email || 'admin@godshop.com'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">ID do Usuário:</span>
                      <span className="font-mono text-muted-foreground text-[11px]">{user?.id || 'Modo Local / Offline'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status de Conexão:</span>
                      <span className="font-semibold text-emerald-400">{isOfflineMode ? 'Modo Offline (Local)' : 'Conectado (Supabase)'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                    <span className="text-blue-400 font-bold block text-[11px]">Senha Atual em Cache:</span>
                    <div className="flex items-center justify-between font-mono bg-background/80 p-2 rounded-lg border border-border">
                      <span className="text-foreground">
                        {(() => {
                          try {
                            const email = user?.email || profileData.email || localStorage.getItem('godshop_saved_email') || 'admin@godshop.com';
                            const creds = JSON.parse(localStorage.getItem('godshop_credentials') || '{}');
                            return creds[email.toLowerCase()] || '••••••••';
                          } catch {
                            return '••••••••';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB: BACKUP & NUVEM */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Card: Vínculo em Nuvem Multi-Dispositivos */}
          <div className="bg-card border border-emerald-500/20 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1 text-foreground">
                  <Cloud className="h-5 w-5 text-emerald-400 animate-pulse" />
                  Sincronização em Nuvem (PC, Notebook e Celular)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Todos os seus dados (estoque de iPhones, consoles, clientes, vendas, parcelas, carnês, mimos e preferências) ficam sincronizados em tempo real entre todos os seus dispositivos.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5 shrink-0 self-start md:self-center">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <div>
                  <p className="font-bold text-emerald-300">Nuvem Online & Ativa</p>
                  <p className="opacity-80 font-mono text-[10px]">Sincronização Automática PC / Celular</p>
                </div>
              </div>
            </div>

            {/* Cloud Summary Badges */}
            {cloudStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <div className="p-3 rounded-xl bg-muted/20 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">iPhones na Nuvem</span>
                  <span className="text-lg font-extrabold text-foreground">{cloudStats.iphones ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Consoles na Nuvem</span>
                  <span className="text-lg font-extrabold text-foreground">{cloudStats.consoles ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Clientes na Nuvem</span>
                  <span className="text-lg font-extrabold text-foreground">{cloudStats.clients ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted-foreground">Vendas na Nuvem</span>
                  <span className="text-lg font-extrabold text-foreground">{cloudStats.sales ?? 0}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <button
                disabled={isSyncingCloud}
                onClick={async () => {
                  setIsSyncingCloud(true);
                  try {
                    const syncRes = await db.syncAll();
                    const pushRes = await db.pushToCloud();
                    if (pushRes.success || syncRes.success) {
                      toast.success('Todos os dados (vendas pagas/pendentes, parcelas, estoque e clientes) foram enviados para o banco de dados na nuvem com sucesso!');
                      await loadCloudStats();
                    } else {
                      toast.error(pushRes.message || 'Erro ao sincronizar dados');
                    }
                  } catch (e: any) {
                    toast.error('Erro ao salvar na nuvem: ' + e.message);
                  } finally {
                    setIsSyncingCloud(false);
                  }
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold py-3.5 px-4 rounded-xl text-xs transition duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <Upload className="h-4 w-4" />
                {isSyncingCloud ? 'Sincronizando com a Nuvem...' : 'Salvar Dados deste Aparelho na Nuvem'}
              </button>

              <button
                disabled={isSyncingCloud}
                onClick={async () => {
                  setIsSyncingCloud(true);
                  try {
                    const syncRes = await db.syncAll();
                    const res = await db.pullFromCloud();
                    if (res.success || syncRes.success) {
                      toast.success('Dados e pagamentos sincronizados com sucesso!');
                      queryClient.invalidateQueries();
                      await loadCloudStats();
                    } else {
                      toast.error(res.message);
                    }
                  } catch (e: any) {
                    toast.error('Erro ao puxar dados da nuvem: ' + e.message);
                  } finally {
                    setIsSyncingCloud(false);
                  }
                }}
                className="bg-zinc-100 hover:bg-white text-black font-extrabold py-3.5 px-4 rounded-xl text-xs transition duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCw className={cn("h-4 w-4", isSyncingCloud && "animate-spin")} />
                Puxar Dados Mais Recentes da Nuvem
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2 text-foreground">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Como funciona a sincronização entre PC, Notebook e Celular:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pl-1 leading-relaxed">
                <li><strong>Automático e Contínuo:</strong> Toda vez que você cadastra um produto, efetua uma venda ou altera um cliente no computador, a alteração é enviada imediatamente para a nuvem.</li>
                <li><strong>Acesso em Qualquer Lugar:</strong> Ao abrir o sistema no seu celular ou notebook, todos os dados são carregados automaticamente sem precisar exportar ou importar arquivos manuais.</li>
                <li><strong>Trabalho em Equipe e Concorrência:</strong> O sistema mescla os registros com segurança, garantindo que novos itens e atualizações fiquem preservados.</li>
              </ul>
            </div>
          </div>

          {/* Cópia de Segurança e Backup */}
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-foreground">
              <Database className="h-5 w-5 text-amber-500" />
              Cópia de Segurança Local & Restauração
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Exporte todos os seus dados para um arquivo de segurança local (JSON), ou carregue um backup salvo anteriormente para reverter modificações.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Export card */}
              <div className="border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/25 transition flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-1">
                    <Download className="h-4 w-4 text-primary" />
                    Criar Cópia de Segurança (Exportar)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Gere o backup com todas as vendas efetuadas, parcelas pagas, estoque e clientes.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    disabled={isExportingBackup}
                    onClick={handleExport}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {isExportingBackup ? 'Gerando Backup...' : 'Baixar Arquivo (.JSON)'}
                  </button>
                    <button
                      disabled={isCopyingBackup}
                      onClick={handleCopyBackupToClipboard}
                      className="w-full bg-white/10 hover:bg-white/15 text-foreground py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                    >
                      <Copy className="h-3.5 w-3.5 text-emerald-400" />
                      {isCopyingBackup ? 'Gerando Código...' : 'Ver / Copiar Código do Backup (Celular/WhatsApp)'}
                    </button>
                  </div>
                </div>

                {/* Import card */}
                <div className="border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/25 transition flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-1">
                      <FileJson className="h-4 w-4 text-amber-500" />
                      Carregar Backup Existente (Importar)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Restaure no celular ou computador através de arquivo .json ou colando o código copiado.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-amber-500 text-black hover:bg-amber-600 py-2.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                          Restaurando dados...
                        </>
                      ) : (
                        <>
                          <FileJson className="h-4 w-4" />
                          Selecionar Arquivo de Backup (.json)
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json,text/json,text/plain,*/*"
                      onChange={handleImport}
                      disabled={isImporting}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5 text-blue-200" />
                      Colar Código do Backup (Recomendado no Celular)
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal para Baixar e Salvar Arquivo de Backup no Aparelho com Escolha de Local */}
              {showBackupCodeModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                        <Folder className="h-5 w-5 text-emerald-400" />
                        Salvar Backup no Aparelho
                      </h3>
                      <button
                        onClick={() => setShowBackupCodeModal(false)}
                        className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Configure o nome e o local onde o arquivo de backup será guardado no seu dispositivo:
                      </p>

                      <div className="space-y-2 pt-1">
                        <label className="block text-[11px] font-semibold text-foreground">
                          Nome do Arquivo (.json)
                        </label>
                        <input
                          type="text"
                          id="backup-filename-input"
                          defaultValue={`backup_sistema_godshop_${new Date().toISOString().slice(0, 10)}.json`}
                          className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-semibold text-foreground">
                          Local de Salvamento no Aparelho
                        </label>
                        <select
                          id="backup-location-select"
                          defaultValue="Documents"
                          className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-medium text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value="Documents">📁 Pasta Documentos (Recomendado)</option>
                          <option value="ExternalStorage">💾 Armazenamento Interno / Downloads</option>
                          <option value="Cache">⚡ Cache Temporário</option>
                        </select>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          No Android APK, após tocar em salvar, o sistema abrirá o seletor para você confirmar ou escolher outra pasta.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/50">
                      <button
                        type="button"
                        onClick={async () => {
                          const fileNameInput = document.getElementById('backup-filename-input') as HTMLInputElement;
                          const locationSelect = document.getElementById('backup-location-select') as HTMLSelectElement;
                          
                          const customFileName = fileNameInput?.value?.trim() || `backup_sistema_godshop_${new Date().toISOString().slice(0, 10)}.json`;
                          const locationChoice = locationSelect?.value || 'Documents';

                          // 1. If running on native Capacitor (Android APK)
                          if (Capacitor.isNativePlatform()) {
                            try {
                              let targetDir = Directory.Documents;
                              if (locationChoice === 'ExternalStorage') targetDir = Directory.ExternalStorage || Directory.Documents;
                              if (locationChoice === 'Cache') targetDir = Directory.Cache;

                              await Filesystem.writeFile({
                                path: customFileName,
                                data: backupJsonCode,
                                directory: targetDir,
                                encoding: Encoding.UTF8,
                                recursive: true
                              });

                              const fileUri = await Filesystem.getUri({
                                path: customFileName,
                                directory: targetDir
                              });

                              const { Share } = await import('@capacitor/share');
                              if (Share && fileUri?.uri) {
                                await Share.share({
                                  title: 'Salvar Arquivo de Backup GODSHOP',
                                  text: 'Toque em "Salvar em Arquivos" para confirmar a pasta escolhida.',
                                  url: fileUri.uri,
                                  dialogTitle: 'Salvar Arquivo no Aparelho'
                                });
                                toast.success('Escolha "Salvar em Arquivos" para confirmar o local!');
                                setShowBackupCodeModal(false);
                                return;
                              }
                            } catch (nativeErr: any) {
                              console.warn('Native save with location error:', nativeErr);
                            }
                          }

                          // 2. Browser / FileSaver fallback with custom filename
                          try {
                            const blob = new Blob([backupJsonCode], { type: 'application/json' });
                            const { saveAs } = await import('file-saver');
                            saveAs(blob, customFileName);
                            toast.success(`Arquivo ${customFileName} baixado com sucesso!`);
                            setShowBackupCodeModal(false);
                          } catch (e) {
                            const blob = new Blob([backupJsonCode], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = customFileName;
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              try {
                                if (a.parentNode) a.parentNode.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (err) {}
                            }, 1000);
                            toast.success(`Arquivo ${customFileName} baixado com sucesso!`);
                            setShowBackupCodeModal(false);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                      >
                        <Download className="h-4 w-4" />
                        Confirmar e Salvar Arquivo
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBackupCodeModal(false)}
                        className="w-full bg-muted hover:bg-muted/80 text-foreground font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal para Colar Backup */}
              {showPasteModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                        <ClipboardPaste className="h-5 w-5 text-blue-500" />
                        Restaurar Backup Colando o Texto
                      </h3>
                      <button
                        onClick={() => setShowPasteModal(false)}
                        className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Cole o código JSON completo no campo abaixo:
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await readFromClipboard();
                            if (text && text.trim()) {
                              setPasteJsonText(text.trim());
                              toast.success('Código colado com sucesso da área de transferência!');
                              return;
                            }
                          } catch (e) {
                            console.warn('Clipboard read error:', e);
                          }
                          toast.info('Para colar manualmente, toque e segure na caixa de texto abaixo e selecione "Colar".');
                        }}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <ClipboardPaste className="h-3 w-3" />
                        Colar do Celular
                      </button>
                    </div>

                    <textarea
                      rows={6}
                      value={pasteJsonText}
                      onChange={(e) => setPasteJsonText(e.target.value)}
                      placeholder='Cole aqui o código do backup (ex: {"version": 2, "timestamp": "...", "data": {...}})'
                      style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                      className={cn(
                        "w-full p-3 rounded-xl bg-background border text-xs font-mono text-foreground focus:outline-none resize-none transition",
                        pasteValidation
                          ? pasteValidation.isValid
                            ? "border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30"
                            : "border-red-500/50 focus:ring-2 focus:ring-red-500/30"
                          : "border-input focus:ring-2 focus:ring-blue-500"
                      )}
                    />

                    {/* Live Validation Feedback Card */}
                    {pasteValidation && (
                      <div className="animate-in fade-in duration-200">
                        {pasteValidation.isValid && pasteValidation.summary ? (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                            <div className="font-bold text-emerald-400 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                Integridade Verificada (GODSHOP v{pasteValidation.summary.version})
                              </span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                {pasteValidation.summary.totalRecords} itens
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                              <div>• <strong className="text-foreground">{pasteValidation.summary.clients}</strong> Clientes</div>
                              <div>• <strong className="text-foreground">{pasteValidation.summary.sales}</strong> Vendas</div>
                              <div>• <strong className="text-foreground">{pasteValidation.summary.iphones + pasteValidation.summary.consoles}</strong> Estoque</div>
                              <div>• <strong className="text-foreground">{pasteValidation.summary.suppliers}</strong> Fornecedores</div>
                            </div>
                            {pasteValidation.warnings.length > 0 && (
                              <div className="text-amber-400 text-[10px] pt-0.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>{pasteValidation.warnings[0]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-1.5">
                            <div className="font-bold text-red-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                              {pasteValidation.error || 'Código corrompido ou incompleto'}
                            </div>
                            {pasteValidation.errorDetails && (
                              <p className="text-muted-foreground text-[11px] leading-relaxed whitespace-pre-line pl-5">
                                {pasteValidation.errorDetails}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {pasteJsonText ? (
                        <button
                          type="button"
                          onClick={() => setPasteJsonText('')}
                          className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                        >
                          Limpar texto
                        </button>
                      ) : <span />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPasteModal(false)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isImporting || !pasteValidation?.isValid}
                          onClick={handlePasteBackupSubmit}
                          className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                          {isImporting ? (
                            <>
                              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Restaurando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Restaurar Dados Agora
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-white/5 pt-6">
                <h3 className="text-sm font-bold mb-3">Auxiliares de Banco de Dados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const { fixDuplicates } = await import('../services/fixDuplicates');
                        const toastId = toast.loading('Procurando e corrigindo duplicatas...');
                        const res = await fixDuplicates();
                        if (res.success) {
                          toast.success(`Correção concluída! Clientes fundidos: ${res.clientsFixed}, Vendas apagadas: ${res.salesFixed}`, { id: toastId });
                          queryClient.invalidateQueries();
                        } else {
                          toast.error('Erro ao corrigir duplicatas', { id: toastId });
                        }
                      } catch (e: any) {
                        toast.error('Erro fatal: ' + e.message);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Corrigir Duplicatas
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        toast.promise(db.autoSeed(), {
                          loading: 'Carregando dados de exemplo...',
                          success: 'Dados de exemplo carregados!',
                          error: 'Erro ao carregar dados de exemplo'
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="bg-white/5 text-white hover:bg-white/10 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    CARREGAR CLIENTES EXEMPLO
                  </button>

                  <button
                    onClick={handleRestoreData}
                    disabled={isRestoring}
                    className="bg-amber-500 text-black hover:bg-amber-600 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Database className="h-4 w-4" />
                    {isRestoring ? 'RESTAURANDO...' : 'RESTAURAR NOTAS ORIGINAIS'}
                  </button>
                  
                  <button
                    onClick={handleSearchStorage}
                    disabled={isRestoring}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-xl text-[10px] font-black transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                    {isRestoring ? 'BUSCANDO...' : 'IMPORTAR ARQUIVO DE TABELA'}
                  </button>
                </div>
              </div>
            </div>

            {/* Card: Configuração de Conexão com o Supabase (Nuvem do APK & Cloudflare) */}
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Cloud className="h-5 w-5 text-emerald-400" />
                    Conexão do Banco de Dados Supabase (APK & Cloudflare)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permite sincronizar em tempo real o estoque, clientes, notas e cadastros externos recebidos via link.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {isSupabaseConfigured() ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Conectado ao Supabase
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                      Modo Local / Desconectado
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    URL do Projeto Supabase
                  </label>
                  <input
                    type="text"
                    value={supaUrlInput}
                    onChange={(e) => setSupaUrlInput(e.target.value)}
                    placeholder="https://sua-empresa.supabase.co"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Encontrado no painel do Supabase em Project Settings &gt; API &gt; Project URL.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Chave Pública Anon (anon key)
                  </label>
                  <div className="relative">
                    <input
                      type={showSupaKey ? "text" : "password"}
                      value={supaKeyInput}
                      onChange={(e) => setSupaKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full p-2.5 pr-10 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSupaKey(!showSupaKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showSupaKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Encontrado no painel do Supabase em Project Settings &gt; API &gt; Project API keys &gt; anon/public. Nunca use a service_role key.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                    <span>Domínio Público do Cloudflare Pages (Gerador de Links no APK)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Ex: https://godshop.pages.dev</span>
                  </label>
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="https://godshop.pages.dev"
                    className="w-full p-2.5 rounded-xl bg-background border border-input text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Insira o endereço onde seu sistema está publicado no Cloudflare Pages. Quando você gerar links de cadastro no APK Android, ele usará esse link web para enviar aos clientes pelo WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isTestingSupa}
                    onClick={async () => {
                      setIsTestingSupa(true);
                      try {
                        const { error } = await supabase.from('clients').select('id', { count: 'exact', head: true });
                        if (!error) {
                          toast.success('Conexão com o Supabase testada com sucesso! O banco está respondendo.');
                        } else {
                          toast.warning('Aviso de conexão com o Supabase: ' + error.message);
                        }
                      } catch (e: any) {
                        toast.error('Erro ao conectar ao Supabase: ' + (e?.message || e));
                      } finally {
                        setIsTestingSupa(false);
                      }
                    }}
                    className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isTestingSupa && "animate-spin")} />
                    Testar Conexão Agora
                  </button>

                  {(localStorage.getItem('custom_supabase_url') || localStorage.getItem('custom_supabase_key') || localStorage.getItem('custom_app_domain')) && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('custom_supabase_url');
                        localStorage.removeItem('custom_supabase_key');
                        setCustomAppDomain('');
                        setCustomDomainInput('');
                        setSupaUrlInput(import.meta.env.VITE_SUPABASE_URL || '');
                        setSupaKeyInput(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
                        toast.info('Credenciais e domínio restaurados para o padrão. Recarregando aplicação...');
                        setTimeout(() => window.location.reload(), 600);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive px-3 py-2 cursor-pointer"
                    >
                      Restaurar Padrão
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSavingSupa}
                  onClick={async () => {
                    setIsSavingSupa(true);
                    try {
                      if (!supaUrlInput.trim() || !supaKeyInput.trim()) {
                        toast.error('Por favor, informe a URL e a Anon Key do Supabase.');
                        return;
                      }
                      setCustomSupabaseCredentials(supaUrlInput, supaKeyInput);
                      if (customDomainInput.trim()) {
                        setCustomAppDomain(customDomainInput.trim());
                      } else {
                        setCustomAppDomain('');
                      }
                      toast.success('Configurações salvas com sucesso! Recarregando sistema...');
                      setTimeout(() => {
                        window.location.reload();
                      }, 700);
                    } catch (e: any) {
                      toast.error('Erro ao salvar credenciais: ' + e.message);
                    } finally {
                      setIsSavingSupa(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Salvar e Conectar
                </button>
              </div>
            </div>
          </div>
        )}

      {/* RENDER TAB: AUTOMAÇÃO WHATSAPP */}
      {activeTab === 'automacao' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Banner explaining how the system works */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/10 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                Painel do Sistema de Automação de Cobranças
              </h3>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Configure as variáveis e modelos para mandar alertas de cobrança personalizados. 
                Você pode optar pelo disparo <strong>Semi-Automático</strong> (abre janelas do WhatsApp Web sequencialmente com texto preenchido) ou total <strong>Automação via Webhook</strong> (integração direta com o seu gateway preferido para envio de mensagens sem intervenção).
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSendAll}
                disabled={isSendingAll || pendingNotifications.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition duration-300 flex items-center gap-1.5 shadow-md shadow-emerald-950/50 disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-black" />
                {isSendingAll ? 'Disparando...' : 'Disparar Todos de Hoje'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* 1. CONFIGURAÇÕES GERAIS DE ATENDIMENTO */}
            <div className="bg-card border rounded-xl p-5 space-y-4 shadow-sm h-fit">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Bot className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-foreground">Informações de Atendimento</h3>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Nome do Atendente <span className="text-muted-foreground font-normal">(Variável {"{atendente}"})</span></span>
                <input
                  type="text"
                  value={attendantName}
                  onChange={(e) => setAttendantName(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Ex: Karen"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">WhatsApp / Telefone da Loja <span className="text-muted-foreground font-normal">(Recebimento de Cadastros)</span></span>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                  placeholder="Ex: 5532999634583"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Número para onde o cliente enviará a confirmação ao preencher o link externo.</p>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Chave Pix e Nome <span className="text-muted-foreground font-normal">(Variável {"{pix}"})</span></span>
                <textarea
                  value={pixInfo}
                  onChange={(e) => setPixInfo(e.target.value)}
                  rows={4}
                  className="w-full text-sm p-3 rounded-xl border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                  placeholder={`Chave Pix (Celular/Telefone): 13036942637\nNome: Kaleb dos Santos Gonçalves`}
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  Esses dados substituirão automaticamente as variáveis <strong>{"{atendente}"}</strong> e <strong>{"{pix}"}</strong> nos modelos de mensagem.
                </p>
              </div>
            </div>

            {/* 2. CONFIGURAÇÕES & CREDENCIAIS */}
            <div className="bg-card border rounded-xl p-5 space-y-4 shadow-sm h-fit lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Bot className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-foreground">Canal de Envio (Automação)</h3>
              </div>

              {/* Webhook active toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-foreground">Usar Disparo Automático (Webhook)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Dispara direto por API/Gateway externo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWebhookEnabled}
                    onChange={(e) => setIsWebhookEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                </label>
              </div>

              {/* Full Auto Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-foreground">Automação 100% Automática (Segundo Plano)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">O servidor envia as cobranças sozinho diariamente, sem precisar abrir o app</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFullAutoEnabled}
                    onChange={(e) => setIsFullAutoEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                </label>
              </div>

              {isWebhookEnabled ? (
                <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[11px] text-emerald-400 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Como configurar a URL do Webhook:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[10px] text-muted-foreground leading-relaxed pl-1">
                      <li>Use a URL do seu Gateway (ex: <code>https://api.z-api.io/instances/.../send-text</code>, Evolution API, N8N, Make ou servidor próprio).</li>
                      <li>Deve começar obrigatoriamente com <code>http://</code> ou <code>https://</code>.</li>
                      <li>O sistema enviará um <strong>POST JSON</strong> contendo: <code>phone</code>, <code>message</code>, <code>client</code>, <code>amount</code>, <code>dueDate</code>.</li>
                      <li>Se não tiver gateway, <strong>desative a chave acima</strong> para usar o envio 100% gratuito via WhatsApp Web!</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-muted-foreground uppercase mb-1">Gateway / API (Formato de Envio)</label>
                    <select
                      value={webhookProvider}
                      onChange={(e) => setWebhookProvider(e.target.value as WebhookProvider)}
                      className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-3"
                    >
                      <option value="custom">Payload Completo (Padrão/Customizado)</option>
                      <option value="wzap">WZAP / Z-API</option>
                      <option value="evolution">Evolution API</option>
                      <option value="wppconnect">WPPConnect / W-API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-muted-foreground uppercase mb-1">URL do Webhook do Gateway</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.gateway.com/v1/send"
                      className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-muted-foreground uppercase mb-1">Token de Autorização (Opcional)</label>
                    <input
                      type="password"
                      value={webhookToken}
                      onChange={(e) => setWebhookToken(e.target.value)}
                      placeholder="Bearer token ou API key"
                      className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-zinc-800/20 border border-white/5 rounded-xl text-xs text-muted-foreground leading-relaxed">
                  📢 <strong>Modo WhatsApp Web (Semi-Automático) Ativo:</strong> Ao disparar as mensagens, o sistema abrirá automaticamente abas pré-configuradas no seu navegador para que você só precise clicar em "Enviar" no WhatsApp Web. Não precisa de API paga!
                </div>
              )}

              <button
                onClick={saveAutomationSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                Salvar Configurações
              </button>
            </div>

            {/* 2. MODELOS DE MENSAGEM */}
            <div className="bg-card border rounded-xl p-5 space-y-4 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-foreground">Modelos de Mensagem (Templates)</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground"><code>{'{cliente}'}</code></span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground"><code>{'{aparelho}'}</code></span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground"><code>{'{valor}'}</code></span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground"><code>{'{vencimento}'}</code></span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground"><code>{'{parcela}'}</code></span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Status de Clientes e Pedidos</h4>
                  <p className="text-[11px] text-muted-foreground">Personalize os modelos de WhatsApp enviados ao cadastrar clientes e atualizar o andamento de pedidos.</p>
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">✨ Etapa 1: Boas-Vindas & Cadastro Concluído (Enviado pelo Atendente ao Cliente)</span>
                  <textarea
                    rows={2}
                    value={templateRegistration}
                    onChange={(e) => setTemplateRegistration(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Olá, {cliente}! Aqui é a {atendente}... Confirmamos seu cadastro..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-emerald-400 block mb-1">📱 Confirmação Enviada pelo Cliente (Botão WhatsApp no Link Externo de Cadastro)</span>
                  <textarea
                    rows={2}
                    value={templateClientRemoteConfirm}
                    onChange={(e) => setTemplateClientRemoteConfirm(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-emerald-500/30 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal text-emerald-200"
                    placeholder="Olá! Acabei de concluir meu cadastro na GODSHOP... {cliente}..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Suporta as tags: <code>{'{cliente}'}</code>, <code>{'{cpf}'}</code>, <code>{'{telefone}'}</code>, <code>{'{cidade}'}</code>, <code>{'{uf}'}</code></p>
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">💳 Etapa 2: Pedido Confirmado & Pagamento Aprovado</span>
                  <textarea
                    rows={2}
                    value={templateOrderConfirmed}
                    onChange={(e) => setTemplateOrderConfirmed(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Seu pedido ({aparelho}) foi confirmado..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">📦 Etapa 3: Testes Técnicos & Preparação</span>
                  <textarea
                    rows={2}
                    value={templateOrderPreparing}
                    onChange={(e) => setTemplateOrderPreparing(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Seu pedido ({aparelho}) está em testes..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">🎁 Etapa 4: Embalado & Pronto para Envio (Despacho)</span>
                  <textarea
                    rows={2}
                    value={templateOrderReady}
                    onChange={(e) => setTemplateOrderReady(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Seu pedido ({aparelho}) está pronto para envio..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">🚚 Etapa 5: Despachado & Em Rota de Entrega</span>
                  <textarea
                    rows={2}
                    value={templateOrderOnWay}
                    onChange={(e) => setTemplateOrderOnWay(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Seu pedido ({aparelho}) saiu para entrega..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">🎉 Etapa 6: Pedido Entregue com Sucesso</span>
                  <textarea
                    rows={2}
                    value={templateOrderDelivered}
                    onChange={(e) => setTemplateOrderDelivered(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Seu pedido ({aparelho}) foi entregue..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">🛡️ Etapa 7: Termo de Garantia Oficial Ativado</span>
                  <textarea
                    rows={2}
                    value={templateGuaranteeSent}
                    onChange={(e) => setTemplateGuaranteeSent(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Sua garantia referente ao {aparelho}..."
                  />
                </div>

                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">🤍 Etapa 8: Agradecimento & Pós-Venda VIP</span>
                  <textarea
                    rows={2}
                    value={templateOrderThankYou}
                    onChange={(e) => setTemplateOrderThankYou(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                    placeholder="Prezado(a) {cliente}... Muito obrigado por comprar seu {aparelho}..."
                  />
                </div>

                <div className="pt-3 border-t border-white/10">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Lembretes de Carnê e Vencimentos</h4>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-bold text-foreground block mb-1">Aviso Prévio (Faltando 3 Dias)</span>
                      <textarea
                        rows={2}
                        value={template3Days}
                        onChange={(e) => setTemplate3Days(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                        placeholder="Olá, {cliente}... vencendo em 3 dias..."
                      />
                    </div>

                    <div>
                      <span className="text-xs font-bold text-foreground block mb-1">Aviso no Dia do Vencimento</span>
                      <textarea
                        rows={2}
                        value={templateDayOf}
                        onChange={(e) => setTemplateDayOf(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                        placeholder="Olá, {cliente}... vencendo hoje..."
                      />
                    </div>

                    <div>
                      <span className="text-xs font-bold text-foreground block mb-1">Alerta de Atraso (Após Vencimento)</span>
                      <textarea
                        rows={2}
                        value={templateOverdue}
                        onChange={(e) => setTemplateOverdue(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border dark:bg-zinc-950/50 bg-black/5 dark:border-white/10 border-black/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-normal"
                        placeholder="Olá, {cliente}... vencido e pendente..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FILA DE DISPARO DO DIA */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">Fila de Disparos de Lembretes</h3>
                  <p className="text-[11px] text-muted-foreground">Clientes com parcelas vencendo hoje, atrasadas ou faltando 3 dias.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground mr-1">
                  <strong>{pendingNotifications.length}</strong> pendências hoje
                </span>
                <button
                  onClick={handleSendAll}
                  disabled={isSendingAll || pendingNotifications.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-black px-4 py-2 rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Disparar em Lote
                </button>
              </div>
            </div>

            {pendingNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>Nenhuma notificação de parcela ativa na fila de hoje!</p>
                <p className="text-xs opacity-50">Todas as parcelas estão em dia ou os clientes já receberam avisos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-zinc-900/50 text-muted-foreground font-semibold">
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Parcela / Valor</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Mensagem Prevista</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingNotifications.map((item) => {
                      const msgText = getMessageText(item);
                      const status = sendingStatuses[item.id] || 'idle';
                      
                      let diffLabel = '';
                      let diffClass = '';
                      if (item.daysDiff === 0) {
                        diffLabel = 'Vence Hoje';
                        diffClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      } else if (item.daysDiff === 1) {
                        diffLabel = 'Vence Amanhã';
                        diffClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      } else if (item.daysDiff === 2) {
                        diffLabel = 'Vence em 2 dias';
                        diffClass = 'bg-blue-500/5 text-blue-400/90 border-blue-500/10';
                      } else if (item.daysDiff === 3) {
                        diffLabel = 'Vence em 3 dias';
                        diffClass = 'bg-emerald-500/5 text-emerald-400/95 border-emerald-500/10';
                      } else if (item.daysDiff === -1) {
                        diffLabel = 'Vencido Ontem';
                        diffClass = 'bg-red-500/10 text-red-400 font-bold border-red-500/20 animate-pulse';
                      } else {
                        diffLabel = `Atrasado há ${Math.abs(item.daysDiff)} dias`;
                        diffClass = 'bg-rose-500/10 text-rose-500 font-bold border-rose-500/20';
                      }

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition duration-150">
                          <td className="p-4">
                            <p className="font-bold text-foreground">{item.clientName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.clientPhone || 'Sem celular'}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold">{item.installmentIndex}ª Parcela</p>
                            <p className="text-muted-foreground mt-0.5">{formatBRL(item.expectedAmount)}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium">{format(item.dueDate, 'dd/MM/yyyy')}</p>
                            <span className={cn(
                              "inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1 font-bold",
                              diffClass
                            )}>
                              {diffLabel}
                            </span>
                          </td>
                          <td className="p-4 max-w-xs truncate text-muted-foreground" title={msgText}>
                            {msgText}
                          </td>
                          <td className="p-4">
                            {status === 'idle' && (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700/50">Pendente</span>
                            )}
                            {status === 'sending' && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 w-max animate-pulse">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                Enviando...
                              </span>
                            )}
                            {status === 'success' && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 w-max">
                                <Check className="h-3 w-3" />
                                Enviado!
                              </span>
                            )}
                            {status === 'failed' && (
                              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1 w-max">
                                <AlertTriangle className="h-3 w-3" />
                                Falha
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSendSingle(item)}
                              className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold py-1 px-2.5 rounded-md text-[10px] transition duration-200 flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Send className="h-2.5 w-2.5" />
                              {isWebhookEnabled ? 'API' : 'WhatsApp'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. LOGS DE ENVIO ANTERIORES */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-bold text-sm text-foreground">Histórico de Disparos de Hoje</h3>
              </div>
              {sentLogs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] font-bold text-destructive hover:underline cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            {sentLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Nenhum disparo registrado nesta sessão.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-zinc-900/30 text-muted-foreground">
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Aparelho / Parcela</th>
                      <th className="p-3">Método</th>
                      <th className="p-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sentLogs.map((log) => (
                      <tr key={log.id} className="text-muted-foreground">
                        <td className="p-3 font-mono text-[10px]">{log.sentAt}</td>
                        <td className="p-3 font-semibold text-foreground">{log.clientName}</td>
                        <td className="p-3">{log.itemName} ({log.installmentIndex}ª Parcela)</td>
                        <td className="p-3">
                          {log.method === 'webhook' ? (
                            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-foreground">Webhook</span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 text-emerald-400">WhatsApp Web</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {log.status === 'success' ? (
                            <span className="text-emerald-500 font-bold text-[10px]">✓ Sucesso</span>
                          ) : (
                            <span className="text-red-500 font-bold text-[10px]">✗ Falhou</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <StorageExplorer 
        isOpen={isStorageExplorerOpen} 
        onClose={() => setIsStorageExplorerOpen(false)} 
      />
    </div>
  );
}
