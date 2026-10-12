// Sistema de Licenciamento, Aparelho Único e Chave Aleatória de 9 Dígitos (TermoMaster Pro)
// Desenvolvido para proteção contra pirataria e conversão comercial direta para venda por R$ 39,90 via WhatsApp

export interface UserAccount {
  name: string;
  phone: string;              // apenas dígitos (ex: 51995394808)
  formattedPhone: string;     // formatado (ex: (51) 99539-4808)
  username?: string;          // login do técnico (opcional)
  password?: string;          // senha de acesso do técnico
  registeredAt: number;       // timestamp de criação
  trialExpiresAt: number;     // timestamp de expiração (2 dias após aprovação)
  isPro: boolean;             // acesso vitalício liberado
  isApproved: boolean;        // liberado pelo admin (false = na fila de espera!)
  approvedAt?: number;        // timestamp da liberação
  deviceId: string;           // identificador único do aparelho vinculado (Single Device Lock)
  generatedAccessKey: string; // chave aleatória de 9 dígitos gerada pelo app (ex: 489-102-753)
  licenseKey?: string;        // chave de liberação utilizada
  isAdmin?: boolean;          // conta de engenharia/administrador master
}

export const TRIAL_DURATION_DAYS = 2;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000; // 48 horas
export const APP_PRICE_REAIS = "39,90";
export const SELLER_WHATSAPP = "5551995394808"; // Sandro RR - Administrador & Engenharia

// Chaves mestras de emergência e liberação
export const VALID_LICENSE_KEYS = [
  "PRO-3990",
  "TERMOPRO-3990",
  "LIBERAR-2026",
  "VIP-SRR",
  "SAN2026",
  "MASTER-PIX",
  "SANDRO-AUTH",
  "PIX-3990",
  "TERMO-PRO-LIFETIME"
];

const STORAGE_KEY_SESSION = "thermomaster_session_user";
const STORAGE_KEY_ACCOUNTS = "thermomaster_phone_accounts";
const STORAGE_KEY_DEVICE = "thermomaster_device_id";
const STORAGE_KEY_RESET_FLAG = "thermomaster_cleared_clients_v3";

/**
 * Remove caracteres não numéricos de um telefone
 */
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza qualquer chave removendo traços, espaços e caracteres especiais
 */
export function cleanKey(key: string): string {
  return key.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Aplica máscara de telefone brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(value: string): string {
  const digits = cleanPhone(value).slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Obtém ou inicializa o identificador único de aparelho (Hardware/Browser Fingerprint)
 * Garante que cada aparelho tenha um ID único e persistente.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "DEV-SERVER";
  try {
    let devId = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (!devId) {
      const randHex = Math.random().toString(36).substring(2, 7).toUpperCase();
      const timePart = Date.now().toString(36).substring(3, 7).toUpperCase();
      devId = `DEV-${randHex}-${timePart}`;
      localStorage.setItem(STORAGE_KEY_DEVICE, devId);
    }
    return devId;
  } catch {
    return "DEV-BROWSER-1";
  }
}

/**
 * Gera chave aleatória de exatamente 9 dígitos numéricos formatada como XXX-XXX-XXX
 */
export function generate9DigitKey(): string {
  const num = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6, 9)}`;
}

/**
 * Recupera todas as contas registradas localmente
 */
export function getStoredAccounts(): UserAccount[] {
  if (typeof window === "undefined") return [];
  try {
    // Limpeza automática de clientes de teste anteriores conforme solicitação do usuário
    if (!localStorage.getItem(STORAGE_KEY_RESET_FLAG)) {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (raw) {
        const parsed: UserAccount[] = JSON.parse(raw);
        const adminOnly = parsed.filter(a => a.isAdmin);
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(adminOnly));
        const active = getActiveSession();
        if (active && !active.isAdmin) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
        }
      }
      localStorage.setItem(STORAGE_KEY_RESET_FLAG, "true");
    }

    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Salva ou atualiza uma conta no repositório local
 */
export function saveAccount(account: UserAccount): void {
  if (typeof window === "undefined") return;
  try {
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(a => a.phone === account.phone);
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error("Erro ao salvar conta:", err);
  }
}

/**
 * Recupera a sessão ativa no navegador
 */
export function getActiveSession(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const session: UserAccount = JSON.parse(raw);
    
    // Atualiza os dados com base na base de contas se disponível
    const accounts = getStoredAccounts();
    const current = accounts.find(a => a.phone === session.phone);
    return current || session;
  } catch {
    return null;
  }
}

/**
 * Define ou remove a sessão ativa
 */
export function setActiveSession(account: UserAccount | null): void {
  if (typeof window === "undefined") return;
  try {
    if (account) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (err) {
    console.error("Erro ao gerenciar sessão:", err);
  }
}

/**
 * Registra novo técnico para início de teste gratuito de 2 dias com bloqueio de aparelho único
 */
export function registerFreeTrial(name: string, phoneInput: string): { success: boolean; account?: UserAccount; message?: string; isWaitingApproval?: boolean } {
  const digits = cleanPhone(phoneInput);
  const currentDeviceId = getDeviceId();
  const now = Date.now();

  if (!name.trim() || name.trim().length < 2) {
    return { success: false, message: "Informe seu nome completo ou razão social para o cadastro." };
  }
  if (digits.length < 10 || digits.length > 11) {
    return { success: false, message: "Digite um número de celular válido com DDD (ex: 51 99999-9999)." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);

  if (existing) {
    // Verificação de Segurança de Aparelho Único
    if (existing.deviceId && existing.deviceId !== currentDeviceId && !existing.isAdmin) {
      return {
        success: false,
        account: existing,
        message: `Acesso Bloqueado: Este número de celular já está vinculado a outro aparelho (${existing.deviceId}). O aplicativo é restrito a 1 único aparelho. Contate Sandro RR (+5551995394808) para transferência.`
      };
    }

    if (!existing.deviceId) {
      existing.deviceId = currentDeviceId;
    }
    if (!existing.generatedAccessKey) {
      existing.generatedAccessKey = generate9DigitKey();
    }
    saveAccount(existing);
    setActiveSession(existing);

    if (existing.isPro) {
      return { success: true, account: existing, message: `Bem-vindo de volta, ${existing.name}! Sua Licença Vitalícia está ativa neste aparelho.` };
    }
    if (existing.isApproved && now < existing.trialExpiresAt) {
      const remaining = getRemainingTrialTime(existing.trialExpiresAt);
      return { success: true, account: existing, message: `Bem-vindo de volta! Você possui ainda ${remaining.text} do seu teste grátis.` };
    }
    if (!existing.isApproved && !existing.isAdmin) {
      return { 
        success: true, 
        isWaitingApproval: true, 
        account: existing, 
        message: `Sua solicitação está na fila de espera. Aguardando liberação do administrador Sandro RR.` 
      };
    }

    // Teste expirado
    return { 
      success: false, 
      account: existing, 
      message: `Este número já utilizou o período de teste de 2 dias. Adquira sua licença vitalícia por R$ ${APP_PRICE_REAIS}.` 
    };
  }

  // Novo cadastro: entra como PENDENTE na Fila de Espera do Admin!
  const key9 = generate9DigitKey();
  const newAccount: UserAccount = {
    name: name.trim(),
    phone: digits,
    formattedPhone: formatPhone(digits),
    registeredAt: now,
    trialExpiresAt: 0, // só começa a contar a partir do momento em que o admin aprovar!
    isPro: false,
    isApproved: false, // NA FILA DE ESPERA!
    isAdmin: false,
    deviceId: currentDeviceId,
    generatedAccessKey: key9
  };

  saveAccount(newAccount);
  setActiveSession(newAccount);

  return {
    success: true,
    isWaitingApproval: true,
    account: newAccount,
    message: `Cadastro recebido! Você está na fila de espera aguardando liberação pelo administrador Sandro RR.`
  };
}

/**
 * Login direto pelo número de celular cadastrado com verificação estrita de aparelho único
 */
export function loginWithPhone(phoneInput: string): { success: boolean; account?: UserAccount; message?: string; isWaitingApproval?: boolean } {
  const digits = cleanPhone(phoneInput);
  const currentDeviceId = getDeviceId();

  if (digits.length < 10) {
    return { success: false, message: "Digite seu número de celular com DDD." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);

  if (!existing) {
    return { success: false, message: "Número de celular não localizado. Faça sua solicitação de cadastro." };
  }

  // Validação de Segurança: Aparelho Único
  if (existing.deviceId && existing.deviceId !== currentDeviceId && !existing.isAdmin) {
    return {
      success: false,
      message: `Aparelho não autorizado! Este número está vinculado a outro dispositivo (${existing.deviceId}). Por segurança contra pirataria, o aplicativo só permite 1 aparelho por usuário. Contate Sandro RR (+5551995394808) para transferir.`
    };
  }

  // Vincula se não tinha deviceId previamente
  if (!existing.deviceId) {
    existing.deviceId = currentDeviceId;
  }
  if (!existing.generatedAccessKey) {
    existing.generatedAccessKey = generate9DigitKey();
  }
  saveAccount(existing);
  setActiveSession(existing);

  if (!existing.isApproved && !existing.isAdmin && !existing.isPro) {
    return { 
      success: true, 
      isWaitingApproval: true, 
      account: existing, 
      message: `Sua solicitação está na fila de espera aguardando liberação do administrador Sandro RR.` 
    };
  }

  return { success: true, account: existing, message: `Login realizado com sucesso! Olá, ${existing.name}.` };
}

/**
 * Login Unificado: Tanto o Master Admin quanto os clientes entram na mesma caixa de entrada!
 * - Admin: Login 'Sandro RR' (ou 'admin' / '5551995394808') + Senha 'Sa2026'
 * - Cliente: Login (Nome, Usuário ou Celular cadastrado na aba Admin) + Senha
 */
export function loginUnified(
  loginInput: string, 
  passwordInput: string
): { success: boolean; account?: UserAccount; message: string; isWaitingApproval?: boolean } {
  const trimmedLogin = loginInput.trim();
  const trimmedPass = passwordInput.trim();
  const digitsLogin = cleanPhone(trimmedLogin);
  const currentDeviceId = getDeviceId();

  if (!trimmedLogin) {
    return { success: false, message: "Informe seu login ou celular cadastrado." };
  }
  if (!trimmedPass) {
    return { success: false, message: "Informe sua senha de acesso." };
  }

  // 1. VERIFICAÇÃO DE ENTRADA DO MASTER ADMIN (SANDRO RR)
  const isAdminLogin = 
    trimmedLogin.toLowerCase() === "sandro rr" ||
    trimmedLogin.toLowerCase() === "sandro" ||
    trimmedLogin.toLowerCase() === "admin" ||
    digitsLogin === "5551995394808" ||
    digitsLogin === "51995394808";

  if (isAdminLogin && trimmedPass === "Sa2026") {
    const adminAcc = loginAsAdmin();
    return {
      success: true,
      account: adminAcc,
      message: "Bem-vindo, Sandro RR! Sessão Master autenticada."
    };
  }

  // 2. VERIFICAÇÃO DE CLIENTE CADASTRADO PELO ADMIN
  const accounts = getStoredAccounts();
  const existing = accounts.find(a => {
    if (a.isAdmin) return false;
    const phoneMatch = digitsLogin.length >= 8 && cleanPhone(a.phone).includes(digitsLogin);
    const nameMatch = a.name.trim().toLowerCase() === trimmedLogin.toLowerCase();
    const usernameMatch = a.username && a.username.trim().toLowerCase() === trimmedLogin.toLowerCase();
    return phoneMatch || nameMatch || usernameMatch;
  });

  if (!existing) {
    return {
      success: false,
      message: "Conta não localizada. Fale com Sandro RR pelo WhatsApp abaixo para cadastrar seu acesso grátis por 48h."
    };
  }

  // Validação de Senha do Cliente:
  let passValid = false;
  if (existing.password) {
    passValid = existing.password === trimmedPass;
  } else {
    // Aceita qualquer senha >= 3 caracteres ou telefone/chave se for primeiro acesso
    const phoneDigits = cleanPhone(existing.phone);
    if (
      trimmedPass === phoneDigits || 
      trimmedPass === phoneDigits.slice(-4) || 
      trimmedPass === phoneDigits.slice(-6) ||
      cleanKey(existing.generatedAccessKey) === cleanKey(trimmedPass) ||
      trimmedPass.length >= 3
    ) {
      passValid = true;
      existing.password = trimmedPass; // vincula a senha informada para próximos acessos
      saveAccount(existing);
    }
  }

  if (!passValid) {
    return { 
      success: false, 
      message: "Senha incorreta. Verifique os dados ou fale com o Admin no WhatsApp abaixo." 
    };
  }

  // Validação de Segurança: 1 Único Aparelho por Cliente
  if (existing.deviceId && existing.deviceId !== currentDeviceId && !existing.isAdmin) {
    return {
      success: false,
      message: `Aparelho não autorizado (${existing.deviceId}). O acesso é protegido e restrito a 1 único celular. Contate o Admin no WhatsApp para transferir.`
    };
  }

  if (!existing.deviceId) {
    existing.deviceId = currentDeviceId;
  }
  saveAccount(existing);
  setActiveSession(existing);

  // Se estiver na fila de espera aguardando liberação
  if (!existing.isApproved && !existing.isPro) {
    return {
      success: true,
      isWaitingApproval: true,
      account: existing,
      message: `Sua conta foi localizada, mas está aguardando liberação na aba Master Admin. Fale com Sandro RR no WhatsApp abaixo.`
    };
  }

  return {
    success: true,
    account: existing,
    message: `Acesso liberado! Bem-vindo, ${existing.name}.`
  };
}

/**
 * Ativa a licença vitalícia permanente com a chave de 9 dígitos enviada pelo Admin ou chave mestra
 */
export function activateLicense(licenseKey: string, phoneToActivate?: string): { success: boolean; account?: UserAccount; message: string } {
  const cleanInput = cleanKey(licenseKey);
  const currentDeviceId = getDeviceId();

  if (!cleanInput) {
    return { success: false, message: "Digite a chave de liberação recebida no WhatsApp." };
  }

  const session = getActiveSession();
  const rawPhone = phoneToActivate || session?.phone;
  const digits = rawPhone ? cleanPhone(rawPhone) : "";

  const accounts = getStoredAccounts();
  let target = digits ? accounts.find(a => a.phone === digits) : session;

  // Se não localizou por telefone direto, tenta achar a conta dona da chave de 9 dígitos gerada
  if (!target && accounts.length > 0) {
    target = accounts.find(a => cleanKey(a.generatedAccessKey) === cleanInput);
  }

  if (target) {
    const isMasterKey = VALID_LICENSE_KEYS.some(k => cleanKey(k) === cleanInput);
    const isClient9DigitKey = cleanKey(target.generatedAccessKey) === cleanInput;

    if (isMasterKey || isClient9DigitKey) {
      target.isPro = true;
      target.isApproved = true; // aprova a conta caso estivesse na fila de espera
      target.licenseKey = licenseKey.trim();
      target.deviceId = target.deviceId || currentDeviceId;
      saveAccount(target);
      setActiveSession(target);
      return { 
        success: true, 
        account: target, 
        message: `Licença Vitalícia ativada com sucesso para ${target.name}! Acesso definitivo liberado neste aparelho.` 
      };
    }
  }

  // Verifica se a chave fornecida é uma chave mestra geral
  const isMasterKey = VALID_LICENSE_KEYS.some(k => cleanKey(k) === cleanInput);
  if (isMasterKey && session) {
    session.isPro = true;
    session.licenseKey = licenseKey.trim();
    saveAccount(session);
    setActiveSession(session);
    return { success: true, account: session, message: "Licença Vitalícia ativada com sucesso! Acesso definitivo liberado." };
  }

  return { 
    success: false, 
    message: "Chave de 9 dígitos incorreta ou não correspondente a este cliente. Verifique a mensagem enviada pelo admin Sandro RR." 
  };
}

/**
 * Calcula tempo restante do teste de 2 dias
 */
export function getRemainingTrialTime(trialExpiresAt: number): { expired: boolean; days: number; hours: number; minutes: number; text: string } {
  const now = Date.now();
  const diff = trialExpiresAt - now;

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, text: "Expirado" };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  let text = "";
  if (days > 0) {
    text = `${days}d ${remainingHours}h restantes`;
  } else if (remainingHours > 0) {
    text = `${remainingHours}h ${remainingMinutes}m restantes`;
  } else {
    text = `${remainingMinutes} minutos restantes`;
  }

  return {
    expired: false,
    days,
    hours: remainingHours,
    minutes: remainingMinutes,
    text
  };
}

/**
 * Gera o link oficial do WhatsApp comercial (+5551995394808) com:
 * - Nome do cliente
 * - Celular do cliente
 * - ID do Aparelho único
 * - Chave aleatória de 9 dígitos gerada pelo app
 */
export function generateWhatsAppBuyLink(name: string, phone: string, customKey?: string): string {
  const cleanNum = cleanPhone(phone);
  const formatted = formatPhone(cleanNum);
  const clientName = name.trim() || "Técnico";
  const deviceId = getDeviceId();

  const accounts = getStoredAccounts();
  const target = accounts.find(a => a.phone === cleanNum);
  const key9 = customKey || target?.generatedAccessKey || generate9DigitKey();

  // Se a conta existe mas ainda não tinha a chave salva, grava para garantir conferência
  if (target && !target.generatedAccessKey) {
    target.generatedAccessKey = key9;
    saveAccount(target);
  }

  const message = `Olá Sandro! Gostaria de adquirir o acesso vitalício do aplicativo TermoMaster Pro no valor de R$ ${APP_PRICE_REAIS} via PIX!

📋 *DADOS DO CLIENTE CADASTRADO:*
• Nome: *${clientName}*
• Celular: *${formatted || phone}*
• Aparelho (ID): *${deviceId}*

🔒 *CHAVE DE ACESSO GERADA (ENVIADA EXCLUSIVAMENTE AO ADMIN):*
👉 *${key9}*

Sandro, estou enviando o comprovante do PIX. Assim que confirmar, por favor me envie esta chave de 9 dígitos de volta para eu liberar meu aplicativo neste aparelho!`;

  return `https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Redefine o aparelho vinculado a uma conta (função administrativa para transferências)
 */
export function resetAccountDevice(phone: string): { success: boolean; message: string } {
  const digits = cleanPhone(phone);
  const accounts = getStoredAccounts();
  const target = accounts.find(a => a.phone === digits);

  if (!target) {
    return { success: false, message: "Conta não localizada." };
  }

  target.deviceId = ""; // libera aparelho
  saveAccount(target);
  return { success: true, message: `Aparelho desvinculado com sucesso para ${target.name}. O cliente já pode logar em um novo aparelho.` };
}

/**
 * Criação da sessão de Administrador Master (Sandro RR)
 */
export function loginAsAdmin(): UserAccount {
  const currentDeviceId = getDeviceId();
  const adminAccount: UserAccount = {
    name: "Sandro RR (Engenharia)",
    phone: "5551995394808",
    formattedPhone: "(51) 99539-4808",
    registeredAt: Date.now(),
    trialExpiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000), // 10 anos
    isPro: true,
    isApproved: true,
    isAdmin: true,
    deviceId: currentDeviceId,
    generatedAccessKey: "999-888-777",
    licenseKey: "MASTER-SRR"
  };

  saveAccount(adminAccount);
  setActiveSession(adminAccount);
  return adminAccount;
}

/**
 * Cadastra ou atualiza um cliente diretamente pelo Master Admin
 */
export function adminRegisterClient(params: {
  name: string;
  phone: string;
  accessKey?: string;
  isPro?: boolean;
  deviceId?: string;
  password?: string;
  username?: string;
}): { success: boolean; message: string; account?: UserAccount } {
  const digits = cleanPhone(params.phone);
  if (digits.length < 10) {
    return { success: false, message: "Informe um número de celular válido com DDD (mínimo 10 dígitos)." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);

  const formatted = formatPhone(digits);
  const clientName = params.name.trim() || `Técnico ${digits.slice(-4)}`;
  const key = params.accessKey?.trim() ? params.accessKey.trim() : generate9DigitKey();
  const isPro = params.isPro !== undefined ? params.isPro : true;
  const pass = params.password?.trim() || "";
  const user = params.username?.trim() || "";

  if (existing) {
    existing.name = clientName;
    existing.formattedPhone = formatted;
    existing.generatedAccessKey = key;
    existing.isPro = isPro;
    if (params.deviceId !== undefined) {
      existing.deviceId = params.deviceId.trim();
    }
    if (pass) existing.password = pass;
    if (user) existing.username = user;
    saveAccount(existing);
    return { 
      success: true, 
      message: `Cliente ${clientName} atualizado com sucesso! Chave: ${key}`, 
      account: existing 
    };
  } else {
    const newAccount: UserAccount = {
      name: clientName,
      phone: digits,
      formattedPhone: formatted,
      username: user || undefined,
      password: pass || undefined,
      registeredAt: Date.now(),
      trialExpiresAt: Date.now() + TRIAL_DURATION_MS,
      isPro: isPro,
      isApproved: true,
      deviceId: params.deviceId ? params.deviceId.trim() : "",
      generatedAccessKey: key,
      licenseKey: isPro ? key : undefined,
      isAdmin: false
    };
    saveAccount(newAccount);
    return { 
      success: true, 
      message: `Cliente ${clientName} cadastrado com sucesso! Chave: ${key}`, 
      account: newAccount 
    };
  }
}

/**
 * Remove um cliente cadastrado
 */
export function adminDeleteClient(phone: string): { success: boolean; message: string } {
  const digits = cleanPhone(phone);
  const accounts = getStoredAccounts().filter(a => a.phone !== digits);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  }
  return { success: true, message: "Cliente excluído da base com sucesso." };
}

/**
 * Alterna status de licença do cliente (PRO Vitalício x Teste)
 */
export function adminToggleClientPro(phone: string): { success: boolean; isPro: boolean; message: string } {
  const digits = cleanPhone(phone);
  const accounts = getStoredAccounts();
  const target = accounts.find(a => a.phone === digits);
  if (!target) {
    return { success: false, isPro: false, message: "Cliente não localizado." };
  }
  target.isPro = !target.isPro;
  saveAccount(target);
  return { 
    success: true, 
    isPro: target.isPro, 
    message: `Status de ${target.name} alterado para ${target.isPro ? "PRO Vitalício" : "Teste"}.` 
  };
}

/**
 * Gera mensagem formatada pronta para enviar no WhatsApp do cliente com a chave de 9 dígitos
 */
export function formatClientWhatsAppMessage(client: UserAccount): string {
  const greeting = `Olá ${client.name}!`;
  const message = `${greeting} Confirmamos o recebimento do seu PIX de R$ ${APP_PRICE_REAIS} no aplicativo TermoMaster Pro!

🔑 *SUA CHAVE DE ACESSO OFICIAL (9 DÍGITOS):*
👉 *${client.generatedAccessKey}*

📱 *COMO ATIVAR SEU APLICATIVO:*
1. Abra o TermoMaster Pro no seu celular.
2. Na aba "Ativar Chave PRO" (ou no aviso de ativação), digite ou cole a sua chave: *${client.generatedAccessKey}*
3. Clique em "Desbloquear Acesso Vitalício" para liberar o uso permanente!

Seu acesso é protegido e válido para este aparelho. Qualquer dúvida estou à disposição!
_Eng. Sandro RR • TermoMaster Pro_`;

  return `https://wa.me/55${client.phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Exporta todas as contas em formato JSON
 */
export function adminExportAccounts(): string {
  const accounts = getStoredAccounts().filter(a => !a.isAdmin);
  return JSON.stringify(accounts, null, 2);
}

/**
 * Importa e mescla contas de um JSON
 */
export function adminImportAccounts(jsonStr: string): { success: boolean; count: number; message: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, message: "Formato inválido. Esperado um array de contas." };
    }
    const current = getStoredAccounts();
    const map = new Map<string, UserAccount>();
    current.forEach(acc => map.set(acc.phone, acc));

    let importedCount = 0;
    parsed.forEach((item: Partial<UserAccount>) => {
      if (item.phone) {
        const digits = cleanPhone(item.phone);
        if (digits.length >= 10) {
          const merged: UserAccount = {
            name: item.name || `Técnico ${digits.slice(-4)}`,
            phone: digits,
            formattedPhone: item.formattedPhone || formatPhone(digits),
            registeredAt: item.registeredAt || Date.now(),
            trialExpiresAt: item.trialExpiresAt || Date.now() + TRIAL_DURATION_MS,
            isPro: item.isPro !== undefined ? item.isPro : true,
            deviceId: item.deviceId || "",
            generatedAccessKey: item.generatedAccessKey || generate9DigitKey(),
            isAdmin: false
          };
          map.set(digits, merged);
          importedCount++;
        }
      }
    });

    const finalAccounts = Array.from(map.values());
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(finalAccounts));
    }
    return { 
      success: true, 
      count: importedCount, 
      message: `${importedCount} contas processadas e sincronizadas com sucesso!` 
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, count: 0, message: `Erro ao importar: ${errorMsg}` };
  }
}

/**
 * Aprova o teste grátis de 2 dias para um cliente que está na fila de espera
 */
export function adminApproveTrial(phone: string): { success: boolean; message: string; account?: UserAccount } {
  const digits = cleanPhone(phone);
  const accounts = getStoredAccounts();
  const target = accounts.find(a => a.phone === digits);
  if (!target) return { success: false, message: "Cliente não localizado na fila de espera." };

  target.isApproved = true;
  target.approvedAt = Date.now();
  target.trialExpiresAt = Date.now() + TRIAL_DURATION_MS; // 48h começam a contar AGORA a partir da aprovação do admin!
  saveAccount(target);
  return { 
    success: true, 
    message: `Teste de 48h liberado com sucesso para ${target.name}!`, 
    account: target 
  };
}

/**
 * Aprova a licença PRO Vitalícia permanente para um cliente na fila de espera
 */
export function adminApprovePro(phone: string): { success: boolean; message: string; account?: UserAccount } {
  const digits = cleanPhone(phone);
  const accounts = getStoredAccounts();
  const target = accounts.find(a => a.phone === digits);
  if (!target) return { success: false, message: "Cliente não localizado na fila de espera." };

  target.isApproved = true;
  target.isPro = true;
  target.approvedAt = Date.now();
  target.licenseKey = target.generatedAccessKey;
  saveAccount(target);
  return { 
    success: true, 
    message: `Licença PRO Vitalícia liberada com sucesso para ${target.name}!`, 
    account: target 
  };
}

/**
 * Zera todos os clientes cadastrados até agora mantendo apenas o Master Admin (Sandro RR)
 */
export function adminClearAllClients(): { success: boolean; count: number; message: string } {
  const accounts = getStoredAccounts();
  const adminOnly = accounts.filter(a => a.isAdmin);
  const removedCount = accounts.length - adminOnly.length;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(adminOnly));
    const session = getActiveSession();
    if (session && !session.isAdmin) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }
  return { 
    success: true, 
    count: removedCount, 
    message: `${removedCount} clientes de teste foram zerados com sucesso. O Master Admin foi preservado intacto.` 
  };
}

/**
 * Link de WhatsApp para o cliente notificar o Admin Sandro RR sobre seu cadastro na fila de espera
 */
export function generateWaitingApprovalWhatsAppLink(account: UserAccount): string {
  const message = `Olá Sandro RR! Acabei de me cadastrar no aplicativo TermoMaster Pro e aguardo liberação na fila de espera.

📋 *DADOS DO MEU CADASTRO:*
• Nome: *${account.name}*
• Celular: *${account.formattedPhone || account.phone}*
• Aparelho (ID): *${account.deviceId}*
🔑 *Chave Gerada para este aparelho:* 👉 *${account.generatedAccessKey}*

Por favor, aprove meu acesso pelo seu aplicativo!`;

  return `https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Notificação enviada pelo Admin para o WhatsApp do cliente quando seu acesso for liberado
 */
export function formatApprovedNotificationWhatsApp(client: UserAccount): string {
  const typeText = client.isPro 
    ? "Sua Licença PRO Vitalícia permanente foi aprovada com sucesso!" 
    : "Seu Teste Gratuito de 2 Dias foi liberado com sucesso pelo administrador!";
  
  const message = `Olá ${client.name}! ${typeText}

🔑 *SUA CHAVE DE ACESSO OFICIAL (9 DÍGITOS):*
👉 *${client.generatedAccessKey}*

📱 *COMO ACESSAR:*
1. Abra o aplicativo TermoMaster Pro no seu celular.
2. Seu acesso já está liberado para este aparelho! Caso solicitado, insira a chave: *${client.generatedAccessKey}*.

Bons trabalhos!
_Eng. Sandro RR • TermoMaster Pro_`;

  return `https://wa.me/55${client.phone}?text=${encodeURIComponent(message)}`;
}
