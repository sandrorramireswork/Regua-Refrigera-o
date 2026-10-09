import { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Clock,
  AlertTriangle,
  Radar,
  Flame,
  Target,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import { DENSITY_QUADRANTS } from "@/lib/density-radar";
import { avaliarTendenciaCirurgica } from "@/lib/trend-heat-maximas-engine";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TabGraficoPadraoFProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

// Os 4 quadrantes físicos do cilindro europeu (9 números cada, excluindo o 0)
const Q1 = DENSITY_QUADRANTS[0]; // [32, 15, 19, 4, 21, 2, 25, 17, 34]
const Q2 = DENSITY_QUADRANTS[1]; // [6, 27, 13, 36, 11, 30, 8, 23, 10]
const Q3 = DENSITY_QUADRANTS[2]; // [5, 24, 16, 33, 1, 20, 14, 31, 9]
const Q4 = DENSITY_QUADRANTS[3]; // [22, 18, 29, 7, 28, 12, 35, 3, 26]

const PERIODOS_PRESET = [15, 30, 50, 100] as const;

export function TabGraficoPadraoF({ spins, onAddSpin }: TabGraficoPadraoFProps) {
  // Lista manual de rodadas adicionadas diretamente neste gráfico
  const [numerosManuais, setNumerosManuais] = useState<number[]>([]);
  const [modoManual, setModoManual] = useState(false);
  const [inputNumero, setInputNumero] = useState("");

  // Ajuste de Período
  const [periodo, setPeriodo] = useState<number | "all">(50);
  const [modoCalculo, setModoCalculo] = useState<"janela" | "zoom">("janela");

  // Usar giros do aplicativo ou inserção manual em ordem cronológica
  const todosNumeros = useMemo(() => {
    if (modoManual || !spins || spins.length === 0) {
      return numerosManuais;
    }
    return [...spins].reverse().map((s) => s.num);
  }, [modoManual, spins, numerosManuais]);

  const totalDisponivel = todosNumeros.length;
  const periodoEfetivo = periodo === "all" ? totalDisponivel : Math.min(periodo, totalDisponivel);

  // Cálculo da pontuação, tolerância de 2 erros e aplicação do filtro de período
  const {
    labels,
    dataQ1,
    dataQ2,
    dataQ3,
    dataQ4,
    placar,
    quadranteLider,
    totalPenalidades,
  } = useMemo(() => {
    let ptsQ1 = 0, errQ1 = 0, hitsQ1 = 0, penQ1 = 0;
    let ptsQ2 = 0, errQ2 = 0, hitsQ2 = 0, penQ2 = 0;
    let ptsQ3 = 0, errQ3 = 0, hitsQ3 = 0, penQ3 = 0;
    let ptsQ4 = 0, errQ4 = 0, hitsQ4 = 0, penQ4 = 0;

    // Se o modo for "janela", fatiamos os números de entrada para iniciar o cálculo no início do período
    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    const lbls: string[] = ["Início"];
    const dQ1: number[] = [0];
    const dQ2: number[] = [0];
    const dQ3: number[] = [0];
    const dQ4: number[] = [0];

    numeros.forEach((num, index) => {
      // Passo 1: Avaliar acertos nos 4 quadrantes
      if (num === 0) {
        // Zero conta como ausência para os 4 quadrantes
        errQ1++;
        errQ2++;
        errQ3++;
        errQ4++;
      } else if (Q1.includes(num)) {
        ptsQ1 += 1;
        errQ1 = 0;
        errQ2++;
        errQ3++;
        errQ4++;
        hitsQ1++;
      } else if (Q2.includes(num)) {
        ptsQ2 += 1;
        errQ2 = 0;
        errQ1++;
        errQ3++;
        errQ4++;
        hitsQ2++;
      } else if (Q3.includes(num)) {
        ptsQ3 += 1;
        errQ3 = 0;
        errQ1++;
        errQ2++;
        errQ4++;
        hitsQ3++;
      } else if (Q4.includes(num)) {
        ptsQ4 += 1;
        errQ4 = 0;
        errQ1++;
        errQ2++;
        errQ3++;
        hitsQ4++;
      }

      // Passo 2: Aplicar penalidade de -1 para quem acumulou 2 erros consecutivos
      if (errQ1 >= 2) {
        ptsQ1 -= 1;
        errQ1 = 0;
        penQ1++;
      }
      if (errQ2 >= 2) {
        ptsQ2 -= 1;
        errQ2 = 0;
        penQ2++;
      }
      if (errQ3 >= 2) {
        ptsQ3 -= 1;
        errQ3 = 0;
        penQ3++;
      }
      if (errQ4 >= 2) {
        ptsQ4 -= 1;
        errQ4 = 0;
        penQ4++;
      }

      // Passo 3: Registrar pontos para cada rodada
      lbls.push(`R${index + 1} (#${num})`);
      dQ1.push(ptsQ1);
      dQ2.push(ptsQ2);
      dQ3.push(ptsQ3);
      dQ4.push(ptsQ4);
    });

    // Se o modo for "zoom", fatiamos apenas a exibição visual
    let finalLabels = lbls;
    let finalDQ1 = dQ1;
    let finalDQ2 = dQ2;
    let finalDQ3 = dQ3;
    let finalDQ4 = dQ4;

    if (modoCalculo === "zoom" && periodo !== "all" && totalDisponivel > periodo) {
      finalLabels = ["Início (Zoom)", ...lbls.slice(-periodo)];
      finalDQ1 = [dQ1[dQ1.length - periodo - 1] ?? 0, ...dQ1.slice(-periodo)];
      finalDQ2 = [dQ2[dQ2.length - periodo - 1] ?? 0, ...dQ2.slice(-periodo)];
      finalDQ3 = [dQ3[dQ3.length - periodo - 1] ?? 0, ...dQ3.slice(-periodo)];
      finalDQ4 = [dQ4[dQ4.length - periodo - 1] ?? 0, ...dQ4.slice(-periodo)];
    }

    const totalGirosValidos = numeros.filter((n) => n !== 0).length || 1;
    const percQ1 = (hitsQ1 / totalGirosValidos) * 100;
    const percQ2 = (hitsQ2 / totalGirosValidos) * 100;
    const percQ3 = (hitsQ3 / totalGirosValidos) * 100;
    const percQ4 = (hitsQ4 / totalGirosValidos) * 100;

    const quadrantes = [
      { id: 1, nome: "Quadrante 1 (Rosa)", corHex: "#FF10F0", pts: ptsQ1, perc: percQ1 },
      { id: 2, nome: "Quadrante 2 (Ciano)", corHex: "#00FFFF", pts: ptsQ2, perc: percQ2 },
      { id: 3, nome: "Quadrante 3 (Laranja)", corHex: "#FF6700", pts: ptsQ3, perc: percQ3 },
      { id: 4, nome: "Quadrante 4 (Dourado)", corHex: "#FACB15", pts: ptsQ4, perc: percQ4 },
    ];
    quadrantes.sort((a, b) => b.pts - a.pts);

    return {
      labels: finalLabels,
      dataQ1: finalDQ1,
      dataQ2: finalDQ2,
      dataQ3: finalDQ3,
      dataQ4: finalDQ4,
      placar: {
        q1: { pts: ptsQ1, erros: errQ1, acertos: hitsQ1, penalidades: penQ1, perc: percQ1, hot: percQ1 >= 40 },
        q2: { pts: ptsQ2, erros: errQ2, acertos: hitsQ2, penalidades: penQ2, perc: percQ2, hot: percQ2 >= 40 },
        q3: { pts: ptsQ3, erros: errQ3, acertos: hitsQ3, penalidades: penQ3, perc: percQ3, hot: percQ3 >= 40 },
        q4: { pts: ptsQ4, erros: errQ4, acertos: hitsQ4, penalidades: penQ4, perc: percQ4, hot: percQ4 >= 40 },
      },
      quadranteLider: quadrantes[0],
      totalPenalidades: penQ1 + penQ2 + penQ3 + penQ4,
    };
  }, [modoCalculo, periodo, todosNumeros, totalDisponivel]);

  const tendenciaQ1 = useMemo(() => avaliarTendenciaCirurgica({ id: "q1", nome: "Q1", numeros: Q1, pontosHistorico: dataQ1, todosNumerosCronologicos: todosNumeros }), [dataQ1, todosNumeros]);
  const tendenciaQ2 = useMemo(() => avaliarTendenciaCirurgica({ id: "q2", nome: "Q2", numeros: Q2, pontosHistorico: dataQ2, todosNumerosCronologicos: todosNumeros }), [dataQ2, todosNumeros]);
  const tendenciaQ3 = useMemo(() => avaliarTendenciaCirurgica({ id: "q3", nome: "Q3", numeros: Q3, pontosHistorico: dataQ3, todosNumerosCronologicos: todosNumeros }), [dataQ3, todosNumeros]);
  const tendenciaQ4 = useMemo(() => avaliarTendenciaCirurgica({ id: "q4", nome: "Q4", numeros: Q4, pontosHistorico: dataQ4, todosNumerosCronologicos: todosNumeros }), [dataQ4, todosNumeros]);

  const comandoExpert = useMemo(() => {
    const lider = quadranteLider;
    if (!lider) return { isMomentoBom: false, statusTexto: "", movimentoExato: "", justificativa: "" };

    const tendencias = {
      1: tendenciaQ1,
      2: tendenciaQ2,
      3: tendenciaQ3,
      4: tendenciaQ4,
    };

    const liderTendencia = tendencias[lider.id as keyof typeof tendencias];

    if (liderTendencia.isMomentoBom) {
      return {
        isMomentoBom: true,
        lider: lider,
        tendencia: liderTendencia,
        statusTexto: "🔥 TENDÊNCIA CIRÚRGICA DETECTADA!",
        movimentoExato: `ENTRAR NO QUADRANTE ${lider.id} (${lider.nome.toUpperCase()}) • PROTEÇÃO NO 0`,
        justificativa: `Força ${liderTendencia.valorTendencia}% | Calor ${liderTendencia.temperaturaMediaGrupo}ºC | O Quadrante ${lider.id} apresenta crescimento sustentável validado e forte concentração térmica.`,
      };
    }

    return {
      isMomentoBom: false,
      statusTexto: "AGUARDANDO ALINHAMENTO...",
      movimentoExato: `PROTEGER BANCA • AGUARDAR FORÇA DE TENDÊNCIA ≥ 70% NO QUADRANTE LÍDER (Q${lider.id})`,
      justificativa: `Nenhum quadrante atingiu os critérios cirúrgicos de Força de Tendência (mín. 70%) e calor térmico ativo.`,
    };
  }, [quadranteLider, tendenciaQ1, tendenciaQ2, tendenciaQ3, tendenciaQ4]);

  const registrarNumeroManual = () => {
    const num = parseInt(inputNumero.trim(), 10);
    if (isNaN(num) || num < 0 || num > 36) {
      alert("Digite um número válido da roleta (0 a 36).");
      return;
    }
    setNumerosManuais((prev) => [...prev, num]);
    setInputNumero("");

    if (!modoManual && onAddSpin) {
      onAddSpin(num);
    }
  };

  const limparGrafico = () => {
    setNumerosManuais([]);
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: "Quadrante 1 (Rosa)",
        data: dataQ1,
        borderColor: tendenciaQ1.isMomentoBom ? "#00FF00" : "#FF10F0",
        backgroundColor: "rgba(255, 16, 240, 0.08)",
        borderWidth: tendenciaQ1.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => (tendenciaQ1.isMomentoBom ? "#00FF00" : "#FF10F0"),
        pointBorderColor: (ctx: any) => (tendenciaQ1.isMomentoBom ? "#00FF00" : "#FF10F0"),
        pointRadius: (ctx: any) => (tendenciaQ1.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5),
        tension: 0.4,
        fill: true,
      },
      {
        label: "Quadrante 2 (Ciano)",
        data: dataQ2,
        borderColor: tendenciaQ2.isMomentoBom ? "#00FF00" : "#00FFFF",
        backgroundColor: "rgba(0, 255, 255, 0.08)",
        borderWidth: tendenciaQ2.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => (tendenciaQ2.isMomentoBom ? "#00FF00" : "#00FFFF"),
        pointBorderColor: (ctx: any) => (tendenciaQ2.isMomentoBom ? "#00FF00" : "#00FFFF"),
        pointRadius: (ctx: any) => (tendenciaQ2.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5),
        tension: 0.4,
        fill: true,
      },
      {
        label: "Quadrante 3 (Laranja)",
        data: dataQ3,
        borderColor: tendenciaQ3.isMomentoBom ? "#00FF00" : "#FF6700",
        backgroundColor: "rgba(255, 103, 0, 0.08)",
        borderWidth: tendenciaQ3.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => (tendenciaQ3.isMomentoBom ? "#00FF00" : "#FF6700"),
        pointBorderColor: (ctx: any) => (tendenciaQ3.isMomentoBom ? "#00FF00" : "#FF6700"),
        pointRadius: (ctx: any) => (tendenciaQ3.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5),
        tension: 0.4,
        fill: true,
      },
      {
        label: "Quadrante 4 (Dourado)",
        data: dataQ4,
        borderColor: tendenciaQ4.isMomentoBom ? "#00FF00" : "#FACB15",
        backgroundColor: "rgba(250, 203, 21, 0.08)",
        borderWidth: tendenciaQ4.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => (tendenciaQ4.isMomentoBom ? "#00FF00" : "#FACB15"),
        pointBorderColor: (ctx: any) => (tendenciaQ4.isMomentoBom ? "#00FF00" : "#FACB15"),
        pointRadius: (ctx: any) => (tendenciaQ4.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5),
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e0e0e0",
          font: { size: 12 },
          padding: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#3a3a45",
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#a0a0a0",
          maxRotation: 45,
          font: { size: 10 },
        },
      },
      y: {
        grace: "10%",
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#a0a0a0",
          stepSize: 1,
          font: { size: 11 },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#12121a] p-3 sm:p-5 shadow-2xl backdrop-blur-md">
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-cyan/10 ring-1 ring-neon-cyan/40">
            <Radar className="h-5 w-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
              Padrão F · Radar de Densidade <span className="text-neon-cyan">(Tolerância 2x)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              4 Quadrantes Físicos do Cilindro (9 nºs cada) · Penalidade de -1 a cada 2 erros consecutivos
            </p>
          </div>
        </div>

        {/* Alternador de Modo (Sincronizado com App vs Manual) */}
        {spins && spins.length > 0 && (
          <button
            onClick={() => setModoManual(!modoManual)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 transition hover:border-neon-cyan hover:text-neon-cyan"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{modoManual ? "Modo: Manual Próprio" : "Modo: Sincronizado ao Painel"}</span>
          </button>
        )}
      </div>

      {/* BARRA DE AJUSTE DE PERÍODO */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/40 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neon-cyan uppercase tracking-wider mr-1">
            <Clock className="h-3.5 w-3.5 text-neon-cyan" />
            <span>Ajuste de Período:</span>
          </div>

          {PERIODOS_PRESET.map((p) => {
            const isAtivo = periodo === p;
            return (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                  isAtivo
                    ? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p}G
              </button>
            );
          })}

          <button
            onClick={() => setPeriodo("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              periodo === "all"
                ? "bg-neon-gold/20 text-neon-gold ring-1 ring-neon-gold shadow-[0_0_8px_rgba(250,203,21,0.4)]"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            Todos ({totalDisponivel})
          </button>
        </div>

        {/* Alternador do Modo de Cálculo do Período */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setModoCalculo("janela")}
            title="Recalcula a pontuação a partir do início do período selecionado"
            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
              modoCalculo === "janela"
                ? "bg-neon-green/20 text-neon-green ring-1 ring-neon-green/50"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            Janela Recalculada
          </button>
          <button
            onClick={() => setModoCalculo("zoom")}
            title="Mantém a pontuação acumulada e foca a exibição nas últimas rodadas"
            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
              modoCalculo === "zoom"
                ? "bg-neon-green/20 text-neon-green ring-1 ring-neon-green/50"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            Zoom no Histórico
          </button>
        </div>
      </div>

      {/* COMANDO EXPERT (SENTINELA DOUTORADO) */}
      <div
        className={`relative flex w-full flex-col items-center justify-center rounded-lg border p-4 text-center shadow-2xl overflow-hidden transition-all duration-500 ${
          comandoExpert.isMomentoBom
            ? "border-neon-magenta bg-neon-magenta/10 shadow-[0_0_25px_rgba(255,0,255,0.4)]"
            : "border-white/10 bg-black/50"
        }`}
      >
        {comandoExpert.isMomentoBom && (
          <div className="absolute -left-10 -top-10 h-32 w-32 animate-pulse rounded-full bg-neon-magenta/20 blur-[50px]" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-2 w-full">
          {/* HEADER DO ALERTA */}
          <div
            className={`flex items-center gap-2 text-xs font-black tracking-widest ${
              comandoExpert.isMomentoBom ? "text-neon-magenta animate-pulse" : "text-gray-500"
            }`}
          >
            {comandoExpert.isMomentoBom ? (
              <>
                <Target className="h-4 w-4" />
                <span>{comandoExpert.statusTexto}</span>
                <Target className="h-4 w-4" />
              </>
            ) : (
              <span>COMANDO EXPERT SENTINELA (PADRÃO F) — {comandoExpert.statusTexto}</span>
            )}
          </div>

          {/* LINHA PRINCIPAL DO MOVIMENTO EXATO EM PURO BRANCO */}
          <div
            className={`font-display text-lg font-black uppercase sm:text-2xl ${
              comandoExpert.isMomentoBom ? "text-white" : "text-gray-400"
            }`}
          >
            {comandoExpert.movimentoExato}
          </div>

          {comandoExpert.isMomentoBom && comandoExpert.tendencia && (
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="rounded bg-neon-magenta/20 px-2 py-1 text-xs font-bold text-neon-magenta">
                FORÇA: {comandoExpert.tendencia.valorTendencia}%
              </span>
              <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400">
                CALOR: {comandoExpert.tendencia.temperaturaMediaGrupo}ºC
              </span>
            </div>
          )}

          {/* SUB-LINHA TÁTICA: JUSTIFICATIVA */}
          <div className="mt-2 text-[11px] font-semibold tracking-wide text-gray-400 max-w-xl">
            {comandoExpert.justificativa}
          </div>
        </div>
      </div>

      {/* CARDS DE PLACAR DOS 4 QUADRANTES */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {/* Quadrante 1 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FF10F0]/30 bg-[#FF10F0]/5 p-2.5 text-center transition hover:border-[#FF10F0]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF10F0]">
            <span className="font-bold">Q1 (9 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaQ1.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO BOM ({tendenciaQ1.valorTendencia}%)
                </span>
              )}
              {quadranteLider && quadranteLider.id === 1 && (
                <span className="rounded bg-[#FF10F0]/20 px-1 py-0.5 text-[8px] font-black text-[#FF10F0]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">
            {placar.q1.pts} <span className="text-xs font-normal text-gray-400">pts</span>
          </div>
          <div className="text-[9px] text-gray-400 truncate" title={Q1.join(", ")}>
            {Q1.join(" · ")}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1.5">
            <span>Acertos: {placar.q1.acertos} ({placar.q1.perc.toFixed(1)}%)</span>
            <span className={placar.q1.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.q1.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              {placar.q1.erros}/2
            </span>
          </div>
        </div>

        {/* Quadrante 2 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#00FFFF]/30 bg-[#00FFFF]/5 p-2.5 text-center transition hover:border-[#00FFFF]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#00FFFF]">
            <span className="font-bold">Q2 (9 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaQ2.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO BOM ({tendenciaQ2.valorTendencia}%)
                </span>
              )}
              {quadranteLider && quadranteLider.id === 2 && (
                <span className="rounded bg-[#00FFFF]/20 px-1 py-0.5 text-[8px] font-black text-[#00FFFF]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">
            {placar.q2.pts} <span className="text-xs font-normal text-gray-400">pts</span>
          </div>
          <div className="text-[9px] text-gray-400 truncate" title={Q2.join(", ")}>
            {Q2.join(" · ")}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1.5">
            <span>Acertos: {placar.q2.acertos} ({placar.q2.perc.toFixed(1)}%)</span>
            <span className={placar.q2.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.q2.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              {placar.q2.erros}/2
            </span>
          </div>
        </div>

        {/* Quadrante 3 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FF6700]/30 bg-[#FF6700]/5 p-2.5 text-center transition hover:border-[#FF6700]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF6700]">
            <span className="font-bold">Q3 (9 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaQ3.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO BOM ({tendenciaQ3.valorTendencia}%)
                </span>
              )}
              {quadranteLider && quadranteLider.id === 3 && (
                <span className="rounded bg-[#FF6700]/20 px-1 py-0.5 text-[8px] font-black text-[#FF6700]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">
            {placar.q3.pts} <span className="text-xs font-normal text-gray-400">pts</span>
          </div>
          <div className="text-[9px] text-gray-400 truncate" title={Q3.join(", ")}>
            {Q3.join(" · ")}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1.5">
            <span>Acertos: {placar.q3.acertos} ({placar.q3.perc.toFixed(1)}%)</span>
            <span className={placar.q3.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.q3.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              {placar.q3.erros}/2
            </span>
          </div>
        </div>

        {/* Quadrante 4 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FACB15]/30 bg-[#FACB15]/5 p-2.5 text-center transition hover:border-[#FACB15]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FACB15]">
            <span className="font-bold">Q4 (9 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaQ4.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO BOM ({tendenciaQ4.valorTendencia}%)
                </span>
              )}
              {quadranteLider && quadranteLider.id === 4 && (
                <span className="rounded bg-[#FACB15]/20 px-1 py-0.5 text-[8px] font-black text-[#FACB15]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">
            {placar.q4.pts} <span className="text-xs font-normal text-gray-400">pts</span>
          </div>
          <div className="text-[9px] text-gray-400 truncate" title={Q4.join(", ")}>
            {Q4.join(" · ")}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1.5">
            <span>Acertos: {placar.q4.acertos} ({placar.q4.perc.toFixed(1)}%)</span>
            <span className={placar.q4.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.q4.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              {placar.q4.erros}/2
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Inserção de Número */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 border border-white/5">
        <div className="flex items-center gap-2">
          <input
            id="numeroRoletaPadraoF"
            type="number"
            min="0"
            max="36"
            placeholder="Número (0-36)"
            value={inputNumero}
            onChange={(e) => setInputNumero(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") registrarNumeroManual();
            }}
            className="h-9 w-32 rounded-md border border-white/10 bg-[#1e1e28] px-3 text-center text-sm font-semibold text-white outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
          />
          <button
            onClick={registrarNumeroManual}
            className="flex h-9 items-center gap-1 rounded-md bg-neon-cyan/20 px-3 text-xs font-semibold text-neon-cyan border border-neon-cyan/40 transition hover:bg-neon-cyan/30 hover:border-neon-cyan"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Amostra ativa: <strong className="text-neon-cyan">{periodoEfetivo} giros</strong>
            {totalPenalidades > 0 && ` · Penalidades no período: ${totalPenalidades}`}
          </span>
          <button
            onClick={limparGrafico}
            title="Limpar rodadas manuais"
            className="flex h-8 items-center gap-1 rounded-md bg-white/5 px-2.5 text-xs font-medium text-gray-300 border border-white/10 transition hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Container do Gráfico */}
      <div className="relative h-72 sm:h-96 w-full rounded-lg bg-black/40 p-2 border border-white/5">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
