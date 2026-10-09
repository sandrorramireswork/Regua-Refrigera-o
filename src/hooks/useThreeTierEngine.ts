import { useMemo } from "react";
import {
  getCicloAtual,
  getJanelaCurta,
  calcularLeiDoTerceiro,
  calcularPoissonAlertas,
  calcularHalfKelly,
  type LeiDoTerceiroResult,
  type PoissonAnalysisResult,
  type KellyCalculationResult,
  type TipoApostaKelly,
} from "@/lib/three-tier-engine";

export interface ThreeTierEngineState {
  historyArray: number[];
  cicloAtual: number[];
  janelaCurta: number[];
  leiDoTerceiro: LeiDoTerceiroResult;
  poissonAnalysis: PoissonAnalysisResult;
  calcularKelly: (
    bancaAtual: number,
    tipoAposta?: TipoApostaKelly,
    stopLoss?: number,
    unidadeMinima?: number
  ) => KellyCalculationResult;
}

/**
 * Hook do Motor Estatístico Avançado de Três Camadas:
 * 1. Estruturação do Histórico: Recebe o historyArray e deriva cicloAtual (-37) e janelaCurta (-12).
 * 2. Lei do Terceiro: Mapeia ausentes (0x), únicos (1x) e repetidos (>=2x) nos últimos 37 giros.
 * 3. Distribuição de Poisson: Calcula probabilidades exatas e gatilhos de saturação (< 5%) na janela de 12 giros.
 * 4. Half-Kelly: Fornece dimensionamento adaptado de aposta respeitando o Stop-Loss.
 */
export function useThreeTierEngine(historyArray: number[]): ThreeTierEngineState {
  // 1. Seletores derivados: cicloAtual (37 giros) e janelaCurta (12 giros)
  const cicloAtual = useMemo(() => {
    return getCicloAtual(historyArray);
  }, [historyArray]);

  const janelaCurta = useMemo(() => {
    return getJanelaCurta(historyArray);
  }, [historyArray]);

  // 2. Lei do Terceiro
  const leiDoTerceiro = useMemo(() => {
    return calcularLeiDoTerceiro(cicloAtual);
  }, [cicloAtual]);

  // 3. Distribuição de Poisson
  const poissonAnalysis = useMemo(() => {
    return calcularPoissonAlertas(janelaCurta);
  }, [janelaCurta]);

  // 4. Critério de Half-Kelly
  const calcularKelly = useMemo(() => {
    return (
      bancaAtual: number,
      tipoAposta: TipoApostaKelly = "DUZIA_COLUNA",
      stopLoss = 0,
      unidadeMinima = 1.0
    ): KellyCalculationResult => {
      const pesoPoisson = poissonAnalysis.maiorPesoKelly.peso;
      return calcularHalfKelly(
        bancaAtual,
        tipoAposta,
        pesoPoisson,
        stopLoss,
        unidadeMinima
      );
    };
  }, [poissonAnalysis]);

  return {
    historyArray,
    cicloAtual,
    janelaCurta,
    leiDoTerceiro,
    poissonAnalysis,
    calcularKelly,
  };
}
