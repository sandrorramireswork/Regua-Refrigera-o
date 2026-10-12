import React, { useState } from "react";
import { 
  Zap, 
  UserPlus, 
  Users, 
  Smartphone, 
  Key, 
  CheckCircle2, 
  Clock, 
  Search, 
  Copy, 
  RefreshCw, 
  Trash2, 
  MessageCircle, 
  ShieldCheck, 
  Download, 
  Upload, 
  Check, 
  UserCheck,
  AlertCircle,
  Hourglass,
  CheckCircle,
  Ban
} from "lucide-react";
import { 
  getStoredAccounts, 
  adminRegisterClient, 
  adminDeleteClient, 
  adminToggleClientPro, 
  adminApproveTrial,
  adminApprovePro,
  adminClearAllClients,
  resetAccountDevice, 
  generate9DigitKey, 
  formatPhone, 
  formatClientWhatsAppMessage,
  formatApprovedNotificationWhatsApp,
  adminExportAccounts,
  adminImportAccounts,
  adminToggleAccountActivation,
  adminSaveAndSyncAll,
  UserAccount,
  APP_PRICE_REAIS
} from "@/lib/licenseService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function MasterAdminPanel() {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => 
    getStoredAccounts().filter(a => !a.isAdmin)
  );

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [accessKey, setAccessKey] = useState(() => generate9DigitKey());
  const [isPro, setIsPro] = useState(true);
  const [deviceId, setDeviceId] = useState("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Import / Export modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [importJson, setImportJson] = useState("");

  // Ultimo cliente cadastrado para ação rápida de envio
  const [lastRegistered, setLastRegistered] = useState<UserAccount | null>(null);

  // Atualiza lista local
  const refreshAccounts = () => {
    setAccounts(getStoredAccounts().filter(a => !a.isAdmin));
  };

  // Auto-sync a cada 5 minutos no Master Admin
  React.useEffect(() => {
    const timer = setInterval(() => {
      refreshAccounts();
      setLastSyncTime(Date.now());
    }, 300000); // 5 minutos
    return () => clearInterval(timer);
  }, []);

  // Alternar ativação da conta (Liberar/Desativar no app)
  const handleToggleActivation = (phone: string) => {
    const res = adminToggleAccountActivation(phone);
    if (res.success) {
      if (res.isApproved) {
        toast.success(res.message);
      } else {
        toast.warning(res.message);
      }
      refreshAccounts();
    } else {
      toast.error("Falha", { description: res.message });
    }
  };

  // Salvar e Sincronizar toda a base manualmente
  const handleSaveAndSync = () => {
    const res = adminSaveAndSyncAll();
    toast.success(res.message);
    setLastSyncTime(res.timestamp);
    refreshAccounts();
  };

  // Gerar nova chave no formulário
  const handleRegenerateKey = () => {
    const newKey = generate9DigitKey();
    setAccessKey(newKey);
    toast.info("Nova chave gerada:", { description: newKey });
  };

  // Submeter cadastro pelo Admin
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientPhone.trim()) {
      toast.error("Informe o número de celular do cliente.");
      return;
    }

    const res = adminRegisterClient({
      name: clientName,
      phone: clientPhone,
      accessKey: accessKey,
      isPro: isPro,
      deviceId: deviceId
    });

    if (res.success) {
      toast.success(res.message);
      refreshAccounts();
      if (res.account) {
        setLastRegistered(res.account);
      }
      setClientName("");
      setClientPhone("");
      setDeviceId("");
      setAccessKey(generate9DigitKey());
    } else {
      toast.error("Erro no cadastro", { description: res.message });
    }
  };

  // Aprovar Teste Grátis de 2 Dias
  const handleApproveTrial = (phone: string, name: string) => {
    const res = adminApproveTrial(phone);
    if (res.success) {
      toast.success(`Teste de 2 dias liberado para ${name}!`);
      refreshAccounts();
    } else {
      toast.error("Falha", { description: res.message });
    }
  };

  // Aprovar PRO Vitalício
  const handleApprovePro = (phone: string, name: string) => {
    const res = adminApprovePro(phone);
    if (res.success) {
      toast.success(`Licença PRO Vitalícia liberada para ${name}!`);
      refreshAccounts();
    } else {
      toast.error("Falha", { description: res.message });
    }
  };

  // Zerar todos os clientes
  const handleClearAllClients = () => {
    if (confirm("ATENÇÃO: Deseja realmente zerar todos os clientes cadastrados? O Master Admin será preservado intacto.")) {
      const res = adminClearAllClients();
      toast.success(res.message);
      refreshAccounts();
      setLastRegistered(null);
    }
  };

  // Excluir cliente individual
  const handleDelete = (phone: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) {
      adminDeleteClient(phone);
      toast.success(`Cliente ${name} excluído.`);
      refreshAccounts();
    }
  };

  // Resetar aparelho vinculado
  const handleResetDevice = (phone: string, name: string) => {
    const res = resetAccountDevice(phone);
    if (res.success) {
      toast.success(res.message);
      refreshAccounts();
    } else {
      toast.error("Falha", { description: res.message });
    }
  };

  // Alternar Pro x Teste
  const handleTogglePro = (phone: string) => {
    const res = adminToggleClientPro(phone);
    if (res.success) {
      toast.success(res.message);
      refreshAccounts();
    }
  };

  // Exportar contas
  const handleExport = () => {
    const json = adminExportAccounts();
    navigator.clipboard.writeText(json);
    toast.success("Base de clientes copiada em formato JSON!", {
      description: "Você pode colar e salvar ou importar em outro dispositivo."
    });
  };

  // Importar contas
  const handleImport = () => {
    if (!importJson.trim()) {
      toast.error("Cole o JSON para importar.");
      return;
    }
    const res = adminImportAccounts(importJson);
    if (res.success) {
      toast.success(res.message);
      refreshAccounts();
      setShowSyncModal(false);
      setImportJson("");
    } else {
      toast.error("Erro na importação", { description: res.message });
    }
  };

  // Fila de Espera (Aguardando Liberação do Admin)
  const pendingAccounts = accounts.filter(a => !a.isApproved && !a.isPro);
  
  // Clientes Já Liberados / Ativos
  const activeAccounts = accounts.filter(a => a.isApproved || a.isPro);

  // Filtragem de clientes ativos
  const filteredAccounts = accounts.filter(acc => {
    const term = searchTerm.toLowerCase();
    return (
      acc.name.toLowerCase().includes(term) ||
      acc.phone.includes(term) ||
      acc.generatedAccessKey.toLowerCase().includes(term) ||
      (acc.deviceId && acc.deviceId.toLowerCase().includes(term))
    );
  });

  const totalClients = accounts.length;
  const proClients = accounts.filter(a => a.isPro).length;
  const trialClients = accounts.filter(a => !a.isPro && a.isApproved).length;
  const linkedDevices = accounts.filter(a => !!a.deviceId).length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 max-w-7xl mx-auto pb-10">
      
      {/* Topo / Header com o Badge Oficial MASTER ADMIN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-black to-zinc-950/60 p-4 sm:p-6 rounded-2xl border border-amber-500/40 shadow-[0_0_30px_rgba(234,179,8,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 border border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-yellow-400 uppercase">
              MASTER ADMIN
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-tactical text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-amber-400 tracking-wider">
            CADASTRO E GESTÃO DE CLIENTES
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            Acesso Restrito ao Administrador Sandro RR • Fila de Espera, Liberação de Aparelho e Chaves de 9 Dígitos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10 self-start md:self-center">
          <Button
            size="sm"
            onClick={handleSaveAndSync}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-tactical font-black text-xs gap-1.5 h-9 shadow-[0_0_15px_rgba(34,197,94,0.4)] uppercase tracking-wider"
            title="Salvar e sincronizar todos os clientes com backup seguro"
          >
            <ShieldCheck className="w-4 h-4" /> Salvar & Sincronizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllClients}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 font-mono text-xs gap-1.5 h-9"
            title="Zerar todos os clientes cadastrados"
          >
            <Trash2 className="w-3.5 h-3.5" /> Zerar Base
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-mono text-xs gap-1.5 h-9"
            title="Copiar JSON com todos os clientes"
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSyncModal(true)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-mono text-xs gap-1.5 h-9"
            title="Importar base de clientes"
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </Button>
        </div>
      </div>

      {/* Estatísticas em Tempo Real */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-black/60 border-white/10 shadow-lg">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-zinc-400">Total de Clientes</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">{totalClients}</p>
            </div>
            <Users className="w-6 h-6 text-zinc-400" />
          </CardContent>
        </Card>

        <Card className="bg-yellow-950/30 border-yellow-500/50 shadow-lg shadow-yellow-500/10">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-yellow-400 font-bold">Fila de Espera</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-yellow-300 mt-0.5 animate-pulse">{pendingAccounts.length}</p>
            </div>
            <Hourglass className="w-6 h-6 text-yellow-400 animate-spin duration-1000" />
          </CardContent>
        </Card>

        <Card className="bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-500/5">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-amber-400">PRO Vitalício</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-yellow-300 mt-0.5">{proClients}</p>
            </div>
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </CardContent>
        </Card>

        <Card className="bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-500/5">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-emerald-400">Aparelhos Vinculados</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-0.5">{linkedDevices}</p>
            </div>
            <Smartphone className="w-6 h-6 text-emerald-400" />
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO ESPECIAL: FILA DE ESPERA (CLIENTES AGUARDANDO LIBERAÇÃO) */}
      <Card className="bg-yellow-950/20 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] relative overflow-hidden">
        <CardHeader className="pb-3 border-b border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-yellow-400 animate-pulse" />
              <CardTitle className="text-lg font-tactical uppercase text-yellow-300 tracking-wider">
                Fila de Espera • Clientes Aguardando Liberação ({pendingAccounts.length})
              </CardTitle>
            </div>
            <span className="text-[11px] font-mono text-yellow-400/80 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/30">
              {pendingAccounts.length > 0 ? "Ação Requerida do Admin" : "Fila Limpa - Nenhum Pendente"}
            </span>
          </div>
          <CardDescription className="text-xs font-mono text-zinc-300">
            Estes clientes se cadastraram no aplicativo e estão bloqueados aguardando você liberar o acesso.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {pendingAccounts.length === 0 ? (
            <div className="text-center py-6 space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
              <p className="text-xs font-mono text-zinc-400">Não há solicitações pendentes na fila no momento.</p>
              <p className="text-[11px] font-mono text-zinc-600">Novos técnicos cadastrados aparecerão aqui para você aprovar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingAccounts.map((acc) => (
                <div 
                  key={acc.phone} 
                  className="bg-black/80 border border-yellow-500/40 rounded-xl p-3.5 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-mono font-bold text-sm">{acc.name}</h4>
                      <p className="text-xs font-mono text-cyan-400 mt-0.5">📱 {acc.formattedPhone || acc.phone}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold uppercase animate-pulse">
                      Aguardando
                    </span>
                  </div>

                  <div className="bg-zinc-950 p-2 rounded-lg border border-white/5 space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Chave de Acesso:</span>
                      <span className="text-yellow-300 font-bold font-mono">🔑 {acc.generatedAccessKey}</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                      <span>Aparelho (ID):</span>
                      <span className="truncate max-w-[150px] text-zinc-300">{acc.deviceId || "Será vinculado"}</span>
                    </div>
                  </div>

                  {/* Botões de Aprovação Imediata */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleApproveTrial(acc.phone, acc.name)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-tactical text-[11px] h-8 px-2.5 flex-1 uppercase tracking-wider"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Liberar Teste (2 Dias)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprovePro(acc.phone, acc.name)}
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-tactical font-black text-[11px] h-8 px-2.5 flex-1 uppercase tracking-wider"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1 fill-black" />
                      Liberar PRO Vitalício
                    </Button>
                    <a
                      href={formatApprovedNotificationWhatsApp(acc)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"
                      title="Enviar notificação de liberação no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(acc.phone, acc.name)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8"
                      title="Recusar solicitação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Formulário de Cadastro à Esquerda + Base Completa à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulário de Cadastro Manual pelo Admin */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-black/70 border-amber-500/40 shadow-[0_0_25px_rgba(234,179,8,0.1)] relative">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-lg font-tactical tracking-wider uppercase text-amber-300">
                  Cadastrar Cliente Direto
                </CardTitle>
              </div>
              <CardDescription className="text-xs font-mono text-zinc-400">
                Cadastre o celular e a chave de acesso exclusiva de 9 dígitos para liberação imediata.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleCreateClient} className="space-y-4">
                
                {/* Nome do Cliente */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-bold block">
                    Nome Completo ou Empresa:
                  </label>
                  <Input
                    placeholder="Ex: Carlos Refrigeração"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-black/60 border-white/10 text-white font-mono h-10 text-xs sm:text-sm"
                    required
                  />
                </div>

                {/* Celular com DDD */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-bold block">
                    Número de Celular com DDD:
                  </label>
                  <Input
                    type="tel"
                    placeholder="(51) 9XXXX-XXXX"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    className="bg-black/60 border-white/10 text-white font-mono h-10 text-xs sm:text-sm"
                    required
                  />
                </div>

                {/* Chave de Acesso (9 Dígitos) */}
                <div className="space-y-1.5 bg-amber-950/20 p-3 rounded-xl border border-amber-500/30">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" /> Chave de Acesso (9 Dígitos):
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateKey}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-200 flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Gerar Nova
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                      placeholder="XXX-XXX-XXX"
                      className="bg-black/80 border-amber-500/50 text-amber-300 font-mono font-black text-center text-base sm:text-lg tracking-widest h-11"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(accessKey);
                        toast.success("Chave copiada!");
                      }}
                      className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 h-11 px-3 shrink-0"
                      title="Copiar Chave"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Esta é a chave que o cliente digitará no aplicativo para liberar o acesso.
                  </p>
                </div>

                {/* Tipo de Licença */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-bold block">
                    Status da Licença:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPro(true)}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                        isPro 
                          ? "bg-amber-500/20 border-amber-500 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.3)]" 
                          : "bg-black/40 border-white/10 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" /> PRO Vitalício
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPro(false)}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                        !isPro 
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]" 
                          : "bg-black/40 border-white/10 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Teste (48 Horas)
                    </button>
                  </div>
                </div>

                {/* ID do Aparelho (Opcional) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      ID do Aparelho (Opcional):
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Deixe em branco p/ vincular no 1º login</span>
                  </div>
                  <Input
                    placeholder="DEV-XXXXX-XXXX (Opcional)"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                    className="bg-black/60 border-white/10 text-zinc-300 font-mono h-10 text-xs"
                  />
                </div>

                {/* Botão Salvar */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-tactical font-black text-sm h-12 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] tracking-wider uppercase transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  CADASTRAR E LIBERAR CLIENTE
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Envio rápido do último cliente */}
          {lastRegistered && (
            <Card className="bg-emerald-950/20 border-emerald-500/40 p-4 rounded-xl space-y-3 animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Cliente Cadastrado com Sucesso:
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{lastRegistered.formattedPhone}</span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-xs font-mono">{lastRegistered.name}</p>
                  <p className="text-yellow-400 font-mono font-black text-sm tracking-wider mt-0.5">
                    🔑 {lastRegistered.generatedAccessKey}
                  </p>
                </div>
                <a
                  href={formatClientWhatsAppMessage(lastRegistered)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-2 px-3 rounded-lg shadow-md transition-all uppercase"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
                </a>
              </div>
            </Card>
          )}
        </div>

        {/* Gerenciamento e Lista de Todos os Clientes à Direita */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-black/70 border-white/10 shadow-xl">
            <CardHeader className="pb-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-tactical tracking-wider uppercase text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Base Geral de Clientes ({filteredAccounts.length})
                </CardTitle>
                <CardDescription className="text-xs font-mono text-zinc-400">
                  Consulte status, chaves geradas e aparelhos vinculados.
                </CardDescription>
              </div>

              {/* Barra de Pesquisa */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Buscar nome, celular ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/80 border-white/10 pl-8 h-8 text-xs font-mono text-white placeholder:text-zinc-500"
                />
              </div>
            </CardHeader>

            <CardContent className="pt-4 p-3 sm:p-6">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-mono text-zinc-400">
                    {searchTerm ? "Nenhum cliente encontrado com os termos pesquisados." : "Nenhum cliente cadastrado no momento."}
                  </p>
                  <p className="text-xs font-mono text-zinc-600">
                    Base zerada com sucesso. Quando os clientes se cadastrarem, aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {filteredAccounts.map((acc) => (
                    <div 
                      key={acc.phone} 
                      className={`bg-black/80 border rounded-xl p-3.5 sm:p-4 space-y-3 transition-all ${
                        !acc.isApproved && !acc.isPro
                          ? "border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                          : "border-white/10 hover:border-amber-500/40"
                      }`}
                    >
                      {/* Topo do Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-mono font-bold text-sm sm:text-base">
                            {acc.name}
                          </span>

                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${
                            acc.isPro 
                              ? "bg-amber-500/20 text-yellow-300 border-amber-500/40" 
                              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          }`}>
                            {acc.isPro ? "PRO Vitalício" : "Teste 48h"}
                          </span>

                          {/* Status de Senha e Ativação do Admin */}
                          {!acc.hasPassword && !acc.password ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300">
                              🟡 Aguardando Senha
                            </span>
                          ) : !acc.isApproved ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500 bg-amber-500/25 text-amber-300 font-bold uppercase animate-pulse">
                              🟠 Senha Criada • Aguardando Ativação
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                              🟢 Conta Ativada
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono text-zinc-400">
                          📱 {acc.formattedPhone || acc.phone}
                        </span>
                      </div>

                      {/* Dados Técnicos: Chave de Acesso + Aparelho Vinculado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-950/80 p-2.5 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-mono text-zinc-400">Chave de 9 Dígitos:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-yellow-300 text-sm tracking-wider">
                              🔑 {acc.generatedAccessKey}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(acc.generatedAccessKey);
                                toast.success("Chave copiada!");
                              }}
                              className="text-zinc-400 hover:text-white p-1"
                              title="Copiar Chave"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:border-l sm:border-white/5 sm:pl-2">
                          <span className="text-[10.5px] font-mono text-zinc-400">Aparelho (ID):</span>
                          <span className="font-mono text-xs text-zinc-300 font-bold truncate max-w-[140px]" title={acc.deviceId || "Livre"}>
                            {acc.deviceId ? acc.deviceId : <span className="text-emerald-400 font-normal">Aguardando 1º login</span>}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Ações Rápidas do Admin */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Botão Oficial de Ativação / Desativação da Conta */}
                          {!acc.isApproved ? (
                            <Button
                              size="sm"
                              onClick={() => handleToggleActivation(acc.phone)}
                              className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-[11px] font-tactical h-7 px-2.5 shadow-[0_0_12px_rgba(234,179,8,0.4)] tracking-wider uppercase"
                              title="Ativar conta e liberar acesso deste cliente no aplicativo"
                            >
                              <Zap className="w-3.5 h-3.5 mr-1 fill-black" /> Ativar Conta
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActivation(acc.phone)}
                              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-[11px] font-mono h-7 px-2.5"
                              title="Desativar e bloquear acesso deste cliente"
                            >
                              <Ban className="w-3 h-3 mr-1" /> Desativar
                            </Button>
                          )}

                          {/* Ações para cliente pendente */}
                          {!acc.isApproved && !acc.isPro && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveTrial(acc.phone, acc.name)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10.5px] font-mono h-7 px-2"
                              >
                                <Check className="w-3 h-3 mr-1" /> Liberar Teste
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprovePro(acc.phone, acc.name)}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10.5px] font-mono h-7 px-2"
                              >
                                <Zap className="w-3 h-3 mr-1 fill-black" /> Liberar PRO
                              </Button>
                            </>
                          )}

                          {/* Enviar Mensagem no WhatsApp */}
                          <a
                            href={formatApprovedNotificationWhatsApp(acc)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold py-1 px-2.5 rounded-lg transition-all"
                            title="Enviar mensagem oficial de liberação no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Enviar WhatsApp
                          </a>

                          {/* Copiar Chave */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(acc.generatedAccessKey);
                              toast.success("Chave de 9 dígitos copiada!");
                            }}
                            className="text-zinc-300 hover:text-white text-[11px] font-mono h-7 px-2"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar Chave
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Alternar Licença Pro x Teste */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePro(acc.phone)}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 text-[11px] font-mono h-7 px-2"
                            title="Alternar entre PRO e Teste"
                          >
                            {acc.isPro ? "Mudar p/ Teste" : "Tornar PRO"}
                          </Button>

                          {/* Resetar Aparelho */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetDevice(acc.phone, acc.name)}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-[11px] font-mono h-7 px-2"
                            title="Desvincular aparelho deste cliente"
                          >
                            <Smartphone className="w-3 h-3 mr-1" /> Reset Dev
                          </Button>

                          {/* Excluir da base */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(acc.phone, acc.name)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] font-mono h-7 px-2"
                            title="Excluir este cliente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Sincronização / Importação de JSON */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg glass-panel border-amber-500/50 shadow-[0_0_40px_rgba(234,179,8,0.25)]">
            <CardHeader>
              <CardTitle className="text-lg font-tactical uppercase text-yellow-300 flex items-center gap-2">
                <Upload className="w-5 h-5" /> Importar / Sincronizar Base de Clientes
              </CardTitle>
              <CardDescription className="text-xs font-mono text-zinc-400">
                Cole abaixo o texto JSON exportado de outro aparelho para sincronizar os clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                rows={6}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"name": "Cliente Exemplo", "phone": "51999999999", "generatedAccessKey": "412-890-123", "isPro": true}, ...]'
                className="w-full bg-black/80 border border-white/20 rounded-lg p-3 text-xs font-mono text-amber-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowSyncModal(false)}
                  className="font-mono text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs"
                >
                  Confirmar Importação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
