import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  StudioProject, StudioElement, StudioCanvasFormat, StudioLinkedProduct, StudioTemplate 
} from '../types/studio';
import { studioService, FORMAT_DIMENSIONS } from '../services/studioService';
import { STUDIO_TEMPLATES } from '../components/Studio/templates';
import ArtCanvas from '../components/Studio/ArtCanvas';
import StudioToolbar from '../components/Studio/StudioToolbar';
import ProductSelectorModal from '../components/Studio/ProductSelectorModal';
import AiStudioModal from '../components/Studio/AiStudioModal';
import VideoEditor from '../components/Studio/VideoEditor';
import CampaignsAndLibrary from '../components/Studio/CampaignsAndLibrary';
import PrivateCalculator from '../components/Studio/PrivateCalculator';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { toast } from 'sonner';
import html2canvas from 'html2canvas-pro';
import { 
  Wand2, Sparkles, Film, Image as ImageIcon, Plus, Folder, 
  Calculator, Download, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, 
  ArrowLeft, RefreshCw, AlertTriangle, Check, Share2, Layers, 
  LayoutTemplate, Smartphone, Tv, Tag, ChevronRight, Play, Eye
} from 'lucide-react';

export default function Studio() {
  // Top-level Studio Navigation
  const [viewMode, setViewMode] = useState<'hub' | 'editor' | 'video' | 'campaigns' | 'calculator'>('hub');

  // Active Project & Canvas State
  const [currentProject, setCurrentProject] = useState<StudioProject>(() => {
    return studioService.createProjectFromTemplate(STUDIO_TEMPLATES[0], 'Meu Primeiro Anúncio VIP');
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.85);

  // Undo / Redo history
  const [history, setHistory] = useState<StudioProject[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoAction = useRef(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [catalogPriceWarning, setCatalogPriceWarning] = useState<{ originalPrice: number; currentPrice: number } | null>(null);

  // Canvas export reference
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Projects list for Hub
  const [recentProjects, setRecentProjects] = useState<StudioProject[]>(() => studioService.getProjects());

  // Record history for Undo/Redo
  const pushHistory = useCallback((newProject: StudioProject) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory(prev => {
      const slice = prev.slice(0, historyIndex + 1);
      return [...slice, JSON.parse(JSON.stringify(newProject))].slice(-25); // max 25 history steps
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Initial history record on project change
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(currentProject))]);
      setHistoryIndex(0);
    }
  }, []);

  // Update project state with auto-history
  const handleUpdateProject = (updates: Partial<StudioProject>) => {
    setCurrentProject(prev => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      studioService.saveProject(updated);
      pushHistory(updated);
      return updated;
    });
  };

  // Undo handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setCurrentProject(JSON.parse(JSON.stringify(target)));
      studioService.saveProject(target);
      toast.info('Ação desfeita');
    }
  };

  // Redo handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setCurrentProject(JSON.parse(JSON.stringify(target)));
      studioService.saveProject(target);
      toast.info('Ação refeita');
    }
  };

  // Element CRUD handlers
  const handleUpdateElement = (id: string, updates: Partial<StudioElement>) => {
    setCurrentProject(prev => {
      const updatedElements = prev.elements.map(el => el.id === id ? { ...el, ...updates } : el);
      const updatedProject = { ...prev, elements: updatedElements, updatedAt: new Date().toISOString() };
      studioService.saveProject(updatedProject);
      return updatedProject;
    });
  };

  const handleAddElement = (element: StudioElement) => {
    setCurrentProject(prev => {
      const updatedElements = [...prev.elements, element];
      const updatedProject = { ...prev, elements: updatedElements, updatedAt: new Date().toISOString() };
      studioService.saveProject(updatedProject);
      pushHistory(updatedProject);
      setSelectedElementId(element.id);
      return updatedProject;
    });
    toast.success('Elemento adicionado');
  };

  const handleDeleteElement = (id: string) => {
    setCurrentProject(prev => {
      const updatedElements = prev.elements.filter(el => el.id !== id);
      const updatedProject = { ...prev, elements: updatedElements, updatedAt: new Date().toISOString() };
      studioService.saveProject(updatedProject);
      pushHistory(updatedProject);
      setSelectedElementId(null);
      return updatedProject;
    });
    toast.info('Elemento excluído');
  };

  const handleDuplicateElement = (id: string) => {
    const el = currentProject.elements.find(e => e.id === id);
    if (!el) return;

    const copy: StudioElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${Date.now()}_copy`,
      x: Math.min(el.x + 3, 90),
      y: Math.min(el.y + 3, 90),
      zIndex: currentProject.elements.length + 1
    };

    handleAddElement(copy);
  };

  const handleBringForward = (id: string) => {
    setCurrentProject(prev => {
      const idx = prev.elements.findIndex(e => e.id === id);
      if (idx === -1 || idx === prev.elements.length - 1) return prev;
      const newEls = [...prev.elements];
      const temp = newEls[idx];
      newEls[idx] = newEls[idx + 1];
      newEls[idx + 1] = temp;
      newEls.forEach((e, i) => { e.zIndex = i + 1; });
      const updated = { ...prev, elements: newEls };
      studioService.saveProject(updated);
      return updated;
    });
  };

  const handleSendBackward = (id: string) => {
    setCurrentProject(prev => {
      const idx = prev.elements.findIndex(e => e.id === id);
      if (idx <= 0) return prev;
      const newEls = [...prev.elements];
      const temp = newEls[idx];
      newEls[idx] = newEls[idx - 1];
      newEls[idx - 1] = temp;
      newEls.forEach((e, i) => { e.zIndex = i + 1; });
      const updated = { ...prev, elements: newEls };
      studioService.saveProject(updated);
      return updated;
    });
  };

  // Check if linked catalog product had its price modified in database
  useEffect(() => {
    const checkProductPrice = async () => {
      if (!currentProject.linkedProduct) {
        setCatalogPriceWarning(null);
        return;
      }

      try {
        const prodId = currentProject.linkedProduct.id;
        let freshPrice: number | null = null;

        if (currentProject.linkedProduct.type === 'iphone') {
          const iphones = await db.iphones.list();
          const found = iphones.find(i => i.id === prodId);
          if (found && found.sell_price) freshPrice = found.sell_price;
        } else if (currentProject.linkedProduct.type === 'console') {
          const consoles = await db.consoles.list();
          const found = consoles.find(c => c.id === prodId);
          if (found && found.sell_price) freshPrice = found.sell_price;
        }

        if (freshPrice !== null && freshPrice !== currentProject.linkedProduct.price) {
          setCatalogPriceWarning({
            originalPrice: currentProject.linkedProduct.price,
            currentPrice: freshPrice
          });
        } else {
          setCatalogPriceWarning(null);
        }
      } catch (e) {
        // Silently continue
      }
    };

    checkProductPrice();
  }, [currentProject.linkedProduct]);

  // Sync latest price from database
  const handleSyncPriceFromDatabase = () => {
    if (!catalogPriceWarning || !currentProject.linkedProduct) return;

    const newPrice = catalogPriceWarning.currentPrice;
    const installments = `12x de ${formatBRL((newPrice * 1.1) / 12)}`;

    // Update elements that display price
    const updatedElements = currentProject.elements.map(el => {
      if (el.type === 'price_tag') {
        return {
          ...el,
          priceText: formatBRL(newPrice),
          installmentText: installments
        };
      }
      return el;
    });

    handleUpdateProject({
      elements: updatedElements,
      linkedProduct: {
        ...currentProject.linkedProduct,
        price: newPrice
      }
    });

    setCatalogPriceWarning(null);
    toast.success(`Preço atualizado no anúncio para ${formatBRL(newPrice)}!`);
  };

  // Instantiate from template
  const handleSelectTemplate = (template: StudioTemplate) => {
    const newProj = studioService.createProjectFromTemplate(template, `${template.title} • Novo`);
    setCurrentProject(newProj);
    setHistory([JSON.parse(JSON.stringify(newProj))]);
    setHistoryIndex(0);
    setViewMode('editor');
    toast.success(`Modelo "${template.title}" carregado!`);
  };

  // Link product from catalog to current art
  const handleLinkProduct = (prod: StudioLinkedProduct) => {
    const formattedPrice = formatBRL(prod.price);
    const installments = `12x de ${formatBRL((prod.price * 1.1) / 12)}`;

    // Intelligently map product into canvas elements
    const updatedElements = currentProject.elements.map(el => {
      if (el.id === 'el_product_name' || (el.type === 'text' && el.content.includes('IPHONE') || el.content.includes('CONSOLE') || el.content.includes('PS5'))) {
        return { ...el, content: prod.name.toUpperCase() };
      }
      if (el.id === 'el_product_image' || (el.type === 'image' && el.src)) {
        return { ...el, src: prod.photoUrl };
      }
      if (el.id === 'el_price_box' || el.type === 'price_tag') {
        return {
          ...el,
          priceText: formattedPrice,
          installmentText: installments,
          conditionBadge: prod.condition
        };
      }
      return el;
    });

    handleUpdateProject({
      name: `Anúncio - ${prod.name}`,
      elements: updatedElements,
      linkedProduct: prod
    });

    setIsProductModalOpen(false);
    toast.success(`Produto "${prod.name}" vinculado ao anúncio!`);
  };

  // Apply texts from AI generator to art
  const handleApplyAiText = (title: string, subtitle?: string, badge?: string) => {
    const updatedElements = currentProject.elements.map(el => {
      if (badge && (el.type === 'badge' || el.id.includes('badge'))) {
        return { ...el, label: badge };
      }
      if (el.id === 'el_product_name' || (el.type === 'text' && el.fontSize && el.fontSize >= 30)) {
        return { ...el, content: title.toUpperCase() };
      }
      if (subtitle && el.type === 'text' && el.fontSize && el.fontSize < 24 && el.fontSize > 12) {
        return { ...el, content: subtitle };
      }
      return el;
    });

    handleUpdateProject({ elements: updatedElements });
    setIsAiModalOpen(false);
    toast.success('Textos da IA aplicados ao design!');
  };

  // High Resolution Image Export (PNG / JPEG)
  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!canvasRef.current) {
      toast.error('Elemento do canvas não encontrado');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Renderizando imagem em alta resolução (${format.toUpperCase()})...`);

    try {
      // Temporarily reset CSS transform scale to guarantee 1:1 crisp pixel mapping
      const originalTransform = canvasRef.current.style.transform;
      canvasRef.current.style.transform = 'none';

      // Ensure all webfonts are completely ready
      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(canvasRef.current, {
        scale: 2.5, // 2.5x ultra sharp export
        useCORS: true,
        allowTaint: true,
        backgroundColor: currentProject.backgroundColor || '#09090b',
        logging: false
      });

      // Restore zoom transform
      canvasRef.current.style.transform = originalTransform;

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const fileExt = format === 'jpeg' ? 'jpg' : 'png';
      const dataUrl = canvas.toDataURL(mimeType, 0.95);

      // Download file to user device
      const link = document.createElement('a');
      link.download = `${currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_godshop.${fileExt}`;
      link.href = dataUrl;
      link.click();

      // Also save snapshot thumbnail to project preview
      handleUpdateProject({ previewImage: dataUrl });

      toast.success(`Arte exportada com sucesso em .${fileExt}!`, { id: toastId });
    } catch (err: any) {
      console.error('[Studio Export Error]:', err);
      toast.error('Erro ao renderizar imagem. Tente novamente.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Render Hub screen
  if (viewMode === 'hub') {
    return (
      <div className="min-h-full pb-16 bg-zinc-950 text-white font-sans selection:bg-amber-500 selection:text-black">
        {/* Top Hub Banner */}
        <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 sm:px-8 py-8 sm:py-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider uppercase">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                Estúdio Profissional de Conteúdo & Vendas
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white flex items-center gap-3">
                GODSHOP <span className="text-amber-500">STUDIO</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
                Crie artes publicitárias de luxo, vídeos promocionais curtos, aplique inteligência artificial e conecte os produtos do seu estoque em segundos com design preto, branco e dourado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  const blank = studioService.createProjectFromTemplate(STUDIO_TEMPLATES[0], 'Nova Arte em Branco');
                  setCurrentProject(blank);
                  setViewMode('editor');
                }}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Criar Nova Arte
              </button>
              <button
                onClick={() => setViewMode('video')}
                className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Film className="h-4 w-4 text-amber-500" />
                Vídeo Promocional
              </button>
            </div>
          </div>
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <button
              onClick={() => {
                const blank = studioService.createProjectFromTemplate(STUDIO_TEMPLATES[0], 'Nova Arte');
                setCurrentProject(blank);
                setViewMode('editor');
              }}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">Criar Arte</h4>
                <p className="text-[11px] text-zinc-400">Editor estilo Canva</p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('video')}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">Criar Vídeo</h4>
                <p className="text-[11px] text-zinc-400">Vídeos curtos em MP4</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsAiModalOpen(true);
              }}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">Anúncio com IA</h4>
                <p className="text-[11px] text-zinc-400">Copy & Remoção de fundo</p>
              </div>
            </button>

            <button
              onClick={() => setIsProductModalOpen(true)}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">Do Estoque</h4>
                <p className="text-[11px] text-zinc-400">Puxar iPhone ou Console</p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('campaigns')}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors">Campanhas</h4>
                <p className="text-[11px] text-zinc-400">Biblioteca & WhatsApp</p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('calculator')}
              className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between h-32 cursor-pointer shadow-md"
            >
              <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">Calculadora</h4>
                <p className="text-[11px] text-zinc-400">Margem interna e lucro</p>
              </div>
            </button>
          </div>

          {/* Modelos Prontos Showcase */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white">Modelos Profissionais GodShop</h2>
                <p className="text-xs text-zinc-400">Templates prontos desenvolvidos para alta conversão comercial</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {STUDIO_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 p-4 transition-all group cursor-pointer flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/5"
                >
                  <div className="space-y-3">
                    {/* Simulated visual card preview */}
                    <div 
                      className="w-full h-44 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden border border-zinc-800/80"
                      style={{ background: tpl.backgroundGradient || tpl.backgroundColor }}
                    >
                      <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase">GODSHOP</span>
                      <h4 className="text-base font-black text-white text-center mt-1 uppercase max-w-[80%]">
                        {tpl.title}
                      </h4>
                      <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                        {tpl.format === 'story' ? 'Story (9:16)' : (tpl.format === 'feed_portrait' ? 'Feed (4:5)' : (tpl.format === 'banner' ? 'Banner (16:9)' : 'Quadrado (1:1)'))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 uppercase">
                          {tpl.category}
                        </span>
                        <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          {tpl.title}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Usar este modelo</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Projects Section */}
          {recentProjects.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Meus Projetos Recentes</h2>
                  <p className="text-xs text-zinc-400">Continue de onde parou</p>
                </div>
                <button
                  onClick={() => setViewMode('campaigns')}
                  className="text-xs text-amber-400 hover:underline font-bold"
                >
                  Ver todos ({recentProjects.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {recentProjects.slice(0, 4).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setCurrentProject(proj);
                      setViewMode('editor');
                    }}
                    className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="w-full h-32 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center overflow-hidden relative">
                      {proj.previewImage ? (
                        <img src={proj.previewImage} alt={proj.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center p-3">
                          <ImageIcon className="h-6 w-6 text-zinc-600 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{proj.format}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <h4 className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                        {proj.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(proj.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Catalog Modal */}
        <ProductSelectorModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSelectProduct={handleLinkProduct}
        />

        {/* Global AI Copy Modal */}
        <AiStudioModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          project={currentProject}
          onApplyTextToArt={handleApplyAiText}
        />
      </div>
    );
  }

  // Render Video Maker
  if (viewMode === 'video') {
    return <VideoEditor onBackToStudio={() => setViewMode('hub')} />;
  }

  // Render Campaigns & Project Library
  if (viewMode === 'campaigns') {
    return (
      <div className="min-h-full pb-16 bg-zinc-950 text-white font-sans p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('hub')}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Campanhas & Meus Projetos</h1>
              <p className="text-xs text-zinc-400">Gerencie artes salvas e crie ações promocionais para WhatsApp</p>
            </div>
          </div>
        </div>

        <CampaignsAndLibrary
          onOpenProject={(proj) => {
            setCurrentProject(proj);
            setViewMode('editor');
          }}
          onNewProject={() => {
            const blank = studioService.createProjectFromTemplate(STUDIO_TEMPLATES[0], 'Nova Arte');
            setCurrentProject(blank);
            setViewMode('editor');
          }}
        />
      </div>
    );
  }

  // Render Private Calculator
  if (viewMode === 'calculator') {
    return (
      <div className="min-h-full pb-16 bg-zinc-950 text-white font-sans p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('hub')}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Calculadora Comercial Privada</h1>
              <p className="text-xs text-zinc-400">Controle estritamente sigiloso de custos, taxas e margem de lucro</p>
            </div>
          </div>
        </div>

        <PrivateCalculator />
      </div>
    );
  }

  // Render Visual Art Editor (Canva Style)
  const selectedElement = currentProject.elements.find(el => el.id === selectedElementId) || null;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-hidden bg-zinc-950 text-white font-sans">
      {/* Price Outdated Warning Banner */}
      {catalogPriceWarning && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-300 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Preço alterado no Estoque:</strong> O produto agora custa{' '}
              <span className="font-extrabold text-amber-400">{formatBRL(catalogPriceWarning.currentPrice)}</span>{' '}
              (a arte está com {formatBRL(catalogPriceWarning.originalPrice)}).
            </span>
          </div>
          <button
            onClick={handleSyncPriceFromDatabase}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar Arte
          </button>
        </div>
      )}

      {/* Editor Top Control Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 z-30 shrink-0">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setViewMode('hub')}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Voltar ao Studio Hub"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={currentProject.name}
            onChange={(e) => handleUpdateProject({ name: e.target.value })}
            className="bg-transparent font-bold text-xs sm:text-sm text-white hover:bg-zinc-800/60 focus:bg-zinc-800 px-2 py-1 rounded-lg border border-transparent focus:border-zinc-700 outline-none truncate max-w-[140px] sm:max-w-[240px]"
            title="Renomear Projeto"
          />

          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-amber-400 border border-amber-500/20">
            {currentProject.format}
          </span>
        </div>

        {/* Center: History Undo/Redo & Zoom */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Diminuir Zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 px-1 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Actions & High-Res Export */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Generator Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">IA Copy</span>
          </button>

          {/* Product Link Button */}
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Estoque</span>
          </button>

          {/* Export Dropdown / Action */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExportImage('png')}
              disabled={isExporting}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar PNG</span>
            </button>
            <button
              onClick={() => handleExportImage('jpeg')}
              disabled={isExporting}
              className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold items-center gap-1 cursor-pointer transition-colors"
              title="Exportar JPEG otimizado"
            >
              JPG
            </button>
          </div>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <div className="w-80 border-r border-zinc-800 bg-zinc-950 shrink-0 hidden md:block overflow-hidden">
          <StudioToolbar
            project={currentProject}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onAddElement={handleAddElement}
            onUpdateProject={handleUpdateProject}
            onOpenProductModal={() => setIsProductModalOpen(true)}
            onOpenAiModal={() => setIsAiModalOpen(true)}
          />
        </div>

        {/* Central Canvas Workspace */}
        <main className="flex-1 overflow-auto bg-zinc-950 flex flex-col relative select-none">
          <ArtCanvas
            project={currentProject}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            zoom={zoom}
            setZoom={setZoom}
            canvasRef={canvasRef}
          />

          {/* Mobile Toolbar Trigger Bar */}
          <div className="md:hidden border-t border-zinc-800 bg-zinc-900 p-2 flex items-center justify-around gap-2 shrink-0">
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="p-2 text-xs font-bold text-zinc-300 hover:text-white flex flex-col items-center gap-1"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              Estoque
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="p-2 text-xs font-bold text-zinc-300 hover:text-white flex flex-col items-center gap-1"
            >
              <Wand2 className="h-4 w-4 text-purple-400" />
              IA
            </button>
            <button
              onClick={() => handleExportImage('png')}
              className="p-2 text-xs font-bold text-amber-400 flex flex-col items-center gap-1"
            >
              <Download className="h-4 w-4 text-amber-400" />
              Exportar
            </button>
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <ProductSelectorModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelectProduct={handleLinkProduct}
      />

      <AiStudioModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        project={currentProject}
        onApplyTextToArt={handleApplyAiText}
      />
    </div>
  );
}
