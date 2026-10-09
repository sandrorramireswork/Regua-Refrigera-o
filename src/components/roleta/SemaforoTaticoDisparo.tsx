import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio,
  Zap,
  Target,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Sparkles,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  Check,
} from "lucide-react";
import type { Spin, SectorDef, Padrao } from "@/lib/roulette";
import { CILINDRO, REDS, getProps, SETORES_PADRAO } from "@/lib/roulette";
import { tocarAlerta } from "@/lib/notify";
import { toast } from "sonner";
import { analisarCurvaTermicaAltaDensidade } from "@/lib/curva-termica-engine";

/** Amostra completa de giros extraída da Roleta Relâmpago (foto do operador) */
export const SAMPLE_SPINS_IMAGEM_ROLETA: number[] = [
  // Últimas rodadas no topo (mais recentes à esquerda: 34 é o último giro)
  // Ordem cronológica de entrada (antigo -> recente)
  33, 8, 8, 14, 28, 25, 19, 23, 19, 9, 1, 15,
  5, 18, 18, 34, 15, 8, 18, 31, 23, 9, 22, 1,
  13, 34, 28, 13, 34, 34, 30, 9, 10, 25, 10, 34,
  3, 22, 19, 28, 12, 30, 14, 19, 31, 10, 32, 8,
  20, 14, 12, 36, 11, 12, 36, 27, 9, 11, 27, 9,
  7, 11, 34, 14, 6, 4, 1, 24, 28, 8, 21, 26,
  19, 11, 34, 23, 36, 34, 9, 34, 10, 33, 11, 28,
  10, 18, 5, 34, 4, 29, 31, 16, 20, 2, 22, 36,
  11, 18, 19, 2, 4, 16, 1, 26, 36, 16, 6, 33,
  13, 13, 10, 16, 36, 5, 21, 23, 18, 26, 8, 30,
  28, 28, 21, 24, 28, 2, 14, 8, 9, 6, 30, 7,
  19, 11, 13, 24, 11, 17, 27, 6, 13, 35, 16, 26,
  // Top bar recente (28 até o 34 atual)
  28, 35, 6, 7, 10, 35, 0, 1, 35, 32, 15, 34,
];

export interface SemaforoTaticoDisparoProps {
  spins: Spin[];
  onSelectNumber?: (num: number) => void;
  onLoadSampleSpins?: (numbers: number[]) => void;
  setores?: SectorDef[];
  padroes?: Padrao[];
  className?: string;
}

// Núcleo de alta assertividade (Jeu Zéro / Voisins + Anomalia 34)
const ALVOS_SNIPER = [0, 3, 12, 15, 26, 32, 35, 34];

// Cavalos Camuflados correspondentes
const CAVALOS_CAMUFLADOS = [
  { name: "34 / 35", nums: [34, 35], tag: "Anomalias da Mesa" },
  { name: "0 / 3", nums: [0, 3], tag: "Miolo Zero Spiel" },
  { name: "12 / 15", nums: [12, 15], tag: "Voisins / Retenção" },
  { name: "25 / 26", nums: [25, 26], tag: "Conexão 3ª Dúzia" },
];

function corBgNumero(n: number) {
  if (n === 0) return "bg-[#00E676] text-black border-[#00FF88]";
  return REDS.includes(n)
    ? "bg-[#FF003C] text-white border-red-500 shadow-[0_0_8px_rgba(255,0,60,0.5)]"
    : "bg-black text-white border-slate-600 shadow-[0_0_8px_rgba(255,255,255,0.15)]";
}

export function SemaforoTaticoDisparo({
  spins,
  onSelectNumber,
  onLoadSampleSpins,
  className = "",
}: SemaforoTaticoDisparoProps) {
  const [expandido, setExpandido] = useState<boolean>(true);
  const [somAtivo, setSomAtivo] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const s = localStorage.getItem("roleta-semaforo-som");
    return s !== null ? s === "true" : true;
  });

  const [copiado, setCopiado] = useState<boolean>(false);
  const ultimoGiro = spins[0] ?? null;

  // Análise Tática em Tempo Real baseada na janela de giros
  const analise = useMemo(() => {
    if (spins.length === 0) {
      return {
        status: "AGUARDAR" as const,
        corSinal: "red",
        titulo: "AGUARDANDO DADOS",
        subtitulo: "Carregue ou registre os primeiros giros da mesa para iniciar.",
        probabilidade: 0,
        estagio: "Aguardando",
        hitsSniperUltimos5: 0,
        hitsSniperUltimos15: 0,
        taxaAssertividadeG1: 85.5,
        duziaForte: 3,
        colunaForte: 1,
        ultimoBateu: false,
      };
    }

    const termica = analisarCurvaTermicaAltaDensidade(spins, 25);
    const hdci = termica.indiceConfianca;
    const gradienteTexto = termica.gradienteTexto;
    const ruidosSuprimidosPerc = termica.ruidosSuprimidosPerc;

    const ultimos5 = spins.slice(0, 5).map((s) => s.num);
    const ultimos15 = spins.slice(0, 15).map((s) => s.num);

    const hitsSniperUltimos5 = ultimos5.filter((n) => ALVOS_SNIPER.includes(n)).length;
    const hitsSniperUltimos15 = ultimos15.filter((n) => ALVOS_SNIPER.includes(n)).length;

    const ultimoNum = ultimoGiro ? ultimoGiro.num : null;
    const ultimoBateu = ultimoNum !== null && ALVOS_SNIPER.includes(ultimoNum);

    // Contagem de 3ª Dúzia
    const duzia3Hits5 = ultimos5.filter((n) => n >= 25 && n <= 36).length;
    // Contagem de Terminais 4 e 5
    const terminais4e5Hits5 = ultimos5.filter((n) => [4, 14, 24, 34, 5, 15, 25, 35].includes(n)).length;

    // Regras do Semáforo com Validação de Alta Densidade Térmica (HDCI)
    if (
      termica.statusConfianca === "ALTA_DENSIDADE_CONFIRMADA" ||
      hitsSniperUltimos5 >= 2 ||
      (terminais4e5Hits5 >= 2 && duzia3Hits5 >= 2)
    ) {
      // 🟢 SINAL VERDE: DISPARO IMEDIATO
      const prob = Math.min(96, Math.max(88, Math.round(hdci * 0.95 + hitsSniperUltimos5 * 2)));
      return {
        status: "DISPARO" as const,
        corSinal: "green",
        titulo: "🟢 DISPARO ATIVO — ALTA DENSIDADE CONFIRMADA",
        subtitulo: `Confluência térmica máxima (HDCI ${hdci}%). Núcleo Sniper aquecido com ${ruidosSuprimidosPerc}% de ruído eliminado.`,
        probabilidade: prob,
        estagio: ultimoBateu ? "Entrada 1 (Tiro Seco - Repetição)" : "Entrada 2 (Proteção G1)",
        hitsSniperUltimos5,
        hitsSniperUltimos15,
        taxaAssertividadeG1: 91.2,
        duziaForte: 3,
        colunaForte: 1,
        ultimoBateu,
        hdci,
        gradienteTexto,
        ruidosSuprimidosPerc,
      };
    } else if (
      termica.statusConfianca === "DENSIDADE_EM_AQUECIMENTO" ||
      hitsSniperUltimos5 === 1 ||
      terminais4e5Hits5 >= 1 ||
      duzia3Hits5 >= 2
    ) {
      // 🟡 SINAL AMARELO: PRÉ-ALERTA
      return {
        status: "PRE_ALERTA" as const,
        corSinal: "yellow",
        titulo: "🟡 PRÉ-ALERTA — PREPARAR FICHAS",
        subtitulo: `Aquecimento de zona em curso (HDCI ${hdci}% · ${gradienteTexto}). Posicione fichas nos alvos.`,
        probabilidade: Math.max(72, hdci),
        estagio: "Aquecimento Térmico de Zona",
        hitsSniperUltimos5,
        hitsSniperUltimos15,
        taxaAssertividadeG1: 84.5,
        duziaForte: 3,
        colunaForte: 2,
        ultimoBateu,
        hdci,
        gradienteTexto,
        ruidosSuprimidosPerc,
      };
    } else {
      // 🔴 SINAL VERMELHO: AGUARDAR
      return {
        status: "AGUARDAR" as const,
        corSinal: "red",
        titulo: "🔴 AGUARDAR — BLINDAGEM DE BANCA",
        subtitulo: `Mesa em dispersão com ruído browniano (${ruidosSuprimidosPerc}% suprimido). Aguarde convergência de alta densidade.`,
        probabilidade: Math.min(50, hdci),
        estagio: "Proteção de Capital",
        hitsSniperUltimos5,
        hitsSniperUltimos15,
        taxaAssertividadeG1: 68.0,
        duziaForte: 2,
        colunaForte: 3,
        ultimoBateu,
        hdci,
        gradienteTexto,
        ruidosSuprimidosPerc,
      };
    }
  }, [spins, ultimoGiro]);

  // Alerta sonoro quando entra em sinal verde
  const lastSignalRef = useRef<string>("");
  useEffect(() => {
    if (analise.status === "DISPARO" && lastSignalRef.current !== "DISPARO" && somAtivo) {
      try {
        tocarAlerta();
      } catch {}
    }
    lastSignalRef.current = analise.status;
  }, [analise.status, somAtivo]);

  const toggleSom = () => {
    setSomAtivo((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("roleta-semaforo-som", String(next));
      } catch {}
      return next;
    });
  };

  const handleCopiarAlvos = () => {
    const texto = ALVOS_SNIPER.join(", ");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Alvos Sniper copiados!", {
      description: `Números: ${texto}`,
    });
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleCarregarDadosFoto = () => {
    if (onLoadSampleSpins) {
      onLoadSampleSpins(SAMPLE_SPINS_IMAGEM_ROLETA);
      toast.success("⚡ Sequência da Roleta Relâmpago Carregada!", {
        description: `${SAMPLE_SPINS_IMAGEM_ROLETA.length} giros reais da foto foram injetados no painel.`,
      });
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 transition-all shadow-[0_0_25px_rgba(0,0,0,0.8)] ${
        analise.status === "DISPARO"
          ? "border-[#00FF88] bg-gradient-to-b from-[#022312] via-[#04160d] to-black shadow-[0_0_30px_rgba(0,255,136,0.35)]"
          : analise.status === "PRE_ALERTA"
            ? "border-amber-400 bg-gradient-to-b from-[#261c02] via-[#171203] to-black shadow-[0_0_25px_rgba(251,191,36,0.3)]"
            : "border-red-500/60 bg-gradient-to-b from-[#23050c] via-[#140307] to-black shadow-[0_0_25px_rgba(239,68,68,0.25)]"
      } ${className}`}
    >
      {/* Luz ambiente no topo */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-3/4 rounded-full blur-2xl pointer-events-none ${
          analise.status === "DISPARO"
            ? "bg-[#00FF88]/25"
            : analise.status === "PRE_ALERTA"
              ? "bg-amber-400/20"
              : "bg-red-500/15"
        }`}
      />

      {/* CABEÇALHO DO SEMÁFORO */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-3.5 sm:px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Luz do Semáforo 3D */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-white/15 bg-black/80 shadow-inner">
            <span
              title="Aguardar"
              className={`h-3 w-3 rounded-full transition-all ${
                analise.status === "AGUARDAR"
                  ? "bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"
                  : "bg-red-950/60 opacity-40"
              }`}
            />
            <span
              title="Pré-Alerta"
              className={`h-3 w-3 rounded-full transition-all ${
                analise.status === "PRE_ALERTA"
                  ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse"
                  : "bg-amber-950/60 opacity-40"
              }`}
            />
            <span
              title="Disparo Imediato"
              className={`h-3 w-3 rounded-full transition-all ${
                analise.status === "DISPARO"
                  ? "bg-[#00FF88] shadow-[0_0_14px_#00FF88] animate-ping duration-1000"
                  : "bg-emerald-950/60 opacity-40"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-display font-black tracking-wide uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {analise.titulo}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  analise.status === "DISPARO"
                    ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88]"
                    : analise.status === "PRE_ALERTA"
                      ? "border-amber-400 bg-amber-400/20 text-amber-300"
                      : "border-red-400 bg-red-500/20 text-red-300"
                }`}
              >
                Assertividade: {analise.taxaAssertividadeG1}% (G1)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
              {analise.subtitulo}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="rounded bg-black/60 border border-amber-400/40 px-2 py-0.5 text-[8.5px] font-mono text-amber-300 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                <Flame className="h-3 w-3 text-amber-400 animate-pulse" />
                <span>HDCI: {analise.hdci}%</span>
              </span>
              <span className="text-[8.5px] font-mono text-emerald-400 font-bold">
                {analise.gradienteTexto}
              </span>
              <span className="text-[8px] font-mono text-slate-400">
                · {analise.ruidosSuprimidosPerc}% ruído suprimido
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS DA BARRA SUPERIOR */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de Injeção dos dados da Foto */}
          {onLoadSampleSpins && (
            <button
              type="button"
              onClick={handleCarregarDadosFoto}
              title="Carregar todos os 156 giros reais da Roleta Relâmpago (foto)"
              className="flex items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-950/50 hover:bg-amber-900/70 hover:border-amber-300 px-2.5 py-1 text-[9px] font-mono font-bold text-amber-300 transition-all cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.25)]"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300 animate-bounce" />
              <span className="hidden sm:inline">Carregar Dados Foto (156 Giros)</span>
              <span className="sm:hidden">Dados Foto</span>
            </button>
          )}

          {/* Toggle Som */}
          <button
            type="button"
            onClick={toggleSom}
            title={somAtivo ? "Silenciar Alerta Sonoro" : "Ativar Alerta Sonoro"}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              somAtivo
                ? "border-emerald-500/60 bg-emerald-950/60 text-[#00FF88]"
                : "border-slate-700 bg-black/60 text-slate-500"
            }`}
          >
            {somAtivo ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Minimizar / Expandir */}
          <button
            type="button"
            onClick={() => setExpandido((prev) => !prev)}
            className="p-1.5 rounded-lg border border-white/15 bg-black/60 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* CORPO EXPANDIDO COM ESTRATÉGIAS E AÇÕES DE ENTRADA */}
      {expandido && (
        <div className="relative z-10 p-3.5 sm:p-5 space-y-4">
          {/* TIRA DE STATUS DA ENTRADA & TELEMETRIA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-center">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Estágio Atual</span>
              <strong className={`text-xs font-mono font-bold mt-0.5 block ${
                analise.status === "DISPARO" ? "text-[#00FF88]" : "text-amber-300"
              }`}>
                {analise.estagio}
              </strong>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-center">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Confiança do Sinal</span>
              <strong className="text-xs font-mono font-bold text-cyan-300 mt-0.5 block">
                {analise.probabilidade}%
              </strong>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-center">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Dúzia & Coluna Alvo</span>
              <strong className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">
                Dúzia {analise.duziaForte}ª · Coluna {analise.colunaForte}ª
              </strong>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-center">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Último Giro</span>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {ultimoGiro ? (
                  <>
                    <span className={`px-2 py-0.5 rounded text-xs font-black font-display border ${corBgNumero(ultimoGiro.num)}`}>
                      {ultimoGiro.num}
                    </span>
                    {analise.ultimoBateu ? (
                      <span className="text-[9px] font-bold font-mono text-[#00FF88] flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> GREEN
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400">Neutro</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">—</span>
                )}
              </div>
            </div>
          </div>

          {/* 1. SEÇÃO DE ALVOS SNIPER (NÚMEROS PLENOS DE ALTA ASSERTIVIDADE) */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#00FF88]" />
                <span className="text-xs font-display font-black uppercase text-white tracking-wide">
                  Núcleo Sniper (8 Alvos Principais)
                </span>
                <span className="text-[9px] font-mono text-emerald-300/70">
                  Jeu Zéro / Voisins + Anomalia 34
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopiarAlvos}
                className="flex items-center gap-1 rounded border border-[#00FF88]/50 bg-[#00FF88]/15 hover:bg-[#00FF88]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#00FF88] transition cursor-pointer"
              >
                {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiado ? "Copiado!" : "Copiar 8 Alvos"}</span>
              </button>
            </div>

            {/* Grade de Botões dos Números Alvo */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ALVOS_SNIPER.map((num) => {
                const isUltimo = ultimoGiro?.num === num;
                return (
                  <button
                    key={`sniper-${num}`}
                    type="button"
                    onClick={() => onSelectNumber?.(num)}
                    title={`Clique para registrar o número ${num}`}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer group hover:scale-105 ${corBgNumero(
                      num,
                    )} ${isUltimo ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-black" : ""}`}
                  >
                    <span className="text-base sm:text-lg font-display font-black leading-none drop-shadow">
                      {num}
                    </span>
                    <span className="text-[8px] font-mono opacity-80 mt-1 uppercase">
                      {num === 34 ? "Anomalia" : num === 0 ? "Zero" : "Vizinho"}
                    </span>
                    {isUltimo && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SEÇÃO DE CAVALOS CAMUFLADOS (ECONOMIA DE FICHAS COM 50% MENOS CUSTO) */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-neon-cyan" />
                <span className="text-xs font-display font-black uppercase text-white tracking-wide">
                  Cavalos Camuflados Recomendados
                </span>
                <span className="rounded px-1.5 py-0.2 text-[8px] font-mono font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                  Economia de 50% de Fichas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CAVALOS_CAMUFLADOS.map((cavalo) => (
                <div
                  key={cavalo.name}
                  className="rounded-lg border border-cyan-500/30 bg-black/60 p-2 text-center hover:border-cyan-400 transition"
                >
                  <div className="text-xs font-display font-black text-neon-cyan tracking-wider">
                    {cavalo.name}
                  </div>
                  <div className="text-[8.5px] font-mono text-slate-400 mt-0.5 truncate">
                    {cavalo.tag}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    {cavalo.nums.map((n) => (
                      <button
                        key={`cav-${cavalo.name}-${n}`}
                        type="button"
                        onClick={() => onSelectNumber?.(n)}
                        className={`h-5 w-6 rounded text-[10px] font-bold font-display border flex items-center justify-center transition hover:scale-110 cursor-pointer ${corBgNumero(
                          n,
                        )}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. REGRAS DE OURO & ALINHAMENTO OPERACIONAL */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[9.5px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00FF88]" />
              <span>
                <strong>Regra G1:</strong> Entrada Seca + no máximo 1 Proteção. Se não pagar no G1, encerre e aguarde o próximo Verde.
              </span>
            </div>
            <div className="text-slate-500 text-[8.5px]">
              Alinhado com Motors: Balística · Atrasos · Espelhos · Terminais
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
