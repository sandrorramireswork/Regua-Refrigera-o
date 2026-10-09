import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  LineChart,
} from "lucide-react";
import { toast } from "sonner";
import { REDS } from "@/lib/roulette";
import type { ResultadoPadraoUnico } from "@/lib/meta-padrao-confluencia-engine";
import { GraficoVolatilidadeAssertividade } from "./GraficoVolatilidadeAssertividade";

interface PainelStatusPadraoUnicoProps {
  resultado: ResultadoPadraoUnico;
  onSelectNumber?: (n: number) => void;
  className?: string;
}

export function PainelStatusPadraoUnico({
  resultado,
  onSelectNumber,
  className = "",
}: PainelStatusPadraoUnicoProps) {
  const [copiado, setCopiado] = useState(false);
  const [mostrarDetalhesPesos, setMostrarDetalhesPesos] = useState(false);
  const [mostrarGraficoChart, setMostrarGraficoChart] = useState(true);

  const {
    estado,
    estadoLabel,
    badgeTexto,
    mensagemPrincipal,
    mensagemSecundaria,
    corNeonPrincipal,
    corFundoClasse,
    concordanciaGeralPerc,
    assertividadeEstimadaPerc,
    nivelEntradaTexto,
    alvosFinais,
    duziaRecomendada,
    colunaRecomendada,
    setorRecomendado,
    terminaisRecomendados,
    coresRecomendadas,
    subPadroes,
    volatilidade,
    historicoTimeline,
  } = resultado;

  const copiarAlvos = () => {
    if (alvosFinais.length === 0) return;
    const texto = alvosFinais.join(", ");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success(`Alvos copiados para a área de transferência: [${texto}]`);
    setTimeout(() => setCopiado(false), 2000);
  };

  const getCorChip = (num: number) => {
    if (num === 0) return "bg-[#00E676] text-black border-[#00E676]";
    if (REDS.includes(num)) return "bg-[#E50914] text-white border-red-500";
    return "bg-[#111111] text-white border-slate-700";
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${corFundoClasse} ${className}`}
      data-panel-module="padrao-unico-confluencia"
    >
      {/* 1. CABEÇALHO PRINCIPAL DO STATUS (3 ESTADOS NEON) */}
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Ícone e Identificador de Estado */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border-2 shadow-lg shrink-0 ${
                estado === "SINAL_CONFIRMADO"
                  ? "border-[#00FF88] bg-emerald-950/80 shadow-[0_0_20px_rgba(0,255,136,0.6)] text-[#00FF88]"
                  : estado === "AGUARDAR_PROXIMA"
                  ? "border-[#FFB800] bg-yellow-950/80 shadow-[0_0_20px_rgba(255,184,0,0.5)] text-[#FFB800]"
                  : "border-[#FF1744] bg-red-950/90 shadow-[0_0_20px_rgba(255,23,68,0.6)] text-[#FF1744]"
              }`}
            >
              {estado === "SINAL_CONFIRMADO" ? (
                <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
              ) : estado === "AGUARDAR_PROXIMA" ? (
                <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 animate-bounce" />
              ) : (
                <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-display text-sm sm:text-base font-black uppercase tracking-wider text-stroke-black-sm drop-shadow-md"
                  style={{ color: corNeonPrincipal }}
                >
                  {estadoLabel}
                </span>

                <span
                  className={`rounded-full px-2 py-0.5 text-[8.5px] sm:text-[9px] font-mono font-bold uppercase border shadow-sm ${
                    estado === "SINAL_CONFIRMADO"
                      ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88]"
                      : estado === "AGUARDAR_PROXIMA"
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-red-500 bg-red-500/25 text-red-200"
                  }`}
                >
                  {badgeTexto}
                </span>
              </div>

              {/* Mensagem Principal Conforme Requisito Estrito */}
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-white/95 leading-snug drop-shadow-sm">
                {mensagemPrincipal}
              </p>
            </div>
          </div>

          {/* Badges de Concordância e Volatilidade */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Concordância */}
            <div className="rounded-xl border border-white/20 bg-black/60 px-2.5 py-1.5 text-center shadow-inner">
              <div className="text-[8px] sm:text-[8.5px] font-mono uppercase text-white/60">
                Concordância
              </div>
              <div
                className={`text-xs sm:text-sm font-display font-black tracking-tight ${
                  concordanciaGeralPerc >= 80 ? "text-[#00FF88]" : "text-amber-400"
                }`}
              >
                {concordanciaGeralPerc}%
              </div>
              <div className="text-[7.5px] font-mono text-white/50">Mín. 80%</div>
            </div>

            {/* Volatilidade vs Linha de Corte */}
            <div className="rounded-xl border border-white/20 bg-black/60 px-2.5 py-1.5 text-center shadow-inner">
              <div className="text-[8px] sm:text-[8.5px] font-mono uppercase text-white/60">
                Volatilidade 15G
              </div>
              <div
                className={`text-xs sm:text-sm font-display font-black tracking-tight ${
                  volatilidade.volatilidadePerc >= volatilidade.linhaDeCortePerc
                    ? "text-[#FF1744] animate-pulse"
                    : "text-emerald-400"
                }`}
              >
                {volatilidade.volatilidadePerc}%
              </div>
              <div className="text-[7.5px] font-mono text-white/50">
                Teto {volatilidade.linhaDeCortePerc}%
              </div>
            </div>

            {/* Nível de Entrada */}
            <div className="hidden md:block rounded-xl border border-cyan-400/40 bg-cyan-950/40 px-2.5 py-1.5 text-center">
              <div className="text-[8px] font-mono uppercase text-cyan-300/70">
                Nível de Entrada
              </div>
              <div className="text-xs font-display font-black text-neon-cyan truncate max-w-[120px]">
                {assertividadeEstimadaPerc}%
              </div>
              <div className="text-[7.5px] font-mono text-cyan-200/60 truncate">
                {nivelEntradaTexto}
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem Secundária de Diagnóstico Tático */}
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[9.5px] text-white/80 font-mono">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: corNeonPrincipal }} />
            <span className="truncate">{mensagemSecundaria}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMostrarGraficoChart((prev) => !prev)}
              className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/70 px-2 py-0.5 text-[8.5px] font-mono font-bold text-neon-cyan transition cursor-pointer"
            >
              <LineChart className="h-3 w-3" />
              <span>{mostrarGraficoChart ? "Ocultar Gráfico" : "Ver Chart.js"}</span>
            </button>

            <button
              type="button"
              onClick={() => setMostrarDetalhesPesos((prev) => !prev)}
              className="flex items-center gap-1 rounded border border-white/20 bg-white/5 hover:bg-white/15 px-2 py-0.5 text-[8.5px] font-mono text-white/90 transition cursor-pointer"
            >
              <Layers className="h-3 w-3" />
              <span>{mostrarDetalhesPesos ? "Menos" : "Pesos Dinâmicos"}</span>
              {mostrarDetalhesPesos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* 2. ALVOS CONVERGENTES DO PADRÃO ÚNICO (SE SINAL CONFIRMADO OU OPORTUNIDADE) */}
        {alvosFinais.length > 0 && estado !== "MESA_FORA_DE_FOCO" && (
          <div className="mt-3 rounded-xl border border-white/15 bg-black/70 p-2.5 sm:p-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-display font-black uppercase text-neon-gold">
                <Target className="h-4 w-4 text-neon-gold" />
                <span>Alvos do Padrão Único ({alvosFinais.length} números cirúrgicos):</span>
              </div>

              <div className="flex items-center gap-2">
                {duziaRecomendada && (
                  <span className="rounded border border-cyan-500/40 bg-cyan-950/40 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-cyan-300">
                    Dúzia {duziaRecomendada}ª
                  </span>
                )}
                {colunaRecomendada && (
                  <span className="rounded border border-cyan-500/40 bg-cyan-950/40 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-cyan-300">
                    Coluna {colunaRecomendada}ª
                  </span>
                )}
                {setorRecomendado && (
                  <span className="rounded border border-purple-500/40 bg-purple-950/40 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-purple-300">
                    {setorRecomendado}
                  </span>
                )}
                {terminaisRecomendados.length > 0 && (
                  <span className="rounded border border-emerald-500/40 bg-emerald-950/40 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-emerald-300">
                    Terminais {terminaisRecomendados.join("/")}
                  </span>
                )}

                <button
                  type="button"
                  onClick={copiarAlvos}
                  className="flex items-center gap-1 rounded-md border border-[#00FF88]/60 bg-emerald-950/80 px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-[#00FF88] hover:bg-[#00FF88]/20 transition cursor-pointer"
                >
                  {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiado ? "Copiado!" : "Copiar Alvos"}</span>
                </button>
              </div>
            </div>

            {/* Chips de Números Alvo */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {alvosFinais.map((num) => {
                const corChip = getCorChip(num);
                return (
                  <button
                    key={`alvo-padrao-unico-${num}`}
                    type="button"
                    onClick={() => onSelectNumber && onSelectNumber(num)}
                    title={`Número Alvo ${num} · Clique para registrar`}
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border font-mono text-xs sm:text-sm font-black shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer ${corChip}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. MATRIZ DE AUTOAJUSTE DE MERCADO E PESOS DINÂMICOS (EXPANSÍVEL) */}
        {mostrarDetalhesPesos && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/80 p-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
                <span>Autoajuste de Mercado Dinâmico (Janelas de 37 e 50 Giros)</span>
              </span>
              <span className="text-[8.5px] font-mono text-white/50">
                Se a mesa respeitar mais um padrão, seu peso aumenta automaticamente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {subPadroes.map((sub) => (
                <div
                  key={`subpadrao-${sub.tipo}`}
                  className={`rounded-lg border p-2 transition-all ${
                    sub.concordaComLider
                      ? "border-[#00FF88]/50 bg-emerald-950/30"
                      : "border-white/10 bg-white/[0.02] opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] font-mono text-white/60 mb-0.5">
                    <span className="uppercase font-bold">{sub.tipo}</span>
                    <span className="text-[#00FF88] font-bold">Peso {sub.pesoDinamicoPerc}%</span>
                  </div>

                  <div className="text-[10px] font-display font-black text-white truncate">
                    {sub.nome}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[8px] font-mono">
                    <span className="text-white/60">37G: {sub.winRate37}%</span>
                    <span className="text-white/60">50G: {sub.winRate50}%</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[8px]">
                    <span
                      className={`rounded px-1 py-0.2 font-mono font-bold ${
                        sub.concordaComLider
                          ? "bg-emerald-500/20 text-[#00FF88]"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {sub.concordaComLider ? "✓ Concorda" : "⚪ Neutro"}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">Score {sub.scoreEficacia}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. GRÁFICO CHART.JS DE VOLATILIDADE VS ASSERTIVIDADE (SE ATIVO) */}
      {mostrarGraficoChart && (
        <div className="border-t border-white/10 p-2.5 sm:p-3 bg-black/60 rounded-b-2xl">
          <GraficoVolatilidadeAssertividade
            timeline={historicoTimeline}
            linhaDeCorte={volatilidade.linhaDeCortePerc}
            volatilidadeAtual={volatilidade.volatilidadePerc}
            assertividadeAtual={assertividadeEstimadaPerc}
            isMesaForaDeFoco={volatilidade.isMesaForaDeFoco}
            altura={175}
          />
        </div>
      )}
    </div>
  );
}
