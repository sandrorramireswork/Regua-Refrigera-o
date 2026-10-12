import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Thermometer, Activity, Wind, FileText, Settings, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// Module A component
import PTEngine from "@/components/modules/PTEngine";
// Module B component
import DigitalTwin from "@/components/modules/DigitalTwin";
import Psychrometrics from "@/components/modules/Psychrometrics";
import Piping from "@/components/modules/Piping";
import Reports from "@/components/modules/Reports";
import Maintenance from "@/components/modules/Maintenance";
import { ElectricalSizing } from "@/components/modules/ElectricalSizing";
import MasterAdminPanel from "@/components/modules/MasterAdminPanel";
import { 
  Lock, Unlock, User, AlertTriangle, AlertCircle, CheckCircle2, MessageCircle, 
  UserPlus, Key, Wrench, Zap, Cylinder, Phone, ShieldCheck, Sparkles, Clock, 
  LogOut, Check, ArrowRight, X, ShieldAlert, Sparkle, Smartphone, Copy, RefreshCw,
  Hourglass, Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSaturationTemp } from "@/lib/thermodynamics";
import { 
  UserAccount, 
  APP_PRICE_REAIS, 
  SELLER_WHATSAPP, 
  getActiveSession, 
  setActiveSession, 
  registerFreeTrial, 
  requestFreeTrial48h,
  generateTrialWaitingWhatsAppLink,
  loginWithPhone, 
  loginUnified,
  clientCreatePassword,
  findClientForFirstAccess,
  performSecuritySyncCheck,
  adminSaveAndSyncAll,
  activateLicense, 
  getRemainingTrialTime, 
  generateWhatsAppBuyLink, 
  generateWaitingApprovalWhatsAppLink,
  formatApprovedNotificationWhatsApp,
  loginAsAdmin, 
  formatPhone, 
  cleanPhone,
  getDeviceId,
  generate9DigitKey,
  getStoredAccounts,
  resetAccountDevice
} from "@/lib/licenseService";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function DashboardContent({ 
  session, 
  onLogout,
  onRefreshSession
}: { 
  session: UserAccount; 
  onLogout: () => void;
  onRefreshSession: () => void;
}) {
  const [activeTab, setActiveTab] = useState("pt-engine");
  const { selectedRef, pSuc, pLiq, tSuc, tLiq, pressureUnit, tempUnit, tExt, setTExt } = useAppContext();
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [extRh, setExtRh] = useState<number | null>(null);
  const [city, setCity] = useState<string>("SISTEMA ONLINE");

  // Upgrade Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeKeyInput, setUpgradeKeyInput] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const remaining = getRemainingTrialTime(session.trialExpiresAt);

  const handleModalActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeKeyInput.trim()) return;
    const res = activateLicense(upgradeKeyInput, session.phone);
    if (res.success) {
      toast.success("Licença Ativada!", { description: res.message });
      setShowUpgradeModal(false);
      setUpgradeKeyInput("");
      setUpgradeError("");
      onRefreshSession();
    } else {
      setUpgradeError(res.message);
      toast.error("Falha na ativação", { description: res.message });
    }
  };

  const fetchWeather = useCallback(async (silent = false) => {
    setIsFetchingWeather(true);
    try {
      if (!navigator.geolocation) {
        if (!silent) toast.error("Geolocalização não suportada", { description: "Seu navegador não suporta GPS." });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            // Fetch Weather
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
            const data = await res.json();
            
            // Fetch City
            const cityRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
            const cityData = await cityRes.json();
            
            if (cityData?.city || cityData?.locality) {
              setCity(cityData.city || cityData.locality);
            }

            if (data?.current?.temperature_2m !== undefined) {
              let tempC = data.current.temperature_2m;
              if (tempUnit === "F") {
                tempC = (tempC * 9/5) + 32;
              }
              setTExt(tempC);
              setExtRh(data.current.relative_humidity_2m);
              if (!silent) toast.success("Clima atualizado", { description: `Temperatura local: ${tempC}°${tempUnit}` });
            }
          } catch (e) {
            if (!silent) toast.error("Erro na API", { description: "Não foi possível buscar os dados do clima." });
          } finally {
            setIsFetchingWeather(false);
          }
        },
        (error) => {
          if (!silent) toast.error("Erro no GPS", { description: "Permissão negada ou sinal fraco." });
          setIsFetchingWeather(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (e) {
      if (!silent) toast.error("Erro genérico", { description: "Falha ao buscar localização." });
      setIsFetchingWeather(false);
    }
  }, [tempUnit, setTExt]);

  useEffect(() => {
    // Atualiza a cada 10 minutos (600000 ms) silenciosamente
    const intervalId = setInterval(() => {
      fetchWeather(true);
    }, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchWeather]);

  // Global Diagnosis Logic
  const pSucBar = pressureUnit === "psig" ? (pSuc + 14.5038) / 14.5038 : pSuc;
  const pLiqBar = pressureUnit === "psig" ? (pLiq + 14.5038) / 14.5038 : pLiq;
  const tEvapC = getSaturationTemp(selectedRef, pSucBar);
  const tCondC = getSaturationTemp(selectedRef, pLiqBar);
  const tEvap = tempUnit === "F" ? (tEvapC * 9/5) + 32 : tEvapC;
  const tCond = tempUnit === "F" ? (tCondC * 9/5) + 32 : tCondC;
  const realSH = tSuc - tEvap;
  const realSC = tCond - tLiq;

  let targetSHMin = 5; let targetSHMax = 8;
  let targetSCMin = 4; let targetSCMax = 7;
  if (tempUnit === "F") { targetSHMin = 9; targetSHMax = 14.4; targetSCMin = 7.2; targetSCMax = 12.6; }

  const isSHHigh = realSH > targetSHMax;
  const isSHLow = realSH < targetSHMin;
  const isSCHigh = realSC > targetSCMax;
  const isSCLow = realSC < targetSCMin;
  const isSHNormal = realSH >= targetSHMin && realSH <= targetSHMax;
  const isSCNormal = realSC >= targetSCMin && realSC <= targetSCMax;

  let globalDiagnosis = "ANALISANDO DADOS... (ESTADO TRANSIENTE)";
  let globalColor = "text-yellow-400";
  let globalBorder = "border-yellow-500/50";
  let GlobalIcon = AlertTriangle;

  if (isSHNormal && isSCNormal) {
    globalDiagnosis = "OPERAÇÃO DENTRO DOS PARÂMETROS NOMINAIS";
    globalColor = "text-[#00FF66]";
    globalBorder = "border-[#00FF66]/50 shadow-[0_0_15px_rgba(0,255,102,0.2)]";
    GlobalIcon = CheckCircle2;
  } else if ((isSHHigh && isSCLow) || (isSHHigh && isSCNormal)) {
    globalDiagnosis = "SUBCARGA: FALTA DE FLUIDO REFRIGERANTE";
    globalColor = "text-orange-400";
    globalBorder = "border-orange-500/50 shadow-[0_0_15px_rgba(255,140,0,0.2)]";
    GlobalIcon = AlertTriangle;
  } else if ((isSHLow && isSCHigh) || (isSHNormal && isSCHigh)) {
    globalDiagnosis = "SOBRECARGA: EXCESSO DE FLUIDO REFRIGERANTE";
    globalColor = "text-red-500";
    globalBorder = "border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.2)]";
    GlobalIcon = AlertCircle;
  } else if (isSHHigh && isSCHigh) {
    globalDiagnosis = "RESTRIÇÃO NA LINHA LÍQUIDA / VÁLVULA FECHADA";
    globalColor = "text-red-500";
    globalBorder = "border-red-500/50 shadow-[0_0_15px_rgba(255,0,0,0.2)]";
    GlobalIcon = AlertCircle;
  } else if (isSHLow && isSCLow) {
    globalDiagnosis = "BAIXA TROCA TÉRMICA NO EVAPORADOR / VÁLVULA ABERTA";
    globalColor = "text-orange-400";
    globalBorder = "border-orange-500/50 shadow-[0_0_15px_rgba(255,140,0,0.2)]";
    GlobalIcon = AlertTriangle;
  } else if (isSHNormal && isSCLow) {
    globalDiagnosis = "BAIXO SUBRESFRIAMENTO / BAIXA CARGA OU TEMP. EXTERNA";
    globalColor = "text-yellow-400";
    globalBorder = "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
    GlobalIcon = AlertTriangle;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-black transition-all duration-500">
      {/* Header */}
      <header className="border-b border-border/50 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white to-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] text-left">
                THERMOMASTER <span className="text-primary">PRO</span>
              </h1>
              <div className="flex justify-end w-full">
                <span className="text-[8px] sm:text-[10px] font-black italic text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] font-mono tracking-widest uppercase mt-0.5">BY SRR</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* GPS & External Temp Widget */}
            <div className="flex items-center justify-end">
              <Button 
                variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg shrink-0 p-0 hover:text-cyan-300"
                style={{ filter: "drop-shadow(0 0 10px rgba(0,240,255,0.8))" }}
                onClick={() => fetchWeather(false)} disabled={isFetchingWeather} title="Obter clima local por GPS"
              >
                {isFetchingWeather ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />}
              </Button>
              <div className="flex items-center ml-1" style={{ textShadow: "0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff" }}>
                <span className="text-cyan-400 font-mono text-xl sm:text-3xl font-black shrink-0">
                  {tExt !== 0 ? tExt.toFixed(1) : "--"}
                </span>
                <span className="text-sm sm:text-xl font-bold text-cyan-400 font-mono shrink-0 ml-0.5">
                  °{tempUnit}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-start justify-center ml-1 mr-1">
              <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-cyan-400 font-bold tracking-widest text-xs sm:text-sm">{extRh !== null ? `${extRh}%` : 'ONLINE'}</span>
              </div>
              {city !== "SISTEMA ONLINE" && (
                <span className="text-[9px] uppercase font-tactical text-zinc-500 tracking-widest truncate max-w-[90px]">
                  {city}
                </span>
              )}
            </div>

            {/* Status da Licença / Teste Grátis */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {session.isPro ? (
                <div 
                  onClick={() => {
                    if (session.isAdmin) setActiveTab("master-admin");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 font-mono text-xs shadow-[0_0_12px_rgba(234,179,8,0.25)] ${
                    session.isAdmin ? "cursor-pointer hover:bg-yellow-500/20 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all" : ""
                  }`}
                  title={session.isAdmin ? "Clique para gerenciar clientes no painel Master Admin" : "Licença PRO Vitalícia"}
                >
                  <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-pulse" />
                  <span className="font-bold tracking-wider uppercase hidden sm:inline">
                    {session.isAdmin ? "⚡ MASTER ADMIN" : "PRO VITALÍCIO"}
                  </span>
                  <span className="font-bold sm:hidden">{session.isAdmin ? "ADMIN" : "PRO"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-mono text-[11px] sm:text-xs shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-cyan-400 shrink-0" />
                    <span className="font-bold tracking-wider uppercase truncate max-w-[85px] sm:max-w-none">
                      {remaining.text}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black tracking-widest text-[9.5px] sm:text-[11px] h-7 sm:h-8 px-2 sm:px-3 rounded-lg hover:brightness-110 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all uppercase"
                  >
                    <Sparkles className="w-3 h-3 mr-1 hidden sm:inline" />
                    LIBERAR PRO (R$ {APP_PRICE_REAIS})
                  </Button>
                </div>
              )}

              {/* Badge Oficial de Proteção Anti-Pirataria e Auto-Sync */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>PROTEÇÃO ATIVA • SYNC 5M</span>
              </div>

              {/* Botão Sair / Trocar de Conta */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                onClick={onLogout}
                title={`Operador: ${session.name} (${session.formattedPhone || session.phone}) - Sair`}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Global Status Banner */}
      <div className={`w-full bg-black/80 backdrop-blur-md border-b sticky top-16 z-40 px-4 py-2 flex items-center justify-center ${globalBorder}`}>
        <div className="flex items-center gap-3">
          <GlobalIcon className={`w-5 h-5 ${globalColor} ${GlobalIcon !== CheckCircle2 ? 'animate-pulse' : ''}`} />
          <span className={`text-sm md:text-base font-display font-bold tracking-widest uppercase ${globalColor} drop-shadow-[0_0_5px_currentColor]`}>
            {globalDiagnosis}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-1 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-6">
        <div className="mb-4 sm:mb-6 px-1 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-display neon-text-cyan opacity-90">PAINEL DE DIAGNÓSTICO</h2>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">
            Cálculos termodinâmicos avançados e análise de campo
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap justify-center h-auto p-1 bg-black/40 backdrop-blur-sm border border-border/50 rounded-xl w-full gap-1">
            <TabsTrigger value="pt-engine" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-cyan-500/20 text-cyan-500/70 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400 data-[state=active]:shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-300">
              <Activity className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">DIAGNÓSTICO</span>
            </TabsTrigger>
            
            <TabsTrigger value="mollier" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-green-500/20 text-green-500/70 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/50 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400 data-[state=active]:shadow-[0_0_20px_rgba(74,222,128,0.8)] transition-all duration-300">
              <Gauge className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">GÊMEO DIGITAL</span>
            </TabsTrigger>
            
            <TabsTrigger value="psychrometrics" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-purple-500/20 text-purple-500/70 hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400 data-[state=active]:shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all duration-300">
              <Wind className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">PSICROMETRIA</span>
            </TabsTrigger>
            
            <TabsTrigger value="piping" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-blue-500/20 text-blue-500/70 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400 data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all duration-300">
              <Settings className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">TUBULAÇÃO</span>
            </TabsTrigger>
            
            <TabsTrigger value="reports" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-orange-500/20 text-orange-500/70 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-400 data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-all duration-300">
              <FileText className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">RELATÓRIOS</span>
            </TabsTrigger>
            
            <TabsTrigger value="compressor" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-yellow-500/20 text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-400 data-[state=active]:shadow-[0_0_20px_rgba(234,179,8,0.8)] transition-all duration-300">
              <Zap className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">ELÉTRICA</span>
            </TabsTrigger>
            
            <TabsTrigger value="maintenance" className="shrink-0 flex-1 min-w-[65px] sm:min-w-[90px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-rose-500/20 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 hover:shadow-[0_0_10px_rgba(244,63,94,0.3)] data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 data-[state=active]:border-rose-400 data-[state=active]:shadow-[0_0_20px_rgba(244,63,94,0.8)] transition-all duration-300">
              <Wrench className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">FERRAMENTAS</span>
            </TabsTrigger>

            {/* ABA RESTRITA: MASTER ADMIN (CADASTRO E GESTÃO DE CLIENTES) */}
            {session.isAdmin && (
              <TabsTrigger 
                value="master-admin" 
                className="shrink-0 flex-1 min-w-[70px] sm:min-w-[115px] flex flex-col gap-1 py-1.5 sm:py-2.5 rounded-lg border border-yellow-500/60 bg-amber-500/10 text-yellow-400 hover:text-yellow-300 hover:bg-amber-500/25 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.6)] data-[state=active]:bg-amber-500/30 data-[state=active]:text-yellow-300 data-[state=active]:border-yellow-400 data-[state=active]:shadow-[0_0_25px_rgba(234,179,8,0.9)] transition-all duration-300 animate-pulse"
              >
                <Zap className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]" />
                <span className="text-[9.5px] sm:text-[11px] font-black tracking-wider font-tactical uppercase text-center leading-tight text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]">
                  ⚡ MASTER ADMIN
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pt-engine" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <PTEngine />
          </TabsContent>

          <TabsContent value="mollier" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <DigitalTwin />
          </TabsContent>
          
          <TabsContent value="psychrometrics" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <Psychrometrics />
          </TabsContent>

          <TabsContent value="piping" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <Piping />
          </TabsContent>
          
          <TabsContent value="reports" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <Reports />
          </TabsContent>

          <TabsContent value="compressor" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <ElectricalSizing />
          </TabsContent>

          <TabsContent value="maintenance" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
            <Maintenance />
          </TabsContent>

          {/* CONTEÚDO RESTRITO: MASTER ADMIN */}
          {session.isAdmin && (
            <TabsContent value="master-admin" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
              <MasterAdminPanel />
            </TabsContent>
          )}

        </Tabs>
      </main>

      {/* Modal de Upgrade Promocional */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg glass-panel border-amber-500/50 shadow-[0_0_40px_rgba(234,179,8,0.25)] relative overflow-hidden">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader className="text-center pt-6 pb-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold font-tactical text-amber-400 tracking-wider">
                LIBERAÇÃO DA LICENÇA VITALÍCIA
              </CardTitle>
              <CardDescription className="text-zinc-300 font-mono text-xs uppercase tracking-wider mt-1">
                Acesso permanente sem mensalidades para {session.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/60 rounded-xl p-3.5 border border-white/10 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>CLIENTE CADASTRADO:</span>
                  <span className="text-white font-bold">{session.name}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>CELULAR:</span>
                  <span className="text-cyan-400 font-bold">{session.formattedPhone || session.phone}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>APARELHO AUTORIZADO (ID):</span>
                  <span className="text-zinc-300 font-bold">{session.deviceId || getDeviceId()}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400 pt-1 border-t border-white/5">
                  <span>INVESTIMENTO ÚNICO:</span>
                  <span className="text-amber-400 font-black text-base">R$ {APP_PRICE_REAIS} (VITALÍCIO)</span>
                </div>
              </div>

              {/* Protocolo de Segurança: Chave enviada exclusivamente ao Admin */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Liberação Segura via Admin
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    Aguardando PIX
                  </span>
                </div>
                <div className="text-[10.5px] text-zinc-300 font-mono bg-black/60 p-2.5 rounded-lg border border-white/5 space-y-1.5 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>A chave de 9 dígitos deste aparelho é enviada <strong>diretamente para o WhatsApp do Admin Sandro RR</strong> (+55 51 99539-4808).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>Após efetuar o PIX de R$ {APP_PRICE_REAIS}, envie o comprovante no WhatsApp do Admin.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span>O próprio Admin enviará a chave de acesso de volta para você inserir no campo abaixo e desbloquear permanentemente.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={generateWhatsAppBuyLink(session.name, session.phone, session.generatedAccessKey)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-3.5 px-3 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.01] uppercase tracking-wider text-center"
                >
                  <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                  ENVIAR DADOS & CHAVE AO ADMIN (+55 51 99539-4808)
                </a>
                <p className="text-[10.5px] text-center text-zinc-400 font-mono leading-tight">
                  Após confirmação do PIX de R$ {APP_PRICE_REAIS}, o admin Sandro RR enviará a chave de acesso de volta para você.
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <Button
                  type="button"
                  onClick={() => {
                    onRefreshSession();
                    toast.info("Verificando status da licença...");
                  }}
                  className="w-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-tactical tracking-widest text-xs h-10 uppercase"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  VERIFICAR SE O ADMIN JÁ LIBEROU
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

function Dashboard() {
  const [session, setSession] = useState<UserAccount | null>(() => getActiveSession());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Form states - Login Unificado (Admin e Clientes entram pela mesma caixa de entrada)
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Modo de Primeiro Acesso (Criação de Senha pelo Cliente após cadastro do Admin)
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [firstAccessAccount, setFirstAccessAccount] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Modo de Solicitação de 48 Horas Grátis
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialPhoneInput, setTrialPhoneInput] = useState("");
  const [trialNameInput, setTrialNameInput] = useState("");

  // Auto-Sync e Monitoramento de Segurança Anti-Pirataria
  useEffect(() => {
    // 1. Relógio a cada 30 segundos
    const clockTimer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    // 2. AUTO-SYNC & VERIFICAÇÃO DE SEGURANÇA A CADA 5 MINUTOS (300.000 ms)
    // Conforme determinação: "a cada 5 minutos o aplicativo atualizar e salvar as alterações"
    const securityTimer = setInterval(() => {
      const check = performSecuritySyncCheck();
      if (check.status === "session_revoked") {
        setSession(null);
        toast.error("Segurança do Aplicativo", {
          description: check.message || "Acesso desativado pelo administrador Sandro RR."
        });
      } else if (check.status === "trial_expired") {
        refreshSession();
        toast.warning("Demonstração Finalizada", {
          description: "Seu teste de 48h terminou. Adquira sua licença vitalícia."
        });
      } else if (check.status === "device_mismatch") {
        setSession(null);
        toast.error("Aparelho não Autorizado", {
          description: "O uso simultâneo em outro aparelho foi bloqueado."
        });
      } else if (check.account) {
        setSession({ ...check.account });
      }
    }, 300000); // 5 minutos

    return () => {
      clearInterval(clockTimer);
      clearInterval(securityTimer);
    };
  }, []);

  const refreshSession = () => {
    const updated = getActiveSession();
    setSession(updated ? { ...updated } : null);
  };

  const handleLogout = () => {
    setActiveSession(null);
    setSession(null);
    setIsFirstAccess(false);
    setFirstAccessAccount(null);
    toast.info("Sessão finalizada com sucesso.");
  };

  // Login Unificado: Tanto o Admin Sandro RR quanto os clientes entram por aqui
  const handleUnifiedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    // Se o cliente não digitou senha, checa se é primeiro acesso para criar senha
    if (!passwordInput.trim()) {
      const check = findClientForFirstAccess(loginInput);
      if (check.found && check.needsPasswordCreation && check.account) {
        setIsFirstAccess(true);
        setFirstAccessAccount(check.account);
        toast.info("Primeiro Acesso Detectado", {
          description: `Olá ${check.account.name}! Crie sua senha pessoal de acesso.`
        });
        return;
      }
    }

    const res = loginUnified(loginInput, passwordInput);
    if (!res.success) {
      if (res.needsPasswordCreation && res.account) {
        setIsFirstAccess(true);
        setFirstAccessAccount(res.account);
        toast.info("Primeiro Acesso", {
          description: `Olá ${res.account.name}! Crie sua senha pessoal de acesso.`
        });
        return;
      }
      setLoginError(res.message);
      toast.error("Atenção", { description: res.message });
      return;
    }

    if (res.account) {
      setSession({ ...res.account });
      if (res.account.isAdmin) {
        toast.success("Bem-vindo, Sandro RR!", { description: "Sessão Master de Engenharia autenticada." });
      } else if (res.isWaitingApproval) {
        toast.info("Aguardando Ativação do Admin", { description: res.message });
      } else {
        toast.success("Acesso Liberado!", { description: res.message });
      }
    }
  };

  // Submissão da criação de senha pelo cliente no primeiro acesso
  const handleCreateClientPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!firstAccessAccount) return;

    if (newPassword.trim().length < 3) {
      setLoginError("A senha deve conter no mínimo 3 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLoginError("As senhas digitadas não coincidem. Digite novamente.");
      return;
    }

    const res = clientCreatePassword(firstAccessAccount.phone, newPassword);
    if (res.success && res.account) {
      setIsFirstAccess(false);
      setSession({ ...res.account });
      toast.success("Senha Cadastrada com Sucesso!", {
        description: "Sua conta agora aguarda ativação pelo Administrador Sandro RR na aba Master Admin."
      });
    } else {
      setLoginError(res.message);
      toast.error("Erro ao cadastrar senha", { description: res.message });
    }
  };

  // Ação ao clicar em Grátis por 48Hs:
  // Envia para o aplicativo na aba Master Admin e para o WhatsApp +5551995394808
  const handleRequest48h = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    const phoneToUse = trialPhoneInput.trim() || loginInput.trim();
    if (!phoneToUse) {
      setShowTrialModal(true);
      return;
    }

    const res = requestFreeTrial48h(phoneToUse, trialNameInput);
    if (res.success && res.account) {
      setSession({ ...res.account });
      setShowTrialModal(false);
      toast.success("Solicitação enviada com sucesso!", {
        description: "Seu celular foi registrado no aplicativo aguardando confirmação do administrador."
      });
      if (res.whatsAppUrl) {
        window.open(res.whatsAppUrl, "_blank");
      }
    } else {
      setLoginError(res.message);
      toast.error("Atenção", { description: res.message });
    }
  };

  // Verificação de ativação e confirmação da Conta PRO pelo admin
  const handleCheckApproval = () => {
    const updated = getActiveSession();
    if (updated?.isApproved) {
      setSession({ ...updated });
      toast.success("Conta PRO Confirmada!", { 
        description: `Parabéns, ${updated.name}! Seu acesso à Conta PRO foi confirmado e liberado pelo Admin Sandro RR.` 
      });
    } else {
      toast.info("Aguardando Confirmação", { 
        description: "O Admin Sandro RR ainda não confirmou sua solicitação na aba Master Admin. Clique no botão de WhatsApp abaixo para falar com ele." 
      });
    }
  };

  // ==========================================
  // CENÁRIO A: NÃO AUTENTICADO (TELA DE LOGIN OU CRIAÇÃO DE SENHA)
  // ==========================================
  if (!session) {
    // MODO PRIMEIRO ACESSO: CLIENTE CRIANDO SENHA
    if (isFirstAccess && firstAccessAccount) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-black to-black z-0"></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(234, 179, 8, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <Card className="w-full max-w-md glass-panel border-amber-500/60 relative z-10 shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
              
              <div className="flex flex-col items-center">
                <CardTitle className="text-xl sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-amber-400">
                  PRIMEIRO ACESSO
                </CardTitle>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-yellow-300 font-mono text-[10px] uppercase tracking-wider mt-2">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>Crie sua Senha Pessoal de Acesso</span>
                </div>
              </div>
              
              <div className="mt-3 bg-black/60 border border-white/10 rounded-xl p-3 text-left space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>TÉCNICO / EMPRESA:</span>
                  <span className="text-white font-bold uppercase">{firstAccessAccount.name}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>CELULAR:</span>
                  <span className="text-cyan-400 font-bold">{firstAccessAccount.formattedPhone || firstAccessAccount.phone}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2 pb-6 space-y-4">
              <form onSubmit={handleCreateClientPassword} className="space-y-4">
                <div className="space-y-2 relative">
                  <div className="absolute left-3.5 top-3.5 text-amber-400/60"><Lock className="w-4 h-4" /></div>
                  <Input 
                    type="password"
                    placeholder="DIGITE SUA NOVA SENHA" 
                    className="bg-black/60 border-amber-500/30 text-white font-mono pl-10 h-11 text-xs sm:text-sm tracking-wider" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3.5 top-3.5 text-amber-400/60"><Lock className="w-4 h-4" /></div>
                  <Input 
                    type="password"
                    placeholder="CONFIRME SUA NOVA SENHA" 
                    className="bg-black/60 border-amber-500/30 text-white font-mono pl-10 h-11 text-xs sm:text-sm tracking-wider" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono text-center leading-relaxed">
                    {loginError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  CADASTRAR SENHA E SOLICITAR ATIVAÇÃO
                </Button>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFirstAccess(false);
                      setLoginError("");
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    // MODO MODAL: SOLICITAÇÃO DE 48H GRÁTIS
    if (showTrialModal) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 via-black to-black z-0"></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

          <Card className="w-full max-w-md glass-panel border-primary/60 relative z-10 shadow-[0_0_50px_rgba(0,240,255,0.25)] animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/40 text-primary font-mono text-[11px] uppercase tracking-wider mx-auto mb-2 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Solicitação Oficial • 48 Horas Grátis</span>
              </div>

              <CardTitle className="text-xl sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-primary">
                GRÁTIS POR 48 HORAS
              </CardTitle>

              <CardDescription className="font-mono text-zinc-300 text-xs sm:text-sm mt-1 leading-relaxed">
                Informe seu número de celular. A solicitação será enviada para a aba <strong className="text-primary">Master Admin</strong> e para o WhatsApp do administrador <strong className="text-yellow-400">Sandro RR (+55 51 99539-4808)</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2 pb-6 space-y-4">
              <form onSubmit={handleRequest48h} className="space-y-4">
                <div className="space-y-2 relative">
                  <div className="absolute left-3.5 top-3.5 text-primary/70"><Phone className="w-4 h-4" /></div>
                  <Input 
                    type="tel"
                    placeholder="SEU CELULAR COM DDD (EX: 51 99999-9999)" 
                    className="bg-black/60 border-primary/40 text-white font-mono pl-10 h-12 text-xs sm:text-sm tracking-wider" 
                    value={trialPhoneInput}
                    onChange={(e) => setTrialPhoneInput(formatPhone(e.target.value))}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3.5 top-3.5 text-primary/70"><User className="w-4 h-4" /></div>
                  <Input 
                    placeholder="SEU NOME OU EMPRESA (OPCIONAL)" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm uppercase tracking-wider" 
                    value={trialNameInput}
                    onChange={(e) => setTrialNameInput(e.target.value)}
                  />
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono text-center leading-relaxed">
                    {loginError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                >
                  <MessageCircle className="w-4 h-4 mr-2 fill-white" />
                  ENVIAR AO MASTER ADMIN & WHATSAPP
                </Button>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTrialModal(false);
                      setLoginError("");
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    // FORMULÁRIO PADRÃO DE LOGIN
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Efeitos de Fundo Futurista */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <Card className="w-full max-w-md glass-panel border-primary/50 relative z-10 shadow-[0_0_50px_rgba(0,240,255,0.15)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-primary animate-pulse" />
            </div>
            
            <div className="flex flex-col items-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white to-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] text-center">
                THERMOMASTER <span className="text-primary">PRO</span>
              </CardTitle>
              <div className="flex justify-end w-full">
                <span className="text-[10px] sm:text-xs font-black italic text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.9)] font-mono tracking-widest uppercase mt-1 pr-2">BY SRR</span>
              </div>
            </div>
            
            <CardDescription className="font-mono uppercase tracking-widest text-[11px] text-zinc-400 mt-2">
              Plataforma Técnica de Engenharia Térmica & Diagnóstico
            </CardDescription>

            {/* Botão Oficial: Clique em Grátis por 48Hs */}
            <div className="mt-3 w-full">
              <button
                type="button"
                onClick={() => {
                  if (loginInput.trim()) setTrialPhoneInput(loginInput.trim());
                  setShowTrialModal(true);
                }}
                className="w-full group relative overflow-hidden rounded-xl border-2 border-primary bg-gradient-to-r from-cyan-950/60 via-primary/20 to-blue-950/60 p-3 text-center transition-all duration-300 hover:border-cyan-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:scale-[1.01]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="font-tactical text-xs sm:text-sm font-black tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                    🎁 CLIQUE AQUI: GRÁTIS POR 48 HORAS
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] font-mono text-zinc-300">
                  Envia solicitação para o Master Admin e para o WhatsApp (+55 51 99539-4808)
                </p>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-6 space-y-4">
            {/* FORMULÁRIO UNIFICADO: APENAS LOGIN E SENHA */}
            <form onSubmit={handleUnifiedLogin} className="space-y-4">
              <div className="space-y-2 relative">
                <div className="absolute left-3.5 top-3.5 text-primary/60"><User className="w-4 h-4" /></div>
                <Input 
                  placeholder="LOGIN OU CELULAR" 
                  className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm uppercase tracking-wider" 
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2 relative">
                <div className="absolute left-3.5 top-3.5 text-primary/60"><Lock className="w-4 h-4" /></div>
                <Input 
                  type="password"
                  placeholder="SENHA DE ACESSO" 
                  className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm tracking-wider" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>

              {loginError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono text-center leading-relaxed">
                  {loginError}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary text-black font-black hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm"
              >
                <Unlock className="w-4 h-4 mr-2" />
                ENTRAR NO APLICATIVO
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Segurança: Válido para 1 único aparelho • ID: {getDeviceId()}</span>
              </div>
            </form>

            {/* LOGO ABAIXO: WHATSAPP PARA CONTATO */}
            <div className="pt-4 border-t border-white/10 space-y-2.5 text-center">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                Não tem cadastro ou precisa de liberação?
              </span>
              <a 
                href={`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent("Olá Sandro! Gostaria de solicitar meu cadastro e liberação de 48 horas grátis no aplicativo TermoMaster Pro.")}`}
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-3.5 px-3 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.01] tracking-wider uppercase text-center"
              >
                <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                <span>WHATSAPP PARA CONTATO (+55 51 99539-4808)</span>
              </a>
              <p className="text-[10px] text-zinc-500 font-mono">
                Os cadastros de novos técnicos são realizados diretamente pelo administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 1: CONTA AGUARDANDO CONFIRMAÇÃO DO ADMIN NA ABA MASTER ADMIN
  // Conforme determinação: "antes disso apenas aparecera numero de celular do cliente que está usando o aplicativo"
  // ==========================================
  if (session && !session.isAdmin && !session.isApproved) {
    const clientPhone = session.formattedPhone || formatPhone(session.phone) || session.phone;
    const clientDeviceId = session.deviceId || getDeviceId();

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/30 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(234, 179, 8, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <Card className="w-full max-w-md glass-panel border-amber-500/60 relative z-10 shadow-[0_0_60px_rgba(234,179,8,0.25)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/60 shadow-[0_0_25px_rgba(234,179,8,0.4)] flex items-center justify-center mb-3">
              <Smartphone className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-yellow-300 font-mono text-[11px] uppercase tracking-wider mx-auto mb-2 font-bold">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>Aguardando Confirmação do Administrador</span>
            </div>

            <CardTitle className="text-xl sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-amber-400">
              SOLICITAÇÃO DE 48H GRÁTIS
            </CardTitle>

            <CardDescription className="font-mono text-zinc-300 text-xs sm:text-sm mt-1 leading-relaxed">
              Sua solicitação foi enviada para o aplicativo na aba Master Admin e para o WhatsApp do administrador <strong className="text-yellow-400">Sandro RR</strong> (+55 51 99539-4808).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1 pb-6">
            {/* DESTAQUE PRINCIPAL: APENAS NÚMERO DE CELULAR DO CLIENTE QUE ESTÁ USANDO O APLICATIVO */}
            <div className="bg-gradient-to-b from-black/90 to-zinc-950/90 border-2 border-yellow-500/50 rounded-2xl p-4 sm:p-5 text-center space-y-2.5 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                📱 NÚMERO DE CELULAR QUE ESTÁ USANDO O APLICATIVO:
              </span>
              
              <div className="py-2.5 px-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]">
                  {clientPhone}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/10">
                <span>APARELHO VINCULADO (ID):</span>
                <span className="text-zinc-200 font-bold">{clientDeviceId}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>STATUS ATUAL:</span>
                <span className="text-yellow-400 font-bold animate-pulse">⏳ AGUARDANDO CONFIRMAÇÃO DO ADMIN</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-zinc-400 text-center leading-relaxed">
              O acesso à sua <strong className="text-white">Conta PRO</strong> será liberado neste aparelho assim que o administrador Sandro RR confirmar no aplicativo.
            </p>

            {/* Ações Diretas */}
            <div className="space-y-2 pt-1">
              <a 
                href={generateTrialWaitingWhatsAppLink(session)} 
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-3.5 px-3 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.01] tracking-wider uppercase text-center"
              >
                <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                <span>AVISAR ADMIN NO WHATSAPP (+55 51 99539-4808)</span>
              </a>

              <Button 
                onClick={handleCheckApproval}
                variant="outline"
                className="w-full bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white font-tactical text-xs tracking-wider h-11 uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                VERIFICAR SE O ADMIN JÁ CONFIRMOU
              </Button>
            </div>

            {/* Trocar de conta */}
            <div className="flex justify-center pt-2 border-t border-white/10">
              <button 
                type="button" 
                onClick={handleLogout}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Trocar de Celular / Sair
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO B: SESSÃO EXISTE MAS TESTE DE 2 DIAS EXPIROU (PAYWALL COMERCIAL)
  // ==========================================
  const remaining = getRemainingTrialTime(session.trialExpiresAt);

  if (!session.isPro && remaining.expired) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/30 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(234, 179, 8, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <Card className="w-full max-w-lg glass-panel border-amber-500/60 relative z-10 shadow-[0_0_60px_rgba(234,179,8,0.25)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-4 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/60 shadow-[0_0_25px_rgba(234,179,8,0.5)] flex items-center justify-center mb-4">
              <ShieldAlert className="w-9 h-9 text-amber-400 animate-pulse" />
            </div>
            
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]">
              TESTE DE 2 DIAS CONCLUÍDO
            </CardTitle>
            
            <CardDescription className="font-mono text-zinc-300 text-xs sm:text-sm mt-2 leading-relaxed">
              Olá, <span className="text-white font-bold">{session.name}</span>! O seu período promocional de 48 horas de demonstração gratuita chegou ao fim.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center space-y-1">
              <span className="text-[11px] font-mono text-amber-300 uppercase tracking-widest block font-bold">
                ADQUIRA SUA LICENÇA DEFINITIVA VITALÍCIA
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]">
                R$ {APP_PRICE_REAIS}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                PAGAMENTO ÚNICO VIA PIX • SEM MENSALIDADES
              </span>
            </div>

            {/* Dados do cliente cadastrado e aparelho único */}
            <div className="bg-black/70 border border-white/10 rounded-xl p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span>TÉCNICO / CLIENTE:</span>
                <span className="text-white font-bold uppercase">{session.name}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>CELULAR CADASTRADO:</span>
                <span className="text-cyan-400 font-bold">{session.formattedPhone || session.phone}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>APARELHO AUTORIZADO (ID):</span>
                <span className="text-zinc-300 font-bold">{session.deviceId || getDeviceId()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 pt-1 border-t border-white/5">
                <span>SEGURANÇA:</span>
                <span className="text-emerald-400 font-bold">1 APARELHO POR LICENÇA</span>
              </div>
            </div>

            {/* Liberação via WhatsApp sem necessidade de chave para o cliente */}
            <div className="space-y-3">
              <a 
                href={`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(`Olá Sandro RR! Meu teste de 48h no TermoMaster Pro expirou. Sou o técnico ${session.name} (Cel: ${session.formattedPhone || session.phone}). Gostaria de realizar o PIX de R$ ${APP_PRICE_REAIS} para liberar a licença definitiva vitalícia no meu aparelho!`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-4 px-3 rounded-xl shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all hover:scale-[1.02] tracking-wider uppercase text-center"
              >
                <MessageCircle className="w-6 h-6 fill-white shrink-0" />
                <span>LIBERAR VIA WHATSAPP (+55 51 99539-4808)</span>
              </a>

              <Button
                type="button"
                onClick={() => {
                  refreshSession();
                  toast.info("Verificando se o Admin já liberou sua conta...");
                }}
                className="w-full bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 font-tactical text-xs tracking-wider h-11 uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                VERIFICAR SE O ADMIN JÁ LIBEROU
              </Button>
            </div>

            {/* Trocar de conta */}
            <div className="flex justify-center pt-2">
              <button 
                type="button" 
                onClick={handleLogout}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Trocar de Conta / Novo Cadastro
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO C: ACESSO LIBERADO (DENTRO DOS 2 DIAS OU LICENÇA PRO)
  // ==========================================
  return (
    <AppProvider>
      <DashboardContent 
        session={session} 
        onLogout={handleLogout}
        onRefreshSession={refreshSession}
      />
    </AppProvider>
  );
}
