
import React, { useEffect, useState } from 'react';
import { Receipt, Search, Filter, Download, ExternalLink, Printer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/db';

export default function InvoiceList() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await db.fiscal_documents.list();
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.access_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    authorized: documents.filter(d => d.status === 'Autorizada').length,
    rejected: documents.filter(d => d.status === 'Rejeitada').length,
    processing: documents.filter(d => d.status === 'Processando').length
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notas Fiscais (Nota N-F)</h1>
          <p className="text-muted-foreground text-sm">Controle de documentos fiscais emitidos, recebidos e pendentes.</p>
        </div>
        <button 
          onClick={() => navigate('/fiscal/invoices/issue')}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-2xl transition shadow-xl shadow-emerald-500/20 text-xs"
        >
          EMITIR NOVA NF-E
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/50 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Autorizadas</p>
            <p className="text-xl font-black">{stats.authorized}</p>
          </div>
        </div>
        <div className="bg-card/50 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Rejeitadas</p>
            <p className="text-xl font-black">{stats.rejected}</p>
          </div>
        </div>
        <div className="bg-card/50 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Processando</p>
            <p className="text-xl font-black">{stats.processing}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card/50 border border-white/10 pl-11 pr-4 py-3 rounded-2xl outline-none" 
            placeholder="Buscar por Número, Série, Chave ou Cliente..." 
          />
        </div>
        <button className="p-3 bg-card/50 border border-white/10 rounded-2xl hover:bg-white/5 transition">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-card/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-white/5">
                <th className="px-6 py-4">NF-e / Série</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Destinatário</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground animate-pulse">Carregando documentos fiscais...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Nenhuma nota fiscal encontrada.</td>
                </tr>
              ) : filteredDocs.map((item, i) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold">{item.number?.padStart(6, '0')}</p>
                    <p className="opacity-50 tracking-widest uppercase text-[9px]">Série {item.series || '001'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${item.status === 'Autorizada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 opacity-70">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 font-medium">{item.client_name || 'Consumidor Final'}</td>
                  <td className="px-6 py-4 font-black">R$ {Number(item.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition" title="Ver Detalhes"><ExternalLink className="h-3.5 w-3.5" /></button>
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition" title="Baixar XML"><Download className="h-3.5 w-3.5" /></button>
                      <button className="p-1.5 hover:bg-muted/30 rounded-lg transition" title="Imprimir DANFE"><Printer className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
