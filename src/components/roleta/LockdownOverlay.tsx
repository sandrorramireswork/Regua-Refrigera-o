import { RotateCcw } from "lucide-react";

export function LockdownOverlay({
  mode,
  onReset,
}: {
  mode: "win" | "loss" | null;
  onReset?: () => void;
}) {
  if (!mode) return null;
  const win = mode === "win";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm pointer-events-auto"
      role="alertdialog"
      aria-modal="true"
      aria-label={win ? "Meta diária atingida" : "Stop-loss atingido"}
    >
      <section
        className={`animate-in zoom-in-95 fade-in max-w-md w-full rounded-xl border-2 bg-card/95 p-6 text-center duration-300 shadow-2xl ${
          win ? "lockdown-win border-neon-green" : "lockdown-loss border-neon-red"
        }`}
      >
        <h2
          className={`font-display text-2xl font-black tracking-wide ${
            win ? "text-neon-green" : "text-neon-red"
          }`}
        >
          {win ? "🎯 META BATIDA!" : "🛑 STOP-LOSS ATINGIDO."}
        </h2>
        <p className="mt-3 text-sm font-bold text-foreground">
          {win
            ? "Volte amanhã. O segredo da consistência é saber parar."
            : "Proteção de capital ativada. Encerre o aplicativo por hoje."}
        </p>

        {onReset && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={onReset}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                win
                  ? "border border-neon-green/60 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "border border-neon-red/60 bg-neon-red/20 text-neon-red hover:bg-neon-red/30 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              Iniciar Outro Dia (Zerar Bloqueio)
            </button>
            <span className="text-[10px] text-muted-foreground">
              Zera as travas de proteção e inicia uma nova sessão para o próximo dia
            </span>
          </div>
        )}
      </section>
    </div>
  );
}