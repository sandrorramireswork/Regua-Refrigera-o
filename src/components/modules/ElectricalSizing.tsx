import { useState } from "react";
import { Zap, Activity, ShieldAlert, Cpu } from "lucide-react";

type VoltagePhase = "220V-Mono" | "220V-Tri" | "380V-Tri";
type Technology = "Inverter" | "On/Off";

interface CapacityData {
  btu: number;
  coolingKw: number;
  tr: number;
  elecPower: number; // Watts average
}

const capacities: CapacityData[] = [
  { btu: 9000, coolingKw: 2.64, tr: 0.75, elecPower: 820 },
  { btu: 12000, coolingKw: 3.52, tr: 1.0, elecPower: 1080 },
  { btu: 18000, coolingKw: 5.27, tr: 1.5, elecPower: 1620 },
  { btu: 24000, coolingKw: 7.03, tr: 2.0, elecPower: 2150 },
  { btu: 30000, coolingKw: 8.79, tr: 2.5, elecPower: 2750 },
  { btu: 36000, coolingKw: 10.55, tr: 3.0, elecPower: 3350 },
  { btu: 48000, coolingKw: 14.07, tr: 4.0, elecPower: 4500 },
  { btu: 60000, coolingKw: 17.58, tr: 5.0, elecPower: 5650 },
];

export function ElectricalSizing() {
  const [selectedBtu, setSelectedBtu] = useState<number>(12000);
  const [voltage, setVoltage] = useState<VoltagePhase>("220V-Mono");
  const [tech, setTech] = useState<Technology>("Inverter");

  const data = capacities.find((c) => c.btu === selectedBtu)!;

  // Engineering Calculations
  // I = P / (V * FP * eff) for mono
  // I = P / (V * sqrt(3) * FP * eff) for tri
  const powerFactor = tech === "Inverter" ? 0.95 : 0.85;
  const eff = 0.90;

  let nominalCurrent = 0;
  if (voltage === "220V-Mono") {
    nominalCurrent = data.elecPower / (220 * powerFactor * eff);
  } else if (voltage === "220V-Tri") {
    nominalCurrent = data.elecPower / (220 * 1.732 * powerFactor * eff);
  } else if (voltage === "380V-Tri") {
    nominalCurrent = data.elecPower / (380 * 1.732 * powerFactor * eff);
  }

  // Inrush Current (Starting Current)
  const startingCurrent = tech === "Inverter" ? nominalCurrent * 1.2 : nominalCurrent * 5.5;

  // Breaker Sizing (Rule of thumb: In * 1.25, standard commercial sizes)
  const breakerSizes = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
  const targetBreaker = nominalCurrent * 1.25;
  let recommendedBreaker = breakerSizes.find((b) => b >= targetBreaker) || 100;

  const breakerCurve = tech === "Inverter" ? "Curva B ou C" : "Curva C (Obrigatório)";
  const breakerPoles = voltage === "220V-Mono" ? "Bipolar (F-F) ou Monopolar (F-N)" : "Tripolar";

  // Wire Sizing (NBR 5410 for PVC 70°C, B1 install method, simplified)
  let wireGauge = "2.5";
  if (targetBreaker > 36) wireGauge = "10.0";
  else if (targetBreaker > 28) wireGauge = "6.0";
  else if (targetBreaker > 21) wireGauge = "4.0";
  else wireGauge = "2.5"; // Minimum standard for power circuits is 2.5mm2

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      
      {/* Parameters Header */}
      <div className="bg-[#0B1221] border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] rounded-xl sm:rounded-3xl p-3.5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-4 sm:mb-6 relative z-10">
          <Zap className="text-emerald-400 w-5 h-5 sm:w-6 sm:h-6" />
          <h2 className="text-sm sm:text-base font-tactical text-emerald-50 tracking-widest uppercase font-bold">
            Dimensionamento Elétrico (NBR 5410)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          {/* Capacity Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-300 font-mono uppercase tracking-widest font-bold">Capacidade Térmica</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {capacities.map((c) => (
                <button
                  key={c.btu}
                  onClick={() => setSelectedBtu(c.btu)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all border ${
                    selectedBtu === c.btu
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-black/40 border-white/5 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {c.btu / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Voltage Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-300 font-mono uppercase tracking-widest font-bold">Tensão / Fases</label>
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {(["220V-Mono", "220V-Tri", "380V-Tri"] as VoltagePhase[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVoltage(v)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all border text-left ${
                    voltage === v
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      : "bg-black/40 border-white/5 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Technology Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-300 font-mono uppercase tracking-widest font-bold">Tecnologia do Compressor</label>
            <div className="flex gap-2">
              {(["Inverter", "On/Off"] as Technology[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTech(t)}
                  className={`flex-1 px-3 py-3 rounded-lg font-mono text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                    tech === t
                      ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                      : "bg-black/40 border-white/5 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {t === "Inverter" ? <Cpu className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Report Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Thermodynamics & Power */}
        <div className="bg-[#0B1221] border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
          <h3 className="text-xs font-tactical text-zinc-400 mb-4 tracking-widest font-bold uppercase">Conversão Termodinâmica & Carga</h3>
          
          <div className="space-y-3 font-mono text-sm sm:text-base">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Capacidade de Refrigeração</span>
              <div className="text-right">
                <span className="text-cyan-400 font-black text-xl sm:text-2xl">{data.btu.toLocaleString('pt-BR')} <span className="text-xs text-cyan-400/70 font-normal">BTU/h</span></span>
              </div>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Equivalente Térmico (TR)</span>
              <span className="text-white font-black text-lg sm:text-xl">{data.tr.toFixed(2)} <span className="text-xs text-zinc-500 font-normal">TR</span></span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Potência Frigorífica (kW)</span>
              <span className="text-white font-black text-lg sm:text-xl">{data.coolingKw.toFixed(2)} <span className="text-xs text-zinc-500 font-normal">kW</span></span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <span className="text-zinc-300 font-medium">Potência Elétrica (Estimada)</span>
              <span className="text-amber-400 font-black text-xl sm:text-2xl">{data.elecPower.toLocaleString('pt-BR')} <span className="text-xs text-amber-400/70 font-normal">Watts</span></span>
            </div>
          </div>
        </div>

        {/* Protection Sizing */}
        <div className="bg-[#0B1221] border border-emerald-500/30 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-[0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <h3 className="text-xs font-tactical text-zinc-400 mb-4 tracking-widest font-bold uppercase">Dimensionamento de Proteção</h3>
          
          <div className="space-y-3 font-mono text-sm sm:text-base">
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Corrente de Projeto (I<sub>B</sub>)</span>
              <span className="text-emerald-400 font-black text-xl sm:text-2xl">{nominalCurrent.toFixed(1)} <span className="text-xs text-emerald-400/70 font-normal">A</span></span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Corrente de Partida (LRA)</span>
              <span className="text-rose-400 font-black text-xl sm:text-2xl">{startingCurrent.toFixed(1)} <span className="text-xs text-rose-400/70 font-normal">A</span></span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <span className="text-zinc-300 font-medium">Secção do Condutor (Cabo)</span>
              <span className="text-white font-black text-xl sm:text-2xl">{wireGauge} <span className="text-xs text-zinc-500 font-normal">mm²</span></span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <span className="text-zinc-300 font-medium">Disjuntor Recomendado (I<sub>n</sub>)</span>
              <div className="text-right">
                <div className="text-emerald-400 font-black text-2xl sm:text-3xl">{recommendedBreaker}A</div>
                <div className="text-xs text-emerald-400/80 font-bold mt-0.5">{breakerPoles} - {breakerCurve}</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Engineer Notes */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2 bg-blue-500/10 rounded-full shrink-0">
          <ShieldAlert className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-xs text-zinc-400 font-mono leading-relaxed space-y-2">
          <p>
            <strong className="text-blue-400">Notas de Engenharia:</strong> Cálculos consideram Fator de Potência médio de {powerFactor.toFixed(2)} e eficiência de {(eff * 100).toFixed(0)}%. 
            Para cabos acima de 20 metros, deve-se recalcular a bitola pela <strong>Queda de Tensão</strong> máxima de 4%.
          </p>
          <p>
            Dimensionamento visa proteção do condutor (I<sub>B</sub> ≤ I<sub>n</sub> ≤ I<sub>Z</sub>), 
            conforme NBR 5410. Compressores On/Off exigem disjuntores de Curva C ou D para suportar a alta corrente de inrush sem desarme indesejado.
          </p>
          <p className="text-emerald-400/80">
            * Aterramento obrigatório. A secção transversal do condutor de proteção (PE) deve ser igual à do condutor fase (S ≤ 16mm²).
          </p>
        </div>
      </div>

    </div>
  );
}
