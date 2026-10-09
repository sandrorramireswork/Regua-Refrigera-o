import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings, ArrowRight, Droplets, Wind, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSaturationTemp } from "@/lib/thermodynamics";

const PIPE_SIZES = [
  { name: '1/4"', id_m: 0.0048 },
  { name: '3/8"', id_m: 0.0079 },
  { name: '1/2"', id_m: 0.0109 },
  { name: '5/8"', id_m: 0.0141 },
  { name: '3/4"', id_m: 0.0173 },
  { name: '7/8"', id_m: 0.0205 },
  { name: '1 1/8"', id_m: 0.0260 },
  { name: '1 3/8"', id_m: 0.0326 },
  { name: '1 5/8"', id_m: 0.0390 },
];

export default function Piping() {
  const { 
    selectedRef: ref,
    pSuc, pLiq,
    pressureUnit, tempUnit, viewMode
  } = useAppContext();

  // Local state for capacity
  const [capacity, setCapacity] = useState(12000); // Default 12k BTU/h
  const [length, setLength] = useState(10); // meters or ft

  // Convert pressures
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;

  // Temps
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);

  // Thermodynamics approximation
  const T_evap_K = tEvapC + 273.15;
  const T_cond_K = tCondC + 273.15;
  
  const { sucPipe, liqPipe, sucVel, liqVel } = useMemo(() => {
    // Capacity always in BTU/h in UI, convert to kW for math
    const cap_kW = capacity * 0.000293071; 
    
    // Estimations
    const deltaT = Math.max(1, T_cond_K - T_evap_K);
    const refrigeratingEffect = Math.max(50, 180 - deltaT); // kJ/kg approx
    const massFlow_kg_s = cap_kW / refrigeratingEffect;

    // Specific volume approx
    // Suction gas volume varies heavily with pressure.
    // Rough approx for R410a: v = 0.03 at 10 bar. v = 0.03 * (10 / P)
    let v_suc = 0.03 * (10 / Math.max(0.1, pSucBar));
    // Adjust for R134a, R22, etc. (just rough scales for the visualizer)
    if (ref === "R-134a") v_suc *= 1.5;
    
    const v_liq = 0.0009; // liquid is roughly constant

    const volFlow_suc_m3_s = massFlow_kg_s * v_suc;
    const volFlow_liq_m3_s = massFlow_kg_s * v_liq;

    // Find ideal suction pipe (Target velocity: 8 to 15 m/s)
    let bestSuc = PIPE_SIZES[PIPE_SIZES.length - 1];
    let actualSucVel = 0;
    for (let pipe of PIPE_SIZES) {
      const area = Math.PI * Math.pow(pipe.id_m / 2, 2);
      const vel = volFlow_suc_m3_s / area;
      if (vel <= 18) { // Prefer smaller pipe that stays under 18 m/s for oil return
        bestSuc = pipe;
        actualSucVel = vel;
        if (vel >= 6) break; // Found a good one
      }
    }

    // Find ideal liquid pipe (Target velocity: 0.5 to 1.5 m/s)
    let bestLiq = PIPE_SIZES[PIPE_SIZES.length - 1];
    let actualLiqVel = 0;
    for (let pipe of PIPE_SIZES) {
      const area = Math.PI * Math.pow(pipe.id_m / 2, 2);
      const vel = volFlow_liq_m3_s / area;
      if (vel <= 1.5) {
        bestLiq = pipe;
        actualLiqVel = vel;
        break;
      }
    }

    return { sucPipe: bestSuc.name, liqPipe: bestLiq.name, sucVel: actualSucVel, liqVel: actualLiqVel };
  }, [capacity, pSucBar, T_cond_K, T_evap_K, ref, tempUnit]);

  // Labels based on unit
  const capLabel = "BTU/h";
  const lenLabel = tempUnit === "F" ? "ft" : "m";
  const velLabel = tempUnit === "F" ? "ft/s" : "m/s";

  const displaySucVel = tempUnit === "F" ? sucVel * 3.28084 : sucVel;
  const displayLiqVel = tempUnit === "F" ? liqVel * 3.28084 : liqVel;

  const isSucVelGood = sucVel >= 5 && sucVel <= 15;
  const isLiqVelGood = liqVel >= 0.3 && liqVel <= 1.5;

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
        
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-primary text-sm">DIMENSIONAMENTO</CardTitle>
              <CardDescription className="font-mono text-xs">Ajuste a carga térmica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-primary font-tactical tracking-widest text-xs uppercase">Capacidade ({capLabel})</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-primary/30 text-primary font-mono text-lg" 
                    value={capacity} 
                    onChange={e => setCapacity(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[capacity]} 
                  min={7000} max={120000} step={1000}
                  onValueChange={(val) => setCapacity(val[0])}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-tactical tracking-widest text-xs uppercase">Comp. Equivalente ({lenLabel})</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-white/10 font-mono text-lg" 
                    value={length} 
                    onChange={e => setLength(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[length]} 
                  min={1} max={100} step={1}
                  onValueChange={(val) => setLength(val[0])}
                  className="py-2"
                />
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded text-xs font-mono text-primary/80">
                O aplicativo utiliza as pressões dinâmicas da aba <strong className="text-primary">Matriz SH/SC</strong> para estimar a densidade do fluido <strong>{ref}</strong> em tempo real.
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className={`${viewMode === 'mobile' ? 'col-span-1' : 'lg:col-span-3'} grid gap-6`}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Suction Line */}
            <Card className={`glass-panel border-2 ${isSucVelGood ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-tactical tracking-widest uppercase text-cyan-400 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Wind className="w-4 h-4" /> Linha de Sucção (Gás)</span>
                  {isSucVelGood ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4 border-b border-white/10">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Diâmetro Recomendado</span>
                  <div className={`font-display font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${viewMode === 'mobile' ? 'text-5xl' : 'text-7xl'}`}>
                    {sucPipe}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Velocidade</span>
                    <span className={`font-mono font-bold ${isSucVelGood ? 'text-green-400' : 'text-yellow-400'} ${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>
                      {displaySucVel.toFixed(1)} <span className="text-sm">{velLabel}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Retorno de Óleo</span>
                    <span className={`text-sm font-tactical uppercase tracking-wider ${isSucVelGood ? 'text-green-400' : 'text-yellow-400'}`}>
                      {sucVel < 5 ? "Risco (Baixa Vel.)" : sucVel > 18 ? "Ruído (Alta Vel.)" : "Ideal"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liquid Line */}
            <Card className={`glass-panel border-2 ${isLiqVelGood ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.15)]' : 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-tactical tracking-widest uppercase text-orange-400 flex justify-between items-center">
                  <span className="flex items-center gap-2"><Droplets className="w-4 h-4" /> Linha de Líquido</span>
                  {isLiqVelGood ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4 border-b border-white/10">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Diâmetro Recomendado</span>
                  <div className={`font-display font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${viewMode === 'mobile' ? 'text-5xl' : 'text-7xl'}`}>
                    {liqPipe}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Velocidade</span>
                    <span className={`font-mono font-bold ${isLiqVelGood ? 'text-green-400' : 'text-yellow-400'} ${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>
                      {displayLiqVel.toFixed(2)} <span className="text-sm">{velLabel}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Condição (Flash Gas)</span>
                    <span className={`text-sm font-tactical uppercase tracking-wider ${isLiqVelGood ? 'text-green-400' : 'text-yellow-400'}`}>
                      {liqVel > 1.5 ? "Risco de Bolhas" : "Ideal"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className={`${viewMode === 'mobile' ? 'h-[90px] px-4' : 'h-[120px] px-12'} glass-panel border border-white/10 rounded-xl overflow-hidden relative flex items-center justify-center bg-black/60`}>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="flex w-full items-center justify-between z-10">
               <div className="text-center w-16">
                 <div className={`font-display font-bold text-cyan-400 ${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>{sucPipe}</div>
                 <div className="text-[10px] font-tactical tracking-widest uppercase text-cyan-400/50 mt-1">SUCÇÃO</div>
               </div>

               <div className="flex-1 flex flex-col items-center justify-center relative px-8">
                 <div className="w-full h-4 bg-cyan-900/30 rounded-full border border-cyan-500/30 overflow-hidden relative mb-2">
                   <div className="absolute top-0 left-0 h-full bg-cyan-400 w-full animate-flow opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }}></div>
                 </div>
                 
                 <ArrowRight className="w-6 h-6 text-white/20 absolute" />

                 <div className="w-full h-2 bg-orange-900/30 rounded-full border border-orange-500/30 overflow-hidden relative">
                   <div className="absolute top-0 left-0 h-full bg-orange-400 w-full animate-flow opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)', animationDirection: 'reverse' }}></div>
                 </div>
               </div>

               <div className="text-center w-16">
                 <div className={`font-display font-bold text-orange-400 ${viewMode === 'mobile' ? 'text-xl' : 'text-2xl'}`}>{liqPipe}</div>
                 <div className="text-[10px] font-tactical tracking-widest uppercase text-orange-400/50 mt-1">LÍQUIDO</div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
