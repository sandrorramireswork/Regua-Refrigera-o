import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SmartBankrollAnalysis, SmartBankrollConfig } from "@/lib/smart-bankroll";

interface Props {
  config: SmartBankrollConfig;
  analysis: SmartBankrollAnalysis;
  onChange: (next: SmartBankrollConfig) => void;
}

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SmartBankrollPanel({ config, analysis, onChange }: Props) {
  const fields = [
    ["Banca Atual", "bankroll", config.bankroll, true],
    ["Meta Diária (Stop-Win)", "dailyTarget", config.dailyTarget, config.stopWinEnabled],
    ["Limite de Perda (Stop-Loss)", "stopLoss", config.stopLoss, config.stopLossEnabled],
  ] as const;
  return (
    <section className="mt-2 rounded-md border border-neon-gold/50 bg-card/70 p-2" aria-label="Gestão de Banca Inteligente">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[11px] font-black text-neon-gold">GESTÃO DE BANCA INTELIGENTE</h2>
        <span className={analysis.profit >= 0 ? "text-[10px] text-neon-green" : "text-[10px] text-neon-red"}>
          Saldo simulado {analysis.profit >= 0 ? "+" : ""}{brl(analysis.profit)}
        </span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        {fields.map(([label, key, value, enabled]) => (
          <label key={key} className={`min-w-0 rounded-md border border-border bg-background/70 p-1.5 ${enabled ? "" : "opacity-50"}`}>
            <span className="block text-[9px] uppercase text-muted-foreground">{label}</span>
            <Input
              aria-label={label}
              type="number"
              min={0}
              max={100000000}
              step="0.01"
              value={value}
              disabled={!enabled}
              onChange={(event) => onChange({ ...config, [key]: Number(event.target.value) })}
              className="mt-1 h-7 border-0 px-1 font-display text-xs font-black"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <ProtectionToggle
          label="Stop-Win"
          checked={config.stopWinEnabled}
          tone="green"
          onCheckedChange={(checked) => onChange({ ...config, stopWinEnabled: checked })}
        />
        <ProtectionToggle
          label="Stop-Loss"
          checked={config.stopLossEnabled}
          tone="red"
          onCheckedChange={(checked) => onChange({ ...config, stopLossEnabled: checked })}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded-md border border-neon-orange/50 bg-background/70 p-1.5">
          <span className="text-muted-foreground">Alerta padrão · 1%</span>
          <strong className="block font-display text-neon-orange">{brl(analysis.standardSuggestion)} total</strong>
        </div>
        <div className="rounded-md border border-neon-cyan/50 bg-background/70 p-1.5">
          <span className="text-muted-foreground">Super Confluência · 2,5%</span>
          <strong className="block font-display text-neon-cyan">{brl(analysis.superSuggestion)} total</strong>
        </div>
      </div>
    </section>
  );
}

function ProtectionToggle({
  label,
  checked,
  tone,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  tone: "green" | "red";
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background/70 p-1.5">
      <div className="min-w-0">
        <span className="block text-[9px] font-bold uppercase text-muted-foreground">{label}</span>
        <span className={`block text-[10px] font-black ${checked ? (tone === "green" ? "text-neon-green" : "text-neon-red") : "text-muted-foreground"}`}>
          {checked ? "ATIVO" : "INATIVO"}
        </span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`${checked ? "Desativar" : "Ativar"} ${label}`}
        className={checked ? (tone === "green" ? "data-[state=checked]:bg-neon-green" : "data-[state=checked]:bg-neon-red") : ""}
      />
    </div>
  );
}