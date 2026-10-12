import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { 
  Power, Zap, Fan, ZoomIn, ZoomOut, BookOpen, Activity, 
  Sparkles, Award, Wrench, ShieldAlert, CheckCircle2, AlertTriangle, 
  TrendingUp, Layers, Lightbulb, Thermometer, Gauge, Compass, ShieldCheck, BarChart3
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

  // Coordenadas visuais da curva no espaço vertical dinâmico (x: -130 a +130, y: -25 a +25)
  const yPosBaixa = 16 - (ratioBaixa * 45);
  const yPosAlta = 16 - (ratioAlta * 45);

  // Estimativas térmicas para análise diagnóstica de campo
  const deltaTArEvap = Math.max(6, Math.min(16, Number(((tSuc - tEvap) * 0.55 + 9.2).toFixed(1))));
  const deltaTArCond = Math.max(8, Math.min(22, Number(((tCond - tLiq) * 0.95 + 10.8).toFixed(1))));
  const qEvap = Number(efeitoFrig.toFixed(0));
  const wComp = Number((efeitoFrig / Math.max(1.2, estimatedCOP)).toFixed(0));
  const qCond = qEvap + wComp;

  return (
    <div className="mx-auto space-y-6 sm:space-y-8 w-full max-w-7xl">
      
      {/* THE WIDESCREEN DIGITAL TWIN CANVAS WITH EXPANDED GRID */}
      <div className="relative glass-panel border border-white/10 rounded-2xl overflow-hidden bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        
        {/* Scrollable Canvas Viewport */}
        <div className="w-full aspect-[800/600] md:aspect-auto md:h-[620px] overflow-auto custom-scrollbar bg-[#050505]">
          <div className="flex min-w-full min-h-full w-max items-center justify-center p-3 md:p-6">
            <div 
              className="relative transition-all duration-300 transform-gpu flex-shrink-0" 
              style={{ width: `${800 * zoom}px`, height: `${600 * zoom}px` }}
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

            <svg className="w-full h-full z-10 relative drop-shadow-2xl" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
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

              {/* ===== TUBULAÇÕES DO CICLO (LAYOUT VERTICAL HARMONIOSO) ===== */}
              
              {/* 1. LINHA DE DESCARGA (Vermelha) */}
              <path d="M 100 270 L 100 68 L 270 68" fill="none" stroke="#ef4444" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowRed)"/>
              <path d="M 100 270 L 100 68 L 270 68" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow-fast" />

              {/* 2. LINHA DE LÍQUIDO (Laranja) */}
              <path d="M 530 68 L 700 68 L 700 127" fill="none" stroke="#f97316" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowOrange)"/>
              <path d="M 530 68 L 700 68 L 700 127" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />
              
              <path d="M 700 203 L 700 335" fill="none" stroke="#f97316" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowOrange)"/>
              <path d="M 700 203 L 700 335" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* 3. LINHA DE EXPANSÃO (Verde & Ouro) */}
              <path d="M 700 395 L 700 532 L 530 532" fill="none" stroke="#22c55e" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowGreen)"/>
              <path d="M 700 395 L 700 532 L 530 532" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* 4. LINHA DE SUCÇÃO (Azul) */}
              <path d="M 270 532 L 40 532 L 40 365 L 63 365" fill="none" stroke="#3b82f6" strokeWidth="6.5" opacity="0.65" filter="url(#neonGlowBlue)"/>
              <path d="M 270 532 L 40 532 L 40 365 L 63 365" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="12 12" className="animate-flow" />

              {/* BULBO SENSOR DA TXV (Roteamento externo pelo contorno, sem obstruir o painel central) */}
              <path d="M 680 340 C 680 470, 590 575, 200 575 L 200 542" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeDasharray="4 4" opacity="0.75" />
              <rect x="188" y="527" width="24" height="10" fill="#b8860b" rx="3" stroke="#ffd700" strokeWidth="1" />


              {/* ===== COMPONENTES DO MOTOR (DESIGN VERTICAL DEFINIDO) ===== */}

              {/* COMPRESSOR (Esquerda - Mais Alto e Robusto) */}
              <g transform="translate(100, 365)">
                <rect x="-37" y="-95" width="74" height="140" fill="url(#compGrad)" rx="12" stroke="#111" strokeWidth="2.5" />
                <line x1="-28" y1="-68" x2="28" y2="-68" stroke="#081c15" strokeWidth="3" />
                <line x1="-28" y1="-40" x2="28" y2="-40" stroke="#081c15" strokeWidth="3" />
                <line x1="-28" y1="-12" x2="28" y2="-12" stroke="#081c15" strokeWidth="3" />
                <line x1="-28" y1="16" x2="28" y2="16" stroke="#081c15" strokeWidth="3" />
                <path d="M -26 -95 Q 0 -125 26 -95 Z" fill="url(#compGrad)" stroke="#111" strokeWidth="2.5" />
                <rect x="-45" y="45" width="90" height="12" fill="#222" rx="3" stroke="#333" strokeWidth="1" />
                
                {/* Rotor Giratório */}
                <g transform="translate(0, 10)">
                  <circle cx="0" cy="0" r="17" fill="#111" stroke="#333" strokeWidth="2.5" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <line x1="-13" y1="0" x2="13" y2="0" stroke="#4ade80" strokeWidth="3.5" />
                    <line x1="0" y1="-13" x2="0" y2="13" stroke="#4ade80" strokeWidth="3.5" />
                  </g>
                  <circle cx="0" cy="0" r="4" fill="#fff" />
                </g>
                <text x="0" y="-12" fill="#4ade80" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 10px #4ade80" }}>COMP</text>
              </g>

              {/* CONDENSADOR (Topo Centro - 3 Ventiladores de Alta Vazão) */}
              <g transform="translate(400, 68)">
                <rect x="-130" y="-34" width="260" height="68" fill="url(#steelGrad)" rx="7" stroke="#111" strokeWidth="2.5" />
                <path d="M -130 -17 L 130 -17 M -130 0 L 130 0 M -130 17 L 130 17" fill="none" stroke="#ef4444" strokeWidth="4.5" opacity="0.8" />
                
                {/* Fan 1 */}
                <g transform="translate(-75, 0)">
                  <circle cx="0" cy="0" r="24" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>
                
                {/* Fan 2 */}
                <g transform="translate(0, 0)">
                  <circle cx="0" cy="0" r="24" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>

                {/* Fan 3 */}
                <g transform="translate(75, 0)">
                  <circle cx="0" cy="0" r="24" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4.5" fill="#fff" />
                </g>

                <text x="0" y="52" fill="#ef4444" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" letterSpacing="2" style={{ textShadow: "0 0 10px #ef4444" }}>CONDENSADOR</text>
              </g>

              {/* FILTRO SECADOR (Direita Topo) */}
              <g transform="translate(700, 165)">
                <rect x="-18" y="-38" width="36" height="76" fill="#111" rx="18" stroke="#333" strokeWidth="2.5" />
                <rect x="-18" y="-24" width="36" height="9" fill="#f97316" />
                <rect x="-18" y="15" width="36" height="9" fill="#f97316" />
                <circle cx="0" cy="-2" r="6" fill="#22c55e" stroke="#111" strokeWidth="1" />
                <text x="-25" y="0" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="900" transform="rotate(-90)">FILTRO</text>
              </g>

              {/* VÁLVULA DE EXPANSÃO - TXV (Direita Base) */}
              <g transform="translate(700, 365)">
                <rect x="-12" y="-28" width="24" height="60" fill="url(#brassGrad)" rx="5" />
                <rect x="-24" y="-12" width="48" height="18" fill="url(#brassGrad)" rx="3" />
                <ellipse cx="0" cy="-28" rx="18" ry="10" fill="url(#steelGrad)" stroke="#111" strokeWidth="1.5" />
                <text x="-48" y="-12" fill="#22c55e" fontSize="16" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #22c55e" }}>TXV</text>
                <text x="-48" y="14" fill="#fbbf24" fontSize="22" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #fbbf24" }}>{openingPercent.toFixed(0)}%</text>
                <text x="-48" y="32" fill="#fbbf24" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #fbbf24" }}>ABERTURA</text>
              </g>

              {/* EVAPORADOR (Base Centro) */}
              <g transform="translate(400, 532)">
                <rect x="-130" y="-34" width="260" height="68" fill="#0f172a" rx="7" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M -130 -17 L 130 -17 M -130 0 L 130 0 M -130 17 L 130 17" fill="none" stroke="#3b82f6" strokeWidth="4.5" opacity="0.8" />
                <pattern id="finsVertical" width="10" height="10" patternUnits="userSpaceOnUse">
                   <line x1="0" y1="0" x2="0" y2="10" stroke="#38bdf8" strokeWidth="1.2" opacity="0.35" />
                </pattern>
                <rect x="-130" y="-34" width="260" height="68" fill="url(#finsVertical)" />
                <text x="0" y="-44" fill="#3b82f6" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" letterSpacing="2" style={{ textShadow: "0 0 10px #3b82f6" }}>EVAPORADOR</text>
              </g>

              {/* ===== MINI GRÁFICO TÉRMICO DO CICLO (CENTRALIZADO & ULTRA-LIMPO) ===== */}
              <g transform="translate(400, 300)">
                {/* Painel Compacto de Fundo com Vidro Escuro e Borda Neon */}
                <rect 
                  x="-140" y="-75" width="280" height="150" 
                  rx="14" 
                  fill="#04070c" 
                  fillOpacity="0.95" 
                  stroke="rgba(0, 240, 255, 0.45)" 
                  strokeWidth="1.6" 
                  filter="drop-shadow(0 0 25px rgba(0,0,0,0.95))" 
                />

                {/* Brackets Técnicos Cyber nos Cantos */}
                <path d="M -140 -58 L -140 -75 L -120 -75" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.9" />
                <path d="M 140 -58 L 140 -75 L 120 -75" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.9" />
                <path d="M -140 58 L -140 75 L -120 75" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.9" />
                <path d="M 140 58 L 140 75 L 120 75" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.9" />

                {/* Título do Mini Gráfico */}
                <text 
                  x="0" y="-56" 
                  fill="#38bdf8" 
                  fontSize="9.5" 
                  textAnchor="middle" 
                  fontFamily="monospace" 
                  fontWeight="900" 
                  letterSpacing="2"
                  style={{ textShadow: "0 0 10px rgba(0,240,255,0.7)" }}
                >
                  MINI GRÁFICO TÉRMICO DO CICLO
                </text>

                {/* Badge Central de Salto Térmico (ΔT) */}
                <g transform="translate(0, -39)">
                  <rect x="-42" y="-9" width="84" height="18" rx="9" fill="#181404" stroke="#fbbf24" strokeWidth="1.3" opacity="0.95" />
                  <text x="0" y="3.5" fill="#fbbf24" fontSize="9.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                    ΔT {deltaT} K
                  </text>
                </g>

                {/* Curva S Térmica Dinâmica do Ciclo */}
                <g transform="translate(0, 5)">
                  {/* Linhas de Grade de Fundo */}
                  <line x1="-110" y1="0" x2="110" y2="0" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="-110" y1="18" x2="110" y2="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Área Preenchida com Gradiente Translúcido */}
                  <path 
                    d={`M -105 ${yPosBaixa} C -40 ${yPosBaixa}, 40 ${yPosAlta}, 105 ${yPosAlta} L 105 18 L -105 18 Z`} 
                    fill="url(#thermalAreaGrad)" 
                  />

                  {/* Curva Térmica Dinâmica */}
                  <path 
                    d={`M -105 ${yPosBaixa} C -40 ${yPosBaixa}, 40 ${yPosAlta}, 105 ${yPosAlta}`} 
                    fill="none" 
                    stroke="url(#thermalCurveGrad)" 
                    strokeWidth="3.5" 
                    filter="drop-shadow(0 0 8px rgba(0,240,255,0.7))" 
                  />
                  
                  {/* Linha de Fluxo Animada */}
                  <path 
                    d={`M -105 ${yPosBaixa} C -40 ${yPosBaixa}, 40 ${yPosAlta}, 105 ${yPosAlta}`} 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="1.5" 
                    strokeDasharray="6 6" 
                    className="animate-flow" 
                    opacity="0.9" 
                  />

                  {/* Nó de Baixa com Pulso & Label */}
                  <circle cx="-105" cy={yPosBaixa} r="6" fill="#00f0ff" opacity="0.3" className="animate-ping" />
                  <circle cx="-105" cy={yPosBaixa} r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1.8" filter="drop-shadow(0 0 6px #00f0ff)" />
                  <rect x="-135" y={yPosBaixa - 18} width="46" height="13" rx="3.5" fill="#040c18" stroke="#00f0ff" strokeWidth="1" />
                  <text x="-112" y={yPosBaixa - 9} fill="#00f0ff" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                    {tBaixa.toFixed(1)}°
                  </text>

                  {/* Nó de Alta com Pulso & Label */}
                  <circle cx="105" cy={yPosAlta} r="6" fill="#ef4444" opacity="0.3" className="animate-ping" />
                  <circle cx="105" cy={yPosAlta} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.8" filter="drop-shadow(0 0 6px #ef4444)" />
                  <rect x="89" y={yPosAlta - 18} width="46" height="13" rx="3.5" fill="#180407" stroke="#ef4444" strokeWidth="1" />
                  <text x="112" y={yPosAlta - 9} fill="#ef4444" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                    {tAlta.toFixed(1)}°
                  </text>
                </g>

                {/* Réguas Compactas de Alvo SH & SC */}
                <g transform="translate(0, 35)">
                  {/* Mini Régua SH */}
                  <rect x="-105" y="0" width="95" height="5" rx="2.5" fill="#031a24" stroke="rgba(0,240,255,0.4)" strokeWidth="0.8" />
                  <rect x="-75.5" y="0.5" width="12" height="4" rx="1" fill="#22c55e" opacity="0.6" />
                  <circle cx={Math.max(-103, Math.min(-12, -105 + (realSH / 16) * 95))} cy="2.5" r="3.2" fill="#00f0ff" stroke="#fff" strokeWidth="1.2" />
                  <text x="-105" y="10" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="900">SH</text>
                  <text x="-10" y="10" fill={isSHNormal ? "#4ade80" : "#f97316"} fontSize="6.5" textAnchor="end" fontFamily="monospace" fontWeight="900">{realSH.toFixed(1)}K</text>

                  {/* Mini Régua SC */}
                  <rect x="10" y="0" width="95" height="5" rx="2.5" fill="#200408" stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" />
                  <rect x="33.8" y="0.5" width="16" height="4" rx="1" fill="#22c55e" opacity="0.6" />
                  <circle cx={Math.max(12, Math.min(103, 10 + (realSC / 12) * 95))} cy="2.5" r="3.2" fill="#ef4444" stroke="#fff" strokeWidth="1.2" />
                  <text x="10" y="10" fill="#64748b" fontSize="6.5" fontFamily="monospace" fontWeight="900">SC</text>
                  <text x="105" y="10" fill={isSCNormal ? "#4ade80" : "#f97316"} fontSize="6.5" textAnchor="end" fontFamily="monospace" fontWeight="900">{realSC.toFixed(1)}K</text>
                </g>

                {/* Status Operacional Compacto */}
                <g transform="translate(0, 58)">
                  <rect 
                    x="-105" y="-8.5" width="210" height="17" 
                    fill="#050505" 
                    rx="8.5" 
                    stroke={statusColor} 
                    strokeWidth="1.5" 
                    opacity="0.95" 
                    filter={`drop-shadow(0 0 8px ${statusColor})`} 
                  />
                  <text 
                    x="0" y="3.5" 
                    fill={statusColor} 
                    fontSize="8.5" 
                    textAnchor="middle" 
                    fontFamily="monospace" 
                    fontWeight="900" 
                    letterSpacing="1.5"
                    className="drop-shadow-md"
                  >
                    {shortStatus}
                  </text>
                </g>
              </g>

              {/* ===== BADGES HUD DE ALTA DEFINIÇÃO NAS TUBULAÇÕES ===== */}

              {/* 1. Medições de Sucção / Baixa (com indicador de SH direto na linha) */}
              <g transform="translate(155, 475)">
                <rect x="-58" y="-28" width="116" height="56" rx="8" fill="#030c18" fillOpacity="0.92" stroke="#3b82f6" strokeWidth="1.6" filter="drop-shadow(0 0 10px rgba(59,130,246,0.45))" />
                <text x="0" y="-10" fill="#38bdf8" fontSize="15" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #38bdf8" }}>
                  {tSuc.toFixed(1)}°{tempUnit}
                </text>
                <text x="0" y="6" fill="#60a5fa" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 10px #60a5fa" }}>
                  {pSuc.toFixed(1)} {pressureUnit}
                </text>
                <rect x="-48" y="12" width="96" height="12" rx="3" fill="#000000" fillOpacity="0.75" stroke={isSHNormal ? "rgba(74,222,128,0.5)" : "rgba(249,115,22,0.5)"} strokeWidth="0.8" />
                <text x="0" y="20.5" fill={isSHNormal ? "#4ade80" : "#f97316"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                  SH: {realSH.toFixed(1)} K
                </text>
              </g>

              {/* 2. Medições de Descarga / Alta (com indicação da Sat. Condensação) */}
              <g transform="translate(185, 26)">
                <rect x="-58" y="-22" width="116" height="50" rx="8" fill="#180407" fillOpacity="0.92" stroke="#ef4444" strokeWidth="1.6" filter="drop-shadow(0 0 10px rgba(239,68,68,0.45))" />
                <text x="0" y="-7" fill="#f87171" fontSize="15" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #ef4444" }}>
                  {(tCond + 30).toFixed(1)}°{tempUnit}
                </text>
                <text x="0" y="8" fill="#ef4444" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 10px #ef4444" }}>
                  {pLiq.toFixed(1)} {pressureUnit}
                </text>
                <rect x="-48" y="13" width="96" height="12" rx="3" fill="#000000" fillOpacity="0.75" stroke="rgba(239,68,68,0.5)" strokeWidth="0.8" />
                <text x="0" y="21.5" fill="#f87171" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                  SAT COND: {tCond.toFixed(1)}°
                </text>
              </g>

              {/* 3. Medições de Linha de Líquido (com indicador de SC direto na linha) */}
              <g transform="translate(615, 26)">
                <rect x="-58" y="-22" width="116" height="50" rx="8" fill="#180a03" fillOpacity="0.92" stroke="#f97316" strokeWidth="1.6" filter="drop-shadow(0 0 10px rgba(249,115,22,0.45))" />
                <text x="0" y="-7" fill="#fb923c" fontSize="15" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #f97316" }}>
                  {tLiq.toFixed(1)}°{tempUnit}
                </text>
                <text x="0" y="8" fill="#f97316" fontSize="13" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 10px #f97316" }}>
                  {pLiq.toFixed(1)} {pressureUnit}
                </text>
                <rect x="-48" y="13" width="96" height="12" rx="3" fill="#000000" fillOpacity="0.75" stroke={isSCNormal ? "rgba(74,222,128,0.5)" : "rgba(249,115,22,0.5)"} strokeWidth="0.8" />
                <text x="0" y="21.5" fill={isSCNormal ? "#4ade80" : "#f97316"} fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                  SC: {realSC.toFixed(1)} K
                </text>
              </g>

            </svg>
            </div>
          </div>
        </div>
        
        {/* Status Badge (Top Left) */}
        <div className="absolute top-4 left-4 bg-black/85 px-3 py-2 rounded-xl border border-primary/40 flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)] z-20">
          <Zap className="text-yellow-400 w-4 h-4 md:w-5 md:h-5 animate-pulse" />
          <span className="font-display tracking-widest text-[10px] md:text-xs text-primary neon-text-cyan font-black">MOTOR DE SIMULAÇÃO TÉRMICA (ATIVO)</span>
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

      {/* ===== NOVO COCKPIT DE GRÁFICOS TÉCNICOS & DIAGNÓSTICO MULTIVARIADO DE CAMPO ===== */}
      <div className="space-y-6">
        
        {/* Header do Cockpit Gráfico */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-950 p-4 sm:p-5 rounded-2xl border border-cyan-500/30 shadow-[0_0_25px_rgba(0,240,255,0.1)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-display font-black tracking-wider uppercase text-white flex items-center gap-2">
                Cockpit de Gráficos Técnicos & Termodinâmicos
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Monitoramento gráfico de Deltas Térmicos (ΔT), Diagrama P-h, Envelope Copeland e Fluxo Energético
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-400/30 rounded-lg text-cyan-300 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>TELEMETRIA GRÁFICA ATIVA</span>
          </div>
        </div>

        {/* Grid de 4 Gráficos Técnicos Avançados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ===== GRÁFICO 1: RADAR DE DELTAS TÉRMICOS (ΔT MULTIVARIADO) ===== */}
          <div className="bg-zinc-950/80 border border-cyan-500/20 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(0,240,255,0.06)] relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Thermometer className="w-5 h-5 text-cyan-400" />
                <h4 className="font-tactical font-black text-sm uppercase text-cyan-300 tracking-wider">
                  Radar dos Deltas Térmicos (ΔT de Campo)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                DIAGNÓSTICO MULTIVARIADO
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              
              {/* 1. Salto Global Descarga - Sucção */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">● ΔT Salto Global (T.Desc - T.Suc)</span>
                  <span className="text-amber-400 font-black">{deltaT} K</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, (deltaT / 90) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>Elevação térmica do compressor</span>
                  <span className="text-zinc-400">Escala até 90 K</span>
                </div>
              </div>

              {/* 2. ΔT Superaquecimento Útil (SH) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">● ΔT Superaquecimento (SH)</span>
                  <span className={isSHNormal ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                    {realSH.toFixed(1)} K ({isSHNormal ? "Nominal 5-7K" : isSHLow ? "Risco Golpe Líquido" : "Subcarga"})
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                  {/* Faixa Alvo Verde */}
                  <div className="absolute top-0 bottom-0 left-[31%] width-[13%] w-[13%] bg-emerald-500/25 border-x border-emerald-500/50 z-0"></div>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isSHNormal ? "bg-emerald-500" : isSHLow ? "bg-rose-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, Math.max(8, (realSH / 16) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span className="text-rose-400/90">&lt; 4K Risco Golpe</span>
                  <span className="text-emerald-400 font-bold">5 a 7 K (Faixa Ideal)</span>
                  <span className="text-amber-400">&gt; 9K Perda Rendimento</span>
                </div>
              </div>

              {/* 3. ΔT Sub-resfriamento (SC) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">● ΔT Sub-resfriamento (SC)</span>
                  <span className={isSCNormal ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                    {realSC.toFixed(1)} K ({isSCNormal ? "Nominal 3-5K" : isSCLow ? "Falta Fluido" : "Sobrecarga"})
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                  {/* Faixa Alvo Verde */}
                  <div className="absolute top-0 bottom-0 left-[25%] width-[17%] w-[17%] bg-emerald-500/25 border-x border-emerald-500/50 z-0"></div>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isSCNormal ? "bg-emerald-500" : isSCLow ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(100, Math.max(8, (realSC / 12) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span className="text-amber-400">&lt; 2K Falta Fluido</span>
                  <span className="text-emerald-400 font-bold">3 a 5 K (Faixa Ideal)</span>
                  <span className="text-rose-400">&gt; 6K Sobrecarga</span>
                </div>
              </div>

              {/* 4. Deltas de Ar (Evaporador & Condensador) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-blue-500/20">
                  <div className="text-[10px] font-mono text-zinc-400">ΔT Ar Evaporador (Insufl./Retorno)</div>
                  <div className="text-base font-black font-mono text-cyan-300 mt-0.5">{deltaTArEvap}°C</div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-0.5">Alvo Nominal: 8 a 12°C</div>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-orange-500/20">
                  <div className="text-[10px] font-mono text-zinc-400">ΔT Ar Condensador (Descarga/Amb)</div>
                  <div className="text-base font-black font-mono text-orange-400 mt-0.5">{deltaTArCond}°C</div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-0.5">Alvo Nominal: 10 a 15°C</div>
                </div>
              </div>

            </div>
          </div>

          {/* ===== GRÁFICO 2: MINI DIAGRAMA P-h (PRESSÃO X ENTALPIA EM TEMPO REAL) ===== */}
          <div className="bg-zinc-950/80 border border-cyan-500/20 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(0,240,255,0.06)] relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-yellow-400" />
                <h4 className="font-tactical font-black text-sm uppercase text-yellow-400 tracking-wider">
                  Mini Diagrama P-h (Pressão × Entalpia)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-500/40 font-bold">
                CICLO TERMODINÂMICO
              </span>
            </div>

            {/* Canvas Vetorial do Diagrama Mollier P-h */}
            <div className="w-full bg-[#03070d] rounded-xl p-2 border border-cyan-500/20 relative aspect-[340/165]">
              <svg className="w-full h-full" viewBox="0 0 340 165">
                <defs>
                  <linearGradient id="mollierGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="35%" stopColor="#00f0ff" />
                    <stop offset="70%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>

                {/* Eixos */}
                <line x1="25" y1="145" x2="325" y2="145" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="25" y1="15" x2="25" y2="145" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x="325" y="157" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">Entalpia h (kJ/kg) →</text>
                <text x="28" y="18" fill="#64748b" fontSize="8" fontFamily="monospace">↑ Pressão P (log)</text>

                {/* Domo de Saturação (Curva de Sino do Fluido) */}
                <path 
                  d="M 40 145 Q 140 30 170 30 Q 200 30 295 145" 
                  fill="rgba(0, 240, 255, 0.05)" 
                  stroke="rgba(0, 240, 255, 0.4)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <text x="55" y="138" fill="#38bdf8" fontSize="7.5" fontFamily="monospace">Líq. Saturado</text>
                <text x="240" y="138" fill="#f87171" fontSize="7.5" fontFamily="monospace">Vap. Saturado</text>
                <circle cx="170" cy="30" r="3" fill="#fbbf24" />
                <text x="170" y="24" fill="#fbbf24" fontSize="7.5" textAnchor="middle" fontFamily="monospace">Ponto Crítico</text>

                {/* O Ciclo de Refrigeração Real Plotado (Pontos 1, 2, 3, 4) */}
                {/* Ponto 1: Saída Evap (x=215, y=115) */}
                {/* Ponto 2: Saída Comp (x=280, y=55) */}
                {/* Ponto 3: Saída Cond (x=85, y=55) */}
                {/* Ponto 4: Pós-Expansão (x=85, y=115) */}
                
                {/* Linhas do Ciclo */}
                <path 
                  d="M 85 115 L 215 115 L 280 55 L 85 55 Z" 
                  fill="rgba(0, 240, 255, 0.08)" 
                  stroke="url(#mollierGrad)" 
                  strokeWidth="2.5" 
                  filter="drop-shadow(0 0 6px rgba(0,240,255,0.6))"
                />

                {/* Setas de Fluxo */}
                <path d="M 150 115 L 158 112 L 158 118 Z" fill="#00f0ff" />
                <path d="M 245 83 L 252 79 L 248 87 Z" fill="#ef4444" />
                <path d="M 180 55 L 172 52 L 172 58 Z" fill="#f97316" />
                <path d="M 85 85 L 82 89 L 88 89 Z" fill="#22c55e" />

                {/* 4 Nós com Marcações */}
                <circle cx="215" cy="115" r="4.5" fill="#00f0ff" stroke="#fff" strokeWidth="1.2" />
                <text x="222" y="123" fill="#00f0ff" fontSize="7.5" fontFamily="monospace" fontWeight="bold">1. Sucção (h1)</text>

                <circle cx="280" cy="55" r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="1.2" />
                <text x="282" y="50" fill="#ef4444" fontSize="7.5" fontFamily="monospace" fontWeight="bold">2. Descarga (h2)</text>

                <circle cx="85" cy="55" r="4.5" fill="#f97316" stroke="#fff" strokeWidth="1.2" />
                <text x="75" y="48" fill="#f97316" fontSize="7.5" textAnchor="end" fontFamily="monospace" fontWeight="bold">3. Líquido (h3)</text>

                <circle cx="85" cy="115" r="4.5" fill="#22c55e" stroke="#fff" strokeWidth="1.2" />
                <text x="75" y="123" fill="#22c55e" fontSize="7.5" textAnchor="end" fontFamily="monospace" fontWeight="bold">4. TXV (h4=h3)</text>
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-zinc-900/60 p-2 rounded-xl border border-zinc-800">
              <span className="text-zinc-400">Efeito Frigorífico Útil (h1 - h4):</span>
              <span className="text-cyan-300 font-bold">{qEvap} kJ/kg ({ref})</span>
            </div>
          </div>

          {/* ===== GRÁFICO 3: ENVELOPE OPERACIONAL DE SEGURANÇA DO COMPRESSOR ===== */}
          <div className="bg-zinc-950/80 border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.06)] relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5 h-5 text-emerald-400" />
                <h4 className="font-tactical font-black text-sm uppercase text-emerald-400 tracking-wider">
                  Envelope Operacional do Compressor
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                MAPA COPELAND / DANFOSS
              </span>
            </div>

            {/* Canvas Vetorial do Envelope Operacional 2D */}
            <div className="w-full bg-[#030a06] rounded-xl p-2 border border-emerald-500/20 relative aspect-[340/165]">
              <svg className="w-full h-full" viewBox="0 0 340 165">
                {/* Eixos */}
                <line x1="30" y1="145" x2="320" y2="145" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="30" y1="20" x2="30" y2="145" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x="320" y="157" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">Temp. Evaporação (°C) →</text>
                <text x="33" y="18" fill="#64748b" fontSize="8" fontFamily="monospace">↑ Temp. Condensação (°C)</text>

                {/* Grade de Temperatura */}
                <line x1="30" y1="100" x2="320" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="30" y1="55" x2="320" y2="55" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 2" />
                <text x="25" y="103" fill="#64748b" fontSize="7" textAnchor="end" fontFamily="monospace">35°</text>
                <text x="25" y="58" fill="#64748b" fontSize="7" textAnchor="end" fontFamily="monospace">50°</text>

                {/* Polígono do Envelope Seguro (Zona Verde Nominal) */}
                <polygon 
                  points="65,135 260,135 295,45 130,45 65,85" 
                  fill="rgba(34, 197, 94, 0.15)" 
                  stroke="#22c55e" 
                  strokeWidth="1.8" 
                />
                <text x="180" y="85" fill="#4ade80" fontSize="8.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold" opacity="0.85">
                  ZONA OPERACIONAL SEGURA
                </text>

                {/* Ponto Atual do Compressor (Crosshair Dinâmico) */}
                {/* Mapeamento de Coordenadas: Evap -25 a +15 (x: 50 a 290), Cond +20 a +65 (y: 140 a 35) */}
                {(() => {
                  const ptX = Math.max(50, Math.min(290, 50 + ((tEvapC + 25) / 40) * 240));
                  const ptY = Math.max(35, Math.min(140, 140 - ((tCondC - 20) / 45) * 105));
                  const isSafe = tEvapC >= -20 && tEvapC <= 12 && tCondC <= 60 && compRatio <= 7;
                  return (
                    <g transform={`translate(${ptX}, ${ptY})`}>
                      <circle cx="0" cy="0" r="10" fill={isSafe ? "#22c55e" : "#ef4444"} opacity="0.25" className="animate-ping" />
                      <circle cx="0" cy="0" r="5" fill={isSafe ? "#22c55e" : "#ef4444"} stroke="#ffffff" strokeWidth="1.8" />
                      <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff" strokeWidth="1" />
                      <line x1="0" y1="-8" x2="0" y2="8" stroke="#fff" strokeWidth="1" />
                      <rect x="-35" y="-22" width="70" height="13" rx="3" fill="#000" stroke={isSafe ? "#22c55e" : "#ef4444"} strokeWidth="1" />
                      <text x="0" y="-13" fill={isSafe ? "#4ade80" : "#f87171"} fontSize="7" textAnchor="middle" fontFamily="monospace" fontWeight="900">
                        PONTO ATUAL
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-zinc-400">Status do Envelope:</span>
              <span className={`font-black ${compRatio <= 7 && tCondC <= 60 ? "text-emerald-400" : "text-rose-400"}`}>
                {compRatio <= 7 && tCondC <= 60 ? "OPERANDO EM ZONA SEGURA (SEM SOBRECARGA)" : "ALERTA: OPERANDO PERTO DO LIMITE TÉRMICO"}
              </span>
            </div>
          </div>

          {/* ===== GRÁFICO 4: BALANÇO ENERGÉTICO & FLUXO DE CALOR (1ª LEI) ===== */}
          <div className="bg-zinc-950/80 border border-orange-500/20 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(249,115,22,0.06)] relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-orange-400" />
                <h4 className="font-tactical font-black text-sm uppercase text-orange-400 tracking-wider">
                  Balanço Térmico & Fluxo Energético
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-500/40 font-bold">
                1ª LEI: Qc = Qe + W
              </span>
            </div>

            <div className="space-y-4 pt-1">
              
              {/* Barra Empilhada Proporcional */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-zinc-300">
                  <span>Fluxo Total de Rejeição de Calor:</span>
                  <span className="text-orange-400 font-bold">{qCond} kJ/kg (100%)</span>
                </div>
                <div className="w-full h-4 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex">
                  {/* Qe (Evaporação) */}
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-[9px] font-mono text-black font-black"
                    style={{ width: `${Math.round((qEvap / qCond) * 100)}%` }}
                    title={`Calor Útil Absorvido: ${qEvap} kJ/kg`}
                  >
                    Qe {Math.round((qEvap / qCond) * 100)}%
                  </div>
                  {/* W (Trabalho) */}
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center text-[9px] font-mono text-white font-black"
                    style={{ width: `${100 - Math.round((qEvap / qCond) * 100)}%` }}
                    title={`Trabalho do Compressor: ${wComp} kJ/kg`}
                  >
                    W {100 - Math.round((qEvap / qCond) * 100)}%
                  </div>
                </div>
              </div>

              {/* Detalhamento dos 3 Componentes Térmicos */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-zinc-900/60 p-2 rounded-xl border border-cyan-500/20">
                  <div className="text-[9px] text-zinc-400">Qe (Evaporador)</div>
                  <div className="text-sm font-black text-cyan-300 mt-0.5">{qEvap}</div>
                  <div className="text-[9px] text-zinc-500">kJ/kg (Frio)</div>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-xl border border-amber-500/20">
                  <div className="text-[9px] text-zinc-400">W (Compressor)</div>
                  <div className="text-sm font-black text-amber-400 mt-0.5">{wComp}</div>
                  <div className="text-[9px] text-zinc-500">kJ/kg (Elétrico)</div>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-xl border border-rose-500/20">
                  <div className="text-[9px] text-zinc-400">Qc (Condensador)</div>
                  <div className="text-sm font-black text-rose-400 mt-0.5">{qCond}</div>
                  <div className="text-[9px] text-zinc-500">kJ/kg (Calor)</div>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-zinc-400">Rendimento COP Calculado:</span>
              <span className="text-cyan-300 font-bold">{estimatedCOP.toFixed(2)} W térmica / W elétrica</span>
            </div>
          </div>

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
