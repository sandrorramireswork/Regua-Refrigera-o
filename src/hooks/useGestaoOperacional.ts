import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type GestaoOperacionalConfig,
  type OperacaoAoVivoState,
  type SessaoFinanceiraOperacional,
  type AlvoResolvido,
  type ResultadoProcessamentoGiro,
  DEFAULT_OPERACIONAL_CONFIG,
  DEFAULT_OPERACIONAL_SESSAO,
  loadGestaoOperacionalConfig,
  saveGestaoOperacionalConfig,
  loadSessaoOperacional,
  saveSessaoOperacional,
  resolverAlvo,
  processarGiroOperacional,
  EVENT_OPERACIONAL_CHANGE,
} from "@/lib/gestao-operacional-engine";

export function useGestaoOperacional() {
  const [config, setConfig] = useState<GestaoOperacionalConfig>(DEFAULT_OPERACIONAL_CONFIG);
  const [sessao, setSessao] = useState<SessaoFinanceiraOperacional>(DEFAULT_OPERACIONAL_SESSAO);

  // Alvo resolvido atual a partir da configuração salva
  const alvoAtual = useMemo(() => {
    return resolverAlvo(config.tipoEntrada, config.alvoEntrada);
  }, [config.tipoEntrada, config.alvoEntrada]);

  // Estado da operação ao vivo
  const [operacao, setOperacao] = useState<OperacaoAoVivoState>(() => ({
    emAndamento: false,
    sistemaAtivo: DEFAULT_OPERACIONAL_CONFIG.sistema,
    faseGale: 0,
    nivelDalembert: 1,
    valorApostaAtual: DEFAULT_OPERACIONAL_CONFIG.valorEntradaInicial,
    alvoAtivo: alvoAtual,
    perdasCicloAtual: 0,
    greensNoCiclo: 0,
    redsNoCiclo: 0,
    historicoCiclo: [],
  }));

  // Sincronização inicial e listeners de eventos
  useEffect(() => {
    const loadedConfig = loadGestaoOperacionalConfig();
    const loadedSessao = loadSessaoOperacional();
    setConfig(loadedConfig);
    setSessao(loadedSessao);

    const syncHandler = () => {
      setConfig(loadGestaoOperacionalConfig());
      setSessao(loadSessaoOperacional());
    };

    window.addEventListener(EVENT_OPERACIONAL_CHANGE, syncHandler);
    window.addEventListener("storage", syncHandler);
    return () => {
      window.removeEventListener(EVENT_OPERACIONAL_CHANGE, syncHandler);
      window.removeEventListener("storage", syncHandler);
    };
  }, []);

  // Atualizar e persistir configurações
  const updateConfig = useCallback((patch: Partial<GestaoOperacionalConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveGestaoOperacionalConfig(next);
      return next;
    });
  }, []);

  // Atualizar e persistir sessão
  const updateSessao = useCallback((patch: Partial<SessaoFinanceiraOperacional>) => {
    setSessao((prev) => {
      const next = { ...prev, ...patch };
      saveSessaoOperacional(next);
      return next;
    });
  }, []);

  // 1. AÇÃO: ACIONAR ENTRADA
  const acionarEntrada = useCallback(
    (alvoSobrescrito?: AlvoResolvido): boolean => {
      // Trava de segurança: se bloqueio estiver ativo, impede ativação
      if (sessao.bloqueioAtivo) {
        return false;
      }

      const alvoFinal = alvoSobrescrito || alvoAtual;

      setOperacao((prev) => {
        // Se já estava em andamento, cancela ou reinicia
        const proximaAposta = config.valorEntradaInicial;

        return {
          emAndamento: true,
          sistemaAtivo: config.sistema,
          faseGale: 0,
          nivelDalembert: 1,
          valorApostaAtual: proximaAposta,
          alvoAtivo: alvoFinal,
          perdasCicloAtual: 0,
          greensNoCiclo: 0,
          redsNoCiclo: 0,
          historicoCiclo: [],
        };
      });

      // Incrementa contador de operações acionadas
      updateSessao({
        totalEntradasAcionadas: sessao.totalEntradasAcionadas + 1,
      });

      return true;
    },
    [sessao.bloqueioAtivo, sessao.totalEntradasAcionadas, alvoAtual, config, updateSessao]
  );

  // 2. AÇÃO: CANCELAR OPERAÇÃO ATIVA
  const cancelarOperacao = useCallback(() => {
    setOperacao((prev) => ({
      ...prev,
      emAndamento: false,
      faseGale: 0,
      nivelDalembert: 1,
      perdasCicloAtual: 0,
      valorApostaAtual: config.valorEntradaInicial,
    }));
  }, [config.valorEntradaInicial]);

  // 3. AÇÃO: PROCESSAR NÚMERO SORTEADO (DIGITAÇÃO DO TECLADO)
  const processarNumeroSorteado = useCallback(
    (numero: number, confluenciaScore = 75): ResultadoProcessamentoGiro | null => {
      if (!operacao.emAndamento) {
        return null;
      }

      const resultado = processarGiroOperacional(
        numero,
        operacao,
        config,
        sessao,
        confluenciaScore
      );

      // Atualiza estados
      setOperacao(resultado.proximaOperacao);
      setSessao(resultado.proximaSessao);
      saveSessaoOperacional(resultado.proximaSessao);

      return resultado;
    },
    [operacao, config, sessao]
  );

  // 4. AÇÃO: REINICIAR SESSÃO / ZERAR BLOQUEIO (INICIAR NOVO DIA)
  const resetarSessao = useCallback((novaBancaInicial?: number) => {
    const bancaBase = novaBancaInicial !== undefined ? novaBancaInicial : sessao.bancaInicial;
    const novaSessao: SessaoFinanceiraOperacional = {
      bancaInicial: bancaBase,
      bancaAtual: bancaBase,
      lucroLiquidoSessao: 0,
      roiSessaoPerc: 0,
      totalEntradasAcionadas: 0,
      totalGirosOperados: 0,
      greensTotais: 0,
      redsTotais: 0,
      statusTrava: "LIVRE",
      bloqueioAtivo: false,
      ultimaMensagemListener: undefined,
    };
    setSessao(novaSessao);
    saveSessaoOperacional(novaSessao);
    cancelarOperacao();
  }, [sessao.bancaInicial, cancelarOperacao]);

  // 5. AÇÃO: DESBLOQUEAR TRAVA MANUALMENTE
  const desbloquearTrava = useCallback(() => {
    updateSessao({
      statusTrava: "LIVRE",
      bloqueioAtivo: false,
      ultimaMensagemListener: undefined,
    });
  }, [updateSessao]);

  return {
    config,
    alvoAtual,
    operacao,
    sessao,
    acionarEntrada,
    cancelarOperacao,
    processarNumeroSorteado,
    updateConfig,
    resetarSessao,
    desbloquearTrava,
  };
}
