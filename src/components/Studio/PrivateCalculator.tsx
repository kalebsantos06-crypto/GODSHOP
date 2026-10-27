import React, { useState } from 'react';
import { formatBRL } from '../../lib/formatCurrency';
import { ShieldCheck, Calculator, DollarSign, ArrowUpRight, Percent, AlertCircle } from 'lucide-react';

export default function PrivateCalculator() {
  const [costPrice, setCostPrice] = useState<number>(2200);
  const [sellPrice, setSellPrice] = useState<number>(3190);
  const [cardFeePct, setCardFeePct] = useState<number>(8.5);
  const [shippingCost, setShippingCost] = useState<number>(35);
  const [packagingCost, setPackagingCost] = useState<number>(15);
  const [warrantyReserve, setWarrantyReserve] = useState<number>(50);

  // Math
  const cardFeeAmount = (sellPrice * cardFeePct) / 100;
  const totalDeductions = costPrice + cardFeeAmount + shippingCost + packagingCost + warrantyReserve;
  const netProfit = sellPrice - totalDeductions;
  const profitMarginPct = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
  const markupPct = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fadeIn">
      {/* Privacy Warning Header */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
            Área Estritamente Privada do Lojista
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Esta calculadora é confidencial e destinada exclusivamente ao seu controle interno de rentabilidade.
            <strong> Nenhuma dessas informações de custo ou margem jamais será exibida nos anúncios ou vídeos exportados.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Parameters */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calculator className="h-4 w-4 text-amber-500" />
            <h5 className="font-bold text-sm text-white">Parâmetros Comerciais</h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Custo do Aparelho (R$)
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Preço de Venda Praticado (R$)
              </label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-emerald-400 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Taxa de Cartão / Máquina (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={cardFeePct}
                onChange={(e) => setCardFeePct(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Frete / Entrega (R$)
              </label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Embalagem & Sacola (R$)
              </label>
              <input
                type="number"
                value={packagingCost}
                onChange={(e) => setPackagingCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Reserva de Garantia (R$)
              </label>
              <input
                type="number"
                value={warrantyReserve}
                onChange={(e) => setWarrantyReserve(Math.max(0, Number(e.target.value)))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <h5 className="font-bold text-sm text-white">Demonstrativo de Lucro Líquido Real</h5>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Receita Bruta</span>
                <span className="font-mono font-bold text-white">{formatBRL(sellPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>(-) Custo de Aquisição</span>
                <span className="font-mono text-red-400">-{formatBRL(costPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>(-) Taxa Máquina ({cardFeePct}%)</span>
                <span className="font-mono text-red-400">-{formatBRL(cardFeeAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>(-) Despesas (Frete + Embalagem + Reserva)</span>
                <span className="font-mono text-red-400">-{formatBRL(shippingCost + packagingCost + warrantyReserve)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                Lucro Líquido no Bolso:
              </span>
              <span className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatBRL(netProfit)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
              <div className="text-center p-2 rounded-lg bg-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Margem Líquida</span>
                <span className="font-black text-sm text-amber-400 font-mono">
                  {profitMarginPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-center p-2 rounded-lg bg-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase font-bold block">Markup s/ Custo</span>
                <span className="font-black text-sm text-blue-400 font-mono">
                  {markupPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
