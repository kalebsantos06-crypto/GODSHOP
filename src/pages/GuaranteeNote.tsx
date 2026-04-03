import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, ArrowLeft, Download, MessageCircle, FileDown, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function GuaranteeNote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [logoImage, setLogoImage] = useState<string | null>(null);

  useEffect(() => {
    // Pre-load libraries for faster PDF generation and better user gesture preservation
    import('jspdf');
    import('html2canvas');
    
    // Load store logo
    setLogoImage(localStorage.getItem('app_logo') || null);
  }, []);

  const { data: sales = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.list(),
  });

  const { data: iphones = [], isLoading: isLoadingIphones } = useQuery({
    queryKey: ['iphones'],
    queryFn: () => db.iphones.list(),
  });

  const { data: consoles = [], isLoading: isLoadingConsoles } = useQuery({
    queryKey: ['consoles'],
    queryFn: () => db.consoles.list(),
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.clients.list(),
  });

  if (isLoadingSales || isLoadingIphones || isLoadingConsoles || isLoadingClients) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground animate-pulse font-medium">Preparando seu Termo de Garantia...</p>
      </div>
    );
  }

  const sale = sales.find(s => s.id === id);
  if (!sale) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <ArrowLeft className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Venda não encontrada</h2>
        <p className="text-muted-foreground mb-6">Não conseguimos localizar os dados desta garantia.</p>
        <button onClick={() => navigate('/sales')} className="bg-primary text-white px-6 py-2 rounded-lg font-medium">
          Voltar para Vendas
        </button>
      </div>
    );
  }

  const iphone = iphones.find(i => i.id === sale.iphone_id);
  const consoleItem = consoles.find(c => c.id === sale.console_id);
  const client = clients.find(c => c.id === sale.client_id);

  const isLacrado = (iphone?.condition === 'lacrado') || (consoleItem?.condition === 'lacrado');
  const warrantyMonths = isLacrado ? 12 : 6;
  
  const saleDate = new Date(sale.sale_date);
  const endDate = addMonths(saleDate, warrantyMonths);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Abre uma nova janela para contornar bloqueios de impressão dentro de iframes
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Pop-up bloqueado! Permita pop-ups no seu navegador para imprimir a nota.');
      return;
    }

    // Copia os estilos (Tailwind) da janela atual para a nova janela
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Termo de Garantia - ${client?.name}</title>
          ${styles}
          <style>
            body { background-color: white !important; color: black !important; }
            @media print {
              @page { margin: 20mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body class="p-8 max-w-3xl mx-auto">
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async (direct = false) => {
    if (isDownloading || !printRef.current || !client || (!iphone && !consoleItem)) return;
    
    const toastId = toast.loading(direct ? 'Iniciando download...' : 'Gerando pré-visualização...');
    setIsDownloading(true);
    
    try {
      const element = document.getElementById('guarantee-note-content');
      if (!element) throw new Error('Elemento não encontrado');
      
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const pdf = new jsPDF();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Geramos o PDF como Data URI (Base64)
      const pdfDataUri = pdf.output('datauristring');
      const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Garantia_${safeName}.pdf`;
      
      // Tentativa de abrir em nova aba com HTML customizado (mais compatível com WebViews)
      const previewWindow = !direct ? window.open('', '_blank') : null;
      
      if (previewWindow && !direct) {
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Garantia - ${client.name}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #525659; display: flex; flex-direction: column; }
                .toolbar { background: #323639; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; font-family: sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10; }
                .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; text-decoration: none; font-size: 14px; }
                .btn:hover { background: #0056b3; }
                .content { flex: 1; width: 100%; border: none; }
                @media (max-width: 600px) { .toolbar { padding: 10px; } .btn { padding: 6px 12px; font-size: 12px; } }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span>Garantia - ${client.name}</span>
                <a href="${pdfDataUri}" download="${fileName}" class="btn">BAIXAR PDF</a>
              </div>
              <iframe class="content" src="${pdfDataUri}"></iframe>
            </body>
          </html>
        `);
        previewWindow.document.close();
        toast.success('Pré-visualização aberta!', { id: toastId });
      } else {
        // Fallback: Download direto se o pop-up for bloqueado ou se for solicitado download direto
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(direct ? 'Download iniciado!' : 'Download iniciado diretamente!', { id: toastId });
      }

    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Erro ao gerar PDF no aplicativo.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex flex-wrap gap-2">
          {client?.phone && (
            <a 
              href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${client.name}!

É um prazer atendê-lo(a) na GOD SHOP.

Informamos que o seu Termo de Garantia referente à sua compra foi gerado com sucesso.
Protocolo: ${sale.id}

Agradecemos imensamente pela sua preferência e confiança em nossa loja. Estamos à disposição para qualquer dúvida.

Atenciosamente,
Equipe GOD SHOP`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-emerald-600 shadow-lg transition-all active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          <div className="flex items-center shadow-lg rounded-md overflow-hidden">
            <button 
              onClick={() => handleDownloadPDF(false)}
              disabled={isDownloading}
              className="bg-blue-600 text-white px-6 py-2 flex items-center gap-2 font-bold hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 border-r border-blue-500/30"
              title="Visualizar e Baixar PDF"
            >
              <Download className="h-5 w-5" />
              {isDownloading ? 'Gerando...' : 'Baixar como PDF'}
            </button>
            <button 
              onClick={() => handleDownloadPDF(true)}
              disabled={isDownloading}
              className="bg-blue-600 text-white p-2.5 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
              title="Download Direto"
            >
              <FileDown className="h-5 w-5" />
            </button>
          </div>
          <button 
            onClick={handlePrint}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-primary/90 shadow-lg"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-[#ffffff] border shadow-sm rounded-xl print:shadow-none print:border-none">
        <div 
          id="guarantee-note-content"
          ref={printRef}
          className="text-[#000000] p-10 print:p-0 bg-[#ffffff] overflow-x-auto custom-scrollbar"
        >
          <div className="flex flex-col items-center border-b-2 border-[#000000] pb-6 mb-6">
            {logoImage ? (
              <img 
                src={logoImage} 
                alt="Logo GOD SHOP" 
                className="h-32 w-32 object-contain mb-4"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                <Smartphone className="h-16 w-16 text-slate-400" />
              </div>
            )}
            <h1 className="text-4xl font-black uppercase tracking-[0.2em]">GOD SHOP</h1>
            <h2 className="text-xl font-bold uppercase tracking-wider mt-2">Termo de Garantia</h2>
            <p className="text-[#4b5563] mt-1">Comprovante de Compra e Garantia</p>
          </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="font-semibold">Nome:</span> {client?.name}</p>
              <p><span className="font-semibold">Telefone:</span> {client?.phone}</p>
              {client?.cpf && <p><span className="font-semibold">CPF:</span> {client.cpf}</p>}
              {client?.email && <p><span className="font-semibold">Email:</span> {client.email}</p>}
              {(client?.street || client?.number || client?.neighborhood) && (
                <p className="col-span-2">
                  <span className="font-semibold">Endereço:</span> {client.street}{client.number ? `, ${client.number}` : ''}{client.neighborhood ? ` - ${client.neighborhood}` : ''}
                  {client.complement && ` (${client.complement})`}
                </p>
              )}
              {(client?.city || client?.state) && (
                <p className="col-span-2">
                  <span className="font-semibold">Localização:</span> {client.city}{client.city && client.state ? ' - ' : ''}{client.state}
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">
              Detalhes do {iphone ? 'Aparelho' : 'Console'}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {iphone ? (
                <>
                  <p><span className="font-semibold">Modelo:</span> {iphone.model}</p>
                  <p><span className="font-semibold">IMEI / Serial:</span> <span className="font-mono">{iphone.imei || 'N/A'}</span></p>
                  <p><span className="font-semibold">Armazenamento:</span> {iphone.storage}</p>
                  <p><span className="font-semibold">Cor:</span> {iphone.color}</p>
                  <p><span className="font-semibold">Condição:</span> <span className="capitalize">{iphone.condition || 'Seminovo'}</span></p>
                  <p><span className="font-semibold">Status:</span> {iphone.condition === 'lacrado' ? 'Novo/Lacrado' : 'Seminovo/Usado'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">Modelo:</span> {consoleItem?.model}</p>
                  <p><span className="font-semibold">Versão:</span> {consoleItem?.version}</p>
                  <p><span className="font-semibold">Condição:</span> <span className="capitalize">{consoleItem?.condition || 'Seminovo'}</span></p>
                  <p><span className="font-semibold">Status:</span> {consoleItem?.condition === 'lacrado' ? 'Novo/Lacrado' : 'Seminovo/Usado'}</p>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">Detalhes da Venda</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="font-semibold">ID da Venda:</span> <span className="font-mono text-xs">{sale.id.split('-')[0].toUpperCase()}</span></p>
              <p><span className="font-semibold">Data da Compra:</span> {format(new Date(sale.sale_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              <p><span className="font-semibold">Valor Total:</span> {formatBRL(sale.sell_price)}</p>
              <p>
                <span className="font-semibold">Forma de Pagamento:</span> {sale.payment_method}
                {sale.installments && sale.installments > 1 && (
                  ` (${sale.installments}x ${sale.installment_frequency === 'Semanal' ? 'Semanal' : 'Mensal'})`
                )}
              </p>
              {sale.installments && sale.installments > 1 && (
                <p><span className="font-semibold">Valor da Parcela:</span> {formatBRL(sale.sell_price / sale.installments)}</p>
              )}
              <p><span className="font-semibold">Vendedor:</span> Kaleb Santos</p>
            </div>
          </section>

          <section className="bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] text-sm space-y-3">
            <h3 className="font-bold text-base mb-2">Termos e Condições de Garantia</h3>
            <p>1. <strong>Prazo e Cobertura:</strong> Este aparelho possui garantia de {warrantyMonths === 12 ? '1 (um) ano' : '6 (seis) meses'}, cobrindo exclusivamente defeitos de funcionamento de hardware decorrentes de vícios de fabricação. A garantia é válida de {format(saleDate, "dd/MM/yyyy")} até {format(endDate, "dd/MM/yyyy")}.</p>
            <p>2. <strong>Exclusões:</strong> Esta garantia não cobre danos decorrentes de mau uso, negligência, acidentes, contato com líquidos (oxidação), quedas, quebra de tela, ou qualquer dano físico. Estão excluídos também danos causados por software de terceiros, modificações não autorizadas (jailbreak/root) e uso de acessórios não compatíveis ou não originais.</p>
            <p>3. <strong>Violação de Selos:</strong> A remoção, dano ou violação de selos de garantia ou de segurança implica na perda imediata da cobertura.</p>
            <p>4. <strong>Procedimento:</strong> Para acionar a garantia, é obrigatória a apresentação deste termo. O prazo para análise técnica é de até 30 (trinta) dias, conforme legislação vigente.</p>
            {iphone && (
              <p>5. <strong>Brindes:</strong> O aparelho acompanha os seguintes brindes: fone de ouvido, capinha, película e carregador. É de exclusiva responsabilidade do cliente conferir a presença e integridade destes itens no ato da retirada do produto. Não serão fornecidos brindes posteriormente à saída do produto da loja caso não tenham sido verificados no momento da compra.</p>
            )}
            <p>{iphone ? '6' : '5'}. <strong>Limitação de Responsabilidade:</strong> A GODSHOP não se responsabiliza por perda de dados ou informações pessoais contidas no aparelho. Recomendamos a realização de backup prévio.</p>
          </section>

          <div className="pt-16 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-[#000000] pt-2">
                <p className="font-bold">Assinatura do Cliente</p>
                <p className="text-xs text-[#6b7280] mt-1">{client?.name}</p>
              </div>
            </div>
            <div>
              <div className="border-t border-[#000000] pt-2">
                <p className="font-bold">Assinatura do Vendedor</p>
                <p className="text-xs text-[#6b7280] mt-1">Kaleb Santos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Floating Download Button for Mobile */}
      <div className="fixed bottom-24 right-6 z-[60] sm:hidden">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
          title="Baixar PDF Agora"
        >
          {isDownloading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}
