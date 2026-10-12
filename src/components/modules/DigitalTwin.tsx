import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { 
  Power, Zap, Fan, ZoomIn, ZoomOut, BookOpen, Activity, 
  Sparkles, Award, Wrench, ShieldAlert, CheckCircle2, AlertTriangle, 
  TrendingUp, Layers, Lightbulb, Thermometer
} from "lucide-react";

export default function DigitalTwin() {
  const { 
    selectedRef: ref,
    pSuc, tSuc, pLiq, tLiq,
    setTSuc, setTLiq, setPSuc, setPLiq,
    pressureUnit, tempUnit, viewMode, expansion
  } = useAppContext();

  const [zoom, setZoom] = useState(1);
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2.4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.6));

  // Helper to get p in bar
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;

  // Raw saturation temps in C
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);
  
  // Convert to target temp unit
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;

  const realSC = Number((tCond - tLiq).toFixed(1));
  const realSH = Number((tSuc - tEvap).toFixed(1));
  
  const targetSHMin = expansion === "txv" ? 5 : 4;
  const targetSHMax = expansion === "txv" ? 7 : 8;
  const targetSCMin = 3;
  const targetSCMax = 5;

  const isSHNormal = realSH >= targetSHMin && realSH <= targetSHMax;
  const isSHHigh = realSH > targetSHMax;
  const isSHLow = realSH < targetSHMin;
  const isSCNormal = realSC >= targetSCMin && realSC <= targetSCMax;
  const isSCHigh = realSC > targetSCMax;
  const isSCLow = realSC < targetSCMin;

  let shortStatus = "OPERAÇÃO NOMINAL (EQUILIBRADO)";
  let statusColor = "#22c55e"; // green
  if (isSHHigh && isSCLow) { shortStatus = "SUBCARGA (FALTA DE FLUIDO)"; statusColor = "#f97316"; }
  else if (isSHLow && isSCHigh) { shortStatus = "EXCESSO DE FLUIDO (SOBRECARGA)"; statusColor = "#ef4444"; }
  else if (isSHHigh && isSCHigh) { shortStatus = "RESTRIÇÃO NA LINHA / EXPANSÃO"; statusColor = "#ef4444"; }
  else if (isSHLow && isSCLow) { shortStatus = "BAIXA EVAPORAÇÃO / AR OBSTRUÍDO"; statusColor = "#eab308"; }
  else if (!isSHNormal && !isSCNormal) { shortStatus = "FALHA NO CICLO TÉRMICO"; statusColor = "#f97316"; }

  // Estimate TXV opening based on Superheat (Assume ~6K is 50% open)
  const openingPercent = Math.max(10, Math.min(100, 50 + (realSH - 6) * 8));

  // Estimate COP (Carnot Efficiency * 0.55 Isentropic approx)
  const T_evap_K = tEvapC + 273.15;
  const T_cond_K = tCondC + 273.15;
  const carnotCOP = T_cond_K > T_evap_K ? T_evap_K / (T_cond_K - T_evap_K) : 0;
  const estimatedCOP = Math.max(0.1, carnotCOP * 0.55);
  const compRatio = pLiqBar / (pSucBar || 0.1);
  const efeitoFrig = Math.max(10, 180 - (T_cond_K - T_evap_K));

  // ===== TEMPERATURAS DO GRÁFICO TÉRMICO (ALTA E BAIXA) =====
  const tAlta = Number((tCond + 30).toFixed(1));
  const tBaixa = Number(tSuc.toFixed(1));
  const deltaT = Number((tAlta - tBaixa).toFixed(1));

  // Normalização para a escala gráfica widescreen (-20°C a 100°C ou -4°F a 212°F)
  const scaleMin = tempUnit === "F" ? -4 : -20;
  const scaleMax = tempUnit === "F" ? 212 : 100;
  const span = scaleMax - scaleMin;
  const ratioBaixa = Math.max(0, Math.min(1, (tBaixa - scaleMin) / span));
  const ratioAlta = Math.max(0, Math.min(1, (tAlta - scaleMin) / span));

  // Coordenadas visuais da curva no espaço widescreen alargado (x: -120 a +120, y: -10 a +35)
  const yPosBaixa = 32 - (ratioBaixa * 42);
  const yPosAlta = 32 - (ratioAlta * 42);

  // Botão para aplicar o cenário de exemplo ideal: 74,9°C de Alta e 5,8°C de Baixa com SH e SC perfeitos
  const handleApplyExample = () => {
    setTSuc(5.8);
    if (pressureUnit === "psig") {
      setPSuc(102);
      setPLiq(376);
      setTLiq(40.0);
    } else {
      setPSuc(7.0);
      setPLiq(26.9);
      setTLiq(40.0);
    }
  };

  return (
    <div className="mx-auto space-y-6 sm:space-y-8 w-full max-w-7xl">
      
      {/* THE WIDESCREEN DIGITAL TWIN CANVAS WITH EXPANDED GRID */}
      <div className="relative glass-panel border border-white/10 rounded-2xl overflow-hidden bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        
        {/* Scrollable Canvas Viewport */}
        <div className="w-full aspect-[940/480] md:aspect-auto md:h-[560px] overflow-auto custom-scrollbar bg-[#050505]">
          <div className="flex min-w-full min-h-full w-max items-center justify-center p-3 md:p-6">
            <div 
              className="relative transition-all duration-300 transform-gpu flex-shrink-0" 
              style={{ width: `${940 * zoom}px`, height: `${480 * zoom}px` }}
            >
              
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/15 via-black to-black z-0 rounded-2xl"></div>
              
              {/* Central Grid Lines - High Tech Matrix */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none rounded-2xl" 
                style={{ 
                  backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.15) 1px, transparent 1px)', 
                  backgroundSize: '40px 40px' 
                }}
              ></div>

            <svg className="w-full h-full z-10 relative drop-shadow-2xl" viewBox="0 0 940 480" preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowOrange" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>

                {/* Compressor Original Green Gradient */}
                <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1b4332" />
                  <stop offset="50%" stopColor="#2d6a4f" />
                  <stop offset="100%" stopColor="#081c15" />
                </linearGradient>

                <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#8b6508" />
                </linearGradient>

                <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="50%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>

                {/* Thermal Curve Gradient */}
                <linearGradient id="thermalCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>

                {/* Thermal Area Fill Gradient */}
                <linearGradient id="thermalAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* ===== WIDESCREEN PIPES ===== */}
              
              {/* 1. DISCHARGE LINE (Red) */}
              <path d="M 120 220 L 120 70 L 330 70" fill="none" stroke="#ef4444" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowRed)"/>
              <path d="M 120 220 L 120 70 L 330 70" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow-fast" />

              {/* 2. LIQUID LINE (Orange) */}
              <path d="M 610 70 L 820 70 L 820 130" fill="none" stroke="#f97316" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowOrange)"/>
              <path d="M 610 70 L 820 70 L 820 130" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />
              
              <path d="M 820 210 L 820 250" fill="none" stroke="#f97316" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowOrange)"/>
              <path d="M 820 210 L 820 250" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* 3. EXPANSION LINE (Green & Gold) */}
              <path d="M 820 320 L 820 425 L 610 425" fill="none" stroke="#22c55e" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowGreen)"/>
              <path d="M 820 320 L 820 425 L 610 425" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* 4. SUCTION LINE (Blue) */}
              <path d="M 330 425 L 60 425 L 60 320 L 85 320" fill="none" stroke="#3b82f6" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowBlue)"/>
              <path d="M 330 425 L 60 425 L 60 320 L 85 320" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* TXV CAPILLARY BULB (Routed clean along perimeter, never crossing center) */}
              <path d="M 800 260 C 800 370, 750 460, 240 460 L 240 435" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
              <rect x="230" y="420" width="22" height="10" fill="#b8860b" rx="3" stroke="#ffd700" strokeWidth="0.8" />


              {/* ===== WIDESCREEN COMPONENTS ===== */}

              {/* COMPRESSOR (Left) */}
              <g transform="translate(120, 320)">
                <rect x="-35" y="-70" width="70" height="105" fill="url(#compGrad)" rx="10" stroke="#111" strokeWidth="2.5" />
                <line x1="-24" y1="-45" x2="24" y2="-45" stroke="#081c15" strokeWidth="3" />
                <line x1="-24" y1="-20" x2="24" y2="-20" stroke="#081c15" strokeWidth="3" />
                <line x1="-24" y1="5" x2="24" y2="5" stroke="#081c15" strokeWidth="3" />
                <path d="M -24 -70 Q 0 -100 24 -70 Z" fill="url(#compGrad)" stroke="#111" strokeWidth="2.5" />
                <rect x="-42" y="35" width="84" height="10" fill="#222" rx="3" stroke="#333" strokeWidth="1" />
                
                {/* Spinning Rotor Animation */}
                <g transform="translate(0, 10)">
                  <circle cx="0" cy="0" r="16" fill="#111" stroke="#333" strokeWidth="2" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#4ade80" strokeWidth="3" />
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#4ade80" strokeWidth="3" />
                  </g>
                  <circle cx="0" cy="0" r="3.5" fill="#fff" />
                </g>
                <text x="0" y="-8" fill="#4ade80" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="bold">COMP</text>
              </g>

              {/* CONDENSER (Top Center - 3 High Velocity Fans) */}
              <g transform="translate(470, 70)">
                <rect x="-140" y="-35" width="280" height="70" fill="url(#steelGrad)" rx="7" stroke="#111" strokeWidth="2.5" />
                <path d="M -140 -18 L 140 -18 M -140 0 L 140 0 M -140 18 L 140 18" fill="none" stroke="#ef4444" strokeWidth="4.5" opacity="0.8" />
                
                {/* Fan 1 */}
                <g transform="translate(-85, 0)">
                  <circle cx="0" cy="0" r="26" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>
                
                {/* Fan 2 */}
                <g transform="translate(0, 0)">
                  <circle cx="0" cy="0" r="26" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>

                {/* Fan 3 */}
                <g transform="translate(85, 0)">
                  <circle cx="0" cy="0" r="26" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 20,-20 22,-2 Q 20,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>

                <text x="0" y="55" fill="#ef4444" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="bold">CONDENSADOR</text>
              </g>

              {/* FILTER DRIER (Right Top) */}
              <g transform="translate(820, 170)">
                <rect x="-18" y="-40" width="36" height="80" fill="#111" rx="18" stroke="#333" strokeWidth="2.5" />
                <rect x="-18" y="-25" width="36" height="9" fill="#f97316" />
                <rect x="-18" y="16" width="36" height="9" fill="#f97316" />
                <circle cx="0" cy="-2" r="6" fill="#22c55e" stroke="#111" strokeWidth="1" />
                <text x="-25" y="0" fill="#fff" fontSize="8.5" fontFamily="monospace" fontWeight="bold" transform="rotate(-90)">FILTRO</text>
              </g>

              {/* TXV (Right Bottom) */}
              <g transform="translate(820, 285)">
                <rect x="-12" y="-28" width="24" height="60" fill="url(#brassGrad)" rx="5" />
                <rect x="-24" y="-12" width="48" height="18" fill="url(#brassGrad)" rx="3" />
                <ellipse cx="0" cy="-28" rx="18" ry="10" fill="url(#steelGrad)" stroke="#111" strokeWidth="1.5" />
                <text x="-48" y="-8" fill="#22c55e" fontSize="16" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #22c55e" }}>TXV</text>
                <text x="-48" y="18" fill="#fbbf24" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #fbbf24" }}>{openingPercent.toFixed(0)}%</text>
                <text x="-48" y="36" fill="#fbbf24" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #fbbf24" }}>ABERTURA</text>
              </g>

              {/* EVAPORATOR (Bottom Center) */}
              <g transform="translate(470, 425)">
                <rect x="-140" y="-35" width="280" height="70" fill="#0f172a" rx="7" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M -140 -18 L 140 -18 M -140 0 L 140 0 M -140 18 L 140 18" fill="none" stroke="#3b82f6" strokeWidth="4.5" opacity="0.8" />
                <pattern id="finsWide" width="10" height="10" patternUnits="userSpaceOnUse">
                   <line x1="0" y1="0" x2="0" y2="10" stroke="#38bdf8" strokeWidth="1.2" opacity="0.35" />
                </pattern>
                <rect x="-140" y="-35" width="280" height="70" fill="url(#finsWide)" />
                <text x="0" y="-45" fill="#3b82f6" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="bold">EVAPORADOR</text>
              </g>

              {/* ===== O NOVO GRÁFICO TÉRMICO WIDESCREEN ALONGADO (CENTRO PERFEITO) ===== */}
              <g transform="translate(470, 245)">
                {/* Painel de Fundo com Borda Neon e Efeito Vidro Escuro Amplo */}
                <rect 
                  x="-185" y="-105" width="370" height="210" 
                  rx="18" 
                  fill="#04070c" 
                  fillOpacity="0.95" 
                  stroke="rgba(0, 240, 255, 0.45)" 
                  strokeWidth="1.8" 
                  filter="drop-shadow(0 0 30px rgba(0,0,0,0.98))" 
                />

                {/* Linhas Técnicas de Canto (Estilo HUD Cyber-Tactical) */}
                <path d="M -185 -85 L -185 -105 L -160 -105" fill="none" stroke="#00f0ff" strokeWidth="2.5" opacity="0.9" />
                <path d="M 185 -85 L 185 -105 L 160 -105" fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.9" />
                <path d="M -185 85 L -185 105 L -160 105" fill="none" stroke="#00f0ff" strokeWidth="2.5" opacity="0.9" />
                <path d="M 185 85 L 185 105 L 160 105" fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.9" />

                {/* Cabeçalho do Painel Unificado Alongado */}
                <text 
                  x="0" y="-85" 
                  fill="#38bdf8" 
                  fontSize="11" 
                  textAnchor="middle" 
                  fontFamily="monospace" 
                  fontWeight="900" 
                  letterSpacing="2"
                  style={{ textShadow: "0 0 10px rgba(0,240,255,0.7)" }}
                >
                  PAINEL TÉRMICO UNIFICADO DO CICLO
                </text>

                {/* Badge Central de Salto Térmico (ΔT) */}
                <g transform="translate(0, -66)">
                  <rect x="-35" y="-8.5" width="70" height="17" rx="8.5" fill="#18181b" stroke="#fbbf24" strokeWidth="1.2" opacity="0.95" />
                  <text x="0" y="3.5" fill="#fbbf24" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                    ΔT {deltaT} K
                  </text>
                </g>

                {/* ===== COLUNA ESQUERDA: LADO DE BAIXA (SUCÇÃO & SUPERAQUECIMENTO) ===== */}
                <g transform="translate(-95, -55)">
                  <text x="0" y="0" fill="#38bdf8" fontSize="8.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    ● LADO DE BAIXA (SUCÇÃO)
                  </text>
                  <text 
                    x="0" y="20" 
                    fill="#00f0ff" 
                    fontSize="20" 
                    textAnchor="middle" 
                    fontFamily="monospace" 
                    fontWeight="900"
                    style={{ textShadow: "0 0 15px #00f0ff" }}
                  >
                    {tBaixa.toFixed(1)}°{tempUnit}
                  </text>
                </g>

                {/* Cartão de Superaquecimento (SH) - Amplo, sem sobreposição */}
                <g transform="translate(-95, -15)">
                  <rect 
                    x="-75" y="-12" width="150" height="30" 
                    rx="6" 
                    fill="#021c27" 
                    stroke={isSHNormal ? "#00f0ff" : "#f97316"} 
                    strokeWidth="1.2" 
                  />
                  <text x="-67" y="1" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    SUPERAQUECIMENTO (SH)
                  </text>
                  <text 
                    x="67" y="2" 
                    fill={isSHNormal ? "#4ade80" : "#f97316"} 
                    fontSize="13" 
                    fontFamily="monospace" 
                    fontWeight="900" 
                    textAnchor="end"
                  >
                    {realSH.toFixed(1)} K
                  </text>
                  <text 
                    x="-67" y="13" 
                    fill={isSHNormal ? "#4ade80" : "#f97316"} 
                    fontSize="7" 
                    fontFamily="monospace" 
                    opacity="0.95"
                  >
                    {isSHNormal ? `ALVO ${targetSHMin}-${targetSHMax}K (OPERANDO NOMINAL)` : isSHHigh ? `ALTO (> ${targetSHMax}K RISCO SUBCARGA)` : `BAIXO (< ${targetSHMin}K RISCO GOLPE)`}
                  </text>
                </g>

                {/* ===== COLUNA DIREITA: LADO DE ALTA (DESCARGA & SUB-RESFRIAMENTO) ===== */}
                <g transform="translate(95, -55)">
                  <text x="0" y="0" fill="#f87171" fontSize="8.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    LADO DE ALTA (DESCARGA) ●
                  </text>
                  <text 
                    x="0" y="20" 
                    fill="#ef4444" 
                    fontSize="20" 
                    textAnchor="middle" 
                    fontFamily="monospace" 
                    fontWeight="900"
                    style={{ textShadow: "0 0 15px #ef4444" }}
                  >
                    {tAlta.toFixed(1)}°{tempUnit}
                  </text>
                </g>

                {/* Cartão de Sub-resfriamento (SC) - Amplo, sem sobreposição */}
                <g transform="translate(95, -15)">
                  <rect 
                    x="-75" y="-12" width="150" height="30" 
                    rx="6" 
                    fill="#240409" 
                    stroke={isSCNormal ? "#ef4444" : "#f97316"} 
                    strokeWidth="1.2" 
                  />
                  <text x="-67" y="1" fill="#f87171" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    SUB-RESFRIAMENTO (SC)
                  </text>
                  <text 
                    x="67" y="2" 
                    fill={isSCNormal ? "#4ade80" : "#f97316"} 
                    fontSize="13" 
                    fontFamily="monospace" 
                    fontWeight="900" 
                    textAnchor="end"
                  >
                    {realSC.toFixed(1)} K
                  </text>
                  <text 
                    x="-67" y="13" 
                    fill={isSCNormal ? "#4ade80" : "#f97316"} 
                    fontSize="7" 
                    fontFamily="monospace" 
                    opacity="0.95"
                  >
                    {isSCNormal ? `ALVO ${targetSCMin}-${targetSCMax}K (OPERANDO NOMINAL)` : isSCHigh ? `ALTO (> ${targetSCMax}K SOBRECARGA)` : `BAIXO (< ${targetSCMin}K FALTA FLUIDO)`}
                  </text>
                </g>

                {/* ===== GRÁFICO VISUAL: CURVA TÉRMICA WIDESCREEN & ELEVAÇÃO DO CICLO ===== */}
                <g transform="translate(0, 24)">
                  {/* Linhas de Grade de Fundo do Gráfico */}
                  <line x1="-140" y1="2" x2="140" y2="2" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="-140" y1="20" x2="140" y2="20" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="-10" x2="0" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Área Preenchida com Gradiente Translúcido Widescreen */}
                  <path 
                    d={`M -130 ${yPosBaixa} C -50 ${yPosBaixa}, 50 ${yPosAlta}, 130 ${yPosAlta} L 130 28 L -130 28 Z`} 
                    fill="url(#thermalAreaGrad)" 
                  />

                  {/* Curva Térmica Dinâmica Widescreen */}
                  <path 
                    d={`M -130 ${yPosBaixa} C -50 ${yPosBaixa}, 50 ${yPosAlta}, 130 ${yPosAlta}`} 
                    fill="none" 
                    stroke="url(#thermalCurveGrad)" 
                    strokeWidth="3.8" 
                    filter="drop-shadow(0 0 10px rgba(0,240,255,0.7))" 
                  />
                  
                  {/* Linha de Fluxo Animada */}
                  <path 
                    d={`M -130 ${yPosBaixa} C -50 ${yPosBaixa}, 50 ${yPosAlta}, 130 ${yPosAlta}`} 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="1.5" 
                    strokeDasharray="6 6" 
                    className="animate-flow" 
                    opacity="0.9"
                  />

                  {/* Nó de Baixa com Pulso (Ciano) */}
                  <circle cx="-130" cy={yPosBaixa} r="7" fill="#00f0ff" opacity="0.3" className="animate-ping" />
                  <circle cx="-130" cy={yPosBaixa} r="5" fill="#00f0ff" stroke="#ffffff" strokeWidth="2" filter="drop-shadow(0 0 8px #00f0ff)" />
                  <text x="-130" y={yPosBaixa - 9} fill="#38bdf8" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">T.Suc</text>

                  {/* Nó de Alta com Pulso (Vermelho) */}
                  <circle cx="130" cy={yPosAlta} r="7" fill="#ef4444" opacity="0.3" className="animate-ping" />
                  <circle cx="130" cy={yPosAlta} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="drop-shadow(0 0 8px #ef4444)" />
                  <text x="130" y={yPosAlta - 9} fill="#f87171" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">T.Desc</text>
                </g>

                {/* ===== DUAL RÉGUAS TÉRMICAS WIDESCREEN DE ALVO (SH & SC TARGET GAUGES) ===== */}
                <g transform="translate(0, 56)">
                  {/* Régua de Superaquecimento (SH) */}
                  <g transform="translate(-85, 0)">
                    <rect x="-60" y="0" width="120" height="5.5" rx="2.7" fill="#031a24" stroke="rgba(0,240,255,0.3)" strokeWidth="0.8" />
                    {/* Faixa Alvo Verde (5-7K em escala 0 a 16K) */}
                    <rect x="-22.5" y="0.5" width="15" height="4.5" rx="1.5" fill="#22c55e" opacity="0.5" />
                    {/* Cursor Dinâmico */}
                    <circle cx={Math.max(-56, Math.min(56, -60 + (realSH / 16) * 120))} cy="2.7" r="3.5" fill="#00f0ff" stroke="#fff" strokeWidth="1.2" filter="drop-shadow(0 0 5px #00f0ff)" />
                    <text x="-60" y="11" fill="#64748b" fontSize="6.5" fontFamily="monospace">0K</text>
                    <text x="0" y="11" fill="#38bdf8" fontSize="6.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">ZONA ALVO SH (5-7K)</text>
                    <text x="60" y="11" fill="#64748b" fontSize="6.5" textAnchor="end" fontFamily="monospace">16K</text>
                  </g>

                  {/* Régua de Sub-resfriamento (SC) */}
                  <g transform="translate(85, 0)">
                    <rect x="-60" y="0" width="120" height="5.5" rx="2.7" fill="#200408" stroke="rgba(239,68,68,0.3)" strokeWidth="0.8" />
                    {/* Faixa Alvo Verde (3-5K em escala 0 a 12K) */}
                    <rect x="-30" y="0.5" width="20" height="4.5" rx="1.5" fill="#22c55e" opacity="0.5" />
                    {/* Cursor Dinâmico */}
                    <circle cx={Math.max(-56, Math.min(56, -60 + (realSC / 12) * 120))} cy="2.7" r="3.5" fill="#ef4444" stroke="#fff" strokeWidth="1.2" filter="drop-shadow(0 0 5px #ef4444)" />
                    <text x="-60" y="11" fill="#64748b" fontSize="6.5" fontFamily="monospace">0K</text>
                    <text x="0" y="11" fill="#f87171" fontSize="6.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">ZONA ALVO SC (3-5K)</text>
                    <text x="60" y="11" fill="#64748b" fontSize="6.5" textAnchor="end" fontFamily="monospace">12K</text>
                  </g>
                </g>

                {/* ===== STATUS OPERACIONAL UNIFICADO DO CICLO ===== */}
                <g transform="translate(0, 80)">
                  <rect 
                    x="-120" y="-10" width="240" height="20" 
                    fill="#050505" 
                    rx="10" 
                    stroke={statusColor} 
                    strokeWidth="1.8" 
                    opacity="0.95" 
                    filter={`drop-shadow(0 0 10px ${statusColor})`} 
                  />
                  <text 
                    x="0" y="4" 
                    fill={statusColor} 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontFamily="monospace" 
                    fontWeight="900" 
                    className="tracking-widest drop-shadow-md"
                  >
                    {shortStatus}
                  </text>
                </g>

              </g>

              {/* ===== LABELS WITH LIVE DATA WIDESCREEN ===== */}

              {/* Suction Label */}
              <text x="180" y="405" fill="#3b82f6" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #3b82f6" }}>
                {tSuc.toFixed(1)}°{tempUnit}
              </text>
              <text x="180" y="445" fill="#3b82f6" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #3b82f6" }}>
                {pSuc.toFixed(1)} {pressureUnit}
              </text>

              {/* Discharge Label */}
              <text x="210" y="48" fill="#ef4444" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #ef4444" }}>
                {(tCond + 30).toFixed(1)}°{tempUnit}
              </text>
              <text x="210" y="88" fill="#ef4444" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #ef4444" }}>
                {pLiq.toFixed(1)} {pressureUnit}
              </text>

              {/* Liquid Label */}
              <text x="730" y="48" fill="#f97316" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #f97316" }}>
                {tLiq.toFixed(1)}°{tempUnit}
              </text>
              <text x="730" y="88" fill="#f97316" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #f97316" }}>
                {pLiq.toFixed(1)} {pressureUnit}
              </text>

            </svg>
            </div>
          </div>
        </div>
        
        {/* Status Badge (Top Left) */}
        <div className="absolute top-4 left-4 bg-black/85 px-3 py-2 rounded-xl border border-primary/40 flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)] z-20">
          <Zap className="text-yellow-400 w-4 h-4 md:w-5 md:h-5 animate-pulse" />
          <span className="font-display tracking-widest text-[10px] md:text-xs text-primary neon-text-cyan font-black">MOTOR DE SIMULAÇÃO TÉRMICA (ATIVO)</span>
        </div>

        {/* Quick Example Loader Button (Top Right) */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={handleApplyExample}
            title="Carregar temperaturas exemplo: 74,9°C de Alta e 5,8°C de Baixa com SH e SC nominais"
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 rounded-xl font-mono text-xs md:text-sm font-black transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            <Activity className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span className="hidden sm:inline">Exemplo 74.9° Alta / 5.8° Baixa (SH & SC OK)</span>
            <span className="sm:hidden">74.9° / 5.8°</span>
          </button>
        </div>

        {/* Zoom Controls (Bottom Right) */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
          <button onClick={handleZoomOut} className="p-2 md:p-3 bg-black/85 border border-white/20 rounded-xl hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_15px_rgba(0,0,0,0.6)] transition-all">
            <ZoomOut className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          </button>
          <div className="flex items-center justify-center px-3 font-mono text-xs md:text-sm text-cyan-400 font-black bg-black/85 border border-white/10 rounded-xl">
            {(zoom * 100).toFixed(0)}%
          </div>
          <button onClick={handleZoomIn} className="p-2 md:p-3 bg-black/85 border border-white/20 rounded-xl hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_15px_rgba(0,0,0,0.6)] transition-all">
            <ZoomIn className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ===== CENTRAL TÉCNICA MASTER: GRÁFICOS ANALÍTICOS & RELATÓRIO DO CICLO ===== */}
      <div className="bg-black/70 border border-white/10 rounded-2xl p-4 sm:p-7 md:p-8 shadow-[inset_0_0_40px_rgba(0,0,0,0.85)] relative overflow-hidden space-y-6 md:space-y-8">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-cyan-400 via-primary to-rose-500 shadow-[0_0_20px_rgba(0,240,255,1)]"></div>
        
        {/* Header do Relatório */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-display font-black tracking-wider uppercase text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              Relatório Analítico & Diagnóstico Avançado de Campo
            </h3>
            <p className="text-xs sm:text-sm font-mono text-zinc-400 mt-1">
              Avaliação termodinâmica contínua calibrada pelas pressões e temperaturas de saturação do fluido <span className="text-cyan-400 font-bold">{ref}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-3.5 py-1.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="font-mono text-xs font-bold text-cyan-300">MODO ENGENHARIA MASTER ATIVO</span>
          </div>
        </div>

        {/* 1. SEÇÃO DE CARDS DE DESEMPENHO E EFICIÊNCIA */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          
          {/* Card 1: COP */}
          <div className="bg-zinc-950/70 border border-cyan-500/20 rounded-xl p-4 sm:p-5 space-y-3 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
            <div className="flex items-center justify-between">
               <h4 className="text-xs sm:text-sm font-tactical tracking-wider uppercase text-cyan-400 flex items-center gap-2 font-bold">
                 <Zap className="w-4 h-4" /> Eficiência Global (COP)
               </h4>
               <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                 CARNOT 55%
               </span>
            </div>
            <div className="digital-display font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] text-4xl sm:text-5xl">
              {estimatedCOP.toFixed(2)}
            </div>
            {/* Barra de Progresso Visual de Eficiência */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>Rendimento Teórico</span>
                <span className="text-cyan-300 font-bold">{Math.min(100, (estimatedCOP / 5.5) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (estimatedCOP / 5.5) * 100))}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
              Para cada <strong className="text-white">1 kW elétrico</strong> consumido no compressor, o sistema gera <strong className="text-cyan-300">{estimatedCOP.toFixed(2)} kW térmicos</strong> de capacidade frigorífica útil. Em equipamentos inverter de ponta, valores entre 3.2 e 4.8 indicam operação ideal.
            </p>
          </div>

          {/* Card 2: Razão de Compressão */}
          <div className="bg-zinc-950/70 border border-rose-500/20 rounded-xl p-4 sm:p-5 space-y-3 shadow-[0_0_20px_rgba(244,63,94,0.05)]">
            <div className="flex items-center justify-between">
               <h4 className="text-xs sm:text-sm font-tactical tracking-wider uppercase text-rose-400 flex items-center gap-2 font-bold">
                 <Power className="w-4 h-4" /> Razão de Compressão
               </h4>
               <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                 compRatio < 4 ? "bg-emerald-950 text-emerald-300 border-emerald-500/40" :
                 compRatio <= 7 ? "bg-yellow-950 text-yellow-300 border-yellow-500/40" :
                 "bg-rose-950 text-rose-300 border-rose-500/40"
               }`}>
                 {compRatio < 4 ? "EXCELENTE" : compRatio <= 7 ? "MODERADO" : "CRÍTICO"}
               </span>
            </div>
            <div className="digital-display font-black text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] text-4xl sm:text-5xl">
              {compRatio.toFixed(1)}<span className="text-2xl text-rose-500/50">:1</span>
            </div>
            {/* Barra de Progresso Visual de Esforço */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>Esforço Mecânico</span>
                <span className="text-rose-300 font-bold">{compRatio > 7 ? "Alto Desgaste" : "Carga Normal"}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    compRatio < 4 ? "bg-emerald-500" : compRatio <= 7 ? "bg-yellow-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(15, (compRatio / 9) * 100))}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
              Proporção entre a Pressão Absoluta de Descarga e de Sucção. 
              {compRatio < 4 && <span className="text-emerald-400 font-semibold block mt-1">Compressor livre de estresse, baixa corrente elétrica e menor temperatura no cabeçote.</span>}
              {compRatio >= 4 && compRatio <= 7 && <span className="text-yellow-400 font-semibold block mt-1">Condição padrão de operação para sistemas de ar condicionado de conforto.</span>}
              {compRatio > 7 && <span className="text-rose-400 font-bold block mt-1">Alerta vermelho! Risco severo de superaquecimento do motor, alta amperagem e quebra de óleo.</span>}
            </p>
          </div>

          {/* Card 3: Efeito Frigorífico */}
          <div className="bg-zinc-950/70 border border-orange-500/20 rounded-xl p-4 sm:p-5 space-y-3 shadow-[0_0_20px_rgba(255,140,0,0.05)]">
            <div className="flex items-center justify-between">
               <h4 className="text-xs sm:text-sm font-tactical tracking-wider uppercase text-orange-400 flex items-center gap-2 font-bold">
                 <Fan className="w-4 h-4" /> Efeito Frigorífico
               </h4>
               <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-950 border border-orange-500/40 text-orange-300">
                 ENTALPIA ÚTIL
               </span>
            </div>
            <div className="digital-display font-black text-orange-400 drop-shadow-[0_0_15px_rgba(255,140,0,0.8)] text-4xl sm:text-5xl">
              {efeitoFrig.toFixed(0)} <span className="text-lg text-orange-500/50">kJ/kg</span>
            </div>
            {/* Barra de Progresso Visual de Efeito Frigorífico */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>Absorção Térmica / kg</span>
                <span className="text-orange-300 font-bold">{ref}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (efeitoFrig / 190) * 100))}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
              Capacidade de calor absorvida por quilograma de fluido circulante. Quanto menor o sub-resfriamento ou maior a temperatura de condensação, menor este valor, forçando o compressor a trabalhar mais para entregar a mesma refrigeração.
            </p>
          </div>

        </div>

        {/* 2. NOVO GRÁFICO TÉCNICO INTERATIVO: TERMOGRAMA DAS 5 TEMPERATURAS CHAVE */}
        <div className="bg-black/80 border border-white/10 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-display font-black tracking-wider uppercase text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Termograma Gráfico do Ciclo (Balanço das 5 Temperaturas Chave)
            </h4>
            <span className="text-xs font-mono text-zinc-400">Escala Térmica Comparativa (°{tempUnit})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            
            {/* Barra 1: T. Evap */}
            <div className="bg-zinc-900/60 border border-blue-500/30 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">1. Sat. Evap</span>
              <div className="text-xl font-mono font-black text-blue-300">{tEvap.toFixed(1)}°</div>
              <span className="text-[9px] font-mono text-zinc-400">Evaporação</span>
            </div>

            {/* Barra 2: T. Suc (Baixa) */}
            <div className="bg-zinc-900/60 border border-cyan-500/40 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">2. Sucção (Baixa)</span>
              <div className="text-2xl font-mono font-black text-cyan-300">{tBaixa.toFixed(1)}°</div>
              <span className="text-[9px] font-mono text-cyan-400 font-bold">SH: {realSH.toFixed(1)}K</span>
            </div>

            {/* Barra 3: T. Cond */}
            <div className="bg-zinc-900/60 border border-amber-500/30 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">3. Sat. Cond</span>
              <div className="text-xl font-mono font-black text-amber-300">{tCond.toFixed(1)}°</div>
              <span className="text-[9px] font-mono text-zinc-400">Condensação</span>
            </div>

            {/* Barra 4: T. Liq */}
            <div className="bg-zinc-900/60 border border-orange-500/40 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-2">
              <span className="text-[10px] font-mono uppercase text-orange-400 font-bold">4. Linha Líquido</span>
              <div className="text-xl font-mono font-black text-orange-300">{tLiq.toFixed(1)}°</div>
              <span className="text-[9px] font-mono text-orange-400 font-bold">SC: {realSC.toFixed(1)}K</span>
            </div>

            {/* Barra 5: T. Desc (Alta) */}
            <div className="bg-zinc-900/60 border border-rose-500/40 rounded-xl p-3 flex flex-col items-center justify-between text-center space-y-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">5. Descarga (Alta)</span>
              <div className="text-2xl font-mono font-black text-rose-400">{tAlta.toFixed(1)}°</div>
              <span className={`text-[9px] font-mono font-bold ${tAlta > 105 ? "text-rose-400 font-black" : "text-emerald-400"}`}>
                {tAlta > 105 ? "RISCO ÓLEO > 105°" : "ÓLEO SEGURO"}
              </span>
            </div>

          </div>
        </div>

        {/* 3. DICAS DE OURO DO TÉCNICO MASTER (CONHECIMENTO DE CAMPO DE ALTO VALOR) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-yellow-400 shrink-0" />
            <div>
              <h4 className="text-base sm:text-lg font-display font-black tracking-wider uppercase text-yellow-400">
                Dicas de Ouro do Técnico Master (Segredos Práticos de Campo)
              </h4>
              <p className="text-xs font-mono text-zinc-400">
                Procedimentos de diagnóstico rápido que diferenciam os maiores especialistas em refrigeração
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Dica 1 */}
            <div className="bg-gradient-to-br from-cyan-950/30 to-black border border-cyan-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-cyan-300 font-tactical font-black text-xs uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                1. Carga Exata Sem Balança (Regra do SC)
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                Em sistemas com Válvula de Expansão (TXV/VET), <strong>NUNCA adicione gás guiando-se apenas pela pressão!</strong> O ajuste de carga perfeito é feito pelo <strong>Sub-resfriamento (SC = 3 a 5 K)</strong>. Se o SC está menor que 3K, falta fluido. Se está acima de 6K, o condensador está inundado de líquido.
              </p>
            </div>

            {/* Dica 2 */}
            <div className="bg-gradient-to-br from-rose-950/30 to-black border border-rose-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-rose-300 font-tactical font-black text-xs uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                2. O Limite Crítico de 105°C na Descarga
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                A temperatura na tubulação de descarga a 15 cm do compressor <strong>nunca pode passar de 105°C</strong> (221°F). Acima de 105°C, o óleo sintético (POE/PVE) perde viscosidade e quebra sua molécula, carbonizando as palhetas e travando o motor mecânico.
              </p>
            </div>

            {/* Dica 3 */}
            <div className="bg-gradient-to-br from-yellow-950/30 to-black border border-yellow-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-yellow-300 font-tactical font-black text-xs uppercase tracking-wide">
                <Wrench className="w-4 h-4 text-yellow-400 shrink-0" />
                3. Condensador Sujo vs Excesso de Gás
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                Como não se enganar? Se a pressão de alta estiver elevada, olhe o SC:
                <br />• <strong>Condensador Sujo:</strong> Alta elevada, mas <span className="text-yellow-300 font-bold">Sub-resfriamento BAIXO</span> (ar não condensa o fluido).
                <br />• <strong>Excesso Real:</strong> Alta elevada E <span className="text-rose-300 font-bold">Sub-resfriamento ALTO</span>.
              </p>
            </div>

            {/* Dica 4 */}
            <div className="bg-gradient-to-br from-blue-950/30 to-black border border-blue-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-blue-300 font-tactical font-black text-xs uppercase tracking-wide">
                <Thermometer className="w-4 h-4 text-blue-400 shrink-0" />
                4. O Teste do ΔT de Ar no Evaporador
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                Antes de acoplar o manifold, meça o ar: <strong className="text-white">ΔT do ar (Retorno - Insuflamento) deve estar entre 8°C e 12°C</strong>.
                Se for menor que 7°C, há baixa troca ou fluxo de ar excessivo. Se for maior que 14°C, o filtro de ar está entupido ou a turbina está com rotação deficiente.
              </p>
            </div>

            {/* Dica 5 */}
            <div className="bg-gradient-to-br from-emerald-950/30 to-black border border-emerald-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-emerald-300 font-tactical font-black text-xs uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                5. Proteção Contra Golpe de Líquido
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                Superaquecimento menor que <strong>4 K</strong> no compressor é área de perigo extremo de retorno de refrigerante líquido para o carter, lavando o óleo das bielas. Mantenha o SH entre <strong>5 K e 7 K</strong> para máxima vida útil mecânica do equipamento.
              </p>
            </div>

            {/* Dica 6 */}
            <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-purple-300 font-tactical font-black text-xs uppercase tracking-wide">
                <Lightbulb className="w-4 h-4 text-purple-400 shrink-0" />
                6. Filtro Secador Saturado
              </div>
              <p className="text-xs font-mono text-zinc-300 leading-relaxed text-justify">
                Sempre meça a temperatura antes e depois do Filtro Secador. Se houver uma diferença de <strong>temperatura maior que 1,5°C entre a entrada e saída do filtro</strong>, ele está obstruído internamente por umidade ou resíduos e deve ser substituído.
              </p>
            </div>

          </div>
        </div>

        {/* 4. TABELA TÁTICA DE DIAGNÓSTICO RÁPIDO DE CAMPO */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h4 className="text-xs sm:text-sm font-tactical tracking-wider uppercase text-white font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Matriz Tática de Diagnóstico Rápido de Campo
          </h4>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-mono text-xs text-zinc-300 border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] sm:text-xs text-zinc-400 uppercase bg-zinc-900/60">
                  <th className="p-2 sm:p-3">Superaquecimento (SH)</th>
                  <th className="p-2 sm:p-3">Sub-resfriamento (SC)</th>
                  <th className="p-2 sm:p-3">Diagnóstico Preciso</th>
                  <th className="p-2 sm:p-3 text-cyan-400">Ação Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                <tr className="hover:bg-cyan-950/20 transition-colors">
                  <td className="p-2 sm:p-3 text-emerald-400 font-bold">5 a 7 K (Normal)</td>
                  <td className="p-2 sm:p-3 text-emerald-400 font-bold">3 a 5 K (Normal)</td>
                  <td className="p-2 sm:p-3 font-bold text-white">Ciclo em Perfeito Equilíbrio</td>
                  <td className="p-2 sm:p-3 text-emerald-300">Equipamento operando com máxima eficiência energética.</td>
                </tr>
                <tr className="hover:bg-cyan-950/20 transition-colors">
                  <td className="p-2 sm:p-3 text-orange-400 font-bold">Elevado (&gt; 8 K)</td>
                  <td className="p-2 sm:p-3 text-cyan-400 font-bold">Baixo (&lt; 3 K)</td>
                  <td className="p-2 sm:p-3 font-bold text-orange-300">Falta de Fluido (Subcarga)</td>
                  <td className="p-2 sm:p-3 text-zinc-200">Localizar vazamento, reparar e carregar refrigerante até SC atingir 4 K.</td>
                </tr>
                <tr className="hover:bg-cyan-950/20 transition-colors">
                  <td className="p-2 sm:p-3 text-blue-400 font-bold">Baixo (&lt; 4 K)</td>
                  <td className="p-2 sm:p-3 text-rose-400 font-bold">Elevado (&gt; 6 K)</td>
                  <td className="p-2 sm:p-3 font-bold text-rose-300">Excesso de Fluido (Sobrecarga)</td>
                  <td className="p-2 sm:p-3 text-zinc-200">Recolher refrigerante com recolhedora até normalizar SC para 4 K.</td>
                </tr>
                <tr className="hover:bg-cyan-950/20 transition-colors">
                  <td className="p-2 sm:p-3 text-orange-400 font-bold">Elevado (&gt; 8 K)</td>
                  <td className="p-2 sm:p-3 text-rose-400 font-bold">Elevado (&gt; 6 K)</td>
                  <td className="p-2 sm:p-3 font-bold text-rose-400">Restrição na Linha de Líquido / TXV</td>
                  <td className="p-2 sm:p-3 text-zinc-200">Verificar filtro secador (queda de temperatura) ou pistão da TXV travado.</td>
                </tr>
                <tr className="hover:bg-cyan-950/20 transition-colors">
                  <td className="p-2 sm:p-3 text-blue-400 font-bold">Baixo (&lt; 4 K)</td>
                  <td className="p-2 sm:p-3 text-cyan-400 font-bold">Baixo (&lt; 3 K)</td>
                  <td className="p-2 sm:p-3 font-bold text-yellow-300">Baixa Carga Térmica / Ar Evap. Sujo</td>
                  <td className="p-2 sm:p-3 text-zinc-200">Limpar filtros de ar, verificar rotação do ventilador do evaporador.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
