import { useState, useEffect, useMemo, useRef } from "react";
import { Keypad } from "@/components/roleta/Keypad";
import { type Spin, REDS, VOISINS, TIERS, ORPHELINS, vizinhos, calcGrupos } from "@/lib/roulette";
import { calculateBallisticFavorites } from "@/lib/ballistic-favorites";
import {
  ChevronDown,
  ChevronUp,
  Keyboard,
  RotateCcw,
  Zap,
  Flame,
  X,
  Target,
  Layers,
  BarChart2,
  Lock,
  Unlock,
  SlidersHorizontal,
  ZoomIn,
  GripHorizontal,
  GripVertical,
  Move,
  TrendingUp,
} from "lucide-react";
import { useGestaoOperacional } from "@/hooks/useGestaoOperacional";
import { resolverAlvo, type TipoEntradaGatilho } from "@/lib/gestao-operacional-engine";
import { processarPadraoUnico } from "@/lib/meta-padrao-confluencia-engine";
import { calcTacticalAnalysis } from "@/lib/alert-confluence";

export interface FixedKeypadDockProps {
  onPick: (n: number) => void;
  onUndo?: (() => void) | undefined;
  spins?: Spin[] | undefined;
  ultimo?: Spin | null | undefined;
  onToggle?: ((open: boolean) => void) | undefined;
  gestaoOperacional?: ReturnType<typeof useGestaoOperacional> | undefined;
}

export type DragEdge = "top" | "left" | "right" | "top-left" | "top-right" | null;

export function FixedKeypadDock({
  onPick,
  onUndo,
  spins = [],
  ultimo,
  onToggle,
  gestaoOperacional: gestaoProp,
}: FixedKeypadDockProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("roleta-teclado-fixo-aberto");
    return saved !== null ? saved === "true" : true;
  });

  // Controle de tamanho manual do teclado de digitação (escala 60% a 150%)
  const [escala, setEscala] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const saved = localStorage.getItem("roleta-keypad-dock-escala");
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 60 && val <= 150) return val;
    }
    return 100;
  });

  // Controle de largura manual do teclado de digitação (520px a 1600px)
  const [larguraPx, setLarguraPx] = useState<number>(() => {
    if (typeof window === "undefined") return 896;
    const saved = localStorage.getItem("roleta-keypad-dock-largura");
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 520 && val <= 1800) return val;
    }
    return 896;
  });

  const [mostrarControleTamanho, setMostrarControleTamanho] = useState<boolean>(false);

  const handleUpdateEscala = (novaEscala: number) => {
    const clamped = Math.max(60, Math.min(150, novaEscala));
    setEscala(clamped);
    localStorage.setItem("roleta-keypad-dock-escala", String(clamped));
  };

  const handleSetLarguraPreset = (modo: "compacto" | "padrao" | "amplo" | "total") => {
    let w = 896;
    if (modo === "compacto") w = 680;
    if (modo === "padrao") w = 896;
    if (modo === "amplo") w = 1180;
    if (modo === "total") w = typeof window !== "undefined" ? Math.min(1600, window.innerWidth - 20) : 1400;
    setLarguraPx(w);
    localStorage.setItem("roleta-keypad-dock-largura", String(w));
  };

  // Arraste manual das bordas (Superior, Esquerda, Direita e Cantos)
  const [activeDragEdge, setActiveDragEdge] = useState<DragEdge>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartXRef = useRef<number>(0);
  const dragStartEscalaRef = useRef<number>(100);
  const dragStartLarguraRef = useRef<number>(896);

  const handleStartDrag = (edge: DragEdge, clientX: number, clientY: number) => {
    setActiveDragEdge(edge);
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragStartEscalaRef.current = escala;
    dragStartLarguraRef.current = larguraPx;

    if (edge === "top") {
      document.body.style.cursor = "ns-resize";
    } else if (edge === "left" || edge === "right") {
      document.body.style.cursor = "ew-resize";
    } else if (edge === "top-left") {
      document.body.style.cursor = "nwse-resize";
    } else if (edge === "top-right") {
      document.body.style.cursor = "nesw-resize";
    }
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!activeDragEdge) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Ajuste de Escala Vertical (Arrastar para cima aumenta escala)
      if (activeDragEdge === "top" || activeDragEdge === "top-left" || activeDragEdge === "top-right") {
        const deltaY = dragStartYRef.current - e.clientY;
        const novaEscala = Math.max(60, Math.min(150, Math.round(dragStartEscalaRef.current + deltaY * 0.45)));
        setEscala(novaEscala);
      }

      // 2. Ajuste de Largura Horizontal
      if (activeDragEdge === "right" || activeDragEdge === "top-right") {
        const deltaX = e.clientX - dragStartXRef.current;
        const maxW = typeof window !== "undefined" ? window.innerWidth - 16 : 1600;
        const novaLargura = Math.max(520, Math.min(maxW, Math.round(dragStartLarguraRef.current + deltaX * 2)));
        setLarguraPx(novaLargura);
      } else if (activeDragEdge === "left" || activeDragEdge === "top-left") {
        const deltaX = dragStartXRef.current - e.clientX;
        const maxW = typeof window !== "undefined" ? window.innerWidth - 16 : 1600;
        const novaLargura = Math.max(520, Math.min(maxW, Math.round(dragStartLarguraRef.current + deltaX * 2)));
        setLarguraPx(novaLargura);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0]!;

      if (activeDragEdge === "top" || activeDragEdge === "top-left" || activeDragEdge === "top-right") {
        const deltaY = dragStartYRef.current - touch.clientY;
        const novaEscala = Math.max(60, Math.min(150, Math.round(dragStartEscalaRef.current + deltaY * 0.45)));
        setEscala(novaEscala);
      }

      if (activeDragEdge === "right" || activeDragEdge === "top-right") {
        const deltaX = touch.clientX - dragStartXRef.current;
        const maxW = typeof window !== "undefined" ? window.innerWidth - 16 : 1600;
        const novaLargura = Math.max(520, Math.min(maxW, Math.round(dragStartLarguraRef.current + deltaX * 2)));
        setLarguraPx(novaLargura);
      } else if (activeDragEdge === "left" || activeDragEdge === "top-left") {
        const deltaX = dragStartXRef.current - touch.clientX;
        const maxW = typeof window !== "undefined" ? window.innerWidth - 16 : 1600;
        const novaLargura = Math.max(520, Math.min(maxW, Math.round(dragStartLarguraRef.current + deltaX * 2)));
        setLarguraPx(novaLargura);
      }
    };

    const handleEndDrag = () => {
      setActiveDragEdge(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("roleta-keypad-dock-escala", String(escala));
      localStorage.setItem("roleta-keypad-dock-largura", String(larguraPx));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEndDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEndDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEndDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEndDrag);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [activeDragEdge, escala, larguraPx]);

  // =========================================================================
  // MODO DE ARRASTAR O GRID DO TECLADO LIVREMENTE PELA TELA
  // =========================================================================
  const [modoArrastar, setModoArrastar] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("roleta-keypad-dock-flutuante") === "true";
  });

  const [posicaoGrid, setPosicaoGrid] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("roleta-keypad-dock-pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDraggingGrid, setIsDraggingGrid] = useState<boolean>(false);
  const isDraggingGridRef = useRef<boolean>(false);
  const dragGridStartPosRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
  });
  const dockContainerRef = useRef<HTMLDivElement>(null);

  // Inicializa posição centralizada na tela quando modo arrastar for ativado pela 1ª vez
  useEffect(() => {
    if (modoArrastar && !posicaoGrid && typeof window !== "undefined") {
      const w = Math.min(larguraPx, window.innerWidth - 16);
      const initialX = Math.max(8, Math.round((window.innerWidth - w) / 2));
      const initialY = Math.max(50, window.innerHeight - 480);
      const pos = { x: initialX, y: initialY };
      setPosicaoGrid(pos);
      localStorage.setItem("roleta-keypad-dock-pos", JSON.stringify(pos));
    }
  }, [modoArrastar, posicaoGrid, larguraPx]);

  // Mantém dentro dos limites visíveis da janela em resize
  useEffect(() => {
    const handleResize = () => {
      if (modoArrastar && posicaoGrid && typeof window !== "undefined") {
        const dockW = dockContainerRef.current?.offsetWidth || larguraPx;
        const dockH = dockContainerRef.current?.offsetHeight || 380;
        const clampedX = Math.max(4, Math.min(window.innerWidth - dockW - 4, posicaoGrid.x));
        const clampedY = Math.max(4, Math.min(window.innerHeight - Math.min(dockH, 180), posicaoGrid.y));
        if (clampedX !== posicaoGrid.x || clampedY !== posicaoGrid.y) {
          setPosicaoGrid({ x: clampedX, y: clampedY });
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [modoArrastar, posicaoGrid, larguraPx]);

  const handleStartDragGrid = (e: React.PointerEvent) => {
    // Não inicia drag se clicou em botões, links, inputs
    if ((e.target as HTMLElement).closest("button, a, input, select, .no-drag")) return;

    e.preventDefault();
    e.stopPropagation();

    isDraggingGridRef.current = true;
    setIsDraggingGrid(true);

    const dockRect = dockContainerRef.current?.getBoundingClientRect();
    const currentX = posicaoGrid?.x ?? (dockRect ? dockRect.left : Math.max(8, Math.round((window.innerWidth - larguraPx) / 2)));
    const currentY = posicaoGrid?.y ?? (dockRect ? dockRect.top : Math.max(50, window.innerHeight - 480));

    dragGridStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: currentX,
      startY: currentY,
    };

    if (!modoArrastar) {
      setModoArrastar(true);
      localStorage.setItem("roleta-keypad-dock-flutuante", "true");
      setPosicaoGrid({ x: currentX, y: currentY });
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const handlePointerMoveGrid = (e: React.PointerEvent) => {
    if (!isDraggingGridRef.current) return;

    const deltaX = e.clientX - dragGridStartPosRef.current.clientX;
    const deltaY = e.clientY - dragGridStartPosRef.current.clientY;

    const newX = dragGridStartPosRef.current.startX + deltaX;
    const newY = dragGridStartPosRef.current.startY + deltaY;

    const dockW = dockContainerRef.current?.offsetWidth || larguraPx;
    const dockH = dockContainerRef.current?.offsetHeight || 380;

    const maxW = typeof window !== "undefined" ? window.innerWidth : 1400;
    const maxH = typeof window !== "undefined" ? window.innerHeight : 900;

    const clampedX = Math.max(4, Math.min(maxW - dockW - 4, newX));
    const clampedY = Math.max(4, Math.min(maxH - Math.min(dockH, 180), newY));

    const nextPos = { x: clampedX, y: clampedY };
    setPosicaoGrid(nextPos);
  };

  const handlePointerUpGrid = (e: React.PointerEvent) => {
    if (isDraggingGridRef.current) {
      isDraggingGridRef.current = false;
      setIsDraggingGrid(false);

      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}

      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (posicaoGrid) {
        localStorage.setItem("roleta-keypad-dock-pos", JSON.stringify(posicaoGrid));
      }
    }
  };

  const toggleModoArrastar = () => {
    if (modoArrastar) {
      setModoArrastar(false);
      localStorage.setItem("roleta-keypad-dock-flutuante", "false");
    } else {
      setModoArrastar(true);
      localStorage.setItem("roleta-keypad-dock-flutuante", "true");
      if (!posicaoGrid && typeof window !== "undefined") {
        const w = Math.min(larguraPx, window.innerWidth - 16);
        const initialX = Math.max(8, Math.round((window.innerWidth - w) / 2));
        const initialY = Math.max(50, window.innerHeight - 480);
        const pos = { x: initialX, y: initialY };
        setPosicaoGrid(pos);
        localStorage.setItem("roleta-keypad-dock-pos", JSON.stringify(pos));
      }
    }
  };

  const handleEncaixarRodape = () => {
    setModoArrastar(false);
    localStorage.setItem("roleta-keypad-dock-flutuante", "false");
  };

  // Usa instância injetada ou cria uma autônoma vinculada ao storage
  const gestaoLocal = useGestaoOperacional();
  const gestao = gestaoProp || gestaoLocal;

  const {
    config,
    alvoAtual,
    operacao,
    sessao,
    acionarEntrada,
    cancelarOperacao,
    processarNumeroSorteado,
    updateConfig,
    desbloquearTrava,
    resetarSessao,
  } = gestao;

  useEffect(() => {
    onToggle?.(open);
  }, [open, onToggle]);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem("roleta-teclado-fixo-aberto", String(next));
      return next;
    });
  }

  // Intercepta a seleção de número para acionar o motor de Gales/D'Alembert
  const handlePickNumero = (n: number) => {
    if (operacao.emAndamento) {
      processarNumeroSorteado(n);
    }
    onPick(n);
  };

  const ultimoCor = ultimo?.props.cor;
  const ultimoSetor = ultimo && ultimo.props.setor !== "—" ? ultimo.props.setor : "";

  // Atalhos rápidos para trocar o alvo da entrada
  const handleSelecionarAlvoRapido = (tipo: TipoEntradaGatilho, val: number | string) => {
    updateConfig({ tipoEntrada: tipo, alvoEntrada: val });
  };

  // Identifica a letra do setor na roleta europeia: V (Voisins), T (Tiers), O (Orphelins)
  const getSetorLetra = (num: number): "V" | "T" | "O" => {
    if (TIERS.includes(num)) return "T";
    if (ORPHELINS.includes(num)) return "O";
    return "V";
  };

  // 1. Motor Balístico: calcula qual número está mais forte pra sair
  const ballisticAnalysis = useMemo(() => {
    return calculateBallisticFavorites(spins);
  }, [spins]);
  const numeroMaisForte = ballisticAnalysis?.numbers?.[0] ?? null;

  // 2. Motor de Puxadas: calcula quais números o último número mais puxa no histórico
  const ultimoNumeroNum = spins[0]?.num ?? null;
  const puxadasDoUltimo = useMemo(() => {
    if (ultimoNumeroNum === null || spins.length < 2) {
      return [26, 32, 15];
    }
    const counts = new Map<number, number>();
    for (let i = spins.length - 1; i > 0; i--) {
      if (spins[i]!.num === ultimoNumeroNum) {
        const destino = spins[i - 1]!.num;
        counts.set(destino, (counts.get(destino) ?? 0) + 1);
      }
    }
    const ordenados = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ordenados.length > 0) {
      return ordenados.slice(0, 3).map(([n]) => n);
    }
    return vizinhos(ultimoNumeroNum, 1).filter((n) => n !== ultimoNumeroNum).slice(0, 3);
  }, [spins, ultimoNumeroNum]);

  // 3. Motor Especialista de Confluência e Melhor Entrada (100% Ao Vivo Pós-Número Digitado)
  const analiseEspecialista = useMemo(() => {
    if (!spins || spins.length < 3) {
      return {
        temOportunidadeAssertiva: false,
        alvoPrincipal: null as string | null,
        alvoDescricao: "",
        tipoEntrada: null as TipoEntradaGatilho | null,
        alvoValor: null as number | string | null,
        confluenciaPerc: 0,
        motivoEspera: "Amostra insuficiente. Registre giros para calibrar confluência.",
        coberturaNumeros: [] as number[],
        detalhesGatilho: "Aguardando histórico",
        setorFoco: "",
      };
    }

    // A) Processamento do Meta-Padrão de Alta Confluência (6 sub-padrões + volatilidade + circuit breaker)
    const padraoUnico = processarPadraoUnico(spins, 62);
    const volatilidade = padraoUnico.volatilidade;

    // B) Puxadas e Transições Físicas do Último Número Digitado
    const ultNum = spins[0]?.num ?? null;
    let puxadaTop: number | null = null;
    let puxadasSetor = "";
    if (ultNum !== null && spins.length >= 2) {
      const counts = new Map<number, number>();
      for (let i = spins.length - 1; i > 0; i--) {
        if (spins[i]!.num === ultNum) {
          const dest = spins[i - 1]!.num;
          counts.set(dest, (counts.get(dest) ?? 0) + 1);
        }
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0 && sorted[0]![1] >= 1) {
        puxadaTop = sorted[0]![0];
        puxadasSetor = TIERS.includes(puxadaTop) ? "Tiers" : ORPHELINS.includes(puxadaTop) ? "Orphelins" : "Voisins";
      }
    }

    // C) Setor do último número sorteado
    const ultSetor = ultNum !== null
      ? (TIERS.includes(ultNum) ? "Tiers" : ORPHELINS.includes(ultNum) ? "Orphelins" : "Voisins")
      : "";

    // Retenção nos últimos 12 giros
    const ultimos12 = spins.slice(0, 12);
    const countTiers = ultimos12.filter((s) => TIERS.includes(s.num)).length;
    const countVoisins = ultimos12.filter((s) => VOISINS.includes(s.num)).length;
    const countOrph = ultimos12.filter((s) => ORPHELINS.includes(s.num)).length;

    let setorRetencao = "";
    if (countTiers >= 5) setorRetencao = "Tiers";
    else if (countVoisins >= 6) setorRetencao = "Voisins";
    else if (countOrph >= 4) setorRetencao = "Orphelins";

    // D) Dúzia e Coluna Dominantes
    const d1 = ultimos12.filter((s) => s.props.duzia === 1).length;
    const d2 = ultimos12.filter((s) => s.props.duzia === 2).length;
    const d3 = ultimos12.filter((s) => s.props.duzia === 3).length;
    const maxD = Math.max(d1, d2, d3);
    const duziaForte = maxD >= 5 ? (d1 === maxD ? 1 : d2 === maxD ? 2 : 3) : null;

    // E) Avaliação de Confluência Sniper do Especialista
    const isVolatilidadeAlta = volatilidade.volatilidadePerc >= 62 || volatilidade.isMesaForaDeFoco;
    const isMicroDesvio = volatilidade.isMicroDesvio;
    const concordancia = padraoUnico.concordanciaGeralPerc;
    const assertividade = padraoUnico.assertividadeEstimadaPerc;

    const temConvergenciaSetorDuzia =
      (padraoUnico.setorRecomendado && setorRetencao && padraoUnico.setorRecomendado.includes(setorRetencao)) ||
      (duziaForte !== null && padraoUnico.duziaRecomendada === duziaForte);

    const confluenciaScore = Math.min(96, Math.round(
      concordancia * 0.45 +
      assertividade * 0.35 +
      (temConvergenciaSetorDuzia ? 15 : 0) +
      (!isVolatilidadeAlta ? 5 : 0)
    ));

    const assertiva =
      !isVolatilidadeAlta &&
      !isMicroDesvio &&
      padraoUnico.estado === "SINAL_CONFIRMADO" &&
      confluenciaScore >= 78;

    if (!assertiva) {
      let motivo = "Mercado em transição estatística";
      if (isVolatilidadeAlta) {
        motivo = `Volatilidade em ${volatilidade.volatilidadePerc}% (acima da linha de corte 62%). Trava Anti-Red ativa.`;
      } else if (isMicroDesvio) {
        motivo = volatilidade.microDesvioDescricao || "Micro-desvio de fluxo no último giro. Calibrando entrada.";
      } else if (concordancia < 78) {
        motivo = `Concordância dos sub-padrões em ${concordancia}% (mínimo exigido: 78%).`;
      } else {
        motivo = "Aguardando alinhamento do setor físico com a dúzia dominante.";
      }

      return {
        temOportunidadeAssertiva: false,
        alvoPrincipal: null as string | null,
        alvoDescricao: "",
        tipoEntrada: null as TipoEntradaGatilho | null,
        alvoValor: null as number | string | null,
        confluenciaPerc: confluenciaScore,
        motivoEspera: motivo,
        coberturaNumeros: padraoUnico.alvosFinais.slice(0, 6),
        detalhesGatilho: `Último: ${ultNum} (${ultSetor}) · Volatilidade: ${volatilidade.volatilidadePerc}% · Puxada: ${puxadaTop !== null ? `${puxadaTop} (${puxadasSetor})` : "Sem puxada"}`,
        setorFoco: padraoUnico.setorRecomendado || ultSetor,
      };
    }

    // Oportunidade Confirmada
    let alvoPrincipal = "";
    let alvoDescricao = "";
    let tipoEntrada: TipoEntradaGatilho = "duzia";
    let alvoValor: number | string = 1;

    if (padraoUnico.duziaRecomendada) {
      alvoPrincipal = `${padraoUnico.duziaRecomendada}ª DÚZIA`;
      tipoEntrada = "duzia";
      alvoValor = padraoUnico.duziaRecomendada;
      alvoDescricao = `${padraoUnico.duziaRecomendada}ª Dúzia (${padraoUnico.duziaRecomendada === 1 ? "1 a 12" : padraoUnico.duziaRecomendada === 2 ? "13 a 24" : "25 a 36"})`;
    } else if (padraoUnico.colunaRecomendada) {
      alvoPrincipal = `${padraoUnico.colunaRecomendada}ª COLUNA`;
      tipoEntrada = "coluna";
      alvoValor = padraoUnico.colunaRecomendada;
      alvoDescricao = `${padraoUnico.colunaRecomendada}ª Coluna`;
    } else if (padraoUnico.setorRecomendado) {
      alvoPrincipal = padraoUnico.setorRecomendado.toUpperCase();
      tipoEntrada = "mercado_numeros";
      alvoValor = padraoUnico.alvosFinais[0] ?? 0;
      alvoDescricao = `Setor ${padraoUnico.setorRecomendado}`;
    } else {
      alvoPrincipal = "2ª DÚZIA";
      tipoEntrada = "duzia";
      alvoValor = 2;
      alvoDescricao = "2ª Dúzia (13 a 24)";
    }

    const triggerInfo = [
      padraoUnico.setorRecomendado ? `Setor: ${padraoUnico.setorRecomendado}` : null,
      duziaForte ? `Dúzia ${duziaForte}ª em alta` : null,
      puxadaTop !== null ? `Puxada: ${ultNum} ➔ ${puxadaTop}` : null,
    ].filter(Boolean).join(" · ");

    return {
      temOportunidadeAssertiva: true,
      alvoPrincipal,
      alvoDescricao,
      tipoEntrada,
      alvoValor,
      confluenciaPerc: Math.max(78, confluenciaScore),
      motivoEspera: "",
      coberturaNumeros: padraoUnico.alvosFinais,
      detalhesGatilho: triggerInfo || "Convergência total de sub-padrões",
      setorFoco: padraoUnico.setorRecomendado || ultSetor,
    };
  }, [spins]);

  // 4. Estatísticas dos Grupos de Dúzias e Colunas na Mesa
  const gruposMesa = useMemo(() => calcGrupos(spins), [spins]);

  // 5. Análise Tática Comparativa: Dúzia & Coluna do Padrão vs Maior % da Mesa no Momento
  const analiseTatica = useMemo(() => {
    const alvos = analiseEspecialista.coberturaNumeros.length > 0
      ? analiseEspecialista.coberturaNumeros
      : [36, 26, 16, 6];

    const tac = calcTacticalAnalysis({
      targetNumbers: alvos,
      spins,
      accuracy2Entries: analiseEspecialista.confluenciaPerc || 75,
    });

    const maiorDuzia = gruposMesa.favDuzias[0] ?? { idx: 1, nome: "1ª Dúzia", perc: 33.3, qtd: 0 };
    const maiorColuna = gruposMesa.favColunas[0] ?? { idx: 1, nome: "1ª Coluna", perc: 33.3, qtd: 0 };

    const isDuziaConfluente = tac.bestDozen.idx === maiorDuzia.idx;
    const isColunaConfluente = tac.bestColumn.idx === maiorColuna.idx;

    return {
      ...tac,
      maiorDuzia,
      maiorColuna,
      isDuziaConfluente,
      isColunaConfluente,
    };
  }, [spins, analiseEspecialista, gruposMesa]);

  const [mostrarMiniGrafico, setMostrarMiniGrafico] = useState<boolean>(true);

  return (
    <aside
      ref={dockContainerRef}
      data-panel-section="teclado-fixo-dock"
      aria-label="Teclado de Digitação Fixo na Horizontal"
      className={`fixed z-50 select-none ${
        modoArrastar
          ? "transition-none shadow-[0_16px_50px_rgba(0,0,0,0.95)]"
          : "bottom-0 left-0 right-0 transition-all duration-300 ease-out"
      }`}
      style={
        modoArrastar && posicaoGrid
          ? {
              left: `${posicaoGrid.x}px`,
              top: `${posicaoGrid.y}px`,
              width: `${Math.min(larguraPx, typeof window !== "undefined" ? window.innerWidth - 8 : larguraPx)}px`,
              maxWidth: "calc(100vw - 8px)",
              bottom: "auto",
              right: "auto",
            }
          : undefined
      }
    >
      <div
        className={`relative mx-auto w-full transition-[max-width] duration-75 ${
          modoArrastar ? "px-0" : "px-1 sm:px-3"
        }`}
        style={!modoArrastar ? { maxWidth: `${larguraPx}px` } : undefined}
      >
        {/* BADGE FLUTUANTE HUD AO ARRASTAR O GRID PELA TELA */}
        {isDraggingGrid && posicaoGrid && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex items-center gap-2 rounded-full border-2 border-emerald-400 bg-black/95 px-4 py-1.5 font-mono text-xs font-black text-[#00FF88] shadow-[0_0_25px_rgba(0,255,136,0.9)] animate-pulse">
            <Move className="h-4 w-4 text-[#00FF88] animate-spin" />
            <span>ARRASTANDO GRID LIVRE</span>
            <span className="text-white/40">|</span>
            <span>X: {posicaoGrid.x}px</span>
            <span className="text-white/40">|</span>
            <span>Y: {posicaoGrid.y}px</span>
          </div>
        )}

        {/* BADGE FLUTUANTE HUD AO ARRASTAR AS BORDAS */}
        {activeDragEdge && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex items-center gap-2 rounded-full border-2 border-yellow-400 bg-black/95 px-4 py-1 font-mono text-xs font-black text-yellow-300 shadow-[0_0_22px_rgba(255,255,0,0.9)] animate-pulse">
            <SlidersHorizontal className="h-3.5 w-3.5 text-yellow-400" />
            <span>BORDA EM AJUSTE</span>
            <span className="text-white/40">|</span>
            <span>ESCALA: {escala}%</span>
            <span className="text-white/40">|</span>
            <span>LARGURA: {larguraPx}px</span>
          </div>
        )}

        {/* BORDA LATERAL ESQUERDA - AJUSTE MANUAL DE LARGURA */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStartDrag("left", e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches.length > 0) handleStartDrag("left", e.touches[0]!.clientX, e.touches[0]!.clientY);
          }}
          title="Arraste esta borda lateral para ajustar a largura do teclado"
          className="absolute -left-2 sm:-left-3 top-7 bottom-2 w-5 cursor-ew-resize flex items-center justify-center z-30 group"
        >
          <div
            className={`h-20 w-1.5 sm:w-2 rounded-full border flex flex-col items-center justify-center gap-1 transition-all ${
              activeDragEdge === "left" || activeDragEdge === "top-left"
                ? "bg-yellow-400 border-yellow-300 shadow-[0_0_15px_#FFFF00] scale-y-110"
                : "bg-cyan-950/80 border-cyan-400/60 shadow-[0_0_8px_rgba(0,255,255,0.4)] group-hover:bg-cyan-400 group-hover:border-cyan-200 group-hover:w-2.5"
            }`}
          >
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
          </div>
        </div>

        {/* BORDA LATERAL DIREITA - AJUSTE MANUAL DE LARGURA */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStartDrag("right", e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches.length > 0) handleStartDrag("right", e.touches[0]!.clientX, e.touches[0]!.clientY);
          }}
          title="Arraste esta borda lateral para ajustar a largura do teclado"
          className="absolute -right-2 sm:-right-3 top-7 bottom-2 w-5 cursor-ew-resize flex items-center justify-center z-30 group"
        >
          <div
            className={`h-20 w-1.5 sm:w-2 rounded-full border flex flex-col items-center justify-center gap-1 transition-all ${
              activeDragEdge === "right" || activeDragEdge === "top-right"
                ? "bg-yellow-400 border-yellow-300 shadow-[0_0_15px_#FFFF00] scale-y-110"
                : "bg-cyan-950/80 border-cyan-400/60 shadow-[0_0_8px_rgba(0,255,255,0.4)] group-hover:bg-cyan-400 group-hover:border-cyan-200 group-hover:w-2.5"
            }`}
          >
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
            <div className="w-0.5 h-1 rounded-full bg-white/70" />
          </div>
        </div>

        <div
          className={`border-cyan-500/50 bg-gradient-to-b from-[#05131f]/98 via-[#020a10]/98 to-black/98 backdrop-blur-xl overflow-hidden ${
            modoArrastar
              ? "rounded-2xl border-2 border-cyan-400 shadow-[0_14px_45px_rgba(0,0,0,0.95),0_0_25px_rgba(0,255,255,0.4)] ring-1 ring-cyan-300/30"
              : "rounded-t-2xl border-t-2 border-x-2 shadow-[0_-8px_32px_rgba(0,0,0,0.92),0_-2px_14px_rgba(6,182,212,0.4)]"
          }`}
        >
          {/* =========================================================================
              BARRA SUPERIOR TÁTIL: ALÇA DE ARRASTE DO GRID & CONTROLES DE ESCALA
              ========================================================================= */}
          <div
            onPointerDown={handleStartDragGrid}
            onPointerMove={handlePointerMoveGrid}
            onPointerUp={handlePointerUpGrid}
            onPointerCancel={handlePointerUpGrid}
            title="Segure e arraste esta barra para mover o grid do teclado para qualquer lugar da tela"
            className={`group relative flex h-7 sm:h-7.5 w-full items-center justify-between px-2 sm:px-3 border-b transition-all select-none touch-none ${
              isDraggingGrid
                ? "cursor-grabbing bg-yellow-400/35 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.85)]"
                : modoArrastar
                  ? "cursor-grab bg-gradient-to-r from-emerald-950/95 via-[#022c1b]/95 to-emerald-950/95 border-emerald-400/80 hover:border-emerald-300 shadow-[0_0_12px_rgba(0,255,136,0.3)]"
                  : "cursor-grab bg-gradient-to-r from-cyan-950/90 via-[#032030]/95 to-cyan-950/90 border-cyan-500/40 hover:bg-cyan-900/90 hover:border-cyan-300"
            }`}
          >
            {/* CANTO SUPERIOR ESQUERDO: GRIP DIAGONAL, ÍCONE MOVE & BOTÕES RÁPIDOS - / + */}
            <div className="flex items-center gap-1.5 shrink-0 no-drag" onClick={(e) => e.stopPropagation()}>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                  modoArrastar
                    ? "border-emerald-400/80 bg-emerald-900/60 text-[#00FF88]"
                    : "border-cyan-500/50 bg-black/70 text-cyan-300"
                }`}
                title="Alça de Arraste do Grid"
              >
                <Move className="h-3 w-3" />
              </div>

              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartDrag("top-left", e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length > 0) handleStartDrag("top-left", e.touches[0]!.clientX, e.touches[0]!.clientY);
                }}
                className="flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded border border-cyan-500/50 bg-black/70 hover:border-yellow-400 text-cyan-300 hover:text-yellow-300"
                title="Canto de Ajuste Diagonal: Arraste para alterar tamanho e largura simultaneamente"
              >
                <GripHorizontal className="h-3 w-3" />
              </div>

              <button
                type="button"
                onClick={() => handleUpdateEscala(escala - 5)}
                disabled={escala <= 60}
                className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/60 font-mono text-xs font-black text-white hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-30 cursor-pointer"
                title="Diminuir tamanho do teclado (-5%)"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleUpdateEscala(escala + 5)}
                disabled={escala >= 150}
                className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/60 font-mono text-xs font-black text-white hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-30 cursor-pointer"
                title="Aumentar tamanho do teclado (+5%)"
              >
                +
              </button>
            </div>

            {/* CENTRO: ALÇA DE ARRASTE TÁTIL COM RIDGE LINES & FEEDBACK */}
            <div className="flex items-center gap-2 pointer-events-none">
              <div className="hidden sm:flex items-center gap-0.5 opacity-70">
                <span className={`block h-1 w-3 rounded-full ${modoArrastar ? "bg-emerald-400" : "bg-cyan-400"}`} />
                <span className={`block h-1 w-6 rounded-full ${modoArrastar ? "bg-emerald-300" : "bg-cyan-300"}`} />
                <span className={`block h-1 w-3 rounded-full ${modoArrastar ? "bg-emerald-400" : "bg-cyan-400"}`} />
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                {isDraggingGrid ? (
                  <span className="text-yellow-300 animate-pulse font-bold flex items-center gap-1">
                    🖐️ ARRASTANDO GRID · MOVA LIVREMENTE
                  </span>
                ) : modoArrastar ? (
                  <span className="text-[#00FF88] flex items-center gap-1 drop-shadow-[0_0_6px_rgba(0,255,136,0.8)]">
                    <Move className="h-3 w-3 text-[#00FF88]" />
                    <span className="hidden xs:inline">MODO ARRASTAR ATIVO · SEGURE E MOVA O GRID</span>
                    <span className="xs:hidden">MODO ARRASTAR ATIVO</span>
                  </span>
                ) : (
                  <span className="text-cyan-200 flex items-center gap-1">
                    <Move className="h-3 w-3 text-cyan-300" />
                    <span className="hidden xs:inline">SEGURE E ARRASTE O GRID LIVREMENTE</span>
                    <span className="xs:hidden">ARRASTAR GRID</span>
                  </span>
                )}
                <span className="rounded bg-black/90 px-1.5 py-0.5 text-yellow-300 border border-yellow-400/60 font-mono text-[9px]">
                  {escala}%
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-0.5 opacity-70">
                <span className={`block h-1 w-3 rounded-full ${modoArrastar ? "bg-emerald-400" : "bg-cyan-400"}`} />
                <span className={`block h-1 w-6 rounded-full ${modoArrastar ? "bg-emerald-300" : "bg-cyan-300"}`} />
                <span className={`block h-1 w-3 rounded-full ${modoArrastar ? "bg-emerald-400" : "bg-cyan-400"}`} />
              </div>
            </div>

            {/* CANTO SUPERIOR DIREITO: PRESETS DE LARGURA, ENCAIXAR RODAPÉ & CANTO DIAGONAL */}
            <div className="flex items-center gap-1.5 shrink-0 no-drag" onClick={(e) => e.stopPropagation()}>
              {modoArrastar && (
                <button
                  type="button"
                  onClick={handleEncaixarRodape}
                  className="flex items-center gap-1 rounded border border-yellow-400/60 bg-yellow-950/80 px-2 py-0.5 font-mono text-[8.5px] font-black uppercase text-yellow-300 hover:bg-yellow-900 transition-all cursor-pointer shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                  title="Encaixar teclado de volta fixo no rodapé"
                >
                  <span>Encaixar Rodapé</span>
                </button>
              )}

              <div className="hidden md:flex items-center gap-1 font-mono text-[8.5px]">
                <button
                  type="button"
                  onClick={() => handleSetLarguraPreset("padrao")}
                  className={`px-1.5 py-0.5 rounded border transition cursor-pointer ${
                    larguraPx === 896
                      ? "border-cyan-400 bg-cyan-950/80 text-cyan-300"
                      : "border-white/15 bg-black/50 text-white/60 hover:text-white"
                  }`}
                  title="Largura Padrão (896px)"
                >
                  Padrão
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLarguraPreset("amplo")}
                  className={`px-1.5 py-0.5 rounded border transition cursor-pointer ${
                    larguraPx === 1180
                      ? "border-cyan-400 bg-cyan-950/80 text-cyan-300"
                      : "border-white/15 bg-black/50 text-white/60 hover:text-white"
                  }`}
                  title="Largura Ampla (1180px)"
                >
                  Amplo
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLarguraPreset("total")}
                  className={`px-1.5 py-0.5 rounded border transition cursor-pointer ${
                    larguraPx > 1300
                      ? "border-cyan-400 bg-cyan-950/80 text-cyan-300"
                      : "border-white/15 bg-black/50 text-white/60 hover:text-white"
                  }`}
                  title="Largura Total da Tela"
                >
                  Cheia
                </button>
              </div>

              {escala !== 100 && (
                <button
                  type="button"
                  onClick={() => handleUpdateEscala(100)}
                  className="px-1.5 py-0.5 rounded border border-white/20 bg-black/60 font-mono text-[8.5px] font-bold text-white/70 hover:text-white hover:border-white/40 cursor-pointer"
                  title="Restaurar tamanho 100%"
                >
                  100%
                </button>
              )}

              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartDrag("top-right", e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (e.touches.length > 0) handleStartDrag("top-right", e.touches[0]!.clientX, e.touches[0]!.clientY);
                }}
                className="flex h-5 w-5 cursor-nesw-resize items-center justify-center rounded border border-cyan-500/50 bg-black/70 hover:border-yellow-400 text-cyan-300 hover:text-yellow-300"
                title="Canto de Ajuste Diagonal: Arraste para alterar tamanho e largura simultaneamente"
              >
                <GripHorizontal className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* BARRA DE CONTROLE TÁTICA DO DOCK */}
          <div
            onPointerDown={(e) => {
              if (modoArrastar) handleStartDragGrid(e);
            }}
            onPointerMove={(e) => {
              if (modoArrastar) handlePointerMoveGrid(e);
            }}
            onPointerUp={(e) => {
              if (modoArrastar) handlePointerUpGrid(e);
            }}
            onPointerCancel={(e) => {
              if (modoArrastar) handlePointerUpGrid(e);
            }}
            onClick={() => {
              if (!isDraggingGrid) handleToggle();
            }}
            className={`flex items-center justify-between gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-cyan-500/20 transition-colors select-none ${
              modoArrastar ? "cursor-grab active:cursor-grabbing hover:bg-emerald-950/20" : "cursor-pointer hover:bg-cyan-950/30"
            }`}
          >
            {/* Título & Identificador */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 shadow-[0_0_8px_rgba(0,255,255,0.3)] shrink-0">
                <Keyboard className="h-3.5 w-3.5 text-neon-cyan" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[8.5px] uppercase tracking-wider text-neon-cyan leading-none">
                    Entrada Rápida
                  </span>
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-950/80 px-1.5 py-0.2 font-mono text-[7.5px] font-black text-[#00FF88] leading-none">
                    REGISTRO AO VIVO
                  </span>
                  {modoArrastar && (
                    <span className="rounded-full border border-emerald-400/60 bg-emerald-950/90 px-1.5 py-0.2 font-mono text-[7.5px] font-black text-[#00FF88] leading-none animate-pulse">
                      ✥ GRID LIVRE
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xs sm:text-sm font-black tracking-wide text-neon-cyan text-stroke-black-sm drop-shadow-[0_0_6px_#00FFFF] truncate">
                  TECLADO DE DIGITAÇÃO
                </h2>
              </div>
            </div>

            {/* Chip Central: Informações do Último Giro & P&L Rápido */}
            <div className="hidden sm:flex items-center gap-2">
              {ultimo ? (
                <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-black/80 px-2.5 py-0.5 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                  <span className="text-[9px] font-black uppercase text-white/60">Último:</span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full font-mono text-[10px] font-black ${
                      ultimo.num === 0
                        ? "bg-[#00E676] text-black"
                        : ultimoCor === "red"
                          ? "bg-[#FF003C] text-white border border-[#FF003C] shadow-[0_0_8px_#FF003C]"
                          : "bg-[#000000] text-white border border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                    }`}
                  >
                    {ultimo.num}
                  </span>
                  {ultimoSetor && (
                    <span className="font-mono text-[9px] font-bold text-neon-gold">
                      · {ultimoSetor}
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-mono text-[10px] font-bold text-white/50">
                  Pronto para registrar
                </span>
              )}

              {/* Badge P&L da Sessão Operacional */}
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[9.5px] font-black border ${
                  sessao.lucroLiquidoSessao >= 0
                    ? "border-emerald-500/40 bg-emerald-950/60 text-[#00E676]"
                    : "border-rose-500/40 bg-rose-950/60 text-[#FF1744]"
                }`}
                title="P&L acumulado das operações nesta sessão"
              >
                <span>P&L:</span>
                <span>
                  {sessao.lucroLiquidoSessao >= 0 ? "+" : ""}
                  R$ {sessao.lucroLiquidoSessao.toFixed(2)}
                </span>
              </div>

              {/* Chip Roxo Neon: Status da Entrada ao Vivo */}
              <div
                className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#B026FF] bg-[#220438]/90 px-2.5 py-0.5 shadow-[0_0_8px_rgba(176,38,255,0.6)] font-mono text-[9.5px] font-black text-white"
                title={
                  analiseEspecialista.temOportunidadeAssertiva
                    ? `Melhor Entrada: ${analiseEspecialista.alvoPrincipal} (${analiseEspecialista.confluenciaPerc}% Confluência)`
                    : `Aguardando: ${analiseEspecialista.motivoEspera}`
                }
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B026FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-[0_0_4px_#fff]"></span>
                </span>
                {analiseEspecialista.temOportunidadeAssertiva ? (
                  <span className="text-white drop-shadow-[0_0_3px_#fff]">
                    🎯 {analiseEspecialista.alvoPrincipal} ({analiseEspecialista.confluenciaPerc}%)
                  </span>
                ) : (
                  <span className="text-white opacity-95">
                    ⏳ AGUARDANDO CONFLUÊNCIA
                  </span>
                )}
              </div>
            </div>

            {/* Ações da Direita: Modo Arrastar, Ajustar Tamanho, Desfazer Rápido e Botão Recolher/Expandir */}
            <div className="flex items-center gap-1.5 shrink-0 no-drag" onClick={(e) => e.stopPropagation()}>
              {/* Botão Modo Arrastar o Grid */}
              <button
                type="button"
                onClick={toggleModoArrastar}
                title={
                  modoArrastar
                    ? "Modo Arrastar ATIVO: Clique para voltar e encaixar o teclado no rodapé"
                    : "Ativar Modo Arrastar: Permite mover o grid do teclado livremente para qualquer lugar da tela"
                }
                aria-label="Alternar modo de arrastar o grid"
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-display text-[10px] font-black uppercase transition-all cursor-pointer ${
                  modoArrastar
                    ? "border-emerald-400 bg-emerald-950/90 text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.6)] animate-pulse"
                    : "border-cyan-500/40 bg-black/80 text-neon-cyan hover:bg-cyan-950/60 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                }`}
              >
                <Move className="h-3 w-3" />
                <span className="hidden xs:inline">
                  {modoArrastar ? "Arrastar: ON" : "Modo Arrastar"}
                </span>
                <span className="xs:hidden">
                  {modoArrastar ? "ON" : "Arrastar"}
                </span>
              </button>

              {/* Botão Encaixar no Rodapé quando no modo arrastar */}
              {modoArrastar && (
                <button
                  type="button"
                  onClick={handleEncaixarRodape}
                  title="Encaixar teclado de volta fixo no rodapé"
                  className="hidden md:flex items-center gap-1 rounded-lg border border-yellow-400/50 bg-yellow-950/70 px-2 py-1 font-display text-[9.5px] font-black uppercase text-yellow-300 hover:bg-yellow-900/80 transition-all cursor-pointer shadow-[0_0_8px_rgba(250,204,21,0.3)]"
                >
                  <span>Encaixar Rodapé</span>
                </button>
              )}

              {/* Botão Ajustar Tamanho Manualmente */}
              <button
                type="button"
                onClick={() => setMostrarControleTamanho((v) => !v)}
                title="Ajustar tamanho manualmente do teclado"
                aria-label="Ajustar tamanho do teclado"
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-display text-[10px] font-black uppercase transition-all cursor-pointer ${
                  mostrarControleTamanho || escala !== 100
                    ? "border-yellow-400 bg-yellow-950/70 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                    : "border-cyan-500/40 bg-black/80 text-neon-cyan hover:bg-cyan-950/60 hover:border-cyan-400"
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span className="hidden xs:inline">Tam:</span>
                <span>{escala}%</span>
              </button>

              {onUndo && spins.length > 0 && (
                <button
                  type="button"
                  onClick={onUndo}
                  title="Desfazer último giro registrado"
                  aria-label="Desfazer último giro"
                  className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-black/80 px-2 py-1 font-display text-[10px] font-black text-neon-cyan hover:bg-cyan-950/60 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,255,255,0.4)] transition-all cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-neon-cyan" />
                  <span className="hidden sm:inline">Desfazer</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggle}
                aria-label={open ? "Recolher teclado de digitação" : "Expandir teclado de digitação"}
                className={`flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 font-display text-[10px] sm:text-[11px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                  open
                    ? "border border-cyan-400/50 bg-cyan-950/70 text-neon-cyan hover:bg-cyan-900/60 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                    : "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.7)] animate-pulse"
                }`}
              >
                {open ? (
                  <>
                    <span className="hidden xs:inline">Recolher</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Expandir</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CORPO EXPANSÍVEL DO TECLADO */}
          {open && (
            <div className="p-2 sm:p-3 max-h-[60vh] sm:max-h-[68vh] overflow-y-auto no-scrollbar flex flex-col gap-2.5">
              <div className="mx-auto w-full max-w-xl">
                {/* MINI GRÁFICO ALERTANDO A ENTRADA & COMPARAÇÃO DÚZIA/COLUNA DO PADRÃO VS MAIOR % DA MESA */}
                <div className="mb-2 rounded-xl border border-white/15 bg-black/90 p-2.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] font-mono text-[9px]">
                  {/* Cabeçalho do Alerta (Conforme Padrão do Painel) */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/10 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${
                          analiseTatica.decision.veredicto === "forte"
                            ? "border-[#00FF88] bg-[#00FF88]/20 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)] animate-pulse"
                            : analiseTatica.decision.veredicto === "atencao"
                              ? "border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                              : "border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            analiseTatica.decision.veredicto === "forte"
                              ? "bg-[#00FF88]"
                              : analiseTatica.decision.veredicto === "atencao"
                                ? "bg-[#FACC15]"
                                : "bg-rose-500"
                          }`}
                        />
                        {analiseTatica.decision.badgeText}
                      </span>
                      <span
                        className="text-[8px] text-white/70 truncate max-w-[220px] sm:max-w-[320px]"
                        title={analiseTatica.decision.sugestaoAposta}
                      >
                        {analiseTatica.decision.sugestaoAposta}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-[#FFA000]">
                        Entrada Sugerida:{" "}
                        <strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                          R${" "}
                          {(operacao.emAndamento
                            ? (operacao.valorApostaAtual ?? 5)
                            : (config.valorEntradaInicial ?? 5) * 2
                          ).toFixed(2)}
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => setMostrarMiniGrafico(!mostrarMiniGrafico)}
                        className="text-[8px] text-cyan-300 hover:text-white underline cursor-pointer"
                        title="Alternar detalhes do mini gráfico comparativo"
                      >
                        {mostrarMiniGrafico ? "Ocultar Comparativo" : "Ver Comparativo"}
                      </button>
                    </div>
                  </div>

                  {/* Dúzia do Padrão e Coluna do Padrão */}
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg bg-black/80 p-1.5 border border-white/10 flex items-center justify-between">
                      <span className="text-white/70">Dúzia Padrão:</span>
                      <strong className="text-neon-gold font-black">
                        {analiseTatica.bestDozen.name} ({(analiseTatica.bestDozen.targetPerc ?? 0).toFixed(0)}%)
                      </strong>
                    </div>
                    <div className="rounded-lg bg-black/80 p-1.5 border border-white/10 flex items-center justify-between">
                      <span className="text-white/70">Coluna Padrão:</span>
                      <strong className="text-neon-gold font-black">
                        {analiseTatica.bestColumn.name} ({(analiseTatica.bestColumn.targetPerc ?? 0).toFixed(0)}%)
                      </strong>
                    </div>
                  </div>

                  {/* Chances Simples */}
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[8px] text-white/80 border-t border-white/5 pt-1">
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: analiseTatica.chancesSimples.cor.corCode }}
                      />
                      <span>
                        {analiseTatica.chancesSimples.cor.predominante} (
                        {(analiseTatica.chancesSimples.cor.perc ?? 0).toFixed(0)}%)
                      </span>
                    </span>
                    <span>
                      Paridade:{" "}
                      <strong className="text-neon-cyan font-bold">
                        {analiseTatica.chancesSimples.paridade.predominante} (
                        {(analiseTatica.chancesSimples.paridade.perc ?? 0).toFixed(0)}%)
                      </strong>
                    </span>
                    <span>
                      <strong className="text-neon-magenta font-bold">
                        {analiseTatica.chancesSimples.magnitude.predominante} (
                        {(analiseTatica.chancesSimples.magnitude.perc ?? 0).toFixed(0)}%)
                      </strong>
                    </span>
                  </div>

                  {/* MINI GRÁFICO COMPARATIVO: DÚZIA E COLUNA DO PADRÃO VS MAIOR % NO MOMENTO */}
                  {mostrarMiniGrafico && (
                    <div className="mt-2 rounded-lg border border-cyan-500/20 bg-[#040c14]/90 p-2 space-y-2">
                      <div className="flex items-center justify-between text-[8px] border-b border-white/10 pb-1">
                        <span className="font-bold text-cyan-300 uppercase flex items-center gap-1">
                          <BarChart2 className="h-3 w-3 text-cyan-400" />
                          COMPARAÇÃO DO PADRÃO VS MAIOR % NO MOMENTO
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-white/70">
                            <span className="text-amber-400 font-bold">🎯</span> Padrão
                          </span>
                          <span className="flex items-center gap-0.5 text-white/70">
                            <span className="text-emerald-400 font-bold">🔥</span> Maior % Mesa
                          </span>
                        </div>
                      </div>

                      {/* COMPARAÇÃO DE DÚZIAS */}
                      <div>
                        <div className="flex items-center justify-between text-[8px] mb-1">
                          <span className="text-white/80 font-bold">DÚZIAS:</span>
                          <div className="flex items-center gap-1.5">
                            {analiseTatica.isDuziaConfluente ? (
                              <span className="rounded bg-[#00FF88]/20 px-1.5 py-0.2 text-[7.5px] font-black text-[#00FF88] border border-[#00FF88]/40 shadow-[0_0_6px_rgba(0,255,136,0.3)]">
                                🔥 100% CONFLUENTE ({analiseTatica.bestDozen?.name ?? "Dúzia"})
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[7.5px] font-bold text-amber-300 border border-amber-500/30">
                                ⚠️ Padrão: {analiseTatica.bestDozen?.name ?? "Dz"} vs Maior: {analiseTatica.maiorDuzia?.nome ?? "Dz"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelecionarAlvoRapido("duzia", (analiseTatica.bestDozen?.idx ?? 1) as 1 | 2 | 3)}
                              className="rounded bg-white/10 hover:bg-white/20 px-1 py-0.2 text-[7px] text-white cursor-pointer"
                              title="Usar Dúzia do Padrão na Gestão"
                            >
                              Aplicar Padrão
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelecionarAlvoRapido("duzia", (analiseTatica.maiorDuzia?.idx ?? 1) as 1 | 2 | 3)}
                              className="rounded bg-emerald-950/80 hover:bg-emerald-900 px-1 py-0.2 text-[7px] text-[#00FF88] border border-[#00FF88]/30 cursor-pointer"
                              title="Usar Dúzia Líder da Mesa na Gestão"
                            >
                              Aplicar Maior %
                            </button>
                          </div>
                        </div>

                        {/* Mini Barras das 3 Dúzias */}
                        <div className="grid grid-cols-3 gap-1">
                          {gruposMesa.duzias.map((d) => {
                            const isPadrao = analiseTatica.bestDozen?.idx === d.idx;
                            const isMaior = analiseTatica.maiorDuzia?.idx === d.idx;
                            const percVal = d.perc ?? 0;
                            return (
                              <div
                                key={`graf-dz-${d.idx}`}
                                className={`rounded p-1 border flex flex-col gap-0.5 transition ${
                                  isPadrao && isMaior
                                    ? "border-[#00FF88] bg-emerald-950/40 shadow-[0_0_8px_rgba(0,255,136,0.25)]"
                                    : isPadrao
                                      ? "border-amber-400/60 bg-amber-950/30"
                                      : isMaior
                                        ? "border-cyan-400/60 bg-cyan-950/30"
                                        : "border-white/10 bg-black/50"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[7.5px]">
                                  <span className="font-bold text-white/90">{d.nome}</span>
                                  <div className="flex items-center gap-0.5">
                                    {isPadrao && <span title="Alvo do Padrão">🎯</span>}
                                    {isMaior && <span title="Maior % da Mesa">🔥</span>}
                                    <span className="font-mono font-bold text-white">{percVal.toFixed(0)}%</span>
                                  </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isPadrao && isMaior
                                        ? "bg-[#00FF88]"
                                        : isPadrao
                                          ? "bg-amber-400"
                                          : isMaior
                                            ? "bg-[#08f7fe]"
                                            : "bg-white/30"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(8, percVal))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* COMPARAÇÃO DE COLUNAS */}
                      <div>
                        <div className="flex items-center justify-between text-[8px] mb-1">
                          <span className="text-white/80 font-bold">COLUNAS:</span>
                          <div className="flex items-center gap-1.5">
                            {analiseTatica.isColunaConfluente ? (
                              <span className="rounded bg-[#08f7fe]/20 px-1.5 py-0.2 text-[7.5px] font-black text-[#08f7fe] border border-[#08f7fe]/40 shadow-[0_0_6px_rgba(8,247,254,0.3)]">
                                🔥 100% CONFLUENTE ({analiseTatica.bestColumn?.name ?? "Coluna"})
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[7.5px] font-bold text-amber-300 border border-amber-500/30">
                                ⚠️ Padrão: {analiseTatica.bestColumn?.name ?? "Col"} vs Maior: {analiseTatica.maiorColuna?.nome ?? "Col"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelecionarAlvoRapido("coluna", (analiseTatica.bestColumn?.idx ?? 1) as 1 | 2 | 3)}
                              className="rounded bg-white/10 hover:bg-white/20 px-1 py-0.2 text-[7px] text-white cursor-pointer"
                              title="Usar Coluna do Padrão na Gestão"
                            >
                              Aplicar Padrão
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelecionarAlvoRapido("coluna", (analiseTatica.maiorColuna?.idx ?? 1) as 1 | 2 | 3)}
                              className="rounded bg-cyan-950/80 hover:bg-cyan-900 px-1 py-0.2 text-[7px] text-[#08f7fe] border border-cyan-400/30 cursor-pointer"
                              title="Usar Coluna Líder da Mesa na Gestão"
                            >
                              Aplicar Maior %
                            </button>
                          </div>
                        </div>

                        {/* Mini Barras das 3 Colunas */}
                        <div className="grid grid-cols-3 gap-1">
                          {gruposMesa.colunas.map((c) => {
                            const isPadrao = analiseTatica.bestColumn?.idx === c.idx;
                            const isMaior = analiseTatica.maiorColuna?.idx === c.idx;
                            const percVal = c.perc ?? 0;
                            return (
                              <div
                                key={`graf-col-${c.idx}`}
                                className={`rounded p-1 border flex flex-col gap-0.5 transition ${
                                  isPadrao && isMaior
                                    ? "border-[#08f7fe] bg-cyan-950/40 shadow-[0_0_8px_rgba(8,247,254,0.25)]"
                                    : isPadrao
                                      ? "border-amber-400/60 bg-amber-950/30"
                                      : isMaior
                                        ? "border-cyan-400/60 bg-cyan-950/30"
                                        : "border-white/10 bg-black/50"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[7.5px]">
                                  <span className="font-bold text-white/90">{c.nome}</span>
                                  <div className="flex items-center gap-0.5">
                                    {isPadrao && <span title="Alvo do Padrão">🎯</span>}
                                    {isMaior && <span title="Maior % da Mesa">🔥</span>}
                                    <span className="font-mono font-bold text-white">{percVal.toFixed(0)}%</span>
                                  </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isPadrao && isMaior
                                        ? "bg-[#08f7fe]"
                                        : isPadrao
                                          ? "bg-amber-400"
                                          : isMaior
                                            ? "bg-[#08f7fe]"
                                            : "bg-white/30"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(8, percVal))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. CONTROLE MANUAL DE TAMANHO (SLIDER / PRESETS EXPANSÍVEIS) */}
                {mostrarControleTamanho && (
                  <div className="mb-2.5 rounded-xl border border-yellow-400/60 bg-[#080d16] p-2.5 shadow-[0_0_20px_rgba(250,204,21,0.25)] flex flex-col gap-2 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-yellow-300 font-bold flex items-center gap-1.5">
                        <ZoomIn className="h-3.5 w-3.5 text-yellow-400" />
                        AJUSTAR TAMANHO DO TECLADO:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-yellow-400 text-xs">{escala}%</span>
                        {escala !== 100 && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEscala(100)}
                            className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                            title="Restaurar tamanho original 100%"
                          >
                            Resetar 100%
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateEscala(escala - 5)}
                        disabled={escala <= 60}
                        className="flex h-6 w-7 items-center justify-center rounded bg-white/10 text-white font-bold hover:bg-yellow-400/30 disabled:opacity-30 cursor-pointer"
                        title="Diminuir teclas (-5%)"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={60}
                        max={150}
                        step={5}
                        value={escala}
                        onChange={(e) => handleUpdateEscala(Number(e.target.value))}
                        className="h-1.5 flex-1 accent-yellow-400 cursor-pointer"
                        aria-label="Controle deslizante de escala do teclado"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateEscala(escala + 5)}
                        disabled={escala >= 150}
                        className="flex h-6 w-7 items-center justify-center rounded bg-white/10 text-white font-bold hover:bg-yellow-400/30 disabled:opacity-30 cursor-pointer"
                        title="Aumentar teclas (+5%)"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-white/10 text-[8.5px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 uppercase">Escala:</span>
                        {[70, 85, 100, 115, 130].map((preset) => (
                          <button
                            key={`dock-preset-${preset}`}
                            type="button"
                            onClick={() => handleUpdateEscala(preset)}
                            className={`rounded px-1.5 py-0.5 font-black cursor-pointer border ${
                              escala === preset
                                ? "border-yellow-400 bg-yellow-400 text-black font-black"
                                : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 uppercase">Largura:</span>
                        <button
                          type="button"
                          onClick={() => handleSetLarguraPreset("compacto")}
                          className={`rounded px-1.5 py-0.5 font-bold cursor-pointer border ${
                            larguraPx <= 700
                              ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                              : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                          }`}
                        >
                          680px
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLarguraPreset("padrao")}
                          className={`rounded px-1.5 py-0.5 font-bold cursor-pointer border ${
                            larguraPx === 896
                              ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                              : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                          }`}
                        >
                          896px
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLarguraPreset("amplo")}
                          className={`rounded px-1.5 py-0.5 font-bold cursor-pointer border ${
                            larguraPx === 1180
                              ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                              : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                          }`}
                        >
                          1180px
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLarguraPreset("total")}
                          className={`rounded px-1.5 py-0.5 font-bold cursor-pointer border ${
                            larguraPx > 1300
                              ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                              : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                          }`}
                        >
                          Cheia
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    TARJA FINA ROXO NEON COM LETRA PURO BRANCO - ALERTA AO VIVO DO ESPECIALISTA
                    ========================================================================= */}
                <div
                  className="w-full mb-2 overflow-hidden rounded-xl border-2 border-[#B026FF] bg-gradient-to-r from-[#170329] via-[#330752] to-[#170329] shadow-[0_0_18px_rgba(176,38,255,0.7),inset_0_0_10px_rgba(176,38,255,0.25)] select-none transition-all py-1.5 px-2.5 sm:px-3"
                  style={{ borderColor: "#B026FF" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono">
                    {/* LADO ESQUERDO: ÍCONE AO VIVO + STATUS PRINCIPAL */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B026FF] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-[0_0_6px_#FFFFFF]"></span>
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-white bg-[#581c87] px-1.5 py-0.2 rounded border border-[#B026FF]">
                          AO VIVO
                        </span>
                      </div>

                      {analiseEspecialista.temOportunidadeAssertiva ? (
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-white text-xs sm:text-[13px] font-black tracking-tight drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]">
                            🎯 MELHOR ENTRADA:
                          </span>
                          <span className="bg-white text-black font-black px-2 py-0.5 rounded text-xs sm:text-sm shadow-[0_0_12px_#FFFFFF] tracking-wider uppercase">
                            {analiseEspecialista.alvoPrincipal}
                          </span>
                          <span className="text-white text-[11px] font-black tracking-wide">
                            ({analiseEspecialista.confluenciaPerc}% CONFLUÊNCIA ASSERTIVA)
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-white text-xs sm:text-[12.5px] font-black tracking-tight drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]">
                            ⏳ AGUARDANDO CONFLUÊNCIA ASSERTIVA — MERCADO EM TRANSIÇÃO / SEM GATILHO SNIPER
                          </span>
                        </div>
                      )}
                    </div>

                    {/* LADO DIREITO: GATILHO, COBERTURA OU MOTIVO DA ESPERA */}
                    <div className="flex items-center gap-2 shrink-0">
                      {analiseEspecialista.temOportunidadeAssertiva ? (
                        <div className="flex items-center gap-1.5">
                          {analiseEspecialista.coberturaNumeros.length > 0 && (
                            <div className="hidden md:flex items-center gap-1 text-[10px] text-white">
                              <span className="opacity-90 font-black">Cobertura:</span>
                              <div className="flex gap-1 font-black">
                                {analiseEspecialista.coberturaNumeros.slice(0, 5).map((num) => (
                                  <span
                                    key={`cob-${num}`}
                                    className="h-4 w-4 rounded-full bg-white text-black flex items-center justify-center text-[9px] font-black"
                                  >
                                    {num}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (analiseEspecialista.tipoEntrada && analiseEspecialista.alvoValor !== null) {
                                handleSelecionarAlvoRapido(analiseEspecialista.tipoEntrada, analiseEspecialista.alvoValor);
                                acionarEntrada();
                              }
                            }}
                            className="flex items-center gap-1 rounded bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase hover:bg-slate-200 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                            title="Aplicar esta entrada recomendada na gestão operacional"
                          >
                            <Zap className="h-3 w-3 fill-black text-black" />
                            <span>APLICAR ENTRADA</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-white">
                          <span className="hidden sm:inline opacity-90 font-medium">
                            {analiseEspecialista.motivoEspera}
                          </span>
                          <span className="rounded bg-black/70 px-2 py-0.5 text-[9px] font-black text-white border border-white/40">
                            PROTEJA A BANCA
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SUB-LINHA TÁTICA: LEITURA PÓS-NÚMERO DIGITADO */}
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-purple-500/30 text-[9px] sm:text-[9.5px] font-mono text-white">
                    <div className="flex items-center gap-1.5 opacity-95">
                      <span className="font-extrabold uppercase">LEITURA PÓS-GIRO ({ultimo ? `Nº ${ultimo.num}` : "SEM GIRO"}):</span>
                      <span>{analiseEspecialista.detalhesGatilho}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-90">Confluência: {analiseEspecialista.confluenciaPerc}%</span>
                      <span className="text-white font-bold">· Especialista Roleta Europeia</span>
                    </div>
                  </div>
                </div>

                {/* 5. TARJA AMARELO NEON FIXA NO TECLADO COM CORES, SETORES (V/T/O), MAIS FORTE E PUXADAS */}
                <div className="w-full mb-2.5 overflow-hidden rounded-xl border-2 border-black/80 bg-[#FFFF00] shadow-[0_0_22px_rgba(255,255,0,0.75),inset_0_0_10px_rgba(255,255,255,0.4)] select-none">
                  {/* BARRA SUPERIOR DA TARJA: TÍTULO, NÚMERO MAIS FORTE & NÚMEROS PUXADOS */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#FFEE00] border-b border-black/20">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-black animate-ping" />
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-black font-mono flex items-center gap-1">
                        ⚡ ÚLTIMAS RODADAS
                      </span>
                    </div>

                    {/* DESTAQUES OPERACIONAIS: MAIS FORTE PRA SAIR & PUXADAS */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* NÚMERO MAIS FORTE PRA SAIR */}
                      {numeroMaisForte && (
                        <div
                          className="flex items-center gap-1 rounded-md bg-black px-2 py-0.5 shadow-sm text-[9.5px] font-mono border border-black/80"
                          title={`Número estatisticamente mais forte para o próximo giro: ${numeroMaisForte.num} (${numeroMaisForte.justificativa})`}
                        >
                          <span className="text-[#FFFF00] font-black uppercase text-[8px] sm:text-[8.5px]">
                            🔥 MAIS FORTE:
                          </span>
                          <span
                            className={`font-black px-1.5 py-0.2 rounded text-[10px] leading-tight ${
                              numeroMaisForte.cor === "red"
                                ? "bg-[#FF003C] text-white"
                                : numeroMaisForte.cor === "green"
                                ? "bg-[#00E676] text-black"
                                : "bg-[#16181e] text-white border border-white/50"
                            }`}
                          >
                            {numeroMaisForte.num}
                            <small className="ml-0.5 text-[8px] opacity-90 font-extrabold">
                              {getSetorLetra(numeroMaisForte.num)}
                            </small>
                          </span>
                          <span className="text-[#FFFF00] text-[8.5px] font-black">
                            {Number(numeroMaisForte.score).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {/* NÚMEROS QUE O ÚLTIMO SORTEADO PUXA */}
                      {puxadasDoUltimo.length > 0 && ultimoNumeroNum !== null && (
                        <div
                          className="flex items-center gap-1 rounded-md bg-black/90 px-2 py-0.5 text-[9.5px] font-mono text-white border border-black/60"
                          title={`Transições históricas: números que o último sorteado (${ultimoNumeroNum}) mais atrai/puxa`}
                        >
                          <span className="text-[#FFFF00] font-bold uppercase text-[8px] sm:text-[8.5px]">
                            🧲 PUXA ({ultimoNumeroNum}):
                          </span>
                          <div className="flex items-center gap-0.5">
                            {puxadasDoUltimo.map((pNum) => {
                              const pCor = pNum === 0 ? "green" : REDS.includes(pNum) ? "red" : "black";
                              return (
                                <span
                                  key={`puxa-${pNum}`}
                                  className={`font-black px-1 py-0.2 rounded text-[9px] leading-tight ${
                                    pCor === "red"
                                      ? "bg-[#FF003C] text-white"
                                      : pCor === "green"
                                      ? "bg-[#00E676] text-black"
                                      : "bg-zinc-800 text-white border border-white/30"
                                  }`}
                                  title={`Puxado por ${ultimoNumeroNum}: ${pNum} (${getSetorLetra(pNum)})`}
                                >
                                  {pNum}
                                  <small className="ml-0.5 text-[7px] opacity-80">{getSetorLetra(pNum)}</small>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <span className="text-[9px] font-black text-black/85 font-mono shrink-0">
                        {spins.length > 0 ? `${spins.length} giros` : "0 giros"}
                      </span>
                    </div>
                  </div>

                  {/* FITA HORIZONTAL DESLIZANTE: CORES REAIS DA ROLETA + LETRA DO SETOR (V/T/O) */}
                  <div className="flex items-center gap-1.5 px-2 py-2 overflow-x-auto no-scrollbar bg-[#FFFF00]">
                    {spins.length === 0 ? (
                      <span className="text-[10px] font-black text-black/70 py-1 font-mono">
                        Nenhum giro registrado ainda no sistema
                      </span>
                    ) : (
                      spins.slice(0, 35).map((s, idx) => {
                        const num = s.num;
                        const cor = num === 0 ? "green" : REDS.includes(num) ? "red" : "black";
                        const setorLetra = getSetorLetra(num);
                        const isUltimo = idx === 0;

                        let corBadge = "";
                        if (cor === "green") {
                          corBadge =
                            "bg-gradient-to-b from-[#00E676] to-[#009624] text-black border-2 border-[#00c853] shadow-[0_0_8px_rgba(0,230,118,0.7)]";
                        } else if (cor === "red") {
                          corBadge =
                            "bg-gradient-to-b from-[#FF1744] to-[#C51162] text-white border-2 border-[#FF003C] shadow-[0_0_8px_rgba(255,0,60,0.6)]";
                        } else {
                          corBadge =
                            "bg-gradient-to-b from-[#212121] to-[#000000] text-white border-2 border-white/70 shadow-[0_0_8px_rgba(0,0,0,0.85)]";
                        }

                        return (
                          <div
                            key={`dock-rodada-neon-${s.id || idx}-${num}`}
                            className={`relative flex flex-col items-center justify-center shrink-0 min-w-[34px] sm:min-w-[38px] h-10 px-1 rounded-lg font-mono font-black transition-all cursor-default select-none ${corBadge} ${
                              isUltimo ? "ring-2 ring-black scale-105 z-10 shadow-[0_0_12px_rgba(0,0,0,0.9)]" : ""
                            }`}
                            title={`Giro #${spins.length - idx}: ${num} (${cor.toUpperCase()}) · Setor: ${
                              setorLetra === "V"
                                ? "Voisins du Zéro"
                                : setorLetra === "T"
                                ? "Tiers du Cylindre"
                                : "Orphelins"
                            }${isUltimo ? " [ÚLTIMO REGISTRADO]" : ""}`}
                          >
                            {/* TAG DE 1º GIRO REGISTRADO */}
                            {isUltimo && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center rounded bg-black px-1 text-[7px] font-black uppercase text-[#FFFF00] border border-[#FFFF00] shadow leading-tight">
                                1º
                              </span>
                            )}

                            {/* NÚMERO COM A COR REAL DA ROLETA */}
                            <span
                              className={`text-xs sm:text-sm font-black leading-none ${
                                cor === "green"
                                  ? "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
                                  : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                              }`}
                            >
                              {num}
                            </span>

                            {/* LETRA DO SETOR (V / T / O) */}
                            <span
                              className={`mt-0.5 text-[7.5px] font-black leading-none uppercase tracking-tight rounded-xs px-1 ${
                                cor === "green"
                                  ? "bg-black/20 text-black"
                                  : setorLetra === "V"
                                  ? "bg-cyan-950/80 text-cyan-300 border border-cyan-400/40"
                                  : setorLetra === "T"
                                  ? "bg-amber-950/80 text-amber-300 border border-amber-400/40"
                                  : "bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-400/40"
                              }`}
                            >
                              {setorLetra}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 6. TECLADO NUMÉRICO COM ESCALA DINÂMICA E BOTÃO MOVER GRID */}
                <Keypad
                  onPick={handlePickNumero}
                  onUndo={onUndo}
                  spins={spins}
                  escala={escala}
                  onToggleDrag={() => setModoArrastar(!modoArrastar)}
                  isDragging={modoArrastar}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

