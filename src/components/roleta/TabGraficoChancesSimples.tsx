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
  SlidersHorizontal,
  Flame,
  Target,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
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

interface TabGraficoChancesSimplesProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

// Lista oficial dos números vermelhos da Roleta Europeia
const NUM_VERMELHOS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const NUM_PRETOS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const NUM_PARES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
const NUM_IMPARES = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];
const NUM_MENOR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const NUM_MAIOR = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];

const PERIODOS_PRESET = [15, 30, 50, 100] as const;

export function TabGraficoChancesSimples({ spins, onAddSpin }: TabGraficoChancesSimplesProps) {
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
    dataPar,
    dataImpar,
    dataVerm,
    dataPreto,
    dataMenor,
    dataMaior,
    placar,
    totalPenalidades,
  } = useMemo(() => {
    let ptsPar = 0;
    let errPar = 0;
    let ptsImpar = 0;
    let errImpar = 0;
    let ptsVerm = 0;
    let errVerm = 0;
    let ptsPreto = 0;
    let errPreto = 0;
    let ptsMenor = 0;
    let errMenor = 0;
    let ptsMaior = 0;
    let errMaior = 0;

    let hitsPar = 0;
    let hitsImpar = 0;
    let hitsVerm = 0;
    let hitsPreto = 0;
    let hitsMenor = 0;
    let hitsMaior = 0;

    let penPar = 0;
    let penImpar = 0;
    let penVerm = 0;
    let penPreto = 0;
    let penMenor = 0;
    let penMaior = 0;

    // Se o modo for "janela", fatiamos os números de entrada para recalcular a partir do período
    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    const lbls: string[] = ["Início"];
    const dPar: number[] = [0];
    const dImpar: number[] = [0];
    const dVerm: number[] = [0];
    const dPreto: number[] = [0];
    const dMenor: number[] = [0];
    const dMaior: number[] = [0];

    numeros.forEach((num, index) => {
      // Passo 1: Avaliar os acertos e erros de cada par
      if (num === 0) {
        // O Zero conta como erro para todas as chances simples
        errPar++;
        errImpar++;
        errVerm++;
        errPreto++;
        errMenor++;
        errMaior++;
      } else {
        // Par vs Ímpar
        if (num % 2 === 0) {
          ptsPar++;
          errPar = 0;
          errImpar++;
          hitsPar++;
        } else {
          ptsImpar++;
          errImpar = 0;
          errPar++;
          hitsImpar++;
        }

        // Vermelho vs Preto
        if (NUM_VERMELHOS.includes(num)) {
          ptsVerm++;
          errVerm = 0;
          errPreto++;
          hitsVerm++;
        } else {
          ptsPreto++;
          errPreto = 0;
          errVerm++;
          hitsPreto++;
        }

        // Menor (1-18) vs Maior (19-36)
        if (num >= 1 && num <= 18) {
          ptsMenor++;
          errMenor = 0;
          errMaior++;
          hitsMenor++;
        } else {
          ptsMaior++;
          errMaior = 0;
          errMenor++;
          hitsMaior++;
        }
      }

      // Passo 2: Aplicar penalidade de -1 para 2 erros consecutivos
      if (errPar >= 2) {
        ptsPar -= 1;
        errPar = 0;
        penPar++;
      }
      if (errImpar >= 2) {
        ptsImpar -= 1;
        errImpar = 0;
        penImpar++;
      }
      if (errVerm >= 2) {
        ptsVerm -= 1;
        errVerm = 0;
        penVerm++;
      }
      if (errPreto >= 2) {
        ptsPreto -= 1;
        errPreto = 0;
        penPreto++;
      }
      if (errMenor >= 2) {
        ptsMenor -= 1;
        errMenor = 0;
        penMenor++;
      }
      if (errMaior >= 2) {
        ptsMaior -= 1;
        errMaior = 0;
        penMaior++;
      }

      // Passo 3: Registrar pontos para cada rodada
      lbls.push(`R${index + 1} (#${num})`);
      dPar.push(ptsPar);
      dImpar.push(ptsImpar);
      dVerm.push(ptsVerm);
      dPreto.push(ptsPreto);
      dMenor.push(ptsMenor);
      dMaior.push(ptsMaior);
    });

    // Se o modo for "zoom", fatiamos apenas a exibição visual
    let finalLabels = lbls;
    let finalDPar = dPar;
    let finalDImpar = dImpar;
    let finalDVerm = dVerm;
    let finalDPreto = dPreto;
    let finalDMenor = dMenor;
    let finalDMaior = dMaior;

    if (modoCalculo === "zoom" && periodo !== "all" && totalDisponivel > periodo) {
      finalLabels = ["Início (Zoom)", ...lbls.slice(-periodo)];
      finalDPar = [dPar[dPar.length - periodo - 1] ?? 0, ...dPar.slice(-periodo)];
      finalDImpar = [dImpar[dImpar.length - periodo - 1] ?? 0, ...dImpar.slice(-periodo)];
      finalDVerm = [dVerm[dVerm.length - periodo - 1] ?? 0, ...dVerm.slice(-periodo)];
      finalDPreto = [dPreto[dPreto.length - periodo - 1] ?? 0, ...dPreto.slice(-periodo)];
      finalDMenor = [dMenor[dMenor.length - periodo - 1] ?? 0, ...dMenor.slice(-periodo)];
      finalDMaior = [dMaior[dMaior.length - periodo - 1] ?? 0, ...dMaior.slice(-periodo)];
    }

    return {
      labels: finalLabels,
      dataPar: finalDPar,
      dataImpar: finalDImpar,
      dataVerm: finalDVerm,
      dataPreto: finalDPreto,
      dataMenor: finalDMenor,
      dataMaior: finalDMaior,
      placar: {
        par: { pts: ptsPar, erros: errPar, acertos: hitsPar, penalidades: penPar },
        impar: { pts: ptsImpar, erros: errImpar, acertos: hitsImpar, penalidades: penImpar },
        verm: { pts: ptsVerm, erros: errVerm, acertos: hitsVerm, penalidades: penVerm },
        preto: { pts: ptsPreto, erros: errPreto, acertos: hitsPreto, penalidades: penPreto },
        menor: { pts: ptsMenor, erros: errMenor, acertos: hitsMenor, penalidades: penMenor },
        maior: { pts: ptsMaior, erros: errMaior, acertos: hitsMaior, penalidades: penMaior },
      },
      totalPenalidades:
        penPar + penImpar + penVerm + penPreto + penMenor + penMaior,
    };
  }, [modoCalculo, periodo, todosNumeros, totalDisponivel]);

  const tendenciaPar = useMemo(() => avaliarTendenciaCirurgica({ id: "par", nome: "Par", numeros: NUM_PARES, pontosHistorico: dataPar, todosNumerosCronologicos: todosNumeros }), [dataPar, todosNumeros]);
  const tendenciaImpar = useMemo(() => avaliarTendenciaCirurgica({ id: "impar", nome: "Ímpar", numeros: NUM_IMPARES, pontosHistorico: dataImpar, todosNumerosCronologicos: todosNumeros }), [dataImpar, todosNumeros]);
  const tendenciaVerm = useMemo(() => avaliarTendenciaCirurgica({ id: "verm", nome: "Vermelho", numeros: NUM_VERMELHOS, pontosHistorico: dataVerm, todosNumerosCronologicos: todosNumeros }), [dataVerm, todosNumeros]);
  const tendenciaPreto = useMemo(() => avaliarTendenciaCirurgica({ id: "preto", nome: "Preto", numeros: NUM_PRETOS, pontosHistorico: dataPreto, todosNumerosCronologicos: todosNumeros }), [dataPreto, todosNumeros]);
  const tendenciaMenor = useMemo(() => avaliarTendenciaCirurgica({ id: "menor", nome: "Menor (1-18)", numeros: NUM_MENOR, pontosHistorico: dataMenor, todosNumerosCronologicos: todosNumeros }), [dataMenor, todosNumeros]);
  const tendenciaMaior = useMemo(() => avaliarTendenciaCirurgica({ id: "maior", nome: "Maior (19-36)", numeros: NUM_MAIOR, pontosHistorico: dataMaior, todosNumerosCronologicos: todosNumeros }), [dataMaior, todosNumeros]);

  const comandoExpert = useMemo(() => {
    const tendencias = [
      { id: "Par", nome: "Par", tendencia: tendenciaPar },
      { id: "Impar", nome: "Ímpar", tendencia: tendenciaImpar },
      { id: "Vermelho", nome: "Vermelho", tendencia: tendenciaVerm },
      { id: "Preto", nome: "Preto", tendencia: tendenciaPreto },
      { id: "Menor", nome: "Menor (1-18)", tendencia: tendenciaMenor },
      { id: "Maior", nome: "Maior (19-36)", tendencia: tendenciaMaior },
    ];

    const lider = [...tendencias].sort((a, b) => b.tendencia.valorTendencia - a.tendencia.valorTendencia)[0];

    if (lider && lider.tendencia.isMomentoBom) {
      return {
        isMomentoBom: true,
        lider: lider,
        statusTexto: "🔥 TENDÊNCIA CIRÚRGICA DETECTADA!",
        movimentoExato: `ENTRAR NO ${lider.nome.toUpperCase()} • PROTEÇÃO NO 0`,
        justificativa: `Força ${lider.tendencia.valorTendencia}% | Calor ${lider.tendencia.temperaturaMediaGrupo}ºC | A chance simples ${lider.nome} apresenta crescimento sustentável validado.`,
      };
    }

    return {
      isMomentoBom: false,
      statusTexto: "AGUARDANDO ALINHAMENTO...",
      movimentoExato: `PROTEGER BANCA • AGUARDAR FORÇA DE TENDÊNCIA ≥ 70%`,
      justificativa: `Nenhuma chance simples atingiu os critérios cirúrgicos de Força de Tendência (mín. 70%) e calor térmico ativo.`,
    };
  }, [tendenciaPar, tendenciaImpar, tendenciaVerm, tendenciaPreto, tendenciaMenor, tendenciaMaior]);

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
        label: "Par (Rosa)",
        data: dataPar,
        borderColor: tendenciaPar.isMomentoBom ? "#00FF00" : "#FF10F0",
        backgroundColor: "rgba(255, 16, 240, 0.05)",
        borderWidth: tendenciaPar.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaPar.isMomentoBom ? "#00FF00" : "#FF10F0",
        pointBorderColor: (ctx: any) => tendenciaPar.isMomentoBom ? "#00FF00" : "#FF10F0",
        pointRadius: (ctx: any) => tendenciaPar.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
      },
      {
        label: "Ímpar (Roxo)",
        data: dataImpar,
        borderColor: tendenciaImpar.isMomentoBom ? "#00FF00" : "#8A2BE2",
        backgroundColor: "rgba(138, 43, 226, 0.05)",
        borderWidth: tendenciaImpar.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaImpar.isMomentoBom ? "#00FF00" : "#8A2BE2",
        pointBorderColor: (ctx: any) => tendenciaImpar.isMomentoBom ? "#00FF00" : "#8A2BE2",
        pointRadius: (ctx: any) => tendenciaImpar.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
      },
      {
        label: "Vermelho (Verm. Neon)",
        data: dataVerm,
        borderColor: tendenciaVerm.isMomentoBom ? "#00FF00" : "#FF003C",
        backgroundColor: "rgba(255, 0, 60, 0.08)",
        borderWidth: tendenciaVerm.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaVerm.isMomentoBom ? "#00FF00" : "#FF003C",
        pointBorderColor: (ctx: any) => tendenciaVerm.isMomentoBom ? "#00FF00" : "#FF003C",
        pointRadius: (ctx: any) => tendenciaVerm.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
      },
      {
        label: "Preto (Prata)",
        data: dataPreto,
        borderColor: tendenciaPreto.isMomentoBom ? "#00FF00" : "#E0E0E0",
        backgroundColor: "rgba(224, 224, 224, 0.05)",
        borderWidth: tendenciaPreto.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaPreto.isMomentoBom ? "#00FF00" : "#E0E0E0",
        pointBorderColor: (ctx: any) => tendenciaPreto.isMomentoBom ? "#00FF00" : "#E0E0E0",
        pointRadius: (ctx: any) => tendenciaPreto.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
      },
      {
        label: "Menor 1-18 (Ciano)",
        data: dataMenor,
        borderColor: tendenciaMenor.isMomentoBom ? "#00FF00" : "#00FFFF",
        backgroundColor: "rgba(0, 255, 255, 0.05)",
        borderWidth: tendenciaMenor.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaMenor.isMomentoBom ? "#00FF00" : "#00FFFF",
        pointBorderColor: (ctx: any) => tendenciaMenor.isMomentoBom ? "#00FF00" : "#00FFFF",
        pointRadius: (ctx: any) => tendenciaMenor.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
      },
      {
        label: "Maior 19-36 (Laranja)",
        data: dataMaior,
        borderColor: tendenciaMaior.isMomentoBom ? "#00FF00" : "#FF6700",
        backgroundColor: "rgba(255, 103, 0, 0.05)",
        borderWidth: tendenciaMaior.isMomentoBom ? 4 : 2,
        pointBackgroundColor: (ctx: any) => tendenciaMaior.isMomentoBom ? "#00FF00" : "#FF6700",
        pointBorderColor: (ctx: any) => tendenciaMaior.isMomentoBom ? "#00FF00" : "#FF6700",
        pointRadius: (ctx: any) => tendenciaMaior.isMomentoBom ? 3 : labels.length > 60 ? 1 : 2.5,
        tension: 0.4,
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
            <SlidersHorizontal className="h-5 w-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
              Chances Simples <span className="text-neon-cyan">(Tolerância 2x)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Par/Ímpar · Vermelho/Preto · Maior/Menor · Penalidade de -1 a cada 2 erros consecutivos (0 conta erro geral)
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

      {/* BARRA DE AJUSTE DE PERÍODO (Lovable Period Controls) */}
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
                ? "bg-neon-magenta/20 text-neon-magenta ring-1 ring-neon-magenta shadow-[0_0_8px_rgba(255,16,240,0.4)]"
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
              <span>COMANDO EXPERT SENTINELA (CHANCES SIMPLES) — {comandoExpert.statusTexto}</span>
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

          {comandoExpert.isMomentoBom && comandoExpert.lider && (
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="rounded bg-neon-magenta/20 px-2 py-1 text-xs font-bold text-neon-magenta">
                FORÇA: {comandoExpert.lider.tendencia.valorTendencia}%
              </span>
              <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400">
                CALOR: {comandoExpert.lider.tendencia.temperaturaMediaGrupo}ºC
              </span>
            </div>
          )}

          {/* SUB-LINHA TÁTICA: JUSTIFICATIVA */}
          <div className="mt-2 text-[11px] font-semibold tracking-wide text-gray-400 max-w-xl">
            {comandoExpert.justificativa}
          </div>
        </div>
      </div>

      {/* CARDS DE PLACAR DAS 6 CHANCES SIMPLES (Agrupadas em 3 Pares) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* Par */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FF10F0]/30 bg-[#FF10F0]/5 p-2 text-center transition hover:border-[#FF10F0]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF10F0]">
            <span className="font-bold">Par</span>
            <div className="flex items-center gap-1">
              {tendenciaPar.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaPar.valorTendencia}%)
                </span>
              )}
              {placar.par.pts >= placar.impar.pts && (
                <span className="rounded bg-[#FF10F0]/20 px-1 py-0.5 text-[8px] font-black text-[#FF10F0]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.par.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.par.acertos}</span>
            <span className={placar.par.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.par.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.par.erros}/2
            </span>
          </div>
        </div>

        {/* Ímpar */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#8A2BE2]/30 bg-[#8A2BE2]/5 p-2 text-center transition hover:border-[#8A2BE2]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#8A2BE2]">
            <span className="font-bold">Ímpar</span>
            <div className="flex items-center gap-1">
              {tendenciaImpar.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaImpar.valorTendencia}%)
                </span>
              )}
              {placar.impar.pts > placar.par.pts && (
                <span className="rounded bg-[#8A2BE2]/20 px-1 py-0.5 text-[8px] font-black text-[#8A2BE2]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.impar.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.impar.acertos}</span>
            <span className={placar.impar.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.impar.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.impar.erros}/2
            </span>
          </div>
        </div>

        {/* Vermelho */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FF003C]/40 bg-[#FF003C]/10 p-2 text-center transition hover:border-[#FF003C] shadow-[0_0_12px_rgba(255,0,60,0.25)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF003C]">
            <span className="font-bold">Vermelho</span>
            <div className="flex items-center gap-1">
              {tendenciaVerm.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaVerm.valorTendencia}%)
                </span>
              )}
              {placar.verm.pts >= placar.preto.pts && (
                <span className="rounded bg-[#FF003C]/20 px-1 py-0.5 text-[8px] font-black text-[#FF003C] border border-[#FF003C]/50 shadow-[0_0_8px_#FF003C]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.verm.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.verm.acertos}</span>
            <span className={placar.verm.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.verm.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.verm.erros}/2
            </span>
          </div>
        </div>

        {/* Preto */}
        <div className="relative flex flex-col justify-between rounded-lg border border-white/40 bg-black/80 p-2 text-center transition hover:border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white">
            <span className="font-bold">Preto</span>
            <div className="flex items-center gap-1">
              {tendenciaPreto.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaPreto.valorTendencia}%)
                </span>
              )}
              {placar.preto.pts > placar.verm.pts && (
                <span className="rounded bg-white/20 px-1 py-0.5 text-[8px] font-black text-white border border-white/50 shadow-[0_0_8px_#FFFFFF]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.preto.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.preto.acertos}</span>
            <span className={placar.preto.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.preto.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.preto.erros}/2
            </span>
          </div>
        </div>

        {/* Menor (1-18) */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#00FFFF]/30 bg-[#00FFFF]/5 p-2 text-center transition hover:border-[#00FFFF]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#00FFFF]">
            <span className="font-bold">Menor (1-18)</span>
            <div className="flex items-center gap-1">
              {tendenciaMenor.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaMenor.valorTendencia}%)
                </span>
              )}
              {placar.menor.pts >= placar.maior.pts && (
                <span className="rounded bg-[#00FFFF]/20 px-1 py-0.5 text-[8px] font-black text-[#00FFFF]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.menor.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.menor.acertos}</span>
            <span className={placar.menor.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.menor.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.menor.erros}/2
            </span>
          </div>
        </div>

        {/* Maior (19-36) */}
        <div className="relative flex flex-col justify-between rounded-lg border border-[#FF6700]/30 bg-[#FF6700]/5 p-2 text-center transition hover:border-[#FF6700]/60">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF6700]">
            <span className="font-bold">Maior (19-36)</span>
            <div className="flex items-center gap-1">
              {tendenciaMaior.isMomentoBom && (
                <span className="flex animate-pulse items-center gap-1 rounded bg-[#00FF00]/20 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.5)]">
                  <Flame className="h-2.5 w-2.5" /> 📈 MOMENTO ({tendenciaMaior.valorTendencia}%)
                </span>
              )}
              {placar.maior.pts > placar.menor.pts && (
                <span className="rounded bg-[#FF6700]/20 px-1 py-0.5 text-[8px] font-black text-[#FF6700]">
                  VENC.
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-xl font-black text-white">{placar.maior.pts} <span className="text-[10px] font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1">
            <span>Acertos: {placar.maior.acertos}</span>
            <span className={placar.maior.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.maior.erros === 1 && <AlertTriangle className="h-2.5 w-2.5 inline" />}
              {placar.maior.erros}/2
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Inserção de Número */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 border border-white/5">
        <div className="flex items-center gap-2">
          <input
            id="numeroRoletaChancesSimples"
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
      <div className="relative h-80 sm:h-[450px] w-full rounded-lg bg-black/40 p-2 border border-white/5">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
