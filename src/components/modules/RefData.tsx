import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { refrigerantsList, getSaturationTemp, getSaturationPressure } from "@/lib/thermodynamics";
import { Settings, Zap, Activity, AlertTriangle, CheckCircle2, AlertCircle, TerminalSquare, ThermometerSun, MapPin, Loader2, Cylinder } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiagnosticsChart from "./DiagnosticsChart";

export default function RefData() {
  const { 
    selectedRef, setSelectedRef, 
    pressureUnit, tempUnit,
    pSuc, setPSuc, pLiq, setPLiq,
    tSuc, setTSuc, tLiq, setTLiq,
    expansion, setExpansion,
    tExt, setTExt,
    tWb, setTWb,
    viewMode 
  } = useAppContext();

  const [calcMode, setCalcMode] = useState<"SH" | "SC">("SH");
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Calcs
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;

  const Te_C = getSaturationTemp(selectedRef, pSucBar);
  const Tc_C = getSaturationTemp(selectedRef, pLiqBar);

  const Te = tempUnit === "F" ? (Te_C * 9/5) + 32 : Te_C;
  const Tc = tempUnit === "F" ? (Tc_C * 9/5) + 32 : Tc_C;

  const SA = tSuc - Te;
  const SR = Tc - tLiq;

  // Active value for the bottom gauge
  const activeValue = calcMode === "SH" ? SA : SR;
  
  const minDisplay = tempUnit === "F" ? -18 : -10;
  const maxDisplay = tempUnit === "F" ? 54 : 30;
  const rangeDisplay = maxDisplay - minDisplay;
  const clampedValue = Math.min(maxDisplay, Math.max(minDisplay, activeValue));
  const gaugeAngle = ((clampedValue - minDisplay) / rangeDisplay) * 180;

  // Needles
  const maxLow = pressureUnit === "psig" ? 250 : 17;
  const lowAngle = -135 + Math.min(270, Math.max(0, (pSuc / maxLow) * 270));
  
  const maxHigh = pressureUnit === "psig" ? 600 : 41;
  const highAngle = -135 + Math.min(270, Math.max(0, (pLiq / maxHigh) * 270));

  const renderTicks = (maxVal: number, color: string) => {
    const ticks = [];
    const numTicks = 20; // High precision look
    for (let i = 0; i <= numTicks; i++) {
      const val = (i / numTicks) * maxVal;
      const ang = -135 + (i / numTicks) * 270;
      const isMajor = i % 4 === 0;
      ticks.push(
        <div 
          key={i} 
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `rotate(${ang}deg)` }}
        >
          <div 
             className="mx-auto" 
             style={{ 
               width: isMajor ? '2px' : '1px', 
               height: isMajor ? '8%' : '4%', 
               backgroundColor: isMajor ? color : `${color}80`,
               marginTop: '2%',
               boxShadow: isMajor ? `0 0 5px ${color}` : 'none'
             }}
          />
          {isMajor && (
            <div className="absolute w-full text-center" style={{ top: '12%' }}>
              <span 
                className="inline-block font-mono font-bold drop-shadow-md text-[8px] md:text-[10px]"
                style={{ color: color, transform: `rotate(${-ang}deg)` }}
              >
                {Math.round(val)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return ticks;
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

  // Diagnosis Logic
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

  const isSHHigh = SA > targetSHMax;
  const isSHLow = SA < targetSHMin;
  const isSCHigh = SR > targetSCMax;
  const isSCLow = SR < targetSCMin;
  const isSHNormal = SA >= targetSHMin && SA <= targetSHMax;
  const isSCNormal = SR >= targetSCMin && SR <= targetSCMax;

  let diagnosis = "ANALISANDO DADOS... (ESTADO TRANSIENTE)";
  let steps = [
    "O sistema está fora da zona ideal, mas não apresenta uma assinatura clássica de falha.",
    "1. Aguarde o sistema operar por 15-20 minutos para estabilização térmica.",
    "2. Verifique se a carga térmica atual não está influenciando as pressões.",
    "3. Certifique-se de que os sensores de temperatura estão bem isolados no tubo."
  ];
  let statusColor = "text-yellow-400";
  let alertClass = "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
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
    alertClass = "border-green-500/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]";
    Icon = CheckCircle2;
  } 
  else if ((isSHHigh && isSCLow) || (isSHHigh && isSCNormal)) {
    diagnosis = "SUBCARGA: FALTA DE FLUIDO REFRIGERANTE";
    steps = [
      "1. Conecte a botija do fluido " + selectedRef + " na mangueira amarela.",
      "2. Purgue a mangueira amarela para retirar o ar.",
      selectedRef === "R-410A" || selectedRef === "R-404A" || selectedRef === "R-407C" ? "3. INVERTA a botija para adicionar fase LÍQUIDA (devido ao blend zeotrópico)." : "3. Adicione o fluido pelo manifold de forma controlada.",
      "4. Abra o manifold lentamente por 3 a 5 segundos e feche.",
      "5. Aguarde 2 a 3 minutos para estabilização termodinâmica.",
      "6. Monitore o SH e SC no gráfico até o ponto entrar na 'Optimal Zone'."
    ];
    statusColor = "text-orange-400";
    alertClass = "border-orange-500/50 shadow-[0_0_15px_rgba(255,140,0,0.2)]";
    Icon = AlertTriangle;
  } 
  else if ((isSHLow && isSCHigh) || (isSHNormal && isSCHigh)) {
    diagnosis = "SOBRECARGA: EXCESSO DE FLUIDO REFRIGERANTE";
    steps = [
      "CRÍTICO: Risco de retorno de líquido ao compressor (Golpe de Líquido).",
      "1. Conecte a recolhedora de fluido refrigerante e o cilindro de recolhimento.",
      "2. Inicie a retirada do excesso de fluido de forma progressiva.",
      "3. Avalie o Subresfriamento (SC), que deve começar a cair.",
      "4. Pare o recolhimento assim que o SC e o SH atingirem os alvos nominais."
    ];
    statusColor = "text-red-500";
    alertClass = "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-950/20";
    Icon = AlertCircle;
  } 
  else if (isSHHigh && isSCHigh) {
    diagnosis = "RESTRIÇÃO NA LINHA LÍQUIDA / VÁLVULA FECHADA";
    steps = [
      "1. Verifique se o Filtro Secador apresenta queda de temperatura acentuada.",
      expansion === "txv" ? "2. A Válvula de Expansão (TXV) pode estar muito fechada ou entupida. Tente abrir levemente (sentido anti-horário)." : "2. Possível restrição parcial no tubo capilar ou pistão (orifício sujo).",
      "3. Verifique se há vincos ou tubos amassados na linha de líquido.",
      "4. Se o problema persistir, será necessário recolher o fluido, realizar limpeza (ex: 141b) e trocar filtro secador."
    ];
    statusColor = "text-red-500";
    alertClass = "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-950/20";
    Icon = AlertCircle;
  } 
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
    alertClass = "border-orange-500/50 shadow-[0_0_15px_rgba(255,140,0,0.2)]";
    Icon = AlertTriangle;
  }
  else if (isSHNormal && isSCLow) {
    diagnosis = "BAIXO SUBRESFRIAMENTO / BAIXA CARGA OU TEMPERATURA EXTERNA";
    steps = [
      "O sistema apresenta SH normal, mas pouco Subresfriamento.",
      "1. Verifique se a temperatura ambiente exterior não está demasiadamente fria.",
      "2. Verifique se há falha de rendimento no compressor.",
      "3. Se houver visor de líquido, verifique se apresenta bolhas (possível início de falta de fluido)."
    ];
    statusColor = "text-yellow-400";
    alertClass = "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
    Icon = AlertTriangle;
  }

  const getNeonColor = (refId: string) => {
    switch (refId) {
      case "R-22": return "#4ade80"; // green-400
      case "R-134a": return "#93c5fd"; // blue-300
      case "R-410A": return "#f472b6"; // pink-400
      case "R-404A": return "#fb923c"; // orange-400
      case "R-407C": return "#ea580c"; // orange-600
      case "R-32": return "#67e8f9"; // cyan-300
      case "R-290": return "#fef08a"; // yellow-200
      case "R-600a": return "#fde047"; // yellow-300
      case "R-744": return "#94a3b8"; // slate-400
      case "R-1234yf": return "#d8b4fe"; // purple-300
      case "R-507A": return "#f87171"; // red-400
      case "R-448A": return "#818cf8"; // indigo-400
      case "R-449A": return "#6366f1"; // indigo-500
      default: return "#38bdf8"; // sky-400
    }
  };

  return (
    <div className={`mx-auto bg-[#0A0E17] rounded-3xl p-4 md:p-8 border-2 border-[#1E293B] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col gap-8 ${viewMode === 'mobile' ? 'w-full' : 'w-full max-w-4xl'}`}>
      
      {/* Background Tech Border Lines */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-[#1E293B] m-2 rounded-2xl">
         <div className="absolute top-4 left-0 w-2 h-8 border-r-2 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
         <div className="absolute top-4 right-0 w-2 h-8 border-l-2 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
         <div className="absolute bottom-4 left-0 w-2 h-8 border-r-2 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
         <div className="absolute bottom-4 right-0 w-2 h-8 border-l-2 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
      </div>

      <div className={`grid gap-8 relative z-10 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        
        {/* LEFT COLUMN: GAUGES & SLIDERS */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
               <h1 className="text-xl md:text-2xl font-display font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                 CALCULADORA EXPERT
               </h1>
               <p className="text-[10px] md:text-xs text-cyan-400 font-mono mt-1 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">Engenharia de Processos Termodinâmicos</p>
            </div>
            <div className="flex gap-2">
               <Activity className="text-cyan-500 w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Mode Toggle Switch */}
          <div 
            className="relative flex items-center w-full h-12 bg-black/60 rounded-full border border-white/10 p-1 cursor-pointer overflow-hidden shadow-inner"
            onClick={() => setCalcMode(calcMode === "SH" ? "SC" : "SH")}
          >
            {/* The sliding thumb */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 ease-out ${
                calcMode === "SH" 
                ? "left-1 bg-rose-500/20 border border-rose-400" 
                : "left-[calc(50%+2px)] bg-cyan-500/20 border border-cyan-400"
              }`}
              style={{
                boxShadow: calcMode === "SH" 
                  ? "0 0 15px rgba(244,63,94,0.6), inset 0 0 10px rgba(244,63,94,0.4)" 
                  : "0 0 15px rgba(0,240,255,0.6), inset 0 0 10px rgba(0,240,255,0.4)"
              }}
            ></div>

            {/* Labels */}
            <div className={`relative z-10 flex-1 text-center font-tactical tracking-widest text-[9px] md:text-xs transition-colors duration-500 ${calcMode === "SH" ? "text-rose-300" : "text-zinc-500"}`} style={{ textShadow: calcMode === "SH" ? "0 0 10px #f43f5e, 0 0 20px #f43f5e" : "none" }}>
              SUPERAQUECIMENTO
            </div>
            <div className={`relative z-10 flex-1 text-center font-tactical tracking-widest text-[9px] md:text-xs transition-colors duration-500 ${calcMode === "SC" ? "text-cyan-300" : "text-zinc-500"}`} style={{ textShadow: calcMode === "SC" ? "0 0 10px #00f0ff, 0 0 20px #00f0ff" : "none" }}>
              SUBRESFRIAMENTO
            </div>
          </div>

          {/* Refrigerant Selector & Tank Image */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-widest">Fluido Refrigerante</span>
            <div className="flex flex-col md:flex-row items-center gap-6 bg-black/40 border border-white/5 rounded-3xl px-6 py-4 shadow-inner">
              <div className="flex flex-col items-center justify-center gap-2 relative">
                {/* Apply a neon shadow matching the refrigerant color behind the image */}
                <div 
                  className="absolute inset-0 rounded-full blur-2xl opacity-60 pointer-events-none transition-colors duration-500"
                  style={{ backgroundColor: getNeonColor(selectedRef) }}
                ></div>
                
                {/* Tank Wrapper for Tinting - Cropped to exact cylinder borders */}
                <div className="relative w-16 md:w-20 h-32 md:h-44 z-10 group mix-blend-screen overflow-hidden flex items-center justify-center">
                  <img 
                    src="/tank.jpg" 
                    alt="Cilindro de Fluido" 
                    className="absolute max-w-none h-full w-auto object-center z-10 transition-transform duration-700 group-hover:scale-105" 
                  />
                  
                  {/* Color Tint Overlay */}
                  <div 
                    className="absolute inset-0 z-20 mix-blend-multiply pointer-events-none transition-colors duration-500"
                    style={{ backgroundColor: getNeonColor(selectedRef) }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <Select value={selectedRef} onValueChange={setSelectedRef}>
                  <SelectTrigger className="w-full h-12 md:h-14 bg-[#0B1221] border border-white/10 text-white font-tactical tracking-widest text-lg md:text-xl focus:ring-1 focus:ring-cyan-500 shadow-[0_0_10px_rgba(255,255,255,0.05)] rounded-xl relative z-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1221] border border-white/10 text-white font-tactical tracking-widest text-lg md:text-xl rounded-xl max-h-[300px]">
                    {refrigerantsList.map(refObj => (
                      <SelectItem key={refObj.id} value={refObj.id} className="focus:bg-cyan-950 focus:text-cyan-400 cursor-pointer">
                        {refObj.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-col bg-zinc-900/80 border border-white/5 rounded-lg p-3 relative z-10 w-full mt-1">
                  <span className="text-[10px] md:text-xs text-zinc-500 font-tactical uppercase tracking-widest mb-2 text-center whitespace-nowrap">Pressão Nominal</span>
                  <div className="flex justify-between items-center font-mono gap-2 w-full">
                    <div className="flex flex-col items-center gap-1 w-1/2">
                      <span className="text-cyan-400 font-bold text-[9px] sm:text-[10px] whitespace-nowrap">
                        Evaporação <span className="text-xs sm:text-sm ml-0.5">5°C</span>
                      </span>
                      <span className="font-black text-white text-xs sm:text-sm whitespace-nowrap">
                        {(() => {
                           const pBar = getSaturationPressure(selectedRef, 5);
                           const pRes = pressureUnit === "psig" ? (pBar * 14.5038) - 14.5038 : pBar;
                           return pRes.toFixed(1);
                        })()} {pressureUnit}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 w-1/2">
                      <span className="text-rose-400 font-bold text-[9px] sm:text-[10px] whitespace-nowrap">
                        Condensação <span className="text-xs sm:text-sm ml-0.5">45°C</span>
                      </span>
                      <span className="font-black text-white text-xs sm:text-sm whitespace-nowrap">
                        {(() => {
                           const pBar = getSaturationPressure(selectedRef, 45);
                           const pRes = pressureUnit === "psig" ? (pBar * 14.5038) - 14.5038 : pBar;
                           return pRes.toFixed(1);
                        })()} {pressureUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* GAUGES */}
          <div className="flex justify-between items-center mt-2 px-1">
             <div className="flex flex-col items-center w-[46%] relative gap-2">
                <div className="w-full aspect-square relative rounded-full border-[6px] border-[#1E293B] bg-gradient-to-br from-[#0F172A] to-[#0B0F19] shadow-[inset_0_0_40px_rgba(0,0,0,1),0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-center p-2">
                   {renderTicks(maxLow, '#06b6d4')}
                   <div className="absolute top-[35%] text-[6px] md:text-[8px] font-tactical text-cyan-500 uppercase tracking-widest bg-[#0F172A] px-2 rounded-full border border-cyan-500/20">
                      BAIXA PRESSÃO
                   </div>
                   <div className="absolute bottom-[25%] bg-[#0B2136] border border-cyan-500/50 rounded-full px-2 py-0.5 md:py-1 shadow-[0_0_10px_rgba(0,240,255,0.3)] z-10">
                      <span className="text-[9px] md:text-[11px] font-mono text-cyan-300 font-bold">Te: {Te.toFixed(1)} °{tempUnit}</span>
                   </div>
                   <div className="absolute top-1/2 left-1/2 w-[2px] md:w-[3px] h-[35%] md:h-[40%] bg-gradient-to-t from-cyan-400 to-cyan-50 rounded-t-full origin-bottom transition-all duration-700 ease-out z-20 shadow-[0_0_15px_rgba(0,255,255,1)]" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${lowAngle}deg)` }}>
                     <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-cyan-50"></div>
                   </div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-zinc-900 border-2 border-cyan-400 rounded-full z-30 shadow-[0_0_10px_rgba(0,240,255,0.8)]"></div>
                </div>
                
                {/* Input adjustments moved outside */}
                <div className="w-[95%] md:w-[85%] flex items-center justify-between gap-1 mt-1">
                   <button onClick={() => setPSuc(pSuc - 0.5)} className="w-6 h-6 md:w-8 md:h-8 flex shrink-0 items-center justify-center bg-[#0B2136] border border-cyan-500/50 rounded-full text-cyan-400 font-bold hover:bg-cyan-900/50 transition-colors shadow-[0_0_10px_rgba(0,240,255,0.2)]">-</button>
                   <div className="relative flex-1">
                     <Input type="number" value={pSuc || ""} onChange={(e) => setPSuc(Number(e.target.value))} className="w-full bg-[#0B2136] border border-cyan-500/80 rounded text-center text-xs md:text-sm font-mono font-bold text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] h-7 md:h-8 px-1 py-0 focus:ring-cyan-400" />
                   </div>
                   <button onClick={() => setPSuc(pSuc + 0.5)} className="w-6 h-6 md:w-8 md:h-8 flex shrink-0 items-center justify-center bg-[#0B2136] border border-cyan-500/50 rounded-full text-cyan-400 font-bold hover:bg-cyan-900/50 transition-colors shadow-[0_0_10px_rgba(0,240,255,0.2)]">+</button>
                </div>
                <span className="text-[10px] md:text-xs font-tactical text-zinc-400 uppercase tracking-widest text-center mt-1">MANÔMETRO SUCÇÃO</span>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center gap-1 md:gap-2 opacity-90 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-rose-500/10 blur-xl pointer-events-none"></div>
                <div className="w-[120%] h-[2px] bg-cyan-500/70 relative ml-2 shadow-[0_0_8px_rgba(0,240,255,0.8)]"><div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 -left-1 top-1/2 -translate-y-1/2 animate-pulse"></div></div>
                <div className="w-[120%] h-[2px] bg-emerald-500/50 relative mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"><div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 -right-1 top-1/2 -translate-y-1/2 animate-ping"></div></div>
                <div className="w-[120%] h-[2px] bg-rose-500/70 relative ml-2 shadow-[0_0_8px_rgba(244,63,94,0.8)]"><div className="absolute w-1.5 h-1.5 rounded-full bg-rose-300 -left-1 top-1/2 -translate-y-1/2 animate-pulse"></div></div>
             </div>

             <div className="flex flex-col items-center w-[46%] relative gap-2">
                <div className="w-full aspect-square relative rounded-full border-[6px] border-[#1E293B] bg-gradient-to-br from-[#0F172A] to-[#0B0F19] shadow-[inset_0_0_40px_rgba(0,0,0,1),0_0_20px_rgba(244,63,94,0.15)] flex items-center justify-center p-2">
                   {renderTicks(maxHigh, '#f43f5e')}
                   <div className="absolute top-[35%] text-[6px] md:text-[8px] font-tactical text-rose-500 uppercase tracking-widest bg-[#0F172A] px-2 rounded-full border border-rose-500/20">
                      ALTA PRESSÃO
                   </div>
                   <div className="absolute bottom-[25%] bg-[#360B12] border border-rose-500/50 rounded-full px-2 py-0.5 md:py-1 shadow-[0_0_10px_rgba(244,63,94,0.3)] z-10">
                      <span className="text-[9px] md:text-[11px] font-mono text-rose-300 font-bold">Tc: {Tc.toFixed(1)} °{tempUnit}</span>
                   </div>
                   <div className="absolute top-1/2 left-1/2 w-[2px] md:w-[3px] h-[35%] md:h-[40%] bg-gradient-to-t from-rose-500 to-rose-100 rounded-t-full origin-bottom transition-all duration-700 ease-out z-20 shadow-[0_0_15px_rgba(255,0,0,1)]" style={{ transform: `translateX(-50%) translateY(-100%) rotate(${highAngle}deg)` }}>
                     <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-rose-100"></div>
                   </div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-zinc-900 border-2 border-rose-400 rounded-full z-30 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
                </div>
                
                {/* Input adjustments moved outside */}
                <div className="w-[95%] md:w-[85%] flex items-center justify-between gap-1 mt-1">
                   <button onClick={() => setPLiq(pLiq - 0.5)} className="w-6 h-6 md:w-8 md:h-8 flex shrink-0 items-center justify-center bg-[#360B12] border border-rose-500/50 rounded-full text-rose-400 font-bold hover:bg-rose-900/50 transition-colors shadow-[0_0_10px_rgba(244,63,94,0.2)]">-</button>
                   <div className="relative flex-1">
                     <Input type="number" value={pLiq || ""} onChange={(e) => setPLiq(Number(e.target.value))} className="w-full bg-[#360B12] border border-rose-500/80 rounded text-center text-xs md:text-sm font-mono font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] h-7 md:h-8 px-1 py-0 focus:ring-rose-400" />
                   </div>
                   <button onClick={() => setPLiq(pLiq + 0.5)} className="w-6 h-6 md:w-8 md:h-8 flex shrink-0 items-center justify-center bg-[#360B12] border border-rose-500/50 rounded-full text-rose-400 font-bold hover:bg-rose-900/50 transition-colors shadow-[0_0_10px_rgba(244,63,94,0.2)]">+</button>
                </div>
                <span className="text-[10px] md:text-xs font-tactical text-zinc-400 uppercase tracking-widest text-center mt-1">MANÔMETRO LÍQUIDO</span>
             </div>
          </div>

          {/* Sliders Area */}
          <div className={`grid gap-4 md:gap-8 mt-2 border-t border-zinc-800/80 pt-4 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-[9px] md:text-[11px] text-zinc-400">
                   <span>Temp. Sucção Ts (°{tempUnit})</span>
                   <span className="font-bold text-cyan-400 ml-1">{tSuc.toFixed(1)} °{tempUnit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTSuc(tSuc - 0.5)} className="w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center bg-cyan-950 border border-cyan-500/50 rounded text-cyan-400 font-bold hover:bg-cyan-900/50 transition-colors">-</button>
                  <Slider value={[tSuc]} min={tempUnit === "F" ? -22 : -30} max={tempUnit === "F" ? 122 : 50} step={0.5} onValueChange={(v) => setTSuc(v[0]!)} className="flex-1 [&_[role=slider]]:border-cyan-400 [&_[role=slider]]:bg-cyan-200 [&_[role=slider]]:shadow-[0_0_10px_rgba(0,240,255,0.8)] [&_.bg-primary]:bg-cyan-500 [&_.bg-secondary]:bg-cyan-950" />
                  <button onClick={() => setTSuc(tSuc + 0.5)} className="w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center bg-cyan-950 border border-cyan-500/50 rounded text-cyan-400 font-bold hover:bg-cyan-900/50 transition-colors">+</button>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">SA = Ts - Te</div>
             </div>
             <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-[9px] md:text-[11px] text-zinc-400">
                   <span>Temp. Líquido Tl (°{tempUnit})</span>
                   <span className="font-bold text-rose-400 ml-1">{tLiq.toFixed(1)} °{tempUnit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTLiq(tLiq - 0.5)} className="w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center bg-rose-950 border border-rose-500/50 rounded text-rose-400 font-bold hover:bg-rose-900/50 transition-colors">-</button>
                  <Slider value={[tLiq]} min={tempUnit === "F" ? 14 : -10} max={tempUnit === "F" ? 176 : 80} step={0.5} onValueChange={(v) => setTLiq(v[0]!)} className="flex-1 [&_[role=slider]]:border-rose-400 [&_[role=slider]]:bg-rose-200 [&_[role=slider]]:shadow-[0_0_10px_rgba(244,63,94,0.8)] [&_.bg-primary]:bg-rose-500 [&_.bg-secondary]:bg-rose-950" />
                  <button onClick={() => setTLiq(tLiq + 0.5)} className="w-6 h-6 md:w-7 md:h-7 shrink-0 flex items-center justify-center bg-rose-950 border border-rose-500/50 rounded text-rose-400 font-bold hover:bg-rose-900/50 transition-colors">+</button>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 text-right">SR = Tc - Tl</div>
             </div>
          </div>

          {/* Semi-circular Bottom Gauge */}
          <div className="mt-4 flex flex-col items-center">
             <div className="relative w-[240px] md:w-[280px] h-[120px] md:h-[140px] overflow-hidden flex justify-center">
                <div 
                  className="absolute top-0 w-[240px] md:w-[280px] h-[240px] md:h-[280px] rounded-full" 
                  style={{ 
                    background: 'conic-gradient(from 270deg, #3b82f6 0%, #22c55e 35%, #ef4444 70%, transparent 70%)', 
                    maskImage: 'radial-gradient(circle, transparent 60%, black 61%)', 
                    WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 61%)' 
                  }}
                ></div>
                <div className="absolute bottom-6 md:bottom-8 flex flex-col items-center">
                   <span className="text-3xl md:text-4xl font-display font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                      {activeValue.toFixed(1)} °{tempUnit}
                   </span>
                   <span className="text-[9px] md:text-xs text-zinc-400 font-tactical uppercase tracking-widest mt-1">
                      {calcMode === "SH" ? "Superaquecimento" : "Subresfriamento"}
                   </span>
                </div>
                <span className="absolute bottom-2 left-6 text-[10px] text-zinc-500 font-mono font-bold">{minDisplay}°</span>
                <span className="absolute bottom-2 right-6 text-[10px] text-zinc-500 font-mono font-bold">{maxDisplay}°</span>
                <div 
                  className="absolute bottom-0 left-1/2 w-[2px] h-[95px] md:h-[115px] bg-white rounded-t-full origin-bottom transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20"
                  style={{ transform: `translateX(-50%) rotate(${gaugeAngle - 90}deg)` }}
                >
                   <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[10px] border-l-transparent border-r-transparent border-b-white drop-shadow-[0_0_5px_rgba(255,255,255,1)]"></div>
                </div>
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-800 border-2 border-zinc-400 rounded-full z-30 shadow-md"></div>
             </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DIAGNOSTICS & CHART */}
        <div className="flex flex-col gap-6">
          


          {/* Diagnostic Graph */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-1 md:p-4 shadow-inner flex-1 min-h-[250px] relative">
             <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 to-transparent pointer-events-none rounded-2xl"></div>
             <DiagnosticsChart 
               realSH={SA} realSC={SR} 
               targetSHMin={targetSHMin} targetSHMax={targetSHMax} 
               targetSCMin={targetSCMin} targetSCMax={targetSCMax} 
             />
          </div>

          {/* Action Box */}
          <div className={`p-5 rounded-2xl border-2 backdrop-blur-md relative overflow-hidden transition-all duration-500 ${alertClass}`}>
             <div className="absolute top-0 left-0 w-1.5 h-full bg-current opacity-50 shadow-[0_0_10px_currentColor]"></div>
             
             <div className="flex items-start gap-3 mb-4">
                <Icon className={`w-8 h-8 ${statusColor} ${Icon !== CheckCircle2 ? 'animate-pulse' : ''} shrink-0`} />
                <div>
                   <h3 className={`text-sm md:text-base font-display font-black tracking-widest uppercase leading-tight ${statusColor}`}>
                     {diagnosis}
                   </h3>
                   <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest mt-1 block">Diagnóstico Avançado IA</span>
                </div>
             </div>

             <div className="bg-black/50 rounded-xl p-4 border border-white/5">
                <Label className="flex items-center gap-2 text-cyan-400 font-tactical tracking-widest uppercase text-[10px] mb-3">
                  <TerminalSquare className="w-4 h-4" /> Procedimentos Recomendados
                </Label>
                <ul className="space-y-2">
                  {steps.map((step, idx) => (
                     <li key={idx} className="text-xs font-mono text-white/80 leading-relaxed pl-2 border-l border-white/10">
                       {step}
                     </li>
                  ))}
                </ul>
             </div>

             <div className="mt-4 flex w-full justify-end items-center text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-cyan-500/70">
                  <ThermometerSun className="h-3 w-3 animate-pulse"/> 
                  Sincronizado com P-T
                </span>
             </div>
          </div>

        </div>

      </div>

    </div>
  );
}
