import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ThermalDataPoint } from "@/lib/decision-engine";
import { Zap, Activity, TrendingUp, AlertTriangle, Flame, ShieldAlert } from "lucide-react";

// Registrar componentes do Chart.js necessários para gráfico de linha com área preenchida
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

export interface DecisionEngineSparklineProps {
  curva: ThermalDataPoint[];
  estado: 1 | 2 | 3;
  confiancaPerc: number;
  hitRate30?: number;
  height?: number;
  className?: string;
}

export function DecisionEngineSparkline({
  curva,
  estado,
  confiancaPerc,
  hitRate30 = 0,
  height = 76,
  className = "",
}: DecisionEngineSparklineProps) {
  const isEstado1 = estado === 1;
  const isEstado2 = estado === 2;

  // Cores dinâmicas em neon conforme o Estado
  const primaryColor = isEstado1 ? "#00FF66" : isEstado2 ? "#FFA000" : "#EF4444";
  const glowColor = isEstado1 ? "rgba(0, 255, 102, 0.3)" : isEstado2 ? "rgba(255, 160, 0, 0.3)" : "rgba(239, 68, 68, 0.2)";
  const gradientStart = isEstado1 ? "rgba(0, 255, 102, 0.35)" : isEstado2 ? "rgba(255, 160, 0, 0.35)" : "rgba(239, 68, 68, 0.2)";
  const gradientEnd = "rgba(0, 0, 0, 0.0)";

  const labels = useMemo(() => {
    return curva.map((pt) => pt.label);
  }, [curva]);

  const dataValues = useMemo(() => {
    return curva.map((pt) => pt.cumulativeHitRate);
  }, [curva]);

  const chartData: ChartData<"line"> = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          label: "Curva Térmica (%)",
          data: dataValues,
          borderColor: primaryColor,
          borderWidth: 2,
          pointRadius: (ctx) => {
            const index = ctx.dataIndex;
            if (index === curva.length - 1) return 4;
            const pt = curva[index];
            return pt?.isHit ? 2.5 : 0;
          },
          pointBackgroundColor: (ctx) => {
            const index = ctx.dataIndex;
            const pt = curva[index];
            return pt?.isHit ? primaryColor : "#FFFFFF";
          },
          pointBorderColor: "#000000",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: primaryColor,
          pointHoverBorderColor: "#FFFFFF",
          pointHoverBorderWidth: 2,
          tension: 0.35,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return gradientStart;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, gradientStart);
            gradient.addColorStop(1, gradientEnd);
            return gradient;
          },
        },
      ],
    };
  }, [labels, dataValues, primaryColor, gradientStart, gradientEnd, curva]);

  const options: ChartOptions<"line"> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(3, 7, 18, 0.95)",
          titleColor: "#FFFFFF",
          bodyColor: primaryColor,
          borderColor: primaryColor,
          borderWidth: 1,
          padding: 8,
          boxPadding: 4,
          cornerRadius: 8,
          titleFont: { family: "monospace", size: 10, weight: "bold" },
          bodyFont: { family: "monospace", size: 11, weight: "bold" },
          displayColors: false,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              const pt = curva[idx];
              if (!pt) return "";
              return `Rodada ${pt.roundIndex}/30 · Giro: ${pt.spinNum}`;
            },
            label: (item) => {
              const idx = item.dataIndex;
              const pt = curva[idx];
              if (!pt) return "";
              const status = pt.isHit ? "🎯 ACERTO" : "❌ ERRO";
              return `Taxa Térmica: ${item.formattedValue}% (${status})`;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          grid: { display: false },
          min: 0,
          max: 100,
        },
      },
    };
  }, [primaryColor, curva]);

  const ultimoPonto = curva[curva.length - 1];
  const primeiroPonto = curva[0];
  const delta = ultimoPonto && primeiroPonto
    ? ultimoPonto.cumulativeHitRate - primeiroPonto.cumulativeHitRate
    : 0;

  const hitRateExibido = ultimoPonto?.cumulativeHitRate ?? hitRate30;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/80 p-2.5 sm:p-3 shadow-lg ${className}`}
      data-component="unified-decision-sparkline"
    >
      {/* 1. CABEÇALHO UNIFICADO: STATUS, ÍNDICE DE CONFIANÇA & TAXA TÉRMICA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        {/* Lado Esquerdo: Identificador e Badge do Estado */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }}
            />
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-white/90">
              Índice de Confiança & Curva Térmica
            </span>
          </div>
          <span
            className="rounded px-1.5 py-0.2 font-mono text-[8.5px] font-black uppercase border"
            style={{
              borderColor: `${primaryColor}60`,
              backgroundColor: `${primaryColor}18`,
              color: primaryColor,
            }}
          >
            {isEstado1
              ? "⚡ Alta Convicção"
              : isEstado2
              ? "⚠️ Entrada Conservadora"
              : "🛡️ Modo Risco"}
          </span>
        </div>

        {/* Lado Direito: Confiança Score & Hit Rate Telemetria */}
        <div className="flex items-center gap-3 font-mono">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[8.5px] uppercase text-white/60">Confiança:</span>
              <span
                className="text-xs sm:text-sm font-black drop-shadow-[0_0_8px_currentColor]"
                style={{ color: primaryColor }}
              >
                {confiancaPerc}%
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[9px] border-l border-white/10 pl-2.5">
            <span className="text-white/60">Hit Rate Térmico:</span>
            <strong style={{ color: primaryColor }}>{hitRateExibido}%</strong>
            {curva.length > 1 && (
              <span
                className={`font-black ${
                  delta >= 0 ? "text-[#00FF66]" : "text-red-400"
                }`}
              >
                {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. GAUGE HORIZONTAL NEON INTEGRADO DO ÍNDICE DE CONFIANÇA */}
      <div className="py-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-white/15 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isEstado1
                ? "bg-gradient-to-r from-emerald-500 via-[#00FF66] to-[#00FF66] shadow-[0_0_12px_#00FF66]"
                : isEstado2
                ? "bg-gradient-to-r from-amber-600 via-[#FFA000] to-[#FFA000] shadow-[0_0_12px_#FFA000]"
                : "bg-gradient-to-r from-slate-700 via-red-500 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
            }`}
            style={{ width: `${Math.max(4, Math.min(100, confiancaPerc))}%` }}
          />
        </div>

        <div className="mt-1 flex items-center justify-between font-mono text-[7.5px] text-white/50 px-0.5">
          <span>0% Baixa</span>
          <span>50% Moderada</span>
          <span className="hidden xs:inline">75% Robusta</span>
          <span className="font-bold text-white/80">100% Máxima</span>
        </div>
      </div>

      {/* 3. GRÁFICO DA CURVA TÉRMICA (CHART.JS) OU MENSAGEM DE STANDBY */}
      {curva.length > 0 ? (
        <div style={{ height: `${height}px` }} className="w-full min-w-0 pt-1">
          <Line data={chartData} options={options} />
        </div>
      ) : (
        <div
          style={{ height: `${height}px` }}
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 text-center font-mono text-[9px] text-white/50"
        >
          <Activity className="h-4 w-4 text-white/30 mb-1 animate-pulse" />
          <span>Aguardando giros para traçar curva térmica contínua (30 rodadas)</span>
        </div>
      )}

      {/* 4. FOOTER COM ESCALA TEMPORAL E MÉDIA MÓVEL */}
      <div className="flex items-center justify-between pt-1.5 px-0.5 font-mono text-[8px] text-white/40 border-t border-white/5">
        <span>-30 rodadas</span>
        <span className="truncate max-w-[200px] text-center">
          Média móvel de convergência analítica
        </span>
        <span>Último giro: <strong className="text-white/70">{ultimoPonto ? ultimoPonto.spinNum : "—"}</strong></span>
      </div>
    </div>
  );
}
