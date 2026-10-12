// Sistema de Licenciamento, Aparelho Único e Chave Aleatória de 9 Dígitos (TermoMaster Pro)
// Desenvolvido para proteção contra pirataria e conversão comercial direta para venda por R$ 39,90 via WhatsApp

export interface UserAccount {
  name: string;
  phone: string;              // apenas dígitos (ex: 51995394808)
  formattedPhone: string;     // formatado (ex: (51) 99539-4808)
  registeredAt: number;       // timestamp de criação
  trialExpiresAt: number;     // timestamp de expiração (2 dias após o registro)
  isPro: boolean;             // acesso vitalício liberado
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
export function registerFreeTrial(name: string, phoneInput: string): { success: boolean; account?: UserAccount; message?: string } {
  const digits = cleanPhone(phoneInput);
  const currentDeviceId = getDeviceId();

  if (!name.trim() || name.trim().length < 2) {
    return { success: false, message: "Informe seu nome completo ou razão social para o cadastro." };
  }
  if (digits.length < 10 || digits.length > 11) {
    return { success: false, message: "Digite um número de celular válido com DDD (ex: 51 99999-9999)." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);
  const now = Date.now();

  if (existing) {
    // Verificação de Segurança de Aparelho Único
    if (existing.deviceId && existing.deviceId !== currentDeviceId && !existing.isAdmin) {
      return {
        success: false,
        account: existing,
        message: `Acesso Bloqueado: Este número de celular já está vinculado a outro aparelho (${existing.deviceId}). O aplicativo é restrito a 1 único aparelho. Contate Sandro RR (+5551995394808) para transferência.`
      };
    }

    // Se o aparelho não estava registrado (legado), vincula agora
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
    if (now < existing.trialExpiresAt) {
      const remaining = getRemainingTrialTime(existing.trialExpiresAt);
      return { success: true, account: existing, message: `Bem-vindo de volta! Você possui ainda ${remaining.text} do seu teste grátis.` };
    }

    // Teste expirado
    return { 
      success: false, 
      account: existing, 
      message: `Este número já utilizou o período de teste de 2 dias. Adquira sua licença vitalícia por R$ ${APP_PRICE_REAIS}.` 
    };
  }

  // Novo cadastro Free de 2 dias vinculado exclusivamente a este aparelho
  const key9 = generate9DigitKey();
  const newAccount: UserAccount = {
    name: name.trim(),
    phone: digits,
    formattedPhone: formatPhone(digits),
    registeredAt: now,
    trialExpiresAt: now + TRIAL_DURATION_MS,
    isPro: false,
    isAdmin: false,
    deviceId: currentDeviceId,
    generatedAccessKey: key9
  };

  saveAccount(newAccount);
  setActiveSession(newAccount);

  return {
    success: true,
    account: newAccount,
    message: `Conta ativada com sucesso! Você tem 2 dias de acesso gratuito completo vinculado a este aparelho.`
  };
}

/**
 * Login direto pelo número de celular cadastrado com verificação estrita de aparelho único
 */
export function loginWithPhone(phoneInput: string): { success: boolean; account?: UserAccount; message?: string } {
  const digits = cleanPhone(phoneInput);
  const currentDeviceId = getDeviceId();

  if (digits.length < 10) {
    return { success: false, message: "Digite seu número de celular com DDD." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);

  if (!existing) {
    return { success: false, message: "Número de celular não localizado. Faça seu cadastro gratuito de 2 dias." };
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

  return { success: true, account: existing, message: `Login realizado com sucesso! Olá, ${existing.name}.` };
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

  const message = `Olá Sandro! Concluí meu período de teste no aplicativo TermoMaster Pro e gostaria de adquirir a licença vitalícia no valor de R$ ${APP_PRICE_REAIS} via PIX!

📋 *DADOS DO CLIENTE CADASTRADO:*
• Nome: *${clientName}*
• Celular: *${formatted || phone}*
• Aparelho (ID): *${deviceId}*

🔑 *CHAVE ALEATÓRIA GERADA PELO MEU APLICATIVO (9 DÍGITOS):*
👉 *${key9}*

Por favor, confirme o recebimento do meu PIX e me envie a chave de acesso acima para liberação do meu aparelho!`;

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
    isAdmin: true,
    deviceId: currentDeviceId,
    generatedAccessKey: "999-888-777",
    licenseKey: "MASTER-SRR"
  };

  saveAccount(adminAccount);
  setActiveSession(adminAccount);
  return adminAccount;
}
