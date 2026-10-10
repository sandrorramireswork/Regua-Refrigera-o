import { useAppContext } from "@/context/AppContext";
import { refrigerantsList, getSaturationTemp, getSaturationPressure } from "@/lib/thermodynamics";
import { Cylinder, Info } from "lucide-react";

export default function RefData() {
  const { selectedRef, pressureUnit, viewMode } = useAppContext();

  // Find the selected refrigerant details
  const refInfo = refrigerantsList.find(r => r.id === selectedRef) || refrigerantsList[0]!;

  // Calculations for standard AC application
  // Standing Pressure (Equilibrium at ambient 30°C)
  const standingPressureBarAbs = getSaturationPressure(refInfo.id, 30);
  const standingPressurePsi = (standingPressureBarAbs * 14.5038) - 14.5038;
  const standingPressureDisplay = pressureUnit === "psig" 
    ? `${standingPressurePsi.toFixed(0)} psi` 
    : `${(standingPressureBarAbs - 1).toFixed(1)} bar`;

  // Suction Pressure (Evap at 4°C)
  const suctionPressureBarAbs = getSaturationPressure(refInfo.id, 4);
  const suctionPressurePsi = (suctionPressureBarAbs * 14.5038) - 14.5038;
  const suctionVal = pressureUnit === "psig" ? suctionPressurePsi : suctionPressureBarAbs - 1;
  const suctionPressureDisplay = pressureUnit === "psig" 
    ? `${suctionVal.toFixed(0)} psi` 
    : `${suctionVal.toFixed(1)} bar`;

  // Discharge Pressure (Condenser at 45°C)
  const dischargePressureBarAbs = getSaturationPressure(refInfo.id, 45);
  const dischargePressurePsi = (dischargePressureBarAbs * 14.5038) - 14.5038;
  const dischargeVal = pressureUnit === "psig" ? dischargePressurePsi : dischargePressureBarAbs - 1;
  const dischargePressureDisplay = pressureUnit === "psig" 
    ? `${dischargeVal.toFixed(0)} psi` 
    : `${dischargeVal.toFixed(1)} bar`;

  // Boiling Point (at 1 atm = 1.01325 bar absolute)
  const boilingPointC = getSaturationTemp(refInfo.id, 1.01325);

  // Calcs para os ponteiros do Manifold (sweep de 270 graus: -135 a +135)
  const maxLow = pressureUnit === "psig" ? 250 : 17;
  const maxHigh = pressureUnit === "psig" ? 600 : 41;
  const getAngle = (val: number, max: number) => {
    const ratio = Math.max(0, Math.min(1, val / max));
    return -135 + (ratio * 270);
  };
  const lowAngle = getAngle(suctionVal, maxLow);
  const highAngle = getAngle(dischargeVal, maxHigh);

  return (
    <div className={`flex flex-col items-center gap-6 ${viewMode === 'mobile' ? 'w-full' : 'max-w-2xl mx-auto'}`}>
      
      {/* Informação Extra */}
      <div className="w-full p-3 bg-primary/10 border border-primary/20 rounded text-xs font-mono text-primary/80 flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Os dados abaixo são sincronizados em tempo real com o fluido selecionado ({selectedRef}). As pressões típicas consideram uma aplicação padrão de Ar Condicionado (Temp. Evap. 4°C, Temp. Cond. 45°C e Ambiente 30°C).</span>
      </div>

      <div className="w-full bg-black/40 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pb-4">
        
        {/* Header / Cylinder Image Area */}
        <div className="bg-black/80 p-6 md:p-8 flex justify-between items-center relative overflow-hidden h-auto md:h-[220px] border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <h1 className="hidden md:block absolute -left-10 opacity-10 text-[140px] font-black text-white z-0 font-display tracking-tighter mix-blend-overlay">
            {refInfo.id}
          </h1>
          
          <div className="relative z-10 w-full flex justify-between items-end gap-4">
            
            <h1 className="md:hidden text-5xl font-black text-white/20 z-10 font-display tracking-tighter self-center">
              {refInfo.id}
            </h1>

            {/* Manifold Analógico/Digital */}
            <div className="flex-1 flex justify-center gap-3 md:gap-8 items-center pt-2">
              
              {/* Manômetro de Baixa (Azul Neon) */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 md:w-24 md:h-24 bg-zinc-950 rounded-full border-2 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6),inset_0_0_20px_rgba(0,0,0,1)] flex flex-col items-center justify-center group hover:shadow-[0_0_40px_rgba(59,130,246,0.8)] transition-all duration-500 mb-2 md:mb-3">
                  <div className="absolute inset-0 rounded-full bg-blue-500/10 pointer-events-none"></div>
                  <div className="absolute top-3 md:top-5 text-[8px] md:text-[10px] font-tactical text-blue-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(59,130,246,0.8)] z-10">Baixa</div>
                  
                  {/* Ponteiro Sincronizado */}
                  <div 
                    className="absolute top-1/2 left-1/2 w-[2px] md:w-[3px] h-[40%] bg-gradient-to-t from-blue-500 to-blue-200 rounded-t-full origin-bottom opacity-90 transition-transform duration-1000 ease-out z-0"
                    style={{ transform: `translateX(-50%) translateY(-100%) rotate(${lowAngle}deg)` }}
                  ></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)] z-10 border border-blue-400"></div>
                </div>
                {/* Visor Digital */}
                <div className="bg-zinc-950/80 border border-blue-500/50 px-3 py-1 rounded-md shadow-[0_0_10px_rgba(59,130,246,0.3)] flex items-baseline gap-1">
                  <span className="font-mono text-lg md:text-2xl font-bold text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] leading-none">{suctionPressureDisplay.split(' ')[0]}</span>
                  <span className="text-[9px] md:text-[10px] text-blue-400/70 font-tactical uppercase tracking-widest">{suctionPressureDisplay.split(' ')[1]}</span>
                </div>
              </div>

              {/* Corpo do Manifold */}
              <div className="w-6 md:w-12 h-2 md:h-4 bg-gradient-to-b from-zinc-600 to-zinc-900 border-y border-zinc-500 shadow-[0_5px_15px_rgba(0,0,0,0.5)] mb-8 md:mb-10"></div>

              {/* Manômetro de Alta (Vermelho Neon) */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 md:w-24 md:h-24 bg-zinc-950 rounded-full border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6),inset_0_0_20px_rgba(0,0,0,1)] flex flex-col items-center justify-center group hover:shadow-[0_0_40px_rgba(244,63,94,0.8)] transition-all duration-500 mb-2 md:mb-3">
                  <div className="absolute inset-0 rounded-full bg-rose-500/10 pointer-events-none"></div>
                  <div className="absolute top-3 md:top-5 text-[8px] md:text-[10px] font-tactical text-rose-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(244,63,94,0.8)] z-10">Alta</div>
                  
                  {/* Ponteiro Sincronizado */}
                  <div 
                    className="absolute top-1/2 left-1/2 w-[2px] md:w-[3px] h-[40%] bg-gradient-to-t from-rose-500 to-rose-200 rounded-t-full origin-bottom opacity-90 transition-transform duration-1000 ease-out z-0"
                    style={{ transform: `translateX(-50%) translateY(-100%) rotate(${highAngle}deg)` }}
                  ></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)] z-10 border border-rose-400"></div>
                </div>
                {/* Visor Digital */}
                <div className="bg-zinc-950/80 border border-rose-500/50 px-3 py-1 rounded-md shadow-[0_0_10px_rgba(244,63,94,0.3)] flex items-baseline gap-1">
                  <span className="font-mono text-lg md:text-2xl font-bold text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] leading-none">{dischargePressureDisplay.split(' ')[0]}</span>
                  <span className="text-[9px] md:text-[10px] text-rose-400/70 font-tactical uppercase tracking-widest">{dischargePressureDisplay.split(' ')[1]}</span>
                </div>
              </div>

            </div>
            
            {/* Cylinder CSS Drawing */}
            <div className={`shrink-0 w-20 h-28 md:w-24 md:h-32 rounded-t-[40px] rounded-b-xl border-b-[12px] border-black/50 shadow-[inset_-15px_0_20px_rgba(0,0,0,0.5),inset_5px_0_15px_rgba(255,255,255,0.6),0_0_30px_currentColor] relative flex flex-col items-center justify-start pt-6 ${refInfo.color} transition-all duration-500`} style={{ color: refInfo.color.includes('rose') ? '#f43f5e' : refInfo.color.includes('blue') ? '#3b82f6' : refInfo.color.includes('green') ? '#22c55e' : refInfo.color.includes('orange') ? '#f97316' : '#a1a1aa' }}>
               <div className="absolute -top-3 w-7 h-4 bg-gradient-to-b from-zinc-300 to-zinc-500 rounded-t-sm border border-zinc-600 flex justify-center shadow-lg">
                 <div className="w-2 h-2 bg-zinc-200 rounded-full mt-0.5"></div>
               </div>
               <div className="absolute -top-7 w-12 h-6 border-[5px] border-zinc-400/90 rounded-t-full shadow-[0_5px_10px_rgba(0,0,0,0.3)]"></div>
               
               <div className="w-full bg-white/95 py-1 text-center mt-1 md:mt-3 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border-y-2 border-black/20">
                 <span className="block text-[6px] md:text-[8px] font-bold text-black uppercase tracking-widest leading-none">FLUIDO</span>
                 <span className="block text-sm md:text-xl font-black text-black leading-none tracking-tighter drop-shadow-md">{refInfo.id.replace('R-', '')}</span>
               </div>
            </div>
          </div>
          
          <div className="absolute right-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-0"></div>
        </div>

        {/* Data Rows - Neon Style */}
        <div className="px-4 space-y-4 mt-6">
          
          {/* Standing Pressure (Neon Blue) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-blue-500/30 border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">Pressão de Repouso <span className="opacity-50">(a 30°C)</span></span>
            <span className="font-mono text-lg md:text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{standingPressureDisplay}</span>
          </div>

          {/* Suction Pressure (Neon Cyan) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-cyan-500/30 border-l-4 border-l-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">Pressão de Sucção <span className="opacity-50">(Típica AC)</span></span>
            <span className="font-mono text-lg md:text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{suctionPressureDisplay}</span>
          </div>

          {/* Discharge Pressure (Neon Green) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-green-500/30 border-l-4 border-l-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">Pressão de Descarga <span className="opacity-50">(Típica AC)</span></span>
            <span className="font-mono text-lg md:text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{dischargePressureDisplay}</span>
          </div>

          {/* Boiling Point (Neon Yellow) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-yellow-500/30 border-l-4 border-l-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">Ponto de Ebulição <span className="opacity-50">(1 atm)</span></span>
            <span className="font-mono text-lg md:text-xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]">{boilingPointC.toFixed(1)} °C</span>
          </div>

          {/* Chemical Name (Neon Rose/Red) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-rose-500/30 border-l-4 border-l-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">Nome Químico</span>
            <span className="font-mono text-xs md:text-sm text-right max-w-[60%] leading-tight font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
              {refInfo.chemName || "Desconhecido"}
            </span>
          </div>

          {/* Chemical Formula (Neon Purple) */}
          <div className="bg-black/60 p-4 rounded-xl flex justify-between items-center border border-purple-500/30 border-l-4 border-l-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
            <span className="font-medium text-xs md:text-sm font-tactical uppercase tracking-widest text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">Fórmula Química</span>
            <span className="font-mono text-xs md:text-sm tracking-widest font-bold text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">{refInfo.chemFormula || "---"}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
