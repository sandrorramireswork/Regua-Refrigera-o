import React from "react";
import { Crosshair, Radio, Zap, ShieldCheck } from "lucide-react";
import { CYBER_REDS } from "@/lib/cyber-balistica-engine";

interface CyberStickyHeaderProps {
  alvosProvaveis: number[];
  ultimoNumero: number | null | undefined;
  onSelectAlvo?: ((num: number) => void) | undefined;
}

export function CyberStickyHeader({
  alvosProvaveis,
  ultimoNumero,
  onSelectAlvo,
}: CyberStickyHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#08f7fe]/40 bg-[#050507]/90 backdrop-blur-xl shadow-[0_4px_25px_rgba(8,247,254,0.2)]">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-3 px-3 py-3 sm:px-6">
        {/* BARRA SUPERIOR: IDENTIFICAÇÃO E STATUS */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#08f7fe] bg-[#08f7fe]/10 text-[#08f7fe] shadow-[0_0_15px_rgba(8,247,254,0.6)]">
              <Crosshair className="h-5 w-5 animate-spin" style={{ animationDuration: "16s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm sm:text-base font-black uppercase tracking-wider text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                  ZONA ALVO BALÍSTICA <span className="text-[#08f7fe]">|</span> SINAL EXPERT
                </h1>
                <span className="hidden xs:inline-flex items-center gap-1 rounded border border-[#08f7fe]/60 bg-[#08f7fe]/10 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#08f7fe] shadow-[0_0_10px_rgba(8,247,254,0.4)]">
                  <Radio className="h-3 w-3 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#8892b0]">
                Projeção balística de alta densidade · Rotor Europeu 37 Casas
              </p>
            </div>
          </div>

          {/* TELEMETRIA DO ÚLTIMO NÚMERO */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0d0f12] px-3 py-1.5 shadow-inner">
              <span className="font-mono text-[10px] font-bold uppercase text-[#8892b0]">
                ÚLTIMO REGISTRADO:
              </span>
              {ultimoNumero !== null && ultimoNumero !== undefined ? (
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black shadow-md ${
                    ultimoNumero === 0
                      ? "bg-[#00E676] text-white border-2 border-[#00FF88] shadow-[0_0_12px_#00FF88]"
                      : CYBER_REDS.includes(ultimoNumero)
                      ? "bg-[#FF003C] text-white border-2 border-[#FF003C] shadow-[0_0_14px_rgba(255,0,60,0.85)]"
                      : "bg-[#000000] text-white border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                  }`}
                >
                  {ultimoNumero}
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-[#8892b0]">--</span>
              )}
            </div>
          </div>
        </div>

        {/* GRID CENTRALIZADO: 10 BLOCOS DE NÚMEROS PROVÁVEIS EM AZUL CYAN NEON */}
        <div className="flex flex-col items-center justify-center">
          <div className="mb-1.5 flex items-center gap-2 text-center">
            <Zap className="h-3.5 w-3.5 text-[#08f7fe] animate-pulse" />
            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#8892b0]">
              10 NÚMEROS PROVÁVEIS PROJETADOS NO CILINDRO
            </span>
          </div>

          <div className="grid w-full max-w-4xl grid-cols-5 sm:grid-cols-10 gap-2">
            {alvosProvaveis.map((num, idx) => {
              return (
                <button
                  key={`alvo-prov-${num}-${idx}`}
                  type="button"
                  onClick={() => onSelectAlvo?.(num)}
                  title={`Número Provável ${num} · Clique para registrar`}
                  className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-[#08f7fe] bg-[#08f7fe]/10 p-2 transition-all duration-200 hover:scale-110 hover:bg-[#08f7fe]/25 cursor-pointer shadow-[0_0_16px_rgba(8,247,254,0.7),inset_0_0_10px_rgba(8,247,254,0.3)] hover:shadow-[0_0_24px_rgba(8,247,254,0.95),inset_0_0_14px_rgba(8,247,254,0.5)]"
                >
                  <span className="font-mono text-[8px] font-black uppercase text-[#08f7fe]/80 tracking-tighter">
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-[#08f7fe] drop-shadow-[0_0_10px_#08f7fe]">
                    {num}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
