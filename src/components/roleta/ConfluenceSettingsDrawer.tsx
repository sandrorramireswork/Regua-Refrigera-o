import { Sliders, X, RotateCcw, ShieldCheck, Zap, Scale, Sparkles, Cpu } from "lucide-react";
import type { ConfluenceConfig } from "@/lib/confluence-engine";

interface ConfluenceSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  config: ConfluenceConfig;
  onChange: (patch: Partial<ConfluenceConfig>) => void;
  onReset: () => void;
  onApplyPreset: (preset: "conservador" | "equilibrado" | "agressivo") => void;
}

export function ConfluenceSettingsDrawer({
  open,
  onClose,
  config,
  onChange,
  onReset,
  onApplyPreset,
}: ConfluenceSettingsDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-md flex-col border-l border-neon-cyan/40 bg-card/95 p-4 shadow-2xl shadow-neon-cyan/10 backdrop-blur-md overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/15 text-neon-cyan shadow-[0_0_10px_#00E5FF]">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-neon-cyan">
                Motor de Confluência
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Parâmetros Matemáticos e Físicos em Tempo Real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Fechar painel de parâmetros"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Perfis de Operação Pré-Configurados
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onApplyPreset("conservador")}
              className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-all ${
                config.min_confidence_trigger >= 90
                  ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan shadow-[0_0_8px_#00E5FF]"
                  : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black uppercase">Conservador</span>
              <span className="text-[8px] opacity-75">Gatilho 90%</span>
            </button>

            <button
              type="button"
              onClick={() => onApplyPreset("equilibrado")}
              className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-all ${
                config.min_confidence_trigger === 85
                  ? "border-neon-green bg-neon-green/15 text-neon-green shadow-[0_0_8px_#00FF7F]"
                  : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black uppercase">Equilibrado</span>
              <span className="text-[8px] opacity-75">Gatilho 85%</span>
            </button>

            <button
              type="button"
              onClick={() => onApplyPreset("agressivo")}
              className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-all ${
                config.min_confidence_trigger <= 75
                  ? "border-neon-orange bg-neon-orange/15 text-neon-orange shadow-[0_0_8px_#FF5E00]"
                  : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-black uppercase">Agressivo</span>
              <span className="text-[8px] opacity-75">Gatilho 75%</span>
            </button>
          </div>
        </div>

        {/* Sliders e Controles Dinâmicos */}
        <div className="mt-5 space-y-4 flex-1">
          {/* 1. window_size */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                1. Janela Micro (window_size)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={config.window_size}
                  onChange={(e) => onChange({ window_size: Number(e.target.value) })}
                  className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-cyan focus:border-neon-cyan focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">giros</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Amostra imediata recente para cálculo de frequência e proximidade física.
            </p>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={config.window_size}
              onChange={(e) => onChange({ window_size: Number(e.target.value) })}
              className="w-full accent-neon-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>5 giros (ultra rápido)</span>
              <span>Padrão: 30</span>
              <span>100 giros (macro)</span>
            </div>
          </div>

          {/* 2. weight_deflection */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                2. Peso Deflexão Física (weight_deflection)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.weight_deflection}
                  onChange={(e) => onChange({ weight_deflection: Number(e.target.value) })}
                  className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-gold focus:border-neon-gold focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Simulação de desvios nas quinas e diamantes adjacentes aos vizinhos do cilindro.
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.weight_deflection}
              onChange={(e) => onChange({ weight_deflection: Number(e.target.value) })}
              className="w-full accent-neon-gold cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>0% (desativado)</span>
              <span>Padrão: 35%</span>
              <span>100% (foco físico)</span>
            </div>
          </div>

          {/* 3. weight_patterns */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                3. Peso Padrões (weight_patterns)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.weight_patterns}
                  onChange={(e) => onChange({ weight_patterns: Number(e.target.value) })}
                  className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-magenta focus:border-neon-magenta focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Força do momentum de tendências agrupadas (Dúzia, Coluna e Cor).
            </p>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.weight_patterns}
              onChange={(e) => onChange({ weight_patterns: Number(e.target.value) })}
              className="w-full accent-neon-magenta cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>0% (ignorar grupos)</span>
              <span>Padrão: 35%</span>
              <span>100% (alta relevância)</span>
            </div>
          </div>

          {/* 4. macro_cycle_threshold */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                4. Gatilho Regressão (macro_cycle_threshold)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1.0}
                  max={10.0}
                  step={0.1}
                  value={config.macro_cycle_threshold}
                  onChange={(e) => onChange({ macro_cycle_threshold: Number(e.target.value) })}
                  className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-cyan focus:border-neon-cyan focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">desv.</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Limiar de saturação para setores quentes perderem força e puxarem setores frios.
            </p>
            <input
              type="range"
              min={1.0}
              max={10.0}
              step={0.1}
              value={config.macro_cycle_threshold}
              onChange={(e) => onChange({ macro_cycle_threshold: Number(e.target.value) })}
              className="w-full accent-neon-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>1.0 (sensível)</span>
              <span>Padrão: 3.0</span>
              <span>10.0 (extremo)</span>
            </div>
          </div>

          {/* 5. min_confidence_trigger */}
          <div className="rounded-lg border-2 border-neon-orange/70 bg-neon-orange/10 p-3 space-y-1.5 shadow-[0_0_15px_rgba(255,94,0,0.2)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-neon-orange animate-pulse" />
                <span className="font-display text-xs font-black text-white">
                  5. Gatilho de Alerta (min_confidence_trigger)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={50}
                  max={98}
                  value={config.min_confidence_trigger}
                  onChange={(e) => onChange({ min_confidence_trigger: Number(e.target.value) })}
                  className="w-14 rounded border border-neon-orange bg-black px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-orange focus:outline-none"
                />
                <span className="text-[10px] text-neon-orange font-bold">%</span>
              </div>
            </div>
            <p className="text-[9px] text-white/80">
              Confluência mínima das 3 Engines para injetar o Alerta Laranja Neon no Grid da Esquerda.
            </p>
            <input
              type="range"
              min={50}
              max={98}
              step={1}
              value={config.min_confidence_trigger}
              onChange={(e) => onChange({ min_confidence_trigger: Number(e.target.value) })}
              className="w-full accent-neon-orange cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-neon-orange/80 font-mono">
              <span>50% (frequente)</span>
              <span>Padrão: 85%</span>
              <span>98% (ultra elite)</span>
            </div>
          </div>

          {/* 6. mirror_window_size */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                6. Janela Espelho & Raiz (mirror_window_size)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={config.mirror_window_size || 7}
                  onChange={(e) => onChange({ mirror_window_size: Number(e.target.value) })}
                  className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-right font-mono text-xs font-black text-neon-gold focus:border-neon-gold focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">giros</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Rastreamento de inversões e raízes na janela curta (5 a 30 rodadas, padrão 7).
            </p>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={config.mirror_window_size || 7}
              onChange={(e) => onChange({ mirror_window_size: Number(e.target.value) })}
              className="w-full accent-neon-gold cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-mono">
              <span>5 giros</span>
              <span>Padrão: 7</span>
              <span>30 giros</span>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neon-cyan px-4 py-1.5 font-display text-xs font-black text-black shadow-[0_0_10px_#00E5FF] hover:bg-neon-cyan/90 transition-all"
          >
            Aplicar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
