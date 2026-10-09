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
  Layers,
  Flame,
  GitCompare,
  Target,
} from "lucide-react";
import type { Spin } from "@/lib/roulette";
import { toast } from "sonner";
import { avaliarTendenciaCirurgica } from "@/lib/trend-heat-maximas-engine";

// Plugin Chart.js para brilho neon dinâmico nas linhas em momento de alta
const trendGlowPlugin = {
  id: "trendGlowPluginDuzias",
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

interface TabGraficoDuziasProps {
  spins?: Spin[];
  onAddSpin?: (num: number) => void;
}

const PERIODOS_PRESET = [15, 30, 50, 100] as const;

// Matriz Matemática Exata da Roleta Europeia: Cruzamento Dúzia x Coluna (4 números cada)
const MATRIZ_DUZIA_COLUNA: Record<number, Record<number, number[]>> = {
  1: {
    1: [1, 4, 7, 10],
    2: [2, 5, 8, 11],
    3: [3, 6, 9, 12],
  },
  2: {
    1: [13, 16, 19, 22],
    2: [14, 17, 20, 23],
    3: [15, 18, 21, 24],
  },
  3: {
    1: [25, 28, 31, 34],
    2: [26, 29, 32, 35],
    3: [27, 30, 33, 36],
  },
};

export function TabGraficoDuzias({ spins, onAddSpin }: TabGraficoDuziasProps) {
  // Lista manual de rodadas adicionadas diretamente neste gráfico
  const [numerosManuais, setNumerosManuais] = useState<number[]>([]);
  const [modoManual, setModoManual] = useState(false);
  const [inputNumero, setInputNumero] = useState("");

  // Ajuste de Período
  const [periodo, setPeriodo] = useState<number | "all">(50);
  const [modoCalculo, setModoCalculo] = useState<"janela" | "zoom">("janela");

  // Modo de exibição das linhas no gráfico (Apenas Dúzias vs Dúzias + Colunas)
  const [exibirColunasNoGrafico, setExibirColunasNoGrafico] = useState(false);

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
  // CÁLCULO DA PONTUAÇÃO (TOLERÂNCIA 2X) PARA DÚZIAS E COLUNAS
  // =========================================================================
  const {
    labels,
    dataDuz1,
    dataDuz2,
    dataDuz3,
    dataCol1,
    dataCol2,
    dataCol3,
    placarDuz,
    placarCol,
    duzLider,
    colLider,
    totalPenalidades,
  } = useMemo(() => {
    let ptsD1 = 0, errD1 = 0, hitsD1 = 0, penD1 = 0;
    let ptsD2 = 0, errD2 = 0, hitsD2 = 0, penD2 = 0;
    let ptsD3 = 0, errD3 = 0, hitsD3 = 0, penD3 = 0;

    let ptsC1 = 0, errC1 = 0, hitsC1 = 0, penC1 = 0;
    let ptsC2 = 0, errC2 = 0, hitsC2 = 0, penC2 = 0;
    let ptsC3 = 0, errC3 = 0, hitsC3 = 0, penC3 = 0;

    const numeros =
      modoCalculo === "janela" && periodo !== "all" && totalDisponivel > periodo
        ? todosNumeros.slice(-periodo)
        : todosNumeros;

    const lbls: string[] = ["Início"];
    const d1: number[] = [0];
    const d2: number[] = [0];
    const d3: number[] = [0];

    const c1: number[] = [0];
    const c2: number[] = [0];
    const c3: number[] = [0];

    numeros.forEach((num, index) => {
      // 1. DÚZIAS
      if (num === 0) {
        errD1++; errD2++; errD3++;
      } else if (num >= 1 && num <= 12) {
        ptsD1 += 1; errD1 = 0; errD2++; errD3++; hitsD1++;
      } else if (num >= 13 && num <= 24) {
        ptsD2 += 1; errD2 = 0; errD1++; errD3++; hitsD2++;
      } else if (num >= 25 && num <= 36) {
        ptsD3 += 1; errD3 = 0; errD1++; errD2++; hitsD3++;
      }

      if (errD1 >= 2) { ptsD1 -= 1; errD1 = 0; penD1++; }
      if (errD2 >= 2) { ptsD2 -= 1; errD2 = 0; penD2++; }
      if (errD3 >= 2) { ptsD3 -= 1; errD3 = 0; penD3++; }

      // 2. COLUNAS
      if (num === 0) {
        errC1++; errC2++; errC3++;
      } else if (num % 3 === 1) {
        ptsC1 += 1; errC1 = 0; errC2++; errC3++; hitsC1++;
      } else if (num % 3 === 2) {
        ptsC2 += 1; errC2 = 0; errC1++; errC3++; hitsC2++;
      } else if (num % 3 === 0) {
        ptsC3 += 1; errC3 = 0; errC1++; errC2++; hitsC3++;
      }

      if (errC1 >= 2) { ptsC1 -= 1; errC1 = 0; penC1++; }
      if (errC2 >= 2) { ptsC2 -= 1; errC2 = 0; penC2++; }
      if (errC3 >= 2) { ptsC3 -= 1; errC3 = 0; penC3++; }

      lbls.push(`R${index + 1} (#${num})`);
      d1.push(ptsD1);
      d2.push(ptsD2);
      d3.push(ptsD3);

      c1.push(ptsC1);
      c2.push(ptsC2);
      c3.push(ptsC3);
    });

    let finalLabels = lbls;
    let finalD1 = d1, finalD2 = d2, finalD3 = d3;
    let finalC1 = c1, finalC2 = c2, finalC3 = c3;

    if (modoCalculo === "zoom" && periodo !== "all" && totalDisponivel > periodo) {
      finalLabels = ["Início (Zoom)", ...lbls.slice(-periodo)];
      finalD1 = [d1[d1.length - periodo - 1] ?? 0, ...d1.slice(-periodo)];
      finalD2 = [d2[d2.length - periodo - 1] ?? 0, ...d2.slice(-periodo)];
      finalD3 = [d3[d3.length - periodo - 1] ?? 0, ...d3.slice(-periodo)];

      finalC1 = [c1[c1.length - periodo - 1] ?? 0, ...c1.slice(-periodo)];
      finalC2 = [c2[c2.length - periodo - 1] ?? 0, ...c2.slice(-periodo)];
      finalC3 = [c3[c3.length - periodo - 1] ?? 0, ...c3.slice(-periodo)];
    }

    const duzias = [
      { id: 1, nome: "1ª Dúzia", corHex: "#FF10F0", corNome: "Rosa", pts: ptsD1 },
      { id: 2, nome: "2ª Dúzia", corHex: "#00FFFF", corNome: "Ciano", pts: ptsD2 },
      { id: 3, nome: "3ª Dúzia", corHex: "#FF6700", corNome: "Laranja", pts: ptsD3 },
    ].sort((a, b) => b.pts - a.pts);

    const colunas = [
      { id: 1, nome: "Coluna 1", corHex: "#FF10F0", corNome: "Rosa", pts: ptsC1 },
      { id: 2, nome: "Coluna 2", corHex: "#00FFFF", corNome: "Ciano", pts: ptsC2 },
      { id: 3, nome: "Coluna 3", corHex: "#FF6700", corNome: "Laranja", pts: ptsC3 },
    ].sort((a, b) => b.pts - a.pts);

    return {
      labels: finalLabels,
      dataDuz1: finalD1,
      dataDuz2: finalD2,
      dataDuz3: finalD3,
      dataCol1: finalC1,
      dataCol2: finalC2,
      dataCol3: finalC3,
      placarDuz: {
        duz1: { pts: ptsD1, erros: errD1, acertos: hitsD1, penalidades: penD1 },
        duz2: { pts: ptsD2, erros: errD2, acertos: hitsD2, penalidades: penD2 },
        duz3: { pts: ptsD3, erros: errD3, acertos: hitsD3, penalidades: penD3 },
      },
      placarCol: {
        col1: { pts: ptsC1, erros: errC1, acertos: hitsC1, penalidades: penC1 },
        col2: { pts: ptsC2, erros: errC2, acertos: hitsC2, penalidades: penC2 },
        col3: { pts: ptsC3, erros: errC3, acertos: hitsC3, penalidades: penC3 },
      },
      duzLider: duzias[0] ?? { id: 1, nome: "1ª Dúzia", corHex: "#FF10F0", corNome: "Rosa", pts: 0 },
      colLider: colunas[0] ?? { id: 1, nome: "Coluna 1", corHex: "#FF10F0", corNome: "Rosa", pts: 0 },
      totalPenalidades: penD1 + penD2 + penD3,
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
  // VALOR DE TENDÊNCIA CIRÚRGICO, MÁXIMAS E CALOR DE CADA NÚMERO
  // =========================================================================
  const tendenciaDuz1 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "duz_1",
        nome: "1ª Dúzia",
        numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        pontosHistorico: dataDuz1,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataDuz1, todosNumeros]
  );
  const tendenciaDuz2 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "duz_2",
        nome: "2ª Dúzia",
        numeros: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
        pontosHistorico: dataDuz2,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataDuz2, todosNumeros]
  );
  const tendenciaDuz3 = useMemo(
    () =>
      avaliarTendenciaCirurgica({
        id: "duz_3",
        nome: "3ª Dúzia",
        numeros: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
        pontosHistorico: dataDuz3,
        todosNumerosCronologicos: todosNumeros,
      }),
    [dataDuz3, todosNumeros]
  );

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

  // Alertas de Toast com disparo único
  const lastAlertedRef = useRef<{ 1: boolean; 2: boolean; 3: boolean }>({
    1: false,
    2: false,
    3: false,
  });

  useEffect(() => {
    const duzias = [
      { id: 1 as const, nome: "1ª Dúzia (1-12)", tendencia: tendenciaDuz1 },
      { id: 2 as const, nome: "2ª Dúzia (13-24)", tendencia: tendenciaDuz2 },
      { id: 3 as const, nome: "3ª Dúzia (25-36)", tendencia: tendenciaDuz3 },
    ];

    duzias.forEach(({ id, nome, tendencia }) => {
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
    tendenciaDuz1.isMomentoBom,
    tendenciaDuz2.isMomentoBom,
    tendenciaDuz3.isMomentoBom,
    tendenciaDuz1.valorTendencia,
    tendenciaDuz2.valorTendencia,
    tendenciaDuz3.valorTendencia,
    tendenciaDuz1.alvosSniper,
    tendenciaDuz2.alvosSniper,
    tendenciaDuz3.alvosSniper,
  ]);

  // =========================================================================
  // MOTOR DE COMPARAÇÃO CRITERIOSO: DÚZIA x COLUNA (SEM INVENÇÕES)
  // =========================================================================
  const duziasAnalise = useMemo(() => {
    return [
      {
        id: 1,
        nome: "1ª Dúzia",
        range: "1–12",
        corHex: "#FF10F0",
        corNome: "Rosa",
        emAlta: tendenciaDuz1.isMomentoBom,
        ganho5R: tendenciaDuz1.ganhoRecente,
        valorTendencia: tendenciaDuz1.valorTendencia,
        tempMedia: tendenciaDuz1.temperaturaMediaGrupo,
        alvosSniper: tendenciaDuz1.alvosSniper,
        pts: placarDuz.duz1.pts,
      },
      {
        id: 2,
        nome: "2ª Dúzia",
        range: "13–24",
        corHex: "#00FFFF",
        corNome: "Ciano",
        emAlta: tendenciaDuz2.isMomentoBom,
        ganho5R: tendenciaDuz2.ganhoRecente,
        valorTendencia: tendenciaDuz2.valorTendencia,
        tempMedia: tendenciaDuz2.temperaturaMediaGrupo,
        alvosSniper: tendenciaDuz2.alvosSniper,
        pts: placarDuz.duz2.pts,
      },
      {
        id: 3,
        nome: "3ª Dúzia",
        range: "25–36",
        corHex: "#FF6700",
        corNome: "Laranja",
        emAlta: tendenciaDuz3.isMomentoBom,
        ganho5R: tendenciaDuz3.ganhoRecente,
        valorTendencia: tendenciaDuz3.valorTendencia,
        tempMedia: tendenciaDuz3.temperaturaMediaGrupo,
        alvosSniper: tendenciaDuz3.alvosSniper,
        pts: placarDuz.duz3.pts,
      },
    ];
  }, [tendenciaDuz1, tendenciaDuz2, tendenciaDuz3, placarDuz]);

  const colunasAnalise = useMemo(() => {
    return [
      { id: 1, nome: "Coluna 1", corHex: "#FF10F0", corNome: "Rosa", emAlta: tendenciaCol1.isMomentoBom, ganho5R: tendenciaCol1.ganhoRecente, valorTendencia: tendenciaCol1.valorTendencia, pts: placarCol.col1.pts },
      { id: 2, nome: "Coluna 2", corHex: "#00FFFF", corNome: "Ciano", emAlta: tendenciaCol2.isMomentoBom, ganho5R: tendenciaCol2.ganhoRecente, valorTendencia: tendenciaCol2.valorTendencia, pts: placarCol.col2.pts },
      { id: 3, nome: "Coluna 3", corHex: "#FF6700", corNome: "Laranja", emAlta: tendenciaCol3.isMomentoBom, ganho5R: tendenciaCol3.ganhoRecente, valorTendencia: tendenciaCol3.valorTendencia, pts: placarCol.col3.pts },
    ];
  }, [tendenciaCol1, tendenciaCol2, tendenciaCol3, placarCol]);

  const duziasEmAlta = useMemo(
    () => duziasAnalise.filter((d) => d.emAlta).sort((a, b) => b.valorTendencia - a.valorTendencia || b.pts - a.pts),
    [duziasAnalise]
  );
  const colunasEmAlta = useMemo(
    () => colunasAnalise.filter((c) => c.emAlta).sort((a, b) => b.valorTendencia - a.valorTendencia || b.pts - a.pts),
    [colunasAnalise]
  );

  const temMomentoBom = duziasEmAlta.length > 0;
  const duziaPrincipalAlta = duziasEmAlta[0] ?? null;
  const colunaPadrao = { id: 1, nome: "Coluna 1", corHex: "#FF10F0", corNome: "Rosa", emAlta: false, ganho5R: 0, pts: placarCol.col1.pts };
  const colunaMelhor = colunasEmAlta[0] ?? colunasAnalise.sort((a, b) => b.pts - a.pts)[0] ?? colunaPadrao;

  // Cálculo da Comparação Global de Consistência
  const totalPtsDuzias = placarDuz.duz1.pts + placarDuz.duz2.pts + placarDuz.duz3.pts;
  const totalPtsColunas = placarCol.col1.pts + placarCol.col2.pts + placarCol.col3.pts;
  const mercadoMaisConsistente = totalPtsDuzias >= totalPtsColunas ? "Dúzias" : "Colunas";

  const comandoExpert = useMemo(() => {
    const dAlvo = duziaPrincipalAlta ?? duzLider;
    const cAlvo = colunaMelhor;
    const sniperNums = MATRIZ_DUZIA_COLUNA[dAlvo.id]?.[cAlvo.id] || [];

    if (temMomentoBom && duziaPrincipalAlta) {
      const superConfluencia = duziaPrincipalAlta.emAlta && cAlvo.emAlta;
      const alvosFinais = duziaPrincipalAlta.alvosSniper.length > 0 ? duziaPrincipalAlta.alvosSniper : sniperNums;
      return {
        isMomentoBom: true as const,
        statusTexto: superConfluencia
          ? "⚡ SUPER CONFLUÊNCIA DÚZIA x COLUNA ATIVA"
          : "🔥 MOMENTO BOM · TENDÊNCIA CIRÚRGICA CONFIRMADA",
        duzia: duziaPrincipalAlta,
        coluna: cAlvo,
        sniperNums: alvosFinais,
        movimentoExato: `APOSTA NA ${duziaPrincipalAlta.nome.toUpperCase()} (${duziaPrincipalAlta.corNome.toUpperCase()}) · FORÇA ${duziaPrincipalAlta.valorTendencia}% · CALOR ${duziaPrincipalAlta.tempMedia}°C · ALVOS SNIPER: [ ${alvosFinais.slice(0, 4).join(", ")} ] · CONFLUÊNCIA COM ${cAlvo.nome.toUpperCase()}`,
        justificativa: `${duziaPrincipalAlta.nome} atingiu Força de Tendência de ${duziaPrincipalAlta.valorTendencia}% (+${duziaPrincipalAlta.ganho5R} pts recentes) e temperatura média de ${duziaPrincipalAlta.tempMedia}°C. Cruzamento matemático com ${cAlvo.nome} consolida alvos de máxima probabilidade.`,
      };
    }

    const idDuz = duzLider?.id ?? 1;
    const idCol = colLider?.id ?? 1;
    const sniperFallback = MATRIZ_DUZIA_COLUNA[idDuz]?.[idCol] || [1, 4, 7, 10];

    return {
      isMomentoBom: false as const,
      statusTexto: "⏳ AGUARDANDO MOMENTO BOM (MERCADO EM TRANSIÇÃO)",
      duzia: null,
      coluna: cAlvo,
      sniperNums: sniperFallback,
      movimentoExato: `PROTEGER BANCA · AGUARDAR FORÇA DE TENDÊNCIA ≥ 70% NA ${duzLider.nome.toUpperCase()} (LÍDER COM ${duzLider.pts} PTS) OU NA ${colLider.nome.toUpperCase()} (${colLider.pts} PTS)`,
      justificativa: `Nenhuma das 3 dúzias atingiu os critérios cirúrgicos de Força de Tendência (mín. 70%) e calor térmico ativo. Consistência atual favorece ${mercadoMaisConsistente}.`,
    };
  }, [temMomentoBom, duziaPrincipalAlta, duzLider, colunaMelhor, colLider, mercadoMaisConsistente]);

  // Configuração dos Datasets no Chart.js
  const datasets = [
    {
      label: "1ª Dúzia (1-12)",
      data: dataDuz1,
      borderColor: "#FF10F0",
      backgroundColor: tendenciaDuz1.isMomentoBom ? "rgba(255, 16, 240, 0.22)" : "rgba(255, 16, 240, 0.08)",
      borderWidth: tendenciaDuz1.isMomentoBom ? 4 : 2,
      segment: {
        borderWidth: (ctx: any) => {
          if (tendenciaDuz1.isMomentoBom && ctx.p0DataIndex >= dataDuz1.length - 6) return 4;
          return 2;
        },
      },
      pointBackgroundColor: (ctx: any) => {
        if (tendenciaDuz1.isMomentoBom && ctx.dataIndex >= dataDuz1.length - 6) return "#00FF00";
        return "#FF10F0";
      },
      pointBorderColor: (ctx: any) => {
        if (tendenciaDuz1.isMomentoBom && ctx.dataIndex >= dataDuz1.length - 6) return "#FFFFFF";
        return "#FF10F0";
      },
      pointRadius: (ctx: any) => {
        if (tendenciaDuz1.isMomentoBom && ctx.dataIndex >= dataDuz1.length - 6) return 5;
        return labels.length > 60 ? 1 : 2.5;
      },
      tension: 0.4,
      fill: true,
      isEmAlta: tendenciaDuz1.isMomentoBom,
      shadowColor: "#FF10F0",
      shadowBlur: tendenciaDuz1.isMomentoBom ? 18 : 0,
    },
    {
      label: "2ª Dúzia (13-24)",
      data: dataDuz2,
      borderColor: "#00FFFF",
      backgroundColor: tendenciaDuz2.isMomentoBom ? "rgba(0, 255, 255, 0.22)" : "rgba(0, 255, 255, 0.08)",
      borderWidth: tendenciaDuz2.isMomentoBom ? 4 : 2,
      segment: {
        borderWidth: (ctx: any) => {
          if (tendenciaDuz2.isMomentoBom && ctx.p0DataIndex >= dataDuz2.length - 6) return 4;
          return 2;
        },
      },
      pointBackgroundColor: (ctx: any) => {
        if (tendenciaDuz2.isMomentoBom && ctx.dataIndex >= dataDuz2.length - 6) return "#00FF00";
        return "#00FFFF";
      },
      pointBorderColor: (ctx: any) => {
        if (tendenciaDuz2.isMomentoBom && ctx.dataIndex >= dataDuz2.length - 6) return "#FFFFFF";
        return "#00FFFF";
      },
      pointRadius: (ctx: any) => {
        if (tendenciaDuz2.isMomentoBom && ctx.dataIndex >= dataDuz2.length - 6) return 5;
        return labels.length > 60 ? 1 : 2.5;
      },
      tension: 0.4,
      fill: true,
      isEmAlta: tendenciaDuz2.isMomentoBom,
      shadowColor: "#00FFFF",
      shadowBlur: tendenciaDuz2.isMomentoBom ? 18 : 0,
    },
    {
      label: "3ª Dúzia (25-36)",
      data: dataDuz3,
      borderColor: "#FF6700",
      backgroundColor: tendenciaDuz3.isMomentoBom ? "rgba(255, 103, 0, 0.22)" : "rgba(255, 103, 0, 0.08)",
      borderWidth: tendenciaDuz3.isMomentoBom ? 4 : 2,
      segment: {
        borderWidth: (ctx: any) => {
          if (tendenciaDuz3.isMomentoBom && ctx.p0DataIndex >= dataDuz3.length - 6) return 4;
          return 2;
        },
      },
      pointBackgroundColor: (ctx: any) => {
        if (tendenciaDuz3.isMomentoBom && ctx.dataIndex >= dataDuz3.length - 6) return "#00FF00";
        return "#FF6700";
      },
      pointBorderColor: (ctx: any) => {
        if (tendenciaDuz3.isMomentoBom && ctx.dataIndex >= dataDuz3.length - 6) return "#FFFFFF";
        return "#FF6700";
      },
      pointRadius: (ctx: any) => {
        if (tendenciaDuz3.isMomentoBom && ctx.dataIndex >= dataDuz3.length - 6) return 5;
        return labels.length > 60 ? 1 : 2.5;
      },
      tension: 0.4,
      fill: true,
      isEmAlta: tendenciaDuz3.isMomentoBom,
      shadowColor: "#FF6700",
      shadowBlur: tendenciaDuz3.isMomentoBom ? 18 : 0,
    },
  ];

  // Se ativado pelo usuário, adiciona as linhas das Colunas para visualização comparativa direta
  if (exibirColunasNoGrafico) {
    datasets.push(
      {
        label: "Coluna 1 (Linha tracejada)",
        data: dataCol1,
        borderColor: "#E040FB",
        backgroundColor: "transparent",
        borderWidth: 2,
        segment: {
          borderWidth: (ctx: any) => (tendenciaCol1.isMomentoBom && ctx.p0DataIndex >= dataCol1.length - 6 ? 3 : 1.5),
        },
        pointBackgroundColor: "#E040FB",
        pointBorderColor: "#FFFFFF",
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        isEmAlta: false,
        shadowColor: "#E040FB",
        shadowBlur: 0,
      } as any,
      {
        label: "Coluna 2 (Linha tracejada)",
        data: dataCol2,
        borderColor: "#00E5FF",
        backgroundColor: "transparent",
        borderWidth: 2,
        segment: {
          borderWidth: (ctx: any) => (tendenciaCol2.isMomentoBom && ctx.p0DataIndex >= dataCol2.length - 6 ? 3 : 1.5),
        },
        pointBackgroundColor: "#00E5FF",
        pointBorderColor: "#FFFFFF",
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        isEmAlta: false,
        shadowColor: "#00E5FF",
        shadowBlur: 0,
      } as any,
      {
        label: "Coluna 3 (Linha tracejada)",
        data: dataCol3,
        borderColor: "#FF9100",
        backgroundColor: "transparent",
        borderWidth: 2,
        segment: {
          borderWidth: (ctx: any) => (tendenciaCol3.isMomentoBom && ctx.p0DataIndex >= dataCol3.length - 6 ? 3 : 1.5),
        },
        pointBackgroundColor: "#FF9100",
        pointBorderColor: "#FFFFFF",
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        isEmAlta: false,
        shadowColor: "#FF9100",
        shadowBlur: 0,
      } as any
    );
  }

  const chartData = {
    labels,
    datasets,
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-magenta/10 ring-1 ring-neon-magenta/40">
            <Layers className="h-5 w-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-white uppercase sm:text-base flex items-center gap-2">
              Frequência de Dúzias & Comparação com Colunas <span className="text-neon-magenta">(Tolerância 2x)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Penalidade de -1 a cada 2 ausências consecutivas · Matriz de cruzamento 3x3 de 4 números
            </p>
          </div>
        </div>

        {/* Alternador de Modo e Comparador de Gráficos */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExibirColunasNoGrafico(!exibirColunasNoGrafico)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
              exibirColunasNoGrafico
                ? "bg-purple-600/30 border-purple-400 text-white shadow-[0_0_8px_#B026FF]"
                : "border-white/10 bg-white/5 text-gray-300 hover:text-white"
            }`}
            title="Alterna exibição simultânea das Colunas no mesmo gráfico para comparação direta"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>{exibirColunasNoGrafico ? "Comparativo Dúzia+Coluna: ON" : "Comparar Linhas de Coluna"}</span>
          </button>

          {spins && spins.length > 0 && (
            <button
              onClick={() => setModoManual(!modoManual)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 transition hover:border-neon-magenta hover:text-neon-magenta"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{modoManual ? "Modo: Manual" : "Modo: Sincronizado"}</span>
            </button>
          )}
        </div>
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
                    ? "bg-neon-magenta/20 text-neon-magenta ring-1 ring-neon-magenta shadow-[0_0_8px_rgba(255,16,240,0.4)]"
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
                ? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
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
          TARJA ROXO NEON COM LETRA PURO BRANCO - COMANDO EXPERT DÚZIA x COLUNA
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
              ⚡ COMANDO EXPERT · FREQUÊNCIA DE DÚZIAS & COMPARAÇÃO COM COLUNAS
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

          {comandoExpert.isMomentoBom && comandoExpert.duzia && (
            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-white font-black">
              <span className="text-[#00FF00] bg-black/60 px-2 py-0.5 rounded border border-[#00FF00]/40">
                +{comandoExpert.duzia.ganho5R} PTS EM 5 GIROS
              </span>
            </div>
          )}
        </div>

        {/* SUB-LINHA TÁTICA: COMPARAÇÃO DE CONSISTÊNCIA & MATRIZ 3x3 */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-purple-500/25 text-[9.5px] sm:text-[10px] font-mono text-white opacity-95">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white uppercase">ANÁLISE COMPARATIVA:</span>
            <span className="text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]">
              {comandoExpert.justificativa}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white font-black">
            <span>Dúzias: {totalPtsDuzias} pts vs Colunas: {totalPtsColunas} pts</span>
            <span>· Mais Consistente: {mercadoMaisConsistente}</span>
          </div>
        </div>
      </div>

      {/* CARDS DE PLACAR DAS DÚZIAS (com badges de Momento Bom e Cruzamento com Colunas) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* 1ª Dúzia */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaDuz1.isMomentoBom
              ? "border-[#00FF00] bg-[#FF10F0]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF10F0]/30 bg-[#FF10F0]/5 hover:border-[#FF10F0]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF10F0]">
            <span className="font-bold">1ª Dúzia (1–12)</span>
            <div className="flex items-center gap-1">
              {tendenciaDuz1.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="1ª Dúzia validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaDuz1.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaDuz1.temperaturaMediaGrupo}°C (+{tendenciaDuz1.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {duzLider && duzLider.id === 1 && (
                <span className="rounded bg-[#FF10F0]/20 px-1 py-0.5 text-[9px] font-black text-[#FF10F0]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placarDuz.duz1.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placarDuz.duz1.acertos}</span>
            <span className={placarDuz.duz1.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placarDuz.duz1.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placarDuz.duz1.erros}/2
            </span>
          </div>
        </div>

        {/* 2ª Dúzia */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaDuz2.isMomentoBom
              ? "border-[#00FF00] bg-[#00FFFF]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#00FFFF]/30 bg-[#00FFFF]/5 hover:border-[#00FFFF]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#00FFFF]">
            <span className="font-bold">2ª Dúzia (13–24)</span>
            <div className="flex items-center gap-1">
              {tendenciaDuz2.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="2ª Dúzia validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaDuz2.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaDuz2.temperaturaMediaGrupo}°C (+{tendenciaDuz2.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {duzLider && duzLider.id === 2 && (
                <span className="rounded bg-[#00FFFF]/20 px-1 py-0.5 text-[9px] font-black text-[#00FFFF]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placarDuz.duz2.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placarDuz.duz2.acertos}</span>
            <span className={placarDuz.duz2.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placarDuz.duz2.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placarDuz.duz2.erros}/2
            </span>
          </div>
        </div>

        {/* 3ª Dúzia */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-2.5 text-center transition ${
            tendenciaDuz3.isMomentoBom
              ? "border-[#00FF00] bg-[#FF6700]/10 shadow-[0_0_15px_rgba(0,255,0,0.35)]"
              : "border-[#FF6700]/30 bg-[#FF6700]/5 hover:border-[#FF6700]/60"
          }`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#FF6700]">
            <span className="font-bold">3ª Dúzia (25–36)</span>
            <div className="flex items-center gap-1">
              {tendenciaDuz3.isMomentoBom && (
                <span
                  className="flex items-center gap-1 rounded border border-[#00FF00] bg-[#00FF00]/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.6)] animate-pulse"
                  title="3ª Dúzia validada com alta consistência térmica e estatística"
                >
                  <Flame className="h-3 w-3 fill-[#00FF00] text-[#00FF00]" />
                  <span>🔥 TENDÊNCIA ({tendenciaDuz3.valorTendencia}%)</span>
                  <span className="hidden xs:inline text-[7.5px] font-mono text-white bg-black/60 px-1 rounded">
                    📈 {tendenciaDuz3.temperaturaMediaGrupo}°C (+{tendenciaDuz3.ganhoRecente}pts)
                  </span>
                </span>
              )}
              {duzLider && duzLider.id === 3 && (
                <span className="rounded bg-[#FF6700]/20 px-1 py-0.5 text-[9px] font-black text-[#FF6700]">
                  LÍDER
                </span>
              )}
            </div>
          </div>
          <div className="my-1 font-display text-2xl font-black text-white">{placarDuz.duz3.pts} <span className="text-xs font-normal text-gray-400">pts</span></div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-1">
            <span>Acertos: {placarDuz.duz3.acertos}</span>
            <span className={placarDuz.duz3.erros === 1 ? "text-neon-gold font-bold flex items-center gap-0.5" : ""}>
              {placarDuz.duz3.erros === 1 && <AlertTriangle className="h-3 w-3 inline" />}
              Erros: {placarDuz.duz3.erros}/2
            </span>
          </div>
        </div>
      </div>

      {/* MINI-PAINEL DO CRUZAMENTO DÚZIA x COLUNA (4 NÚMEROS SNIPER) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-500/20 bg-purple-950/20 p-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[#00FF00]" />
          <span className="text-white font-bold">
            Confluência de Cruzamento ({duzLider.nome} ∩ {colLider.nome}):
          </span>
          <span className="rounded bg-[#00FF00]/20 border border-[#00FF00]/50 px-2 py-0.5 font-black text-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.4)]">
            [ {MATRIZ_DUZIA_COLUNA[duzLider.id]?.[colLider.id]?.join(", ") || "1, 4, 7, 10"} ]
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          Saldo do período: <strong className="text-neon-magenta">{totalPtsDuzias} pts em Dúzias</strong> vs <strong className="text-neon-cyan">{totalPtsColunas} pts em Colunas</strong>
        </div>
      </div>

      {/* Controles de Inserção de Número */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/30 p-2.5 border border-white/5">
        <div className="flex items-center gap-2">
          <input
            id="numeroRoletaDuzias"
            type="number"
            min="0"
            max="36"
            placeholder="Número (0-36)"
            value={inputNumero}
            onChange={(e) => setInputNumero(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") registrarNumeroManual();
            }}
            className="h-9 w-32 rounded-md border border-white/10 bg-[#1e1e28] px-3 text-center text-sm font-semibold text-white outline-none focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta"
          />
          <button
            onClick={registrarNumeroManual}
            className="flex h-9 items-center gap-1 rounded-md bg-neon-magenta/20 px-3 text-xs font-semibold text-neon-magenta border border-neon-magenta/40 transition hover:bg-neon-magenta/30 hover:border-neon-magenta"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Amostra ativa: <strong className="text-neon-magenta">{periodoEfetivo} giros</strong>
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
