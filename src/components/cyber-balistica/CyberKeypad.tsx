import React, { useState, useMemo, useRef, useEffect } from "react";
import { CornerDownLeft, ShieldAlert, Sliders, ZoomIn, GripHorizontal, SlidersHorizontal } from "lucide-react";
import { AntiTiltBehavioralProxy } from "@/lib/quantitative-terminal-engine";
import { REDS, VOISINS, TIERS, ORPHELINS, vizinhos, getProps, type Spin } from "@/lib/roulette";
import { calculateBallisticFavorites } from "@/lib/ballistic-favorites";

export interface CyberKeypadProps {
  onConfirm: (num: number) => void;
  onUndo?: (() => void) | undefined;
  disabled?: boolean | undefined;
  onTiltTriggered?: () => void;
  rodadas?: (number | Spin)[] | undefined;
  numeros?: number[] | undefined;
  spins?: Spin[] | undefined;
}

export function CyberKeypad({
  onConfirm,
  onUndo,
  disabled = false,
  onTiltTriggered,
  rodadas,
  numeros,
  spins,
}: CyberKeypadProps) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [errorShake, setErrorShake] = useState<boolean>(false);

  // Controle de tamanho manual do teclado (escala 70% a 140%)
  const [escala, setEscala] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const saved = localStorage.getItem("cyber-keypad-escala");
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 70 && val <= 140) return val;
    }
    return 100;
  });
  const [mostrarControleTamanho, setMostrarControleTamanho] = useState<boolean>(false);

  const handleUpdateEscala = (novaEscala: number) => {
    const clamped = Math.max(70, Math.min(140, novaEscala));
    setEscala(clamped);
    localStorage.setItem("cyber-keypad-escala", String(clamped));
  };

  // Arraste manual da borda superior / inferior para redimensionar o teclado
  const [isDraggingBorder, setIsDraggingBorder] = useState<"top" | "bottom" | null>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartEscalaRef = useRef<number>(100);

  const handleStartDragBorder = (pos: "top" | "bottom", clientY: number) => {
    setIsDraggingBorder(pos);
    dragStartYRef.current = clientY;
    dragStartEscalaRef.current = escala;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!isDraggingBorder) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = isDraggingBorder === "top"
        ? (dragStartYRef.current - e.clientY)
        : (e.clientY - dragStartYRef.current);
      const novaEscala = Math.max(70, Math.min(140, Math.round(dragStartEscalaRef.current + delta * 0.4)));
      setEscala(novaEscala);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const delta = isDraggingBorder === "top"
          ? (dragStartYRef.current - e.touches[0]!.clientY)
          : (e.touches[0]!.clientY - dragStartYRef.current);
        const novaEscala = Math.max(70, Math.min(140, Math.round(dragStartEscalaRef.current + delta * 0.4)));
        setEscala(novaEscala);
      }
    };

    const handleEndDrag = () => {
      setIsDraggingBorder(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("cyber-keypad-escala", String(escala));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEndDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEndDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEndDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEndDrag);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingBorder, escala]);

  // Extrai lista unificada das últimas rodadas para a tarja amarelo neon
  const listaRodadas: number[] = useMemo(() => {
    if (numeros && numeros.length > 0) return numeros;
    if (rodadas && rodadas.length > 0) {
      return rodadas.map((r) => (typeof r === "number" ? r : r.num));
    }
    if (spins && spins.length > 0) {
      return spins.map((s) => s.num);
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("roleta-spins-v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed
              .map((p: any) => (typeof p.number === "number" ? p.number : p.num))
              .filter((n: any): n is number => typeof n === "number" && n >= 0 && n <= 36);
          }
        }
      } catch {
        /* fallback */
      }
    }
    return [];
  }, [numeros, rodadas, spins]);

  // Identifica a letra do setor na roleta europeia: V (Voisins), T (Tiers), O (Orphelins)
  const getSetorLetra = (num: number): "V" | "T" | "O" => {
    if (TIERS.includes(num)) return "T";
    if (ORPHELINS.includes(num)) return "O";
    return "V";
  };

  const spinsFormatados = useMemo<Spin[]>(() => {
    if (spins && spins.length > 0) return spins;
    return listaRodadas.map((num, idx) => ({
      id: `cyber-spin-${idx}-${num}`,
      num,
      props: getProps(num),
      createdAt: new Date().toISOString(),
    }));
  }, [spins, listaRodadas]);

  // 1. Motor Balístico: calcula qual número está mais forte pra sair
  const ballisticAnalysis = useMemo(() => {
    return calculateBallisticFavorites(spinsFormatados);
  }, [spinsFormatados]);
  const numeroMaisForte = ballisticAnalysis?.numbers?.[0] ?? null;

  // 2. Motor de Puxadas: calcula quais números o último número mais puxa no histórico
  const ultimoNumeroNum = listaRodadas[0] ?? null;
  const puxadasDoUltimo = useMemo(() => {
    if (ultimoNumeroNum === null || listaRodadas.length < 2) {
      return [26, 32, 15];
    }
    const counts = new Map<number, number>();
    for (let i = listaRodadas.length - 1; i > 0; i--) {
      if (listaRodadas[i] === ultimoNumeroNum) {
        const destino = listaRodadas[i - 1]!;
        counts.set(destino, (counts.get(destino) ?? 0) + 1);
      }
    }
    const ordenados = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ordenados.length > 0) {
      return ordenados.slice(0, 3).map(([n]) => n);
    }
    return vizinhos(ultimoNumeroNum, 1).filter((n) => n !== ultimoNumeroNum).slice(0, 3);
  }, [listaRodadas, ultimoNumeroNum]);

  // Cálculos dinâmicos de dimensões proporcionais à escala escolhida manualmente
  const scaleFactor = escala / 100;
  const btnHeight = Math.round(52 * scaleFactor);
  const btnFontSize = Math.max(14, Math.round(18 * scaleFactor));
  const visorHeight = Math.round(60 * scaleFactor);
  const visorFontSize = Math.max(22, Math.round(34 * scaleFactor));
  const gridGap = Math.max(6, Math.round(10 * scaleFactor));
  const dynamicBtnStyle = { height: `${btnHeight}px`, fontSize: `${btnFontSize}px` };

  // Digitação de números (0 a 9) com verificação do Proxy Anti-Tilt
  const handleDigit = (digit: string) => {
    // Registra clique no proxy comportamental Anti-Tilt
    const tiltCheck = AntiTiltBehavioralProxy.recordKeypadClick();
    if (tiltCheck.triggered) {
      onTiltTriggered?.();
      triggerError();
      return;
    }

    if (disabled || AntiTiltBehavioralProxy.getStatus().isActive) return;

    // Se visor estiver vazio
    if (displayValue === "") {
      setDisplayValue(digit);
      return;
    }

    // Se já tem 1 dígito, tenta formar o segundo dígito
    if (displayValue.length === 1) {
      const nextCandidate = displayValue + digit;
      const parsed = parseInt(nextCandidate, 10);

      // Regra obrigatória: limite de 2 dígitos e máximo valor 36
      if (parsed <= 36) {
        setDisplayValue(nextCandidate);
      } else {
        // Se ultrapassar 36, dispara feedback tático
        triggerError();
      }
    }
  };

  // Tecla C (Amarelo) para Limpar
  const handleClear = () => {
    const tiltCheck = AntiTiltBehavioralProxy.recordKeypadClick();
    if (tiltCheck.triggered) {
      onTiltTriggered?.();
      return;
    }
    setDisplayValue("");
  };

  // Tecla ENT (Vermelho) para Confirmar
  const handleEnter = () => {
    const tiltCheck = AntiTiltBehavioralProxy.recordKeypadClick();
    if (tiltCheck.triggered) {
      onTiltTriggered?.();
      triggerError();
      return;
    }

    if (disabled || AntiTiltBehavioralProxy.getStatus().isActive || displayValue === "") {
      triggerError();
      return;
    }

    const num = parseInt(displayValue, 10);
    if (!isNaN(num) && num >= 0 && num <= 36) {
      onConfirm(num);
      setDisplayValue("");
    } else {
      triggerError();
    }
  };

  const triggerError = () => {
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 400);
  };

  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0d0f12] p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] font-mono w-full">
      {/* BADGE FLUTUANTE HUD AO ARRASTAR AS BORDAS */}
      {isDraggingBorder && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex items-center gap-2 rounded-full border-2 border-yellow-400 bg-black/95 px-3 py-1 font-mono text-xs font-black text-yellow-300 shadow-[0_0_18px_rgba(255,255,0,0.85)] animate-pulse">
          <SlidersHorizontal className="h-3.5 w-3.5 text-yellow-400" />
          <span>AJUSTANDO BORDA: {escala}%</span>
        </div>
      )}

      {/* BORDA SUPERIOR TÁTIL DE AJUSTE MANUAL DE TAMANHO */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          handleStartDragBorder("top", e.clientY);
        }}
        onTouchStart={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (e.touches.length > 0) handleStartDragBorder("top", e.touches[0]!.clientY);
        }}
        title="Arraste esta borda superior para cima/baixo para ajustar o tamanho do teclado"
        className={`w-full -mt-4 mb-3 flex h-7 cursor-ns-resize items-center justify-between px-2.5 rounded-t-2xl border-b transition-all select-none ${
          isDraggingBorder === "top"
            ? "bg-yellow-400/25 border-yellow-400 shadow-[0_0_14px_#FFFF00]"
            : "bg-cyan-950/60 border-cyan-500/30 hover:bg-cyan-900/60 hover:border-cyan-400"
        }`}
      >
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleUpdateEscala(escala - 5)}
            disabled={escala <= 70}
            className="flex h-4.5 w-5 items-center justify-center rounded border border-white/20 bg-black/60 font-mono text-[10px] font-black text-white hover:bg-cyan-500/20 disabled:opacity-30 cursor-pointer"
            title="Diminuir teclado (-5%)"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => handleUpdateEscala(escala + 5)}
            disabled={escala >= 140}
            className="flex h-4.5 w-5 items-center justify-center rounded border border-white/20 bg-black/60 font-mono text-[10px] font-black text-white hover:bg-cyan-500/20 disabled:opacity-30 cursor-pointer"
            title="Aumentar teclado (+5%)"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-cyan-200 pointer-events-none">
          <span className="text-yellow-400 animate-pulse font-bold">▲</span>
          <span>ARRASTE A BORDA P/ AJUSTAR</span>
          <span className="text-yellow-400 animate-pulse font-bold">▼</span>
          <span className="rounded bg-black/90 px-1.5 py-0.5 text-yellow-300 border border-yellow-400/50 font-mono text-[9px]">
            {escala}%
          </span>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {escala !== 100 && (
            <button
              type="button"
              onClick={() => handleUpdateEscala(100)}
              className="px-1 py-0.5 rounded border border-white/20 bg-black/60 font-mono text-[8px] text-slate-300 hover:text-white cursor-pointer"
              title="Restaurar tamanho 100%"
            >
              100%
            </button>
          )}
          <GripHorizontal className="h-3.5 w-3.5 text-cyan-400 opacity-70" />
        </div>
      </div>

      {/* HEADER TÁTICO COM CONTROLE MANUAL DE TAMANHO */}
      <div className="mb-2.5 flex w-full items-center justify-between border-b border-white/10 pb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#8892b0]">
          TECLADO DIGITAL TÁTICO
        </span>

        <div className="flex items-center gap-1.5">
          {/* BOTÃO PARA AJUSTE MANUAL DE TAMANHO */}
          <button
            type="button"
            onClick={() => setMostrarControleTamanho((v) => !v)}
            title="Ajustar tamanho manualmente do teclado"
            aria-label="Ajustar tamanho do teclado"
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black uppercase transition-all cursor-pointer border ${
              mostrarControleTamanho || escala !== 100
                ? "border-[#08f7fe] bg-[#08f7fe]/20 text-[#08f7fe] shadow-[0_0_8px_rgba(8,247,254,0.4)]"
                : "border-white/15 bg-white/5 text-slate-300 hover:text-white hover:border-white/30"
            }`}
          >
            <Sliders className="h-3 w-3" />
            <span>Tam: {escala}%</span>
          </button>

          <span className="text-[10px] font-bold text-[#ff003c] flex items-center gap-1">
            MAX: 36
          </span>
        </div>
      </div>

      {/* PAINEL DE CONTROLE MANUAL DE TAMANHO (EXPANSÍVEL) */}
      {mostrarControleTamanho && (
        <div className="w-full mb-3 rounded-xl border border-[#08f7fe]/40 bg-black/90 p-2.5 shadow-[0_0_20px_rgba(8,247,254,0.25)] flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5 text-[#08f7fe]" />
              AJUSTE DE TAMANHO MANUAL:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[#08f7fe] text-xs">{escala}%</span>
              {escala !== 100 && (
                <button
                  type="button"
                  onClick={() => handleUpdateEscala(100)}
                  className="text-[8.5px] text-slate-400 hover:text-white underline cursor-pointer"
                  title="Restaurar tamanho 100%"
                >
                  Resetar 100%
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateEscala(escala - 5)}
              disabled={escala <= 70}
              className="flex h-6 w-7 items-center justify-center rounded bg-white/10 text-white font-bold hover:bg-[#08f7fe]/30 disabled:opacity-30 cursor-pointer"
              title="Diminuir teclado"
            >
              -
            </button>
            <input
              type="range"
              min={70}
              max={140}
              step={5}
              value={escala}
              onChange={(e) => handleUpdateEscala(Number(e.target.value))}
              className="h-1.5 flex-1 accent-[#08f7fe] cursor-pointer"
              aria-label="Controle deslizante de tamanho do teclado"
            />
            <button
              type="button"
              onClick={() => handleUpdateEscala(escala + 5)}
              disabled={escala >= 140}
              className="flex h-6 w-7 items-center justify-center rounded bg-white/10 text-white font-bold hover:bg-[#08f7fe]/30 disabled:opacity-30 cursor-pointer"
              title="Aumentar teclado"
            >
              +
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[8.5px]">
            <span className="text-slate-400 uppercase">Presets rápidos:</span>
            <div className="flex gap-1">
              {[80, 90, 100, 110, 125].map((preset) => (
                <button
                  key={`cyber-preset-${preset}`}
                  type="button"
                  onClick={() => handleUpdateEscala(preset)}
                  className={`rounded px-1.5 py-0.5 font-black cursor-pointer border ${
                    escala === preset
                      ? "border-[#08f7fe] bg-[#08f7fe] text-black font-black"
                      : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TARJA AMARELO NEON FIXA NO TECLADO COM CORES, SETORES (V/T/O), MAIS FORTE E PUXADAS */}
      <div className="w-full mb-3 overflow-hidden rounded-xl border-2 border-black/80 bg-[#FFFF00] shadow-[0_0_22px_rgba(255,255,0,0.75),inset_0_0_10px_rgba(255,255,255,0.4)] select-none">
        {/* BARRA SUPERIOR DA TARJA: TÍTULO, NÚMERO MAIS FORTE & NÚMEROS PUXADOS */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#FFEE00] border-b border-black/20">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-black animate-ping" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-black font-mono flex items-center gap-1">
              ⚡ ÚLTIMAS RODADAS
            </span>
          </div>

          {/* DESTAQUES OPERACIONAIS: MAIS FORTE PRA SAIR & PUXADAS */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* NÚMERO MAIS FORTE PRA SAIR */}
            {numeroMaisForte && (
              <div
                className="flex items-center gap-1 rounded-md bg-black px-2 py-0.5 shadow-sm text-[9.5px] font-mono border border-black/80"
                title={`Número estatisticamente mais forte para o próximo giro: ${numeroMaisForte.num} (${numeroMaisForte.justificativa})`}
              >
                <span className="text-[#FFFF00] font-black uppercase text-[8px] sm:text-[8.5px]">
                  🔥 MAIS FORTE:
                </span>
                <span
                  className={`font-black px-1.5 py-0.2 rounded text-[10px] leading-tight ${
                    numeroMaisForte.cor === "red"
                      ? "bg-[#FF003C] text-white"
                      : numeroMaisForte.cor === "green"
                      ? "bg-[#00E676] text-black"
                      : "bg-[#16181e] text-white border border-white/50"
                  }`}
                >
                  {numeroMaisForte.num}
                  <small className="ml-0.5 text-[8px] opacity-90 font-extrabold">
                    {getSetorLetra(numeroMaisForte.num)}
                  </small>
                </span>
                <span className="text-[#FFFF00] text-[8.5px] font-black">
                  {Number(numeroMaisForte.score).toFixed(1)}%
                </span>
              </div>
            )}

            {/* NÚMEROS QUE O ÚLTIMO SORTEADO PUXA */}
            {puxadasDoUltimo.length > 0 && ultimoNumeroNum !== null && (
              <div
                className="flex items-center gap-1 rounded-md bg-black/90 px-2 py-0.5 text-[9.5px] font-mono text-white border border-black/60"
                title={`Transições históricas: números que o último sorteado (${ultimoNumeroNum}) mais atrai/puxa`}
              >
                <span className="text-[#FFFF00] font-bold uppercase text-[8px] sm:text-[8.5px]">
                  🧲 PUXA ({ultimoNumeroNum}):
                </span>
                <div className="flex items-center gap-0.5">
                  {puxadasDoUltimo.map((pNum) => {
                    const pCor = pNum === 0 ? "green" : REDS.includes(pNum) ? "red" : "black";
                    return (
                      <span
                        key={`cyber-puxa-${pNum}`}
                        className={`font-black px-1 py-0.2 rounded text-[9px] leading-tight ${
                          pCor === "red"
                            ? "bg-[#FF003C] text-white"
                            : pCor === "green"
                            ? "bg-[#00E676] text-black"
                            : "bg-zinc-800 text-white border border-white/30"
                        }`}
                        title={`Puxado por ${ultimoNumeroNum}: ${pNum} (${getSetorLetra(pNum)})`}
                      >
                        {pNum}
                        <small className="ml-0.5 text-[7px] opacity-80">{getSetorLetra(pNum)}</small>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <span className="text-[9px] font-black text-black/85 font-mono shrink-0">
              {listaRodadas.length > 0 ? `${listaRodadas.length} giros` : "0 giros"}
            </span>
          </div>
        </div>

        {/* FITA HORIZONTAL DESLIZANTE: CORES REAIS DA ROLETA + LETRA DO SETOR (V/T/O) */}
        <div className="flex items-center gap-1.5 px-2 py-2 overflow-x-auto no-scrollbar bg-[#FFFF00]">
          {listaRodadas.length === 0 ? (
            <span className="text-[10px] font-black text-black/70 py-1 font-mono">
              Nenhuma rodada registrada ainda
            </span>
          ) : (
            listaRodadas.slice(0, 35).map((num, idx) => {
              const cor = num === 0 ? "green" : REDS.includes(num) ? "red" : "black";
              const setorLetra = getSetorLetra(num);
              const isUltimo = idx === 0;

              let corBadge = "";
              if (cor === "green") {
                corBadge =
                  "bg-gradient-to-b from-[#00E676] to-[#009624] text-black border-2 border-[#00c853] shadow-[0_0_8px_rgba(0,230,118,0.7)]";
              } else if (cor === "red") {
                corBadge =
                  "bg-gradient-to-b from-[#FF1744] to-[#C51162] text-white border-2 border-[#FF003C] shadow-[0_0_8px_rgba(255,0,60,0.6)]";
              } else {
                corBadge =
                  "bg-gradient-to-b from-[#212121] to-[#000000] text-white border-2 border-white/70 shadow-[0_0_8px_rgba(0,0,0,0.85)]";
              }

              return (
                <div
                  key={`cyber-rodada-neon-${idx}-${num}`}
                  className={`relative flex flex-col items-center justify-center shrink-0 min-w-[34px] sm:min-w-[38px] h-10 px-1 rounded-lg font-mono font-black transition-all cursor-default select-none ${corBadge} ${
                    isUltimo ? "ring-2 ring-black scale-105 z-10 shadow-[0_0_12px_rgba(0,0,0,0.9)]" : ""
                  }`}
                  title={`Rodada #${listaRodadas.length - idx}: ${num} (${cor.toUpperCase()}) · Setor: ${
                    setorLetra === "V"
                      ? "Voisins du Zéro"
                      : setorLetra === "T"
                      ? "Tiers du Cylindre"
                      : "Orphelins"
                  }${isUltimo ? " [ÚLTIMO REGISTRADO]" : ""}`}
                >
                  {/* TAG DE 1º GIRO REGISTRADO */}
                  {isUltimo && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center rounded bg-black px-1 text-[7px] font-black uppercase text-[#FFFF00] border border-[#FFFF00] shadow leading-tight">
                      1º
                    </span>
                  )}

                  {/* NÚMERO COM A COR REAL DA ROLETA */}
                  <span
                    className={`text-xs sm:text-sm font-black leading-none ${
                      cor === "green"
                        ? "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
                        : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    }`}
                  >
                    {num}
                  </span>

                  {/* LETRA DO SETOR (V / T / O) */}
                  <span
                    className={`mt-0.5 text-[7.5px] font-black leading-none uppercase tracking-tight rounded-xs px-1 ${
                      cor === "green"
                        ? "bg-black/20 text-black"
                        : setorLetra === "V"
                        ? "bg-cyan-950/80 text-cyan-300 border border-cyan-400/40"
                        : setorLetra === "T"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-400/40"
                        : "bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-400/40"
                    }`}
                  >
                    {setorLetra}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* VISOR AGRESSIVO EM VERMELHO NEON VIBRANTE */}
      <div
        style={{ height: `${visorHeight}px` }}
        className={`relative mb-3 flex w-full items-center justify-center rounded-xl border-2 border-[#ff003c] bg-gradient-to-b from-[#1a0006] to-[#070002] transition-all duration-200 ${
          errorShake
            ? "animate-shake border-white shadow-[0_0_30px_#ff003c]"
            : "shadow-[0_0_20px_rgba(255,0,60,0.65),inset_0_0_12px_rgba(255,0,60,0.35)]"
        }`}
      >
        <span className="absolute left-3 top-1 text-[9px] font-black uppercase text-[#ff003c]/70 tracking-widest">
          DIGIT INPUT
        </span>
        <div
          style={{ fontSize: `${visorFontSize}px` }}
          className="font-black tracking-widest text-[#ff003c] drop-shadow-[0_0_15px_#ff003c]"
        >
          {displayValue === "" ? (
            <span className="animate-pulse text-[#ff003c]/40 font-mono">__</span>
          ) : (
            displayValue
          )}
        </div>
      </div>

      {/* GRADE DO TECLADO: 1 a 9, C, 0, ENT COM ESCALA MANUAL DINÂMICA */}
      <div className="grid w-full grid-cols-3" style={{ gap: `${gridGap}px` }}>
        {/* Linha 1 */}
        {["1", "2", "3"].map((d) => (
          <button
            key={`btn-num-${d}`}
            type="button"
            onClick={() => handleDigit(d)}
            style={dynamicBtnStyle}
            className="flex items-center justify-center rounded-xl border-2 border-[#ff003c]/80 bg-[#ff003c]/10 font-black text-[#ff003c] transition-all hover:scale-105 hover:bg-[#ff003c]/25 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.4),inset_0_0_6px_rgba(255,0,60,0.2)] hover:shadow-[0_0_20px_rgba(255,0,60,0.8)]"
          >
            {d}
          </button>
        ))}

        {/* Linha 2 */}
        {["4", "5", "6"].map((d) => (
          <button
            key={`btn-num-${d}`}
            type="button"
            onClick={() => handleDigit(d)}
            style={dynamicBtnStyle}
            className="flex items-center justify-center rounded-xl border-2 border-[#ff003c]/80 bg-[#ff003c]/10 font-black text-[#ff003c] transition-all hover:scale-105 hover:bg-[#ff003c]/25 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.4),inset_0_0_6px_rgba(255,0,60,0.2)] hover:shadow-[0_0_20px_rgba(255,0,60,0.8)]"
          >
            {d}
          </button>
        ))}

        {/* Linha 3 */}
        {["7", "8", "9"].map((d) => (
          <button
            key={`btn-num-${d}`}
            type="button"
            onClick={() => handleDigit(d)}
            style={dynamicBtnStyle}
            className="flex items-center justify-center rounded-xl border-2 border-[#ff003c]/80 bg-[#ff003c]/10 font-black text-[#ff003c] transition-all hover:scale-105 hover:bg-[#ff003c]/25 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.4),inset_0_0_6px_rgba(255,0,60,0.2)] hover:shadow-[0_0_20px_rgba(255,0,60,0.8)]"
          >
            {d}
          </button>
        ))}

        {/* Linha 4: C (Amarelo), 0 (Vermelho), ENT (Vermelho Vibrante) */}
        <button
          type="button"
          onClick={handleClear}
          title="Limpar visor"
          style={dynamicBtnStyle}
          className="flex items-center justify-center rounded-xl border-2 border-[#facc15] bg-[#facc15]/15 font-black text-[#facc15] transition-all hover:scale-105 hover:bg-[#facc15]/30 active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.65),inset_0_0_8px_rgba(250,204,21,0.3)] hover:shadow-[0_0_24px_rgba(250,204,21,0.9)]"
        >
          C
        </button>

        <button
          type="button"
          onClick={() => handleDigit("0")}
          style={dynamicBtnStyle}
          className="flex items-center justify-center rounded-xl border-2 border-[#ff003c]/80 bg-[#ff003c]/10 font-black text-[#ff003c] transition-all hover:scale-105 hover:bg-[#ff003c]/25 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(255,0,60,0.4),inset_0_0_6px_rgba(255,0,60,0.2)] hover:shadow-[0_0_20px_rgba(255,0,60,0.8)]"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleEnter}
          title="Confirmar número (ENT)"
          style={dynamicBtnStyle}
          className="flex items-center justify-center gap-1 rounded-xl border-2 border-[#ff003c] bg-[#ff003c] font-black text-white transition-all hover:scale-105 hover:bg-[#ff1f54] active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,0,60,0.8),inset_0_0_10px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_#ff003c]"
        >
          <span>ENT</span>
          <CornerDownLeft className="h-4 w-4" />
        </button>
      </div>

      {/* STATUS DO PROXY ANTI-TILT */}
      <div className="mt-3 flex w-full items-center justify-between border-t border-white/5 pt-2 text-[9px] text-[#8892b0]">
        <span className="flex items-center gap-1 text-sky-400 font-bold">
          <ShieldAlert className="h-3 w-3 text-sky-400" />
          FILTRO ANTI-TILT:
        </span>
        <span className="text-[#8892b0]">
          {AntiTiltBehavioralProxy.getStatus().isActive ? (
            <strong className="text-rose-400 animate-pulse">BLOQUEADO (60s)</strong>
          ) : (
            <strong className="text-[#00FF88]">MONITORANDO CADÊNCIA</strong>
          )}
        </span>
      </div>

      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 py-1.5 font-mono text-[10px] font-bold text-[#8892b0] transition hover:border-[#08f7fe]/50 hover:text-[#08f7fe] cursor-pointer"
        >
          ↺ Desfazer Último Giro
        </button>
      )}

      {/* BORDA INFERIOR TÁTIL DE AJUSTE MANUAL */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          handleStartDragBorder("bottom", e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) handleStartDragBorder("bottom", e.touches[0]!.clientY);
        }}
        title="Arraste esta borda para baixo/cima para ajustar o tamanho do teclado"
        className={`w-full -mb-4 mt-3 flex h-6 cursor-ns-resize items-center justify-center rounded-b-2xl border-t transition-all select-none ${
          isDraggingBorder === "bottom"
            ? "bg-yellow-400/25 border-yellow-400 shadow-[0_0_14px_#FFFF00]"
            : "bg-cyan-950/40 border-cyan-500/20 hover:bg-cyan-900/60 hover:border-cyan-400"
        }`}
      >
        <div className="flex items-center gap-2 opacity-70">
          <span className="block h-0.5 w-6 sm:w-10 bg-cyan-400 rounded-full" />
          <span className="font-mono text-[8.5px] font-bold text-cyan-300 tracking-wider">▲ ARRASTE A BORDA P/ AJUSTAR TAMANHO ▼</span>
          <span className="block h-0.5 w-6 sm:w-10 bg-cyan-400 rounded-full" />
        </div>
      </div>
    </div>
  );
}
