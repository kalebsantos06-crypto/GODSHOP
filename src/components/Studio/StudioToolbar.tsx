import React from 'react';
import { StudioElement, StudioProject, StudioCanvasFormat } from '../../types/studio';
import { FORMAT_DIMENSIONS } from '../../services/studioService';
import { 
  Type, Image as ImageIcon, Sparkles, Sliders, Palette, Layers, 
  Smartphone, Square, LayoutTemplate, Tag, DollarSign, ShieldAlert, 
  Check, RefreshCw, Wand2, Upload
} from 'lucide-react';

interface StudioToolbarProps {
  project: StudioProject;
  selectedElement: StudioElement | null;
  onUpdateElement: (id: string, updates: Partial<StudioElement>) => void;
  onAddElement: (element: StudioElement) => void;
  onUpdateProject: (updates: Partial<StudioProject>) => void;
  onOpenProductModal: () => void;
  onOpenAiModal: () => void;
}

const FONT_OPTIONS = [
  { label: 'Montserrat (Moderno)', value: 'Montserrat' },
  { label: 'Inter (Clean)', value: 'Inter' },
  { label: 'Bebas Neue (Impacto)', value: 'Bebas Neue' },
  { label: 'Oswald (Condensado)', value: 'Oswald' },
  { label: 'Playfair Display (Luxo)', value: 'Playfair Display' }
];

const GOLD_COLORS = [
  '#f59e0b', '#fbbf24', '#d97706', '#d4af37', '#ffffff', '#e4e4e7',
  '#22c55e', '#38bdf8', '#ef4444', '#a855f7', '#000000', '#18181b'
];

const GRADIENT_PRESETS = [
  { label: 'Preto & Dourado VIP', value: 'radial-gradient(circle at 50% 30%, #1c1917 0%, #09090b 80%)' },
  { label: 'Dark Carbon', value: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)' },
  { label: 'Gamer Neon Blue', value: 'linear-gradient(180deg, #0b1329 0%, #030712 100%)' },
  { label: 'Titanium Luxo', value: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)' },
  { label: 'Esmeralda Puro', value: 'radial-gradient(circle at 50% 40%, #064e3b 0%, #022c22 80%)' }
];

export default function StudioToolbar({
  project,
  selectedElement,
  onUpdateElement,
  onAddElement,
  onUpdateProject,
  onOpenProductModal,
  onOpenAiModal
}: StudioToolbarProps) {
  const [activeTab, setActiveTab] = React.useState<'elements' | 'design' | 'layers'>('elements');

  const handleAddText = (type: 'title' | 'subtitle' | 'badge') => {
    const id = `el_${Date.now()}`;
    if (type === 'title') {
      onAddElement({
        id,
        type: 'text',
        x: 50,
        y: 40,
        width: 80,
        height: 8,
        content: 'NOVO PRODUTO',
        fontSize: 36,
        fontFamily: 'Montserrat',
        fontWeight: 'black',
        color: '#ffffff',
        textAlign: 'center',
        zIndex: project.elements.length + 1
      });
    } else if (type === 'subtitle') {
      onAddElement({
        id,
        type: 'text',
        x: 50,
        y: 50,
        width: 75,
        height: 5,
        content: 'Condição Especial • Garantia GodShop',
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#d4d4d8',
        textAlign: 'center',
        zIndex: project.elements.length + 1
      });
    } else {
      onAddElement({
        id,
        type: 'badge',
        x: 50,
        y: 15,
        width: 45,
        height: 5,
        label: '⭐ OFERTA EXCLUSIVA ⭐',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeTextColor: '#fbbf24',
        badgeBorderColor: 'rgba(245, 158, 11, 0.5)',
        zIndex: project.elements.length + 1
      });
    }
  };

  const handleAddPriceTag = () => {
    onAddElement({
      id: `el_${Date.now()}`,
      type: 'price',
      x: 50,
      y: 75,
      width: 75,
      height: 12,
      cashPrice: 2990,
      installmentCount: 12,
      installmentValue: 279.90,
      paymentNote: 'NO CARTÃO OU PIX COM DESCONTO',
      highlightColor: '#f59e0b',
      zIndex: project.elements.length + 1
    });
  };

  const handleFormatChange = (fmt: StudioCanvasFormat) => {
    const dim = FORMAT_DIMENSIONS[fmt];
    if (dim) {
      onUpdateProject({
        format: fmt,
        width: dim.width,
        height: dim.height
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onAddElement({
        id: `el_${Date.now()}`,
        type: 'image',
        x: 50,
        y: 40,
        width: 70,
        height: 40,
        src: reader.result as string,
        objectFit: 'contain',
        zIndex: project.elements.length + 1
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full sm:w-80 md:w-88 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-hidden select-none shrink-0">
      {/* Top Header Tabs */}
      <div className="flex border-b border-zinc-800 p-2 gap-1 bg-zinc-950/50 shrink-0">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'elements'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          Ferramentas
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'design'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
          Fundo & Formato
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Camadas ({project.elements.length})
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Quick Automation Actions */}
        <div className="space-y-2">
          <button
            onClick={onOpenProductModal}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Smartphone className="h-4 w-4" />
            Carregar Produto do Estoque
          </button>
          
          <button
            onClick={onOpenAiModal}
            className="w-full p-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
          >
            <Wand2 className="h-4 w-4 text-amber-400" />
            Gerar Textos & Copy com IA
          </button>
        </div>

        {activeTab === 'elements' && (
          <div className="space-y-4">
            {/* Quick Add Elements */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">
                Inserir Elementos
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddText('title')}
                  className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-750 text-xs font-bold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Type className="h-4 w-4 text-amber-400" />
                  + Título
                </button>
                <button
                  onClick={() => handleAddText('subtitle')}
                  className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-750 text-xs font-bold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Type className="h-3.5 w-3.5 text-zinc-400" />
                  + Subtítulo
                </button>
                <button
                  onClick={handleAddPriceTag}
                  className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-750 text-xs font-bold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  + Bloco Preço
                </button>
                <button
                  onClick={() => handleAddText('badge')}
                  className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-750 text-xs font-bold text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Tag className="h-4 w-4 text-amber-400" />
                  + Selo / Tag
                </button>
              </div>

              {/* Upload Image Button */}
              <label className="w-full p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-750 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer block text-center">
                <Upload className="h-4 w-4 text-blue-400 inline" />
                Upload Foto do Celular / PC
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Element Inspector if an element is selected */}
            {selectedElement ? (
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                    Propriedades ({selectedElement.type.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ID: {selectedElement.id.slice(-5)}
                  </span>
                </div>

                {/* Text Controls */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Conteúdo</label>
                      <textarea
                        value={selectedElement.content || ''}
                        onChange={(e) => onUpdateElement(selectedElement.id, { content: e.target.value })}
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Tamanho ({selectedElement.fontSize}px)</label>
                        <input
                          type="range"
                          min="14"
                          max="96"
                          value={selectedElement.fontSize || 24}
                          onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Fonte</label>
                        <select
                          value={selectedElement.fontFamily || 'Montserrat'}
                          onChange={(e) => onUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-2 py-1.5 text-xs text-white"
                        >
                          {FONT_OPTIONS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Cor do Texto</label>
                      <div className="flex flex-wrap gap-1.5">
                        {GOLD_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => onUpdateElement(selectedElement.id, { color: c })}
                            style={{ backgroundColor: c }}
                            className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                              selectedElement.color === c ? 'scale-125 border-white ring-2 ring-amber-500' : 'border-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Controls */}
                {selectedElement.type === 'price' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Preço à Vista (R$)</label>
                      <input
                        type="number"
                        value={selectedElement.cashPrice || 0}
                        onChange={(e) => onUpdateElement(selectedElement.id, { cashPrice: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Parcelas</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={selectedElement.installmentCount || 12}
                          onChange={(e) => onUpdateElement(selectedElement.id, { installmentCount: Number(e.target.value) })}
                          className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Valor Parcela (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={selectedElement.installmentValue || 0}
                          onChange={(e) => onUpdateElement(selectedElement.id, { installmentValue: Number(e.target.value) })}
                          className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Observação do Pagamento</label>
                      <input
                        type="text"
                        value={selectedElement.paymentNote || ''}
                        onChange={(e) => onUpdateElement(selectedElement.id, { paymentNote: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Badge Controls */}
                {selectedElement.type === 'badge' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Texto do Selo</label>
                      <input
                        type="text"
                        value={selectedElement.label || ''}
                        onChange={(e) => onUpdateElement(selectedElement.id, { label: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Image Controls */}
                {selectedElement.type === 'image' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                        Brilho ({selectedElement.brightness || 100}%)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={selectedElement.brightness || 100}
                        onChange={(e) => onUpdateElement(selectedElement.id, { brightness: Number(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                        Contraste ({selectedElement.contrast || 100}%)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={selectedElement.contrast || 100}
                        onChange={(e) => onUpdateElement(selectedElement.id, { contrast: Number(e.target.value) })}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
                Clique em qualquer elemento na arte para editar textos, cores e posições.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Design, Format & Background */}
        {activeTab === 'design' && (
          <div className="space-y-4">
            {/* Format Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">
                Tamanho da Publicação
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FORMAT_DIMENSIONS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => handleFormatChange(key as StudioCanvasFormat)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      project.format === key
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                        : 'bg-zinc-800/60 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{item.label.split(' ')[0]}</div>
                    <div className="text-[10px] opacity-70">{item.ratio}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Presets */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">
                Gradientes & Fundo Premium
              </span>
              <div className="space-y-1.5">
                {GRADIENT_PRESETS.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateProject({ backgroundGradient: g.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-750 flex items-center justify-between hover:border-amber-500 transition-colors cursor-pointer text-left"
                    style={{ background: g.value }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow">{g.label}</span>
                    {project.backgroundGradient === g.value && (
                      <Check className="h-4 w-4 text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Layers */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">
              Ordem das Camadas
            </span>
            <div className="space-y-1.5">
              {project.elements.map((el, index) => (
                <div
                  key={el.id}
                  onClick={() => onUpdateElement(el.id, {})}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    selectedElement?.id === el.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-800/60 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate font-medium">
                    {index + 1}. {el.type.toUpperCase()} - {el.content || el.label || el.src?.slice(0, 15) || 'Camada'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">z: {el.zIndex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
