import { getProps, type Spin } from "@/lib/roulette";
import { RotateCcw, Zap, Trophy, AlertOctagon, Flame } from "lucide-react";

const NUMS = Array.from({ length: 37 }, (_, i) => i);

export interface KeypadProps {
  onPick: (n: number) => void;
  onUndo?: (() => void) | undefined;
  spins?: Spin[] | undefined;
  compact?: boolean | undefined;
  escala?: number | undefined;
  onToggleDrag?: (() => void) | undefined;
  isDragging?: boolean | undefined;
}

export function Keypad({
  onPick,
  onUndo,
  spins,
  compact = false,
  escala = 100,
  onToggleDrag,
  isDragging = false,
}: KeypadProps) {
  const ultimo0 = spins?.[0]?.num;
  const ultimo1 = spins?.[1]?.num;
  const ultimo2 = spins?.[2]?.num;

  const scaleFactor = (escala ?? 100) / 100;
  const baseH = compact ? 34 : 42;
  const heightPx = Math.round(baseH * scaleFactor);
  const fontSizePx = Math.max(11, Math.round((compact ? 13 : 16) * scaleFactor));
  const gapPx = Math.max(4, Math.round(7 * scaleFactor));
  const dynamicBtnStyle = { height: `${heightPx}px`, fontSize: `${fontSizePx}px` };

  const heightClass = compact ? "h-8 sm:h-9" : "h-9 sm:h-10 md:h-11";

  return (
    <div
      className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full select-none"
      style={{ gap: `${gapPx}px` }}
      role="group"
      aria-label="Teclado numérico da roleta com 5 números por linha começando no zero"
    >
      {NUMS.map((n) => {
        const props = getProps(n);
        const isZero = n === 0;
        const isRed = props.cor === "red";

        const is1st = ultimo0 === n;
        const is2nd = ultimo1 === n && !is1st;
        const is3rd = ultimo2 === n && !is1st && !is2nd;

        let corClass = "";
        let ringGlow = "";

        if (isZero) {
          corClass =
            "bg-gradient-to-b from-[#00E676] via-[#00c853] to-[#009624] text-black font-black border-2 border-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.7),inset_0_0_8px_rgba(255,255,255,0.4)] hover:brightness-115";
        } else if (isRed) {
          corClass =
            "bg-[#FF003C] text-white font-black border-2 border-[#FF003C] shadow-[0_0_16px_rgba(255,0,60,0.85),inset_0_0_8px_rgba(255,255,255,0.3)] hover:brightness-125";
        } else {
          corClass =
            "bg-[#000000] text-white font-black border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.75),inset_0_0_6px_rgba(255,255,255,0.2)] hover:border-[#08f7fe]";
        }

        if (is1st) {
          ringGlow =
            "ring-2 sm:ring-3 ring-cyan-300 shadow-[0_0_20px_#00FFFF,0_0_36px_rgba(0,255,255,0.6)] scale-105 z-20";
        } else if (is2nd) {
          ringGlow =
            "ring-2 ring-amber-400 shadow-[0_0_16px_#FFD600,0_0_24px_rgba(255,214,0,0.5)] scale-102 z-10";
        } else if (is3rd) {
          ringGlow =
            "ring-2 ring-fuchsia-400 shadow-[0_0_14px_#FF10F0,0_0_20px_rgba(255,16,240,0.5)] scale-101 z-10";
        }

        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            style={dynamicBtnStyle}
            aria-label={`Registrar número ${n} (${isZero ? "Zero" : isRed ? "Vermelho" : "Preto"})`}
            className={`group relative flex ${heightClass} w-full items-center justify-center rounded-lg font-mono text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer active:scale-90 ${corClass} ${ringGlow}`}
          >
            {/* Número em destaque tático */}
            <span
              className={
                isZero
                  ? "text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
                  : "text-white text-stroke-black-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              }
            >
              {n}
            </span>

            {/* Badge indicador de 1º, 2º ou 3º último giro */}
            {is1st && (
              <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-black font-display text-[7.5px] font-black shadow-[0_0_8px_#00FFFF] animate-pulse">
                1º
              </span>
            )}
            {is2nd && (
              <span className="absolute -top-1.5 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-black font-display text-[7px] font-black shadow-[0_0_6px_#FFD600]">
                2º
              </span>
            )}
            {is3rd && (
              <span className="absolute -top-1.5 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-fuchsia-500 text-white font-display text-[7px] font-black shadow-[0_0_6px_#FF10F0]">
                3º
              </span>
            )}

            {/* Micro tag sutil de setor no canto inferior */}
            {props.setor !== "—" && (
              <span className="absolute bottom-0.5 right-1 text-[7px] font-mono opacity-50 group-hover:opacity-100 transition-opacity">
                {props.setor.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        );
      })}

      {/* Botão de Modo Arrastar (No lugar do alvo de gestão) */}
      {onToggleDrag && (
        <button
          type="button"
          onClick={onToggleDrag}
          style={dynamicBtnStyle}
          aria-label={isDragging ? "Modo arrastar ativo" : "Ativar modo arrastar"}
          className={`${
            onUndo ? "col-span-2" : "col-span-3"
          } flex ${heightClass} items-center justify-center gap-1.5 px-2 rounded-lg font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
            isDragging
              ? "border-2 border-emerald-400 bg-emerald-950/80 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.5)] animate-pulse"
              : "border-2 border-cyan-500/50 bg-cyan-950/40 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)] hover:border-cyan-400 hover:text-white"
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className={`block h-1 w-4 rounded-full ${isDragging ? "bg-emerald-400" : "bg-cyan-400"}`} />
            <span className={`block h-1 w-4 rounded-full ${isDragging ? "bg-emerald-400" : "bg-cyan-400"}`} />
            <span className={`block h-1 w-4 rounded-full ${isDragging ? "bg-emerald-400" : "bg-cyan-400"}`} />
          </div>
          <span className="truncate ml-1">{isDragging ? "ARRASTAR: ON" : "MOVER GRID"}</span>
        </button>
      )}

      {/* Botão Desfazer */}
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          style={dynamicBtnStyle}
          aria-label="Desfazer último giro registrado"
          className={`${
            onToggleDrag ? "col-span-1" : "col-span-3"
          } flex ${heightClass} items-center justify-center gap-1 rounded-lg border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-950/90 via-black to-cyan-950/90 font-display text-xs sm:text-sm font-black uppercase tracking-wider text-neon-cyan shadow-[0_0_12px_rgba(0,255,255,0.25)] transition-all hover:border-cyan-400 hover:text-white hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] active:scale-95 cursor-pointer`}
        >
          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neon-cyan shrink-0" />
          <span className={`${onToggleDrag ? "hidden xs:inline" : ""} text-stroke-black-sm truncate`}>
            Desfazer
          </span>
        </button>
      )}
    </div>
  );
}
