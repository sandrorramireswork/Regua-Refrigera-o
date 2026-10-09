import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Activity,
  AlertOctagon,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PontoHistoricoVolatilidade } from "@/lib/meta-padrao-confluencia-engine";

// Registrar componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface GraficoVolatilidadeAssertividadeProps {
  timeline: PontoHistoricoVolatilidade[];
  linhaDeCorte?: number;
  volatilidadeAtual: number;
  assertividadeAtual: number;
  isMesaForaDeFoco: boolean;
  className?: string;
  altura?: number;
}

export function GraficoVolatilidadeAssertividade({
  timeline,
  linhaDeCorte = 65,
  volatilidadeAtual,
  assertividadeAtual,
  isMesaForaDeFoco,
  className = "",
  altura = 180,
}: GraficoVolatilidadeAssertividadeProps) {
  // Prepara dados do gráfico com histórico cronológico
  const chartData: ChartData<"line"> = useMemo(() => {
    // Se timeline vazia, cria pontos mínimos
    const pontos = timeline.length > 0
      ? timeline
      : [
          {
            indice: 1,
            rotuloGiro: "Inicial",
            numero: 0,
            volatilidade: volatilidadeAtual,
            assertividade: assertividadeAtual,
            linhaDeCorte,
            estado: "SINAL_CONFIRMADO" as const,
          },
        ];

    const labels = pontos.map((p) => p.rotuloGiro);
    const dataVolatilidade = pontos.map((p) => p.volatilidade);
    const dataAssertividade = pontos.map((p) => p.assertividade);
    const dataThreshold = pontos.map(() => linhaDeCorte);

    return {
      labels,
      datasets: [
        {
          label: "Volatilidade da Mesa (Risco)",
          data: dataVolatilidade,
          borderColor: isMesaForaDeFoco ? "#FF1744" : "#FF5252",
          backgroundColor: isMesaForaDeFoco
            ? "rgba(255, 23, 68, 0.25)"
            : "rgba(255, 82, 82, 0.10)",
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#FF1744",
          pointBorderColor: "#FFFFFF",
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Assertividade do Padrão Único",
          data: dataAssertividade,
          borderColor: "#00FF88",
          backgroundColor: "rgba(0, 255, 136, 0.12)",
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#00FF88",
          pointBorderColor: "#FFFFFF",
          fill: false,
          yAxisID: "y",
        },
        {
          label: `Linha de Corte Anti-Red (${linhaDeCorte}%)`,
          data: dataThreshold,
          borderColor: "#FF0055",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          yAxisID: "y",
        },
      ],
    };
  }, [timeline, linhaDeCorte, volatilidadeAtual, assertividadeAtual, isMesaForaDeFoco]);

  const chartOptions: ChartOptions<"line"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350,
        easing: "easeOutQuad",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: "#cbd5e1",
            font: {
              family: "monospace",
              size: 9,
              weight: "bold",
            },
            padding: 8,
          },
        },
        tooltip: {
          backgroundColor: "#070d17",
          titleColor: "#00FFFF",
          bodyColor: "#FFFFFF",
          borderColor: isMesaForaDeFoco ? "#FF1744" : "#00FF88",
          borderWidth: 1.5,
          padding: 8,
          boxPadding: 4,
          titleFont: {
            family: "monospace",
            size: 10,
            weight: "bold",
          },
          bodyFont: {
            family: "monospace",
            size: 9.5,
          },
          callbacks: {
            label(context) {
              const label = context.dataset.label || "";
              const val = context.parsed.y;
              return ` ${label}: ${val}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "monospace",
              size: 8,
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: (ctx) => {
              if (ctx.tick.value === linhaDeCorte) {
                return "rgba(255, 23, 68, 0.4)";
              }
              return "rgba(255, 255, 255, 0.05)";
            },
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "monospace",
              size: 8,
            },
            stepSize: 20,
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
    };
  }, [linhaDeCorte, isMesaForaDeFoco]);

  return (
    <div
      className={`rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#060e18] via-[#040810] to-black p-3 text-white shadow-[0_0_20px_rgba(0,0,0,0.8)] select-none ${className}`}
    >
      {/* Header com Status do Circuit Breaker */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            <Activity className="h-4 w-4 text-neon-cyan animate-pulse" />
          </div>
          <div>
            <h4 className="font-display text-xs font-black uppercase tracking-wider text-neon-cyan drop-shadow-[0_0_6px_#00FFFF]">
              VOLATILIDADE DA MESA VS ASSERTIVIDADE (CHART.JS)
            </h4>
            <p className="text-[9px] text-[#8892b0] font-mono">
              Filtro de Contenção Anti-Red · Linha de Corte em {linhaDeCorte}%
            </p>
          </div>
        </div>

        {/* Badge Dinâmica de Status em Tempo Real */}
        <div className="flex items-center gap-2">
          {isMesaForaDeFoco ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#FF1744] bg-red-950/80 px-2.5 py-1 text-[9px] font-mono font-bold text-[#FF1744] shadow-[0_0_12px_rgba(255,23,68,0.4)] animate-pulse">
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>MESA FORA DE FOCO ({volatilidadeAtual}% &gt; {linhaDeCorte}%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-[#00FF88]/60 bg-emerald-950/70 px-2.5 py-1 text-[9px] font-mono font-bold text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00FF88]" />
              <span>MESA EM FOCO ({volatilidadeAtual}% &lt; {linhaDeCorte}%)</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-[8.5px] font-mono">
            <span className="text-white/60">Assertividade:</span>
            <strong className="text-[#00FF88]">{assertividadeAtual}%</strong>
          </div>
        </div>
      </div>

      {/* Canvas do Gráfico Interativo Chart.js */}
      <div style={{ height: altura }} className="w-full relative">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Rodapé Diagnóstico de Riscos & Circuit Breaker */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-white/70">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[#FF5252]">
            <TrendingUp className="h-3 w-3" />
            <span>Volatilidade Atual: <strong>{volatilidadeAtual}%</strong></span>
          </span>
          <span className="text-white/30">•</span>
          <span className="flex items-center gap-1 text-[#00FF88]">
            <Zap className="h-3 w-3" />
            <span>Assertividade do Padrão: <strong>{assertividadeAtual}%</strong></span>
          </span>
        </div>

        <div className="text-[8px] text-[#8892b0]">
          {isMesaForaDeFoco ? (
            <span className="text-red-400 font-bold">
              ⚠️ Alerta: Volatilidade cruzou a Linha de Corte. Operações bloqueadas.
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">
              ✓ Variância controlada. Padrão Único apto para operações cirúrgicas.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
