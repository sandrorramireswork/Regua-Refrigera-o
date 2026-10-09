import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, CheckCircle2, ThermometerSun, AlertTriangle, TerminalSquare, MapPin, Loader2 } from "lucide-react";
import { getSaturationTemp } from "@/lib/thermodynamics";
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
    pressureUnit, tempUnit, viewMode
  } = useAppContext();

  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

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
    <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
      
      {/* Inputs Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="font-display tracking-widest text-primary text-sm">PARÂMETROS DO SISTEMA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-tactical tracking-widest uppercase">Gás Refrigerante</Label>
              <Select value={ref} onValueChange={setRef}>
                <SelectTrigger className="bg-black/50 border-white/10 font-mono text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                  <SelectItem value="R-410A">R-410A</SelectItem>
                  <SelectItem value="R-22">R-22</SelectItem>
                  <SelectItem value="R-134a">R-134a</SelectItem>
                  <SelectItem value="R-404A">R-404A</SelectItem>
                  <SelectItem value="R-32">R-32</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
                  onValueChange={(val) => setPSuc(val[0])}
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
                  onValueChange={(val) => setTSuc(val[0])}
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
                  onValueChange={(val) => setPLiq(val[0])}
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
                  onValueChange={(val) => setTLiq(val[0])}
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
      <div className={`${viewMode === 'mobile' ? 'col-span-1' : 'lg:col-span-3'} space-y-6`}>
        
        {/* Top metrics and Chart */}
        <div className={`grid gap-4 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Metrics */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className={`glass-panel border-2 ${isSHHigh ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.2)]' : isSHLow ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-tactical tracking-widest uppercase">Superaquecimento (SH)</CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase">Alvo: {targetSHMin}{tempUnit === "F" ? "°F" : "K"} - {targetSHMax}{tempUnit === "F" ? "°F" : "K"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`digital-display font-bold ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'} ${isSHHigh ? 'text-orange-400 drop-shadow-[0_0_12px_rgba(255,140,0,0.8)]' : isSHLow ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]' : 'text-[#00FF66] drop-shadow-[0_0_12px_rgba(0,255,102,0.8)]'}`}>
                  {realSH.toFixed(1)} <span className={`${viewMode === 'mobile' ? 'text-lg' : 'text-xl'}`}>{tempUnit === "F" ? "°F" : "K"}</span>
                </div>
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  T_evap = {tEvap.toFixed(1)}°{tempUnit}
                </div>
              </CardContent>
            </Card>
            
            <Card className={`glass-panel border-2 ${isSCHigh ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,140,0,0.2)]' : isSCLow ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-tactical tracking-widest uppercase">Subresfriamento (SC)</CardTitle>
                <CardDescription className="font-mono text-[10px] uppercase">Alvo: {targetSCMin}{tempUnit === "F" ? "°F" : "K"} - {targetSCMax}{tempUnit === "F" ? "°F" : "K"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`digital-display font-bold ${viewMode === 'mobile' ? 'text-3xl' : 'text-4xl'} ${isSCHigh ? 'text-orange-400 drop-shadow-[0_0_12px_rgba(255,140,0,0.8)]' : isSCLow ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]' : 'text-[#00FF66] drop-shadow-[0_0_12px_rgba(0,255,102,0.8)]'}`}>
                  {realSC.toFixed(1)} <span className={`${viewMode === 'mobile' ? 'text-lg' : 'text-xl'}`}>{tempUnit === "F" ? "°F" : "K"}</span>
                </div>
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  T_cond = {tCond.toFixed(1)}°{tempUnit}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <div className={`${viewMode === 'mobile' ? 'col-span-1' : 'lg:col-span-2'}`}>
             <DiagnosticsChart 
               realSH={realSH} realSC={realSC} 
               targetSHMin={targetSHMin} targetSHMax={targetSHMax} 
               targetSCMin={targetSCMin} targetSCMax={targetSCMax} 
             />
          </div>
        </div>

        {/* Diagnosis & Action Output */}
        <Card className={`glass-panel border-white/10 ${alertClass}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display tracking-widest text-primary text-lg">
              <Icon className={`h-6 w-6 ${statusColor} ${Icon !== CheckCircle2 ? 'animate-pulse' : ''}`} />
              DIAGNÓSTICO TÉCNICO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className={`text-xl font-bold tracking-wide ${statusColor}`}>{diagnosis}</p>
            </div>
            <div className="p-4 bg-black/60 rounded-lg border border-white/10 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
              <Label className="flex items-center gap-2 text-cyan-400 font-tactical tracking-widest uppercase mb-3">
                <TerminalSquare className="w-4 h-4" /> PROCEDIMENTOS RECOMENDADOS
              </Label>
              <ul className="space-y-2 mt-1">
                {steps.map((step, idx) => (
                   <li key={idx} className="text-sm font-mono text-white/90 leading-relaxed pl-2">
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
  );
}
