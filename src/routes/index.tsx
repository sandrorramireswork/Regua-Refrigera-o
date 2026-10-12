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
  loginWithPhone, 
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

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-black px-2 text-zinc-400">Ativar Chave de 9 Dígitos</span>
                </div>
              </div>

              <form onSubmit={handleModalActivate} className="space-y-3">
                <div className="space-y-1 relative">
                  <div className="absolute left-3 top-3 text-amber-500/60"><Key className="w-4 h-4" /></div>
                  <Input
                    placeholder="DIGITE A CHAVE DE 9 DÍGITOS (EX: 849-201-736)"
                    value={upgradeKeyInput}
                    onChange={(e) => setUpgradeKeyInput(e.target.value)}
                    className="bg-black/70 border-amber-500/30 text-amber-300 font-mono pl-10 h-10 text-xs sm:text-sm uppercase"
                  />
                </div>
                {upgradeError && (
                  <p className="text-rose-400 text-xs font-mono text-center">{upgradeError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 font-tactical tracking-widest text-xs h-10 uppercase"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  DESBLOQUEAR LICENÇA
                </Button>
              </form>
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

  // Tabs de Login: 'trial', 'login', 'activate', 'admin'
  const [authTab, setAuthTab] = useState<"trial" | "login" | "activate" | "admin">("trial");

  // Form states - Teste Grátis
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regError, setRegError] = useState("");

  // Form states - Login por celular
  const [loginPhone, setLoginPhone] = useState("");
  const [loginError, setLoginError] = useState("");

  // Form states - Ativação por Chave
  const [activateKey, setActivateKey] = useState("");
  const [activatePhone, setActivatePhone] = useState("");
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState("");

  // Form states - Admin Master
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");

  // Paywall states (quando expirado)
  const [paywallKey, setPaywallKey] = useState("");
  const [paywallError, setPaywallError] = useState("");

  // Fila de Espera states
  const [waitingKey, setWaitingKey] = useState("");
  const [waitingKeyError, setWaitingKeyError] = useState("");

  // Atualização periódica do tempo para contagem regressiva
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshSession = () => {
    const updated = getActiveSession();
    setSession(updated ? { ...updated } : null);
  };

  const handleLogout = () => {
    setActiveSession(null);
    setSession(null);
    toast.info("Sessão finalizada com sucesso.");
  };

  // 1. Registro de Teste Grátis de 2 Dias (Enviado para a Fila de Espera)
  const handleRegisterTrial = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    const res = registerFreeTrial(regName, regPhone);
    if (!res.success) {
      setRegError(res.message || "Erro ao registrar conta.");
      toast.error("Atenção", { description: res.message });
      return;
    }

    if (res.account) {
      setSession(res.account);
      toast.success("Cadastro Registrado com Sucesso!", { 
        description: "Você está na fila de espera. Envie uma mensagem ao Admin para liberação pelo aplicativo." 
      });
      try {
        const link = generateWaitingApprovalWhatsAppLink(res.account);
        window.open(link, "_blank");
      } catch {}
    }
  };

  // 2. Login por Celular
  const handleLoginPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = loginWithPhone(loginPhone);
    if (!res.success) {
      setLoginError(res.message || "Número não localizado.");
      toast.error("Falha no login", { description: res.message });
      return;
    }

    if (res.account) {
      setSession(res.account);
      if (res.isWaitingApproval) {
        toast.info("Solicitação na Fila de Espera", { description: res.message });
      } else {
        toast.success("Acesso Liberado!", { description: res.message });
      }
    }
  };

  // Ativação por Chave na tela de Fila de Espera
  const handleWaitingKeyActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingKey.trim()) return;
    setWaitingKeyError("");
    const res = activateLicense(waitingKey, session?.phone);
    if (res.success) {
      toast.success("Licença Ativada com Sucesso!", { description: res.message });
      if (res.account) {
        setSession({ ...res.account });
      } else {
        refreshSession();
      }
    } else {
      setWaitingKeyError(res.message);
      toast.error("Falha na ativação", { description: res.message });
    }
  };

  // Verificação de aprovação na fila de espera
  const handleCheckApproval = () => {
    const updated = getActiveSession();
    if (updated?.isApproved) {
      setSession({ ...updated });
      toast.success("Acesso Liberado com Sucesso!", { 
        description: `Bem-vindo, ${updated.name}! Seu acesso foi aprovado pelo Admin.` 
      });
    } else {
      toast.info("Ainda na Fila de Espera", { 
        description: "O Admin Sandro RR ainda não liberou seu cadastro. Clique no botão de WhatsApp para avisá-lo." 
      });
    }
  };

  // 3. Ativação Direta de Chave
  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError("");
    setActivateSuccess("");
    if (!activateKey.trim()) {
      setActivateError("Informe o código de liberação.");
      return;
    }
    const res = activateLicense(activateKey, activatePhone);
    if (!res.success) {
      setActivateError(res.message);
      toast.error("Chave Inválida", { description: res.message });
      return;
    }
    setActivateSuccess(res.message);
    toast.success("Sucesso!", { description: res.message });
    if (res.account) {
      setSession(res.account);
    } else {
      refreshSession();
    }
  };

  // 4. Login Admin Master
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === "Sandro RR" && adminPass === "Sa2026") {
      const adminAcc = loginAsAdmin();
      setSession(adminAcc);
      setAdminError("");
      toast.success("Bem-vindo, Sandro RR!", { description: "Sessão de Engenharia Master autenticada." });
      return;
    }
    setAdminError("Credenciais de engenharia inválidas.");
  };

  // 5. Ativação via Paywall
  const handlePaywallActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paywallKey.trim()) return;
    const res = activateLicense(paywallKey, session?.phone);
    if (res.success) {
      toast.success("Licença Vitalícia Desbloqueada!", { description: res.message });
      setPaywallKey("");
      setPaywallError("");
      if (res.account) {
        setSession(res.account);
      } else {
        refreshSession();
      }
    } else {
      setPaywallError(res.message);
      toast.error("Chave inválida", { description: res.message });
    }
  };

  // ==========================================
  // CENÁRIO A: NÃO AUTENTICADO (TELA DE LOGIN/CADASTRO)
  // ==========================================
  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Efeitos de Fundo Futurista */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <Card className="w-full max-w-lg glass-panel border-primary/50 relative z-10 shadow-[0_0_50px_rgba(0,240,255,0.15)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-4 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-primary animate-pulse" />
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

            {/* Navegação entre abas de autenticação */}
            <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-xl border border-white/10 mt-5">
              <button
                type="button"
                onClick={() => setAuthTab("trial")}
                className={`py-2 px-1 text-[10px] sm:text-[11px] font-tactical uppercase tracking-wider rounded-lg transition-all ${
                  authTab === "trial" 
                    ? "bg-primary text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.5)]" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Teste Grátis (2 Dias)
              </button>

              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`py-2 px-1 text-[10px] sm:text-[11px] font-tactical uppercase tracking-wider rounded-lg transition-all ${
                  authTab === "login" 
                    ? "bg-primary text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.5)]" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Já Tenho Conta
              </button>

              <button
                type="button"
                onClick={() => setAuthTab("activate")}
                className={`py-2 px-1 text-[10px] sm:text-[11px] font-tactical uppercase tracking-wider rounded-lg transition-all ${
                  authTab === "activate" 
                    ? "bg-amber-400 text-black font-black shadow-[0_0_15px_rgba(234,179,8,0.5)]" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Ativar Chave PRO
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-6">
            
            {/* MODO 1: SOLICITAÇÃO DE CADASTRO / ENTRAR NA FILA DE ESPERA (PADRÃO) */}
            {authTab === "trial" && (
              <form onSubmit={handleRegisterTrial} className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-bold font-mono uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>Cadastro Técnico • Fila de Espera (48h)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                    Preencha seus dados para entrar na fila de espera. O Admin Sandro RR liberará seu teste gratuito pelo aplicativo.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/60"><User className="w-4 h-4" /></div>
                  <Input 
                    placeholder="SEU NOME COMPLETO OU EMPRESA" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm uppercase" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/60"><Phone className="w-4 h-4" /></div>
                  <Input 
                    type="tel"
                    placeholder="NÚMERO DE CELULAR COM DDD: (XX) 9XXXX-XXXX" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm" 
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                    required
                  />
                </div>

                {regError && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    {regError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-black font-black hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  SOLICITAR ACESSO & ENTRAR NA FILA DE ESPERA
                </Button>

                {/* Vantagens incluídas */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-[10.5px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>48h de Acesso Pleno</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Régua PT & Superaq.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gêmeo Digital & Motor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Relatórios Técnicos PDF</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono border-t border-white/5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Segurança: Válido para 1 único aparelho (ID: {getDeviceId()})</span>
                </div>

                {/* Links limpos alternativos (sem botões de atalho) */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                  <button 
                    type="button" 
                    onClick={() => setAuthTab("login")}
                    className="hover:text-cyan-400 transition-colors text-left"
                  >
                    Já é cadastrado? <span className="text-cyan-400 underline underline-offset-2">Fazer Login</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAuthTab("activate")}
                    className="hover:text-amber-400 transition-colors text-right"
                  >
                    Possui Chave PRO? <span className="text-amber-400 underline underline-offset-2">Ativar Chave</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODO 2: JÁ SOU CADASTRADO (LOGIN POR CELULAR) */}
            {authTab === "login" && (
              <form onSubmit={handleLoginPhone} className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-cyan-400 text-xs font-bold font-mono uppercase tracking-wider mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Acessar Conta Cadastrada</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    Informe seu número de celular com DDD para retornar ao aplicativo ou checar sua liberação.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/60"><Phone className="w-4 h-4" /></div>
                  <Input 
                    type="tel"
                    placeholder="CELULAR CADASTRADO: (XX) 9XXXX-XXXX" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm" 
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                    required
                  />
                </div>

                {loginError && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    {loginError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  ENTRAR NO APLICATIVO
                </Button>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono border-t border-white/5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Acesso protegido vinculado a 1 único aparelho por número</span>
                </div>

                {/* Navegação de retorno */}
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <button 
                    type="button" 
                    onClick={() => setAuthTab("trial")}
                    className="hover:text-primary transition-colors"
                  >
                    ← Voltar para Solicitação
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAuthTab("activate")}
                    className="hover:text-amber-400 transition-colors"
                  >
                    Ativar Chave PRO
                  </button>
                </div>
              </form>
            )}

            {/* MODO 3: ATIVAR CHAVE PRO */}
            {authTab === "activate" && (
              <form onSubmit={handleActivateKey} className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider block">
                    Liberação Vitalícia por R$ {APP_PRICE_REAIS}
                  </span>
                  <p className="text-[11px] text-zinc-300 font-mono">
                    Insira a chave oficial de 9 dígitos recebida de Sandro RR no WhatsApp após confirmação do PIX.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-amber-500/60"><Key className="w-4 h-4" /></div>
                  <Input 
                    placeholder="CHAVE DE 9 DÍGITOS (EX: 849-201-736)" 
                    className="bg-black/60 border-amber-500/40 text-amber-300 font-mono pl-10 h-11 text-xs sm:text-sm uppercase" 
                    value={activateKey}
                    onChange={(e) => setActivateKey(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-zinc-400"><Phone className="w-4 h-4" /></div>
                  <Input 
                    type="tel"
                    placeholder="CELULAR DO TITULAR (OPCIONAL)" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-11 text-xs sm:text-sm" 
                    value={activatePhone}
                    onChange={(e) => setActivatePhone(formatPhone(e.target.value))}
                  />
                </div>

                {activateError && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    {activateError}
                  </div>
                )}

                {activateSuccess && (
                  <div className="text-emerald-400 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    {activateSuccess}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-amber-400 text-black font-black hover:bg-amber-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all h-12 font-tactical tracking-widest uppercase text-xs sm:text-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  DESBLOQUEAR ACESSO VITALÍCIO
                </Button>

                <div className="pt-2 text-center">
                  <a 
                    href={`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(`Olá Sandro! Gostaria de comprar a licença definitiva do aplicativo TermoMaster Pro no valor de R$ ${APP_PRICE_REAIS} via PIX!`)}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Comprar Chave no WhatsApp (R$ {APP_PRICE_REAIS})
                  </a>
                </div>

                <div className="pt-2 text-center border-t border-white/5">
                  <button 
                    type="button" 
                    onClick={() => setAuthTab("trial")}
                    className="text-[11px] font-mono text-zinc-400 hover:text-primary transition-colors"
                  >
                    ← Voltar para Solicitação de Cadastro
                  </button>
                </div>
              </form>
            )}

            {/* MODO 4: ADMIN MASTER (SANDRO RR) */}
            {authTab === "admin" && (
              <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in-50 duration-300">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                  <span className="text-xs font-mono text-red-400 uppercase tracking-widest font-bold">
                    ACESSO DE ENGENHARIA MASTER
                  </span>
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-zinc-400"><User className="w-4 h-4" /></div>
                  <Input 
                    placeholder="USUÁRIO MASTER" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10 text-xs" 
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-zinc-400"><Lock className="w-4 h-4" /></div>
                  <Input 
                    type="password"
                    placeholder="SENHA MASTER" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10 text-xs" 
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                  />
                </div>

                {adminError && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center">
                    {adminError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40 h-10 font-tactical text-xs tracking-widest uppercase"
                >
                  AUTENTICAR MASTER
                </Button>

                {/* Consulta de Clientes, Chaves de 9 Dígitos e Aparelhos (Admin Sandro RR) */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold text-center">
                    CONSULTA DE CHAVES GERADAS (PIX)
                  </span>
                  
                  {getStoredAccounts().filter(a => !a.isAdmin).length === 0 ? (
                    <p className="text-[10px] text-zinc-500 font-mono text-center py-2">
                      Nenhum cliente cadastrado ainda neste navegador.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {getStoredAccounts().filter(a => !a.isAdmin).map((acc) => (
                        <div key={acc.phone} className="bg-black/80 border border-white/10 rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold truncate max-w-[160px]">{acc.name}</span>
                            <span className={acc.isPro ? "text-amber-400 font-bold" : acc.isApproved ? "text-cyan-400" : "text-yellow-400"}>
                              {acc.isPro ? "PRO VITALÍCIO" : acc.isApproved ? "TESTE 2 DIAS" : "NA FILA DE ESPERA"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                            <span>Cel: {acc.formattedPhone || acc.phone}</span>
                            <span className="truncate max-w-[120px]" title={acc.deviceId}>Dev: {acc.deviceId || "Livre"}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-white/5">
                            <span className="text-cyan-300 font-bold tracking-wider">
                              🔑 {acc.generatedAccessKey}
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `Olá ${acc.name}! Confirmamos o recebimento do seu PIX de R$ 39,90 no TermoMaster Pro. Sua chave de liberação oficial para este aparelho é: *${acc.generatedAccessKey}*. Insira no seu aplicativo para liberar o acesso vitalício!`;
                                  navigator.clipboard.writeText(text);
                                  toast.success("Mensagem com chave de 9 dígitos copiada!");
                                }}
                                className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-[9.5px] uppercase"
                                title="Copiar resposta com chave para enviar no WhatsApp"
                              >
                                Copiar Msg
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  resetAccountDevice(acc.phone);
                                  toast.success("Aparelho desvinculado com sucesso!");
                                  setCurrentTime(Date.now());
                                }}
                                className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[9.5px] uppercase"
                                title="Permitir que o cliente troque de aparelho celular"
                              >
                                Reset Dev
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* Rodapé da tela de login */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <a 
                href={`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent("Olá Sandro! Tenho dúvidas sobre o TermoMaster Pro.")}`}
                target="_blank" 
                rel="noreferrer"
                className="hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Suporte Comercial
              </a>

              <button 
                type="button" 
                onClick={() => setAuthTab(authTab === "admin" ? "trial" : "admin")}
                className="hover:text-zinc-300 transition-colors uppercase tracking-widest"
              >
                {authTab === "admin" ? "Voltar ao Início" : "Acesso Engenharia Master"}
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 1: CLIENTE NA FILA DE ESPERA (AGUARDANDO LIBERAÇÃO DO ADMIN SANDRO RR)
  // ==========================================
  if (session && !session.isApproved && !session.isAdmin && !session.isPro) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-3 sm:p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/30 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <Card className="w-full max-w-lg glass-panel border-cyan-500/60 relative z-10 shadow-[0_0_60px_rgba(0,240,255,0.25)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/60 shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center mb-3">
              <Hourglass className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] uppercase tracking-wider mx-auto mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Fila de Espera • Aguardando Aprovação</span>
            </div>

            <CardTitle className="text-xl sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              SOLICITAÇÃO EM ANÁLISE
            </CardTitle>

            <CardDescription className="font-mono text-zinc-300 text-xs sm:text-sm mt-1 leading-relaxed">
              Olá, <span className="text-white font-bold">{session.name}</span>! Seu cadastro foi recebido com sucesso e enviado para a aba <strong className="text-cyan-400">MASTER ADMIN</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1 pb-6">
            {/* Dados do Requerente */}
            <div className="bg-black/70 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span>TÉCNICO / CLIENTE:</span>
                <span className="text-white font-bold uppercase">{session.name}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>CELULAR CADASTRADO:</span>
                <span className="text-cyan-400 font-bold">{session.formattedPhone || session.phone}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>APARELHO VINCULADO (ID):</span>
                <span className="text-zinc-300 font-bold">{session.deviceId || getDeviceId()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 pt-1.5 border-t border-white/5">
                <span>STATUS DA LICENÇA:</span>
                <span className="text-amber-400 font-bold animate-pulse">⏳ AGUARDANDO LIBERAÇÃO NO APP</span>
              </div>
            </div>

            {/* Como funciona o processo */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> Fluxo de Liberação Oficial
              </span>
              <div className="text-[10.5px] text-zinc-300 font-mono space-y-1.5 leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span>O Admin <strong>Sandro RR (+55 51 99539-4808)</strong> recebeu seu pedido na aba Master Admin.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span>Clique no botão abaixo para enviar mensagem no WhatsApp do Admin avisando do seu cadastro.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>Assim que o Admin liberar seu teste ou chave pelo aplicativo dele, seu acesso desbloqueará aqui.</span>
                </div>
              </div>
            </div>

            {/* Botão de WhatsApp para avisar o Admin */}
            <div className="space-y-2">
              <a 
                href={generateWaitingApprovalWhatsAppLink(session)} 
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-3.5 px-3 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-[1.01] tracking-wider uppercase text-center"
              >
                <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                <span>AVISAR ADMIN NO WHATSAPP (+55 51 99539-4808)</span>
              </a>

              {/* Botão de Checagem se já foi liberado */}
              <Button 
                onClick={handleCheckApproval}
                variant="outline"
                className="w-full bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white font-tactical text-xs tracking-wider h-11 uppercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                VERIFICAR SE JÁ FUI LIBERADO
              </Button>
            </div>

            {/* Ativação por Chave enviada pelo Admin */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block text-center">
                Recebeu a Chave de 9 dígitos de Sandro RR? Digite abaixo:
              </span>
              <form onSubmit={handleWaitingKeyActivate} className="flex gap-2">
                <Input 
                  placeholder="DIGITE A CHAVE (EX: 849-201-736)" 
                  value={waitingKey}
                  onChange={(e) => setWaitingKey(e.target.value)}
                  className="bg-black/60 border-amber-500/40 text-amber-300 font-mono text-xs uppercase"
                />
                <Button 
                  type="submit"
                  className="bg-amber-400 text-black hover:bg-amber-300 font-tactical text-xs tracking-wider shrink-0 uppercase font-black"
                >
                  DESBLOQUEAR
                </Button>
              </form>
              {waitingKeyError && (
                <p className="text-rose-400 text-xs font-mono text-center">{waitingKeyError}</p>
              )}
            </div>

            {/* Trocar de conta */}
            <div className="flex justify-center pt-2">
              <button 
                type="button" 
                onClick={handleLogout}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Trocar de Número / Nova Solicitação
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

            {/* Protocolo de Segurança: Chave enviada exclusivamente ao Admin */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Liberação Segura via WhatsApp
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
                  <span>O próprio Admin enviará a chave de acesso de 9 dígitos para você digitar e liberar o sistema permanentemente.</span>
                </div>
              </div>
            </div>

            {/* Botão de WhatsApp Oficial com dados do cliente e chave de 9 dígitos enviada ao Admin */}
            <div className="space-y-2">
              <a 
                href={generateWhatsAppBuyLink(session.name, session.phone, session.generatedAccessKey)} 
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs sm:text-sm py-4 px-3 rounded-xl shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all hover:scale-[1.02] tracking-wider uppercase text-center"
              >
                <MessageCircle className="w-6 h-6 fill-white shrink-0" />
                <span>ENVIAR DADOS & CHAVE AO ADMIN (+55 51 99539-4808)</span>
              </a>
              <p className="text-[10.5px] text-zinc-400 text-center font-mono">
                Após notificação do PIX de R$ {APP_PRICE_REAIS}, o admin Sandro RR enviará a chave de acesso para você desbloquear abaixo.
              </p>
            </div>

            {/* Ativação via Chave Recebida */}
            <div className="pt-2 border-t border-white/10">
              <form onSubmit={handlePaywallActivate} className="space-y-3">
                <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block text-center">
                  Digite a chave de 9 dígitos enviada pelo Admin:
                </span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="DIGITE A CHAVE (EX: 849-201-736)" 
                    value={paywallKey}
                    onChange={(e) => setPaywallKey(e.target.value)}
                    className="bg-black/60 border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm uppercase"
                  />
                  <Button 
                    type="submit"
                    className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/40 font-tactical text-xs tracking-wider shrink-0 uppercase"
                  >
                    ATIVAR
                  </Button>
                </div>
                {paywallError && (
                  <p className="text-rose-400 text-xs font-mono text-center">{paywallError}</p>
                )}
              </form>
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
