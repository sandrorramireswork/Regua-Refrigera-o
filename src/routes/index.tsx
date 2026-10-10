import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Thermometer, Activity, Wind, FileText, Settings, Smartphone, Monitor, MapPin, Loader2 } from "lucide-react";
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
import { Lock, Unlock, User, AlertTriangle, AlertCircle, CheckCircle2, MessageCircle, UserPlus, Key, Wrench, Zap, Cylinder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSaturationTemp } from "@/lib/thermodynamics";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function DashboardContent() {
  const [activeTab, setActiveTab] = useState("pt-engine");
  const { viewMode, setViewMode, selectedRef, pSuc, pLiq, tSuc, tLiq, pressureUnit, tempUnit, tExt, setTExt } = useAppContext();
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [extRh, setExtRh] = useState<number | null>(null);
  const [city, setCity] = useState<string>("SISTEMA ONLINE");

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
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white to-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] text-center sm:text-left">
                THERMOMASTER <span className="text-primary">PRO</span>
              </h1>
              <div className="flex justify-end w-full">
                <span className="text-[9px] sm:text-[10px] font-black italic text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] font-mono tracking-widest uppercase mt-0.5">BY SRR</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            
            {/* GPS & External Temp Widget - FIXED IN APP HEADER */}
            <div className="flex items-center justify-end">
              <Button 
                variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 hover:bg-cyan-500/20 text-cyan-400 rounded-lg shrink-0 p-0 hover:text-cyan-300"
                style={{ filter: "drop-shadow(0 0 10px rgba(0,240,255,0.8))" }}
                onClick={() => fetchWeather(false)} disabled={isFetchingWeather} title="Obter clima local por GPS"
              >
                {isFetchingWeather ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> : <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />}
              </Button>
              <div className="flex items-center" style={{ textShadow: "0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 40px #00f0ff" }}>
                <span className="text-cyan-400 font-mono text-3xl sm:text-4xl font-black shrink-0">
                  {tExt !== 0 ? tExt.toFixed(1) : "--"}
                </span>
                <span className="text-lg sm:text-2xl font-bold text-cyan-400 font-mono shrink-0 ml-1">
                  °{tempUnit}
                </span>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-start justify-center ml-2 mr-2">
              <div className="flex items-center gap-2 font-mono text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-cyan-400 font-bold tracking-widest text-lg">{extRh !== null ? `${extRh}%` : 'SISTEMA ONLINE'}</span>
              </div>
              {city !== "SISTEMA ONLINE" && (
                <span className="text-[10px] uppercase font-tactical text-zinc-500 tracking-widest pl-4 truncate max-w-[120px]">
                  {city}
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-black/50 border-white/10 hover:bg-primary/20 hover:text-primary transition-colors shrink-0"
              onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
              title="Alternar Modo de Visualização (Celular/PC)"
            >
              {viewMode === "desktop" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>
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
      <main 
        className={`flex-1 mx-auto p-4 md:p-6 transition-all duration-500 ${viewMode === 'mobile' ? 'w-full max-w-[430px] border-x border-white/10 bg-black/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'container lg:p-8'}`}
        style={{ 
          transform: viewMode === 'mobile' ? 'scale(0.75)' : 'none',
          transformOrigin: 'top center',
          marginBottom: viewMode === 'mobile' ? '-25%' : '0' // Prevents excess whitespace at the bottom due to scale
        }}
      >
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 font-display neon-text-cyan opacity-90">PAINEL DE DIAGNÓSTICO</h2>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
            Cálculos termodinâmicos avançados e análise de campo
          </p>
        </div>

        <Tabs defaultValue="pt-engine" className="w-full space-y-6" onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap justify-center h-auto p-1 bg-black/40 backdrop-blur-sm border border-border/50 rounded-xl w-full gap-1">
            <TabsTrigger value="pt-engine" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-cyan-500/20 text-cyan-500/70 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400 data-[state=active]:shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-300">
              <Activity className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">DIAGNÓSTICO</span>
            </TabsTrigger>
            
            <TabsTrigger value="mollier" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-green-500/20 text-green-500/70 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/50 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-green-400 data-[state=active]:shadow-[0_0_20px_rgba(74,222,128,0.8)] transition-all duration-300">
              <Gauge className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">GÊMEO DIGITAL</span>
            </TabsTrigger>
            
            <TabsTrigger value="psychrometrics" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-purple-500/20 text-purple-500/70 hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400 data-[state=active]:shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all duration-300">
              <Wind className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">PSICROMETRIA</span>
            </TabsTrigger>
            
            <TabsTrigger value="piping" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-blue-500/20 text-blue-500/70 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-400 data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.8)] transition-all duration-300">
              <Settings className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">TUBULAÇÃO</span>
            </TabsTrigger>
            
            <TabsTrigger value="reports" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-orange-500/20 text-orange-500/70 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 hover:shadow-[0_0_10px_rgba(249,115,22,0.3)] data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-400 data-[state=active]:shadow-[0_0_20px_rgba(249,115,22,0.8)] transition-all duration-300">
              <FileText className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">RELATÓRIOS</span>
            </TabsTrigger>
            
            <TabsTrigger value="compressor" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-yellow-500/20 text-yellow-500/70 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 data-[state=active]:border-yellow-400 data-[state=active]:shadow-[0_0_20px_rgba(234,179,8,0.8)] transition-all duration-300">
              <Zap className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">ELÉTRICA</span>
            </TabsTrigger>
            
            <TabsTrigger value="maintenance" className="shrink-0 flex-1 min-w-[70px] sm:min-w-[90px] flex flex-col gap-0.5 py-2 rounded-lg border border-rose-500/20 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 hover:shadow-[0_0_10px_rgba(244,63,94,0.3)] data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 data-[state=active]:border-rose-400 data-[state=active]:shadow-[0_0_20px_rgba(244,63,94,0.8)] transition-all duration-300">
              <Wrench className="h-4 w-4 md:h-5 md:w-5 drop-shadow-[0_0_5px_currentColor]" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-wider font-tactical uppercase text-center leading-tight drop-shadow-[0_0_5px_currentColor]">FERRAMENTAS</span>
            </TabsTrigger>
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

        </Tabs>
      </main>
    </div>
  );
}

function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [error, setError] = useState(false);

  // Create account states
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Built-in Admin
    if (loginUser === "Sandro RR" && loginPass === "Sa2026") {
      setIsAuthenticated(true);
      setError(false);
      return;
    }

    // Check Local Storage created accounts
    try {
      const saved = localStorage.getItem('thermomaster_accounts');
      if (saved) {
        const accounts = JSON.parse(saved);
        const match = accounts.find((a: any) => a.user === loginUser && a.pass === loginPass);
        if (match) {
          setIsAuthenticated(true);
          setError(false);
          return;
        }
      }
    } catch (err) {}

    setError(true);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInviteCode !== "Sandro-Auth") {
      setCreateError("Código de convite inválido ou expirado.");
      return;
    }
    if (newUser.length < 3 || newPass.length < 4) {
      setCreateError("ID ou Senha muito curtos.");
      return;
    }

    try {
      const saved = localStorage.getItem('thermomaster_accounts');
      const accounts = saved ? JSON.parse(saved) : [];
      
      // Check if user already exists
      if (accounts.find((a: any) => a.user === newUser)) {
        setCreateError("Este ID já está em uso.");
        return;
      }

      accounts.push({ user: newUser, pass: newPass });
      localStorage.setItem('thermomaster_accounts', JSON.stringify(accounts));
      
      setCreateSuccess(true);
      setCreateError("");
      
      // Auto fill login screen
      setLoginUser(newUser);
      setLoginPass(newPass);
      
      // Return to login after 2 seconds
      setTimeout(() => {
        setShowCreateAccount(false);
        setCreateSuccess(false);
        setNewInviteCode("");
        setNewUser("");
        setNewPass("");
      }, 2000);
      
    } catch (err) {
      setCreateError("Erro interno ao criar conta.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden selection:bg-primary selection:text-black">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black z-0"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <Card className="w-full max-w-md glass-panel border-primary/50 relative z-10 shadow-[0_0_50px_rgba(0,240,255,0.15)] animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center mb-6">
              {showCreateAccount ? <UserPlus className="w-8 h-8 text-primary" /> : <Lock className="w-8 h-8 text-primary" />}
            </div>
            <div className="flex flex-col items-center">
              <div className="flex flex-col">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-widest font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white to-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] text-center">
                  THERMOMASTER <span className="text-primary">PRO</span>
                </CardTitle>
                <div className="flex justify-end w-full">
                  <span className="text-[10px] sm:text-xs font-black italic text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.9)] font-mono tracking-widest uppercase mt-1 pr-2 sm:pr-1">BY SRR</span>
                </div>
              </div>
            </div>
            <CardDescription className="font-mono uppercase tracking-widest text-xs mt-2">
              {showCreateAccount ? "REGISTRO DE NOVO OPERADOR" : "SISTEMA RESTRITO A ENGENHARIA"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {!showCreateAccount ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/50"><User className="w-4 h-4" /></div>
                  <Input 
                    placeholder="ID DE ACESSO" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10" 
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/50"><Lock className="w-4 h-4" /></div>
                  <Input 
                    type="password"
                    placeholder="CÓDIGO DE AUTORIZAÇÃO" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10" 
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                  />
                </div>
                
                {error && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    Falha na autenticação. Acesso negado.
                  </div>
                )}
  
                <Button type="submit" className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all h-12 font-tactical tracking-widest uppercase mt-4">
                  <Unlock className="w-4 h-4 mr-2" />
                  DESBLOQUEAR SISTEMA
                </Button>
  
                <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Sem acesso?</span>
                    <a 
                      href="https://wa.me/5551995394808?text=Ol%C3%A1%21%20Gostaria%20de%20solicitar%20uma%20conta%20e%20permiss%C3%A3o%20de%20acesso%20ao%20aplicativo%20ThermoMaster%20Pro." 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs font-tactical uppercase tracking-widest text-green-500/70 hover:text-green-400 hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Pedir Permissão ao Admin
                    </a>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setShowCreateAccount(true)}
                    className="text-[10px] font-mono text-cyan-500 hover:text-cyan-400 underline decoration-cyan-500/30 hover:decoration-cyan-400 underline-offset-4 uppercase tracking-widest"
                  >
                    Já tenho um código de convite
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                
                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-yellow-500/50"><Key className="w-4 h-4" /></div>
                  <Input 
                    placeholder="CÓDIGO DE CONVITE (FORNECIDO PELO ADMIN)" 
                    className="bg-black/60 border-yellow-500/30 text-yellow-400 font-mono pl-10 h-10 placeholder:text-yellow-500/30" 
                    value={newInviteCode}
                    onChange={(e) => setNewInviteCode(e.target.value)}
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/50"><User className="w-4 h-4" /></div>
                  <Input 
                    placeholder="NOVO ID DE ACESSO (EX: JOAO123)" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10" 
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-3 text-primary/50"><Lock className="w-4 h-4" /></div>
                  <Input 
                    type="password"
                    placeholder="NOVA SENHA" 
                    className="bg-black/60 border-white/10 text-white font-mono pl-10 h-10" 
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                </div>
                
                {createError && (
                  <div className="text-rose-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    {createError}
                  </div>
                )}

                {createSuccess && (
                  <div className="text-green-500 text-xs font-mono uppercase tracking-widest text-center animate-pulse">
                    Conta criada com sucesso! Redirecionando...
                  </div>
                )}
  
                <Button 
                  type="submit" 
                  disabled={createSuccess}
                  className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all h-12 font-tactical tracking-widest uppercase mt-4"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  CADASTRAR CONTA
                </Button>
  
                <div className="pt-4 border-t border-white/5 flex flex-col items-center">
                  <button 
                    type="button"
                    onClick={() => setShowCreateAccount(false)}
                    className="text-[10px] font-mono text-muted-foreground hover:text-white uppercase tracking-widest transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
