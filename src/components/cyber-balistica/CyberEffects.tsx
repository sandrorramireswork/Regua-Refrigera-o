import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, AlertTriangle, X, Zap } from "lucide-react";

export type ToastType = "STOP_WIN" | "STOP_LOSS" | "GREEN_G1" | "KELLY_INFO" | "GENERIC";

export interface CyberToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

/**
 * Função utilitária para disparar confetes explosivos com cores forçadas da paleta tática:
 * Azul Cyan (#08f7fe), Prata brilhante (#c5c6c7) e Branco Puro (#ffffff)
 */
export function dispararConfetesTaticos() {
  const tacticalColors = ["#08f7fe", "#c5c6c7", "#ffffff"];

  // Explosão central rápida e impactante
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { x: 0.5, y: 0.6 },
    colors: tacticalColors,
    startVelocity: 60,
    ticks: 140,
    gravity: 1.2,
    scalar: 1.1,
  });

  // Dois canhões laterais imediatos para efeito cinematográfico
  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.65 },
      colors: tacticalColors,
      startVelocity: 50,
      ticks: 120,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.65 },
      colors: tacticalColors,
      startVelocity: 50,
      ticks: 120,
    });
  }, 100);
}

/**
 * Overlay de Flashbang Tático
 * Duração de 0.4s, fundo Azul Cyan com 40% de opacidade que some em fade-out.
 */
export function CyberFlashbangOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none bg-[#08f7fe]/40 animate-fade-out"
      style={{
        animation: "cyberFlash 0.4s ease-out forwards",
      }}
    />
  );
}

/**
 * Container de Toasts no canto superior direito
 * Tempo de tela: 5 segundos
 */
interface CyberToastContainerProps {
  toasts: CyberToastItem[];
  onDismiss: (id: string) => void;
}

export function CyberToastContainer({ toasts, onDismiss }: CyberToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-mono">
      {toasts.map((t) => (
        <CyberToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function CyberToastCard({
  toast,
  onDismiss,
}: {
  toast: CyberToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000); // 5 segundos de tela
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isWin = toast.type === "STOP_WIN" || toast.type === "GREEN_G1";
  const isLoss = toast.type === "STOP_LOSS";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border-2 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isWin
          ? "border-[#08f7fe] bg-[#050e17]/95 text-white shadow-[0_0_25px_rgba(8,247,254,0.6)]"
          : "border-[#ff003c] bg-[#170509]/95 text-white shadow-[0_0_25px_rgba(255,0,60,0.7)] animate-pulse"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          isWin
            ? "border-[#08f7fe] bg-[#08f7fe]/20 text-[#08f7fe] shadow-[0_0_12px_#08f7fe]"
            : "border-[#ff003c] bg-[#ff003c]/20 text-[#ff003c] shadow-[0_0_12px_#ff003c]"
        }`}
      >
        {isWin ? <Trophy className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4
            className={`text-xs font-black uppercase tracking-wider ${
              isWin ? "text-[#08f7fe] drop-shadow-[0_0_6px_#08f7fe]" : "text-[#ff003c] drop-shadow-[0_0_6px_#ff003c]"
            }`}
          >
            {toast.title}
          </h4>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#8892b0] hover:text-white transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[11px] font-bold text-slate-200 mt-0.5">{toast.message}</p>
        <span className="text-[9px] text-[#8892b0] mt-1 block">Exibindo por 5s</span>
      </div>
    </div>
  );
}
