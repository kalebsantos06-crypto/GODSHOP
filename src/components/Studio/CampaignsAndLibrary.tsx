import React, { useState } from 'react';
import { StudioProject, StudioCampaign } from '../../types/studio';
import { studioService } from '../../services/studioService';
import { formatBRL } from '../../lib/formatCurrency';
import { toast } from 'sonner';
import { 
  Folder, Calendar, Share2, Copy, Trash2, Edit3, Plus, 
  ExternalLink, Sparkles, Smartphone, Check, Download
} from 'lucide-react';

interface CampaignsAndLibraryProps {
  onOpenProject: (project: StudioProject) => void;
  onNewProject: () => void;
}

export default function CampaignsAndLibrary({
  onOpenProject,
  onNewProject
}: CampaignsAndLibraryProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'campaigns'>('projects');
  const [projects, setProjects] = useState<StudioProject[]>(studioService.getProjects());
  const [campaigns, setCampaigns] = useState<StudioCampaign[]>(studioService.getCampaigns());

  // Campaign create modal state
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState<'lancamento' | 'ofertas' | 'queima' | 'datas_especiais' | 'institucional'>('ofertas');
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newEnd, setNewEnd] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta arte?')) {
      studioService.deleteProject(id);
      setProjects(studioService.getProjects());
      toast.success('Projeto excluído.');
    }
  };

  const handleDuplicateProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy = studioService.duplicateProject(id);
    if (copy) {
      setProjects(studioService.getProjects());
      toast.success('Projeto duplicado com sucesso!');
    }
  };

  const handleShareWhatsApp = (project: StudioProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const prodName = project.linkedProduct?.name || project.name;
    const prodPrice = project.linkedProduct?.price || 2990;

    const text = studioService.generateWhatsAppText({
      name: prodName,
      price: prodPrice,
      condition: project.linkedProduct?.condition || 'Seminovo Impecável',
      warranty: project.linkedProduct?.warranty || 'Garantia GodShop'
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Informe o título da campanha.');
      return;
    }

    const campaign: StudioCampaign = {
      id: `camp_${Date.now()}`,
      title: newTitle.trim(),
      description: `Campanha de ${newObjective.toUpperCase()} GodShop`,
      objective: newObjective,
      startDate: newStart,
      endDate: newEnd,
      status: 'ativa',
      linkedProductIds: [],
      projectIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    studioService.saveCampaign(campaign);
    setCampaigns(studioService.getCampaigns());
    setIsNewCampaignOpen(false);
    setNewTitle('');
    toast.success('Nova campanha comercial criada!');
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Deseja excluir esta campanha?')) {
      studioService.deleteCampaign(id);
      setCampaigns(studioService.getCampaigns());
      toast.success('Campanha removida.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Folder className="h-4 w-4" />
            Meus Projetos & Artes ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'campaigns'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Campanhas Comerciais ({campaigns.length})
          </button>
        </div>

        {activeTab === 'projects' ? (
          <button
            onClick={onNewProject}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Nova Arte
          </button>
        ) : (
          <button
            onClick={() => setIsNewCampaignOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Nova Campanha
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {activeTab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 space-y-3">
              <Folder className="h-10 w-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-400">Nenhum projeto salvo ainda</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Crie sua primeira arte comercial ou escolha um modelo profissional para começar.
              </p>
              <button
                onClick={onNewProject}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Começar Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj)}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 overflow-hidden shadow-lg transition-all flex flex-col group cursor-pointer"
                >
                  {/* Thumbnail / Preview Canvas Simulation */}
                  <div 
                    style={{ background: proj.backgroundGradient || proj.backgroundColor || '#09090b' }}
                    className="h-44 w-full relative flex items-center justify-center p-3 overflow-hidden border-b border-zinc-800/80"
                  >
                    <div className="text-center space-y-1">
                      <div className="text-amber-400 font-black text-xs tracking-widest uppercase">
                        GODSHOP
                      </div>
                      <div className="text-white font-bold text-sm truncate max-w-[200px]">
                        {proj.name}
                      </div>
                      {proj.linkedProduct && (
                        <div className="text-emerald-400 font-mono font-bold text-xs">
                          {formatBRL(proj.linkedProduct.price)}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 font-mono uppercase">
                      {proj.format}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors truncate">
                        {proj.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Modificado em {new Date(proj.updatedAt).toLocaleDateString('pt-BR')} às {new Date(proj.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleShareWhatsApp(proj, e)}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                          title="Compartilhar no WhatsApp"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDuplicateProject(proj.id, e)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Duplicar Arte"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Excluir Arte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaigns Grid */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 space-y-3">
              <Calendar className="h-10 w-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-400">Nenhuma campanha cadastrada</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Organize suas ações de vendas por período (Black Friday, Lançamento de iPhone, Feirão Gamer).
              </p>
              <button
                onClick={() => setIsNewCampaignOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Criar Primeira Campanha
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {camp.objective.toUpperCase()}
                      </span>
                      <h4 className="font-bold text-base text-white mt-2">{camp.title}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400">{camp.description}</p>

                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                    <span>Início: {new Date(camp.startDate).toLocaleDateString('pt-BR')}</span>
                    <span>Término: {new Date(camp.endDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Campaign Modal */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-white">Criar Nova Campanha Comercial</h4>
            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Título da Campanha</label>
                <input
                  type="text"
                  placeholder="Ex: Semana do iPhone 15 ou Feirão de Games"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Objetivo</label>
                <select
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="ofertas">Ofertas Especiais</option>
                  <option value="lancamento">Lançamento de Produto</option>
                  <option value="queima">Queima de Estoque</option>
                  <option value="datas_especiais">Data Especial (Black Friday / Natal)</option>
                  <option value="institucional">Institucional da Loja</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Data Início</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Data Término</label>
                  <input
                    type="date"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black cursor-pointer shadow-lg"
                >
                  Salvar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
