import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  AlertTriangle,
  Flame,
  Crosshair,
  Compass,
  Zap,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import type {
  SpatialZScoreAnalysis,
  BallisticCluster,
} from "@/lib/quantitative-terminal-engine";

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SpatialZScoreClustersProps {
  spatialAnalysis: SpatialZScoreAnalysis;
  onSelectNumber?: ((num: number) => void) | undefined;
}

export function SpatialZScoreClusters({
  spatialAnalysis,
  onSelectNumber,
}: SpatialZScoreClustersProps) {
  const {
    sampleSize,
    allClusters,
    topClusters,
    maxZScore,
    hasCriticalAnomaly,
    criticalAnomalies,
    activeClusterTargets,
  } = spatialAnalysis;

  // Prepara dados para o gráfico Chart.js (Top 8 clusters por Z-Score)
  const chartDataClusters = useMemo(() => {
    return allClusters.slice(0, 8);
  }, [allClusters]);

  const chartLabels = useMemo(() => {
    return chartDataClusters.map(
      (c) => `#${c.centerNumber} (${c.numbers.join("-")})`,
    );
  }, [chartDataClusters]);

  const chartZScores = useMemo(() => {
    return chartDataClusters.map((c) => Math.round(c.zScore * 100) / 100);
  }, [chartDataClusters]);

  // Cores dinâmicas para o Chart.js
  const { backgroundColors, borderColors } = useMemo(() => {
    const bg: string[] = [];
    const border: string[] = [];

    for (const c of chartDataClusters) {
      if (c.zScore >= 2.5) {
        // Anomalia Crítica: Vermelho/Magenta Neon Vibrante
        bg.push("rgba(255, 0, 60, 0.75)");
        border.push("#FF003C");
      } else if (c.zScore >= 2.0) {
        // Momentum Alto: Verde Neon
        bg.push("rgba(0, 255, 136, 0.65)");
        border.push("#00FF88");
      } else if (c.zScore >= 1.5) {
        // Moderado: Ciano
        bg.push("rgba(8, 247, 254, 0.55)");
        border.push("#08f7fe");
      } else {
        // Padrão: Grafite
        bg.push("rgba(148, 163, 184, 0.35)");
        border.push("#64748b");
      }
    }

    return { backgroundColors: bg, borderColors: border };
  }, [chartDataClusters]);

  const chartData = useMemo(() => {
    return {
      labels: chartLabels,
      datasets: [
        {
          label: "Z-Score Espacial (Desvios Padrão)",
          data: chartZScores,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [chartLabels, chartZScores, backgroundColors, borderColors]);

  const chartOptions: ChartOptions<"bar"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // Gráfico horizontal para legibilidade estilo Bloomberg
      animation: {
        duration: 400,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#0d1117",
          titleColor: "#08f7fe",
          bodyColor: "#ffffff",
          borderColor: "rgba(255,255,255,0.15)",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              const cluster = chartDataClusters[idx];
              return cluster ? `${cluster.name} · Setor ${cluster.sector}` : "";
            },
            label: (item) => {
              const idx = item.dataIndex;
              const cluster = chartDataClusters[idx];
              if (!cluster) return "";
              return [
                `Z-Score: +${cluster.zScore.toFixed(2)} SD`,
                `Frequência: ${cluster.hits}x em ${cluster.sampleSize} giros (${(cluster.empiricalProb * 100).toFixed(1)}%)`,
                `Esperado: ${(cluster.expectedHits).toFixed(1)}x (${(cluster.theoreticalProb * 100).toFixed(1)}%)`,
                cluster.zScore >= 2.5 ? "ANOMALIA CRÍTICA (+2.5 SD)" : "",
              ].filter(Boolean);
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.06)",
          },
          ticks: {
            color: "#8892b0",
            font: { family: "JetBrains Mono", size: 10 },
          },
          suggestedMin: 0,
          suggestedMax: Math.max(3.0, maxZScore + 0.5),
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#e2e8f0",
            font: { family: "JetBrains Mono", size: 10, weight: "bold" },
          },
        },
      },
    };
  }, [chartDataClusters, maxZScore]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0e14] p-4 font-mono shadow-xl relative overflow-hidden">
      {/* =========================================================================
          ALERTA DE ANOMALIA CRÍTICA (> +2.5 DESVIOS PADRÃO)
          ========================================================================= */}
      {hasCriticalAnomaly && (
        <div className="mb-4 rounded-2xl border-2 border-[#FF003C] bg-gradient-to-r from-[#200008] via-[#100004] to-[#200008] p-3.5 shadow-[0_0_25px_rgba(255,0,60,0.5)] animate-pulse">
          <div className="flex items-center justify-between border-b border-[#FF003C]/40 pb-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF003C] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#FF003C] animate-bounce" />
              ANOMALIA BALÍSTICA CRÍTICA DETECTADA: Z-SCORE &gt; +2.5 SD
            </span>
            <span className="text-[9px] bg-[#FF003C] text-white px-2 py-0.5 rounded font-black">
              DESVIO FÍSICO SEVERO
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-2 leading-relaxed">
            Um arco físico específico do cilindro está retendo a bola em níveis de
            probabilidade extrema (<strong className="text-white">P &lt; 0.0062</strong>).
            Possível assinatura do dealer, declive na pista da bola ou anomalia mecânica no rotor!
          </p>

          <div className="flex flex-wrap gap-2">
            {criticalAnomalies.map((c) => (
              <div
                key={`anom-${c.id}`}
                className="flex items-center gap-2 rounded-xl border border-[#FF003C] bg-black/60 px-3 py-1.5 shadow-[0_0_12px_rgba(255,0,60,0.3)]"
              >
                <Flame className="h-4 w-4 text-[#FF003C]" />
                <div>
                  <span className="text-xs font-extrabold text-white">
                    {c.name} ({c.sector}):
                  </span>{" "}
                  <span className="text-xs font-black text-[#FF003C]">
                    Z = +{c.zScore.toFixed(2)} SD ({c.hits}x / {c.sampleSize})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER DO PAINEL BALÍSTICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-[#08f7fe]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                Z-SCORE ESPACIAL EM CLUSTERS BALÍSTICOS
              </span>
              <span className="text-[9px] font-bold text-[#00FF88] bg-[#00FF88]/15 border border-[#00FF88]/30 px-2 py-0.5 rounded">
                ARCOS DE 5 BOLSÕES FÍSICOS
              </span>
            </div>
            <p className="text-[11px] text-[#8892b0]">
              Identificação de anomalias contíguas no rotor europeu (Amostra: {sampleSize} giros).
            </p>
          </div>
        </div>

        {/* STATUS DE MOMENTUM MAX */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[9px] text-[#8892b0] uppercase block">
              Z-SCORE MÁXIMO
            </span>
            <span
              className={`text-lg sm:text-xl font-black ${
                maxZScore >= 2.5
                  ? "text-[#FF003C] drop-shadow-[0_0_8px_#FF003C]"
                  : maxZScore >= 2.0
                  ? "text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]"
                  : "text-[#08f7fe]"
              }`}
            >
              +{maxZScore.toFixed(2)} SD
            </span>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: GRÁFICO CHART.JS + CARDS DOS TOP CLUSTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* GRÁFICO CHART.JS HORIZONTAL (LG: 7 COLUNAS) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase text-[#8892b0] flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-[#08f7fe]" />
              TOP 8 CLUSTERS DO CILINDRO vs DESVIOS PADRÃO
            </span>
            <span className="text-[9px] text-[#8892b0]">
              Limiares: +2.0 SD (Momentum) · +2.5 SD (Anomalia)
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full rounded-xl bg-black/40 border border-white/5 p-2">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* CARDS DOS TOP CLUSTERS EM DESTAQUE (LG: 5 COLUNAS) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <span className="text-[10px] font-black uppercase text-[#8892b0] flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#00FF88]" />
            CONVERGÊNCIA DOS CLUSTERS QUENTES
          </span>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-72 pr-1 scrollbar-thin">
            {topClusters.map((cluster) => {
              const isAnomaly = cluster.zScore >= 2.5;
              const isMomentum = cluster.zScore >= 2.0;

              return (
                <div
                  key={cluster.id}
                  className={`rounded-xl border p-2.5 transition-all ${
                    isAnomaly
                      ? "border-[#FF003C] bg-[#FF003C]/10 shadow-[0_0_12px_rgba(255,0,60,0.25)]"
                      : isMomentum
                      ? "border-[#00FF88] bg-[#00FF88]/10 shadow-[0_0_12px_rgba(0,255,136,0.2)]"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">
                        {cluster.name}
                      </span>
                      <span className="text-[9px] font-bold text-[#8892b0] bg-white/5 px-1.5 py-0.2 rounded">
                        {cluster.sector}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-black ${
                        isAnomaly
                          ? "text-[#FF003C]"
                          : isMomentum
                          ? "text-[#00FF88]"
                          : "text-[#08f7fe]"
                      }`}
                    >
                      +{cluster.zScore.toFixed(2)} SD
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8892b0] mb-1.5">
                    <span>
                      {cluster.hits} aparições ({(cluster.empiricalProb * 100).toFixed(1)}%)
                    </span>
                    <span>Esperado: {cluster.expectedHits.toFixed(1)}x</span>
                  </div>

                  {/* NÚMEROS DO CLUSTER */}
                  <div className="flex items-center gap-1">
                    {cluster.numbers.map((num) => (
                      <button
                        key={`cl-num-${cluster.id}-${num}`}
                        type="button"
                        onClick={() => onSelectNumber?.(num)}
                        className={`h-6 w-6 rounded border text-[11px] font-black flex items-center justify-center cursor-pointer transition ${
                          num === cluster.centerNumber
                            ? "border-[#08f7fe] bg-[#08f7fe]/25 text-white ring-1 ring-[#08f7fe]"
                            : "border-white/20 bg-black/60 text-slate-200 hover:border-[#00FF88]"
                        }`}
                        title={`Bolsão ${num} (Centro: ${cluster.centerNumber})`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
