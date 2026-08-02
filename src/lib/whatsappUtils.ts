/**
 * WhatsApp status notification helper & default message templates
 */

export const DEFAULT_STATUS_TEMPLATES = {
  registration: "Prezado(a) {cliente},\n\nÉ um prazer tê-lo(a) conosco! Confirmamos que seu cadastro na GODSHOP foi concluído com sucesso em nosso sistema.\n\n📍 *Status:* Cadastro Realizado e Ativo.\n\nQualquer dúvida, nossa equipe está à total disposição!\n\nAtenciosamente,\n*Equipe GODSHOP* 📱✨",
  
  order_confirmed: "Prezado(a) {cliente},\n\nSeu pedido ({aparelho}) foi confirmado com sucesso em nosso sistema e o pagamento já foi aprovado!\n\n📍 *Status:* Pedido Confirmado e Registrado.\n\nAtenciosamente,\n*Atendimento GODSHOP* 💳✅",
  
  order_preparing: "Prezado(a) {cliente},\n\nSeu pedido ({aparelho}) está em fase de preparação! Nossa equipe técnica está realizando a inspeção detalhada de bateria, câmeras e conectores, além da higienização e embalagem de proteção.\n\n📍 *Status:* Em Separação e Testes de Qualidade.\n\nAtenciosamente,\n*Controle de Qualidade GODSHOP* 📦🔍",
  
  order_ready: "Prezado(a) {cliente},\n\nExcelente notícia! Seu pedido ({aparelho}) foi totalmente conferido, embalado e está PRONTO PARA ENVIO!\n\n📍 *Status:* Embalado e Aguardando Coleta/Despacho.\n\nAtenciosamente,\n*Expedição GODSHOP* 🎁📦",
  
  order_on_way: "Prezado(a) {cliente},\n\nSeu pedido ({aparelho}) acabou de ser despachado e já está EM ROTA DE ENTREGA para o seu endereço!\n\n📍 *Status:* Em Trânsito / Rota de Entrega. Pedimos a gentileza de manter alguém no local para o recebimento.\n\nÓtimo dia!\n*Logística GODSHOP* 🚚📲",
  
  order_delivered: "Prezado(a) {cliente},\n\nConsta em nosso sistema que seu pedido ({aparelho}) foi ENTREGUE com sucesso no seu endereço!\n\n📍 *Status:* Entregue com Sucesso.\n\nQualquer dúvida ou suporte inicial, fale conosco por aqui!\n*GODSHOP Entregas* 🎉📱",
  
  guarantee_sent: "Prezado(a) {cliente},\n\nSeu Termo de Garantia Oficial para o dispositivo ({aparelho}) foi devidamente ativado em nosso banco de dados!\n\n📍 *Status:* Garantia Oficial Ativada.\n\nGuarde esta mensagem como comprovante.\n*Suporte & Garantia GODSHOP* 🛡️📋",
  
  order_thank_you: "Prezado(a) {cliente},\n\nMuito obrigado por comprar seu {aparelho} na GODSHOP! É uma honra ter você como nosso cliente.\n\n📍 *Status:* Pedido Concluído com Sucesso.\n\nAproveite seu novo aparelho! Conte sempre com nosso atendimento pós-venda.\n\nAtenciosamente,\n*Equipe GODSHOP* 🤍📱"
};

export type WhatsAppStatusType = 
  | 'registration' 
  | 'order_confirmed'
  | 'order_preparing' 
  | 'order_ready'
  | 'order_on_way' 
  | 'order_delivered'
  | 'guarantee_sent'
  | 'order_thank_you';

export const STATUS_LABELS: Record<WhatsAppStatusType, { 
  step: number; 
  label: string; 
  icon: string; 
  description: string; 
  nextStep: string; 
  badgeColor: string 
}> = {
  registration: {
    step: 1,
    label: '1. Cadastro Concluído',
    icon: '✨',
    description: 'Boas-vindas e confirmação de cadastro',
    nextStep: 'Aguardando confirmação do pedido',
    badgeColor: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300'
  },
  order_confirmed: {
    step: 2,
    label: '2. Pedido Confirmado',
    icon: '💳',
    description: 'Pagamento aprovado e ordem registrada',
    nextStep: 'Encaminhamento para bancada técnica',
    badgeColor: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/40 text-cyan-300'
  },
  order_preparing: {
    step: 3,
    label: '3. Testes & Preparação',
    icon: '📦',
    description: 'Inspeção de bateria, conectores e embalagem',
    nextStep: 'Lacração e etiqueta de envio',
    badgeColor: 'from-blue-500/20 to-blue-600/10 border-blue-500/40 text-blue-300'
  },
  order_ready: {
    step: 4,
    label: '4. Pronto para Envio',
    icon: '🎁',
    description: 'Embalado e aguardando despacho/coleta',
    nextStep: 'Saída com o entregador/motoboy',
    badgeColor: 'from-purple-500/20 to-purple-600/10 border-purple-500/40 text-purple-300'
  },
  order_on_way: {
    step: 5,
    label: '5. Em Rota de Entrega',
    icon: '🚚',
    description: 'Despachado e a caminho do seu endereço',
    nextStep: 'Recebimento no endereço do cliente',
    badgeColor: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300'
  },
  order_delivered: {
    step: 6,
    label: '6. Entregue ao Cliente',
    icon: '🎉',
    description: 'Entrega efetuada com sucesso no destino',
    nextStep: 'Ativação do termo de garantia',
    badgeColor: 'from-teal-500/20 to-teal-600/10 border-teal-500/40 text-teal-300'
  },
  guarantee_sent: {
    step: 7,
    label: '7. Garantia Ativada',
    icon: '🛡️',
    description: 'Termo de garantia de fábrica/loja ativo',
    nextStep: 'Suporte técnico prioritário',
    badgeColor: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/40 text-indigo-300'
  },
  order_thank_you: {
    step: 8,
    label: '8. Agradecimento & Pós-Venda',
    icon: '🤍',
    description: 'Conclusão de pedido e canal de pós-venda',
    nextStep: 'Suporte contínuo & Atendimento VIP',
    badgeColor: 'from-rose-500/20 to-rose-600/10 border-rose-500/40 text-rose-300'
  }
};

/**
 * Gets the saved template or falls back to default.
 */
export function getSavedStatusTemplate(type: WhatsAppStatusType): string {
  if (typeof window === 'undefined') return DEFAULT_STATUS_TEMPLATES[type];
  const storageKey = `auto_template_${type}`;
  const saved = localStorage.getItem(storageKey);
  return saved || DEFAULT_STATUS_TEMPLATES[type];
}

/**
 * Formats a message string replacing variables like {cliente}, {aparelho}, {loja}.
 */
export function formatStatusMessage(
  template: string,
  data: {
    clientName?: string;
    itemName?: string;
    storeName?: string;
    price?: string;
    dueDate?: string;
  }
): string {
  const clientName = data.clientName?.trim() || 'Cliente';
  const itemName = data.itemName?.trim() || 'produto';
  const storeName = data.storeName?.trim() || 'GODSHOP';

  return template
    .replace(/\{cliente\}/gi, clientName)
    .replace(/\{aparelho\}/gi, itemName)
    .replace(/\{item\}/gi, itemName)
    .replace(/\{produto\}/gi, itemName)
    .replace(/\{loja\}/gi, storeName)
    .replace(/\{valor\}/gi, data.price || '')
    .replace(/\{vencimento\}/gi, data.dueDate || '');
}

/**
 * Clean phone number and generate WhatsApp URL.
 */
export function buildWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone) return '#';
  
  // Ensure Brazil country code if 10 or 11 digits
  const formattedPhone = cleanPhone.length === 10 || cleanPhone.length === 11 
    ? `55${cleanPhone}` 
    : cleanPhone;

  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
}

/**
 * Directly opens WhatsApp window with encoded message.
 */
export function openWhatsAppMessage(phone: string, text: string): boolean {
  const url = buildWhatsAppUrl(phone, text);
  if (url === '#') return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
