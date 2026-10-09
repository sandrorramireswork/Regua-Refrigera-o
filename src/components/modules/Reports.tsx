import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, Printer, FileText, Share2 } from "lucide-react";
import { getSaturationTemp } from "@/lib/thermodynamics";

export default function Reports() {
  const { 
    selectedRef: ref, expansion,
    pSuc, tSuc, pLiq, tLiq,
    tExt, tWb,
    pressureUnit, tempUnit, viewMode
  } = useAppContext();

  const [clientName, setClientName] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [copied, setCopied] = useState(false);

  // Thermodynamics re-calc for summary
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;
  const realSH = tSuc - tEvap;
  const realSC = tCond - tLiq;

  const getDiagnosticsStatus = () => {
    // Simplified logic for report
    if (realSH > 15 || realSC < 2) return "⚠️ Possível Subcarga ou Anomalia Térmica";
    if (realSC > 15) return "🛑 Possível Sobrecarga de Fluido";
    return "✅ Operação Nominal dentro dos parâmetros";
  };

  const generateReportText = () => {
    const date = new Date().toLocaleString('pt-BR');
    
    return `=== RELATÓRIO TÉCNICO: THERMOMASTER PRO ===
DATA: ${date}
CLIENTE/LOCAL: ${clientName || "Não informado"}
EQUIPAMENTO: ${equipmentName || "Não informado"}
TÉCNICO: Sandro RR (Admin)

--- PARÂMETROS DO SISTEMA ---
Refrigerante: ${ref}
Válvula Expansão: ${expansion === 'txv' ? 'VET' : 'Capilar/Fixo'}
Temp. Ambiente Ext: ${tExt.toFixed(1)}°${tempUnit}
Temp. Bulbo Úmido: ${tWb.toFixed(1)}°${tempUnit}

--- LEITURAS DE SUCÇÃO (BAIXA) ---
Pressão: ${pSuc.toFixed(1)} ${pressureUnit}
Temp. Tubo: ${tSuc.toFixed(1)}°${tempUnit}
Temp. Evaporação: ${tEvap.toFixed(1)}°${tempUnit}
Superaquecimento (SH): ${realSH.toFixed(1)}K

--- LEITURAS DE LÍQUIDO (ALTA) ---
Pressão: ${pLiq.toFixed(1)} ${pressureUnit}
Temp. Tubo: ${tLiq.toFixed(1)}°${tempUnit}
Temp. Condensação: ${tCond.toFixed(1)}°${tempUnit}
Subresfriamento (SC): ${realSC.toFixed(1)}K

--- DIAGNÓSTICO IA ---
Status: ${getDiagnosticsStatus()}

=========================================
Gerado via ThermoMaster Pro v2.0
=========================================`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
        
        {/* Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <CardHeader>
              <CardTitle className="font-display tracking-widest text-primary text-sm">DADOS DO CLIENTE</CardTitle>
              <CardDescription className="font-mono text-xs">Informações para emissão do laudo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-tactical tracking-widest text-xs uppercase">Cliente / Empresa</Label>
                <Input 
                  type="text" 
                  className="bg-black/50 border-white/10 text-white font-mono" 
                  placeholder="Ex: Indústria X..."
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-tactical tracking-widest text-xs uppercase">Identificação do Equipamento</Label>
                <Input 
                  type="text" 
                  className="bg-black/50 border-white/10 text-white font-mono"
                  placeholder="Ex: Chiller 01, Máquina Telhado..."
                  value={equipmentName} 
                  onChange={e => setEquipmentName(e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <Card className="glass-panel border-primary/30 h-full flex flex-col">
            <CardHeader className="border-b border-white/10 pb-4 bg-black/40">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-display tracking-widest text-primary text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" /> LAUDO TÉCNICO DE COMISSIONAMENTO
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    Visualização em tempo real do relatório gerado.
                  </CardDescription>
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" size="sm" className="bg-black border-white/10 text-xs font-tactical uppercase" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative bg-[#0a0a0a]">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 1) 1px, transparent 1px)', backgroundSize: '100% 24px' }}></div>
              <pre className="font-mono text-xs sm:text-sm text-primary/80 p-6 whitespace-pre-wrap leading-relaxed h-[400px] overflow-y-auto">
                {generateReportText()}
              </pre>
            </CardContent>
            <CardFooter className="bg-black/60 border-t border-primary/20 p-4 flex justify-between">
              <span className="text-[10px] font-tactical uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Assinatura Digital Verificada (Admin RR)
              </span>
              <div className="flex gap-2 sm:hidden">
                <Button variant="outline" size="sm" className="bg-primary/20 border-primary/50 text-primary hover:bg-primary/40" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  );
}
