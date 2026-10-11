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
    pressureUnit, tempUnit
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

    const length_m = tempUnit === "F" ? length * 0.3048 : length;
    
    // Dynamic max velocity based on length (longer line = lower max velocity allowed to prevent excessive pressure drop)
    let max_suc_vel = 18 - Math.max(0, (length_m - 10) * 0.2);
    max_suc_vel = Math.max(10, max_suc_vel); // Never restrict below 10 m/s just for pressure drop
    
    let bestSucIndex = 0;
    let actualSucVel = 0;
    for (let i = 0; i < PIPE_SIZES.length; i++) {
      const pipe = PIPE_SIZES[i]!;
      const area = Math.PI * Math.pow(pipe.id_m / 2, 2);
      const vel = volFlow_suc_m3_s / area;
      
      bestSucIndex = i;
      actualSucVel = vel;
      
      if (vel <= max_suc_vel) {
         if (vel < 5 && i > 0) {
             // Velocity too low for oil return in this larger pipe, fallback to smaller pipe
             bestSucIndex = i - 1;
             const prevPipe = PIPE_SIZES[bestSucIndex]!;
             const prevArea = Math.PI * Math.pow(prevPipe.id_m / 2, 2);
             actualSucVel = volFlow_suc_m3_s / prevArea;
         }
         break;
      }
    }
    const bestSuc = PIPE_SIZES[bestSucIndex]!;

    // Find ideal liquid pipe (Target velocity: 0.5 to 1.5 m/s)
    let max_liq_vel = 1.5 - Math.max(0, (length_m - 10) * 0.015);
    max_liq_vel = Math.max(1.0, max_liq_vel);
    
    let bestLiqIndex = 0;
    let actualLiqVel = 0;
    for (let i = 0; i < PIPE_SIZES.length; i++) {
      const pipe = PIPE_SIZES[i]!;
      const area = Math.PI * Math.pow(pipe.id_m / 2, 2);
      const vel = volFlow_liq_m3_s / area;
      
      bestLiqIndex = i;
      actualLiqVel = vel;
      
      if (vel <= max_liq_vel) {
        break;
      }
    }
    const bestLiq = PIPE_SIZES[bestLiqIndex]!;

    return { sucPipe: bestSuc.name, liqPipe: bestLiq.name, sucVel: actualSucVel, liqVel: actualLiqVel };
  }, [capacity, length, pSucBar, T_cond_K, T_evap_K, ref, tempUnit]);

  // Labels based on unit
  const capLabel = "BTU/h";
  const lenLabel = tempUnit === "F" ? "ft" : "m";
  const velLabel = tempUnit === "F" ? "ft/s" : "m/s";

  const displaySucVel = tempUnit === "F" ? sucVel * 3.28084 : sucVel;
  const displayLiqVel = tempUnit === "F" ? liqVel * 3.28084 : liqVel;

  const isSucVelGood = sucVel >= 5 && sucVel <= 15;
  const isLiqVelGood = liqVel >= 0.3 && liqVel <= 1.5;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1">
        
        {/* Controls Column */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)] p-3 sm:p-6 rounded-xl sm:rounded-2xl">
            <CardHeader className="p-2 sm:p-4 pb-2">
              <CardTitle className="font-display tracking-widest text-primary text-sm sm:text-base">DIMENSIONAMENTO DE TUBULAÇÃO</CardTitle>
              <CardDescription className="font-mono text-xs sm:text-sm">Ajuste a carga térmica e comprimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-2 sm:p-4 pt-2">
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-primary font-tactical tracking-widest text-xs sm:text-sm uppercase">Capacidade ({capLabel})</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-primary/30 text-primary font-mono text-xl sm:text-2xl h-11 sm:h-12 font-bold" 
                    value={capacity} 
                    onChange={e => setCapacity(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[capacity]} 
                  min={7000} max={120000} step={1000}
                  onValueChange={(val) => setCapacity(val[0]!)}
                  className="py-2 cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-tactical tracking-widest text-xs sm:text-sm uppercase">Comp. Equivalente ({lenLabel})</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-white/10 font-mono text-xl sm:text-2xl h-11 sm:h-12 font-bold" 
                    value={length} 
                    onChange={e => setLength(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[length]} 
                  min={1} max={100} step={1}
                  onValueChange={(val) => setLength(val[0]!)}
                  className="py-2 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs sm:text-sm font-mono text-primary/80">
                O aplicativo utiliza as pressões dinâmicas da aba <strong className="text-primary">Matriz SH/SC</strong> para estimar a densidade do fluido <strong>{ref}</strong> em tempo real.
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1">
          
          {/* Suction Line */}
          <Card className={`glass-panel border-2 p-3 sm:p-6 rounded-xl sm:rounded-2xl ${isSucVelGood ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'}`}>
            <CardHeader className="p-2 sm:p-4 pb-2">
              <CardTitle className="text-sm sm:text-base font-tactical tracking-widest uppercase text-cyan-400 flex justify-between items-center">
                <span className="flex items-center gap-2"><Wind className="w-5 h-5" /> Linha de Sucção (Gás)</span>
                {isSucVelGood ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-2 sm:p-4">
              <div className="flex flex-col items-center justify-center py-3 sm:py-5 border-b border-white/10">
                <span className="text-xs sm:text-sm font-mono text-muted-foreground uppercase tracking-widest mb-1">Diâmetro Recomendado</span>
                <div className="font-display font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] text-6xl sm:text-7xl md:text-8xl tracking-tight">
                  {sucPipe}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">Velocidade</span>
                  <span className={`font-mono font-black ${isSucVelGood ? 'text-green-400' : 'text-yellow-400'} text-2xl sm:text-3xl`}>
                    {displaySucVel.toFixed(1)} <span className="text-sm sm:text-base font-normal">{velLabel}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">Retorno de Óleo</span>
                  <span className={`text-sm sm:text-base font-tactical uppercase tracking-wider font-bold ${isSucVelGood ? 'text-green-400' : 'text-yellow-400'}`}>
                    {sucVel < 5 ? "Risco (Baixa Vel.)" : sucVel > 18 ? "Ruído (Alta Vel.)" : "Ideal"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liquid Line */}
          <Card className={`glass-panel border-2 p-3 sm:p-6 rounded-xl sm:rounded-2xl ${isLiqVelGood ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.15)]' : 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]'}`}>
            <CardHeader className="p-2 sm:p-4 pb-2">
              <CardTitle className="text-sm sm:text-base font-tactical tracking-widest uppercase text-orange-400 flex justify-between items-center">
                <span className="flex items-center gap-2"><Droplets className="w-5 h-5" /> Linha de Líquido</span>
                {isLiqVelGood ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-2 sm:p-4">
              <div className="flex flex-col items-center justify-center py-3 sm:py-5 border-b border-white/10">
                <span className="text-xs sm:text-sm font-mono text-muted-foreground uppercase tracking-widest mb-1">Diâmetro Recomendado</span>
                <div className="font-display font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] text-6xl sm:text-7xl md:text-8xl tracking-tight">
                  {liqPipe}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">Velocidade</span>
                  <span className={`font-mono font-black ${isLiqVelGood ? 'text-green-400' : 'text-yellow-400'} text-2xl sm:text-3xl`}>
                    {displayLiqVel.toFixed(2)} <span className="text-sm sm:text-base font-normal">{velLabel}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest block mb-0.5">Condição (Flash Gas)</span>
                  <span className={`text-sm sm:text-base font-tactical uppercase tracking-wider font-bold ${isLiqVelGood ? 'text-green-400' : 'text-yellow-400'}`}>
                    {liqVel > 1.5 ? "Risco de Bolhas" : "Ideal"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="h-[110px] sm:h-[130px] px-3 sm:px-10 glass-panel border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden relative flex items-center justify-center bg-black/60">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="flex w-full items-center justify-between z-10">
               <div className="text-center w-20">
                 <div className="font-display font-black text-cyan-400 text-2xl sm:text-3xl">{sucPipe}</div>
                 <div className="text-[10px] sm:text-xs font-tactical tracking-widest uppercase text-cyan-400/70 mt-1 font-bold">SUCÇÃO</div>
               </div>

               <div className="flex-1 flex flex-col items-center justify-center relative px-4 sm:px-8">
                 <div className="w-full h-4 sm:h-5 bg-cyan-900/30 rounded-full border border-cyan-500/30 overflow-hidden relative mb-2">
                   <div className="absolute top-0 left-0 h-full bg-cyan-400 w-full animate-flow opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }}></div>
                 </div>
                 
                 <ArrowRight className="w-6 h-6 text-white/30 absolute" />

                 <div className="w-full h-2.5 sm:h-3 bg-orange-900/30 rounded-full border border-orange-500/30 overflow-hidden relative">
                   <div className="absolute top-0 left-0 h-full bg-orange-400 w-full animate-flow opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)', animationDirection: 'reverse' }}></div>
                 </div>
               </div>

               <div className="text-center w-20">
                 <div className="font-display font-black text-orange-400 text-2xl sm:text-3xl">{liqPipe}</div>
                 <div className="text-[10px] sm:text-xs font-tactical tracking-widest uppercase text-orange-400/70 mt-1 font-bold">LÍQUIDO</div>
               </div>
            </div>
          </div>

          {/* Alert Grid */}
          <Card className={`glass-panel border-white/10 ${(!isSucVelGood || !isLiqVelGood) ? 'alert-card-orange' : 'shadow-[0_0_20px_rgba(0,255,102,0.1)] border-green-500/50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display tracking-widest text-primary text-lg uppercase">
                {(!isSucVelGood || !isLiqVelGood) ? <AlertTriangle className="h-5 w-5 text-yellow-400 animate-pulse" /> : <CheckCircle2 className="h-5 w-5 text-[#00FF66]" />}
                Análise de Conformidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!isSucVelGood || !isLiqVelGood) ? (
                <div className="grid gap-3">
                   {!isSucVelGood && (
                     <div className="p-3 bg-black/40 rounded-lg border border-yellow-500/30 border-l-4 border-l-yellow-400">
                       <h4 className="text-yellow-400 font-tactical tracking-widest text-xs uppercase mb-1">
                         {sucVel > 15 ? "Alta Velocidade / Perda de Carga" : "Baixa Velocidade / Retorno de Óleo"}
                       </h4>
                       <p className="text-sm font-mono text-white/80">
                         {sucVel > 15 
                           ? `A velocidade do gás (${displaySucVel.toFixed(1)} ${velLabel}) excede o ideal, agravada pelo comprimento da linha de ${length} ${lenLabel}. Risco de alta perda de carga e perda de rendimento. O diâmetro calculado de ${sucPipe} está no limite térmico.`
                           : `A velocidade do gás (${displaySucVel.toFixed(1)} ${velLabel}) está muito baixa. Risco crítico de falha no retorno de óleo ao compressor (min. 5 m/s), especialmente em tubulações verticais (risers). O sistema priorizou esse diâmetro de ${sucPipe} para evitar perda de carga excessiva, mas atenção ao óleo.`}
                       </p>
                     </div>
                  )}
                  {!isLiqVelGood && (
                     <div className="p-3 bg-black/40 rounded-lg border border-yellow-500/30 border-l-4 border-l-yellow-400">
                       <h4 className="text-yellow-400 font-tactical tracking-widest text-xs uppercase mb-1">
                         {liqVel > 1.5 ? "Risco de Flash Gas (Bolhas)" : "Baixa Velocidade no Líquido"}
                       </h4>
                       <p className="text-sm font-mono text-white/80">
                         {liqVel > 1.5
                           ? `A velocidade do líquido (${displayLiqVel.toFixed(2)} ${velLabel}) excede o ideal para a distância de ${length} ${lenLabel}. Risco de Golpe de Aríete e geração de Flash Gas devido à perda de carga, o que reduz a eficiência da válvula de expansão.`
                           : `A velocidade do líquido (${displayLiqVel.toFixed(2)} ${velLabel}) está abaixo do ideal. Indica possível superdimensionamento da linha, exigindo maior massa de fluido refrigerante na instalação.`}
                       </p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-black/40 rounded-lg border border-[#00FF66]/30 flex flex-col gap-2">
                  <p className="text-[#00FF66] font-bold tracking-wide">TUBULAÇÃO DENTRO DOS PARÂMETROS NOMINAIS</p>
                  <p className="text-sm font-mono text-white/80">
                    As velocidades de sucção ({displaySucVel.toFixed(1)} {velLabel}) e de líquido ({displayLiqVel.toFixed(2)} {velLabel}) são perfeitamente adequadas para garantir máxima eficiência energética, zero ruídos obstrutivos e ótimo arraste de óleo de volta ao cárter do compressor.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
