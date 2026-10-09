import type { DensityAnalysis } from "@/lib/density-radar";

export function DensityRadar({ analysis }: { analysis: DensityAnalysis }) {
  return (
    <section className="mt-2 min-w-0 rounded-md border border-border bg-card/70 p-2" aria-label="Radar de Densidade">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[11px] font-black text-neon-cyan">PADRÃO F · RADAR DE DENSIDADE</h2>
        <span className="text-[9px] text-muted-foreground">{analysis.sampleSize}/50 giros · Zero {analysis.zeros}x</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        {analysis.quadrants.map((quadrant) => (
          <div
            key={quadrant.id}
            className={`min-w-0 rounded-md border bg-background/70 p-2 ${quadrant.hot ? "hot-zone-glow border-neon-red" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <strong className={quadrant.hot ? "text-neon-red" : "text-foreground"}>Q{quadrant.id}</strong>
              <span className={quadrant.hot ? "font-display font-black text-neon-red" : "text-muted-foreground"}>
                {quadrant.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${quadrant.hot ? "bg-neon-red" : "bg-neon-cyan"}`} style={{ width: `${Math.min(100, quadrant.percentage)}%` }} />
            </div>
            <p className="mt-1 truncate text-[8px] text-muted-foreground" title={quadrant.numbers.join(", ")}>
              {quadrant.numbers.join(" · ")}
            </p>
            {quadrant.hot && <div className="mt-1 font-display text-[9px] font-black text-neon-red">ZONA QUENTE</div>}
          </div>
        ))}
      </div>
    </section>
  );
}