import { useMemo, useState } from "react";
import { Compass, ShieldCheck, Zap, Layers, Sparkles, Activity, Target, Crosshair, Eye, EyeOff, X } from "lucide-react";
import { calculateBallisticFavorites, type BallisticFavoritesAnalysis } from "@/lib/ballistic-favorites";
import { analyzeCavaloCamuflado, type CavaloCamufladoAnalysis } from "@/lib/cavalo-camuflado";
import {
  trackAllPatterns,
  calculateConfluenceFromPatterns,
  CATALOGO_PADROES_TATICOS,
} from "@/lib/pattern-tracker-engine";
import { ConfluenceMainCard } from "./ConfluenceMainCard";
import { corDoNumero } from "./TabRodaAoVivo";
import type { Spin, SectorDef } from "@/lib/roulette";

interface BallisticFavoritesGridProps {
  spins?: Spin[] | undefined;
  setores?: SectorDef[] | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
}

export function BallisticFavoritesGrid({
  spins = [],
  setores,
  onSelectNumber,
}: BallisticFavoritesGridProps) {
  const [mostrarConfluencia, setMostrarConfluencia] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("roleta_mostrar_radar_confluencia");
      return saved === "true"; // Padrão: false (oculto por solicitação do usuário)
    } catch {
      return false;
    }
  });

  const toggleConfluencia = () => {
    setMostrarConfluencia((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta_mostrar_radar_confluencia", String(next));
      } catch {}
      return next;
    });
  };
  const analysis: BallisticFavoritesAnalysis = useMemo(() => {
    return calculateBallisticFavorites(spins, setores);
  }, [spins, setores]);

  const cavaloAnalysis: CavaloCamufladoAnalysis = useMemo(() => {
    return analyzeCavaloCamuflado(spins, analysis.targetNumbers);
  }, [spins, analysis.targetNumbers]);

  const trackedPatterns = useMemo(() => {
    return trackAllPatterns(spins, CATALOGO_PADROES_TATICOS, setores);
  }, [spins, setores]);

  const confluence = useMemo(() => {
    return calculateConfluenceFromPatterns(trackedPatterns, spins);
  }, [trackedPatterns, spins]);

  const {
    numbers,
    assertividadeG1,
    anguloUltimo,
    deltaMedio,
    deltaMedioCasas,
    tendenciaPrimaria,
    compensacaoAtiva,
    melhorDuzia,
    melhorColuna,
    corPredominante,
    paridadePredominante,
    magnitudePredominante,
  } = analysis;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-[#C084FC] bg-gradient-to-r from-[#200236]/95 via-[#0d0019]/98 to-[#200236]/95 p-3 sm:p-3.5 text-white shadow-[0_0_30px_rgba(192,132,252,0.45),inset_0_0_15px_rgba(192,132,252,0.18)] ring-1 ring-[#C084FC]/60 font-display transition-all"
      aria-label="8 Números Favoritos Balísticos"
    >
      {/* Luzes neon roxas de fundo */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[#A855F7]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-[#C084FC]/20 blur-3xl" />

      {/* HEADER FIXO TÁTICO: TÍTULO EM NEGRITO ROXO + BRANCO NEON VÍVIDO */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#C084FC]/40 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#A855F7] to-[#C084FC] text-black font-black shadow-[0_0_20px_#C084FC] animate-pulse">
            <Compass className="h-5 w-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white text-stroke-black drop-shadow-[0_0_10px_#FFFFFF] flex items-center gap-1.5">
                <span>GRADE TÁTICA BALÍSTICA · 8 FAVORITOS A REPETIR</span>
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#A855F7]/25 border border-[#C084FC]/60 px-2 py-0.5 font-mono text-[9px] font-black text-white drop-shadow-[0_0_6px_#FFFFFF]">
                <Activity className="h-3 w-3 text-[#C084FC]" />
                ÂNGULOS (θ) & DELTAS (Δ)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold text-[#E9D5FF] text-stroke-black-sm tracking-wide">
              {compensacaoAtiva ? (
                <>
                  <strong className="text-white font-black drop-shadow-[0_0_6px_#FFFFFF]">TENDÊNCIA FRACA DETECTADA:</strong>{" "}
                  Compensação multi-padrão ativada (Puxadas + Deflexão de Rotor + Frequência + Setor + Espelhos)
                </>
              ) : (
                <>
                  <strong className="text-white font-black drop-shadow-[0_0_6px_#FFFFFF]">TENDÊNCIA REGULAR:</strong> Projeção angular com alinhamento de rotor ativo
                </>
              )}
            </p>
          </div>
        </div>

        {/* BADGES: TENDÊNCIA E ASSERTIVIDADE G1 (2 ENTRADAS) */}
        <div className="flex items-center gap-2">
          {/* Status da Tendência */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#C084FC]/50 bg-black/85 px-2.5 py-1 shadow-[0_0_12px_rgba(192,132,252,0.3)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C084FC] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E9D5FF]" />
            </span>
            <div className="text-left">
              <div className="text-[8px] uppercase font-bold text-[#E9D5FF]/80">TENDÊNCIA BALÍSTICA</div>
              <div className="font-mono text-[10px] font-black text-white text-stroke-black drop-shadow-[0_0_6px_#FFFFFF]">
                {tendenciaPrimaria.toUpperCase()} {compensacaoAtiva && "(MULTI-PADRÃO)"}
              </div>
            </div>
          </div>

          {/* Badge de Assertividade G1 */}
          <div className="flex items-center gap-2 rounded-xl border-2 border-[#C084FC] bg-black/90 px-3 py-1 shadow-[0_0_18px_rgba(192,132,252,0.5)] ring-1 ring-white/30">
            <ShieldCheck className="h-5 w-5 text-[#C084FC] drop-shadow-[0_0_8px_#C084FC]" />
            <div className="text-right">
              <div className="text-[8px] uppercase font-bold text-white/80 tracking-wider">
                ASSERTIVIDADE G1 (2 ENTRADAS)
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-display text-xs sm:text-sm font-black text-white drop-shadow-[0_0_10px_#FFFFFF]">
                  {assertividadeG1.toFixed(1)}% G1
                </span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[8px] font-black uppercase border shadow-sm ${
                  analysis.ultimaVezG1 === "GREEN"
                    ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.4)]"
                    : "bg-red-500/25 text-red-300 border-red-500"
                }`}>
                  ÚLTIMA: {analysis.ultimaVezG1 === "GREEN" ? `🟢 GREEN (G${analysis.ultimaEntradaG1 ?? 1})` : "🔴 RED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRID TÁCTICO ROXO NEON COM 8 NÚMEROS FAVORITOS */}
      <div className="relative z-10 mt-3">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
          {numbers.map((item) => (
            <button
              key={`ballistic-fav-${item.num}`}
              type="button"
              onClick={() => onSelectNumber?.(item.num)}
              className="group relative flex flex-col items-center justify-between rounded-xl border-2 border-[#C084FC]/70 bg-gradient-to-b from-[#2a0447]/90 via-black/95 to-[#19012c]/95 p-2 transition-all hover:scale-105 hover:border-white hover:shadow-[0_0_22px_rgba(192,132,252,0.8)] cursor-pointer ring-1 ring-[#A855F7]/40 text-left"
              title={`Número ${item.num}: ${item.justificativa} · G1: ${item.acertoG1Perc.toFixed(0)}% · Última: ${item.ultimaVez}`}
            >
              {/* Rank Badge */}
              <div className="flex w-full items-center justify-between">
                <span className="rounded-md bg-purple-950/90 px-1.5 py-0.2 font-mono text-[8px] sm:text-[9px] font-black text-[#E9D5FF] border border-[#C084FC]/40 shadow-sm">
                  #{item.rank}
                </span>
                <span className="font-mono text-[8px] font-bold text-purple-300 uppercase">
                  {item.setor ? item.setor.slice(0, 3) : "RTR"}
                </span>
              </div>

              {/* Chip Circular do Número (Cores reais da roleta com glow neon) */}
              <div className="my-1.5 flex items-center justify-center">
                <div
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full font-display text-lg sm:text-xl font-black text-white text-stroke-black shadow-lg ring-2 ring-[#C084FC] group-hover:ring-white transition-all group-hover:scale-110"
                  style={{
                    background: corDoNumero(item.num),
                    border: corDoNumero(item.num) === "#000000" ? "2px solid #FFFFFF" : corDoNumero(item.num) === "#FF003C" ? "2px solid #FF003C" : "2px solid #00FF88",
                    boxShadow: corDoNumero(item.num) === "#FF003C" ? "0 0 16px rgba(255, 0, 60, 0.85)" : corDoNumero(item.num) === "#000000" ? "0 0 14px rgba(255, 255, 255, 0.75)" : "0 0 16px rgba(0, 255, 136, 0.85)",
                  }}
                >
                  <span className="drop-shadow-[0_0_8px_#FFFFFF]">{item.num}</span>
                </div>
              </div>

              {/* Probabilidade Calculada & % G1 com Última Vez FIXADA */}
              <div className="text-center w-full">
                <div className="flex items-center justify-between font-mono text-[8px] font-black px-0.5">
                  <span className="text-white drop-shadow-[0_0_6px_#FFFFFF]">{item.prob.toFixed(1)}%</span>
                  <span className="text-[#00E676] drop-shadow-[0_0_4px_#00E676]">{item.acertoG1Perc.toFixed(0)}% G1</span>
                </div>

                {/* Status Fixo da Última Vez (GREEN ou RED) */}
                <div className="mt-0.5 w-full">
                  <span
                    className={`inline-block w-full rounded py-0.2 px-0.5 font-mono text-[7px] sm:text-[7.5px] font-black uppercase border ${
                      item.ultimaVez === "GREEN"
                        ? "bg-[#00E676]/20 text-[#00E676] border-[#00E676]/60 shadow-[0_0_6px_rgba(0,230,118,0.3)]"
                        : "bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_6px_rgba(239,68,68,0.3)]"
                    }`}
                  >
                    ÚLTIMA: {item.ultimaVez === "GREEN" ? `🟢 GREEN (G${item.ultimaEntrada ?? 1})` : "🔴 RED"}
                  </span>
                </div>

                <span className="text-[7px] sm:text-[7.5px] font-bold text-[#E9D5FF] truncate block max-w-full tracking-tight px-0.5 mt-0.5" title={item.justificativa}>
                  {item.justificativa}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* NOTIFICAÇÃO PRINCIPAL & CONFLUÊNCIA DE DÚZIA E COLUNA (GRADE TÁTICA BALÍSTICA) */}
      {mostrarConfluencia ? (
        <ConfluenceMainCard
          confluence={confluence}
          onSelectNumber={onSelectNumber}
          onClose={toggleConfluencia}
          className="relative z-10 mt-3"
        />
      ) : (
        <div className="relative z-10 mt-2 flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-1.5 text-[9px] font-mono text-cyan-300/80">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" />
            <span>Radar de Confluência: <strong className="text-white/60">Oculto</strong></span>
            {confluence.isEntradaExpert && (
              <span className="rounded bg-emerald-950/80 border border-[#00FF88] px-1.5 py-0.2 text-[8px] font-bold text-[#00FF88] animate-pulse">
                ⚡ ENTRADA NÍVEL EXPERT ATIVA
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleConfluencia}
            aria-label="Exibir Radar de Confluência"
            className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/60 px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase text-neon-cyan transition cursor-pointer"
          >
            <Eye className="h-3 w-3" />
            <span>Exibir Radar</span>
          </button>
        </div>
      )}

      {/* ALERTA TÁTICO: MELHOR MOMENTO PARA PEGAR DÚZIA E COLUNA CONFORME A FORÇA DO CAVALO CAMUFLADO */}
      <div
        className={`relative z-10 mt-3 rounded-xl border-2 p-3 transition-all ${
          cavaloAnalysis.veredictoTipo === "forte"
            ? "border-[#00E676] bg-gradient-to-r from-emerald-950/90 via-black/95 to-purple-950/90 shadow-[0_0_24px_rgba(0,230,118,0.45)] ring-1 ring-[#00E676]/60"
            : cavaloAnalysis.veredictoTipo === "atencao"
              ? "border-[#FACC15] bg-gradient-to-r from-amber-950/90 via-black/95 to-purple-950/90 shadow-[0_0_20px_rgba(250,204,21,0.35)] ring-1 ring-[#FACC15]/50"
              : "border-red-500/60 bg-gradient-to-r from-red-950/80 via-black/95 to-purple-950/80 shadow-[0_0_18px_rgba(239,68,68,0.25)] ring-1 ring-red-500/40"
        }`}
      >
        {/* Top bar do alerta */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  cavaloAnalysis.veredictoTipo === "forte"
                    ? "bg-[#00E676]"
                    : cavaloAnalysis.veredictoTipo === "atencao"
                      ? "bg-[#FACC15]"
                      : "bg-red-500"
                }`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  cavaloAnalysis.veredictoTipo === "forte"
                    ? "bg-[#00E676]"
                    : cavaloAnalysis.veredictoTipo === "atencao"
                      ? "bg-[#FACC15]"
                      : "bg-red-500"
                }`}
              />
            </span>
            <div className="flex items-center gap-1.5">
              <Zap className={`h-4 w-4 ${
                cavaloAnalysis.veredictoTipo === "forte"
                  ? "text-[#00E676] drop-shadow-[0_0_6px_#00E676]"
                  : cavaloAnalysis.veredictoTipo === "atencao"
                    ? "text-[#FACC15]"
                    : "text-red-400"
              }`} />
              <h3 className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white text-stroke-black drop-shadow-[0_0_8px_#FFFFFF]">
                {cavaloAnalysis.tituloAlerta}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/90 px-2.5 py-0.5 font-mono text-[9px] font-black uppercase text-white/90 border border-white/20">
              CAVALO {cavaloAnalysis.cavaloAtivo.label} · FORÇA {cavaloAnalysis.cavaloAtivo.forcaScore.toFixed(0)}%
            </span>
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[9px] font-black uppercase border shadow-sm ${
                cavaloAnalysis.veredictoTipo === "forte"
                  ? "bg-[#00E676]/25 text-[#00E676] border-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.5)]"
                  : cavaloAnalysis.veredictoTipo === "atencao"
                    ? "bg-[#FACC15]/25 text-[#FACC15] border-[#FACC15]"
                    : "bg-red-500/25 text-red-300 border-red-500"
              }`}
            >
              {cavaloAnalysis.badgeText}
            </span>
          </div>
        </div>

        {/* Linha de recomendação e métricas do cavalo */}
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          {/* Card Dúzia Recomendada */}
          <div className="rounded-xl border border-white/15 bg-black/80 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9px] font-bold text-white/70 uppercase">
              <span>Melhor Dúzia</span>
              <span className="text-neon-gold font-mono font-black">{cavaloAnalysis.melhorDuzia.confiancaPerc.toFixed(0)}% Confiança</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-sm sm:text-base font-black text-white text-stroke-black drop-shadow-[0_0_6px_#FFFFFF]">
                {cavaloAnalysis.melhorDuzia.nome}
              </span>
              <span className="rounded bg-[#00E676]/20 px-1 py-0.2 font-mono text-[7.5px] font-black uppercase text-[#00E676] border border-[#00E676]/50">
                G1: {cavaloAnalysis.melhorDuzia.confiancaPerc.toFixed(0)}% · 🟢 GREEN
              </span>
            </div>
          </div>

          {/* Card Coluna Recomendada */}
          <div className="rounded-xl border border-white/15 bg-black/80 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9px] font-bold text-white/70 uppercase">
              <span>Melhor Coluna</span>
              <span className="text-neon-gold font-mono font-black">{cavaloAnalysis.melhorColuna.confiancaPerc.toFixed(0)}% Confiança</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-sm sm:text-base font-black text-white text-stroke-black drop-shadow-[0_0_6px_#FFFFFF]">
                {cavaloAnalysis.melhorColuna.nome}
              </span>
              <span className="rounded bg-[#00E676]/20 px-1 py-0.2 font-mono text-[7.5px] font-black uppercase text-[#00E676] border border-[#00E676]/50">
                G1: {cavaloAnalysis.melhorColuna.confiancaPerc.toFixed(0)}% · 🟢 GREEN
              </span>
            </div>
          </div>

          {/* Card Tração do Cavalo */}
          <div className="rounded-xl border border-white/15 bg-black/80 p-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[9px] font-bold text-white/70 uppercase">
              <span>Tração de Puxada</span>
              <span className="text-neon-cyan font-mono font-black">
                {cavaloAnalysis.cavaloAtivo.puxadaDeUltimoPerc.toFixed(1)}% Taxa
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-[9px]">
              <span className="text-white/80">
                De <strong>{cavaloAnalysis.ultimoGrupoId}</strong> ➔ <strong>{cavaloAnalysis.cavaloAtivo.label}</strong>
              </span>
              <span className="text-neon-gold font-bold">
                Z: {cavaloAnalysis.cavaloAtivo.zScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Checklist Tático de Confirmação (Tier 1 / Força do Cavalo) */}
        <div className="mt-2.5 rounded-lg border border-white/10 bg-black/70 p-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1.5">
            <span className="font-mono text-[9px] font-black uppercase text-purple-200 flex items-center gap-1">
              <Crosshair className="h-3 w-3 text-[#C084FC]" />
              CHECKLIST DO CAVALO CAMUFLADO · CRITÉRIOS DE DISPARO
            </span>
            <span className="text-[8px] font-mono text-white/60">
              {cavaloAnalysis.checklist.filter((c) => c.ok).length}/{cavaloAnalysis.checklist.length} Aprovados
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 text-[8.5px]">
            {cavaloAnalysis.checklist.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between rounded px-2 py-0.5 border ${
                  item.ok
                    ? "border-[#00E676]/40 bg-[#00E676]/10 text-[#00E676]"
                    : "border-white/10 bg-black/40 text-white/50"
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="font-black">{item.ok ? "✓" : "✗"}</span>
                  <span className="truncate">{item.rotulo}</span>
                </span>
                <span className="font-mono font-bold text-white/80 shrink-0 ml-1">{item.detalhe}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instrução Tática Operacional */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px]">
          <div className="text-white/90">
            <strong className="text-white font-black drop-shadow-[0_0_6px_#FFFFFF]">INSTRUÇÃO TÁTICA: </strong>
            <span>{cavaloAnalysis.explicacao}</span>
          </div>
          {cavaloAnalysis.alvosConvergentesNoCavalo.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-bold text-purple-300 uppercase">Alvos do Cavalo:</span>
              <div className="flex items-center gap-1">
                {cavaloAnalysis.alvosConvergentesNoCavalo.map((num) => (
                  <button
                    key={`cav-num-${num}`}
                    type="button"
                    onClick={() => onSelectNumber?.(num)}
                    className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-black text-white text-stroke-black shadow-sm ring-1 ring-[#C084FC] hover:scale-115 transition-all cursor-pointer"
                    style={{
                      background: corDoNumero(num),
                      border: corDoNumero(num) === "#000000" ? "1.5px solid #FFFFFF" : corDoNumero(num) === "#FF003C" ? "1.5px solid #FF003C" : "1.5px solid #00FF88",
                      boxShadow: corDoNumero(num) === "#FF003C" ? "0 0 8px rgba(255, 0, 60, 0.8)" : corDoNumero(num) === "#000000" ? "0 0 8px rgba(255, 255, 255, 0.7)" : "0 0 8px rgba(0, 255, 136, 0.8)",
                    }}
                    title={`Apostar no número ${num} (Cavalo ${cavaloAnalysis.cavaloAtivo.label})`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAINEL INFORMATIVO TÁCTICO INFERIOR: MÉTRICAS BALÍSTICAS + CONVERGÊNCIA (DÚZIA, COLUNA, CHANCES SIMPLES) */}
      <div className="relative z-10 mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2 text-[9px] sm:text-[10px]">
        {/* 1. Métricas de Rotor */}
        <div className="flex items-center justify-between rounded-xl border border-[#C084FC]/40 bg-black/80 px-2.5 py-1.5 shadow-sm">
          <span className="flex items-center gap-1.5 font-bold text-white/80">
            <Target className="h-3.5 w-3.5 text-[#C084FC]" />
            <span>Física do Rotor:</span>
          </span>
          <span className="font-mono font-black text-white drop-shadow-[0_0_6px_#FFFFFF]">
            Ângulo {anguloUltimo.toFixed(0)}° · Δ {deltaMedio > 0 ? "+" : ""}{deltaMedio.toFixed(0)}° ({deltaMedioCasas} casas)
          </span>
        </div>

        {/* 2. Dúzia e Coluna Fortes */}
        <div className="flex items-center justify-between rounded-xl border border-[#C084FC]/40 bg-black/80 px-2.5 py-1.5 shadow-sm">
          <span className="flex items-center gap-1.5 font-bold text-white/80">
            <Layers className="h-3.5 w-3.5 text-[#C084FC]" />
            <span>Dúzia & Coluna:</span>
          </span>
          <div className="flex items-center gap-2 font-mono font-black">
            <span className="text-white drop-shadow-[0_0_6px_#FFFFFF]">
              {melhorDuzia.nome} ({melhorDuzia.perc.toFixed(0)}%)
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white drop-shadow-[0_0_6px_#FFFFFF]">
              {melhorColuna.nome} ({melhorColuna.perc.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* 3. Chances Simples */}
        <div className="flex items-center justify-between rounded-xl border border-[#C084FC]/40 bg-black/80 px-2.5 py-1.5 shadow-sm">
          <span className="flex items-center gap-1.5 font-bold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[#C084FC]" />
            <span>Chances Simples:</span>
          </span>
          <div className="flex items-center gap-1.5 font-mono font-black text-[8.5px] sm:text-[9.5px]">
            <span className="flex items-center gap-1 text-white drop-shadow-[0_0_6px_#FFFFFF]">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: corPredominante.corCode }} />
              {corPredominante.nome} ({corPredominante.perc.toFixed(0)}%)
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white drop-shadow-[0_0_6px_#FFFFFF]">
              {paridadePredominante.nome} ({paridadePredominante.perc.toFixed(0)}%)
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white drop-shadow-[0_0_6px_#FFFFFF]">
              {magnitudePredominante.nome.split(" ")[0]} ({magnitudePredominante.perc.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
