import { calcGrupos, type Spin } from "@/lib/roulette";
import { calcSniper } from "@/lib/quant";

export interface BankrollConfig {
  /** capital inicial da banca */
  capital: number;
  /** valor apostado em cada número da zona */
  unidade: number;
  /** perda máxima aceita antes de parar */
  limitePerda: number;
  /** meta de ganho (0 = sem meta) */
  meta: number;
}

export const BANKROLL_PADRAO: BankrollConfig = {
  capital: 1000,
  unidade: 5,
  limitePerda: 200,
  meta: 300,
};

export interface Lance {
  giro: number;
  num: number;
  alvos: number[];
  aposta: number;
  resultado: number;
  saldo: number;
  win: boolean;
}

export interface Bankroll {
  lances: Lance[];
  saldo: number;
  banca: number;
  apostado: number;
  wins: number;
  entradas: number;
  taxa: number;
  pico: number;
  drawdown: number;
  parado: boolean;
  metaBatida: boolean;
  girosAnalisados: number;
}

/**
 * Percorre os giros reais do mais antigo para o mais novo e simula a banca:
 * cada confirmação Sniper aposta a unidade nos 5 números da zona do cilindro.
 */
export function calcBankroll(spins: Spin[], cfg: BankrollConfig): Bankroll {
  const lances: Lance[] = [];
  let saldo = 0;
  let apostado = 0;
  let wins = 0;
  let pico = 0;
  let drawdown = 0;
  let parado = false;
  let metaBatida = false;

  for (let i = spins.length - 1; i >= 0; i -= 1) {
    const historico = spins.slice(i + 1);
    if (historico.length < 20) continue;
    if (parado || metaBatida) break;

    const g = calcGrupos(historico);
    const sniper = calcSniper(historico, {
      duziaForte: g.favDuzias[0]?.idx ?? 0,
      colunaForte: g.favColunas[0]?.idx ?? 0,
    });
    if (!sniper?.disparo) continue;

    const alvos = sniper.zona;
    const aposta = cfg.unidade * alvos.length;
    const atual = spins[i]!;
    const win = alvos.includes(atual.num);
    const resultado = win ? cfg.unidade * 36 - aposta : -aposta;

    apostado += aposta;
    saldo += resultado;
    if (win) wins += 1;
    pico = Math.max(pico, saldo);
    drawdown = Math.min(drawdown, saldo - pico);

    lances.push({
      giro: spins.length - i,
      num: atual.num,
      alvos,
      aposta,
      resultado,
      saldo,
      win,
    });

    if (cfg.limitePerda > 0 && saldo <= -cfg.limitePerda) parado = true;
    if (cfg.meta > 0 && saldo >= cfg.meta) metaBatida = true;
  }

  const entradas = lances.length;
  return {
    lances: lances.reverse(),
    saldo,
    banca: cfg.capital + saldo,
    apostado,
    wins,
    entradas,
    taxa: entradas > 0 ? (wins / entradas) * 100 : 0,
    pico,
    drawdown,
    parado,
    metaBatida,
    girosAnalisados: spins.length,
  };
}

const KEY = "roleta-pro-bankroll";

export function lerBankrollConfig(): BankrollConfig {
  if (typeof window === "undefined") return BANKROLL_PADRAO;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return BANKROLL_PADRAO;
    return { ...BANKROLL_PADRAO, ...(JSON.parse(raw) as Partial<BankrollConfig>) };
  } catch {
    return BANKROLL_PADRAO;
  }
}

export function salvarBankrollConfig(cfg: BankrollConfig) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* storage indisponível */
  }
}
