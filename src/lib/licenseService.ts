// Sistema de Licenciamento e Teste Gratuito de 2 Dias (TermoMaster Pro)
// Desenvolvido para conversão comercial direta para venda por R$ 39,90 via WhatsApp

export interface UserAccount {
  name: string;
  phone: string;            // apenas dígitos (ex: 51995394808)
  formattedPhone: string;   // formatado (ex: (51) 99539-4808)
  registeredAt: number;     // timestamp de criação
  trialExpiresAt: number;   // timestamp de expiração (2 dias após o registro)
  isPro: boolean;           // acesso vitalício liberado
  licenseKey?: string;      // chave de liberação utilizada
  isAdmin?: boolean;        // conta de engenharia/administrador master
}

export const TRIAL_DURATION_DAYS = 2;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000; // 48 horas
export const APP_PRICE_REAIS = "39,90";
export const SELLER_WHATSAPP = "5551995394808"; // Sandro RR - Suporte & Vendas

// Chaves válidas de liberação para compra confirmada
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

/**
 * Remove caracteres não numéricos de um telefone
 */
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, "");
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
 * Registra novo técnico para início de teste gratuito de 2 dias
 */
export function registerFreeTrial(name: string, phoneInput: string): { success: boolean; account?: UserAccount; message?: string } {
  const digits = cleanPhone(phoneInput);
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
    // Conta já existente: se já é PRO, restaura PRO. Se ainda em teste, restaura tempo restante.
    setActiveSession(existing);
    if (existing.isPro) {
      return { success: true, account: existing, message: `Bem-vindo de volta, ${existing.name}! Sua Licença Vitalícia está ativa.` };
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

  // Novo cadastro Free de 2 dias
  const newAccount: UserAccount = {
    name: name.trim(),
    phone: digits,
    formattedPhone: formatPhone(digits),
    registeredAt: now,
    trialExpiresAt: now + TRIAL_DURATION_MS,
    isPro: false,
    isAdmin: false
  };

  saveAccount(newAccount);
  setActiveSession(newAccount);

  return {
    success: true,
    account: newAccount,
    message: `Conta ativada com sucesso! Você tem 2 dias de acesso gratuito completo ao TermoMaster Pro.`
  };
}

/**
 * Login direto pelo número de celular cadastrado
 */
export function loginWithPhone(phoneInput: string): { success: boolean; account?: UserAccount; message?: string } {
  const digits = cleanPhone(phoneInput);
  if (digits.length < 10) {
    return { success: false, message: "Digite seu número de celular com DDD." };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.phone === digits);

  if (!existing) {
    return { success: false, message: "Número de celular não localizado. Faça seu cadastro gratuito de 2 dias." };
  }

  setActiveSession(existing);
  return { success: true, account: existing, message: `Login realizado com sucesso! Olá, ${existing.name}.` };
}

/**
 * Ativa a licença vitalícia permanente com código de compra
 */
export function activateLicense(licenseKey: string, phoneToActivate?: string): { success: boolean; account?: UserAccount; message: string } {
  const cleanKey = licenseKey.trim().toUpperCase();
  const isValid = VALID_LICENSE_KEYS.some(k => k.toUpperCase() === cleanKey);

  if (!isValid) {
    return { success: false, message: "Chave de ativação inválida ou não reconhecida." };
  }

  const session = getActiveSession();
  const rawPhone = phoneToActivate || session?.phone;
  const digits = rawPhone ? cleanPhone(rawPhone) : "";

  if (digits) {
    const accounts = getStoredAccounts();
    const target = accounts.find(a => a.phone === digits);
    if (target) {
      target.isPro = true;
      target.licenseKey = cleanKey;
      saveAccount(target);
      setActiveSession(target);
      return { success: true, account: target, message: `Licença Vitalícia ativada com sucesso para ${target.name}! Acesso definitivo liberado.` };
    }
  }

  // Se não houver conta vinculada, ativa na sessão atual
  if (session) {
    session.isPro = true;
    session.licenseKey = cleanKey;
    saveAccount(session);
    setActiveSession(session);
    return { success: true, account: session, message: "Licença Vitalícia ativada com sucesso! Acesso definitivo liberado." };
  }

  return { success: true, message: "Chave válida! Faça login com seu número para vincular a licença." };
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
 * Gera o link oficial do WhatsApp comercial com mensagem formatada do cliente cadastrado
 */
export function generateWhatsAppBuyLink(name: string, phone: string): string {
  const cleanNum = cleanPhone(phone);
  const formatted = formatPhone(cleanNum);
  const clientName = name.trim() || "Técnico";

  const message = `Olá Sandro! Concluí meu período de teste no aplicativo TermoMaster Pro. Meu nome é *${clientName}* e meu celular de cadastro é *${formatted || phone}*. Gostaria de adquirir a licença definitiva no valor promocional de R$ ${APP_PRICE_REAIS} via PIX!`;

  return `https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Criação da sessão de Administrador Master (Sandro RR)
 */
export function loginAsAdmin(): UserAccount {
  const adminAccount: UserAccount = {
    name: "Sandro RR (Engenharia)",
    phone: "5551995394808",
    formattedPhone: "(51) 99539-4808",
    registeredAt: Date.now(),
    trialExpiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000), // 10 anos
    isPro: true,
    isAdmin: true,
    licenseKey: "MASTER-SRR"
  };

  saveAccount(adminAccount);
  setActiveSession(adminAccount);
  return adminAccount;
}
