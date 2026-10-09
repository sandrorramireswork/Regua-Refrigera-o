import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Activity, BellRing, CircleDotDashed, Gauge, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeAttractionSignal,
  calculateLiveAttraction,
  DYNAMIC_TRIGGERS,
  FIXED_ATTRACTIONS,
  RETURN_CYCLES,
} from "@/lib/attraction-cycles";
import type { Spin } from "@/lib/roulette";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ChartPalette {
  cyan: string;
  green: string;
  gold: string;
  magenta: string;
  foreground: string;
  muted: string;
  border: string;
}

export function TabMonitoramentoAtracao({
  spins,
  onAddSpin,
}: {
  spins: Spin[];
  onAddSpin: (number: number) => void;
}) {
  const [entry, setEntry] = useState("");
  const [palette, setPalette] = useState<ChartPalette | null>(null);
  const signal = useMemo(() => analyzeAttractionSignal(spins), [spins]);
  const liveAttractions = useMemo(
    () => DYNAMIC_TRIGGERS.map((trigger) => ({ trigger, ...calculateLiveAttraction(spins, trigger) })),
    [spins],
  );

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const color = (name: string) => styles.getPropertyValue(name).trim();
    setPalette({
      cyan: color("--neon-cyan"),
      green: color("--neon-green"),
      gold: color("--neon-gold"),
      magenta: color("--neon-magenta"),
      foreground: color("--foreground"),
      muted: color("--muted-foreground"),
      border: color("--border"),
    });
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = Number(entry);
    if (!Number.isInteger(number) || number < 0 || number > 36) return;
    onAddSpin(number);
    setEntry("");
  }

  const chartData = palette
    ? {
        labels: FIXED_ATTRACTIONS.map((item) => `${item.trigger} → ${item.target}`),
        datasets: [
          {
            label: "Probabilidade de atração",
            data: FIXED_ATTRACTIONS.map((item) => item.probability),
            backgroundColor: [palette.green, palette.cyan, palette.magenta, palette.gold],
            borderColor: palette.foreground,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      }
    : null;

  const chartOptions: ChartOptions<"bar"> | undefined = palette
    ? {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (context) => `${Number(context.raw).toFixed(1)}%` },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { color: palette.muted, callback: (value) => `${value}%` },
            grid: { color: palette.border },
          },
          y: {
            ticks: { color: palette.foreground, font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      }
    : undefined;

  return (
    <div className="space-y-3 pb-6">
      <header className="neon-cyan-glow rounded-lg bg-card/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-[10px] uppercase text-neon-magenta">Leitura sequencial em tempo real</p>
            <h2 className="font-display text-sm font-black text-neon-cyan">MONITORAMENTO DE ATRAÇÃO E CICLOS</h2>
          </div>
          <span className="flex items-center gap-1 rounded-md border border-neon-green/60 px-2 py-1 font-display text-[10px] text-neon-green">
            <Radio className="h-3 w-3" /> {spins.length} GIROS
          </span>
        </div>
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <Input
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            inputMode="numeric"
            type="number"
            min={0}
            max={36}
            aria-label="Novo número da roleta"
            placeholder="Digite um número de 0 a 36"
            className="border-neon-cyan/60 font-display text-foreground"
          />
          <Button type="submit" disabled={entry === ""} className="font-display text-xs font-black">
            REGISTRAR
          </Button>
        </form>
      </header>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.7fr)]">
        <div className="min-w-0 space-y-3">
          <section className="neon-cyan-glow rounded-lg bg-card/50 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-neon-green" />
              <div>
                <p className="font-display text-[10px] uppercase text-neon-magenta">Cadeias de Markov</p>
                <h3 className="font-display text-sm font-black text-neon-cyan">GRÁFICO DE ATRAÇÃO</h3>
              </div>
            </div>
            <div className="mt-3 h-64 min-w-0">
              {chartData && chartOptions ? <Bar data={chartData} options={chartOptions} /> : null}
            </div>
          </section>

          <section className="neon-cyan-glow overflow-hidden rounded-lg bg-card/50">
            <div className="border-b border-border px-3 py-2">
              <p className="font-display text-[10px] uppercase text-neon-gold">Ciclo médio de exaustão</p>
              <h3 className="font-display text-sm font-black text-neon-cyan">REPRESSÃO E RETORNO</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead className="bg-muted/70 font-display text-[10px] uppercase text-neon-cyan">
                  <tr><th className="px-3 py-2">Número</th><th className="px-3 py-2">Retorno médio</th><th className="px-3 py-2">Leitura</th></tr>
                </thead>
                <tbody>
                  {RETURN_CYCLES.map((item, index) => (
                    <tr key={item.number} className="border-t border-border/60">
                      <td className="px-3 py-2 font-display text-base font-black text-neon-green">{item.number}</td>
                      <td className="px-3 py-2 font-black text-foreground">{item.averageRounds.toFixed(1)} rodadas</td>
                      <td className={`px-3 py-2 font-display text-[10px] ${index < 2 ? "text-neon-gold" : index > 3 ? "text-neon-cyan" : "text-muted-foreground"}`}>
                        {index === 0 ? "RETORNO CURTO" : index === RETURN_CYCLES.length - 1 ? "RETORNO LONGO" : "FAIXA CENTRAL"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-3">
          <section className={`rounded-lg border p-3 ${signal ? "num-green animate-flash-green" : "border-neon-magenta/60 bg-card/60"}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className={signal ? "h-4 w-4 text-neon-green" : "h-4 w-4 text-neon-magenta"} />
                <h3 className="font-display text-xs font-black text-foreground">NOTIFICATION GRID</h3>
              </div>
              <span className={`font-display text-[9px] ${signal ? "text-neon-green" : "text-muted-foreground"}`}>
                {signal ? "PADRÃO APROXIMADO" : "MONITORANDO"}
              </span>
            </div>
            {signal ? (
              <div className="mt-3 space-y-2">
                <Metric label="Gatilho detectado" value={`${signal.trigger}`} tone="gold" />
                <Metric label="Alvo correspondente" value={signal.target === null ? "EM OBSERVAÇÃO" : `${signal.target}`} tone="green" />
                <Metric label="Chance" value={signal.probability === null ? "SEM AMOSTRA" : `${signal.probability.toFixed(1)}%`} tone="cyan" />
                <p className="text-[9px] uppercase text-muted-foreground">
                  {signal.source === "fixed" ? "Base catalogada" : `${signal.observations} sucessões reais analisadas`}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
                Aguardando 7, 9, 26, 34, 22 ou 18 na última entrada.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-neon-gold/60 bg-neon-gold/5 p-3">
            <div className="flex items-center gap-2 text-neon-gold">
              <Gauge className="h-4 w-4" />
              <h3 className="font-display text-xs font-black">ATRAÇÃO AO VIVO</h3>
            </div>
            <div className="mt-3 space-y-2">
              {liveAttractions.map((item) => (
                <div key={item.trigger} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border/60 pb-2 text-xs last:border-0 last:pb-0">
                  <strong className="font-display text-neon-gold">{item.trigger}</strong>
                  <span className="text-center text-muted-foreground">→</span>
                  <strong className="text-neon-green">
                    {item.target === null ? "observação" : `${item.target} · ${item.probability?.toFixed(1)}%`}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-neon-magenta/60 bg-card/60 p-3">
            <div className="flex items-center gap-2 text-neon-magenta">
              <CircleDotDashed className="h-4 w-4" />
              <h3 className="font-display text-xs font-black">SÍNTESE ESTRATÉGICA</h3>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-foreground">
              As zonas de alta densidade concentram retornos e transições recorrentes. A quebra de assimetria ocorre quando a atração abandona o equilíbrio esperado e passa a favorecer um alvo com repetição mensurável no ciclo observado.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

const TONES = {
  gold: "border-neon-gold/60 text-neon-gold",
  green: "border-neon-green/60 text-neon-green",
  cyan: "border-neon-cyan/60 text-neon-cyan",
} as const;

function Metric({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className={`rounded-md border bg-background/70 px-2 py-2 ${TONES[tone]}`}>
      <p className="font-display text-[9px] uppercase opacity-80">{label}</p>
      <p className="mt-1 font-display text-base font-black">{value}</p>
    </div>
  );
}