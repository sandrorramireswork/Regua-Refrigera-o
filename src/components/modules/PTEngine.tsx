import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { getSaturationTemp, getSaturationPressure, refrigerantsList as refrigerants } from "@/lib/thermodynamics";
import { useAppContext } from "@/context/AppContext";
import RefData from "./RefData";

export default function PTEngine() {
  const { 
    selectedRef, setSelectedRef, 
    pressureUnit, setPressureUnit,
    tempUnit, setTempUnit,
    viewMode,
    pSuc: pressure, setPSuc: setPressure
  } = useAppContext();
  
  const [temperature, setTemperature] = useState(5); // C
  const [useGlide, setUseGlide] = useState(false);
  const [lastEdited, setLastEdited] = useState<"pressure" | "temp">("pressure");

  const refData = refrigerants.find(r => r.id === selectedRef);

  // Sync logic
  useEffect(() => {
    // Convert current values to SI for calculation
    const pBar = pressureUnit === "psig" ? (pressure + 14.5038) / 14.5038 : pressure;
    const tC = tempUnit === "F" ? (temperature - 32) * 5/9 : temperature;

    if (lastEdited === "pressure") {
      let t = getSaturationTemp(selectedRef, pBar);
      if (useGlide && refData?.hasGlide) t -= refData.glideK / 2;
      
      // Convert result back to target tempUnit
      const resultT = tempUnit === "F" ? (t * 9/5) + 32 : t;
      setTemperature(Number(resultT.toFixed(2)));
    } else {
      let t = tC;
      if (useGlide && refData?.hasGlide) t += refData.glideK / 2;
      
      let p = getSaturationPressure(selectedRef, t);
      
      // Convert result back to target pressureUnit
      const resultP = pressureUnit === "psig" ? (p * 14.5038) - 14.5038 : p;
      setPressure(Number(resultP.toFixed(2)));
    }
  }, [pressure, temperature, selectedRef, pressureUnit, tempUnit, useGlide, lastEdited]);

  const handlePressureChange = (val: number) => {
    setLastEdited("pressure");
    setPressure(val);
  };

  const handleTempChange = (val: number) => {
    setLastEdited("temp");
    setTemperature(val);
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header Ficha Técnica & Manifold */}
      <RefData />

      {/* Controles Interativos (P-T) */}
      <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <Card className="glass-panel border-white/5">
        <CardHeader>
          <CardTitle className="font-display tracking-widest text-lg text-primary">FLUIDO E CONFIGURAÇÕES</CardTitle>
          <CardDescription className="font-mono uppercase text-xs">Selecione o fluido de trabalho e as unidades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Fluido Refrigerante</Label>
            <Select value={selectedRef} onValueChange={setSelectedRef}>
              <SelectTrigger className="bg-black/50 border-white/10 font-mono tracking-wider">
                <SelectValue placeholder="Selecionar Fluido" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                {refrigerants.map((ref) => (
                  <SelectItem key={ref.id} value={ref.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${ref.color}`}></div>
                      {ref.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 border border-white/5 p-4 rounded-lg bg-black/40">
              <Label className="text-xs font-tactical tracking-widest uppercase text-cyan-400">Unidade de Pressão</Label>
              <Select value={pressureUnit} onValueChange={(v: any) => setPressureUnit(v)}>
                <SelectTrigger className="bg-black/50 border-white/10 font-mono tracking-wider h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="bar">bar</SelectItem>
                  <SelectItem value="psig">psig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3 border border-white/5 p-4 rounded-lg bg-black/40">
              <Label className="text-xs font-tactical tracking-widest uppercase text-orange-400">Unidade de Temp.</Label>
              <Select value={tempUnit} onValueChange={(v: any) => setTempUnit(v)}>
                <SelectTrigger className="bg-black/50 border-white/10 font-mono tracking-wider h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="C">°C</SelectItem>
                  <SelectItem value="F">°F</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {refData?.hasGlide && (
            <div className="flex items-center justify-between border border-orange-500/30 p-4 rounded-lg bg-orange-500/5 shadow-[0_0_15px_rgba(255,140,0,0.1)]">
              <div className="space-y-0.5">
                <Label className="text-base font-tactical tracking-widest uppercase text-orange-400">Compensação de Glide</Label>
                <p className="text-xs font-mono text-orange-400/70 uppercase">Mistura zeotrópica. Usando temp. média.</p>
              </div>
              <Switch checked={useGlide} onCheckedChange={setUseGlide} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
        <CardHeader>
          <CardTitle className="font-display tracking-widest text-lg text-primary">CALCULADORA P-T</CardTitle>
          <CardDescription className="font-mono uppercase text-xs">Valores de saturação em tempo real</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 relative z-10">
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-lg font-tactical tracking-widest uppercase neon-text-cyan">Pressão ({pressureUnit})</Label>
              <Input 
                type="number" 
                className="w-32 bg-black/50 text-right text-xl digital-display border-cyan-500/50 focus-visible:ring-cyan-500 text-cyan-400"
                value={pressure}
                onChange={(e) => handlePressureChange(Number(e.target.value))}
              />
            </div>
            <Slider 
              value={[pressure]} 
              min={pressureUnit === "psig" ? 0 : 0.1} 
              max={pressureUnit === "psig" ? 700 : 50} 
              step={pressureUnit === "psig" ? 1 : 0.1}
              onValueChange={(val) => handlePressureChange(val[0]!)}
              className="py-4"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-lg font-tactical tracking-widest uppercase neon-text-orange">T. Saturação ({tempUnit === "F" ? "°F" : "°C"})</Label>
              <Input 
                type="number" 
                className="w-32 bg-black/50 text-right text-xl digital-display border-orange-500/50 focus-visible:ring-orange-500 text-orange-400"
                value={temperature}
                onChange={(e) => handleTempChange(Number(e.target.value))}
              />
            </div>
            <Slider 
              value={[temperature]} 
              min={tempUnit === "F" ? -76 : -60} 
              max={tempUnit === "F" ? 176 : 80} 
              step={0.5}
              onValueChange={(val) => handleTempChange(val[0]!)}
              className="py-4"
            />
          </div>

          {useGlide && refData?.hasGlide && (
             <div className="mt-4 p-4 bg-black/40 rounded-lg text-sm border border-white/10 flex justify-between">
               <div>
                 <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Ponto de Orvalho</p>
                 <p className="font-display text-lg text-cyan-400">{ (tempUnit === "F" ? temperature + (refData.glideK * 9/5)/2 : temperature + refData.glideK/2).toFixed(1) } °{tempUnit}</p>
               </div>
               <div className="text-right">
                 <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Ponto de Bolha</p>
                 <p className="font-display text-lg text-orange-400">{ (tempUnit === "F" ? temperature - (refData.glideK * 9/5)/2 : temperature - refData.glideK/2).toFixed(1) } °{tempUnit}</p>
               </div>
             </div>
          )}
          
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
