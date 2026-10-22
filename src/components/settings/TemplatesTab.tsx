import React, { useState } from 'react';
import { 
  FileText, Pencil, Check, X, RotateCcw, Copy, Sparkles, Search, Filter, 
  MessageSquare, CheckCircle2, ChevronRight, Eye, Code, Smartphone, HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { copyToClipboard } from '../../utils/url';

export interface TemplateItem {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  category: 'pedidos' | 'cobranca';
  value: string;
  setter: (val: string) => void;
  storageKey: string;
  defaultVal: string;
  supportedTags: string[];
}

interface TemplatesTabProps {
  templates: TemplateItem[];
  attendantName: string;
  storePhone: string;
  pixInfo: string;
  onSaveAll: () => Promise<void> | void;
}

export default function TemplatesTab({
  templates,
  attendantName,
  storePhone,
  pixInfo,
  onSaveAll
}: TemplatesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pedidos' | 'cobranca'>('all');
  const [editingStates, setEditingStates] = useState<{ [id: string]: boolean }>({});
  const [draftValues, setDraftValues] = useState<{ [id: string]: string }>({});
  const [previewRealData, setPreviewRealData] = useState<{ [id: string]: boolean }>({});

  // Filter templates based on category and search query
  const filtered = templates.filter(tmpl => {
    if (categoryFilter === 'pedidos' && tmpl.category !== 'pedidos') return false;
    if (categoryFilter === 'cobranca' && tmpl.category !== 'cobranca') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = tmpl.title.toLowerCase().includes(q);
      const matchesSubtitle = tmpl.subtitle.toLowerCase().includes(q);
      const matchesStep = tmpl.step.toLowerCase().includes(q);
      const currentValue = draftValues[tmpl.id] !== undefined ? draftValues[tmpl.id] : tmpl.value;
      const matchesText = currentValue.toLowerCase().includes(q);
      return matchesTitle || matchesSubtitle || matchesStep || matchesText;
    }
    return true;
  });

  const handleStartEdit = (id: string, currentValue: string) => {
    setDraftValues(prev => ({ ...prev, [id]: currentValue }));
    setEditingStates(prev => ({ ...prev, [id]: true }));
  };

  const handleCancelEdit = (id: string) => {
    setEditingStates(prev => ({ ...prev, [id]: false }));
  };

  const handleSaveEdit = async (tmpl: TemplateItem) => {
    const valToSave = draftValues[tmpl.id] !== undefined ? draftValues[tmpl.id] : tmpl.value;
    tmpl.setter(valToSave);
    localStorage.setItem(tmpl.storageKey, valToSave);
    setEditingStates(prev => ({ ...prev, [tmpl.id]: false }));
    toast.success(`Modelo "${tmpl.title}" salvo com sucesso! 💾`);
  };

  const handleResetToDefault = (tmpl: TemplateItem) => {
    if (confirm(`Deseja restaurar o modelo "${tmpl.title}" para o texto padrão original da GODSHOP?`)) {
      tmpl.setter(tmpl.defaultVal);
      setDraftValues(prev => ({ ...prev, [tmpl.id]: tmpl.defaultVal }));
      localStorage.setItem(tmpl.storageKey, tmpl.defaultVal);
      setEditingStates(prev => ({ ...prev, [tmpl.id]: false }));
      toast.info(`Modelo "${tmpl.title}" restaurado para o padrão original.`);
    }
  };

  const handleInsertTagAtCursor = (tmplId: string, tag: string) => {
    const currentVal = draftValues[tmplId] !== undefined 
      ? draftValues[tmplId] 
      : (templates.find(t => t.id === tmplId)?.value || '');
    
    const newVal = currentVal ? `${currentVal} ${tag}` : tag;
    setDraftValues(prev => ({ ...prev, [tmplId]: newVal }));
    toast.info(`Tag ${tag} adicionada ao modelo!`);
  };

  const handleCopyTag = async (tag: string) => {
    await copyToClipboard(tag);
    toast.success(`Tag ${tag} copiada para a área de transferência!`);
  };

  const handleCopyText = async (text: string) => {
    await copyToClipboard(text);
    toast.success('Texto do modelo copiado!');
  };

  const setAllEditMode = (editing: boolean) => {
    const nextStates: { [id: string]: boolean } = {};
    const nextDrafts: { [id: string]: string } = {};

    templates.forEach(t => {
      nextStates[t.id] = editing;
      if (editing && draftValues[t.id] === undefined) {
        nextDrafts[t.id] = t.value;
      }
    });

    setEditingStates(nextStates);
    if (editing) {
      setDraftValues(prev => ({ ...prev, ...nextDrafts }));
      toast.info('Modo de edição habilitado para todos os modelos.');
    } else {
      toast.info('Modo de edição fechado.');
    }
  };

  // Replace tags with sample dummy data for visual preview
  const getSimulatedPreview = (rawText: string) => {
    return rawText
      .replace(/{cliente}/g, 'João da Silva')
      .replace(/{aparelho}/g, 'iPhone 15 Pro Max 256GB Titânio Natural')
      .replace(/{parcela}/g, '2')
      .replace(/{valor}/g, 'R$ 650,00')
      .replace(/{vencimento}/g, '25/11/2026')
      .replace(/{atendente}/g, attendantName || 'Karen')
      .replace(/{loja}/g, 'GODSHOP')
      .replace(/{pix}/g, pixInfo || '13036942637 - Kaleb dos Santos Gonçalves')
      .replace(/{cpf}/g, '123.456.789-00')
      .replace(/{telefone}/g, '(32) 99999-8888')
      .replace(/{cidade}/g, 'Juiz de Fora')
      .replace(/{uf}/g, 'MG');
  };

  const allTagsList = [
    { tag: '{cliente}', desc: 'Nome completo ou primeiro nome do cliente' },
    { tag: '{aparelho}', desc: 'Modelo do iPhone ou Console adquirido' },
    { tag: '{parcela}', desc: 'Número da parcela do carnê (ex: 2ª)' },
    { tag: '{valor}', desc: 'Valor formatado em R$ da parcela ou total' },
    { tag: '{vencimento}', desc: 'Data de vencimento da parcela (dd/mm/aaaa)' },
    { tag: '{atendente}', desc: 'Nome do atendente configurado no sistema' },
    { tag: '{pix}', desc: 'Chave PIX oficial da loja e titular da conta' },
    { tag: '{cpf}', desc: 'CPF cadastrado do comprador' },
    { tag: '{cidade}', desc: 'Cidade de residência do cliente' },
    { tag: '{uf}', desc: 'Estado / UF do cliente' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Actions Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileText className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Modelos de Mensagem & Templates WhatsApp
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Personalize as mensagens disparadas pelo sistema nas etapas de venda e avisos de carnê. 
            Clique em <strong>Editar</strong> no modelo desejado, ajuste o texto com as variáveis e clique em <strong>Salvar</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAllEditMode(true)}
            className="bg-white/5 hover:bg-white/10 text-foreground border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
            Editar Todos
          </button>
          
          <button
            type="button"
            onClick={async () => {
              // Salva todos os drafts
              for (const tmpl of templates) {
                const val = draftValues[tmpl.id] !== undefined ? draftValues[tmpl.id] : tmpl.value;
                tmpl.setter(val);
                localStorage.setItem(tmpl.storageKey, val);
              }
              setEditingStates({});
              if (onSaveAll) await onSaveAll();
              toast.success('Todos os modelos de mensagem foram salvos com sucesso! 💾');
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Salvar Todos os Modelos
          </button>
        </div>
      </div>

      {/* Guide to Dynamic Tags */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Variáveis Dinâmicas Disponíveis (Tags)
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Clique em qualquer tag para copiá-la
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          O sistema substitui essas tags automaticamente pelos dados reais do cliente e da compra no momento do envio:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {allTagsList.map(({ tag, desc }) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleCopyTag(tag)}
              title={desc}
              className="text-left p-2.5 rounded-lg bg-muted/30 hover:bg-muted/70 border border-border/50 transition cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  {tag}
                </span>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition" />
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-sm">
        {/* Category switcher pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer",
              categoryFilter === 'all'
                ? "bg-white text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('pedidos')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer",
              categoryFilter === 'pedidos'
                ? "bg-white text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Etapas de Pedidos & Cadastro (10)
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('cobranca')}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer",
              categoryFilter === 'cobranca'
                ? "bg-white text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Carnês & Cobranças (3)
          </button>
        </div>

        {/* Search input */}
        <div className="relative sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar modelo..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-background border border-input focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-card border rounded-xl p-8 text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-semibold text-foreground">Nenhum modelo encontrado</p>
            <p className="text-xs text-muted-foreground">Tente limpar o termo de busca ou trocar a categoria de filtro.</p>
          </div>
        ) : (
          filtered.map((tmpl) => {
            const isEditing = Boolean(editingStates[tmpl.id]);
            const currentValue = draftValues[tmpl.id] !== undefined ? draftValues[tmpl.id] : tmpl.value;
            const isPreviewingReal = Boolean(previewRealData[tmpl.id]);
            const displayPreview = isPreviewingReal ? getSimulatedPreview(currentValue) : currentValue;

            return (
              <div 
                key={tmpl.id} 
                className={cn(
                  "bg-card border rounded-2xl shadow-sm transition-all overflow-hidden",
                  isEditing 
                    ? "border-emerald-500/50 ring-2 ring-emerald-500/20" 
                    : "border-border/80 hover:border-border"
                )}
              >
                {/* Card Header with Step, Title, Description, and Action Buttons */}
                <div className="p-4 sm:p-5 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/10">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                        tmpl.category === 'cobranca'
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {tmpl.step}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">
                        {tmpl.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tmpl.subtitle}
                    </p>
                  </div>

                  {/* Actions for this specific template: EDITAR and SALVAR */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    {!isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewRealData(prev => ({ ...prev, [tmpl.id]: !prev[tmpl.id] }))}
                          title={isPreviewingReal ? "Ver código original" : "Simular com dados reais de cliente"}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border",
                            isPreviewingReal
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                              : "bg-background border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            {isPreviewingReal ? 'Ver com Tags' : 'Simular Real'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(currentValue)}
                          title="Copiar texto do modelo"
                          className="p-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetToDefault(tmpl)}
                          title="Restaurar padrão da loja"
                          className="p-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        {/* BOTÃO EDITAR */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tmpl.id, tmpl.value)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar Modelo
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(tmpl.id)}
                          className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetToDefault(tmpl)}
                          title="Restaurar padrão original"
                          className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        {/* BOTÃO SALVAR */}
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tmpl)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition cursor-pointer animate-pulse"
                        >
                          <Check className="h-4 w-4" />
                          Salvar Alterações
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  {isEditing ? (
                    /* EDITING MODE */
                    <div className="space-y-3">
                      {/* Quick Tag Pills Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1">
                          <Code className="h-3 w-3 text-emerald-400" />
                          Inserir tag:
                        </span>
                        {tmpl.supportedTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertTagAtCursor(tmpl.id, tag)}
                            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-background hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-border/50 hover:border-emerald-500/30 transition cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>

                      {/* Textarea */}
                      <div className="relative">
                        <textarea
                          rows={6}
                          value={currentValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftValues(prev => ({ ...prev, [tmpl.id]: val }));
                          }}
                          className="w-full p-3.5 rounded-xl bg-background border border-emerald-500/40 text-xs text-foreground font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none custom-scrollbar"
                          placeholder="Digite o texto da mensagem..."
                        />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 mt-1">
                          <span>Dica: Quebras de linha e emojis são mantidos no WhatsApp.</span>
                          <span>{currentValue.length} caracteres</span>
                        </div>
                      </div>

                      {/* Bottom Save Bar inside Editing mode */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                          Em modo de edição
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCancelEdit(tmpl.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tmpl)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Salvar Modelo Agora
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PREVIEW / READ ONLY MODE */
                    <div className="space-y-2">
                      <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-xs text-foreground whitespace-pre-line leading-relaxed font-sans relative group">
                        {displayPreview}

                        {isPreviewingReal && (
                          <div className="absolute top-2 right-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
                            Simulação com Dados Reais
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-semibold text-foreground">Tags suportadas:</span>
                          {tmpl.supportedTags.map(tag => (
                            <span key={tag} className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(tmpl.id, tmpl.value)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar este modelo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
