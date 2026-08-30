import React, { useState, useEffect } from 'react';
import { 
  Upload, LogOut, Image as ImageIcon, Smartphone, Database, Download, FileJson, Search, 
  Trash2, Plus, Sun, Moon, Cloud, ShieldAlert, User, LogIn, MessageSquare, Send, Play, 
  CheckCircle2, AlertTriangle, RefreshCw, Settings as SettingsIcon, FileText, Layers, Bot, ChevronRight, Check
} from 'lucide-react';
import { useAuth } from '../types/AuthContext';
import { toast } from 'sonner';
import { backupService } from '../services/backupService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { addDays, addMonths, startOfDay, differenceInDays, format } from 'date-fns';
import { parseLocalDate, getSaleNotifications } from '../lib/dateUtils';
import { DEFAULT_STATUS_TEMPLATES } from '../lib/whatsappUtils';
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
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });

  // Navigation tab for settings
  const [activeTab, setActiveTab] = useState<'geral' | 'backup' | 'automacao'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'automacao') return 'automacao';
    if (tabParam === 'backup') return 'backup';
    return 'geral';
  });

  // Sync tab state when URL parameters change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'automacao') {
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
        console.error('Error syncing automation settings to server:', err);
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
        const res = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhookToken ? { 'Authorization': `Bearer ${webhookToken}` } : {})
          },
          body: JSON.stringify({
            phone,
            message: text,
            clientName: item.clientName,
            itemName: item.itemName,
            installmentIndex: item.installmentIndex,
            expectedAmount: item.expectedAmount,
            dueDate: format(typeof item.dueDate === 'string' ? parseLocalDate(item.dueDate) : item.dueDate, 'yyyy-MM-dd')
          })
        });

        if (res.ok) {
          toast.success(`Mensagem enviada com sucesso para ${item.clientName}!`);
          setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
          addLog(item, 'success', 'webhook');
        } else {
          throw new Error('Falha no webhook');
        }
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
          const res = await fetch(webhookUrl.trim(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhookToken ? { 'Authorization': `Bearer ${webhookToken}` } : {})
            },
            body: JSON.stringify({
              phone: item.clientPhone,
              message: text,
              clientName: item.clientName,
              itemName: item.itemName,
              installmentIndex: item.installmentIndex,
              expectedAmount: item.expectedAmount,
              dueDate: format(typeof item.dueDate === 'string' ? parseLocalDate(item.dueDate) : item.dueDate, 'yyyy-MM-dd')
            })
          });

          if (res.ok) {
            successCount++;
            setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
            addLog(item, 'success', 'webhook');
          } else {
            // Fallback to WhatsApp Web if Webhook fails
            const url = `https://api.whatsapp.com/send?phone=${item.clientPhone}&text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            successCount++;
            setSendingStatuses(prev => ({ ...prev, [item.id]: 'success' }));
            addLog(item, 'success', 'whatsapp_web');
          }
        } catch (e) {
          // Fallback to WhatsApp Web on network error
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
      setLogoPreview(localStorage.getItem('app_logo') || null);

      try {
        const queryParams = user?.id ? `?userId=${user.id}` : '';
        const res = await fetch(`/api/settings${queryParams}`);
        if (res.ok) {
          const s = await res.json();
          if (s.app_background) {
            setBgPreview(s.app_background);
            localStorage.setItem('app_background', s.app_background);
          }
          if (s.app_logo !== undefined) {
            setLogoPreview(s.app_logo);
            if (s.app_logo) localStorage.setItem('app_logo', s.app_logo);
            else localStorage.removeItem('app_logo');
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
    try {
      const data = await backupService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_sistema_godshop_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      try {
        if (a && a.parentNode) {
          a.parentNode.removeChild(a);
        }
      } catch (e) {}
      URL.revokeObjectURL(url);
      toast.success('Cópia de segurança exportada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao exportar backup: ' + err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = await backupService.importData(json);
        if (result.success) {
          toast.success(result.message);
          queryClient.invalidateQueries();
        } else {
          toast.error(result.message);
        }
      } catch (err: any) {
        toast.error('Arquivo de backup corrompido ou inválido: ' + err.message);
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
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
                    const res = await db.pushToCloud();
                    if (res.success) {
                      toast.success('Todos os dados deste dispositivo foram enviados e salvos na nuvem com sucesso! Acesse de qualquer PC, notebook ou celular.');
                      await loadCloudStats();
                    } else {
                      toast.error(res.message);
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
                    const res = await db.pullFromCloud();
                    if (res.success) {
                      toast.success(res.message);
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
                    Baixa um arquivo JSON com todas as vendas, estoque, fornecedores e clientes no aparelho.
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Exportar Backup Local
                </button>
              </div>

              {/* Import card */}
              <div className="border border-border rounded-xl p-4 bg-muted/10 hover:bg-muted/25 transition flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-1">
                    <FileJson className="h-4 w-4 text-amber-500" />
                    Carregar Backup Existente (Importar)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Selecione o arquivo de backup <code>.json</code> salvo anteriormente para substituir o banco de dados local.
                  </p>
                </div>
                <label className="w-full bg-amber-500 text-black hover:bg-amber-600 py-2.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center">
                  {isImporting ? (
                    <>
                      <div className="h-3 w-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Restaurando dados...
                    </>
                  ) : (
                    <>
                      <FileJson className="h-4 w-4" />
                      Importar Arquivo de Backup
                    </>
                  )}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

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
