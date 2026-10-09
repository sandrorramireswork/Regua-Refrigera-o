import { useState, useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Crosshair } from "lucide-react";

interface DiagnosticsChartProps {
  realSH: number;
  realSC: number;
  targetSHMin: number;
  targetSHMax: number;
  targetSCMin: number;
  targetSCMax: number;
}

export default function DiagnosticsChart({
  realSH,
  realSC,
  targetSHMin,
  targetSHMax,
  targetSCMin,
  targetSCMax,
}: DiagnosticsChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // We plot the current point
  const currentData = [{ sh: realSH, sc: realSC }];

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-cyan-500/50 p-3 rounded-lg backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <p className="font-tactical tracking-widest text-cyan-400 mb-1">PONTO REAL</p>
          <p className="font-mono text-sm text-white">Superaquecimento: {payload[0].value.toFixed(1)}K</p>
          <p className="font-mono text-sm text-white">Subresfriamento: {payload[1].value.toFixed(1)}K</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-panel border-white/5 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="font-display tracking-widest text-primary text-sm flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          MAPEAMENTO DE OPERAÇÃO
        </CardTitle>
        <CardDescription className="font-mono text-[10px] uppercase">
          Análise visual do envelope de saturação
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] w-full mt-4">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              type="number" 
              dataKey="sh" 
              name="Superaquecimento" 
              domain={[-5, 25]} 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              label={{ value: 'Superaquecimento (K)', position: 'insideBottom', offset: -15, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            />
            <YAxis 
              type="number" 
              dataKey="sc" 
              name="Subresfriamento" 
              domain={[-5, 25]} 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              label={{ value: 'Subresfriamento (K)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0, 240, 255, 0.5)' }} />
            
            {/* Target Area (Optimal Zone) */}
            <ReferenceArea 
              x1={targetSHMin} x2={targetSHMax} 
              y1={targetSCMin} y2={targetSCMax} 
              fill="#00FF66" fillOpacity={0.15} 
              stroke="#00FF66" strokeOpacity={0.5} 
            />
            
            {/* Undercharge Area (High SH, Low SC) */}
            <ReferenceArea 
              x1={targetSHMax} x2={25} 
              y1={-5} y2={targetSCMin} 
              fill="#FF8C00" fillOpacity={0.05} 
            />

            {/* Overcharge Area (Low SH, High SC) */}
            <ReferenceArea 
              x1={-5} x2={targetSHMin} 
              y1={targetSCMax} y2={25} 
              fill="#FF003C" fillOpacity={0.05} 
            />

            {/* Restriction Area (High SH, High SC) */}
            <ReferenceArea 
              x1={targetSHMax} x2={25} 
              y1={targetSCMax} y2={25} 
              fill="#FF003C" fillOpacity={0.05} 
            />
            
            {/* Live Data Point */}
            <Scatter name="Status Real" data={currentData} fill="#00F0FF" shape="circle" className="animate-pulse">
              {
                currentData.map((entry, index) => (
                  <circle key={`cell-${index}`} cx={entry.sh} cy={entry.sc} r={8} fill="#00F0FF" style={{ filter: "drop-shadow(0px 0px 8px #00F0FF)" }} />
                ))
              }
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cyan-400 font-mono text-sm animate-pulse">Carregando Mapa de Diagnóstico...</div>
        )}
      </CardContent>
    </Card>
  );
}
