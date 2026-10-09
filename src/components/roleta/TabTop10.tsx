import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell as ChartCell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyzeExecutiveDashboard } from "@/lib/executive-engines";
import { CILINDRO, getProps, type PullRules, type SectorDef, type Spin } from "@/lib/roulette";
import { analyzeTerminalTrends, TERMINALS } from "@/lib/terminal-trends";

const TERMINAL_COLORS = [
  "var(--foreground)",
  "var(--neon-red)",
  "var(--neon-green)",
  "var(--neon-cyan)",
  "var(--neon-magenta)",
  "var(--neon-gold)",
  "var(--muted-foreground)",
  "var(--neon-red)",
  "var(--neon-cyan)",
  "var(--neon-green)",
] as const;

function corClass(n: number) {
  const c = getProps(n).cor;
  return c === "red" ? "text-neon-red" : c === "green" ? "text-neon-green" : "text-foreground";
}

export function TabTop10({
  spins,
  regras,
  setores,
}: {
  spins: Spin[];
  regras: PullRules;
  setores: SectorDef[];
}) {
  const analysis = useMemo(
    () => analyzeExecutiveDashboard(spins, regras, setores),
    [regras, setores, spins],
  );
  const retentionChart = useMemo(() => {
    const nucleus = analysis.retention?.nucleus;
    if (nucleus === undefined) return [];
    return spins.slice(0, 4).map((spin, index) => {
      const a = CILINDRO.indexOf(nucleus);
      const b = CILINDRO.indexOf(spin.num);
      const direct = Math.abs(a - b);
      return {
        rodada: `R-${index}`,
        numero: spin.num,
        distancia: Math.min(direct, CILINDRO.length - direct),
      };
    }).reverse();
  }, [analysis.retention?.nucleus, spins]);
  const terminalTrends = useMemo(() => analyzeTerminalTrends(spins), [spins]);
  const hottestTerminals = [...terminalTrends.temperatures]
    .sort((a, b) => b.deviation - a.deviation || a.terminal - b.terminal)
    .slice(0, 3);
  const coldestTerminals = [...terminalTrends.temperatures]
    .sort((a, b) => a.deviation - b.deviation || a.terminal - b.terminal)
    .slice(0, 3);

  const [mostrarGraficoTerminais, setMostrarGraficoTerminais] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("roleta-mostrar-grafico-terminais") === "true";
  });

  const toggleGraficoTerminais = () => {
    setMostrarGraficoTerminais((prev) => {
      const next = !prev;
      localStorage.setItem("roleta-mostrar-grafico-terminais", String(next));
      return next;
    });
  };

  return (
    <div className="space-y-3 pb-6">
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <EngineCard
          number="01"
          title="BINÁRIAS E TERÇOS"
          value={`${analysis.motor1Long.color.name} · ${analysis.motor1Long.dozen.name}`}
          detail={`20/50 giros · ${analysis.motor1Long.column.name}`}
          tone="magenta"
        />
        <EngineCard
          number="02"
          title="GEOMETRIA DA RODA"
          value={analysis.motor2.dominantSector.name}
          detail={`Raio médio ${analysis.motor2.averagePhysicalRadius.toFixed(6)} casas · DRZ ${analysis.motor2.lastDistanceFromZero}`}
          tone="cyan"
        />
        <EngineCard
          number="03"
          title="CADEIA HISTÓRICA"
          value={`Gatilho ${analysis.currentNumber}`}
          detail={`${analysis.topPulls.length} sucessões ranqueadas`}
          tone="gold"
        />
        <EngineCard
          number="04"
          title="CLUSTER DE ZONAS"
          value={`Núcleo ${analysis.clusters[0]?.nucleus ?? "—"}`}
          detail={`Z ${(analysis.clusters[0]?.zScore ?? 0).toFixed(6)} · ${analysis.clusters[0]?.count ?? 0} ocorrências`}
          tone="green"
        />
      </section>

      {analysis.retention && (
        <section className={`rounded-lg border p-3 ${analysis.retention.active ? "num-green animate-flash-green" : "neon-cyan-glow bg-card/60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-display text-[10px] uppercase text-neon-gold">Motor 2 · janela física total de 9 casas</p>
              <h2 className={`font-display text-sm font-black ${analysis.retention.active ? "text-neon-green" : "text-neon-cyan"}`}>
                {analysis.retention.active ? "⚠ ALERTA: RETENÇÃO DE SETOR ATIVA" : "RETENÇÃO DE SETOR EM MONITORAMENTO"}
              </h2>
            </div>
            <span className="rounded-md border border-neon-gold/60 px-2 py-1 font-display text-[10px] text-neon-gold">
              {analysis.retention.hits}/4 · NÚCLEO {analysis.retention.nucleus}
            </span>
          </div>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <div>
              <div className="grid grid-cols-9 gap-1">
                {analysis.retention.window.map((number) => (
                  <span
                    key={number}
                    className={`flex aspect-square items-center justify-center rounded-full border text-[10px] font-black ${
                      analysis.retention?.zone5.includes(number)
                        ? "border-neon-green bg-neon-green/10 text-neon-green"
                        : "border-neon-cyan/50 text-neon-cyan"
                    }`}
                  >
                    {number}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Zona 5 sugerida: <strong className="text-neon-green">{analysis.retention.zone5.join(" · ")}</strong>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Últimas quatro: {analysis.retention.recentNumbers.join(" · ")}
              </p>
            </div>
            <div className="h-36 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retentionChart} margin={{ top: 6, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="numero" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 18]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<RetentionTooltip />} />
                  <ReferenceLine y={4} stroke="var(--neon-gold)" strokeDasharray="4 3" />
                  <Bar dataKey="distancia" radius={[3, 3, 0, 0]}>
                    {retentionChart.map((point) => (
                      <ChartCell key={`${point.rodada}-${point.numero}`} fill={point.distancia <= 4 ? "var(--neon-green)" : "var(--neon-red)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <section className="neon-cyan-glow rounded-lg bg-card/50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-[10px] uppercase text-neon-magenta">Tabela Mestra · últimos 50 giros</p>
            <h2 className="font-display text-sm font-black text-neon-cyan">FREQUÊNCIA DOS TERMINAIS POR RODADA</h2>
            <p className="text-[10px] text-muted-foreground">Frequência móvel dos terminais 0–9 em janela de 20 rodadas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-neon-gold/60 px-2 py-1 font-display text-[10px] text-neon-gold">
              AMOSTRA {terminalTrends.sampleSize}/20
            </span>
            <button
              type="button"
              onClick={toggleGraficoTerminais}
              className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 font-display text-[10px] font-bold text-neon-cyan hover:bg-cyan-900/60 hover:text-white transition cursor-pointer"
              title={mostrarGraficoTerminais ? "Ocultar gráfico de linhas dos terminais" : "Exibir gráfico de linhas dos terminais"}
            >
              {mostrarGraficoTerminais ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span>{mostrarGraficoTerminais ? "Ocultar Gráfico" : "Mostrar Gráfico"}</span>
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <TerminalRanking title="QUENTES" items={hottestTerminals} tone="hot" />
          <TerminalRanking title="FRIOS" items={coldestTerminals} tone="cold" />
        </div>

        {mostrarGraficoTerminais && (
          <div className="mt-3 h-64 min-w-0 animate-in fade-in duration-300">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={terminalTrends.snapshots} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="round" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                />
                <Tooltip content={<TerminalTooltip />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {TERMINALS.map((terminal) => (
                  <Line
                    key={terminal}
                    type="monotone"
                    dataKey={`T${terminal}`}
                    name={`T${terminal}`}
                    stroke={TERMINAL_COLORS[terminal]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="neon-cyan-glow overflow-hidden rounded-lg bg-card/50">
        <div className="border-b border-border px-3 py-2">
          <p className="font-display text-[10px] uppercase text-neon-magenta">Cruzamento executivo · gatilho {analysis.currentNumber}</p>
          <h2 className="font-display text-sm font-black text-neon-cyan">TABELA MESTRA · TOP 10 PUXA</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] text-left text-[10px]">
            <thead className="bg-muted/80 font-display uppercase text-neon-cyan">
              <tr>
                {HEADERS.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {analysis.topPulls.length === 0 ? (
                <tr className="border-t border-border/60">
                  <td colSpan={HEADERS.length} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Registre mais ocorrências do último número para formar as transições históricas.
                  </td>
                </tr>
              ) : analysis.topPulls.map((row) => (
                <tr
                  key={row.number}
                  className={`border-t border-border/60 ${row.highPrecision ? "bg-neon-green/15 shadow-[inset_0_0_18px_color-mix(in_oklab,var(--neon-green)_22%,transparent)]" : ""}`}
                >
                  <td className={`px-3 py-2 font-display text-base font-black ${corClass(row.number)}`}>{row.number}</td>
                  <td className="px-3 py-2 font-black text-neon-magenta">{row.absoluteFrequency}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.confluence.length > 0 ? row.confluence.map((label) => (
                        <span key={label} className="rounded border border-neon-gold/50 px-1.5 py-0.5 text-neon-gold">{label}</span>
                      )) : <span className="text-muted-foreground">Sem confluência</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neon-cyan">{row.sector}</td>
                  <td className={`whitespace-nowrap px-3 py-2 font-black ${row.zScore > 2 ? "text-neon-red" : row.zScore < -2 ? "text-neon-cyan" : "text-foreground"}`}>
                    {row.displayZScore.toFixed(6)}{row.zScore > 3 ? "+" : row.zScore < -3 ? "−" : ""}
                  </td>
                  <td className="px-3 py-2">{row.distanceFromZero}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neon-green">{row.zone5.join(" · ")}</td>
                  <td className={`whitespace-nowrap px-3 py-2 font-black ${row.kelly > 0 ? "text-neon-green" : "text-neon-red"}`}>
                    {(row.kelly * 100).toFixed(6)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const HEADERS = [
  "Número Puxado",
  "Frequência Absoluta",
  "Confluência de Grupo",
  "Setor Físico",
  "Z-Score Ativo",
  "Distância do Zero",
  "Zona 5 Casas (Alvo)",
  "Kelly Sizing %",
];

const TONES = {
  magenta: "border-neon-magenta/60 text-neon-magenta",
  cyan: "border-neon-cyan/60 text-neon-cyan",
  gold: "border-neon-gold/60 text-neon-gold",
  green: "border-neon-green/60 text-neon-green",
} as const;

function EngineCard({ number, title, value, detail, tone }: { number: string; title: string; value: string; detail: string; tone: keyof typeof TONES }) {
  return (
    <div className={`min-w-0 rounded-lg border bg-card/60 p-2 ${TONES[tone]}`}>
      <div className="flex items-center justify-between gap-2 font-display text-[9px] uppercase">
        <span>Motor {number}</span><span>ATIVO</span>
      </div>
      <h3 className="mt-1 truncate font-display text-[10px] font-black text-foreground">{title}</h3>
      <p className="mt-2 truncate font-display text-xs font-black">{value}</p>
      <p className="mt-1 line-clamp-2 text-[9px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function RetentionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-neon-cyan bg-card px-2 py-1 text-[10px]">
      <div className="font-display font-black text-neon-cyan">NÚMERO {label}</div>
      <div className="text-foreground">Distância: {payload[0].value} casas</div>
    </div>
  );
}

function TerminalRanking({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ terminal: number; frequency: number; count: number }>;
  tone: "hot" | "cold";
}) {
  return (
    <div className={`rounded-md border p-2 ${tone === "hot" ? "border-neon-red/60 bg-neon-red/5" : "border-neon-cyan/60 bg-neon-cyan/5"}`}>
      <p className={`font-display text-[9px] font-black ${tone === "hot" ? "text-neon-red" : "text-neon-cyan"}`}>{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item.terminal} className="rounded border border-border bg-background/70 px-1.5 py-1 font-display text-[9px] text-foreground">
            T{item.terminal} · {(item.frequency * 100).toFixed(1)}% · {item.count}x
          </span>
        ))}
      </div>
    </div>
  );
}

function TerminalTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-h-48 overflow-y-auto rounded-md border border-neon-cyan bg-card px-2 py-1.5 text-[10px] shadow-lg">
      <div className="mb-1 font-display font-black text-neon-cyan">RODADA {label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {(Number(item.value) * 100).toFixed(1)}%
        </div>
      ))}
    </div>
  );
}
