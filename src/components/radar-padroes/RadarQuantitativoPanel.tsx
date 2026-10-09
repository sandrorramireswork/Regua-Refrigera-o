import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Eye,
  Copy,
  Check,
  X,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  processarEstatisticasAmostra,
  gerarAlertasEstatisticos,
  enriquecerAlertaInstitucional,
  NUMEROS_VERMELHOS,
  type AlertaPadraoExpert,
} from "@/lib/radar-padroes-engine";
import { toast } from "sonner";
import type { UnifiedAlertItem } from "@/lib/alert-confluence";
import type { MostAssertivePatternAlert } from "@/lib/pattern-tracker-engine";

const PURPLE_BLACK_RAJADO_STYLE: React.CSSProperties = {
  backgroundColor: "#080112",
  backgroundImage: `
    radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.28) 0%, transparent 70%),
    radial-gradient(ellipse at 80% 100%, rgba(126, 34, 206, 0.22) 0%, transparent 60%),
    repeating-linear-gradient(45deg, rgba(147, 51, 234, 0.18) 0px, rgba(147, 51, 234, 0.18) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(-45deg, rgba(168, 85, 247, 0.14) 0px, rgba(168, 85, 247, 0.14) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.88) 0px, rgba(0, 0, 0, 0.88) 4px, transparent 4px, transparent 8px),
    linear-gradient(160deg, #130222 0%, #06000c 50%, #150226 100%)
  `,
};

const HEADER_RAJADO_STYLE: React.CSSProperties = {
  backgroundColor: "#16032b",
  backgroundImage: `
    repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.18) 0px, rgba(168, 85, 247, 0.18) 2px, transparent 2px, transparent 12px),
    repeating-linear-gradient(-45deg, rgba(126, 34, 206, 0.14) 0px, rgba(126, 34, 206, 0.14) 2px, transparent 2px, transparent 12px),
    linear-gradient(180deg, rgba(28, 4, 51, 0.97) 0%, rgba(14, 2, 26, 0.98) 100%)
  `,
};

export interface RadarQuantitativoPanelProps {
  externalNumbers?: number[] | undefined;
  onAddNumber?: ((num: number) => void) | undefined;
  alerts?: UnifiedAlertItem[] | undefined;
  tacticalPatternAlert?: MostAssertivePatternAlert | null | undefined;
  onClose?: (() => void) | undefined;
  className?: string | undefined;
}

export function RadarQuantitativoPanel({
  externalNumbers = [],
  onAddNumber,
  alerts: externalAlerts = [],
  tacticalPatternAlert,
  onClose,
  className = "",
}: RadarQuantitativoPanelProps) {
  // Posição flutuante arrastável persistida
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 40, y: 140 };
    try {
      const saved = localStorage.getItem("radar_quantitativo_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 40, y: 140 };
  });

  const [minimized, setMinimized] = useState<boolean>(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modo de filtragem institucional
  const [filtroModo, setFiltroModo] = useState<"EXPERT_MAXIMO" | "AUDITORIA">(() => {
    if (typeof window === "undefined") return "EXPERT_MAXIMO";
    try {
      const s = localStorage.getItem("radar_quantitativo_filtro_modo");
      return s === "AUDITORIA" ? "AUDITORIA" : "EXPERT_MAXIMO";
    } catch {
      return "EXPERT_MAXIMO";
    }
  });

  const handleSetFiltroModo = (modo: "EXPERT_MAXIMO" | "AUDITORIA") => {
    setFiltroModo(modo);
    try {
      localStorage.setItem("radar_quantitativo_filtro_modo", modo);
    } catch {}
  };

  const handleAddNumber = (num: number) => {
    onAddNumber?.(num);
  };

  const handleCopiarAlvos = (alvos: number[], titulo: string) => {
    if (!alvos || alvos.length === 0) return;
    const texto = alvos.join(", ");
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoId(titulo);
      toast.success(`Alvos copiados: ${texto}`, {
        description: `Sinal: ${titulo}`,
      });
      setTimeout(() => setCopiadoId(null), 2500);
    });
  };

  // Processamento estatístico
  const sampleSize = 30;
  const activeNumbers = useMemo(() => {
    if (!Array.isArray(externalNumbers)) return [];
    return externalNumbers.slice(0, sampleSize);
  }, [externalNumbers]);

  const stats = useMemo(() => {
    return processarEstatisticasAmostra(activeNumbers, sampleSize);
  }, [activeNumbers]);

  const rawAlerts = useMemo(() => {
    return gerarAlertasEstatisticos(activeNumbers, stats);
  }, [activeNumbers, stats]);

  const alertasInstitucionais = useMemo(() => {
    return rawAlerts.map(enriquecerAlertaInstitucional);
  }, [rawAlerts]);

  // Alertas filtrados por modo institucional
  const alertasFiltrados = useMemo(() => {
    const internos = alertasInstitucionais.filter((al) => {
      if (filtroModo === "EXPERT_MAXIMO") {
        return al.classificacao === "NIVEL_MAXIMO" || al.classificacao === "EXPERT";
      }
      return true;
    });

    const externos = externalAlerts.map((al) => {
      const isMaximo = (al.priority ?? 0) >= 90 || (al.accuracy2Entries ?? 0) >= 80;
      const isExpert = (al.priority ?? 0) >= 75 || (al.accuracy2Entries ?? 0) >= 70;
      return {
        ...al,
        classificacao: isMaximo ? "NIVEL_MAXIMO" : isExpert ? "EXPERT" : "PADRAO",
      };
    }).filter((al) => {
      if (filtroModo === "EXPERT_MAXIMO") {
        return al.classificacao === "NIVEL_MAXIMO" || al.classificacao === "EXPERT";
      }
      return true;
    });

    let tacticalVisivel = false;
    let tacticalClassificacao: "NIVEL_MAXIMO" | "EXPERT" | "PADRAO" = "PADRAO";

    if (tacticalPatternAlert && tacticalPatternAlert.temAlertaAtivo) {
      const isMax = tacticalPatternAlert.isEntradaExpert || tacticalPatternAlert.probabilidadeAcertos >= 80;
      const isExp = tacticalPatternAlert.probabilidadeAcertos >= 60 || tacticalPatternAlert.taxaG1 >= 70;
      tacticalClassificacao = isMax ? "NIVEL_MAXIMO" : isExp ? "EXPERT" : "PADRAO";
      tacticalVisivel = filtroModo === "EXPERT_MAXIMO" ? (isMax || isExp) : true;
    }

    const totalNivelMaximo =
      internos.filter((i) => i.classificacao === "NIVEL_MAXIMO").length +
      externos.filter((e) => e.classificacao === "NIVEL_MAXIMO").length +
      (tacticalVisivel && tacticalClassificacao === "NIVEL_MAXIMO" ? 1 : 0);

    const totalExpert =
      internos.filter((i) => i.classificacao === "EXPERT").length +
      externos.filter((e) => e.classificacao === "EXPERT").length +
      (tacticalVisivel && tacticalClassificacao === "EXPERT" ? 1 : 0);

    const totalVisiveis =
      internos.length +
      externos.length +
      (tacticalVisivel ? 1 : 0);

    const totalPossiveis =
      alertasInstitucionais.length +
      externalAlerts.length +
      (tacticalPatternAlert?.temAlertaAtivo ? 1 : 0);

    const ruidoOcultadoCount = Math.max(0, totalPossiveis - totalVisiveis);

    return {
      internos,
      externos,
      tacticalVisivel,
      tacticalClassificacao,
      totalVisiveis,
      totalNivelMaximo,
      totalExpert,
      ruidoOcultadoCount,
    };
  }, [alertasInstitucionais, externalAlerts, tacticalPatternAlert, filtroModo]);

  // Se minimizado: pílula compacta
  if (minimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 65,
        }}
        onDragEnd={(_, info) => {
          const newPos = {
            x: position.x + info.offset.x,
            y: position.y + info.offset.y,
          };
          setPosition(newPos);
          try {
            localStorage.setItem("radar_quantitativo_pos", JSON.stringify(newPos));
          } catch {}
        }}
        className={`select-none cursor-grab active:cursor-grabbing font-sans ${className}`}
      >
        <div
          style={PURPLE_BLACK_RAJADO_STYLE}
          className="flex items-center gap-2 rounded-2xl border-2 border-amber-400 px-3.5 py-2 shadow-[0_0_25px_rgba(251,191,36,0.5)] backdrop-blur-xl text-white"
        >
          <GripHorizontal className="h-4 w-4 text-amber-300 opacity-90" />
          <Crown className="h-4 w-4 text-amber-400" />
          <div className="flex flex-col pr-1">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
              RADAR QUANTITATIVO
            </span>
            <span className="text-[8.5px] font-mono text-white font-bold">
              {alertasFiltrados.totalVisiveis} sinais qualificados
            </span>
          </div>

          <button
            onClick={() => setMinimized(false)}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-white/20 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            title="Expandir Radar Quantitativo"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded border border-white/60 bg-black/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ scale: 0.96, opacity: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 65,
      }}
      onDragEnd={(_, info) => {
        const newPos = {
          x: position.x + info.offset.x,
          y: position.y + info.offset.y,
        };
        setPosition(newPos);
        try {
          localStorage.setItem("radar_quantitativo_pos", JSON.stringify(newPos));
        } catch {}
      }}
      className={`w-[96vw] sm:w-[540px] md:w-[580px] select-none font-sans ${className}`}
      data-component="radar-quantitativo-flutuante"
    >
      <div
        style={PURPLE_BLACK_RAJADO_STYLE}
        className="relative flex flex-col rounded-3xl border-2 border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.35),inset_0_0_20px_rgba(255,255,255,0.15)] backdrop-blur-2xl overflow-hidden text-white max-h-[85vh]"
      >
        {/* CABEÇALHO DO RADAR QUANTITATIVO */}
        <div
          style={HEADER_RAJADO_STYLE}
          className="flex items-center justify-between border-b-2 border-amber-400/50 px-4 py-2.5 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2.5">
            <GripHorizontal className="h-4 w-4 text-amber-300 opacity-90 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black shadow-[0_0_12px_#fbbf24]">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  RADAR QUANTITATIVO
                </h3>
                <span className="rounded bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[8px] px-1.5 py-0.2 uppercase shadow-[0_0_8px_#fbbf24]">
                  SINAIS QUALIFICADOS
                </span>
              </div>
              <p className="text-[9px] text-amber-300 font-mono font-bold">
                Filtro Institucional de Nível Máximo & Expert (Amostra 30 Giros)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* BOTÕES DE CONTROLE DO FILTRO */}
            <div className="flex items-center gap-1 rounded-xl bg-black/90 p-0.5 border border-white/40">
              <button
                type="button"
                onClick={() => handleSetFiltroModo("EXPERT_MAXIMO")}
                title="Exibir exclusivamente notificações de Nível Máximo e Expert"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8.5px] font-mono font-black uppercase transition-all cursor-pointer ${
                  filtroModo === "EXPERT_MAXIMO"
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_10px_#fbbf24]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <span>Expert ({alertasFiltrados.totalNivelMaximo + alertasFiltrados.totalExpert})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetFiltroModo("AUDITORIA")}
                title="Modo Auditoria: Exibe todos os padrões"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8.5px] font-mono font-black uppercase transition-all cursor-pointer ${
                  filtroModo === "AUDITORIA"
                    ? "bg-white text-black shadow-[0_0_8px_#ffffff]"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span>Tudo</span>
              </button>
            </div>

            <button
              onClick={() => setMinimized(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/60 bg-black/60 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="Minimizar"
            >
              <Minimize2 className="h-3 w-3" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/60 bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* CORPO DO RADAR QUANTITATIVO: LISTA DE NOTIFICAÇÕES */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[72vh]">
          {/* 1. SINAL TÁTICO DE DISPARO (SE FOR EXPERT OU NÍVEL MÁXIMO) */}
          {alertasFiltrados.tacticalVisivel && tacticalPatternAlert && (
            <motion.div
              key={`tac-qualificado-${tacticalPatternAlert.padraoLider.code}`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`rounded-2xl border-2 p-3 space-y-2.5 transition-all shadow-[0_0_30px_rgba(251,191,36,0.35)] ${
                alertasFiltrados.tacticalClassificacao === "NIVEL_MAXIMO"
                  ? "border-amber-400 bg-gradient-to-b from-[#241701] via-[#120b00] to-black"
                  : "border-cyan-400 bg-gradient-to-b from-[#011e22] via-[#010e11] to-black"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/20 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shadow-[0_0_10px_#fbbf24]" />
                  <h4 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
                    <span>🚨 DISPARO TÁTICO SNIPER</span>
                    <span className="rounded bg-gradient-to-r from-amber-400 to-yellow-500 border border-white px-1.5 py-0.2 text-[8px] font-black uppercase text-black shadow-[0_0_8px_#ffffff]">
                      {alertasFiltrados.tacticalClassificacao === "NIVEL_MAXIMO" ? "👑 NÍVEL MÁXIMO" : "⚡ EXPERT TIER 1"}
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-black/80 border border-amber-400/80 px-2 py-0.5 text-[8.5px] font-black uppercase text-amber-300 font-mono">
                    SCORE {tacticalPatternAlert.padraoLider.scoreConfianca}/100
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopiarAlvos(
                        tacticalPatternAlert.alvosIntersecao.length > 0
                          ? tacticalPatternAlert.alvosIntersecao
                          : tacticalPatternAlert.padraoLider.alvosArray,
                        `Disparo ${tacticalPatternAlert.padraoLider.code}`
                      )
                    }
                    className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 border border-white/30 px-2 py-0.5 text-[8.5px] font-mono text-white cursor-pointer transition"
                  >
                    {copiadoId === `Disparo ${tacticalPatternAlert.padraoLider.code}` ? (
                      <Check className="h-3 w-3 text-[#00FF88]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-200 font-mono font-bold leading-relaxed">
                {tacticalPatternAlert.mensagemTatica}
              </p>

              {/* FAIXA DE MÉTRICAS QUANTITATIVAS DE INVESTIMENTO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Assertividade G1</span>
                  <span className="text-xs sm:text-sm font-black text-[#00FF88] block font-mono">
                    {tacticalPatternAlert.taxaG1.toFixed(1)}%
                  </span>
                </div>

                <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Valor Esperado</span>
                  <span className="text-xs sm:text-sm font-black text-amber-300 block font-mono">
                    +EV +{((tacticalPatternAlert.taxaG1 - 50) * 0.75 + 10).toFixed(1)}%
                  </span>
                </div>

                <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Dúzia Alvo</span>
                  <span className="text-xs sm:text-sm font-black text-cyan-300 block font-mono">
                    {tacticalPatternAlert.duziaIndicada.nome}
                  </span>
                </div>

                <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Coluna Alvo</span>
                  <span className="text-xs sm:text-sm font-black text-cyan-300 block font-mono">
                    {tacticalPatternAlert.colunaIndicada.nome}
                  </span>
                </div>
              </div>

              {/* NÚMEROS DA INTERSEÇÃO SNIPER COM CORES REAIS */}
              {tacticalPatternAlert.alvosIntersecao.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[8.5px] font-mono text-amber-300 uppercase font-black">
                    Alvos de Interseção:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {tacticalPatternAlert.alvosIntersecao.map((num) => {
                      const isRed = NUMEROS_VERMELHOS.has(num);
                      return (
                        <button
                          key={`tactical-intersec-${num}`}
                          type="button"
                          onClick={() => handleAddNumber(num)}
                          title={`Inserir número ${num}`}
                          className={`flex h-6 w-6 items-center justify-center rounded text-[9.5px] font-black font-mono text-white border-2 border-white transition-transform hover:scale-125 cursor-pointer shadow-[0_0_8px_rgba(255,255,255,0.4)] ${
                            num === 0
                              ? "bg-[#00E676] text-black border-[#00FF88]"
                              : isRed
                              ? "bg-[#FF003C] text-white border-red-500"
                              : "bg-black text-white border-slate-600"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. SINAIS QUALIFICADOS DO MOTOR ESTATÍSTICO (NÍVEL MÁXIMO & EXPERT) */}
          {alertasFiltrados.internos.map((al) => {
            const isMaximo = al.classificacao === "NIVEL_MAXIMO";
            return (
              <motion.div
                key={`qualificado-interno-${al.id}`}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`rounded-2xl border-2 p-3 space-y-2.5 transition-all shadow-[0_0_25px_rgba(0,0,0,0.8)] ${
                  isMaximo
                    ? "border-amber-400 bg-gradient-to-b from-[#241701] via-[#120b00] to-black shadow-[0_0_30px_rgba(251,191,36,0.35)]"
                    : "border-cyan-400 bg-gradient-to-b from-[#011e22] via-[#010e11] to-black shadow-[0_0_25px_rgba(0,255,255,0.3)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/20 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full animate-ping ${
                        isMaximo ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]" : "bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                      }`}
                    />
                    <h4 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
                      <span>{al.titulo}</span>
                      <span
                        className={`rounded border border-white px-1.5 py-0.2 text-[8px] font-black uppercase ${
                          isMaximo
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_8px_#fbbf24]"
                            : "bg-cyan-500 text-black shadow-[0_0_8px_#06b6d4]"
                        }`}
                      >
                        {isMaximo ? "👑 NÍVEL MÁXIMO" : "⚡ EXPERT TIER 1"}
                      </span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-black/80 border border-white/40 px-2 py-0.5 text-[8.5px] font-black uppercase text-white font-mono">
                      SCORE {al.scoreQualidade || 95}/100
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiarAlvos(al.alvos, al.titulo)}
                      className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 border border-white/30 px-2 py-0.5 text-[8.5px] font-mono text-white cursor-pointer transition"
                    >
                      {copiadoId === al.titulo ? (
                        <Check className="h-3 w-3 text-[#00FF88]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-200 font-mono font-bold leading-relaxed">
                  {al.descricao}
                </p>

                {/* GRID DE MÉTRICAS QUANTITATIVAS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Assertividade G1</span>
                    <span className="text-xs sm:text-sm font-black text-[#00FF88] block font-mono">
                      {al.chanceG1Perc}%
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Valor Esperado</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300 block font-mono">
                      {al.evEstimado || "+EV +24.8%"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Desvio Z-Score</span>
                    <span className="text-xs sm:text-sm font-black text-cyan-300 block font-mono">
                      {al.zScore || 2.8}σ
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-black/70 p-2 text-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 block font-mono">Alocação Kelly</span>
                    <span className="text-xs sm:text-sm font-black text-white block font-mono">
                      {al.kellySugestao || "2.5% da banca"}
                    </span>
                  </div>
                </div>

                {/* AÇÃO E ALVOS */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-black text-white">Entrada:</span>
                    <span className="rounded-lg bg-black/90 border-2 border-white px-2.5 py-1 text-[10px] font-mono font-black text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      {al.acaoRecomendada}
                    </span>
                  </div>

                  <span className="text-[8.5px] font-mono font-black text-white bg-black/70 border border-white/50 rounded px-1.5 py-0.5">
                    {al.nivelFugaTexto}
                  </span>
                </div>

                {/* Chips dos Números Alvos */}
                {al.alvos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[8.5px] font-mono text-slate-300 uppercase font-black">
                      Alvos ({al.alvos.length}):
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {al.alvos.slice(0, 12).map((num) => {
                        const isRed = NUMEROS_VERMELHOS.has(num);
                        return (
                          <button
                            key={`qual-num-${al.id}-${num}`}
                            type="button"
                            onClick={() => handleAddNumber(num)}
                            title={`Inserir número ${num}`}
                            className={`flex h-5.5 w-5.5 items-center justify-center rounded text-[9px] font-black font-mono text-white border transition-transform hover:scale-120 cursor-pointer shadow-[0_0_6px_rgba(0,0,0,0.8)] ${
                              num === 0
                                ? "bg-[#00E676] text-black border-[#00FF88]"
                                : isRed
                                ? "bg-[#FF003C] text-white border-red-500"
                                : "bg-black text-white border-slate-600"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                      {al.alvos.length > 12 && (
                        <span className="text-[8.5px] font-mono text-slate-300 font-bold">
                          +{al.alvos.length - 12}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* 3. SINAIS QUALIFICADOS EXTERNOS */}
          {alertasFiltrados.externos
            .filter((al) => !tacticalPatternAlert?.temAlertaAtivo || al.type !== "radar_critico_disparo")
            .map((al) => {
              const isMaximo = al.classificacao === "NIVEL_MAXIMO";
              return (
                <motion.div
                  key={`qualificado-ext-${al.id}`}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`rounded-2xl border-2 p-3 space-y-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] ${
                    isMaximo
                      ? "border-amber-400 bg-gradient-to-b from-[#241701] via-[#120b00] to-black shadow-[0_0_30px_rgba(251,191,36,0.35)]"
                      : "border-cyan-400 bg-gradient-to-b from-[#011e22] via-[#010e11] to-black shadow-[0_0_25px_rgba(0,255,255,0.3)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/20 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full animate-ping ${
                          isMaximo ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" : "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                        }`}
                      />
                      <h4 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
                        <span>{al.title}</span>
                        <span
                          className={`rounded border border-white px-1.5 py-0.2 text-[8px] font-black uppercase ${
                            isMaximo
                              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_8px_#fbbf24]"
                              : "bg-cyan-500 text-black shadow-[0_0_8px_#06b6d4]"
                          }`}
                        >
                          {isMaximo ? "👑 NÍVEL MÁXIMO" : "⚡ EXPERT TIER 1"}
                        </span>
                      </h4>
                    </div>

                    <span className="rounded-md bg-black/80 border border-white/40 px-2 py-0.5 text-[8.5px] font-black uppercase text-white font-mono">
                      PRIORIDADE {al.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="text-white font-black">
                      Alvo: <strong className="text-amber-300 underline">{al.targetLabel}</strong>
                    </span>
                    <span className="text-[#00FF88] font-black">
                      Assertividade G1: {al.accuracyLabel || `${al.accuracy2Entries}%`}
                    </span>
                  </div>

                  {/* Chips de Alvos */}
                  {al.targetNumbers && al.targetNumbers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[8.5px] font-mono text-slate-300 uppercase font-black">Cobrir:</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {al.targetNumbers.slice(0, 10).map((n, nIdx) => {
                          const isRed = NUMEROS_VERMELHOS.has(n);
                          return (
                            <button
                              key={`qual-ext-num-${al.id}-${n}-${nIdx}`}
                              type="button"
                              onClick={() => handleAddNumber(n)}
                              className={`flex h-5.5 w-5.5 items-center justify-center rounded text-[9px] font-black font-mono text-white border transition-transform hover:scale-120 cursor-pointer ${
                                n === 0
                                  ? "bg-[#00E676] text-black border-[#00FF88]"
                                  : isRed
                                  ? "bg-[#FF003C] text-white border-red-500"
                                  : "bg-black text-white border-slate-600"
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

          {alertasFiltrados.totalVisiveis === 0 && (
            <div className="rounded-2xl border-2 border-white/30 bg-black/80 p-5 text-center space-y-2">
              <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/40">
                <Crown className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black uppercase text-amber-300">
                Nenhum Sinal Qualificado no Momento
              </h4>
              <p className="text-[10px] text-slate-300 font-mono max-w-sm mx-auto leading-relaxed">
                O Radar Quantitativo monitora continuamente desvios estatísticos, z-score e assertividade G1. Sinais qualificados surgirão assim que atingirem o limiar Expert.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
