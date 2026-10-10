import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { Power, Zap, Fan, ZoomIn, ZoomOut, Info, BookOpen } from "lucide-react";

export default function DigitalTwin() {
  const { 
    selectedRef: ref,
    pSuc, tSuc, pLiq, tLiq,
    pressureUnit, tempUnit, viewMode, expansion
  } = useAppContext();

  const [zoom, setZoom] = useState(1);
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

  // Helper to get p in bar
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;

  // Raw saturation temps in C
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);
  
  // Convert to target temp unit
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;

  const realSC = tCond - tLiq;
  const realSH = tSuc - tEvap;
  
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

  let shortStatus = "OPERAÇÃO NOMINAL";
  let statusColor = "#22c55e"; // green
  if (isSHHigh && isSCLow) { shortStatus = "SUBCARGA"; statusColor = "#f97316"; }
  else if (isSHLow && isSCHigh) { shortStatus = "EXCESSO FLUIDO"; statusColor = "#ef4444"; }
  else if (isSHHigh && isSCHigh) { shortStatus = "RESTRIÇÃO"; statusColor = "#ef4444"; }
  else if (isSHLow && isSCLow) { shortStatus = "BAIXA EVAPORAÇÃO"; statusColor = "#eab308"; }
  else if (!isSHNormal && !isSCNormal) { shortStatus = "FALHA NO CICLO"; statusColor = "#f97316"; }
  
  // Estimate TXV opening based on Superheat (Assume ~6K is 50% open)
  const openingPercent = Math.max(10, Math.min(100, 50 + (realSH - 6) * 8));

  // Estimate COP (Carnot Efficiency * 0.55 Isentropic approx)
  const T_evap_K = tEvapC + 273.15;
  const T_cond_K = tCondC + 273.15;
  const carnotCOP = T_cond_K > T_evap_K ? T_evap_K / (T_cond_K - T_evap_K) : 0;
  const estimatedCOP = Math.max(0.1, carnotCOP * 0.55);
  const compRatio = pLiqBar / (pSucBar || 0.1);
  const efeitoFrig = Math.max(10, 180 - (T_cond_K - T_evap_K));

  return (
    <div className={`mx-auto space-y-6 ${viewMode === 'mobile' ? 'w-full' : 'max-w-7xl'}`}>
      
      {/* THE DIGITAL TWIN CANVAS */}
      <div className="relative glass-panel border border-white/10 rounded-2xl overflow-hidden bg-[#050505] shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        {/* Scrollable Area */}
        <div className="w-full aspect-[600/420] md:aspect-auto md:h-[500px] overflow-auto custom-scrollbar bg-[#050505]">
          <div className="flex min-w-full min-h-full w-max items-center justify-center p-2 md:p-4">
            <div className="relative transition-all duration-300 transform-gpu flex-shrink-0" style={{ width: `${600 * zoom}px`, height: `${420 * zoom}px` }}>
              
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black z-0 rounded-2xl"></div>
              
              {/* Central Grid Lines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none rounded-2xl" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <svg className="w-full h-full z-10 relative drop-shadow-2xl" viewBox="0 0 600 420" preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowRed" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="neonGlowOrange" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                
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
              </defs>

              {/* ===== PIPES ===== */}
              
              {/* 1. DISCHARGE LINE (Red) */}
              <path d="M 100 220 L 100 60 L 220 60" fill="none" stroke="#ef4444" strokeWidth="6" opacity="0.6" filter="url(#neonGlowRed)"/>
              <path d="M 100 220 L 100 60 L 220 60" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 10" className="animate-flow-fast" />

              {/* 2. LIQUID LINE (Orange) */}
              <path d="M 400 60 L 520 60 L 520 120" fill="none" stroke="#f97316" strokeWidth="6" opacity="0.6" filter="url(#neonGlowOrange)"/>
              <path d="M 400 60 L 520 60 L 520 120" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 10" className="animate-flow" />
              
              <path d="M 520 200 L 520 230" fill="none" stroke="#f97316" strokeWidth="6" opacity="0.6" filter="url(#neonGlowOrange)"/>
              <path d="M 520 200 L 520 230" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 10" className="animate-flow" />

              {/* 3. EXPANSION LINE (Green & Gold) */}
              <path d="M 490 260 L 440 260 L 440 360 L 400 360" fill="none" stroke="#22c55e" strokeWidth="6" opacity="0.6" filter="url(#neonGlowGreen)"/>
              <path d="M 490 260 L 440 260 L 440 360 L 400 360" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="10 10" className="animate-flow" />

              {/* 4. SUCTION LINE (Blue) */}
              <path d="M 220 360 L 60 360 L 60 280 L 70 280" fill="none" stroke="#3b82f6" strokeWidth="6" opacity="0.6" filter="url(#neonGlowBlue)"/>
              <path d="M 220 360 L 60 360 L 60 280 L 70 280" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 10" className="animate-flow" />

              {/* TXV CAPILLARY BULB (Silver wire) */}
              <path d="M 520 235 Q 350 210, 150 360" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 3" />
              <rect x="140" y="355" width="20" height="10" fill="#b8860b" rx="3" />


              {/* ===== COMPONENTS ===== */}

              {/* COMPRESSOR (Left) */}
              <g transform="translate(100, 280)">
                <rect x="-30" y="-60" width="60" height="90" fill="url(#compGrad)" rx="8" stroke="#111" strokeWidth="2" />
                <line x1="-20" y1="-40" x2="20" y2="-40" stroke="#081c15" strokeWidth="3" />
                <line x1="-20" y1="-20" x2="20" y2="-20" stroke="#081c15" strokeWidth="3" />
                <line x1="-20" y1="0" x2="20" y2="0" stroke="#081c15" strokeWidth="3" />
                <path d="M -20 -60 Q 0 -85 20 -60 Z" fill="url(#compGrad)" stroke="#111" strokeWidth="2" />
                <rect x="-35" y="30" width="70" height="8" fill="#222" rx="2" />
                {/* Spinning Rotor Animation */}
                <g transform="translate(0, 5)">
                  <circle cx="0" cy="0" r="14" fill="#111" stroke="#333" strokeWidth="2" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <line x1="-10" y1="0" x2="10" y2="0" stroke="#4ade80" strokeWidth="2.5" />
                    <line x1="0" y1="-10" x2="0" y2="10" stroke="#4ade80" strokeWidth="2.5" />
                  </g>
                  <circle cx="0" cy="0" r="3" fill="#fff" />
                </g>
                <text x="0" y="-8" fill="#4ade80" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">COMP</text>
              </g>

              {/* CONDENSER (Top) */}
              <g transform="translate(310, 60)">
                <rect x="-90" y="-30" width="180" height="60" fill="url(#steelGrad)" rx="5" stroke="#111" strokeWidth="2" />
                <path d="M -90 -15 L 90 -15 M -90 0 L 90 0 M -90 15 L 90 15" fill="none" stroke="#ef4444" strokeWidth="4" opacity="0.8" />
                
                {/* Fan 1 */}
                <g transform="translate(-45, 0)">
                  <circle cx="0" cy="0" r="24" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4" fill="#fff" />
                </g>
                
                {/* Fan 2 */}
                <g transform="translate(45, 0)">
                  <circle cx="0" cy="0" r="24" fill="#111" stroke="#333" strokeWidth="3" />
                  <g className="animate-spin-fast" style={{ transformOrigin: "0px 0px" }}>
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(120)" />
                    <path d="M 0,-4 Q 18,-18 20,-2 Q 18,4 0,4 Z" fill="#9ca3af" transform="rotate(240)" />
                  </g>
                  <circle cx="0" cy="0" r="4" fill="#fff" />
                </g>

                <text x="0" y="50" fill="#ef4444" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">CONDENSADOR</text>
              </g>

              {/* FILTER DRIER (Right Top) */}
              <g transform="translate(520, 160)">
                <rect x="-15" y="-40" width="30" height="80" fill="#111" rx="15" stroke="#333" strokeWidth="2" />
                <rect x="-15" y="-25" width="30" height="8" fill="#f97316" />
                <rect x="-15" y="15" width="30" height="8" fill="#f97316" />
                <text x="-22" y="0" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold" transform="rotate(-90)">FILTRO</text>
              </g>

              {/* TXV (Right Bottom) */}
              <g transform="translate(520, 260)">
                <rect x="-10" y="-25" width="20" height="50" fill="url(#brassGrad)" rx="4" />
                <rect x="-20" y="-10" width="40" height="15" fill="url(#brassGrad)" rx="2" />
                <ellipse cx="0" cy="-25" rx="15" ry="8" fill="url(#steelGrad)" stroke="#111" strokeWidth="1" />
                <text x="-50" y="-10" fill="#22c55e" fontSize="16" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #22c55e" }}>TXV</text>
                <text x="-50" y="22" fill="#fbbf24" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #fbbf24" }}>{openingPercent.toFixed(0)}%</text>
                <text x="-50" y="40" fill="#fbbf24" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 12px #fbbf24" }}>ABERTURA</text>
              </g>

              {/* EVAPORATOR (Bottom) */}
              <g transform="translate(310, 360)">
                <rect x="-90" y="-30" width="180" height="60" fill="#0f172a" rx="5" stroke="#1e293b" strokeWidth="2" />
                <path d="M -90 -15 L 90 -15 M -90 0 L 90 0 M -90 15 L 90 15" fill="none" stroke="#3b82f6" strokeWidth="4" opacity="0.8" />
                <pattern id="fins" width="8" height="8" patternUnits="userSpaceOnUse">
                   <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1" opacity="0.3" />
                </pattern>
                <rect x="-90" y="-30" width="180" height="60" fill="url(#fins)" />
                <text x="0" y="-40" fill="#3b82f6" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">EVAPORADOR</text>
              </g>

              {/* SYSTEM STATUS (CENTER RADAR) */}
              <g transform="translate(310, 210)">
                 <rect x="-85" y="-15" width="170" height="30" fill="#050505" rx="15" stroke={statusColor} strokeWidth="2" opacity="0.9" filter={`drop-shadow(0 0 10px ${statusColor})`} />
                 <text x="0" y="4" fill={statusColor} fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold" className="tracking-widest drop-shadow-md">
                    {shortStatus}
                 </text>
              </g>

              {/* ===== LABELS WITH LIVE DATA ===== */}

              {/* Suction Label */}
              <text x="140" y="345" fill="#3b82f6" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #3b82f6" }}>
                {tSuc.toFixed(1)}°{tempUnit}
              </text>
              <text x="140" y="385" fill="#3b82f6" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #3b82f6" }}>
                {pSuc.toFixed(1)} {pressureUnit}
              </text>

              {/* Discharge Label */}
              <text x="160" y="45" fill="#ef4444" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #ef4444" }}>
                {(tCond + 30).toFixed(1)}°{tempUnit}
              </text>
              <text x="160" y="85" fill="#ef4444" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #ef4444" }}>
                {pLiq.toFixed(1)} {pressureUnit}
              </text>

              {/* Liquid Label */}
              <text x="460" y="45" fill="#f97316" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #f97316" }}>
                {tLiq.toFixed(1)}°{tempUnit}
              </text>
              <text x="460" y="85" fill="#f97316" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="900" style={{ textShadow: "0 0 15px #f97316" }}>
                {pLiq.toFixed(1)} {pressureUnit}
              </text>

            </svg>
            </div>
          </div>
        </div>
        
        {/* Status Badge (Fixed relative to outer container) */}
        <div className="absolute top-4 left-4 bg-black/80 px-3 py-2 rounded-lg border border-primary/30 flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)] pointer-events-none z-20">
          <Zap className="text-yellow-400 w-4 h-4 md:w-5 md:h-5 animate-pulse" />
          <span className="font-display tracking-widest text-[9px] md:text-xs text-primary neon-text-cyan">MOTOR DE SIMULAÇÃO (ATIVO)</span>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
          <button onClick={handleZoomOut} className="p-2 md:p-3 bg-black/80 border border-white/20 rounded-lg hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all">
            <ZoomOut className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          </button>
          <div className="flex items-center justify-center px-2 font-mono text-xs text-cyan-400 font-bold bg-black/80 border border-white/10 rounded-lg">
            {(zoom * 100).toFixed(0)}%
          </div>
          <button onClick={handleZoomIn} className="p-2 md:p-3 bg-black/80 border border-white/20 rounded-lg hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all">
            <ZoomIn className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* DIAGNOSTICS REPORT WITH INLINE METRICS */}
      <div className="bg-black/60 border border-white/10 rounded-2xl p-5 md:p-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary shadow-[0_0_15px_rgba(0,240,255,1)]"></div>
        
        <h3 className="text-sm md:text-base font-display font-black tracking-widest uppercase text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          Relatório Analítico do Ciclo
        </h3>

        <div className={`grid gap-8 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          
          <div className="space-y-4">
            <div className="flex flex-col">
               <h4 className="text-xs font-tactical tracking-widest uppercase text-cyan-400 flex items-center gap-1.5">
                 <Zap className="w-3 h-3" /> Eficiência (COP)
               </h4>
               <div className="digital-display font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] text-4xl mt-1">
                 {estimatedCOP.toFixed(2)}
               </div>
            </div>
            <p className="text-[11px] font-mono text-zinc-300 leading-relaxed text-justify">
              O <strong className="text-white">Coeficiente de Performance (COP)</strong> indica a eficiência teórica global do sistema. Este valor significa que para cada 1 kW de energia elétrica consumida, o equipamento gera {estimatedCOP.toFixed(2)} kW de capacidade frigorífica. Valores reais comuns em equipamentos modernos variam entre 3.0 e 5.0. 
              <br/><span className="text-zinc-500 mt-2 block italic">*Estimativa de Carnot (55% isoentrópico) calibrada em tempo real pelas pressões.</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
               <h4 className="text-xs font-tactical tracking-widest uppercase text-rose-400 flex items-center gap-1.5">
                 <Power className="w-3 h-3" /> Razão de Compressão
               </h4>
               <div className="digital-display font-bold text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] text-4xl mt-1">
                 {compRatio.toFixed(1)}<span className="text-2xl text-rose-500/50">:1</span>
               </div>
            </div>
            <div className="text-[11px] font-mono text-zinc-300 leading-relaxed text-justify">
              Representa o esforço mecânico. É a proporção entre a Pressão de Descarga e Sucção. 
              {compRatio < 4 && <div className="text-green-400 mt-3 font-bold bg-green-900/20 p-3 rounded border border-green-500/30">Valor excelente. Compressor aliviado, baixo desgaste e consumo reduzido.</div>}
              {compRatio >= 4 && compRatio <= 7 && <div className="text-yellow-400 mt-3 font-bold bg-yellow-900/20 p-3 rounded border border-yellow-500/30">Valor normal. Condições típicas de operação para AC.</div>}
              {compRatio > 7 && <div className="text-red-400 mt-3 font-bold bg-red-900/20 p-3 rounded border border-red-500/30">ALERTA DE DESGASTE: Esforço excessivo! Risco de carbonização de óleo e alta amperagem.</div>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
               <h4 className="text-xs font-tactical tracking-widest uppercase text-orange-400 flex items-center gap-1.5">
                 <Fan className="w-3 h-3" /> Efeito Frigorífico
               </h4>
               <div className="digital-display font-bold text-orange-400 drop-shadow-[0_0_15px_rgba(255,140,0,0.8)] text-4xl mt-1">
                 {efeitoFrig.toFixed(0)} <span className="text-lg text-orange-500/50">kJ/kg</span>
               </div>
            </div>
            <p className="text-[11px] font-mono text-zinc-300 leading-relaxed text-justify">
              O <strong className="text-white">Efeito Frigorífico</strong> representa a capacidade de absorção de calor por unidade de massa do fluido ({ref}). Quanto maior a condensação (calor) ou menor a evaporação (congelamento), menor este valor se torna, estrangulando o rendimento da máquina.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
