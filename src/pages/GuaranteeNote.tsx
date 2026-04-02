import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '../services/db';
import { formatBRL } from '../lib/formatCurrency';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function GuaranteeNote() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Pre-load libraries for faster PDF generation and better user gesture preservation
    import('jspdf');
    import('html2canvas');
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
    return <div>Carregando...</div>;
  }

  const sale = sales.find(s => s.id === id);
  if (!sale) return <div>Venda não encontrada.</div>;

  const saleDate = new Date(sale.sale_date);
  const endDate = addMonths(saleDate, 6);

  const iphone = iphones.find(i => i.id === sale.iphone_id);
  const consoleItem = consoles.find(c => c.id === sale.console_id);
  const client = clients.find(c => c.id === sale.client_id);

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

  const handleDownloadPDF = async () => {
    if (isDownloading || !printRef.current || !client || (!iphone && !consoleItem)) return;
    
    const toastId = toast.loading('Iniciando geração da nota...');
    setIsDownloading(true);
    
    // Guardar título original para restaurar depois
    const originalTitle = document.title;
    
    try {
      const element = document.getElementById('guarantee-note-content');
      if (!element) {
        toast.error('Elemento não encontrado', { id: toastId });
        setIsDownloading(false);
        return;
      }
      
      // 1. Carregar bibliotecas
      toast.loading('Carregando ferramentas...', { id: toastId });
      const [{ jsPDF }, { toJpeg }] = await Promise.all([
        import('jspdf'),
        import('html-to-image')
      ]);
      
      // 2. Capturar imagem
      toast.loading('Capturando imagem...', { id: toastId });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const imgData = await toJpeg(element, {
        quality: 0.8,
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
      });
      
      // 3. Criar PDF
      toast.loading('Gerando arquivo PDF...', { id: toastId });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Garantia_${safeName}.pdf`;
      
      // Mudar o título da página temporariamente (alguns WebViews usam isso como nome do arquivo)
      document.title = fileName;
      
      // 4. Finalizar e Enviar
      toast.loading('Finalizando...', { id: toastId });
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.share) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Garantia - ${client.name}`,
            });
            toast.success('Nota compartilhada!', { id: toastId });
            document.title = originalTitle;
            setIsDownloading(false);
            return;
          }
        } catch (shareError) {
          if ((shareError as Error).name === 'AbortError') {
            toast.dismiss(toastId);
            document.title = originalTitle;
            setIsDownloading(false);
            return;
          }
          console.warn('Share failed, falling back to download:', shareError);
        }
      }

      // Fallback para download direto
      try {
        // O pdf.save do jsPDF é o que tem melhor suporte a nomes de arquivos
        pdf.save(fileName);
        toast.success('Download iniciado!', { id: toastId });
        
        // Restaurar título após um tempo
        setTimeout(() => {
          document.title = originalTitle;
        }, 3000);
      } catch (saveError) {
        console.error('Standard save failed, trying Data URI:', saveError);
        const dataUri = pdf.output('datauristring').replace('application/pdf', 'application/octet-stream');
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.title = originalTitle;
        toast.success('Download via link!', { id: toastId });
      }

    } catch (error) {
      console.error('PDF Error:', error);
      document.title = originalTitle;
      toast.error('Erro ao gerar nota. Tente novamente.', { id: toastId });
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
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            title="Baixar PDF no dispositivo"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Baixando...' : 'Baixar PDF'}
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:bg-primary/90"
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
          className="text-[#000000] p-10 print:p-0 bg-[#ffffff]"
        >
          <div className="text-center border-b-2 border-[#000000] pb-6 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wider">Termo de Garantia</h1>
          <p className="text-[#4b5563] mt-2">Comprovante de Compra e Garantia</p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold border-b border-[#d1d5db] mb-3 pb-1">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><span className="font-semibold">Nome:</span> {client?.name}</p>
              <p><span className="font-semibold">Telefone:</span> {client?.phone}</p>
              {client?.cpf && <p><span className="font-semibold">CPF:</span> {client.cpf}</p>}
              {client?.email && <p><span className="font-semibold">Email:</span> {client.email}</p>}
              {client?.address && <p className="col-span-2"><span className="font-semibold">Endereço:</span> {client.address}</p>}
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
                  <p><span className="font-semibold">Status:</span> Seminovo/Usado</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">Modelo:</span> {consoleItem?.model}</p>
                  <p><span className="font-semibold">Versão:</span> {consoleItem?.version}</p>
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
            <p>1. <strong>Prazo e Cobertura:</strong> Este aparelho possui garantia de 6 (seis) meses, cobrindo exclusivamente defeitos de funcionamento de hardware decorrentes de vícios de fabricação. A garantia é válida de {format(saleDate, "dd/MM/yyyy")} até {format(endDate, "dd/MM/yyyy")}.</p>
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
    </div>
  );
}
