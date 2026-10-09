import type { OpportunitySignal } from "@/lib/opportunity-tracker";

const formatStake = (value?: number) =>
  (typeof value === "number" && Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export function OpportunityAlerts({ opportunities, suggestedStake = 0 }: { opportunities: OpportunitySignal[]; suggestedStake?: number }) {
  if (opportunities.length === 0) return null;

  return (
    <div className="mt-2 grid min-w-0 gap-2 md:grid-cols-2">
      {opportunities.map((opportunity) => (
        <div
          key={`${opportunity.key}-${opportunity.triggerSpinId}`}
          className="animate-in fade-in slide-in-from-right-8 min-w-0 duration-500 ease-out"
          aria-label={`Oportunidade identificada de ${opportunity.kind}`}
        >
          <section className="neon-orange-glow rounded-md px-3 py-2.5 backdrop-blur">
            <div className="text-xs font-bold text-foreground">🚨 ALERTA DE ENTRADA</div>
            <div className="mt-1 font-display text-sm font-black text-neon-orange neon-orange-text sm:text-base">
              PADRÃO {opportunity.kind.toUpperCase()}
            </div>
            <p className="mt-2 break-words text-xs font-bold text-neon-orange neon-orange-text">
              Alvos: {opportunity.targetLabel}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-foreground/80">
              Assertividade: {opportunity.stats.accuracy.toFixed(1)}% de acerto até o momento (em 2 entradas)
            </p>
            <p className="mt-1 font-display text-[10px] font-black text-neon-gold">
              Entrada sugerida: {formatStake(suggestedStake)} total
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span>Gatilho {opportunity.trigger}</span>
              {opportunity.terminal !== null && <span>Terminal {opportunity.terminal}</span>}
              <span>{opportunity.stats.wins} Win · {opportunity.stats.losses} Loss</span>
            </div>
          </section>
        </div>
      ))}
    </div>
  );
}