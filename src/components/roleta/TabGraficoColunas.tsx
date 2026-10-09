import { useState, useMemo, useEffect, useRef } from "react";
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
  LineChart,
  RotateCcw,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  SlidersHorizontal,
  Target,
  Zap,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import { DENSITY_QUADRANTS } from "@/lib/density-radar";
import { toast } from "sonner";
import { avaliarTendenciaCirurgica } from "@/lib/trend-heat-maximas-engine";

// Plugin Chart.js para brilho neon dinâmico nas linhas em momento de alta
const trendGlowPlugin = {
  id: "trendGlowPlugin",
  beforeDatasetDraw: (chart: any, args: any) => {
    const dataset = chart.data.datasets[args.index];
    if (dataset?.isEmAlta) {
      const { ctx } = chart;
      ctx.save();
      ctx.shadowColor = dataset.shadowColor || dataset.borderColor;
      ctx.shadowBlur = dataset.shadowBlur || 18;
    }
  },
  afterDatasetDraw: (chart: any, args: any) => {
    const dataset = chart.data.datasets[args.index];
    if (dataset?.isEmAlta) {
      chart.ctx.restore();
    }
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  trendGlowPlugin
);

interface TabGraficoColunasProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

const PERIODOS_PRESET = [15, 30, 50, 100] as const;

export function TabGraficoColunas({ spins, onAddSpin }: TabGraficoColunasProps) {
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
    // Giros do app vêm do mais recente para o mais antigo; inverter para ordem cronológica
    return [...spins].reverse().map((s) => s.num);
  }, [modoManual, spins, numerosManuais]);

  const totalDisponivel = todosNumeros.length;
  const periodoEfetivo = periodo === "all" ? totalDisponivel : Math.min(periodo, totalDisponivel);

  // Cálculo da pontuação, tolerância de 2 erros e aplicação do filtro de período
  const { labels, dataCol1, dataCol2, dataCol3, placar, colLider, totalPenalidades } = useMemo(() => {
    let ptsCol1 = 0;
    let errCol1 = 0;
    let ptsCol2 = 0;
    let errCol2 = 0;
    let ptsCol3 = 0;
    let errCol3 = 0;

    let hitsCol1 = 0;
    let hitsCol2 = 0;
    let hitsCol3 = 0;
    let penCol1 = 0;
    let penCol2 = 0;
    let penCol3 = 0;

    // Se o modo for "janela", fatiamos os números de entrada para iniciar o cálculo no início do período selecionado
    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    const lbls: string[] = ["Início"];
    const d1: number[] = [0];
    const d2: number[] = [0];
    const d3: number[] = [0];

    numeros.forEach((num, index) => {
      // Passo 1: Verificar acertos e contar os erros de quem não saiu
      if (num === 0) {
        errCol1++;
        errCol2++;
        errCol3++;
      } else if (num % 3 === 1) {
        ptsCol1 += 1;
        errCol1 = 0; // Zera o erro por ter acertado
        errCol2++;
        errCol3++;
        hitsCol1++;
      } else if (num % 3 === 2) {
        ptsCol2 += 1;
        errCol2 = 0;
        errCol1++;
        errCol3++;
        hitsCol2++;
      } else if (num % 3 === 0) {
        ptsCol3 += 1;
        errCol3 = 0;
        errCol1++;
        errCol2++;
        hitsCol3++;
      }

      // Passo 2: Aplicar a penalidade de -1 para quem acumulou 2 erros seguidos
      if (errCol1 >= 2) {
        ptsCol1 -= 1;
        errCol1 = 0;
        penCol1++;
      }
      if (errCol2 >= 2) {
        ptsCol2 -= 1;
        errCol2 = 0;
        penCol2++;
      }
      if (errCol3 >= 2) {
        ptsCol3 -= 1;
        errCol3 = 0;
        penCol3++;
      }

      // Passo 3: Registrar pontos para cada rodada
      lbls.push(`R${index + 1} (#${num})`);
      d1.push(ptsCol1);
      d2.push(ptsCol2);
      d3.push(ptsCol3);
    });

    // Se o modo for "zoom", o cálculo foi feito com todo o histórico, fatiando apenas a exibição visual
    let finalLabels = lbls;
    let finalD1 = d1;
    let finalD2 = d2;
    let finalD3 = d3;

    if (modoCalculo === "zoom" && periodo !== "all" && totalDisponivel > periodo) {
      finalLabels = ["Início (Zoom)", ...lbls.slice(-periodo)];
      finalD1 = [d1[d1.length - periodo - 1] ?? 0, ...d1.slice(-periodo)];
      finalD2 = [d2[d2.length - periodo - 1] ?? 0, ...d2.slice(-periodo)];
      finalD3 = [d3[d3.length - periodo - 1] ?? 0, ...d3.slice(-periodo)];
    }

    const cols = [
      { id: 1, nome: "Coluna 1", corHex: "#FF10F0", pts: ptsCol1 },
      { id: 2, nome: "Coluna 2", corHex: "#00FFFF", pts: ptsCol2 },
      { id: 3, nome: "Coluna 3", corHex: "#FF6700", pts: ptsCol3 },
    ];
    cols.sort((a, b) => b.pts - a.pts);

    return {
      labels: finalLabels,
      dataCol1: finalD1,
      dataCol2: finalD2,
      dataCol3: finalD3,
      placar: {
        col1: { pts: ptsCol1, erros: errCol1, acertos: hitsCol1, penalidades: penCol1 },
        col2: { pts: ptsCol2, erros: errCol2, acertos: hitsCol2, penalidades: penCol2 },
        col3: { pts: ptsCol3, erros: errCol3, acertos: hitsCol3, penalidades: penCol3 },
      },
      colLider: cols[0],
      totalPenalidades: penCol1 + penCol2 + penCol3,
    };
  }, [modoCalculo, periodo, todosNumeros, totalDisponivel]);

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

  // =========================================================================
  // =========================================================================
  // VALOR DE TENDÊNCIA CIRÚRGICO, MÁXIMAS E CALOR DE CADA NÚMERO
  // =========================================================================
  const tendenciaCol1 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "col_1",
        nome: "Coluna 1",
        numeros: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
        pontosHistorico: dataCol1,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataCol1, todosNumeros]
  );

  const tendenciaCol2 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "col_2",
        nome: "Coluna 2",
        numeros: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        pontosHistorico: dataCol2,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataCol2, todosNumeros]
  );

  const tendenciaCol3 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "col_3",
        nome: "Coluna 3",
        numeros: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        pontosHistorico: dataCol3,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataCol3, todosNumeros]
  );

  // Alertas de Toast disparados uma única vez por sequência detectada
  const lastAlertedRef = useRef<{ 1: boolean; 2: boolean; 3: boolean }>({
    1: false,
    2: false,
    3: false,
  });

  useEffect(() => {
    const cols = [
      { id: 1 as const, nome: "Coluna 1 (Rosa)", tendencia: tendenciaCol1 },
      { id: 2 as const, nome: "Coluna 2 (Ciano)", tendencia: tendenciaCol2 },
      { id: 3 as const, nome: "Coluna 3 (Laranja)", tendencia: tendenciaCol3 },
    ];

    cols.forEach(({ id, nome, tendencia }) => {
      if (tendencia.isMomentoBom) {
        if (!lastAlertedRef.current[id]) {
          toast.success(`Atenção: ${nome} validada com Força de Tendência em ${tendencia.valorTendencia}%!`, {
            description: `Calor térmico de ${tendencia.temperaturaMediaGrupo}°C com alvos sniper: [ ${tendencia.alvosSniper.slice(0, 3).join(", ")} ]. Momento consistente confirmado.`,
            duration: 4500,
          });
          lastAlertedRef.current[id] = true;
        }
      } else {
        lastAlertedRef.current[id] = false;
      }
    });
  }, [
    tendenciaCol1.isMomentoBom,
    tendenciaCol2.isMomentoBom,
    tendenciaCol3.isMomentoBom,
    tendenciaCol1.valorTendencia,
    tendenciaCol2.valorTendencia,
    tendenciaCol3.valorTendencia,
    tendenciaCol1.alvosSniper,
    tendenciaCol2.alvosSniper,
    tendenciaCol3.alvosSniper,
  ]);

  // =========================================================================
  // MOTOR DE CONFLUÊNCIA EXPERT: COLUNAS & PADRÕES F (DENSIDADE FÍSICA)
  // =========================================================================
  const densidadeF = useMemo(() => {
    let ptsQ1 = 0, ptsQ2 = 0, ptsQ3 = 0, ptsQ4 = 0;
    let errQ1 = 0, errQ2 = 0, errQ3 = 0, errQ4 = 0;
    let hitsQ1 = 0, hitsQ2 = 0, hitsQ3 = 0, hitsQ4 = 0;

    const Q1 = DENSITY_QUADRANTS[0];
    const Q2 = DENSITY_QUADRANTS[1];
    const Q3 = DENSITY_QUADRANTS[2];
    const Q4 = DENSITY_QUADRANTS[3];

    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    numeros.forEach((num) => {
      if (num === 0) {
        errQ1++; errQ2++; errQ3++; errQ4++;
      } else if (Q1.includes(num)) {
        ptsQ1++; errQ1 = 0; errQ2++; errQ3++; errQ4++; hitsQ1++;
      } else if (Q2.includes(num)) {
        ptsQ2++; errQ2 = 0; errQ1++; errQ3++; errQ4++; hitsQ2++;
      } else if (Q3.includes(num)) {
        ptsQ3++; errQ3 = 0; errQ1++; errQ2++; errQ4++; hitsQ3++;
      } else if (Q4.includes(num)) {
        ptsQ4++; errQ4 = 0; errQ1++; errQ2++; errQ3++; hitsQ4++;
      }

      if (errQ1 >= 2) { ptsQ1--; errQ1 = 0; }
      if (errQ2 >= 2) { ptsQ2--; errQ2 = 0; }
      if (errQ3 >= 2) { ptsQ3--; errQ3 = 0; }
      if (errQ4 >= 2) { ptsQ4--; errQ4 = 0; }
    });

    const quads = [
      { id: 1, nome: "Quadrante Q1", pts: ptsQ1, hits: hitsQ1, nums: Q1 },
      { id: 2, nome: "Quadrante Q2", pts: ptsQ2, hits: hitsQ2, nums: Q2 },
      { id: 3, nome: "Quadrante Q3", pts: ptsQ3, hits: hitsQ3, nums: Q3 },
      { id: 4, nome: "Quadrante Q4", pts: ptsQ4, hits: hitsQ4, nums: Q4 },
    ];
    quads.sort((a, b) => b.pts - a.pts);

    const quadPadrao = quads[0] ?? { id: 1, nome: "Quadrante Q1", pts: ptsQ1, hits: hitsQ1, nums: Q1 };

    return {
      lider: quadPadrao,
      quads,
    };
  }, [modoCalculo, periodo, todosNumeros, totalDisponivel]);

  const colunasAnalise = useMemo(() => {
    return [
      {
        id: 1 as const,
        nome: "Coluna 1",
        corHex: "#FF10F0",
        corNome: "Rosa",
        emAlta: tendenciaCol1.isMomentoBom,
        ganho5R: tendenciaCol1.ganhoRecente,
        valorTendencia: tendenciaCol1.valorTendencia,
        tempMedia: tendenciaCol1.temperaturaMediaGrupo,
        alvosSniper: tendenciaCol1.alvosSniper,
        pts: placar.col1.pts,
        nums: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
      },
      {
        id: 2 as const,
        nome: "Coluna 2",
        corHex: "#00FFFF",
        corNome: "Ciano",
        emAlta: tendenciaCol2.isMomentoBom,
        ganho5R: tendenciaCol2.ganhoRecente,
        valorTendencia: tendenciaCol2.valorTendencia,
        tempMedia: tendenciaCol2.temperaturaMediaGrupo,
        alvosSniper: tendenciaCol2.alvosSniper,
        pts: placar.col2.pts,
        nums: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
      },
      {
        id: 3 as const,
        nome: "Coluna 3",
        corHex: "#FF6700",
        corNome: "Laranja",
        emAlta: tendenciaCol3.isMomentoBom,
        ganho5R: tendenciaCol3.ganhoRecente,
        valorTendencia: tendenciaCol3.valorTendencia,
        tempMedia: tendenciaCol3.temperaturaMediaGrupo,
        alvosSniper: tendenciaCol3.alvosSniper,
        pts: placar.col3.pts,
        nums: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
      },
    ];
  }, [tendenciaCol1, tendenciaCol2, tendenciaCol3, placar]);

  const colunasEmAlta = useMemo(
    () => colunasAnalise.filter((c) => c.emAlta).sort((a, b) => b.valorTendencia - a.valorTendencia || b.pts - a.pts),
    [colunasAnalise]
  );
  const temMomentoBom = colunasEmAlta.length > 0;
  const colunaPrincipalAlta = colunasEmAlta[0] ?? null;

  const comandoExpert = useMemo(() => {
    const quadLider = densidadeF.lider;
    const liderColuna = colLider ?? { id: 1, nome: "Coluna 1", corHex: "#FF10F0", pts: 0 };

    if (temMomentoBom && colunaPrincipalAlta) {
      const sniperNums = colunaPrincipalAlta.alvosSniper;
      return {
        isMomentoBom: true as const,
        statusTexto: `🔥 MOMENTO BOM · TENDÊNCIA CIRÚRGICA (FORÇA: ${colunaPrincipalAlta.valorTendencia}% | CALOR: ${colunaPrincipalAlta.tempMedia}°C)`,
        coluna: colunaPrincipalAlta,
        quadrante: quadLider,
        sniperNums,
        movimentoExato: `APOSTA NA ${colunaPrincipalAlta.nome.toUpperCase()} (${colunaPrincipalAlta.corNome.toUpperCase()}) COM COBERTURA NO 0 · CONFLUÊNCIA COM PADRÃO F: ${quadLider.nome.toUpperCase()} (${quadLider.pts} PTS) · ALVOS SNIPER DE CALOR & MÁXIMAS: [ ${sniperNums.join(", ")} ]`,
        justificativa: `${colunaPrincipalAlta.nome} validada com Força de Tendência em ${colunaPrincipalAlta.valorTendencia}% (+${colunaPrincipalAlta.ganho5R} pts recentes). Calor médio de ${colunaPrincipalAlta.tempMedia}°C com números em ignição e confluência no setor ${quadLider.nome}.`,
      };
    }

    return {
      isMomentoBom: false as const,
      statusTexto: "⏳ AGUARDANDO MOMENTO BOM (MERCADO EM TRANSIÇÃO)",
      coluna: null,
      quadrante: quadLider,
      sniperNums: [] as number[],
      movimentoExato: `PROTEGER BANCA · AGUARDAR FORÇA DE TENDÊNCIA ATINGIR 70% NA ${liderColuna.nome.toUpperCase()} (LÍDER COM ${liderColuna.pts} PTS) OU GATILHO DO PADRÃO F (${quadLider.nome.toUpperCase()})`,
      justificativa: `Nenhuma das 3 colunas sustenta Força de Tendência mínima de 70% com calor no momento. Aguarde alinhamento térmico para disparar entrada.`,
    };
  }, [temMomentoBom, colunaPrincipalAlta, densidadeF, colLider]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Coluna 1 (Rosa)",
        data: dataCol1,
        borderColor: "#FF10F0",
        backgroundColor: tendenciaCol1.isMomentoBom ? "rgba(255, 16, 240, 0.22)" : "rgba(255, 16, 240, 0.08)",
        borderWidth: tendenciaCol1.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaCol1.isMomentoBom && ctx.p0DataIndex >= dataCol1.length - 6) {
              return 4;
            }
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaCol1.isMomentoBom && ctx.dataIndex >= dataCol1.length - 6) return "#00FF00";
          return "#FF10F0";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaCol1.isMomentoBom && ctx.dataIndex >= dataCol1.length - 6) return "#FFFFFF";
          return "#FF10F0";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaCol1.isMomentoBom && ctx.dataIndex >= dataCol1.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaCol1.isMomentoBom,
        shadowColor: "#FF10F0",
        shadowBlur: tendenciaCol1.isMomentoBom ? 18 : 0,
      },
      {
        label: "Coluna 2 (Ciano)",
        data: dataCol2,
        borderColor: "#00FFFF",
        backgroundColor: tendenciaCol2.isMomentoBom ? "rgba(0, 255, 255, 0.22)" : "rgba(0, 255, 255, 0.08)",
        borderWidth: tendenciaCol2.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaCol2.isMomentoBom && ctx.p0DataIndex >= dataCol2.length - 6) {
              return 4;
            }
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaCol2.isMomentoBom && ctx.dataIndex >= dataCol2.length - 6) return "#00FF00";
          return "#00FFFF";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaCol2.isMomentoBom && ctx.dataIndex >= dataCol2.length - 6) return "#FFFFFF";
          return "#00FFFF";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaCol2.isMomentoBom && ctx.dataIndex >= dataCol2.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaCol2.isMomentoBom,
        shadowColor: "#00FFFF",
        shadowBlur: tendenciaCol2.isMomentoBom ? 18 : 0,
      },
      {
        label: "Coluna 3 (Laranja)",
        data: dataCol3,
        borderColor: "#FF6700",
        backgroundColor: tendenciaCol3.isMomentoBom ? "rgba(255, 103, 0, 0.22)" : "rgba(255, 103, 0, 0.08)",
        borderWidth: tendenciaCol3.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaCol3.isMomentoBom && ctx.p0DataIndex >= dataCol3.length - 6) {
              return 4;
            }
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaCol3.isMomentoBom && ctx.dataIndex >= dataCol3.length - 6) return "#00FF00";
          return "#FF6700";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaCol3.isMomentoBom && ctx.dataIndex >= dataCol3.length - 6) return "#FFFFFF";
          return "#FF6700";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaCol3.isMomentoBom && ctx.dataIndex >= dataCol3.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaCol3.isMomentoBom,
        shadowColor: "#FF6700",
        shadowBlur: tendenciaCol3.isMomentoBom ? 18 : 0,
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
          font: { size: 13 },
          padding: 12,
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
            <LineChart className="h-5 w-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
              Frequência de Colunas <span className="text-neon-cyan">(Tolerância 2x)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Penalidade de -1 a cada 2 ausências consecutivas · Total de giros: {totalDisponivel}
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
          <div className="flex items-center gap-1 text-[11px] font-semibold text-neon-gold uppercase tracking-wider mr-1">
            <Clock className="h-3.5 w-3.5 text-neon-gold" />
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

      {/* =========================================================================
          TARJA ROXO NEON COM LETRA PURO BRANCO - COMANDO EXPERT COLUNAS & PADRÃO F
          ========================================================================= */}
      <div
        className="w-full my-1 overflow-hidden rounded-xl border-2 border-[#B026FF] bg-gradient-to-r from-[#170329] via-[#38075c] to-[#170329] shadow-[0_0_22px_rgba(176,38,255,0.75),inset_0_0_12px_rgba(176,38,255,0.3)] select-none transition-all p-2.5 sm:p-3"
        style={{ borderColor: "#B026FF" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
          {/* LADO ESQUERDO: CHIP AO VIVO + TÍTULO DO COMANDO */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B026FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_6px_#FFFFFF]"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-white bg-[#581c87] px-1.5 py-0.2 rounded border border-[#B026FF]">
                AO VIVO
              </span>
            </div>

            <span className="text-white text-xs sm:text-[13px] font-black tracking-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.95)] truncate">
              ⚡ COMANDO EXPERT · FREQUÊNCIA DE COLUNAS & PADRÕES F (DENSIDADE)
            </span>
          </div>

          {/* LADO DIREITO: STATUS DO MOMENTO */}
          <div className="flex items-center gap-2 shrink-0">
            {comandoExpert.isMomentoBom ? (
              <span className="rounded bg-[#00FF00] text-black font-black px-2 py-0.5 text-xs shadow-[0_0_12px_#00FF00] tracking-wider uppercase flex items-center gap-1 animate-pulse">
                <Flame className="h-3.5 w-3.5 fill-black text-black" />
                <span>🔥 MOMENTO BOM · TENDÊNCIA DE ALTA ATIVA</span>
              </span>
            ) : (
              <span className="rounded bg-black/80 text-white font-black px-2 py-0.5 text-[11px] border border-white/50 tracking-wider uppercase">
                ⏳ AGUARDANDO MOMENTO BOM (MERCADO EM TRANSIÇÃO)
              </span>
            )}
          </div>
        </div>

        {/* LINHA PRINCIPAL DO MOVIMENTO EXATO EM PURO BRANCO */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#B026FF]/30 font-mono">
          <div className="flex items-start sm:items-center gap-2">
            <span className="bg-white text-black font-black px-2 py-0.5 rounded text-xs shadow-[0_0_10px_#FFFFFF] tracking-wider uppercase shrink-0">
              🎯 MOVIMENTO EXATO
            </span>
            <span className="text-white text-xs sm:text-[13px] font-black tracking-wide drop-shadow-[0_0_6px_rgba(255,255,255,0.95)]">
              {comandoExpert.movimentoExato}
            </span>
          </div>

          {comandoExpert.isMomentoBom && comandoExpert.coluna && (
            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-white font-black">
              <span className="text-[#00FF00] bg-black/60 px-2 py-0.5 rounded border border-[#00FF00]/40">
                +{comandoExpert.coluna.ganho5R} PTS EM 5 GIROS
              </span>
            </div>
          )}
        </div>

        {/* SUB-LINHA TÁTICA: JUSTIFICATIVA & CONFLUÊNCIA DE DENSIDADE */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-purple-500/25 text-[9.5px] sm:text-[10px] font-mono text-white opacity-95">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white uppercase">ANÁLISE DE CONFLUÊNCIA:</span>
            <span className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]">
              {comandoExpert.justificativa}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white font-black">
            <span>Densidade F Dominante: {densidadeF.lider.nome} ({densidadeF.lider.pts} pts)</span>
            <span>· Motor Estatístico & Balístico</span>
          </div>
        </div>
      </div>

      {/* CARDS DE PLACAR DAS COLUNAS (com indicador de período e riscos) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Coluna 1 */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaCol1.isMomentoBom
              ? "border-[#00FF00] bg-[#FF10F0]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF10F0]/30 bg-[#FF10F0]/5 hover:border-[#FF10F0]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF10F0]">
            <span className="font-bold">Coluna 1</span>
            <div className="flex items-center gap-1">
              {tendenciaCol1.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Coluna 1 validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaCol1.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaCol1.temperaturaMediaGrupo}°C (+{tendenciaCol1.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {colLider && colLider.id === 1 && (
                <span className="rounded bg-[#FF10F0]/20 px-1 py-0.5 text-[9px] font-black text-[#FF10F0]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.col1.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.col1.acertos}</span>
            <span className={placar.col1.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.col1.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.col1.erros}/2
            </span>
          </div>
        </div>

        {/* Coluna 2 */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaCol2.isMomentoBom
              ? "border-[#00FF00] bg-[#00FFFF]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#00FFFF]/30 bg-[#00FFFF]/5 hover:border-[#00FFFF]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#00FFFF]">
            <span className="font-bold">Coluna 2</span>
            <div className="flex items-center gap-1">
              {tendenciaCol2.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Coluna 2 validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaCol2.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaCol2.temperaturaMediaGrupo}°C (+{tendenciaCol2.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {colLider && colLider.id === 2 && (
                <span className="rounded bg-[#00FFFF]/20 px-1 py-0.5 text-[9px] font-black text-[#00FFFF]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.col2.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.col2.acertos}</span>
            <span className={placar.col2.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.col2.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.col2.erros}/2
            </span>
          </div>
        </div>

        {/* Coluna 3 */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaCol3.isMomentoBom
              ? "border-[#00FF00] bg-[#FF6700]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF6700]/30 bg-[#FF6700]/5 hover:border-[#FF6700]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF6700]">
            <span className="font-bold">Coluna 3</span>
            <div className="flex items-center gap-1">
              {tendenciaCol3.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Coluna 3 validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaCol3.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaCol3.temperaturaMediaGrupo}°C (+{tendenciaCol3.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {colLider && colLider.id === 3 && (
                <span className="rounded bg-[#FF6700]/20 px-1 py-0.5 text-[9px] font-black text-[#FF6700]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.col3.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.col3.acertos}</span>
            <span className={placar.col3.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.col3.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.col3.erros}/2
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Inserção de Número */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 border border-white/5">
        <div className="flex items-center gap-2">
          <input
            id="numeroRoleta"
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
