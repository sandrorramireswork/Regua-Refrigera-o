import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Wind, Droplets, Thermometer, Flame, Activity, Zap, Settings, MapPin, Loader2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Psychrometric Calculations (Standard Atmospheric Pressure 101325 Pa)
function calcPsychrometrics(Tdb_C: number, RH: number) {
  const E_s = 6.112 * Math.exp((17.67 * Tdb_C) / (Tdb_C + 243.5));
  const E_s_Pa = E_s * 100;
  
  const E = E_s * (RH / 100);
  const E_Pa = E * 100;

  let Tdp_C = 0;
  if (E > 0) {
    const v = Math.log(E / 6.112);
    Tdp_C = (243.5 * v) / (17.67 - v);
  }

  const P_atm = 101325;
  const W = 0.622 * E_Pa / (P_atm - E_Pa);
  const W_g = W * 1000;

  const h = 1.006 * Tdb_C + W * (2501 + 1.84 * Tdb_C);
  const T_K = Tdb_C + 273.15;
  const v = (287.058 * T_K) / (P_atm - E_Pa);

  const Twb_C = Tdb_C * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) 
                + Math.atan(Tdb_C + RH) 
                - Math.atan(RH - 1.676331) 
                + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) 
                - 4.686035;

  return { Tdp_C, W_g, h, v, Twb_C };
}

export default function Psychrometrics() {
  const { 
    tempUnit, viewMode,
    expansion, setExpansion,
    tExt, setTExt,
    tWb, setTWb,
    tdbC, setTdbC,
    rh, setRh,
    tsupC, setTsupC
  } = useAppContext();

  // Derived Psychrometrics
  const { Tdp_C, W_g, h, v, Twb_C } = useMemo(() => calcPsychrometrics(tdbC, rh), [tdbC, rh]);

  // Delta T Calculation
  const deltaTC = tdbC - tsupC;

  // Display Conversions
  const Tdb = tempUnit === "F" ? (tdbC * 9/5) + 32 : tdbC;
  const Tsup = tempUnit === "F" ? (tsupC * 9/5) + 32 : tsupC;
  const Twb = tempUnit === "F" ? (Twb_C * 9/5) + 32 : Twb_C;
  const Tdp = tempUnit === "F" ? (Tdp_C * 9/5) + 32 : Tdp_C;
  const DeltaT = tempUnit === "F" ? deltaTC * 9/5 : deltaTC;
  
  const enthalpy = tempUnit === "F" ? h * 0.429923 : h;
  const enthalpyUnit = tempUnit === "F" ? "BTU/lb" : "kJ/kg";

  const moisture = tempUnit === "F" ? W_g * 7.0 : W_g;
  const moistureUnit = tempUnit === "F" ? "gr/lb" : "g/kg";

  const handleTdbChange = (val: number) => {
    setTdbC(tempUnit === "F" ? (val - 32) * 5/9 : val);
  };
  const handleTsupChange = (val: number) => {
    setTsupC(tempUnit === "F" ? (val - 32) * 5/9 : val);
  };

  // Generate Radar Data (Scores 0-100)
  const radarData = useMemo(() => {
    // Score Delta T: Ideal ~ 11C
    const dtScore = Math.max(0, 100 - Math.abs(deltaTC - 11) * 10);
    // Score Conforto Tdb: Ideal ~ 24C
    const tdbScore = Math.max(0, 100 - Math.abs(tdbC - 24) * 10);
    // Score Umidade: Ideal ~ 50%
    const rhScore = Math.max(0, 100 - Math.abs(rh - 50) * 2);
    // Eficiência Latente (Orvalho): Ideal if Tdp is comfortably below Tdb
    const dpScore = Math.max(0, 100 - Math.abs((tdbC - Tdp_C) - 10) * 5);
    // Entalpia/Carga: Lower enthalpy is usually better for AC capacity
    const entScore = Math.max(0, 100 - Math.max(0, h - 50));

    return [
      { subject: 'Rendimento (ΔT)', A: dtScore, fullMark: 100 },
      { subject: 'Conforto Térmico', A: tdbScore, fullMark: 100 },
      { subject: 'Umidade Relativa', A: rhScore, fullMark: 100 },
      { subject: 'Controle Latente', A: dpScore, fullMark: 100 },
      { subject: 'Carga Entálpica', A: entScore, fullMark: 100 },
    ];
  }, [deltaTC, tdbC, rh, Tdp_C, h]);

  return (
    <div className={`mx-auto bg-[#0A0E17] rounded-3xl p-4 md:p-8 border-2 border-[#1E293B] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col gap-6 w-full`}>
      
      {/* Background Borders */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-purple-500/20 m-2 rounded-2xl">
         <div className="absolute top-4 left-0 w-2 h-8 border-r-2 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
         <div className="absolute top-4 right-0 w-2 h-8 border-l-2 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col items-start pr-2">
           <h1 className={`font-display font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] leading-tight ${viewMode === 'mobile' ? 'text-sm sm:text-base' : 'text-xl md:text-3xl'}`}>
             DIAGNÓSTICO PSICROMÉTRICO
           </h1>
           <p className={`text-purple-400 font-mono mt-1 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(168,85,247,0.5)] ${viewMode === 'mobile' ? 'text-[8px] sm:text-[9px]' : 'text-[10px] md:text-sm'}`}>
             Rendimento e Qualidade do Ar
           </p>
        </div>
      </div>

      {/* UNIFIED INPUTS GRID (Psychrometric Targets) */}
      <div className="grid gap-6 grid-cols-1 relative z-10 bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
        
        {/* PARÂMETROS DE INSTALAÇÃO - HIDDEN BY USER REQUEST */}
        {/* 
        <div className="border-b border-white/10 pb-6 mb-2">
          <h2 className="text-sm font-tactical tracking-widest uppercase text-cyan-400 mb-6 flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" /> Parâmetros de Instalação
          </h2>
          
          <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            <div className="flex flex-col items-center space-y-2">
              <Label className="font-tactical tracking-widest text-[10px] uppercase text-zinc-400 text-center">Dispositivo de Expansão</Label>
              <Select value={expansion} onValueChange={setExpansion}>
                <SelectTrigger className="bg-black/60 border-white/10 font-mono text-xs h-9 w-full max-w-[250px] justify-center">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 text-xs font-mono text-center">
                  <SelectItem value="txv">Válvula de Expansão (VET)</SelectItem>
                  <SelectItem value="fixed">Tubo Capilar / Pistão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <Label className="text-zinc-400 font-tactical tracking-widest text-[10px] uppercase flex justify-center items-center gap-2">
                <span>T. Ext. (°{tempUnit})</span>
                <Button 
                  variant="ghost" size="icon" className="h-5 w-5 hover:bg-cyan-500/20 text-cyan-400"
                  onClick={fetchWeather} disabled={isFetchingWeather} title="Obter clima local por GPS"
                >
                  {isFetchingWeather ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                </Button>
              </Label>
              <Input type="number" className="bg-black/60 border-white/10 font-mono text-sm h-9 w-full max-w-[150px] text-center" value={tExt} onChange={e => setTExt(Number(e.target.value))} />
            </div>

            <div className="flex flex-col items-center space-y-2">
              <Label className="text-zinc-400 font-tactical tracking-widest text-[10px] uppercase block text-center mb-1">
                T. Int. WB (°{tempUnit})
              </Label>
              <Input type="number" className="bg-black/60 border-white/10 font-mono text-sm h-9 w-full max-w-[150px] text-center" value={tWb} onChange={e => setTWb(Number(e.target.value))} />
            </div>
          </div>
        </div>
        */}

        {/* PSYCHROMETRIC TARGETS */}
        <h2 className="text-sm font-tactical tracking-widest uppercase text-purple-400 mb-4 flex items-center justify-center gap-2">
          <Thermometer className="w-4 h-4" /> Sensores do Ambiente
        </h2>
        <div className={`grid gap-8 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          {/* Return Air */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex flex-col items-center gap-1 text-center">
              <Label className="text-purple-400 font-tactical tracking-widest text-[10px] md:text-xs uppercase">T. Retorno (Ambiente)</Label>
              <span className="font-mono text-purple-300 font-bold text-lg">{Tdb.toFixed(1)} °{tempUnit}</span>
            </div>
            <Slider value={[Tdb]} min={tempUnit === "F" ? 30 : 0} max={tempUnit === "F" ? 110 : 45} step={0.5} onValueChange={(val) => handleTdbChange(val[0]!)} className="w-full max-w-[250px] [&_[role=slider]]:border-purple-400 [&_[role=slider]]:bg-purple-200 [&_[role=slider]]:shadow-[0_0_10px_rgba(168,85,247,0.8)] [&_.bg-primary]:bg-purple-500" />
          </div>

          {/* Humidity */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex flex-col items-center gap-1 text-center">
              <Label className="text-cyan-400 font-tactical tracking-widest text-[10px] md:text-xs uppercase">Umidade Relativa</Label>
              <span className="font-mono text-cyan-300 font-bold text-lg">{rh.toFixed(1)} %</span>
            </div>
            <Slider value={[rh]} min={1} max={100} step={1} onValueChange={(val) => setRh(val[0]!)} className="w-full max-w-[250px] [&_[role=slider]]:border-cyan-400 [&_[role=slider]]:bg-cyan-200 [&_[role=slider]]:shadow-[0_0_10px_rgba(0,240,255,0.8)] [&_.bg-primary]:bg-cyan-500" />
          </div>

          {/* Supply Air */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex flex-col items-center gap-1 text-center">
              <Label className="text-blue-400 font-tactical tracking-widest text-[10px] md:text-xs uppercase">T. Insuflamento (Grelha)</Label>
              <span className="font-mono text-blue-300 font-bold text-lg">{Tsup.toFixed(1)} °{tempUnit}</span>
            </div>
            <Slider value={[Tsup]} min={tempUnit === "F" ? 30 : -5} max={tempUnit === "F" ? 80 : 30} step={0.5} onValueChange={(val) => handleTsupChange(val[0]!)} className="w-full max-w-[250px] [&_[role=slider]]:border-blue-400 [&_[role=slider]]:bg-blue-200 [&_[role=slider]]:shadow-[0_0_10px_rgba(59,130,246,0.8)] [&_.bg-primary]:bg-blue-500" />
          </div>
        </div>

      </div>

      {/* SINGLE GRID ALL METRICS */}
      <div className={`grid gap-4 relative z-10 ${viewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
        
        <Card className="glass-panel border-green-500/30 bg-green-950/10">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="font-tactical tracking-widest uppercase text-green-400 flex items-center gap-1.5 text-[9px] md:text-[10px]">
              <Activity className="w-3 h-3 shrink-0" /> Delta T (Rendimento)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="digital-display font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)] text-2xl md:text-3xl">
              {DeltaT.toFixed(1)} <span className="text-xs md:text-sm">°</span>
            </div>
            <p className="mt-1 text-[9px] font-mono text-green-500/70 uppercase">Tr - Ti</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-cyan-500/30 bg-cyan-950/10">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="font-tactical tracking-widest uppercase text-cyan-400 flex items-center gap-1.5 text-[9px] md:text-[10px]">
              <Thermometer className="w-3 h-3 shrink-0" /> Bulbo Úmido
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="digital-display font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] text-2xl md:text-3xl">
              {Twb.toFixed(1)} <span className="text-xs md:text-sm">°{tempUnit}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-blue-500/30 bg-blue-950/10">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="font-tactical tracking-widest uppercase text-blue-400 flex items-center gap-1.5 text-[9px] md:text-[10px]">
              <Droplets className="w-3 h-3 shrink-0" /> Orvalho
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="digital-display font-bold text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] text-2xl md:text-3xl">
              {Tdp.toFixed(1)} <span className="text-xs md:text-sm">°{tempUnit}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/30 bg-purple-950/10">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="font-tactical tracking-widest uppercase text-purple-400 flex items-center gap-1.5 text-[9px] md:text-[10px]">
              <Wind className="w-3 h-3 shrink-0" /> U. Absoluta
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="digital-display font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] text-2xl md:text-3xl">
              {moisture.toFixed(1)}
            </div>
            <p className="mt-1 text-[9px] font-mono text-purple-500/70 uppercase">{moistureUnit}</p>
          </CardContent>
        </Card>

        <Card className={`glass-panel border-rose-500/30 bg-rose-950/10 ${viewMode === 'mobile' ? 'col-span-2' : ''}`}>
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="font-tactical tracking-widest uppercase text-rose-400 flex items-center gap-1.5 text-[9px] md:text-[10px]">
              <Flame className="w-3 h-3 shrink-0" /> Entalpia
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex flex-row md:flex-col justify-between items-end md:items-start">
            <div className="digital-display font-bold text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)] text-2xl md:text-3xl">
              {enthalpy.toFixed(1)}
            </div>
            <p className="mt-1 text-[9px] font-mono text-rose-500/70 uppercase">{enthalpyUnit}</p>
          </CardContent>
        </Card>

      </div>

      {/* RADAR CHART AND ANALYSIS - Single Column Grid */}
      <div className="grid gap-6 mt-4 relative z-10 grid-cols-1 md:grid-cols-2">
         
         <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner h-[300px] md:h-[400px]">
            <h3 className="text-white/70 font-tactical tracking-widest uppercase text-xs mb-2">RADAR DE PERFORMANCE TÉRMICA</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#a855f7', fontSize: viewMode === 'mobile' ? 9 : 12, fontFamily: 'monospace', fontWeight: 'bold' }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#a855f7', borderRadius: '8px' }}
                  itemStyle={{ color: '#00f0ff', fontFamily: 'monospace' }}
                  formatter={(value: number) => [`${value.toFixed(0)}%`, 'Score']}
                />
                <Radar name="Performance" dataKey="A" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
         </div>

         <div className="flex flex-col gap-4 justify-center">
            <div className="p-5 rounded-2xl border border-white/10 bg-black/60 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,1)]"></div>
               <h4 className="font-display text-purple-400 tracking-widest uppercase text-sm mb-3 flex items-center gap-2">
                 <Zap className="w-4 h-4" /> Relatório Psicrométrico
               </h4>
               
               <ul className="space-y-3">
                 <li className="text-xs font-mono text-zinc-300 border-b border-white/5 pb-2">
                   <strong className="text-green-400">Rendimento:</strong> {
                     deltaTC >= 10 && deltaTC <= 14 ? "Eficiência Máxima de Troca Térmica" : 
                     deltaTC < 10 ? "Baixa Troca. Verifique falhas de compressão ou sujeira severa." : 
                     "Alta Troca. Carga térmica muito baixa ou falha de ventilação."
                   }
                 </li>
                 <li className="text-xs font-mono text-zinc-300 border-b border-white/5 pb-2">
                   <strong className="text-cyan-400">Umidade:</strong> {
                     rh >= 40 && rh <= 60 ? "Ideal. Conforto humano garantido." : 
                     rh > 60 ? "Alta. Risco de condensação severa e proliferação de fungos." : 
                     "Baixa. Ar ressecado, desconforto respiratório."
                   }
                 </li>
                 <li className="text-xs font-mono text-zinc-300">
                   <strong className="text-blue-400">Ponto de Orvalho:</strong> Condensação ocorrerá em qualquer superfície abaixo de {Tdp.toFixed(1)}°{tempUnit}.
                 </li>
               </ul>
            </div>
         </div>

      </div>

    </div>
  );
}
