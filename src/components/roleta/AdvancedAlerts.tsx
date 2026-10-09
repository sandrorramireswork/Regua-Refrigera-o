import type {
  DealerJumpSignal,
  SuperConfluenceSignal,
} from "@/lib/advanced-tracker";

interface AdvancedAlertsProps {
  jump: DealerJumpSignal | null;
  confluence: SuperConfluenceSignal | null;
  standardStake?: number;
  superStake?: number;
}

function Accuracy({ value }: { value: number }) {
  return (
    <p className="mt-2 text-[10px] leading-relaxed text-foreground/80">
      Assertividade: {value.toFixed(1)}% de acerto até o momento · Proteção G1 (Até 2 entradas)
    </p>
  );
}

const brl = (value?: number) =>
  (typeof value === "number" && Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export function AdvancedAlerts({ jump, confluence, standardStake = 0, superStake = 0 }: AdvancedAlertsProps) {
  if (!jump && !confluence) return null;
  return (
    <div className="mt-2 grid min-w-0 gap-2 md:grid-cols-2">
      {confluence && (
        <section
          className="animate-in zoom-in-95 fade-in neon-cyan-alert min-w-0 rounded-md px-3 py-3 duration-300"
          aria-label="Super Confluência detectada"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-foreground">💎 SUPER CONFLUÊNCIA DETECTADA</h2>
            <span className="rounded-full border border-neon-cyan/70 bg-background/70 px-2 py-0.5 font-display text-[9px] font-black text-neon-cyan">
              MÁXIMA ASSERTIVIDADE
            </span>
          </div>
          <p className="mt-2 text-xs text-foreground/80">
            Padrões Cruzados: <strong className="neon-cyan-text text-neon-cyan">{confluence.patterns.join(" + ")}</strong>
          </p>
          <p className="mt-1 break-words font-display text-sm font-extrabold text-neon-cyan neon-cyan-text">
            Forte tendência nos números: {confluence.targets.join(", ")}
          </p>
          <Accuracy value={confluence.stats.accuracy} />
          <p className="mt-1 font-display text-[10px] font-black text-neon-gold">Entrada sugerida: {brl(superStake)} total</p>
        </section>
      )}
      {jump && (
        <section
          className="animate-in zoom-in-95 fade-in neon-cyan-alert min-w-0 rounded-md px-3 py-3 duration-300"
          aria-label="Alerta de Salto Físico"
        >
          <div className="text-xs font-bold text-foreground">⚙️ PADRÃO D · DEALER SIGNATURE</div>
          <p className="mt-1 font-display text-sm font-extrabold text-neon-cyan neon-cyan-text">
            SALTO FÍSICO · ALVO {jump.centralTarget}
          </p>
          <p className="mt-2 break-words text-xs font-bold text-neon-cyan neon-cyan-text">
            Zona 5: {jump.targets.join(", ")}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Saltos: {jump.jumps.join(" · ")} · Média exata {jump.averageJump} · Projeção +{jump.projectedJump}
          </p>
          <Accuracy value={jump.stats.accuracy} />
          <p className="mt-1 font-display text-[10px] font-black text-neon-gold">Entrada sugerida: {brl(standardStake)} total</p>
        </section>
      )}
    </div>
  );
}