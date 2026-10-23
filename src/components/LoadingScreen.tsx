import React, { useState, useEffect } from 'react';
import { Smartphone, Sparkles, Quote } from 'lucide-react';

const TIPS = [
  "Inovação é dizer não a mil coisas. Foque nos modelos de iPhone mais procurados! — Inspirado em Steve Jobs",
  "O pós-venda excelente é sua melhor ferramenta. Um cliente satisfeito trará três novos!",
  "Tenha sempre acessórios de alta margem visíveis no balcão para compras por impulso.",
  "Monitore a saúde da bateria dos iPhones seminovos. Acima de 85% vendem muito mais rápido!",
  "Seu estoque parado é dinheiro congelado. Faça combos de consoles com jogos para girar o caixa.",
  "Crie vídeos curtos comparando as câmeras dos iPhones. O alcance orgânico atrai clientes!",
  "Foque na velocidade do atendimento. Quem responde primeiro geralmente fecha a venda!",
  "Trabalhe com o sistema de 'Trade-In' (aceitar celular usado). Isso facilita o upgrade do cliente.",
  "Seja transparente sobre a procedência de cada item. A confiança vale mais do que uma venda.",
  "Ofereça kits prontos: console + jogo popular + controle extra. Facilita a decisão de compra.",
  "A experiência de unboxing é sagrada. Use sacolas personalizadas para marcar a memória.",
  "Acompanhe de perto seu lucro líquido real. Conheça suas margens em cada aparelho.",
  "Não venda apenas hardware; venda diversão e conexão. Clientes compram emoções.",
  "Esteja atento a lançamentos de novos iPhones para planejar suas campanhas antecipadamente!"
];

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Carregando GODSHOP..." }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Change tip every 4 seconds
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-slate-100 overflow-hidden relative">
      {/* Background blur effects */}
      <div className="absolute -right-20 -top-20 h-64 w-64 bg-blue-600/10 blur-[100px] animate-pulse"></div>
      <div className="absolute -left-20 -bottom-20 h-64 w-64 bg-emerald-600/10 blur-[100px] animate-pulse delay-700"></div>

      <div className="z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Animated Logo/Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse"></div>
          <div className="bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-2xl relative">
            <Smartphone className="h-12 w-12 text-primary animate-bounce" />
          </div>
        </div>

        {/* Status Message */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm font-bold tracking-[0.2em] uppercase text-slate-400 animate-pulse">
            {message}
          </span>
        </div>

        {/* Tips Section */}
        <div className="mt-8 w-full">
          <div className="relative p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm overflow-hidden group">
            <Quote className="absolute -left-2 -top-2 h-8 w-8 text-primary/10 rotate-12" />
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-black tracking-[0.1em] text-primary/80 uppercase">
                  Dica de Vendas
                </span>
              </div>
              
              <p className="text-sm font-medium leading-relaxed italic text-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-500 key={tipIndex}">
                "{TIPS[tipIndex]}"
              </p>
            </div>

            {/* Progress bar for tips */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-primary/20 w-full">
              <div 
                className="h-full bg-primary transition-all duration-[4000ms] ease-linear"
                key={tipIndex}
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-slate-600 mt-4 font-medium uppercase tracking-widest">
            Aproveite estas dicas enquanto aguarda
          </p>
        </div>
      </div>
    </div>
  );
}
