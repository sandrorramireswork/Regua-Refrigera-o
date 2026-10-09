import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { Power, Zap, Fan, ZoomIn, ZoomOut } from "lucide-react";

export default function DigitalTwin() {
  const { 
    selectedRef: ref,
    pSuc, tSuc, pLiq, tLiq,
    pressureUnit, tempUnit, viewMode
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

  // Estimate COP (Carnot Efficiency * 0.5 Isentropic approx)
  const T_evap_K = tEvapC + 273.15;
  const T_cond_K = tCondC + 273.15;
  const carnotCOP = T_cond_K > T_evap_K ? T_evap_K / (T_cond_K - T_evap_K) : 0;
  const estimatedCOP = Math.max(0.1, carnotCOP * 0.55);

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
        
        {/* Analytics Left */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-panel border-cyan-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-tactical tracking-widest uppercase text-cyan-400">Eficiência (COP)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] ${viewMode === 'mobile' ? 'text-4xl' : 'text-5xl'}`}>
                {estimatedCOP.toFixed(2)}
              </div>
              <p className="mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Estimativa IA baseada em Ciclo Carnot (55%)
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-rose-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-tactical tracking-widest uppercase text-rose-400 flex items-center gap-2">
                <Power className="w-4 h-4 animate-pulse" /> Razão Compressão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] ${viewMode === 'mobile' ? 'text-4xl' : 'text-5xl'}`}>
                {(pLiqBar / (pSucBar || 0.1)).toFixed(1)}:1
              </div>
              <p className="mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Pressão Absoluta (Descarga / Sucção)
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-orange-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-tactical tracking-widest uppercase text-orange-400 flex items-center gap-2">
                <Fan className="w-4 h-4 animate-spin-slow" /> Efeito Frigorífico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-orange-400 drop-shadow-[0_0_15px_rgba(255,140,0,0.8)] ${viewMode === 'mobile' ? 'text-4xl' : 'text-5xl'}`}>
                {Math.max(10, 180 - (T_cond_K - T_evap_K)).toFixed(0)} <span className={`${viewMode === 'mobile' ? 'text-sm' : 'text-lg'}`}>kJ/kg</span>
              </div>
              <p className="mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Entalpia Estimada (h1 - h4)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* The Digital Twin Canvas */}
        <div className="lg:col-span-2 relative glass-panel border border-white/10 rounded-xl overflow-hidden bg-[#050505]">
          
          {/* Scrollable Area */}
          <div className="w-full h-[500px] overflow-auto custom-scrollbar relative">
            <div className="relative transition-all duration-300 transform-gpu" style={{ minWidth: `${800 * zoom}px`, minHeight: `${500 * zoom}px` }}>
              
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black z-0"></div>
              
              {/* Central Grid Lines */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

              <svg className="w-full h-full z-10 relative" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="neonGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="neonGlowRed" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="neonGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* PIPES */}
            
            {/* Suction Line (Evap to Comp) - Vapor (Red) */}
            <path d="M 200 400 L 400 400" fill="none" stroke="#ff003c" strokeWidth="8" opacity="0.4" filter="url(#neonGlowRed)"/>
            <path d="M 200 400 L 400 400" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="15 15" className="animate-flow" />

            {/* Discharge Line (Comp to Cond) - Vapor (Red) */}
            <path d="M 400 320 L 400 150 L 600 150" fill="none" stroke="#ff003c" strokeWidth="8" opacity="0.4" filter="url(#neonGlowRed)" />
            <path d="M 400 320 L 400 150 L 600 150" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="15 15" className="animate-flow-fast" />

            {/* Liquid Line (Cond to TXV) - Liquid (Cyan) */}
            <path d="M 600 250 L 600 450 L 200 450 L 200 150 L 380 150" fill="none" stroke="#00f0ff" strokeWidth="8" opacity="0.4" filter="url(#neonGlowBlue)" />
            <path d="M 600 250 L 600 450 L 200 450 L 200 150 L 380 150" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="15 15" className="animate-flow" style={{ animationDirection: 'reverse' }} />

            {/* Expansion to Evap - Phase Change (Green) */}
            <path d="M 420 150 L 500 150 L 500 250" fill="none" stroke="#00ff66" strokeWidth="8" opacity="0.4" filter="url(#neonGlowGreen)" />
            <path d="M 420 150 L 500 150 L 500 250" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="15 15" className="animate-flow" />

            {/* COMPONENTS */}
            {/* Compressor */}
            <circle cx="400" cy="360" r="45" fill="#111" stroke="#fff" strokeWidth="3" />
            <circle cx="400" cy="360" r="35" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4 4" className="animate-spin-slow" />
            <text x="400" y="365" fill="#fff" fontSize="20" textAnchor="middle" fontFamily="monospace" fontWeight="bold">CP</text>
            
            {/* Evaporator (Left) */}
            <rect x="100" y="250" width="100" height="150" fill="rgba(0, 240, 255, 0.1)" stroke="#00f0ff" strokeWidth="3" filter="url(#neonGlowBlue)" rx="10" />
            <path d="M 120 270 Q 150 250 150 280 T 180 270" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.5"/>
            <path d="M 120 310 Q 150 290 150 320 T 180 310" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.5"/>
            <path d="M 120 350 Q 150 330 150 360 T 180 350" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.5"/>
            <text x="150" y="330" fill="#ffffff" fontSize="16" textAnchor="middle" fontFamily="monospace" transform="rotate(-90 150,330)" fontWeight="bold" letterSpacing="4">EVAPORADOR</text>

            {/* Condenser (Right) */}
            <rect x="600" y="100" width="100" height="150" fill="rgba(244, 63, 94, 0.1)" stroke="#f43f5e" strokeWidth="3" filter="url(#neonGlowRed)" rx="10" />
            <path d="M 620 120 Q 650 100 650 130 T 680 120" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.5"/>
            <path d="M 620 160 Q 650 140 650 170 T 680 160" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.5"/>
            <path d="M 620 200 Q 650 180 650 210 T 680 200" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.5"/>
            <text x="650" y="180" fill="#ffffff" fontSize="16" textAnchor="middle" fontFamily="monospace" transform="rotate(90 650,180)" fontWeight="bold" letterSpacing="4">CONDENSADOR</text>

            {/* TXV */}
            <polygon points="380,120 380,180 430,150" fill="#00f0ff" stroke="#fff" strokeWidth="2" />
            <polygon points="430,120 430,180 380,150" fill="#00ff66" stroke="#fff" strokeWidth="2" />
            <circle cx="405" cy="150" r="10" fill="#111" stroke="#fff" strokeWidth="2" />
            <text x="405" y="110" fill="#fff" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">TXV</text>

            {/* LIVE DATA LABELS */}
            
            {/* Suction Label */}
            <rect x="230" y="360" width="140" height="40" fill="rgba(30,0,10,0.9)" stroke="#ff003c" strokeWidth="1.5" rx="6" />
            <text x="300" y="378" fill="#ff003c" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold" opacity="0.7">LINHA DE SUCÇÃO</text>
            <text x="300" y="394" fill="#ffffff" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {tSuc.toFixed(1)}°{tempUnit} / {pSuc.toFixed(1)} {pressureUnit}
            </text>

            {/* Discharge Label (Estimated based on Cond) */}
            <rect x="430" y="150" width="140" height="40" fill="rgba(30,0,10,0.9)" stroke="#ff003c" strokeWidth="1.5" rx="6" />
            <text x="500" y="168" fill="#ff003c" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold" opacity="0.7">LINHA DE DESCARGA</text>
            <text x="500" y="184" fill="#ffffff" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {(tCond + 30).toFixed(1)}°{tempUnit} / {pLiq.toFixed(1)} {pressureUnit}
            </text>

            {/* Liquid Label */}
            <rect x="350" y="430" width="150" height="40" fill="rgba(0,20,30,0.9)" stroke="#00f0ff" strokeWidth="1.5" rx="6" />
            <text x="425" y="448" fill="#00f0ff" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold" opacity="0.7">LINHA DE LÍQUIDO</text>
            <text x="425" y="464" fill="#ffffff" fontSize="14" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {tLiq.toFixed(1)}°{tempUnit} (SC {realSC.toFixed(1)})
            </text>
            
            </svg>
            </div>
          </div>
          
          {/* Status Badge (Fixed relative to outer container) */}
          <div className="absolute top-4 left-4 bg-black/80 px-3 py-2 rounded-lg border border-primary/30 flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)] pointer-events-none">
            <Zap className="text-yellow-400 w-5 h-5 animate-pulse" />
            <span className="font-display tracking-widest text-xs text-primary neon-text-cyan">MOTOR DE SIMULAÇÃO (ATIVO)</span>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-20">
            <button onClick={handleZoomOut} className="p-3 bg-black/80 border border-white/20 rounded-lg hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all">
              <ZoomOut className="w-5 h-5 text-cyan-400" />
            </button>
            <div className="flex items-center justify-center px-2 font-mono text-xs text-cyan-400 font-bold bg-black/80 border border-white/10 rounded-lg">
              {(zoom * 100).toFixed(0)}%
            </div>
            <button onClick={handleZoomIn} className="p-3 bg-black/80 border border-white/20 rounded-lg hover:bg-white/10 hover:border-cyan-500/50 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all">
              <ZoomIn className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
