import { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Flame,
  Radar,
  Activity,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Target,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  CheckCircle2,
  AlertOctagon,
  Eye,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import {
  executarSentinelaDoutorado,
  type ResultadoSentinelaDoutorado,
  type MetricaTendenciaCalculada,
} from "@/lib/sentinela-doutorado-engine";
import { toast } from "sonner";

interface SentinelaGraficosDoutoradoProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

// Síntese de áudio cyber-neon via Web Audio API (sem dependência externa)
function tocarAlertaCyber(tipo: "expert" | "normal" = "expert") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (tipo === "expert") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Silencioso em caso de restrição do navegador
  }
}

export function SentinelaGraficosDoutorado({ spins }: SentinelaGraficosDoutoradoProps) {
  // Configurações do Sentinela
  const [sentinelaAtivo, setSentinelaAtivo] = useState(true);
  const [somHabilitado, setSomHabilitado] = useState(true);
  const [limiarRigorZ, setLimiarRigorZ] = useState<number>(1.96); // 1.4 = Agressivo, 1.96 = Doutorado (95%), 2.5 = Pós-Doc (99%)
  const [painelExpandido, setPainelExpandido] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  // Ordem cronológica dos números
  const numerosCronologicos = useMemo(() => {
    if (!spins || spins.length === 0) return [];
    return [...spins].reverse().map((s) => s.num);
  }, [spins]);

  // Execução do Motor de Doutorado
  const resultado: ResultadoSentinelaDoutorado = useMemo(() => {
    if (!sentinelaAtivo) {
      return {
        timestamp: Date.now(),
        totalGiros: numerosCronologicos.length,
        modoExpertAtivo: false,
        tendenciasSuspeitas: [],
        tendenciaPrincipal: null,
        confluenciaDoutorado: null,
        todasMetricas: [],
      };
    }
    return executarSentinelaDoutorado(numerosCronologicos, limiarRigorZ);
  }, [numerosCronologicos, sentinelaAtivo, limiarRigorZ]);

  // Disparo de Toast & Som apenas quando houver nova detecção de tendência
  const lastAlertedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sentinelaAtivo) return;

    if (resultado.modoExpertAtivo && resultado.tendenciaPrincipal) {
      const chaveAtual = `${resultado.tendenciaPrincipal.def.id}_${resultado.tendenciaPrincipal.ganho5R}_${resultado.tendenciaPrincipal.pontosTotal}`;
      if (lastAlertedKeyRef.current !== chaveAtual) {
        lastAlertedKeyRef.current = chaveAtual;

        if (somHabilitado) {
          tocarAlertaCyber("expert");
        }

        toast.error(`🚨 MODO EXPERT ATIVADO: Movimento Suspeito em ${resultado.tendenciaPrincipal.def.nome}!`, {
          description: `Z = +${resultado.tendenciaPrincipal.zScore}σ · Crescimento acelerado de +${resultado.tendenciaPrincipal.ganho5R} pts sem quedas. Entrada imediata calculada.`,
          duration: 5500,
        });
      }
    } else {
      lastAlertedKeyRef.current = null;
    }
  }, [resultado.modoExpertAtivo, resultado.tendenciaPrincipal, sentinelaAtivo, somHabilitado]);

  const { modoExpertAtivo, tendenciaPrincipal, confluenciaDoutorado, todasMetricas } = resultado;

  const metricasFiltradas = useMemo(() => {
    if (filtroCategoria === "todas") return todasMetricas;
    return todasMetricas.filter((m) => m.def.categoria === filtroCategoria);
  }, [todasMetricas, filtroCategoria]);

  return (
    <section
      aria-label="Sentinela Doutorado de Vigilância dos Gráficos"
      className="relative w-full rounded-2xl border-2 border-[#B026FF] bg-[#0c0414] shadow-[0_0_30px_rgba(176,38,255,0.45)] transition-all overflow-hidden"
    >
      {/* SCANNER RADAR CYBER DE FUNDO (Efeito sutil) */}
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#B026FF]/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* CABEÇALHO DO COMANDO SENTINELA */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#B026FF]/30 bg-black/60 p-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-2 transition-all ${
              modoExpertAtivo
                ? "bg-red-500/20 text-[#00FF00] ring-[#00FF00] shadow-[0_0_20px_#00FF00]"
                : sentinelaAtivo
                ? "bg-[#B026FF]/20 text-[#B026FF] ring-[#B026FF] shadow-[0_0_15px_#B026FF]"
                : "bg-gray-800 text-gray-500 ring-gray-700"
            }`}
          >
            {modoExpertAtivo ? (
              <Flame className="h-6 w-6 fill-[#00FF00] text-[#00FF00] animate-bounce" />
            ) : (
              <Radar className={`h-6 w-6 ${sentinelaAtivo ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }} />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {sentinelaAtivo && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      modoExpertAtivo ? "bg-[#00FF00]" : "bg-[#B026FF]"
                    }`}
                  />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    modoExpertAtivo
                      ? "bg-[#00FF00] shadow-[0_0_8px_#00FF00]"
                      : sentinelaAtivo
                      ? "bg-white shadow-[0_0_6px_#FFFFFF]"
                      : "bg-gray-600"
                  }`}
                />
              </span>
              <h2 className="font-display text-sm font-black tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
                COMANDO SENTINELA
              </h2>
            </div>
            <p className="text-[11px] text-gray-300 font-mono">
              Monitoramento estocástico de 20 tendências · Detecção de aceleração & Z-Score anômalo
            </p>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS DO SENTINELA */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status do Modo Expert */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-black uppercase tracking-wider transition ${
              modoExpertAtivo
                ? "bg-[#00FF00] text-black shadow-[0_0_15px_#00FF00] animate-pulse"
                : sentinelaAtivo
                ? "bg-[#B026FF]/25 text-white border border-[#B026FF]/60"
                : "bg-white/5 text-gray-400 border border-white/10"
            }`}
          >
            {modoExpertAtivo ? (
              <>
                <Zap className="h-3.5 w-3.5 fill-black" />
                <span>MODO EXPERT ATIVO</span>
              </>
            ) : (
              <>
                <Radio className="h-3.5 w-3.5 text-[#B026FF] animate-pulse" />
                <span>SENTINELA EM VIGILÂNCIA</span>
              </>
            )}
          </div>

          {/* Seletor de Rigor Z-Score */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1 text-[11px] font-mono">
            <span className="text-gray-400 px-1 font-bold">Rigor:</span>
            <button
              onClick={() => setLimiarRigorZ(1.4)}
              className={`px-2 py-0.5 rounded font-bold transition ${
                limiarRigorZ === 1.4 ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-400" : "text-gray-400 hover:text-white"
              }`}
              title="Sensibilidade Alta (Z >= 1.4σ)"
            >
              1.4σ
            </button>
            <button
              onClick={() => setLimiarRigorZ(1.96)}
              className={`px-2 py-0.5 rounded font-bold transition ${
                limiarRigorZ === 1.96 ? "bg-[#B026FF]/40 text-white ring-1 ring-[#B026FF]" : "text-gray-400 hover:text-white"
              }`}
              title="Nível Doutorado (Z >= 1.96σ - 95% Confiança)"
            >
              1.96σ (PhD)
            </button>
            <button
              onClick={() => setLimiarRigorZ(2.5)}
              className={`px-2 py-0.5 rounded font-bold transition ${
                limiarRigorZ === 2.5 ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400" : "text-gray-400 hover:text-white"
              }`}
              title="Nível Pós-Doutorado (Z >= 2.5σ - 99% Confiança)"
            >
              2.5σ
            </button>
          </div>

          {/* Toggle Som */}
          <button
            onClick={() => setSomHabilitado(!somHabilitado)}
            title={somHabilitado ? "Alarme sonoro ativado" : "Alarme sonoro desativado"}
            className={`p-2 rounded-lg border transition ${
              somHabilitado
                ? "bg-[#B026FF]/20 border-[#B026FF]/60 text-white shadow-[0_0_8px_rgba(176,38,255,0.4)]"
                : "bg-white/5 border-white/10 text-gray-500"
            }`}
          >
            {somHabilitado ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Toggle Sentinela Ao Vivo */}
          <button
            onClick={() => setSentinelaAtivo(!sentinelaAtivo)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold font-mono transition border ${
              sentinelaAtivo
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{sentinelaAtivo ? "Vigilância: ON" : "Vigilância: OFF"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TARJA ROXO NEON COM LETRA PURO BRANCO - ALERTA EXPERT DE CRESCIMENTO SUSPEITO
          ========================================================================= */}
      <div className="p-3 sm:p-5 space-y-3">
        {modoExpertAtivo && tendenciaPrincipal ? (
          <div
            className="w-full rounded-xl border-2 border-[#B026FF] bg-gradient-to-r from-[#170329] via-[#3d0966] to-[#170329] shadow-[0_0_26px_rgba(176,38,255,0.9),inset_0_0_15px_rgba(176,38,255,0.4)] p-3.5 sm:p-4 text-white font-mono animate-in fade-in zoom-in-95 duration-200"
          >
            {/* LINHA 1: CABEÇALHO DO ALERTA */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#B026FF]/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-600 text-white font-black px-2 py-0.5 text-xs shadow-[0_0_12px_#ff0055] tracking-wider uppercase flex items-center gap-1 animate-pulse">
                  <AlertOctagon className="h-3.5 w-3.5" />
                  <span>🚨 ALERTA CRÍTICO: MOVIMENTO SUSPEITO DE CRESCIMENTO</span>
                </span>
                <span className="text-white text-xs sm:text-sm font-black drop-shadow-[0_0_6px_rgba(255,255,255,0.95)]">
                  {tendenciaPrincipal.def.nome.toUpperCase()} ({tendenciaPrincipal.def.categoriaLabel.toUpperCase()})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-[#00FF00] text-black font-black px-2.5 py-0.5 text-xs shadow-[0_0_12px_#00FF00]">
                  Z = +{tendenciaPrincipal.zScore}σ
                </span>
                <span className="rounded bg-black/80 text-white font-black px-2 py-0.5 text-xs border border-purple-400">
                  +{tendenciaPrincipal.ganho5R} PTS EM 5 GIROS
                </span>
              </div>
            </div>

            {/* LINHA 2: MOVIMENTO EXATO EM PURO BRANCO */}
            <div className="mt-2.5 flex flex-col gap-1.5 pt-1">
              <div className="flex items-start sm:items-center gap-2">
                <span className="bg-white text-black font-black px-2.5 py-0.5 rounded text-xs shadow-[0_0_12px_#FFFFFF] tracking-wider uppercase shrink-0">
                  🎯 MOVIMENTO EXATO
                </span>
                <span className="text-white text-xs sm:text-[13.5px] font-black tracking-wide drop-shadow-[0_0_6px_rgba(255,255,255,0.95)]">
                  {confluenciaDoutorado?.movimentoExato || "ENTRADA IMEDIATA NA TENDÊNCIA EM ALTA COM PROTEÇÃO NO 0"}
                </span>
              </div>

              {/* LINHA 3: JUSTIFICATIVA DE DOUTORADO & CONFLUÊNCIA */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#B026FF]/30 text-[11px] text-white">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white uppercase bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-500/50">
                    DIAGNÓSTICO ESTATÍSTICO:
                  </span>
                  <span className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.85)]">
                    {confluenciaDoutorado?.justificativaCientifica}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-black text-white shrink-0">
                  <span>Velocidade: +{tendenciaPrincipal.velocidadeRecente} pts/g</span>
                  <span>·</span>
                  <span>Aceleração: +{tendenciaPrincipal.aceleracaoCurva} pts/g²</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODO EM REPOUSO / VIGILÂNCIA CONSTANTE */
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3 sm:px-4 text-white font-mono">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                🟢 MODO VIGILÂNCIA ATIVA: NENHUMA ANOMALIA CRÍTICA NO MOMENTO
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              O Modo Expert disparará automaticamente assim que qualquer tendência registrar crescimento acelerado sem quedas nas últimas 5 rodadas.
            </p>
          </div>
        )}

        {/* RADAR DE SUSPEITA EM TEMPO REAL (TOP TENDÊNCIAS EM CRESCIMENTO) */}
        <div className="rounded-xl border border-white/10 bg-black/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase">
              <Activity className="h-4 w-4 text-[#B026FF]" />
              <span>RADAR DE CRESCIMENTO SUSPEITO EM TEMPO REAL</span>
              <span className="text-[10px] text-gray-400 font-normal">
                (Amostra ativa: {resultado.totalGiros} giros)
              </span>
            </div>

            {/* Filtros de Categoria */}
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
              {[
                { id: "todas", label: "Todas (20)" },
                { id: "coluna", label: "Colunas" },
                { id: "duzia", label: "Dúzias" },
                { id: "padrao_f", label: "Padrão F" },
                { id: "setor_balistico", label: "Setores" },
                { id: "chance_simples", label: "Chances" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFiltroCategoria(c.id)}
                  className={`px-2 py-0.5 rounded transition ${
                    filtroCategoria === c.id
                      ? "bg-[#B026FF]/30 text-white ring-1 ring-[#B026FF] font-bold"
                      : "text-gray-400 hover:text-white bg-white/5"
                  }`}
                >
                  {c.label}
                </button>
              ))}

              <button
                onClick={() => setPainelExpandido(!painelExpandido)}
                className="ml-1 flex items-center gap-0.5 px-2 py-0.5 rounded text-gray-300 hover:text-white bg-white/10 font-bold"
              >
                <span>{painelExpandido ? "Recolher" : "Ver Todas"}</span>
                {painelExpandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* GRID DE CARDS DAS TENDÊNCIAS COM BARRA DE SUSPEITA */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono">
            {metricasFiltradas.slice(0, painelExpandido ? 20 : 6).map((metrica) => {
              const isSuspeita = metrica.isMovimentoSuspeito;
              return (
                <div
                  key={metrica.def.id}
                  className={`relative flex flex-col justify-between rounded-lg border p-2.5 transition-all ${
                    isSuspeita
                      ? "border-[#00FF00] bg-[#00FF00]/10 shadow-[0_0_15px_rgba(0,255,0,0.3)] ring-1 ring-[#00FF00]"
                      : metrica.scoreSuspeita >= 50
                      ? "border-amber-500/50 bg-amber-500/5 hover:border-amber-500"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: metrica.def.corHex }}
                      />
                      <span className="font-bold text-white truncate" title={metrica.def.nome}>
                        {metrica.def.nome}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSuspeita && (
                        <span className="rounded bg-[#00FF00] px-1.5 py-0.2 text-[9px] font-black text-black animate-pulse flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5 fill-black" />
                          SUSPEITO
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {metrica.pontosTotal} <span className="text-[9px]">pts</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso de Suspeita de Crescimento */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="text-gray-400">Score de Suspeita:</span>
                      <span
                        className={`font-black ${
                          isSuspeita
                            ? "text-[#00FF00]"
                            : metrica.scoreSuspeita >= 50
                            ? "text-amber-400"
                            : "text-gray-300"
                        }`}
                      >
                        {metrica.scoreSuspeita}% (Z: {metrica.zScore > 0 ? `+${metrica.zScore}` : metrica.zScore}σ)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isSuspeita
                            ? "bg-[#00FF00] shadow-[0_0_8px_#00FF00]"
                            : metrica.scoreSuspeita >= 50
                            ? "bg-amber-400"
                            : "bg-[#B026FF]"
                        }`}
                        style={{ width: `${metrica.scoreSuspeita}%` }}
                      />
                    </div>
                  </div>

                  {/* Rodapé do Card com dados da Janela Recente */}
                  <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400 border-t border-white/5 pt-1.5">
                    <span>
                      5R:{" "}
                      <strong className={metrica.ganho5R > 0 ? "text-emerald-400" : "text-gray-300"}>
                        {metrica.ganho5R > 0 ? `+${metrica.ganho5R}` : metrica.ganho5R} pts
                      </strong>
                    </span>
                    <span>
                      Vel: <strong className="text-white">{metrica.velocidadeRecente} pts/g</strong>
                    </span>
                    <span>
                      Erros: <strong className="text-white">{metrica.errosAtuais}/2</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
