import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, ThermometerSun, AlertTriangle, TerminalSquare, MapPin, Loader2 } from "lucide-react";
import { getSaturationTemp, getSaturationPressure, refrigerantsList } from "@/lib/thermodynamics";
import DiagnosticsChart from "./DiagnosticsChart";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

export default function DiagnosticsMatrix() {
  const { 
    selectedRef: ref, setSelectedRef: setRef,
    expansion, setExpansion,
    pSuc, setPSuc,
    tSuc, setTSuc,
    pLiq, setPLiq,
    tLiq, setTLiq,
    tExt, setTExt,
    tWb, setTWb,
    pressureUnit, tempUnit
  } = useAppContext();

  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Calculadora P-T Integrada
  const [ptPressure, setPtPressure] = useState(pressureUnit === "psig" ? 120 : 8);
  const [ptTemperature, setPtTemperature] = useState(5);
  const [useGlide, setUseGlide] = useState(false);
  const [lastEdited, setLastEdited] = useState<"pressure" | "temp">("pressure");
  const refData = refrigerantsList.find(r => r.id === ref);

  useEffect(() => {
    const pBar = pressureUnit === "psig" ? (ptPressure + 14.5038) / 14.5038 : ptPressure;
    const tC = tempUnit === "F" ? (ptTemperature - 32) * 5/9 : ptTemperature;
    
    if (lastEdited === "pressure") {
      let t = getSaturationTemp(ref, pBar);
      if (useGlide && refData?.hasGlide) t -= refData.glideK / 2;
      const resultT = tempUnit === "F" ? (t * 9/5) + 32 : t;
      setPtTemperature(Number(resultT.toFixed(2)));
    } else {
      let t = tC;
      if (useGlide && refData?.hasGlide) t += refData.glideK / 2;
      let p = getSaturationPressure(ref, t);
      const resultP = pressureUnit === "psig" ? (p * 14.5038) - 14.5038 : p;
      setPtPressure(Number(resultP.toFixed(2)));
    }
  }, [ptPressure, ptTemperature, ref, pressureUnit, tempUnit, useGlide, lastEdited]);

  const handlePtPressureChange = (val: number) => {
    setLastEdited("pressure");
    setPtPressure(val);
  };
  const handlePtTempChange = (val: number) => {
    setLastEdited("temp");
    setPtTemperature(val);
  };

  const fetchWeather = () => {
    setIsFetchingWeather(true);
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada pelo navegador.");
      setIsFetchingWeather(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          if (data && data.current_weather) {
            let tempC = data.current_weather.temperature;
            if (tempUnit === "F") {
              tempC = (tempC * 9/5) + 32;
            }
            setTExt(Number(tempC.toFixed(1)));
          }
        } catch (e) {
          console.error("Erro ao buscar clima", e);
        } finally {
          setIsFetchingWeather(false);
        }
      },
      (error) => {
        console.error("Erro GPS", error);
        alert("Permissão de localização negada ou falhou.");
        setIsFetchingWeather(false);
      }
    );
  };

  // Helper to get p in bar
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;

  // Raw saturation temps in C
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);
  
  // Convert to target temp unit
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;
  
  const realSH = tSuc - tEvap;
  const realSC = tCond - tLiq;

  // Target bounds (Base K / °C diff)
  let targetSHMin = 5;
  let targetSHMax = 8;
  let targetSCMin = 4;
  let targetSCMax = 7;

  if (tempUnit === "F") {
    targetSHMin = 9;
    targetSHMax = 14.4;
    targetSCMin = 7.2;
    targetSCMax = 12.6;
  }

  const isSHHigh = realSH > targetSHMax;
  const isSHLow = realSH < targetSHMin;
  const isSCHigh = realSC > targetSCMax;
  const isSCLow = realSC < targetSCMin;

  const isSHNormal = realSH >= targetSHMin && realSH <= targetSHMax;
  const isSCNormal = realSC >= targetSCMin && realSC <= targetSCMax;

  let diagnosis = "ANALISANDO DADOS... (ESTADO TRANSIENTE)";
  let steps = [
    "O sistema está fora da zona ideal, mas não apresenta uma assinatura clássica de falha.",
    "1. Aguarde o sistema operar por 15-20 minutos para estabilização térmica.",
    "2. Verifique se a carga térmica atual não está influenciando as pressões.",
    "3. Certifique-se de que os sensores de temperatura estão bem isolados no tubo."
  ];
  let statusColor = "text-yellow-400";
  let alertClass = "alert-card-orange";
  let Icon = AlertTriangle;

  if (isSHNormal && isSCNormal) {
    diagnosis = "OPERAÇÃO DENTRO DOS PARÂMETROS NOMINAIS";
    steps = [
      "Nenhuma anomalia detectada no ciclo de compressão a vapor.",
      "O Superaquecimento (SH) está protegendo o compressor contra líquido.",
      "O Subresfriamento (SC) assegura líquido 100% puro na válvula de expansão.",
      "O equipamento está atingindo a sua eficiência energética projetada."
    ];
    statusColor = "text-[#00FF66]";
    alertClass = "shadow-[0_0_20px_rgba(0,255,102,0.1)] border-green-500/50";
    Icon = CheckCircle2;
  } 
  // Undercharge: SH is high, SC is low or normal (early stage)
  else if ((isSHHigh && isSCLow) || (isSHHigh && isSCNormal)) {
    diagnosis = "SUBCARGA: FALTA DE FLUIDO REFRIGERANTE";
    steps = [
      "1. Conecte a botija do fluido " + ref + " na mangueira amarela.",
      "2. Purgue a mangueira amarela para retirar o ar.",
      ref === "R-410A" || ref === "R-404A" || ref === "R-407C" ? "3. INVERTA a botija para adicionar fase LÍQUIDA (devido ao blend zeotrópico)." : "3. Adicione o fluido pelo manifold de forma controlada.",
      "4. Abra o manifold lentamente por 3 a 5 segundos e feche.",
      "5. Aguarde 2 a 3 minutos para estabilização termodinâmica.",
      "6. Monitore o SH e SC no gráfico até o ponto entrar na 'Optimal Zone'."
    ];
    statusColor = "text-orange-400";
    alertClass = "alert-card-orange";
    Icon = AlertTriangle;
  } 
  // Overcharge: SC is high, SH is low or normal
  else if ((isSHLow && isSCHigh) || (isSHNormal && isSCHigh)) {
    diagnosis = "SOBRECARGA: EXCESSO DE FLUIDO REFRIGERANTE";
    steps = [
      "CRÍTICO: Risco de retorno de líquido ao compressor (Golpe de Líquido).",
      "1. Conecte a recolhedora de fluido refrigerante e o cilindro de recolhimento.",
      "2. Inicie a retirada do excesso de fluido de forma progressiva.",
      "3. Avalie o Subresfriamento (SC), que deve começar a cair da atual marca de " + realSC.toFixed(1) + "K.",
      "4. Pare o recolhimento assim que o SC e o SH atingirem os alvos nominais na Área Verde."
    ];
    statusColor = "text-red-500";
    alertClass = "alert-card-red";
    Icon = AlertCircle;
  } 
  // Restriction
  else if (isSHHigh && isSCHigh) {
    diagnosis = "RESTRIÇÃO NA LINHA LÍQUIDA / VÁLVULA FECHADA";
    steps = [
      "1. Verifique se o Filtro Secador apresenta queda de temperatura acentuada (indicando entupimento severo).",
      expansion === "txv" ? "2. A Válvula de Expansão (TXV) pode estar muito fechada ou entupida. Tente abrir levemente (sentido anti-horário)." : "2. Possível restrição parcial no tubo capilar ou pistão (orifício sujo).",
      "3. Verifique se há vincos ou tubos amassados na linha de líquido.",
      "4. Se o problema persistir, será necessário recolher o fluido, realizar limpeza (ex: 141b) e trocar filtro secador."
    ];
    statusColor = "text-red-500";
    alertClass = "alert-card-red";
    Icon = AlertCircle;
  } 
  // Low Load / Dirty Evaporator / Open TXV
  else if (isSHLow && isSCLow) {
    diagnosis = "BAIXA TROCA TÉRMICA NO EVAPORADOR / VÁLVULA ABERTA";
    steps = [
      "ALERTA: Baixa evaporação detectada. Risco de congelamento da serpentina e golpe de líquido.",
      "1. Verifique se os filtros de ar da evaporadora estão sujos ou bloqueados.",
      "2. Confirme se a turbina/ventilador do evaporador está limpa e operando na rotação correta.",
      expansion === "txv" ? "3. A Válvula (TXV) pode estar travada muito aberta. Tente girar o ajuste no sentido horário para fechá-la." : "3. Verifique se o ambiente já atingiu uma temperatura muito baixa (carga térmica irrisória).",
      "4. Proceda com higienização química da serpentina se necessário."
    ];
    statusColor = "text-orange-400";
    alertClass = "alert-card-orange";
    Icon = AlertTriangle;
  }
  // Low SC and Normal SH (usually low head pressure or inefficient compressor)
  else if (isSHNormal && isSCLow) {
    diagnosis = "BAIXO SUBRESFRIAMENTO / BAIXA CARGA OU TEMPERATURA EXTERNA";
    steps = [
      "O sistema apresenta SH normal, mas pouco Subresfriamento.",
      "1. Verifique se a temperatura ambiente exterior não está demasiadamente fria.",
      "2. Verifique se há falha de rendimento no compressor.",
      "3. Se houver visor de líquido, verifique se apresenta bolhas (possível início de falta de fluido)."
    ];
    statusColor = "text-yellow-400";
    alertClass = "alert-card-orange border-yellow-500/50";
    Icon = AlertTriangle;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-8">
      
      {/* 1. Calculadora P-T (Modo Expert Integrado) */}
      <Card className="glass-panel border-white/5 relative overflow-hidden mt-1 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl">
        <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none z-0"></div>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-4 pb-2 relative z-10 gap-3">
          <div>
            <CardTitle className="font-display tracking-widest text-base sm:text-lg text-primary">CALCULADORA P-T</CardTitle>
            <CardDescription className="font-mono uppercase text-xs">Simulador de Saturação</CardDescription>
          </div>
          {refData?.hasGlide && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 px-3 py-2 rounded-lg shadow-inner">
              <Label className="text-xs font-tactical tracking-widest uppercase text-orange-400">Compensar Glide</Label>
              <Switch checked={useGlide} onCheckedChange={setUseGlide} />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 relative z-10 p-2 sm:p-4 pt-2">
          <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-2">
            
            {/* Bloco Pressão */}
            <div className="space-y-4 sm:space-y-6 bg-black/40 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
              <div className="flex justify-between items-end">
                <Label className="text-xs sm:text-base font-tactical tracking-widest uppercase neon-text-cyan">Pressão ({pressureUnit})</Label>
                <Input 
                  type="number" 
                  className="w-32 sm:w-36 bg-black/50 text-right text-xl sm:text-2xl digital-display font-black border-cyan-500/50 focus-visible:ring-cyan-500 text-cyan-400 h-11 sm:h-12"
                  value={ptPressure}
                  onChange={(e) => handlePtPressureChange(Number(e.target.value))}
                />
              </div>
              <div className="px-1">
                <Slider 
                  value={[ptPressure]} 
                  min={pressureUnit === "psig" ? 0 : 0.1} 
                  max={pressureUnit === "psig" ? 700 : 50} 
                  step={pressureUnit === "psig" ? 1 : 0.1}
                  onValueChange={(val) => handlePtPressureChange(val[0]!)}
                  className="py-3 cursor-pointer"
                />
              </div>
            </div>

            {/* Bloco Temperatura */}
            <div className="space-y-4 sm:space-y-6 bg-black/40 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
              <div className="flex justify-between items-end">
                <Label className="text-xs sm:text-base font-tactical tracking-widest uppercase neon-text-orange">T. Saturação ({tempUnit === "F" ? "°F" : "°C"})</Label>
                <Input 
                  type="number" 
                  className="w-32 sm:w-36 bg-black/50 text-right text-xl sm:text-2xl digital-display font-black border-orange-500/50 focus-visible:ring-orange-500 text-orange-400 h-11 sm:h-12"
                  value={ptTemperature}
                  onChange={(e) => handlePtTempChange(Number(e.target.value))}
                />
              </div>
              <div className="px-1">
                <Slider 
                  value={[ptTemperature]} 
                  min={tempUnit === "F" ? -76 : -60} 
                  max={tempUnit === "F" ? 176 : 80} 
                  step={0.5}
                  onValueChange={(val) => handlePtTempChange(val[0]!)}
                  className="py-3 cursor-pointer"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 3. SH/SC Matrix */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-4">
        
        {/* Inputs Column */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card className="glass-panel border-white/5 p-3 sm:p-5 rounded-xl sm:rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-primary text-sm">PARÂMETROS DE CAMPO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label className="font-tactical tracking-widest uppercase">Dispositivo de Expansão</Label>
              <Select value={expansion} onValueChange={setExpansion}>
                <SelectTrigger className="bg-black/50 border-white/10 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 text-xs font-mono">
                  <SelectItem value="txv">Válvula de Expansão (VET)</SelectItem>
                  <SelectItem value="fixed">Tubo Capilar / Pistão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-cyan-400 font-tactical tracking-widest text-[10px] uppercase">Pressão Sucção ({pressureUnit})</Label>
                  <Input type="number" className="bg-black/50 border-cyan-500/30 text-cyan-400 font-mono" value={pSuc} onChange={e => setPSuc(Number(e.target.value))} />
                </div>
                <Slider 
                  value={[pSuc]} 
                  min={pressureUnit === "psig" ? 0 : 0.1} max={pressureUnit === "psig" ? 250 : 20} step={pressureUnit === "psig" ? 1 : 0.1}
                  onValueChange={(val) => setPSuc(val[0]!)}
                />
               </div>
               <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-cyan-400 font-tactical tracking-widest text-[10px] uppercase">T. Sucção (°{tempUnit})</Label>
                  <Input type="number" className="bg-black/50 border-cyan-500/30 text-cyan-400 font-mono" value={tSuc} onChange={e => setTSuc(Number(e.target.value))} />
                </div>
                <Slider 
                  value={[tSuc]} 
                  min={tempUnit === "F" ? -20 : -30} max={tempUnit === "F" ? 100 : 40} step={0.5}
                  onValueChange={(val) => setTSuc(val[0]!)}
                />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-orange-400 font-tactical tracking-widest text-[10px] uppercase">Pressão Líquido ({pressureUnit})</Label>
                  <Input type="number" className="bg-black/50 border-orange-500/30 text-orange-400 font-mono" value={pLiq} onChange={e => setPLiq(Number(e.target.value))} />
                </div>
                <Slider 
                  value={[pLiq]} 
                  min={pressureUnit === "psig" ? 50 : 3} max={pressureUnit === "psig" ? 700 : 50} step={pressureUnit === "psig" ? 1 : 0.1}
                  onValueChange={(val) => setPLiq(val[0]!)}
                />
               </div>
               <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-orange-400 font-tactical tracking-widest text-[10px] uppercase">T. Líquido (°{tempUnit})</Label>
                  <Input type="number" className="bg-black/50 border-orange-500/30 text-orange-400 font-mono" value={tLiq} onChange={e => setTLiq(Number(e.target.value))} />
                </div>
                <Slider 
                  value={[tLiq]} 
                  min={tempUnit === "F" ? 30 : 0} max={tempUnit === "F" ? 160 : 70} step={0.5}
                  onValueChange={(val) => setTLiq(val[0]!)}
                />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-muted-foreground font-tactical tracking-widest text-[10px] uppercase flex justify-between items-center">
                  <span>T. Ambiente Ext. (°{tempUnit})</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 hover:bg-cyan-500/20 text-cyan-400"
                    onClick={fetchWeather}
                    disabled={isFetchingWeather}
                    title="Obter clima local por GPS"
                  >
                    {isFetchingWeather ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                  </Button>
                </Label>
                <Input type="number" className="bg-black/50 border-white/10 font-mono" value={tExt} onChange={e => setTExt(Number(e.target.value))} />
               </div>
               <div className="space-y-2">
                <Label className="text-muted-foreground font-tactical tracking-widest text-[10px] uppercase block mb-[10px]">
                  T. Bulbo Úmido Int. (°{tempUnit})
                </Label>
                <Input type="number" className="bg-black/50 border-white/10 font-mono" value={tWb} onChange={e => setTWb(Number(e.target.value))} />
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics, Chart & Diagnosis */}
      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        
        {/* Top metrics and Chart */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Metrics */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className={`glass-panel border-2 p-3 sm:p-5 rounded-xl sm:rounded-2xl ${isSHHigh ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.2)]' : isSHLow ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]'}`}>
              <CardHeader className="p-1 sm:p-2 pb-2">
                <CardTitle className="text-sm sm:text-base font-tactical tracking-widest uppercase">Superaquecimento (SH)</CardTitle>
                <CardDescription className="font-mono text-xs uppercase font-semibold">Alvo: {targetSHMin}{tempUnit === "F" ? "°F" : "K"} - {targetSHMax}{tempUnit === "F" ? "°F" : "K"}</CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-2 pt-1">
                <div className={`digital-display font-black text-4xl sm:text-5xl md:text-6xl ${isSHHigh ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(255,140,0,0.8)]' : isSHLow ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]' : 'text-[#00FF66] drop-shadow-[0_0_15px_rgba(0,255,102,0.8)]'}`}>
                  {realSH.toFixed(1)} <span className="text-xl sm:text-2xl font-bold">{tempUnit === "F" ? "°F" : "K"}</span>
                </div>
                <div className="mt-2 text-xs sm:text-sm font-mono text-muted-foreground font-semibold">
                  T_evap = {tEvap.toFixed(1)}°{tempUnit}
                </div>
              </CardContent>
            </Card>
            
            <Card className={`glass-panel border-2 p-3 sm:p-5 rounded-xl sm:rounded-2xl ${isSCHigh ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.2)]' : isSCLow ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]'}`}>
              <CardHeader className="p-1 sm:p-2 pb-2">
                <CardTitle className="text-sm sm:text-base font-tactical tracking-widest uppercase">Subresfriamento (SC)</CardTitle>
                <CardDescription className="font-mono text-xs uppercase font-semibold">Alvo: {targetSCMin}{tempUnit === "F" ? "°F" : "K"} - {targetSCMax}{tempUnit === "F" ? "°F" : "K"}</CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-2 pt-1">
                <div className={`digital-display font-black text-4xl sm:text-5xl md:text-6xl ${isSCHigh ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(255,140,0,0.8)]' : isSCLow ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]' : 'text-[#00FF66] drop-shadow-[0_0_15px_rgba(0,255,102,0.8)]'}`}>
                  {realSC.toFixed(1)} <span className="text-xl sm:text-2xl font-bold">{tempUnit === "F" ? "°F" : "K"}</span>
                </div>
                <div className="mt-2 text-xs sm:text-sm font-mono text-muted-foreground font-semibold">
                  T_cond = {tCond.toFixed(1)}°{tempUnit}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2">
             <DiagnosticsChart 
               realSH={realSH} realSC={realSC} 
               targetSHMin={targetSHMin} targetSHMax={targetSHMax} 
               targetSCMin={targetSCMin} targetSCMax={targetSCMax} 
             />
          </div>
        </div>

        {/* Diagnosis & Action Output */}
        <Card className={`glass-panel border-white/10 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl ${alertClass}`}>
          <CardHeader className="p-1 sm:p-2 pb-3">
            <CardTitle className="flex items-center gap-2 font-display tracking-widest text-primary text-base sm:text-xl font-black">
              <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${statusColor} ${Icon !== CheckCircle2 ? 'animate-pulse' : ''}`} />
              DIAGNÓSTICO TÉCNICO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-1 sm:p-2">
            <div>
              <p className={`text-xl sm:text-2xl md:text-3xl font-black tracking-wide ${statusColor}`}>{diagnosis}</p>
            </div>
            <div className="p-3.5 sm:p-5 bg-black/60 rounded-xl border border-white/10 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
              <Label className="flex items-center gap-2 text-cyan-400 font-tactical tracking-widest uppercase mb-3 text-xs sm:text-sm font-bold">
                <TerminalSquare className="w-4 h-4" /> PROCEDIMENTOS RECOMENDADOS
              </Label>
              <ul className="space-y-2 mt-1">
                {steps.map((step, idx) => (
                   <li key={idx} className="text-sm sm:text-base font-mono text-white/90 leading-relaxed pl-2 font-medium">
                     {step}
                   </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-black/40 border-t border-white/5 pt-4">
             <div className="flex w-full justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <ThermometerSun className="h-4 w-4 text-cyan-400 animate-pulse"/> 
                  Protocolo de Ajuste Inteligente IA Ativo
                </span>
             </div>
          </CardFooter>
        </Card>
      </div>

      </div>
    </div>
  );
}
