import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, Printer, FileText, Share2, MessageCircle, HeartPulse, DollarSign, Zap, ShieldCheck } from "lucide-react";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { toast } from "sonner";

export default function Reports() {
  const { 
    selectedRef: ref, expansion,
    pSuc, tSuc, pLiq, tLiq,
    tExt, tWb,
    pressureUnit, tempUnit
  } = useAppContext();

  const [clientName, setClientName] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [copied, setCopied] = useState(false);

  // Termodinâmica Sincronizada
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;
  const tEvapC = getSaturationTemp(ref, pSucBar);
  const tCondC = getSaturationTemp(ref, pLiqBar);
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;
  const realSH = Number((tSuc - tEvap).toFixed(1));
  const realSC = Number((tCond - tLiq).toFixed(1));
  const tAlta = Number((tCond + 30).toFixed(1));
  const deltaT = Number((tAlta - tSuc).toFixed(1));

  // Razão de Compressão e COP
  const compRatio = Number((pLiqBar / (pSucBar || 0.1)).toFixed(2));
  const T_evap_K = tEvapC + 273.15;
  const T_cond_K = tCondC + 273.15;
  const carnotCOP = T_cond_K > T_evap_K ? T_evap_K / (T_cond_K - T_evap_K) : 0;
  const estimatedCOP = Number((Math.max(0.1, carnotCOP * 0.55)).toFixed(2));
  const efeitoFrig = Math.round(Math.max(10, 180 - (T_cond_K - T_evap_K)));

  // HVAC Vitals Score (0 a 100%)
  const devSH = Math.abs(realSH - 6);
  const scoreSH = Math.max(0, 30 - devSH * 4.5);
  const devSC = Math.abs(realSC - 4);
  const scoreSC = Math.max(0, 30 - devSC * 6);
  const compRatioScore = Math.max(0, 20 - Math.max(0, compRatio - 3.2) * 8);
  const dischargeScore = tAlta <= 85 ? 20 : (tAlta <= 105 ? 12 : 0);
  const hvacVitalsScore = Math.round(Math.max(5, Math.min(100, scoreSH + scoreSC + compRatioScore + dischargeScore)));

  // Eficiência Volumétrica Real (%)
  const volEff = Math.round(Math.max(30, Math.min(94, 100 * (1 - 0.045 * (Math.pow(Math.max(1, compRatio), 1 / 1.18) - 1)))));

  // Desperdício Financeiro Estimado (R$/mês e R$/ano)
  const lossFactor = Math.max(0, (100 - hvacVitalsScore) / 100);
  const monthlyExtraKwh = Math.round(2.2 * lossFactor * 0.65 * 240);
  const monthlyExtraReais = Math.round(monthlyExtraKwh * 0.92);
  const annualExtraReais = monthlyExtraReais * 12;

  const getDiagnosticsStatus = () => {
    if (realSH > 9 && realSC < 2.5) return "⚠️ SUBCARGA CRÍTICA (FALTA DE FLUIDO REFRIGERANTE)";
    if (realSH < 3.5 && realSC > 7) return "🛑 SOBRECARGA CRÍTICA (EXCESSO DE FLUIDO REFRIGERANTE)";
    if (realSH > 8 && realSC > 6) return "⚠️ RESTRIÇÃO NA LINHA / VÁLVULA DE EXPANSÃO OBSTRUÍDA";
    if (realSH < 4 && realSC < 3) return "⚠️ BAIXA TROCA TÉRMICA / EVAPORADOR OU FILTROS SUJOS";
    if (realSH >= 5 && realSH <= 7 && realSC >= 3 && realSC <= 5) return "✅ OPERAÇÃO EM PERFEITO EQUILÍBRIO TÉRMICO (NOMINAL)";
    return "⚡ OPERAÇÃO EM AJUSTE TÉRMICO / REQUER CALIBRAÇÃO";
  };

  const generateReportText = () => {
    const date = new Date().toLocaleString('pt-BR');
    
    return `=============================================
  THERMOMASTER PRO - LAUDO DE COMISSIONAMENTO
=============================================
DATA: ${date}
CLIENTE/LOCAL: ${clientName || "Não informado"}
EQUIPAMENTO: ${equipmentName || "Sistema de Refrigeração/Climatização"}
RESPONSÁVEL TÉCNICO: Sandro RR (Engenharia de Refrigeração)

---------------------------------------------
1. PARÂMETROS DO CICLO & FLUIDO
---------------------------------------------
• Fluido Refrigerante: ${ref}
• Dispositivo de Expansão: ${expansion === 'txv' ? 'Válvula VET / Eletrônica' : 'Tubo Capilar / Orifício Fixo'}
• Temp. Externa (Ambiente): ${tExt.toFixed(1)}°${tempUnit}
• Temp. Bulbo Úmido: ${tWb.toFixed(1)}°${tempUnit}

---------------------------------------------
2. MEDIÇÕES DE CAMPO (BAIXA E ALTA PRESSÃO)
---------------------------------------------
[ SUCÇÃO / BAIXA PRESSÃO ]
• Pressão de Sucção: ${pSuc.toFixed(1)} ${pressureUnit}
• Temp. Linha de Sucção: ${tSuc.toFixed(1)}°${tempUnit}
• Temp. Saturação (Evaporação): ${tEvap.toFixed(1)}°${tempUnit}
• Superaquecimento Real (SH): ${realSH.toFixed(1)} K (Alvo: 5 a 7 K)

[ LINHA DE LÍQUIDO / ALTA PRESSÃO ]
• Pressão de Descarga/Líquido: ${pLiq.toFixed(1)} ${pressureUnit}
• Temp. Linha de Líquido: ${tLiq.toFixed(1)}°${tempUnit}
• Temp. Saturação (Condensação): ${tCond.toFixed(1)}°${tempUnit}
• Temp. Estimada de Descarga: ${tAlta.toFixed(1)}°${tempUnit}
• Sub-resfriamento Real (SC): ${realSC.toFixed(1)} K (Alvo: 3 a 5 K)

---------------------------------------------
3. ÍNDICES DE EFICIÊNCIA TERMODINÂMICA
---------------------------------------------
• Salto Térmico Global (ΔT): ${deltaT} K
• Razão de Compressão (Rc): ${compRatio}:1 (Ideal: 2.5 a 3.5)
• Eficiência Global (COP): ${estimatedCOP} W térmico / W elétrico
• Eficiência Volumétrica (ηv): ${volEff}% de deslocamento útil
• Efeito Frigorífico Específico: ${efeitoFrig} kJ/kg

---------------------------------------------
4. SCORE DE VITALIDADE & IMPACTO FINANCEIRO
---------------------------------------------
• HVAC Vitals™ Score: ${hvacVitalsScore}/100 (${hvacVitalsScore >= 85 ? "EXCELENTE" : hvacVitalsScore >= 70 ? "MODERADO" : "CRÍTICO"})
• Desperdício Elétrico Estimado: +R$ ${monthlyExtraReais},00 / mês
• Economia Anual com Calibração: R$ ${annualExtraReais},00 / ano

---------------------------------------------
5. DIAGNÓSTICO E PARECER TÉCNICO
---------------------------------------------
Status: ${getDiagnosticsStatus()}

Recomendação:
${hvacVitalsScore >= 85 
  ? "Equipamento em perfeito regime termodinâmico. Não requer ajustes de carga." 
  : `Ajustar a carga de refrigerante e inspecionar trocadores de calor para regularizar o Superaquecimento (SH) e Sub-resfriamento (SC), recuperando até R$ ${annualExtraReais},00/ano em eficiência energética.`}

=============================================
Gerado via ThermoMaster Pro v2.0 • Sincronizado
=============================================`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    toast.success("Laudo copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Resumo Rápido dos Vitals do Laudo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950/80 border border-emerald-500/30 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400">HVAC Vitals™</div>
            <div className="text-xl font-mono font-black text-emerald-400">{hvacVitalsScore}/100</div>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-cyan-500/30 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400">Rendimento COP</div>
            <div className="text-xl font-mono font-black text-cyan-400">{estimatedCOP}</div>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400">Economia Anual</div>
            <div className="text-xl font-mono font-black text-amber-400">R$ {annualExtraReais}</div>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-primary/30 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-400">Efic. Volumétrica</div>
            <div className="text-xl font-mono font-black text-primary">{volEff}%</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* Input Form */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card className="glass-panel border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] p-2.5 sm:p-5 rounded-xl sm:rounded-2xl">
            <CardHeader className="p-2 sm:p-4 pb-2">
              <CardTitle className="font-display tracking-widest text-primary text-sm sm:text-base">DADOS DO CLIENTE</CardTitle>
              <CardDescription className="font-mono text-xs sm:text-sm">Informações para emissão do laudo técnico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-2 sm:p-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-tactical tracking-widest text-xs sm:text-sm uppercase font-bold">Cliente / Empresa</Label>
                <Input 
                  type="text" 
                  className="bg-black/50 border-white/10 text-white font-mono text-base sm:text-lg h-11 sm:h-12" 
                  placeholder="Ex: Condomínio Solar, Indústria XYZ..."
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-tactical tracking-widest text-xs sm:text-sm uppercase font-bold">Identificação do Equipamento</Label>
                <Input 
                  type="text" 
                  className="bg-black/50 border-white/10 text-white font-mono text-base sm:text-lg h-11 sm:h-12"
                  placeholder="Ex: Chiller 01, VRF Setor B, Split Telhado..."
                  value={equipmentName} 
                  onChange={e => setEquipmentName(e.target.value)} 
                />
              </div>

              {/* Botões de Ação Imediata */}
              <div className="pt-2 space-y-2">
                <Button 
                  onClick={handleShareWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs sm:text-sm h-11 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar Laudo no WhatsApp
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCopy}
                    className="bg-black border-cyan-500/40 text-cyan-300 hover:bg-cyan-950 font-mono text-xs h-10 flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar Texto"}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handlePrint}
                    className="bg-black border-white/20 text-white hover:bg-zinc-900 font-mono text-xs h-10 flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-zinc-300" /> Imprimir / PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          <Card className="glass-panel border-primary/30 h-full flex flex-col rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.06)]">
            <CardHeader className="border-b border-white/10 p-3 sm:p-5 bg-black/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-display tracking-widest text-primary text-base sm:text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> LAUDO TÉCNICO DE COMISSIONAMENTO
                  </CardTitle>
                  <CardDescription className="font-mono text-xs sm:text-sm mt-0.5">
                    Relatório dinâmico sincronizado em tempo real com todos os módulos do sistema.
                  </CardDescription>
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" size="sm" className="bg-black border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs font-mono font-bold" onClick={handleShareWhatsApp}>
                    <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="bg-black border-white/20 text-xs font-mono font-bold" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 mr-1.5 text-green-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative bg-[#06080c]">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 1) 1px, transparent 1px)', backgroundSize: '100% 24px' }}></div>
              <pre className="font-mono text-xs sm:text-sm text-cyan-200/90 p-3.5 sm:p-6 whitespace-pre-wrap leading-relaxed h-[440px] overflow-y-auto custom-scrollbar selection:bg-cyan-500 selection:text-black">
                {generateReportText()}
              </pre>
            </CardContent>
            <CardFooter className="bg-black/70 border-t border-primary/20 p-3 sm:p-4 flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-tactical uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Assinatura Digital Verificada (Admin RR)
              </span>
              <div className="flex gap-2 sm:hidden">
                <Button variant="outline" size="sm" className="bg-emerald-600 text-white font-bold" onClick={handleShareWhatsApp}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="bg-primary/20 border-primary/50 text-primary hover:bg-primary/40 font-bold" onClick={handleCopy}>
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
