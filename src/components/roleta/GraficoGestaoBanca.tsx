import { useMemo } from "react";
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
} from "chart.js";
import { Line } from "react-chartjs-2";
import { TrendingUp, Sparkles } from "lucide-react";
import type { GestaoSetupConfig, RegistroDiario } from "@/lib/gestao-banca-inteligente";
import { formatarMoeda } from "@/lib/gestao-banca-inteligente";

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

interface Props {
  config: GestaoSetupConfig;
  tabela: RegistroDiario[];
}

export function GraficoGestaoBanca({ config, tabela }: Props) {
  const chartData = useMemo(() => {
    const labels = tabela.map((row) => row.labelDia);
    const dataProjecao = tabela.map((row) => Number(row.bancaProjetada.toFixed(2)));

    // Linha da Realidade: mapeia os valores manuais inseridos.
    // Dias sem registro recebem null para que a linha reflita apenas o histórico real.
    const dataRealidade = tabela.map((row) =>
      row.bancaFinal !== null ? Number(row.bancaFinal.toFixed(2)) : null
    );

    return {
      labels,
      datasets: [
        {
          label: `Projeção Teórica (${config.taxaJurosDiaria}% a.d.)`,
          data: dataProjecao,
          borderColor: "#00E5FF",
          backgroundColor: "rgba(0, 229, 255, 0.05)",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: "#00E5FF",
          tension: 0.25,
          fill: false,
        },
        {
          label: "Banca Real (Manual)",
          data: dataRealidade,
          borderColor: "#00E676",
          backgroundColor: "rgba(0, 230, 118, 0.12)",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#00E676",
          pointBorderColor: "#0D0D0D",
          pointBorderWidth: 1.5,
          tension: 0.25,
          fill: true,
          spanGaps: false,
        },
      ],
    };
  }, [config, tabela]);

  const options = useMemo<ChartOptions<"line">>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "rgba(255, 255, 255, 0.8)",
            font: {
              family: "Inter, sans-serif",
              size: 11,
              weight: "bold",
            },
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(13, 13, 13, 0.95)",
          borderColor: "rgba(255, 255, 255, 0.15)",
          borderWidth: 1,
          titleColor: "#FFFFFF",
          titleFont: {
            family: "Orbitron, sans-serif",
            size: 11,
            weight: "bold",
          },
          bodyColor: "rgba(255, 255, 255, 0.9)",
          bodyFont: {
            family: "Inter, sans-serif",
            size: 11,
          },
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const val = context.parsed.y;
              if (val === null || val === undefined) return `${label}: Não informado`;
              return `${label}: ${formatarMoeda(val)}`;
            },
            afterBody: (tooltipItems) => {
              if (tooltipItems.length < 2) return [];
              const proj = tooltipItems[0]?.parsed.y;
              const real = tooltipItems[1]?.parsed.y;
              if (proj != null && real != null) {
                const diff = real - proj;
                const sign = diff >= 0 ? "+" : "";
                const tag = diff >= 0 ? "🟢 Superávit" : "🔻 Déficit";
                return [`Delta: ${sign}${formatarMoeda(diff)} (${tag})`];
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.04)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.5)",
            font: {
              size: 10,
              family: "Inter, sans-serif",
            },
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 15,
          },
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.06)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 10,
              family: "Inter, sans-serif",
            },
            callback: (val) => {
              const num = Number(val);
              return num >= 1000 ? `R$ ${(num / 1000).toFixed(1)}k` : `R$ ${num}`;
            },
          },
        },
      },
    };
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm shadow-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 p-1.5 text-neon-cyan shadow-[0_0_10px_rgba(0,229,255,0.25)]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs font-bold tracking-wider text-white flex items-center gap-1.5">
              CURVA DE CRESCIMENTO: PROJEÇÃO VS. REALIDADE
              <Sparkles className="h-3 w-3 text-neon-gold" />
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Trajetória exponencial de juros compostos confrontada com os inputs diários de fechamento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm border border-dashed border-[#00E5FF] bg-[#00E5FF]/20" />
            <span className="text-muted-foreground">Projeção Ideal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.6)]" />
            <span className="text-white font-medium">Banca Real</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
