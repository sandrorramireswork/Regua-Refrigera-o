import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Zap, CheckCircle2, AlertTriangle, AlertCircle, Info, Activity } from "lucide-react";

export default function CompressorTest() {
  // Tipo de compressor
  const [isCompressorInverter, setIsCompressorInverter] = useState(false);
  const [hasGroundFault, setHasGroundFault] = useState(false);

  // Inputs para as 3 leituras
  const [val1, setVal1] = useState<number | "">(""); // C-R ou U-V
  const [val2, setVal2] = useState<number | "">(""); // C-S ou V-W
  const [val3, setVal3] = useState<number | "">(""); // R-S ou U-W

  // Estado do diagnóstico
  const [diagnosis, setDiagnosis] = useState<{
    status: "good" | "warning" | "error" | "idle";
    title: string;
    message: string;
  }>({
    status: "idle",
    title: "AGUARDANDO DADOS",
    message: "Insira os valores de resistência (Ω) lidos no multímetro para obter o diagnóstico.",
  });

  useEffect(() => {
    if (hasGroundFault) {
      setDiagnosis({
        status: "error",
        title: "COMPRESSOR EM CURTO (MASSA)",
        message: "O teste acusou continuidade entre a bobina e a carcaça. O motor está aterrado (dando choque) e deve ser substituído imediatamente. Nunca ligue o equipamento.",
      });
      return;
    }

    if (val1 === "" || val2 === "" || val3 === "") {
      setDiagnosis({
        status: "idle",
        title: "AGUARDANDO DADOS",
        message: "Insira os 3 valores de resistência (Ω) lidos no multímetro para a análise matemática das bobinas.",
      });
      return;
    }

    const v1 = Number(val1);
    const v2 = Number(val2);
    const v3 = Number(val3);

    if (v1 <= 0 || v2 <= 0 || v3 <= 0) {
      setDiagnosis({
        status: "error",
        title: "BOBINA EM CURTO-CIRCUITO",
        message: "Leitura de 0Ω (ou próximo disso) indica que a bobina derreteu e fechou curto interno. O compressor precisa ser trocado.",
      });
      return;
    }

    if (isCompressorInverter) {
      // Lógica INVERTER (U, V, W): as 3 bobinas devem ser iguais.
      const max = Math.max(v1, v2, v3);
      const min = Math.min(v1, v2, v3);
      const diffPercent = ((max - min) / max) * 100;

      if (diffPercent <= 7) {
        setDiagnosis({
          status: "good",
          title: "MOTOR INVERTER ÍNTEGRO",
          message: `As três bobinas (U, V, W) possuem resistências simétricas (${v1}Ω, ${v2}Ω, ${v3}Ω). O estator está em perfeito estado elétrico.`,
        });
      } else {
        setDiagnosis({
          status: "error",
          title: "DESBALANCEAMENTO DE BOBINA",
          message: `Diferença de resistência detectada (${diffPercent.toFixed(1)}%). Motores Inverter exigem simetria quase perfeita. Esta placa de potência (IPM) desarmará por erro de sobrecorrente.`,
        });
      }
    } else {
      // Lógica CONVENCIONAL ON/OFF (C, R, S)
      const sum = v1 + v2;
      const diff = Math.abs(sum - v3);
      const tolerance = v3 * 0.15; // 15% tolerância

      if (v1 >= v2) {
        setDiagnosis({
          status: "warning",
          title: "PINAGEM INVERTIDA",
          message: "A resistência de Marcha (C-R) deveria ser menor que a Auxiliar (C-S). Verifique se os cabos do capacitor ou os bornes não foram identificados errados.",
        });
        return;
      }

      if (diff <= tolerance) {
        setDiagnosis({
          status: "good",
          title: "BOBINAS ÍNTEGRAS (BOM ESTADO)",
          message: `O motor convencional está saudável. A soma (C-R + C-S = ${sum.toFixed(1)}Ω) equivale aproximadamente ao valor medido entre R-S (${v3}Ω).`,
        });
      } else {
        setDiagnosis({
          status: "error",
          title: "FALHA NAS BOBINAS (ABERTA/ALTERADA)",
          message: `A soma matemática não bate. C-R + C-S (${sum.toFixed(1)}Ω) diverge do total R-S medido (${v3}Ω). Bobina parcialmente rompida ou em curto entre espiras.`,
        });
      }
    }
  }, [val1, val2, val3, isCompressorInverter, hasGroundFault]);

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-12">
      
      {/* Coluna da Esquerda */}
      <div className="space-y-4 sm:space-y-6 col-span-1 lg:col-span-5">
        <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)] p-2.5 sm:p-5 rounded-xl sm:rounded-2xl">
          <CardHeader className="p-2 sm:p-4 pb-2">
            <CardTitle className="font-display tracking-widest text-primary text-sm sm:text-base flex justify-between items-center">
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 sm:h-5 sm:w-5" /> TESTE DE MOTOR</span>
              <div className="flex items-center gap-2 text-xs font-mono bg-black/40 px-3 py-1 rounded-full border border-white/10">
                <span className={!isCompressorInverter ? "text-primary font-bold" : "text-white/40"}>ON/OFF</span>
                <Switch checked={isCompressorInverter} onCheckedChange={(v) => { setIsCompressorInverter(v); setVal1(""); setVal2(""); setVal3(""); }} />
                <span className={isCompressorInverter ? "text-green-400 font-bold" : "text-white/40"}>INVERTER</span>
              </div>
            </CardTitle>
            <CardDescription className="font-mono text-xs uppercase">
              {isCompressorInverter ? "Módulo Trifásico DC (Tecnologia Inverter)" : "Motor Monofásico (C-R-S)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-2 sm:p-4 pt-2">
            
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs sm:text-sm font-mono text-primary/80 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isCompressorInverter 
                  ? "Para compressores Inverter, a resistência entre as 3 combinações dos pinos (U, V, W) deve ser estritamente igual."
                  : "Meça com o multímetro na escala de Ohms (Ω). A soma dos dois menores valores deve ser igual ao maior valor (R-S)."
                }
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
               <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                 <Label className="text-cyan-400 font-tactical tracking-widest text-xs sm:text-sm uppercase flex justify-between font-bold">
                   <span>Teste 1: {isCompressorInverter ? "U - V" : "C - R"}</span>
                   <span className="text-white/50">{isCompressorInverter ? "Bobina 1" : "Comum p/ Marcha"}</span>
                 </Label>
                 <div className="relative">
                   <Input 
                     type="number" step="0.1" placeholder="Ex: 1.1"
                     className="bg-black/60 border-cyan-500/30 text-cyan-400 font-mono text-xl sm:text-2xl font-black pr-8 h-11 sm:h-12"
                     value={val1} onChange={e => setVal1(e.target.value === "" ? "" : Number(e.target.value))}
                   />
                   <span className="absolute right-3 top-2.5 sm:top-3 text-cyan-400/50 font-mono font-bold text-sm sm:text-base">Ω</span>
                 </div>
               </div>

               <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                 <Label className="text-green-400 font-tactical tracking-widest text-xs sm:text-sm uppercase flex justify-between font-bold">
                   <span>Teste 2: {isCompressorInverter ? "V - W" : "C - S"}</span>
                   <span className="text-white/50">{isCompressorInverter ? "Bobina 2" : "Comum p/ Auxiliar"}</span>
                 </Label>
                 <div className="relative">
                   <Input 
                     type="number" step="0.1" placeholder="Ex: 3.3"
                     className="bg-black/60 border-green-500/30 text-green-400 font-mono text-xl sm:text-2xl font-black pr-8 h-11 sm:h-12"
                     value={val2} onChange={e => setVal2(e.target.value === "" ? "" : Number(e.target.value))}
                   />
                   <span className="absolute right-3 top-2.5 sm:top-3 text-green-400/50 font-mono font-bold text-sm sm:text-base">Ω</span>
                 </div>
               </div>

               <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-black/40 border border-white/10">
                 <Label className="text-orange-400 font-tactical tracking-widest text-xs sm:text-sm uppercase flex justify-between font-bold">
                   <span>Teste 3: {isCompressorInverter ? "U - W" : "R - S"}</span>
                   <span className="text-white/50">{isCompressorInverter ? "Bobina 3" : "Marcha p/ Auxiliar"}</span>
                 </Label>
                 <div className="relative">
                   <Input 
                     type="number" step="0.1" placeholder="Ex: 4.4"
                     className="bg-black/60 border-orange-500/30 text-orange-400 font-mono text-xl sm:text-2xl font-black pr-8 h-11 sm:h-12"
                     value={val3} onChange={e => setVal3(e.target.value === "" ? "" : Number(e.target.value))}
                   />
                   <span className="absolute right-3 top-2.5 sm:top-3 text-orange-400/50 font-mono font-bold text-sm sm:text-base">Ω</span>
                 </div>
               </div>
            </div>

            <div className={`p-3.5 sm:p-4 border rounded-xl transition-colors flex items-center justify-between ${hasGroundFault ? 'bg-rose-500/20 border-rose-500' : 'bg-black/40 border-white/10'}`}>
              <div className="space-y-1">
                <Label className={`font-tactical tracking-widest uppercase text-xs sm:text-sm font-bold ${hasGroundFault ? 'text-rose-400' : 'text-white/70'}`}>Fuga para Massa (Carcaça)</Label>
                <p className="text-[11px] sm:text-xs font-mono text-white/50">O multímetro bipou tocando no pino e no cobre do tubo?</p>
              </div>
              <Switch checked={hasGroundFault} onCheckedChange={setHasGroundFault} />
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Coluna da Direita */}
      <div className="space-y-4 sm:space-y-6 col-span-1 lg:col-span-7">
        
        <Card className={`glass-panel border-2 transition-colors duration-500 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl ${
          diagnosis.status === 'good' ? 'border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.2)]' :
          diagnosis.status === 'warning' ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' :
          diagnosis.status === 'error' ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]' :
          'border-white/10'
        }`}>
          <CardHeader className="p-2 sm:p-4 pb-2">
            <CardTitle className="flex items-center gap-2 font-display tracking-widest text-base sm:text-xl uppercase font-black">
              {diagnosis.status === 'good' && <CheckCircle2 className="h-6 w-6 text-[#00FF66]" />}
              {diagnosis.status === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-400 animate-pulse" />}
              {diagnosis.status === 'error' && <AlertCircle className="h-6 w-6 text-rose-500 animate-pulse" />}
              {diagnosis.status === 'idle' && <Activity className="h-6 w-6 text-white/50" />}
              <span className={
                diagnosis.status === 'good' ? 'text-[#00FF66]' :
                diagnosis.status === 'warning' ? 'text-yellow-400' :
                diagnosis.status === 'error' ? 'text-rose-500' : 'text-white/50'
              }>
                {diagnosis.title}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-2">
            <p className="text-white/90 font-mono text-sm sm:text-base leading-relaxed mb-6 font-medium">
              {diagnosis.message}
            </p>

            {/* Diagrama Visual */}
            <div className="relative w-full h-[250px] bg-black/60 rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center">
               <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
               
               <div className="relative w-48 h-48 bg-gradient-to-br from-zinc-800 to-black rounded-full border-4 border-zinc-700 shadow-2xl flex items-center justify-center z-10 transition-all duration-500">
                 
                 {/* Pino Superior */}
                 <div className="absolute top-6 flex flex-col items-center">
                   <div className={`w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center text-[10px] font-bold text-black mb-1 shadow-[0_0_10px_rgba(0,240,255,0.5)] ${isCompressorInverter ? 'bg-indigo-400' : 'bg-cyan-500'}`}>
                     {isCompressorInverter ? 'U' : 'C'}
                   </div>
                   <span className="text-[10px] font-tactical tracking-widest text-white/80 bg-black/50 px-1 rounded uppercase">
                     {isCompressorInverter ? 'Fase U' : 'Comum'}
                   </span>
                 </div>

                 {/* Pino Inferior Direito */}
                 <div className="absolute bottom-8 right-4 flex flex-col items-center">
                   <div className={`w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center text-[10px] font-bold text-black mb-1 shadow-[0_0_10px_rgba(244,63,94,0.5)] ${isCompressorInverter ? 'bg-indigo-400' : 'bg-rose-500'}`}>
                     {isCompressorInverter ? 'V' : 'R'}
                   </div>
                   <span className="text-[10px] font-tactical tracking-widest text-white/80 bg-black/50 px-1 rounded uppercase">
                     {isCompressorInverter ? 'Fase V' : 'Marcha'}
                   </span>
                 </div>

                 {/* Pino Inferior Esquerdo */}
                 <div className="absolute bottom-8 left-4 flex flex-col items-center">
                   <div className={`w-6 h-6 rounded-full border-2 border-white/50 flex items-center justify-center text-[10px] font-bold text-black mb-1 shadow-[0_0_10px_rgba(74,222,128,0.5)] ${isCompressorInverter ? 'bg-indigo-400' : 'bg-green-500'}`}>
                     {isCompressorInverter ? 'W' : 'S'}
                   </div>
                   <span className="text-[10px] font-tactical tracking-widest text-white/80 bg-black/50 px-1 rounded uppercase">
                     {isCompressorInverter ? 'Fase W' : 'Auxiliar'}
                   </span>
                 </div>

                 {/* Conexão Virtual */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 192 192">
                    <polygon points="96,48 144,136 48,136" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
                 </svg>
               </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="p-3 bg-black/40 rounded border border-white/5 text-center">
                <p className="text-[10px] font-tactical text-muted-foreground mb-1">{isCompressorInverter ? "U - V" : "C - R"}</p>
                <p className="font-mono text-cyan-400 font-bold">{val1 || "---"} Ω</p>
                <p className="text-[9px] text-white/40 mt-1 uppercase">{isCompressorInverter ? "Bobina Simétrica" : "Menor Valor"}</p>
              </div>
              <div className="p-3 bg-black/40 rounded border border-white/5 text-center">
                <p className="text-[10px] font-tactical text-muted-foreground mb-1">{isCompressorInverter ? "V - W" : "C - S"}</p>
                <p className="font-mono text-green-400 font-bold">{val2 || "---"} Ω</p>
                <p className="text-[9px] text-white/40 mt-1 uppercase">{isCompressorInverter ? "Bobina Simétrica" : "Valor Médio"}</p>
              </div>
              <div className="p-3 bg-black/40 rounded border border-white/5 text-center">
                <p className="text-[10px] font-tactical text-muted-foreground mb-1">{isCompressorInverter ? "U - W" : "R - S"}</p>
                <p className="font-mono text-orange-400 font-bold">{val3 || "---"} Ω</p>
                <p className="text-[9px] text-white/40 mt-1 uppercase">{isCompressorInverter ? "Bobina Simétrica" : "Maior Valor"}</p>
              </div>
            </div>

            {/* Dica técnica extra */}
            <div className="mt-4 p-4 border-l-2 border-primary/50 bg-primary/5 text-xs font-mono text-white/70">
              <strong className="text-primary block mb-1">Dica de Campo:</strong>
              Para testes definitivos de isolação (Fuga para a Massa), o multímetro comum não possui tensão suficiente. É altamente recomendado o uso de um Megômetro (500V) para atestar a fuga real para a carcaça.
            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  );
}
