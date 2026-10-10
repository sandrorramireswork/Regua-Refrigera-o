import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Wind, Droplets, Thermometer, Flame } from "lucide-react";

// Psychrometric Calculations (Standard Atmospheric Pressure 101325 Pa)
function calcPsychrometrics(Tdb_C: number, RH: number) {
  // Tetens formula for saturation vapor pressure (hPa)
  const E_s = 6.112 * Math.exp((17.67 * Tdb_C) / (Tdb_C + 243.5));
  const E_s_Pa = E_s * 100;
  
  // Actual vapor pressure (hPa & Pa)
  const E = E_s * (RH / 100);
  const E_Pa = E * 100;

  // Dew point
  let Tdp_C = 0;
  if (E > 0) {
    const v = Math.log(E / 6.112);
    Tdp_C = (243.5 * v) / (17.67 - v);
  }

  // Humidity Ratio (kg/kg)
  const P_atm = 101325;
  const W = 0.622 * E_Pa / (P_atm - E_Pa);
  const W_g = W * 1000; // g/kg

  // Enthalpy (kJ/kg)
  const h = 1.006 * Tdb_C + W * (2501 + 1.84 * Tdb_C);

  // Specific Volume (m3/kg)
  const T_K = Tdb_C + 273.15;
  const v = (287.058 * T_K) / (P_atm - E_Pa);

  // Wet Bulb Temp (Approximate Stull formula for sea level)
  const Twb_C = Tdb_C * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) 
                + Math.atan(Tdb_C + RH) 
                - Math.atan(RH - 1.676331) 
                + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) 
                - 4.686035;

  return { Tdp_C, W_g, h, v, Twb_C };
}

export default function Psychrometrics() {
  const { tempUnit, viewMode } = useAppContext();
  
  // Inputs in Celsius regardless of unit (for math), converted for display
  const [tdbC, setTdbC] = useState(25);
  const [rh, setRh] = useState(50);

  // Derived
  const { Tdp_C, W_g, h, v, Twb_C } = useMemo(() => calcPsychrometrics(tdbC, rh), [tdbC, rh]);

  // Conversions for Display
  const Tdb = tempUnit === "F" ? (tdbC * 9/5) + 32 : tdbC;
  const Twb = tempUnit === "F" ? (Twb_C * 9/5) + 32 : Twb_C;
  const Tdp = tempUnit === "F" ? (Tdp_C * 9/5) + 32 : Tdp_C;
  
  // Enthalpy conversion (kJ/kg to BTU/lb)
  const enthalpy = tempUnit === "F" ? h * 0.429923 : h;
  const enthalpyUnit = tempUnit === "F" ? "BTU/lb" : "kJ/kg";

  // Specific Volume conversion (m3/kg to ft3/lb)
  const volume = tempUnit === "F" ? v * 16.0185 : v;
  const volumeUnit = tempUnit === "F" ? "ft³/lb" : "m³/kg";

  // Moisture conversion (g/kg to grains/lb)
  const moisture = tempUnit === "F" ? W_g * 7.0 : W_g;
  const moistureUnit = tempUnit === "F" ? "gr/lb" : "g/kg";

  // Handle Input Changes
  const handleTdbChange = (val: number) => {
    // If input is in F, convert back to C for state
    let c = tempUnit === "F" ? (val - 32) * 5/9 : val;
    setTdbC(c);
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
        
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(138,43,226,0.1)]">
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-[#a855f7] text-sm">PROPRIEDADES DO AR</CardTitle>
              <CardDescription className="font-mono text-xs">Ajuste os parâmetros de entrada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#a855f7] font-tactical tracking-widest text-xs uppercase">T. Bulbo Seco (°{tempUnit})</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-[#a855f7]/30 text-[#a855f7] font-mono text-lg" 
                    value={Tdb.toFixed(1)} 
                    onChange={e => handleTdbChange(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[Tdb]} 
                  min={tempUnit === "F" ? 30 : 0} max={tempUnit === "F" ? 110 : 45} step={0.5}
                  onValueChange={(val) => handleTdbChange(val[0]!)}
                  className="py-2"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-cyan-400 font-tactical tracking-widest text-xs uppercase">Umidade Relativa (%)</Label>
                  <Input 
                    type="number" 
                    className="bg-black/50 border-cyan-500/30 text-cyan-400 font-mono text-lg" 
                    value={rh.toFixed(1)} 
                    onChange={e => setRh(Number(e.target.value))} 
                  />
                </div>
                <Slider 
                  value={[rh]} 
                  min={1} max={100} step={1}
                  onValueChange={(val) => setRh(val[0]!)}
                  className="py-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Matrix */}
        <div className={`${viewMode === 'mobile' ? 'col-span-1' : 'lg:col-span-3'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
          
          <Card className="glass-panel border-cyan-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-tactical tracking-widest uppercase text-cyan-400 flex items-center gap-2">
                <Thermometer className="w-4 h-4" /> Bulbo Úmido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'}`}>
                {Twb.toFixed(1)} <span className={`${viewMode === 'mobile' ? 'text-sm' : 'text-xl'}`}>°{tempUnit}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-tactical tracking-widest uppercase text-blue-400 flex items-center gap-2">
                <Droplets className="w-4 h-4" /> Ponto de Orvalho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.8)] ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'}`}>
                {Tdp.toFixed(1)} <span className={`${viewMode === 'mobile' ? 'text-sm' : 'text-xl'}`}>°{tempUnit}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-purple-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-tactical tracking-widest uppercase text-purple-400 flex items-center gap-2">
                <Wind className="w-4 h-4" /> Umidade Absoluta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)] ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'}`}>
                {moisture.toFixed(1)}
              </div>
              <p className="mt-1 text-xs font-mono text-muted-foreground uppercase">{moistureUnit}</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-rose-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-tactical tracking-widest uppercase text-rose-400 flex items-center gap-2">
                <Flame className="w-4 h-4" /> Entalpia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`digital-display font-bold text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)] ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'}`}>
                {enthalpy.toFixed(1)}
              </div>
              <p className="mt-1 text-xs font-mono text-muted-foreground uppercase">{enthalpyUnit}</p>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 h-[300px] mt-4 glass-panel border border-white/10 rounded-xl overflow-hidden relative bg-black/60 flex flex-col justify-center items-center">
            {/* Visualizer Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black z-0"></div>
            
            {/* Simple Graphic Representation */}
            <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center">
               <h3 className="text-white/50 font-tactical tracking-widest uppercase text-sm mb-8">Radar de Conforto Térmico</h3>
               
               <div className="relative w-64 h-32 border-b-2 border-l-2 border-white/20">
                 {/* Y Axis - Humidity */}
                 <span className="absolute -left-12 top-0 text-[10px] font-mono text-purple-400">Alto W</span>
                 <span className="absolute -left-12 bottom-0 text-[10px] font-mono text-purple-400">Baixo W</span>
                 
                 {/* X Axis - Temp */}
                 <span className="absolute left-0 -bottom-6 text-[10px] font-mono text-rose-400">Frio</span>
                 <span className="absolute right-0 -bottom-6 text-[10px] font-mono text-rose-400">Quente</span>

                 {/* Comfort Zone Polygon */}
                 <div className="absolute left-[30%] top-[20%] w-[35%] h-[50%] bg-green-500/10 border border-green-500/30 rounded shadow-[0_0_15px_rgba(0,255,102,0.1)]">
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-tactical text-green-400 uppercase">Zona Ideal</span>
                 </div>

                 {/* Current Point Dot */}
                 <div 
                   className="absolute w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(0,240,255,1)] transform -translate-x-1/2 translate-y-1/2 transition-all duration-500 ease-out"
                   style={{
                     left: `${Math.min(100, Math.max(0, (tdbC / 45) * 100))}%`,
                     bottom: `${Math.min(100, Math.max(0, (W_g / 30) * 100))}%`
                   }}
                 >
                    <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400 opacity-50"></div>
                 </div>
               </div>

               <div className="mt-12 flex gap-4 text-xs font-mono">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_5px_rgba(244,63,94,0.8)]"></div> Calor Sensível
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.8)]"></div> Calor Latente
                 </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
