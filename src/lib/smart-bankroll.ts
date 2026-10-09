import type { Spin } from "@/lib/roulette";
import type { OpportunityEvent } from "@/lib/opportunity-tracker";
import type { SuperConfluenceSignal } from "@/lib/advanced-tracker";

export const SMART_BANKROLL_KEY = "roleta-smart-bankroll-v1";
export const STANDARD_STAKE_RATE = 0.01;
export const SUPER_STAKE_RATE = 0.025;

export interface SmartBankrollConfig {
  bankroll: number;
  dailyTarget: number;
  stopLoss: number;
  stopWinEnabled: boolean;
  stopLossEnabled: boolean;
  sessionStartIndex?: number | undefined;
  sessionDate?: string | undefined;
  lockdownCleared?: boolean | undefined;
}

export const DEFAULT_SMART_BANKROLL: SmartBankrollConfig = {
  bankroll: 1000,
  dailyTarget: 300,
  stopLoss: 200,
  stopWinEnabled: true,
  stopLossEnabled: true,
};

interface SimulatedAlert {
  id: string;
  index: number;
  targets: number[];
  rate: number;
}

export interface SmartBankrollAnalysis {
  profit: number;
  currentBankroll: number;
  standardSuggestion: number;
  superSuggestion: number;
  lockdown: "win" | "loss" | null;
  processedAlerts: number;
}

export function sanitizeMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100_000_000, Math.max(0, value));
}

export function loadSmartBankroll(): SmartBankrollConfig {
  if (typeof window === "undefined") return DEFAULT_SMART_BANKROLL;
  try {
    const raw = window.localStorage.getItem(SMART_BANKROLL_KEY);
    if (!raw) return DEFAULT_SMART_BANKROLL;
    const parsed = JSON.parse(raw) as Partial<SmartBankrollConfig>;
    const today = new Date().toISOString().slice(0, 10);
    const isNewDay = Boolean(parsed.sessionDate && parsed.sessionDate !== today);
    return {
      bankroll: sanitizeMoney(Number(parsed.bankroll ?? DEFAULT_SMART_BANKROLL.bankroll)),
      dailyTarget: sanitizeMoney(Number(parsed.dailyTarget ?? DEFAULT_SMART_BANKROLL.dailyTarget)),
      stopLoss: sanitizeMoney(Number(parsed.stopLoss ?? DEFAULT_SMART_BANKROLL.stopLoss)),
      stopWinEnabled: parsed.stopWinEnabled ?? DEFAULT_SMART_BANKROLL.stopWinEnabled,
      stopLossEnabled: parsed.stopLossEnabled ?? DEFAULT_SMART_BANKROLL.stopLossEnabled,
      sessionStartIndex: isNewDay ? undefined : parsed.sessionStartIndex,
      sessionDate: today,
      lockdownCleared: isNewDay ? true : parsed.lockdownCleared,
    };
  } catch {
    return DEFAULT_SMART_BANKROLL;
  }
}

export function saveSmartBankroll(config: SmartBankrollConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SMART_BANKROLL_KEY, JSON.stringify(config));
}

function payoutForAlert(chronological: Spin[], alert: SimulatedAlert, totalStake: number): number | null {
  if (chronological.length - alert.index - 1 < 2) return null;
  const perNumber = totalStake / alert.targets.length;
  for (let entry = 1; entry <= 2; entry += 1) {
    const spin = chronological[alert.index + entry];
    if (spin && alert.targets.includes(spin.num)) {
      return -(entry - 1) * totalStake + (perNumber * 36 - totalStake);
    }
  }
  return -2 * totalStake;
}

export function calculateSmartBankroll(
  spins: Spin[],
  opportunities: OpportunityEvent[],
  confluences: SuperConfluenceSignal[],
  config: SmartBankrollConfig,
): SmartBankrollAnalysis {
  const chronological = [...spins].reverse();
  const startIdx = config.sessionStartIndex ?? 0;

  const alerts: SimulatedAlert[] = [
    ...opportunities.map((event) => ({
      id: `${event.key}-${event.triggerSpinId}`,
      index: event.index,
      targets: event.targets,
      rate: STANDARD_STAKE_RATE,
    })),
    ...confluences.map((event) => ({
      id: `${event.key}-${event.triggerSpinId}`,
      index: event.index,
      targets: event.targets,
      rate: SUPER_STAKE_RATE,
    })),
  ]
    .filter((a) => a.index >= startIdx)
    .sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));

  let profit = 0;
  let lockdown: SmartBankrollAnalysis["lockdown"] = null;
  let processedAlerts = 0;
  for (const alert of alerts) {
    if (lockdown || alert.targets.length === 0) break;
    const balanceBefore = config.bankroll + profit;
    const totalStake = Math.max(0, balanceBefore * alert.rate);
    const result = payoutForAlert(chronological, alert, totalStake);
    if (result === null) continue;
    profit += result;
    processedAlerts += 1;
    if (config.stopWinEnabled && config.dailyTarget > 0 && profit >= config.dailyTarget) lockdown = "win";
    if (config.stopLossEnabled && config.stopLoss > 0 && profit <= -config.stopLoss) lockdown = "loss";
  }

  // Se o usuário limpou o bloqueio explicitamente para o dia e nenhum alerta re-bloqueou, lockdown é null
  if (config.lockdownCleared && alerts.length === 0) {
    lockdown = null;
  }

  const currentBankroll = config.bankroll + profit;
  return {
    profit,
    currentBankroll,
    standardSuggestion: Math.max(0, currentBankroll * STANDARD_STAKE_RATE),
    superSuggestion: Math.max(0, currentBankroll * SUPER_STAKE_RATE),
    lockdown,
    processedAlerts,
  };
}