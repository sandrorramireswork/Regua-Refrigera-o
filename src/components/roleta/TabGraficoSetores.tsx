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
  RotateCcw,
  Plus,
  RefreshCw,
  Clock,
  AlertTriangle,
  Compass,
  Flame,
  Target,
  Shield,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import { toast } from "sonner";
import { avaliarTendenciaCirurgica } from "@/lib/trend-heat-maximas-engine";

// Plugin Chart.js para brilho neon dinâmico nas linhas em momento de alta
const trendGlowPluginSetores = {
  id: "trendGlowPluginSetores",
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
  trendGlowPluginSetores
);

interface TabGraficoSetoresProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

// =========================================================================
// DEFINIÇÃO OFICIAL DOS 3 SETORES DO CILINDRO EUROPEU (37 NÚMEROS TOTAIS)
// =========================================================================
// Vizinhos do Zero: 17 números (arco do 22 ao 25 passando pelo 0) - 9 fichas
const VIZINHOS_ZERO = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35];
// Terço do Cilindro (Tiers): 12 números (oposto ao zero no rotor) - 6 fichas
const TERCO_CILINDRO = [5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36];
// Órfãos: 8 números (as duas seções intermediárias) - 5 fichas
const ORFAOS = [1, 6, 9, 14, 17, 20, 31, 34];

const PERIODOS_PRESET = [15, 30, 50, 100] as const;

export function TabGraficoSetores({ spins, onAddSpin }: TabGraficoSetoresProps) {
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

  // =========================================================================
  // CÁLCULO DA PONTUAÇÃO (TOLERÂNCIA 2X) PARA OS SETORES
  // =========================================================================
  const { labels, dataSec1, dataSec2, dataSec3, placar, secLider, totalPenalidades } = useMemo(() => {
    let ptsSec1 = 0, errSec1 = 0, hitsSec1 = 0, penSec1 = 0; // Vizinhos (Rosa)
    let ptsSec2 = 0, errSec2 = 0, hitsSec2 = 0, penSec2 = 0; // Terço (Ciano)
    let ptsSec3 = 0, errSec3 = 0, hitsSec3 = 0, penSec3 = 0; // Órfãos (Laranja)

    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    const lbls: string[] = ["Início"];
    const d1: number[] = [0];
    const d2: number[] = [0];
    const d3: number[] = [0];

    numeros.forEach((num, index) => {
      // Passo 1: Verificar acertos nos arrays oficiais dos Setores
      if (VIZINHOS_ZERO.includes(num)) {
        ptsSec1 += 1;
        errSec1 = 0;
        errSec2++;
        errSec3++;
        hitsSec1++;
      } else if (TERCO_CILINDRO.includes(num)) {
        ptsSec2 += 1;
        errSec2 = 0;
        errSec1++;
        errSec3++;
        hitsSec2++;
      } else if (ORFAOS.includes(num)) {
        ptsSec3 += 1;
        errSec3 = 0;
        errSec1++;
        errSec2++;
        hitsSec3++;
      }

      // Passo 2: Aplicar a penalidade de -1 para quem acumulou 2 erros seguidos
      if (errSec1 >= 2) {
        ptsSec1 -= 1;
        errSec1 = 0;
        penSec1++;
      }
      if (errSec2 >= 2) {
        ptsSec2 -= 1;
        errSec2 = 0;
        penSec2++;
      }
      if (errSec3 >= 2) {
        ptsSec3 -= 1;
        errSec3 = 0;
        penSec3++;
      }

      lbls.push(`R${index + 1} (#${num})`);
      d1.push(ptsSec1);
      d2.push(ptsSec2);
      d3.push(ptsSec3);
    });

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

    const setores = [
      { id: 1, nome: "Vizinhos do Zero", corHex: "#FF10F0", corNome: "Rosa", pts: ptsSec1, nums: VIZINHOS_ZERO, fichas: "9 fichas (Trio 0/2/3, Corner 25-29, 5 Splits)" },
      { id: 2, nome: "Terço do Cilindro", corHex: "#00FFFF", corNome: "Ciano", pts: ptsSec2, nums: TERCO_CILINDRO, fichas: "6 fichas (6 Splits: 5/8, 10/11, 13/16, 23/24, 27/30, 33/36)" },
      { id: 3, nome: "Órfãos", corHex: "#FF6700", corNome: "Laranja", pts: ptsSec3, nums: ORFAOS, fichas: "5 fichas (Pleno no 1 + 4 Splits: 6/9, 14/17, 17/20, 31/34)" },
    ];
    setores.sort((a, b) => b.pts - a.pts);

    return {
      labels: finalLabels,
      dataSec1: finalD1,
      dataSec2: finalD2,
      dataSec3: finalD3,
      placar: {
        sec1: { pts: ptsSec1, erros: errSec1, acertos: hitsSec1, penalidades: penSec1 },
        sec2: { pts: ptsSec2, erros: errSec2, acertos: hitsSec2, penalidades: penSec2 },
        sec3: { pts: ptsSec3, erros: errSec3, acertos: hitsSec3, penalidades: penSec3 },
      },
      secLider: setores[0] ?? { id: 1, nome: "Vizinhos do Zero", corHex: "#FF10F0", corNome: "Rosa", pts: 0, nums: VIZINHOS_ZERO, fichas: "" },
      totalPenalidades: penSec1 + penSec2 + penSec3,
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
  // VALOR DE TENDÊNCIA CIRÚRGICO, MÁXIMAS E CALOR DE CADA NÚMERO (SETORES)
  // =========================================================================
  const tendenciaSec1 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "setor_vizinhos",
        nome: "Vizinhos do Zero",
        numeros: VIZINHOS_ZERO,
        pontosHistorico: dataSec1,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataSec1, todosNumeros]
  );

  const tendenciaSec2 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "setor_terco",
        nome: "Terço do Cilindro",
        numeros: TERCO_CILINDRO,
        pontosHistorico: dataSec2,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataSec2, todosNumeros]
  );

  const tendenciaSec3 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "setor_orfaos",
        nome: "Órfãos",
        numeros: ORFAOS,
        pontosHistorico: dataSec3,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataSec3, todosNumeros]
  );

  // Alertas de Toast com disparo único por sequência
  const lastAlertedRef = useRef<{ 1: boolean; 2: boolean; 3: boolean }>({
    1: false,
    2: false,
    3: false,
  });

  useEffect(() => {
    const setores = [
      { id: 1 as const, nome: "Vizinhos do Zero (17 nºs)", tendencia: tendenciaSec1 },
      { id: 2 as const, nome: "Terço do Cilindro (12 nºs)", tendencia: tendenciaSec2 },
      { id: 3 as const, nome: "Órfãos (8 nºs)", tendencia: tendenciaSec3 },
    ];

    setores.forEach(({ id, nome, tendencia }) => {
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
    tendenciaSec1.isMomentoBom,
    tendenciaSec2.isMomentoBom,
    tendenciaSec3.isMomentoBom,
    tendenciaSec1.valorTendencia,
    tendenciaSec2.valorTendencia,
    tendenciaSec3.valorTendencia,
    tendenciaSec1.alvosSniper,
    tendenciaSec2.alvosSniper,
    tendenciaSec3.alvosSniper,
  ]);

  // =========================================================================
  // MOTOR EXPERT EXCLUSIVO DOS SETORES DA ROLETA
  // =========================================================================
  const setoresAnalise = useMemo(() => {
    return [
      {
        id: 1,
        nome: "Vizinhos do Zero",
        numsTotal: 17,
        coberturaPerc: "45.9%",
        corHex: "#FF10F0",
        corNome: "Rosa",
        emAlta: tendenciaSec1.isMomentoBom,
        ganho5R: tendenciaSec1.ganhoRecente,
        valorTendencia: tendenciaSec1.valorTendencia,
        tempMedia: tendenciaSec1.temperaturaMediaGrupo,
        alvosSniper: tendenciaSec1.alvosSniper,
        pts: placar.sec1.pts,
        instrucao: "9 FICHAS: 2 NO TRIO 0/2/3, 2 NO CORNER 25/26/28/29, 1 NOS SPLITS 4/7, 12/15, 18/21, 19/22, 32/35",
        sniper: tendenciaSec1.alvosSniper.length > 0 ? tendenciaSec1.alvosSniper : [0, 2, 3, 26, 32, 15],
      },
      {
        id: 2,
        nome: "Terço do Cilindro",
        numsTotal: 12,
        coberturaPerc: "32.4%",
        corHex: "#00FFFF",
        corNome: "Ciano",
        emAlta: tendenciaSec2.isMomentoBom,
        ganho5R: tendenciaSec2.ganhoRecente,
        valorTendencia: tendenciaSec2.valorTendencia,
        tempMedia: tendenciaSec2.temperaturaMediaGrupo,
        alvosSniper: tendenciaSec2.alvosSniper,
        pts: placar.sec2.pts,
        instrucao: "6 FICHAS EM 6 SPLITS: 5/8, 10/11, 13/16, 23/24, 27/30, 33/36",
        sniper: tendenciaSec2.alvosSniper.length > 0 ? tendenciaSec2.alvosSniper : [5, 8, 10, 11, 23, 24],
      },
      {
        id: 3,
        nome: "Órfãos",
        numsTotal: 8,
        coberturaPerc: "21.6%",
        corHex: "#FF6700",
        corNome: "Laranja",
        emAlta: tendenciaSec3.isMomentoBom,
        ganho5R: tendenciaSec3.ganhoRecente,
        valorTendencia: tendenciaSec3.valorTendencia,
        tempMedia: tendenciaSec3.temperaturaMediaGrupo,
        alvosSniper: tendenciaSec3.alvosSniper,
        pts: placar.sec3.pts,
        instrucao: "5 FICHAS: 1 PLENO NO 1 + 4 SPLITS 6/9, 14/17, 17/20, 31/34",
        sniper: tendenciaSec3.alvosSniper.length > 0 ? tendenciaSec3.alvosSniper : [1, 17, 20, 31],
      },
    ];
  }, [tendenciaSec1, tendenciaSec2, tendenciaSec3, placar]);

  const setoresEmAlta = useMemo(
    () => setoresAnalise.filter((s) => s.emAlta).sort((a, b) => b.valorTendencia - a.valorTendencia || b.pts - a.pts),
    [setoresAnalise]
  );
  const temMomentoBom = setoresEmAlta.length > 0;
  const setorPrincipalAlta = setoresEmAlta[0] ?? null;

  const comandoExpert = useMemo(() => {
    if (temMomentoBom && setorPrincipalAlta) {
      return {
        isMomentoBom: true as const,
        statusTexto: "🔥 MOMENTO BOM · TENDÊNCIA CIRÚRGICA DE SETOR",
        setor: setorPrincipalAlta,
        movimentoExato: `APOSTA NO ${setorPrincipalAlta.nome.toUpperCase()} (${setorPrincipalAlta.corNome.toUpperCase()}) · FORÇA ${setorPrincipalAlta.valorTendencia}% · CALOR ${setorPrincipalAlta.tempMedia}°C · ALVOS SNIPER: [ ${setorPrincipalAlta.sniper.slice(0, 4).join(", ")} ] · RACETRACK: ${setorPrincipalAlta.instrucao}`,
        justificativa: `${setorPrincipalAlta.nome} atingiu Força de Tendência de ${setorPrincipalAlta.valorTendencia}% (+${setorPrincipalAlta.ganho5R} pts recentes) e temperatura média de ${setorPrincipalAlta.tempMedia}°C. Balística aponta atração dominante de ${setorPrincipalAlta.coberturaPerc} do cilindro.`,
      };
    }

    return {
      isMomentoBom: false as const,
      statusTexto: "⏳ AGUARDANDO MOMENTO BOM (MERCADO EM TRANSIÇÃO)",
      setor: null,
      movimentoExato: `PROTEGER BANCA · AGUARDAR FORÇA DE TENDÊNCIA ≥ 70% NO ${secLider.nome.toUpperCase()} (LÍDER COM ${secLider.pts} PTS)`,
      justificativa: `Nenhum dos 3 setores atingiu os critérios cirúrgicos de Força de Tendência (mín. 70%) e calor de números no momento. Aguarde estabilização do rotor antes da próxima entrada.`,
    };
  }, [temMomentoBom, setorPrincipalAlta, secLider]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Vizinhos do Zero (17 nºs)",
        data: dataSec1,
        borderColor: "#FF10F0",
        backgroundColor: tendenciaSec1.isMomentoBom ? "rgba(255, 16, 240, 0.22)" : "rgba(255, 16, 240, 0.08)",
        borderWidth: tendenciaSec1.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaSec1.isMomentoBom && ctx.p0DataIndex >= dataSec1.length - 6) return 4;
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaSec1.isMomentoBom && ctx.dataIndex >= dataSec1.length - 6) return "#00FF00";
          return "#FF10F0";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaSec1.isMomentoBom && ctx.dataIndex >= dataSec1.length - 6) return "#FFFFFF";
          return "#FF10F0";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaSec1.isMomentoBom && ctx.dataIndex >= dataSec1.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaSec1.isMomentoBom,
        shadowColor: "#FF10F0",
        shadowBlur: tendenciaSec1.isMomentoBom ? 18 : 0,
      },
      {
        label: "Terço do Cilindro (12 nºs)",
        data: dataSec2,
        borderColor: "#00FFFF",
        backgroundColor: tendenciaSec2.isMomentoBom ? "rgba(0, 255, 255, 0.22)" : "rgba(0, 255, 255, 0.08)",
        borderWidth: tendenciaSec2.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaSec2.isMomentoBom && ctx.p0DataIndex >= dataSec2.length - 6) return 4;
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaSec2.isMomentoBom && ctx.dataIndex >= dataSec2.length - 6) return "#00FF00";
          return "#00FFFF";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaSec2.isMomentoBom && ctx.dataIndex >= dataSec2.length - 6) return "#FFFFFF";
          return "#00FFFF";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaSec2.isMomentoBom && ctx.dataIndex >= dataSec2.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaSec2.isMomentoBom,
        shadowColor: "#00FFFF",
        shadowBlur: tendenciaSec2.isMomentoBom ? 18 : 0,
      },
      {
        label: "Órfãos (8 nºs)",
        data: dataSec3,
        borderColor: "#FF6700",
        backgroundColor: tendenciaSec3.isMomentoBom ? "rgba(255, 103, 0, 0.22)" : "rgba(255, 103, 0, 0.08)",
        borderWidth: tendenciaSec3.isMomentoBom ? 4 : 2,
        segment: {
          borderWidth: (ctx: any) => {
            if (tendenciaSec3.isMomentoBom && ctx.p0DataIndex >= dataSec3.length - 6) return 4;
            return 2;
          },
        },
        pointBackgroundColor: (ctx: any) => {
          if (tendenciaSec3.isMomentoBom && ctx.dataIndex >= dataSec3.length - 6) return "#00FF00";
          return "#FF6700";
        },
        pointBorderColor: (ctx: any) => {
          if (tendenciaSec3.isMomentoBom && ctx.dataIndex >= dataSec3.length - 6) return "#FFFFFF";
          return "#FF6700";
        },
        pointRadius: (ctx: any) => {
          if (tendenciaSec3.isMomentoBom && ctx.dataIndex >= dataSec3.length - 6) return 5;
          return labels.length > 60 ? 1 : 2.5;
        },
        tension: 0.4,
        fill: true,
        isEmAlta: tendenciaSec3.isMomentoBom,
        shadowColor: "#FF6700",
        shadowBlur: tendenciaSec3.isMomentoBom ? 18 : 0,
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
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#a0a0a0", maxRotation: 45, font: { size: 10 } },
      },
      y: {
        grace: "10%",
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#a0a0a0", stepSize: 1, font: { size: 11 } },
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
            <Compass className="h-5 w-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
              Setores Europeus da Roleta <span className="text-neon-cyan">(Gráfico Separado · Tolerância 2x)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Análise Balística Oficial: Vizinhos do Zero (17 nºs), Terço do Cilindro (12 nºs) e Órfãos (8 nºs)
            </p>
          </div>
        </div>

        {spins && spins.length > 0 && (
          <button
            onClick={() => setModoManual(!modoManual)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 transition hover:border-neon-cyan hover:text-neon-cyan"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{modoManual ? "Modo: Manual" : "Modo: Sincronizado"}</span>
          </button>
        )}
      </div>

      {/* BARRA DE AJUSTE DE PERÍODO */}
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
          TARJA ROXO NEON COM LETRA PURO BRANCO - COMANDO EXPERT SETORES DO CILINDRO
          ========================================================================= */}
      <div
        className="w-full my-1 overflow-hidden rounded-xl border-2 border-[#B026FF] bg-gradient-to-r from-[#170329] via-[#38075c] to-[#170329] shadow-[0_0_22px_rgba(176,38,255,0.75),inset_0_0_12px_rgba(176,38,255,0.3)] select-none transition-all p-2.5 sm:p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
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
              ⚡ COMANDO EXPERT · ANÁLISE DE SETORES BALÍSTICOS (ROTOR EUROPEU)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {comandoExpert.isMomentoBom ? (
              <span className="rounded bg-[#00FF00] text-black font-black px-2 py-0.5 text-xs shadow-[0_0_12px_#00FF00] tracking-wider uppercase flex items-center gap-1 animate-pulse">
                <Flame className="h-3.5 w-3.5 fill-black text-black" />
                <span>{comandoExpert.statusTexto}</span>
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

          {comandoExpert.isMomentoBom && comandoExpert.setor && (
            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-white font-black">
              <span className="text-[#00FF00] bg-black/60 px-2 py-0.5 rounded border border-[#00FF00]/40">
                +{comandoExpert.setor.ganho5R} PTS EM 5 GIROS
              </span>
            </div>
          )}
        </div>

        {/* SUB-LINHA TÁTICA: DISTRIBUIÇÃO BALÍSTICA E REGRAS */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-purple-500/25 text-[9.5px] sm:text-[10px] font-mono text-white opacity-95">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white uppercase">ANÁLISE DO ROTOR:</span>
            <span className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]">
              {comandoExpert.justificativa}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white font-black">
            <span>Setor Líder: {secLider.nome} ({secLider.pts} pts)</span>
            <span>· Cobertura Física Rigorosa</span>
          </div>
        </div>
      </div>

      {/* CARDS DE PLACAR DOS SETORES (com indicador de período e badges neon) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Vizinhos do Zero */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaSec1.isMomentoBom
              ? "border-[#00FF00] bg-[#FF10F0]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF10F0]/30 bg-[#FF10F0]/5 hover:border-[#FF10F0]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF10F0]">
            <span className="font-bold">Vizinhos (17 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaSec1.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Vizinhos do Zero validados com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaSec1.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaSec1.temperaturaMediaGrupo}°C (+{tendenciaSec1.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {secLider && secLider.id === 1 && (
                <span className="rounded bg-[#FF10F0]/20 px-1 py-0.5 text-[9px] font-black text-[#FF10F0]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.sec1.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.sec1.acertos}</span>
            <span className={placar.sec1.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.sec1.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.sec1.erros}/2
            </span>
          </div>
        </div>

        {/* Terço do Cilindro */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaSec2.isMomentoBom
              ? "border-[#00FF00] bg-[#00FFFF]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#00FFFF]/30 bg-[#00FFFF]/5 hover:border-[#00FFFF]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#00FFFF]">
            <span className="font-bold">Terço (12 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaSec2.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Terço do Cilindro validado com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaSec2.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaSec2.temperaturaMediaGrupo}°C (+{tendenciaSec2.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {secLider && secLider.id === 2 && (
                <span className="rounded bg-[#00FFFF]/20 px-1 py-0.5 text-[9px] font-black text-[#00FFFF]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.sec2.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.sec2.acertos}</span>
            <span className={placar.sec2.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.sec2.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.sec2.erros}/2
            </span>
          </div>
        </div>

        {/* Órfãos */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaSec3.isMomentoBom
              ? "border-[#00FF00] bg-[#FF6700]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF6700]/30 bg-[#FF6700]/5 hover:border-[#FF6700]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF6700]">
            <span className="font-bold">Órfãos (8 nºs)</span>
            <div className="flex items-center gap-1">
              {tendenciaSec3.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="Órfãos validados com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaSec3.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaSec3.temperaturaMediaGrupo}°C (+{tendenciaSec3.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {secLider && secLider.id === 3 && (
                <span className="rounded bg-[#FF6700]/20 px-1 py-0.5 text-[9px] font-black text-[#FF6700]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placar.sec3.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placar.sec3.acertos}</span>
            <span className={placar.sec3.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placar.sec3.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placar.sec3.erros}/2
            </span>
          </div>
        </div>
      </div>

      {/* MINI-PAINEL BALÍSTICO DA DISPOSIÇÃO DO ROTOR */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-neon-cyan" />
          <span className="text-white font-bold">Cobertura do Setor Líder ({secLider.nome}):</span>
          <span className="text-gray-300">
            {secLider.nums.length} números ({((secLider.nums.length / 37) * 100).toFixed(1)}% da roleta) · {secLider.fichas}
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          Total de penalidades no período: <strong className="text-neon-gold">{totalPenalidades}</strong>
        </div>
      </div>

      {/* Controles de Inserção de Número */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 border border-white/5">
        <div className="flex items-center gap-2">
          <input
            id="numeroRoletaSetores"
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
