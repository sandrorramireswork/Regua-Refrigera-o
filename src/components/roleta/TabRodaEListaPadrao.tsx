import { useCallback, useMemo, useState } from "react";
import {
  Disc3,
  ListOrdered,
  Columns2,
  Sparkles,
  Flame,
  Award,
  Compass,
  Crosshair,
  TrendingUp,
  Target,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  CILINDRO,
  calcEstatisticas,
  calcGrupos,
  calcTransicoes,
  getProps,
  vizinhos,
  VOISINS,
  TIERS,
  ORPHELINS,
  REDS,
  type Spin,
} from "@/lib/roulette";
import { anguloDe } from "@/lib/quant";

interface TabRodaEListaPadraoProps {
  spins: Spin[];
  onAddSpin?: (num: number) => void;
}

type ModoVisualizacao = "completo" | "apenas_roda" | "apenas_lista";
type FiltroSetor =
  | "todos"
  | "voisins"
  | "tiers"
  | "orphelins"
  | "vizinhos"
  | "puxadas"
  | "atrasados"
  | "quentes";

type Ordenacao = "cilindro" | "numerica" | "saidas" | "espera";

function corDoNumero(n: number) {
  return n === 0 ? "#00E676" : REDS.includes(n) ? "#FF003C" : "#000000";
}

function inicialSetor(setor: string) {
  return setor && setor !== "—" ? setor.charAt(0).toUpperCase() : "";
}

// Sequência da Pista (Racetrack) dividida em 2 linhas:
// Linha 1 (Superior): 19 números começando no ZERO (0 a 10 no sentido horário)
const PISTA_LINHA_1 = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10];

// Linha 2 (Inferior - Circuito Racetrack Contínuo):
// Na pista oval da roleta padrão, o 10 conecta com o 5 na ponta direita e o 26 conecta com o 0 na ponta esquerda.
// Portanto, abaixo do 0 fica o 26, abaixo do 32 fica o 3, ..., e abaixo do 10 fica o 5!
const PISTA_LINHA_2_CIRCUITO = [26, 3, 35, 12, 28, 7, 29, 18, 22, 9, 31, 14, 20, 1, 33, 16, 24, 5];

// Linha 2 alternativa (Opostos do cilindro na sequência horária direta de 5 a 26):
const PISTA_LINHA_2_OPOSTOS = [5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

/**
 * TabRodaEListaPadrao — Painel Tático Nível Hard
 * Integração Master entre a Roda ao Vivo (Cilindro 3D) e a Lista Roleta Padrão (37 Números).
 */
export function TabRodaEListaPadrao({ spins, onAddSpin }: TabRodaEListaPadraoProps) {
  const [modo, setModo] = useState<ModoVisualizacao>("completo");
  const [filtro, setFiltro] = useState<FiltroSetor>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("cilindro");
  const [formatoPista, setFormatoPista] = useState<"circuito" | "opostos">("circuito");
  const [focoNumero, setFocoNumero] = useState<number | null>(null);

  const ultimo = spins[0]?.num;
  const u1 = spins[0]?.num;
  const u2 = spins[1]?.num;
  const u3 = spins[2]?.num;

  // Destaque tático dos 3 últimos números com cores neon diferenciadas
  const getDestaqueUltimo = useCallback(
    (num: number) => {
      if (num === u1 && u1 !== undefined) {
        return {
          pos: 1 as const,
          label: "1º",
          fullLabel: "1º ÚLTIMO",
          corNeon: "#00FFFF",
          ringClass: "ring-4 ring-cyan-300 z-30",
          shadowStyle:
            "0 0 24px rgba(0, 255, 255, 0.95), 0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(0, 255, 255, 0.7)",
          badgeClass: "bg-cyan-300 text-black shadow-[0_0_12px_#00FFFF]",
          scaleClass: "scale-115",
        };
      }
      if (num === u2 && u2 !== undefined) {
        return {
          pos: 2 as const,
          label: "2º",
          fullLabel: "2º ÚLTIMO",
          corNeon: "#FFD600",
          ringClass: "ring-3 ring-amber-400 z-20",
          shadowStyle:
            "0 0 20px rgba(255, 214, 0, 0.9), 0 0 32px rgba(255, 214, 0, 0.5), inset 0 0 8px rgba(255, 214, 0, 0.6)",
          badgeClass: "bg-amber-400 text-black shadow-[0_0_12px_#FFD600]",
          scaleClass: "scale-110",
        };
      }
      if (num === u3 && u3 !== undefined) {
        return {
          pos: 3 as const,
          label: "3º",
          fullLabel: "3º ÚLTIMO",
          corNeon: "#FF10F0",
          ringClass: "ring-3 ring-fuchsia-400 z-10",
          shadowStyle:
            "0 0 18px rgba(255, 16, 240, 0.9), 0 0 30px rgba(255, 16, 240, 0.5), inset 0 0 8px rgba(255, 16, 240, 0.6)",
          badgeClass: "bg-fuchsia-400 text-white shadow-[0_0_12px_#FF10F0]",
          scaleClass: "scale-105",
        };
      }
      return null;
    },
    [u1, u2, u3],
  );

  // 1. Estatísticas globais da sessão
  const estat = useMemo(() => calcEstatisticas(spins), [spins]);
  const maxQtd = useMemo(() => Math.max(1, ...estat.map((e) => e.qtd)), [estat]);
  const esperado = spins.length / 37;

  // 2. Vizinhos do último número no cilindro (2 de cada lado)
  const amarelos = useMemo(
    () => (ultimo === undefined ? new Set<number>() : new Set(vizinhos(ultimo, 2))),
    [ultimo],
  );

  // 3. Puxadas diretas do último número
  const puxadas = useMemo(() => {
    if (ultimo === undefined) return [] as { destino: number; qtd: number; perc: number }[];
    return calcTransicoes(spins, { minCount: 1, topN: 2000, windowSize: 1000 })
      .filter((t) => t.origem === ultimo)
      .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
      .slice(0, 5)
      .map((t) => ({ destino: t.destino, qtd: t.qtd, perc: t.perc }));
  }, [spins, ultimo]);

  const verdes = useMemo(() => new Set(puxadas.map((p) => p.destino)), [puxadas]);

  // 4. Vizinhos imediatos e o que cada um puxa
  const puxadasVizinhos = useMemo(() => {
    if (ultimo === undefined) return [];
    const todas = calcTransicoes(spins, { minCount: 1, topN: 5000, windowSize: 1000 });
    return vizinhos(ultimo, 2)
      .filter((v) => v !== ultimo)
      .map((vz) => ({
        vizinho: vz,
        alvos: todas
          .filter((t) => t.origem === vz)
          .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
          .slice(0, 3)
          .map((t) => ({ destino: t.destino, qtd: t.qtd, perc: t.perc })),
      }));
  }, [spins, ultimo]);

  const cianos = useMemo(
    () => new Set(puxadasVizinhos.flatMap((v) => v.alvos.map((a) => a.destino))),
    [puxadasVizinhos],
  );

  // 5. Mapeamento de transições globais para ver o que cada número puxa
  const transicoesPorNumero = useMemo(() => {
    const todas = calcTransicoes(spins, { minCount: 1, topN: 5000, windowSize: 1000 });
    const mapa = new Map<number, { destino: number; qtd: number; perc: number }[]>();
    todas.forEach((t) => {
      const lista = mapa.get(t.origem) ?? [];
      if (lista.length < 3) {
        lista.push({ destino: t.destino, qtd: t.qtd, perc: t.perc });
        mapa.set(t.origem, lista);
      }
    });
    return mapa;
  }, [spins]);

  // 6. Grupos dominantes (Dúzia e Coluna) e telemetria
  const grupos = useMemo(() => calcGrupos(spins), [spins]);
  const forteDuzia = grupos.favDuzias[0] ?? { idx: 0, nome: "—", qtd: 0, perc: 0 };
  const forteColuna = grupos.favColunas[0] ?? { idx: 0, nome: "—", qtd: 0, perc: 0 };
  const anguloUltimo = ultimo === undefined ? 0 : anguloDe(ultimo);
  const letraUltimo = ultimo === undefined ? "" : inicialSetor(getProps(ultimo).setor);
  const letraPuxa = puxadas[0] === undefined ? "" : inicialSetor(getProps(puxadas[0].destino).setor);

  // 7. Lista dos 37 números organizada na ORDEM OFICIAL DO CILINDRO EUROPEU
  const itensCilindro = useMemo(() => {
    return CILINDRO.map((num, idxCilindro) => {
      const st = estat[num] ?? { num, qtd: 0, perc: 0, maiorEspera: 0, esperaAtual: 0 };
      const props = getProps(num);
      const ehUltimo = num === ultimo;
      const ehVizinho = amarelos.has(num);
      const ehPuxada = verdes.has(num);
      const ehCiano = cianos.has(num);
      const puxa = transicoesPorNumero.get(num) ?? [];

      return {
        ...st,
        posicao: idxCilindro + 1, // 1º ao 37º na roleta
        cor: props.cor,
        setor: props.setor,
        ehUltimo,
        destaqueUltimo: getDestaqueUltimo(num),
        ehVizinho,
        ehPuxada,
        ehCiano,
        puxa,
      };
    });
  }, [amarelos, cianos, estat, getDestaqueUltimo, transicoesPorNumero, ultimo, verdes]);

  // 8. Filtragem e Ordenação dinâmica da Lista Roleta Padrão
  const itensProcessados = useMemo(() => {
    let lista = [...itensCilindro];

    // Filtragem por setor / categoria
    switch (filtro) {
      case "voisins":
        lista = lista.filter((it) => VOISINS.includes(it.num));
        break;
      case "tiers":
        lista = lista.filter((it) => TIERS.includes(it.num));
        break;
      case "orphelins":
        lista = lista.filter((it) => ORPHELINS.includes(it.num));
        break;
      case "vizinhos":
        lista = lista.filter((it) => it.ehVizinho || it.ehUltimo);
        break;
      case "puxadas":
        lista = lista.filter((it) => it.ehPuxada || it.ehCiano);
        break;
      case "atrasados":
        lista = [...lista].sort((a, b) => b.esperaAtual - a.esperaAtual).slice(0, 14);
        break;
      case "quentes":
        lista = [...lista].sort((a, b) => b.qtd - a.qtd).slice(0, 14);
        break;
      case "todos":
      default:
        break;
    }

    // Ordenação
    switch (ordenacao) {
      case "numerica":
        lista.sort((a, b) => a.num - b.num);
        break;
      case "saidas":
        lista.sort((a, b) => b.qtd - a.qtd || a.esperaAtual - b.esperaAtual);
        break;
      case "espera":
        lista.sort((a, b) => b.esperaAtual - a.esperaAtual || b.maiorEspera - a.maiorEspera);
        break;
      case "cilindro":
      default:
        // Mantém a ordem original do cilindro europeu
        break;
    }

    return lista;
  }, [filtro, itensCilindro, ordenacao]);

  // KPIs de destaque
  const maisAtrasado = useMemo(() => {
    return [...estat].sort((a, b) => b.esperaAtual - a.esperaAtual)[0];
  }, [estat]);

  const maisFrequente = useMemo(() => {
    return [...estat].sort((a, b) => b.qtd - a.qtd)[0];
  }, [estat]);

  const handleClickNumero = (num: number) => {
    setFocoNumero((prev) => (prev === num ? null : num));
  };

  if (spins.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#061826]/90 via-black/95 to-[#030d14]/95 p-8 text-center text-white shadow-[0_0_24px_rgba(6,182,212,0.2)]">
        <Disc3 className="mx-auto h-12 w-12 text-neon-cyan animate-spin opacity-60" />
        <h3 className="mt-3 font-display text-base font-black uppercase text-neon-cyan text-stroke-black">
          Aguardando giros para renderizar a Roda & Lista Padrão
        </h3>
        <p className="mt-1 text-xs text-white/70">
          Registre novos números no painel ou importe uma sessão para ativar o painel analítico tático.
        </p>
      </div>
    );
  }

  // Constantes de Renderização da Roda SVG Expandida (Aproximada das Bordas)
  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = 182;
  const rIn = 138;
  const n = CILINDRO.length;

  const arco = (i: number, out = rOut, inn = rIn) => {
    const a0 = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    return `M ${p(out, a0)} A ${out} ${out} 0 0 1 ${p(out, a1)} L ${p(inn, a1)} A ${inn} ${inn} 0 0 0 ${p(inn, a0)} Z`;
  };

  return (
    <div className="space-y-3 font-sans text-white text-crisp">
      {/* ======================================================== */}
      {/* 1. BARRA DE CONTROLE E MODOS TÁTICOS (CABECALHO NÍVEL HARD) */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-r from-[#061826]/95 via-black/98 to-[#030d14]/95 p-3 shadow-[0_0_24px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-cyan text-black font-black shadow-[0_0_15px_#00FFFF]">
            <Disc3 className="h-5 w-5 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-tactical font-black uppercase tracking-wider text-white text-stroke-black drop-shadow-[0_0_8px_#00FFFF] truncate">
                RODA & LISTA PADRÃO · HUD TÁTICO
              </h2>
              <span className="rounded-full bg-cyan-950/90 border border-neon-cyan px-2 py-0.5 font-tactical text-[10px] font-bold text-neon-cyan whitespace-nowrap shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                2 EM 1
              </span>
            </div>
            <p className="text-[11px] text-white/80 font-medium truncate">
              {spins.length} giros sincronizados · Cilindro Europeu Oficial (0 a 26)
            </p>
          </div>
        </div>

        {/* Seletores de Modo de Visualização */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModo("completo")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-tactical text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modo === "completo"
                ? "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.7)] ring-1 ring-[#00E676]/60 text-stroke-black-sm"
                : "border border-white/20 bg-black/80 text-white/70 hover:text-white hover:border-cyan-400/50"
            }`}
          >
            <Columns2 className="h-4 w-4" />
            <span className="hidden sm:inline">Painel Completo</span>
            <span className="sm:hidden">Completo</span>
          </button>

          <button
            type="button"
            onClick={() => setModo("apenas_roda")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-tactical text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modo === "apenas_roda"
                ? "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.7)] ring-1 ring-[#00E676]/60 text-stroke-black-sm"
                : "border border-white/20 bg-black/80 text-white/70 hover:text-white hover:border-cyan-400/50"
            }`}
          >
            <Disc3 className="h-4 w-4" />
            <span>Roda 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setModo("apenas_lista")}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-tactical text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
              modo === "apenas_lista"
                ? "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_14px_rgba(0,230,118,0.7)] ring-1 ring-[#00E676]/60 text-stroke-black-sm"
                : "border border-white/20 bg-black/80 text-white/70 hover:text-white hover:border-cyan-400/50"
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            <span>Lista Padrão</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BLOCO DA RODA AO VIVO & TELEMETRIA ANALÍTICA */}
      {/* ======================================================== */}
      {(modo === "completo" || modo === "apenas_roda") && (
        <section
          data-panel-section="roda-hud"
          className="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-[#061826]/95 via-black/98 to-[#030d14]/95 p-3 sm:p-4 shadow-[0_0_28px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30"
          aria-label="Cilindro da Roleta ao Vivo e Telemetria"
        >
          {/* Header Interno do Bloco da Roda */}
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-neon-cyan animate-pulse drop-shadow-[0_0_6px_#00FFFF]" />
              <span className="text-xs sm:text-sm font-tactical font-black uppercase text-white text-stroke-black tracking-wider">
                CILINDRO CIRCULAR & RADAR DE ALVOS
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-white/80">
              Esperado p/ número: <strong className="text-neon-gold">{esperado.toFixed(1)}x</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] xl:grid-cols-[510px_1fr] gap-3 sm:gap-4 items-center">
            {/* COLUNA 1: A RODA VETORIAL SVG (3D INTERATIVO EXPANDIDO) */}
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl bg-black/90 border border-cyan-500/30 shadow-inner w-full">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="h-auto w-full max-w-[460px] sm:max-w-[490px] xl:max-w-[510px] drop-shadow-[0_0_24px_rgba(0,255,255,0.25)]"
                role="img"
                aria-label="Roda vetorial com resultado, vizinhos em ouro e puxadas em verde"
              >
                {CILINDRO.map((num, i) => {
                  const destaque = getDestaqueUltimo(num);
                  const ehUltimo1 = destaque?.pos === 1;
                  const ehUltimo2 = destaque?.pos === 2;
                  const ehUltimo3 = destaque?.pos === 3;
                  const ehVizinho = amarelos.has(num);
                  const ehPuxada = verdes.has(num);
                  const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
                  const salto = ehUltimo1 ? 22 : ehUltimo2 ? 14 : ehUltimo3 ? 8 : 0;
                  const rt = (rIn + rOut) / 2 + salto;
                  const repeticoes = estat[num]?.qtd ?? 0;
                  const barra = repeticoes === 0 ? 3 : 4 + (repeticoes / maxQtd) * 15;
                  const rb0 = rOut + 3 + salto;
                  const rb1 = rb0 + barra;
                  const stroke = ehUltimo1
                    ? "#00FFFF"
                    : ehUltimo2
                      ? "#FFD600"
                      : ehUltimo3
                        ? "#FF10F0"
                        : ehVizinho
                          ? "#FFD600"
                          : ehPuxada
                            ? "#00FF7F"
                            : "#00E5FF22";

                  return (
                    <g key={num} className="cursor-pointer" onClick={() => handleClickNumero(num)}>
                      {/* Traço de Frequência Externo */}
                      <line
                        x1={cx + rb0 * Math.cos(ang)}
                        y1={cy + rb0 * Math.sin(ang)}
                        x2={cx + rb1 * Math.cos(ang)}
                        y2={cy + rb1 * Math.sin(ang)}
                        stroke={ehUltimo1 ? "#00FFFF" : ehUltimo2 ? "#FFD600" : ehUltimo3 ? "#FF10F0" : ehVizinho ? "#FFD600" : ehPuxada ? "#00FF7F" : "#ffffff"}
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity={repeticoes === 0 ? 0.15 : 0.5 + (repeticoes / maxQtd) * 0.5}
                      >
                        <title>{num}: {repeticoes} saídas</title>
                      </line>

                      {/* Arco da Casa do Cilindro */}
                      <path
                        d={arco(i, rOut + salto, rIn + salto)}
                        fill={ehVizinho ? "#FFD600" : ehPuxada ? "#00FF7F" : corDoNumero(num)}
                        fillOpacity={ehVizinho ? 0.95 : ehPuxada ? 0.9 : 0.85}
                        stroke={stroke}
                        strokeWidth={ehUltimo1 ? 4 : ehUltimo2 || ehUltimo3 ? 3 : ehVizinho || ehPuxada ? 2.5 : 0.7}
                        style={destaque ? { filter: `drop-shadow(0 0 12px ${destaque.corNeon})` } : undefined}
                      />

                      {/* Número Escrito na Casa com Alta Nitidez */}
                      <text
                        x={cx + rt * Math.cos(ang)}
                        y={cy + rt * Math.sin(ang) + 5.5}
                        textAnchor="middle"
                        fontSize={ehUltimo1 ? "20" : ehUltimo2 ? "17.5" : ehUltimo3 ? "16" : "14.5"}
                        fontFamily="var(--font-tactical)"
                        fontWeight="800"
                        fill={ehVizinho || ehPuxada ? "#000000" : "#FFFFFF"}
                        stroke={destaque ? "#000000" : "none"}
                        strokeWidth={destaque ? 0.8 : 0}
                        style={{
                          filter: destaque
                            ? `drop-shadow(0 0 6px ${destaque.corNeon})`
                            : "drop-shadow(0 1px 2px rgba(0,0,0,0.9))",
                        }}
                      >
                        {num}
                      </text>

                      {/* Halo em números puxados por vizinhos */}
                      {cianos.has(num) && (
                        <circle
                          cx={cx + rt * Math.cos(ang)}
                          cy={cy + rt * Math.sin(ang)}
                          r={16}
                          fill="none"
                          stroke="#00E5FF"
                          strokeWidth={3}
                          style={{ filter: "drop-shadow(0 0 8px #00E5FF)" }}
                        >
                          <title>{num}: Puxado por vizinho do último</title>
                        </circle>
                      )}
                    </g>
                  );
                })}

                <defs>
                  <path
                    id="puxa-contorno-interno"
                    d={`M ${cx - 96} ${cy + 70} Q ${cx} ${cy + 126} ${cx + 96} ${cy + 70}`}
                    fill="none"
                  />
                  <radialGradient id="centro3d" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="#FFD600" />
                    <stop offset="85%" stopColor="#B8860B" />
                    <stop offset="100%" stopColor="#07080d" />
                  </radialGradient>
                  <filter id="saliente" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#FFFFFF" floodOpacity="0.9" />
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#FFD600" floodOpacity="0.85" />
                    <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#B8860B" floodOpacity="0.6" />
                    <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Centro 3D com Último Resultado */}
                <circle cx={cx} cy={cy} r={rIn - 6} fill="#07080d" stroke="#FFD60055" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={rIn - 18} fill="url(#centro3d)" opacity="0.25" />
                <circle cx={cx} cy={cy} r={rIn - 24} fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.4" />

                <text x={cx} y={cy - 46} textAnchor="middle" fontSize="12" fontFamily="var(--font-tactical)" fontWeight="800" fill="#FFA000" letterSpacing="2">
                  ÚLTIMO GIRO
                </text>
                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fontSize="82"
                  fontFamily="var(--font-mono)"
                  fontWeight="900"
                  fill={ultimo === undefined ? "#e8eaf6" : corDoNumero(ultimo)}
                  stroke="#000000"
                  strokeWidth={1.5}
                  style={{ filter: "url(#saliente)" }}
                >
                  {ultimo ?? "—"}
                </text>
                <text x={cx} y={cy + 56} textAnchor="middle" fontSize="28" fontFamily="var(--font-tactical)" fontWeight="900" className="fill-neon-cyan">
                  {letraUltimo || "—"}
                </text>
                <text
                  fontSize="14.5"
                  fontFamily="var(--font-tactical)"
                  fontWeight="800"
                  letterSpacing="0.5"
                  className="fill-neon-green"
                  style={{ filter: "drop-shadow(0 0 8px #00FF7F)" }}
                >
                  <textPath href="#puxa-contorno-interno" startOffset="50%" textAnchor="middle">
                    PUXA {puxadas[0]?.destino ?? "—"} · SETOR {letraPuxa || "—"}
                  </textPath>
                </text>
              </svg>
            </div>

            {/* COLUNA 2: QUADRO TÁTICO DE TELEMETRIA E ALVOS */}
            <div className="space-y-2.5">
              {/* Card 1: Último Número & Detalhes do Tiro */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neon-cyan/50 bg-cyan-950/30 p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.2)]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-2xl font-black text-white text-stroke-black shadow-lg ring-2 ring-white/50"
                    style={{ background: ultimo !== undefined ? corDoNumero(ultimo) : "#1a1c23" }}
                  >
                    {ultimo ?? "—"}
                  </span>
                  <div>
                    <span className="text-[10px] font-tactical font-bold uppercase text-neon-gold tracking-wider block">
                      Último Sorteado
                    </span>
                    <h3 className="font-tactical text-base font-bold text-white text-stroke-black leading-tight tracking-wide">
                      Número {ultimo ?? "—"} · {ultimo !== undefined ? getProps(ultimo).setor : "Aguardando"}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <div className="rounded-lg bg-black/80 border border-white/15 px-2.5 py-1 text-center">
                    <span className="text-[8.5px] uppercase text-white/60 font-tactical font-bold block">Ângulo</span>
                    <span className="font-mono text-sm font-black text-neon-gold">{anguloUltimo.toFixed(1)}°</span>
                  </div>
                  <div className="rounded-lg bg-black/80 border border-white/15 px-2.5 py-1 text-center">
                    <span className="text-[8.5px] uppercase text-white/60 font-tactical font-bold block">Setor</span>
                    <span className="font-tactical text-sm font-black text-neon-cyan">{letraUltimo || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Dúzia & Coluna Dominantes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-neon-magenta/60 bg-gradient-to-b from-fuchsia-950/40 via-black/90 to-black/90 p-2.5 text-center shadow-[0_0_12px_rgba(255,16,240,0.2)]">
                  <span className="text-[10px] uppercase font-tactical font-bold text-white/80 block tracking-wider">
                    Dúzia Forte
                  </span>
                  <div className="font-tactical text-base sm:text-lg font-black text-neon-magenta text-stroke-black-sm tracking-wide">
                    {forteDuzia.idx}ª Dúzia ({forteDuzia.perc.toFixed(1)}%)
                  </div>
                </div>
                <div className="rounded-xl border border-neon-cyan/60 bg-gradient-to-b from-cyan-950/40 via-black/90 to-black/90 p-2.5 text-center shadow-[0_0_12px_rgba(0,255,255,0.2)]">
                  <span className="text-[10px] uppercase font-tactical font-bold text-white/80 block tracking-wider">
                    Coluna Forte
                  </span>
                  <div className="font-tactical text-base sm:text-lg font-black text-neon-cyan text-stroke-black-sm tracking-wide">
                    {forteColuna.idx}ª Coluna ({forteColuna.perc.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Card 3: Puxadas Diretas do Momento (Verde Neon) */}
              <div className="rounded-xl border-2 border-neon-green/80 bg-gradient-to-b from-emerald-950/40 via-black/95 to-black/95 p-2.5 shadow-[0_0_16px_rgba(0,230,118,0.25)] ring-1 ring-neon-green/40">
                <div className="flex items-center justify-between border-b border-green-500/30 pb-1 mb-1.5">
                  <span className="flex items-center gap-1.5 font-tactical text-xs font-bold uppercase text-neon-green tracking-wider drop-shadow-[0_0_6px_#00FF7F]">
                    <Flame className="h-3.5 w-3.5 text-neon-green" />
                    <span>Puxadas Diretas do Número {ultimo ?? "—"}</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-white/70">Top Alvos</span>
                </div>

                {puxadas.length === 0 ? (
                  <p className="py-1 text-xs text-white/70">
                    Ainda sem repetições para o número {ultimo}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {puxadas.map((p) => (
                      <button
                        key={p.destino}
                        type="button"
                        onClick={() => handleClickNumero(p.destino)}
                        className="group flex items-center gap-1.5 rounded-lg border-2 border-neon-green bg-emerald-950/90 px-2.5 py-1 font-sans text-xs font-black text-white shadow-[0_0_10px_rgba(0,255,127,0.4)] transition-all hover:scale-105 cursor-pointer"
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-black text-white"
                          style={{ background: corDoNumero(p.destino) }}
                        >
                          {p.destino}
                        </span>
                        <span className="font-mono text-xs font-black text-neon-green text-stroke-black-sm">
                          {p.qtd}x ({p.perc.toFixed(0)}%)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 4: Vizinhos Imediatos no Cilindro (Ouro Neon) */}
              <div className="rounded-xl border-2 border-neon-gold/70 bg-gradient-to-b from-amber-950/40 via-black/95 to-black/95 p-2.5 shadow-[0_0_14px_rgba(250,204,21,0.25)] ring-1 ring-neon-gold/40">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-1 mb-1.5">
                  <span className="flex items-center gap-1.5 font-tactical text-xs font-bold uppercase text-neon-gold tracking-wider drop-shadow-[0_0_6px_#FACC15]">
                    <Award className="h-3.5 w-3.5 text-neon-gold" />
                    <span>Vizinhos Físicos do Cilindro (2 de cada lado)</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold text-white/70">Raio de Impacto</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[...amarelos].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleClickNumero(v)}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 cursor-pointer ${
                        v === ultimo
                          ? "border-white bg-white/20 text-white shadow-[0_0_10px_#ffffff]"
                          : "border-neon-gold bg-amber-950/80 text-neon-gold shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                      }`}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-black text-white"
                        style={{ background: corDoNumero(v) }}
                      >
                        {v}
                      </span>
                      <span className="font-tactical text-xs font-bold uppercase text-stroke-black-sm tracking-wide">
                        {v === ultimo ? "★ Centro" : "Vizinho"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 5: Radar de Puxadas dos Vizinhos (Ciano Neon) */}
              {puxadasVizinhos.length > 0 && (
                <div className="rounded-xl border border-neon-cyan/60 bg-gradient-to-b from-cyan-950/30 via-black/95 to-black/95 p-2.5 shadow-[0_0_12px_rgba(0,255,255,0.2)]">
                  <span className="text-xs font-tactical font-bold uppercase text-neon-cyan block mb-1 tracking-wider">
                    Radar de Puxadas dos Vizinhos (Cobertura Tática)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {puxadasVizinhos.slice(0, 4).map((v) => (
                      <div key={v.vizinho} className="flex items-center gap-1.5 rounded bg-black/80 p-1.5 border border-white/10">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs font-black text-white"
                          style={{ background: corDoNumero(v.vizinho) }}
                        >
                          {v.vizinho}
                        </span>
                        <ArrowRight className="h-3 w-3 text-white/50 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {v.alvos.map((a) => (
                            <span key={a.destino} className="font-mono text-xs font-black text-neon-cyan">
                              {a.destino} ({a.perc.toFixed(0)}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. PISTA DA ROLETA PADRÃO (RACETRACK EM 2 LINHAS) */}
      {/* ======================================================== */}
      <section
        className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-[#1c1202]/90 via-black/98 to-[#1c1202]/90 p-3 sm:p-4 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30"
        aria-label="Pista da Roleta Padrão em 2 Linhas (Racetrack)"
      >
        {/* Cabeçalho da Seção com Seletor e Destaque */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-neon-gold drop-shadow-[0_0_6px_#FACC15]" />
            <div>
              <h3 className="font-tactical text-xs sm:text-sm font-bold uppercase tracking-wider text-neon-gold drop-shadow-[0_0_6px_#FACC15]">
                PISTA DA ROLETA PADRÃO (RACETRACK EM 2 LINHAS)
              </h3>
              <p className="text-[10px] text-white/60 font-sans">
                {formatoPista === "circuito"
                  ? "Circuito Fechado da Pista (Linha 1: 0 a 10 · Linha 2: 26 a 5)"
                  : "Metades Opostas da Roda (Linha 1: Começa no 0 · Linha 2: Começa no 5)"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 bg-black/90 rounded-lg p-1 border border-white/20">
              <span className="text-[9px] font-tactical font-black uppercase text-white/70 px-1">
                3 Últimos:
              </span>
              {u1 !== undefined && (
                <div
                  className="flex items-center gap-1 rounded bg-cyan-950/90 border border-cyan-400 px-1.5 py-0.5 shadow-[0_0_8px_rgba(0,255,255,0.5)] cursor-pointer"
                  onClick={() => handleClickNumero(u1)}
                  title={`1º Último: Nº ${u1} (${getProps(u1).setor})`}
                >
                  <span className="text-[8.5px] font-mono font-black text-cyan-300">1º</span>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-black text-white"
                    style={{ background: corDoNumero(u1) }}
                  >
                    {u1}
                  </span>
                </div>
              )}
              {u2 !== undefined && (
                <div
                  className="flex items-center gap-1 rounded bg-amber-950/90 border border-amber-400 px-1.5 py-0.5 shadow-[0_0_8px_rgba(255,214,0,0.5)] cursor-pointer"
                  onClick={() => handleClickNumero(u2)}
                  title={`2º Último: Nº ${u2} (${getProps(u2).setor})`}
                >
                  <span className="text-[8.5px] font-mono font-black text-amber-300">2º</span>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-black text-white"
                    style={{ background: corDoNumero(u2) }}
                  >
                    {u2}
                  </span>
                </div>
              )}
              {u3 !== undefined && (
                <div
                  className="flex items-center gap-1 rounded bg-fuchsia-950/90 border border-fuchsia-400 px-1.5 py-0.5 shadow-[0_0_8px_rgba(255,16,240,0.5)] cursor-pointer"
                  onClick={() => handleClickNumero(u3)}
                  title={`3º Último: Nº ${u3} (${getProps(u3).setor})`}
                >
                  <span className="text-[8.5px] font-mono font-black text-fuchsia-300">3º</span>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-black text-white"
                    style={{ background: corDoNumero(u3) }}
                  >
                    {u3}
                  </span>
                </div>
              )}
            </div>

            {/* Alternador de Formato da Pista */}
            <div className="flex items-center gap-1 bg-black/90 rounded-lg p-0.5 border border-white/15 text-[9px] font-tactical font-bold">
              <button
                type="button"
                onClick={() => setFormatoPista("circuito")}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  formatoPista === "circuito"
                    ? "bg-amber-950 text-neon-gold border border-amber-500/70 shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Pista (0 / 26)
              </button>
              <button
                type="button"
                onClick={() => setFormatoPista("opostos")}
                className={`px-2 py-1 rounded transition-all cursor-pointer ${
                  formatoPista === "opostos"
                    ? "bg-amber-950 text-neon-gold border border-amber-500/70 shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Opostos (0 / 5)
              </button>
            </div>
          </div>
        </div>

        {/* As 2 Linhas da Pista da Roleta — PERFEITAMENTE CENTRALIZADAS */}
        <div className="overflow-x-auto no-scrollbar scroll-smooth pb-3 pt-5 px-1 flex justify-center">
          <div className="w-fit flex flex-col items-center gap-3 mx-auto">
            {/* LINHA 1 (SUPERIOR) — Começa no ZERO */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              {PISTA_LINHA_1.map((num) => {
                const it = estat[num] ?? { num, qtd: 0, perc: 0, maiorEspera: 0, esperaAtual: 0 };
                const props = getProps(num);
                const destaque = getDestaqueUltimo(num);
                const ehVizinho = amarelos.has(num);
                const ehPuxada = verdes.has(num);
                const ehCiano = cianos.has(num);
                const isFoco = focoNumero === num;

                return (
                  <button
                    key={`pista-l1-${num}`}
                    type="button"
                    onClick={() => handleClickNumero(num)}
                    title={`Nº ${num} (${props.setor})\n${it.qtd} saídas (${it.perc.toFixed(1)}%)\nAtraso: ${it.esperaAtual}G (Máx: ${it.maiorEspera}G)${
                      destaque ? `\n★ ${destaque.fullLabel}` : ""
                    }`}
                    className={`relative flex h-11 w-11 sm:h-12 sm:w-12 md:h-13 md:w-13 shrink-0 flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                      destaque
                        ? `${destaque.ringClass} ${destaque.scaleClass}`
                        : ehPuxada
                          ? "ring-2 ring-neon-green shadow-[0_0_12px_#00FF7F]"
                          : ehVizinho
                            ? "ring-2 ring-neon-gold shadow-[0_0_12px_#FFD600]"
                            : ehCiano
                              ? "ring-1 ring-neon-cyan shadow-[0_0_8px_#00E5FF]"
                              : isFoco
                                ? "ring-2 ring-neon-magenta scale-105"
                                : "opacity-90 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{
                      background: corDoNumero(num),
                      boxShadow: destaque
                        ? destaque.shadowStyle
                        : REDS.includes(num)
                          ? "0 0 16px rgba(255, 0, 60, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.3)"
                          : num === 0
                            ? "0 0 16px rgba(0, 230, 118, 0.85), inset 0 0 8px rgba(0, 230, 118, 0.4)"
                            : "0 0 14px rgba(255, 255, 255, 0.75), inset 0 0 6px rgba(255, 255, 255, 0.2)",
                      border: destaque
                        ? `2.5px solid ${destaque.corNeon}`
                        : REDS.includes(num)
                          ? "2px solid #FF003C"
                          : num === 0
                            ? "2px solid #00E676"
                            : "2px solid #FFFFFF",
                    }}
                  >
                    {/* Destaque Exclusivo nos 3 Últimos Sorteados com Cores Neon */}
                    {destaque && (
                      <>
                        <span
                          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded font-mono font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 whitespace-nowrap z-40 uppercase tracking-wider ${destaque.badgeClass} ${
                            destaque.pos === 1 ? "animate-pulse" : ""
                          }`}
                        >
                          ★ {destaque.label}
                        </span>
                        {destaque.pos === 1 && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-cyan-300 animate-ping" />
                        )}
                      </>
                    )}

                    {/* Número em Tamanho Grande, Centralizado e Nítido */}
                    <span className="font-mono text-base sm:text-lg md:text-xl font-black text-white leading-none text-stroke-black-sm text-center">
                      {num}
                    </span>

                    {/* Quantidade de Saídas Centralizada */}
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-white/90 leading-none mt-1 text-center">
                      {it.qtd}x
                    </span>
                  </button>
                );
              })}
            </div>

            {/* CURVAS E CONEXÕES VISUAIS DA PISTA CENTRALIZADA */}
            <div className="flex items-center justify-between w-full px-3 text-[10px] font-mono border-y border-white/10 py-1 bg-black/40 rounded-lg">
              <div className="flex items-center gap-1.5 text-neon-cyan font-bold">
                <span className="text-sm">↰</span>
                <span className="text-[9.5px]">
                  {formatoPista === "circuito"
                    ? "Início da Pista (Zero ↰ 26)"
                    : "Início 0"}
                </span>
              </div>
              <span className="text-[8.5px] uppercase font-tactical tracking-widest text-amber-300/80 font-bold hidden sm:inline">
                {formatoPista === "circuito"
                  ? "LINHA 1 (0 a 10)  ·  CIRCUITO OVAL CONTÍNUO  ·  LINHA 2 (26 a 5)"
                  : "LINHA 1 (0 a 10)  ·  METADES OPOSTAS  ·  LINHA 2 (5 a 26)"}
              </span>
              <div className="flex items-center gap-1.5 text-neon-gold font-bold">
                <span className="text-[9.5px]">
                  {formatoPista === "circuito"
                    ? "Curva de Retorno (10 ↴ 5)"
                    : "Fim da Linha"}
                </span>
                <span className="text-sm">↴</span>
              </div>
            </div>

            {/* LINHA 2 (INFERIOR) — Abaixo do ZERO */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              {(formatoPista === "circuito" ? PISTA_LINHA_2_CIRCUITO : PISTA_LINHA_2_OPOSTOS).map(
                (num) => {
                  const it = estat[num] ?? { num, qtd: 0, perc: 0, maiorEspera: 0, esperaAtual: 0 };
                  const props = getProps(num);
                  const destaque = getDestaqueUltimo(num);
                  const ehVizinho = amarelos.has(num);
                  const ehPuxada = verdes.has(num);
                  const ehCiano = cianos.has(num);
                  const isFoco = focoNumero === num;

                  return (
                    <button
                      key={`pista-l2-${num}`}
                      type="button"
                      onClick={() => handleClickNumero(num)}
                      title={`Nº ${num} (${props.setor})\n${it.qtd} saídas (${it.perc.toFixed(1)}%)\nAtraso: ${it.esperaAtual}G (Máx: ${it.maiorEspera}G)${
                        destaque ? `\n★ ${destaque.fullLabel}` : ""
                      }`}
                      className={`relative flex h-11 w-11 sm:h-12 sm:w-12 md:h-13 md:w-13 shrink-0 flex-col items-center justify-center rounded-xl transition-all cursor-pointer ${
                        destaque
                          ? `${destaque.ringClass} ${destaque.scaleClass}`
                          : ehPuxada
                            ? "ring-2 ring-neon-green shadow-[0_0_12px_#00FF7F]"
                            : ehVizinho
                              ? "ring-2 ring-neon-gold shadow-[0_0_12px_#FFD600]"
                              : ehCiano
                                ? "ring-1 ring-neon-cyan shadow-[0_0_8px_#00E5FF]"
                                : isFoco
                                  ? "ring-2 ring-neon-magenta scale-105"
                                  : "opacity-90 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{
                        background: corDoNumero(num),
                        boxShadow: destaque
                          ? destaque.shadowStyle
                          : REDS.includes(num)
                            ? "0 0 16px rgba(255, 0, 60, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.3)"
                            : num === 0
                              ? "0 0 16px rgba(0, 230, 118, 0.85), inset 0 0 8px rgba(0, 230, 118, 0.4)"
                              : "0 0 14px rgba(255, 255, 255, 0.75), inset 0 0 6px rgba(255, 255, 255, 0.2)",
                        border: destaque
                          ? `2.5px solid ${destaque.corNeon}`
                          : REDS.includes(num)
                            ? "2px solid #FF003C"
                            : num === 0
                              ? "2px solid #00E676"
                              : "2px solid #FFFFFF",
                      }}
                    >
                      {/* Destaque Exclusivo nos 3 Últimos Sorteados com Cores Neon */}
                      {destaque && (
                        <>
                          <span
                            className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded font-mono font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 whitespace-nowrap z-40 uppercase tracking-wider ${destaque.badgeClass} ${
                              destaque.pos === 1 ? "animate-pulse" : ""
                            }`}
                          >
                            ★ {destaque.label}
                          </span>
                          {destaque.pos === 1 && (
                            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-cyan-300 animate-ping" />
                          )}
                        </>
                      )}

                      {/* Número em Tamanho Grande, Centralizado e Nítido */}
                      <span className="font-mono text-base sm:text-lg md:text-xl font-black text-white leading-none text-stroke-black-sm text-center">
                        {num}
                      </span>

                      {/* Quantidade de Saídas Centralizada */}
                      <span className="font-mono text-[9px] sm:text-[10px] font-bold text-white/90 leading-none mt-1 text-center">
                        {it.qtd}x
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. GRADE ANALÍTICA DOS 37 NÚMEROS (LISTA ROLETA PADRÃO) */}
      {/* ======================================================== */}
      {(modo === "completo" || modo === "apenas_lista") && (
        <section
          data-panel-section="lista-padrao-grid"
          className="rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-[#061826]/95 via-black/98 to-[#030d14]/95 p-3 sm:p-4 shadow-[0_0_28px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30"
          aria-label="Grade Analítica dos 37 Números da Roleta Padrão"
        >
          {/* Header com Filtros & Ordenação */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2.5 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-neon-cyan" />
                <h3 className="font-tactical text-sm sm:text-base font-bold uppercase tracking-wider text-white text-stroke-black drop-shadow-[0_0_6px_#00FFFF]">
                  GRADE ANALÍTICA · 37 NÚMEROS DA ROLETA PADRÃO
                </h3>
              </div>
              <p className="text-xs text-white/80 font-medium mt-0.5">
                Mapeamento completo: saídas, %, picos de atraso e puxadas individuais
              </p>
            </div>

            {/* KPIs de Destaque */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {maisAtrasado && (
                <div className="rounded-lg border border-neon-gold/70 bg-amber-950/50 px-2.5 py-1 text-xs shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                  <span className="font-tactical text-white/80 font-bold uppercase tracking-wide">Mais Atrasado: </span>
                  <strong className="font-mono font-black text-neon-gold text-xs">
                    Nº {maisAtrasado.num} ({maisAtrasado.esperaAtual}G)
                  </strong>
                </div>
              )}
              {maisFrequente && (
                <div className="rounded-lg border border-neon-green/70 bg-emerald-950/50 px-2.5 py-1 text-xs shadow-[0_0_8px_rgba(0,230,118,0.3)]">
                  <span className="font-tactical text-white/80 font-bold uppercase tracking-wide">Mais Quente: </span>
                  <strong className="font-mono font-black text-neon-green text-xs">
                    Nº {maisFrequente.num} ({maisFrequente.qtd}x · {maisFrequente.perc.toFixed(0)}%)
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Filtros por Categoria & Ordenação */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/90 p-2.5 mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-tactical text-xs font-bold uppercase text-white/70 tracking-wider mr-1 text-stroke-black-sm">
                Setores:
              </span>
              {(
                [
                  { id: "todos", label: "Todos (37)" },
                  { id: "voisins", label: "Voisins (17)" },
                  { id: "tiers", label: "Tiers (12)" },
                  { id: "orphelins", label: "Orphelins (8)" },
                  { id: "vizinhos", label: `Vizinhos (${amarelos.size})` },
                  { id: "puxadas", label: `Puxadas (${verdes.size})` },
                  { id: "atrasados", label: "Top Atrasados" },
                  { id: "quentes", label: "Mais Quentes" },
                ] as const
              ).map((f) => {
                const isActive = filtro === f.id;
                return (
                  <button
                    key={`filtro-${f.id}`}
                    type="button"
                    onClick={() => setFiltro(f.id)}
                    className={`rounded-lg px-2.5 py-1.5 font-tactical text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "border-2 border-[#00E676] bg-emerald-950/90 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)] ring-1 ring-[#00E676]/60 text-stroke-black-sm"
                        : "border border-white/15 bg-black/80 text-white/80 hover:text-white hover:border-cyan-400/50"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-tactical text-xs font-bold uppercase text-white/70 tracking-wider text-stroke-black-sm mr-1">
                Ordem:
              </span>
              {(
                [
                  { id: "cilindro", label: "Cilindro" },
                  { id: "numerica", label: "0–36" },
                  { id: "saidas", label: "Saídas" },
                  { id: "espera", label: "Atraso" },
                ] as const
              ).map((ord) => {
                const isActive = ordenacao === ord.id;
                return (
                  <button
                    key={`ord-${ord.id}`}
                    type="button"
                    onClick={() => setOrdenacao(ord.id)}
                    className={`rounded-lg px-2.5 py-1 font-tactical text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "bg-neon-cyan/25 text-neon-cyan border border-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {ord.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRADE COMPACTA E RICA DOS 37 NÚMEROS (7 COLUNAS FULL-WIDTH) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {itensProcessados.map((e) => {
              const isFoco = focoNumero === e.num;
              return (
                <div
                  key={`card-padrao-${e.num}`}
                  onClick={() => handleClickNumero(e.num)}
                  className={`relative flex flex-col justify-between rounded-xl border-2 p-2.5 transition-all cursor-pointer overflow-hidden ${
                    isFoco
                      ? "ring-2 ring-neon-magenta shadow-[0_0_16px_#FF10F0] scale-102 z-10"
                      : "hover:scale-102 hover:shadow-lg"
                  }`}
                  style={{
                    borderColor: e.destaqueUltimo
                      ? e.destaqueUltimo.corNeon
                      : e.ehPuxada
                        ? "#00FF7F"
                        : e.ehVizinho
                          ? "#FFD600"
                          : e.ehCiano
                            ? "#00E5FF"
                            : "rgba(255, 255, 255, 0.15)",
                    backgroundColor: e.destaqueUltimo
                      ? e.destaqueUltimo.pos === 1
                        ? "rgba(0, 255, 255, 0.12)"
                        : e.destaqueUltimo.pos === 2
                          ? "rgba(255, 214, 0, 0.12)"
                          : "rgba(255, 16, 240, 0.12)"
                      : e.ehPuxada
                        ? "rgba(0, 255, 127, 0.08)"
                        : e.ehVizinho
                          ? "rgba(255, 214, 0, 0.08)"
                          : "rgba(0, 0, 0, 0.8)",
                    boxShadow: e.destaqueUltimo
                      ? e.destaqueUltimo.pos === 1
                        ? "0 0 16px rgba(0, 255, 255, 0.5)"
                        : e.destaqueUltimo.pos === 2
                          ? "0 0 16px rgba(255, 214, 0, 0.5)"
                          : "0 0 16px rgba(255, 16, 240, 0.5)"
                      : e.ehPuxada
                        ? "0 0 14px rgba(0, 255, 127, 0.35)"
                        : e.ehVizinho
                          ? "0 0 14px rgba(255, 214, 0, 0.35)"
                          : undefined,
                  }}
                  title={`Nº ${e.num} · Posição no Cilindro: #${e.posicao} · Setor: ${e.setor}\n${e.qtd} saídas (${e.perc.toFixed(1)}%)\nMaior atraso histórico: ${e.maiorEspera}G\nAtraso atual: ${e.esperaAtual}G`}
                >
                  {/* Linha 1: Posição & Tag do Setor (Sem quebra de linha) */}
                  <div className="flex items-center justify-between gap-1 text-xs mb-1.5">
                    <span className="font-mono font-bold text-[11px] text-cyan-300 whitespace-nowrap">
                      #{e.posicao} RODA
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-tactical text-[9.5px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                        e.setor.startsWith("V")
                          ? "bg-cyan-950/80 text-neon-cyan border-neon-cyan/50 shadow-[0_0_6px_rgba(0,255,255,0.25)]"
                          : e.setor.startsWith("T")
                            ? "bg-fuchsia-950/80 text-neon-magenta border-neon-magenta/50 shadow-[0_0_6px_rgba(255,16,240,0.25)]"
                            : "bg-amber-950/80 text-neon-gold border-neon-gold/50 shadow-[0_0_6px_rgba(250,204,21,0.25)]"
                      }`}
                    >
                      {e.setor}
                    </span>
                  </div>

                  {/* Linha 2: Badge do Número + Saídas + Alerta (Sem sobreposição) */}
                  <div className="flex items-center justify-between gap-1.5 my-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-black text-white shadow-md ring-1 ring-white/40"
                        style={{
                          background: corDoNumero(e.num),
                          boxShadow: REDS.includes(e.num)
                            ? "0 0 16px rgba(255, 0, 60, 0.85), inset 0 0 8px rgba(255, 255, 255, 0.3)"
                            : e.num === 0
                              ? "0 0 16px rgba(0, 230, 118, 0.85), inset 0 0 8px rgba(0, 230, 118, 0.5)"
                              : "0 0 14px rgba(255, 255, 255, 0.75), inset 0 0 6px rgba(255, 255, 255, 0.2)",
                          border: REDS.includes(e.num) ? "2px solid #FF003C" : "2px solid #FFFFFF",
                        }}
                      >
                        {e.num}
                      </span>

                      <div className="leading-tight">
                        <div className="flex items-baseline gap-0.5">
                          <span className="font-mono text-xl font-black text-white leading-none">
                            {e.qtd}
                          </span>
                          <span className="font-mono text-xs font-bold text-white/60">x</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-cyan-300">
                          {e.perc.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Status de Atraso no Card */}
                    {e.esperaAtual >= e.maiorEspera && e.maiorEspera > 0 ? (
                      <span className="rounded bg-red-950/90 border border-red-500/80 px-1.5 py-0.5 font-tactical text-[8.5px] font-bold uppercase text-red-300 shadow-[0_0_8px_rgba(255,23,68,0.4)] animate-pulse">
                        MÁX
                      </span>
                    ) : e.esperaAtual > 25 ? (
                      <span className="rounded bg-amber-950/70 border border-amber-500/50 px-1.5 py-0.5 font-tactical text-[8.5px] font-bold uppercase text-amber-300">
                        ALTO
                      </span>
                    ) : null}
                  </div>

                  {/* Linha 3: Telemetria de Atraso Atual vs Recorde (Grade Dupla Balanceada) */}
                  <div className="grid grid-cols-2 gap-1.5 my-1.5 text-center font-mono">
                    <div
                      className={`rounded-lg px-1 py-1 border ${
                        e.esperaAtual >= e.maiorEspera && e.maiorEspera > 0
                          ? "bg-red-950/80 border-red-500/70 shadow-[0_0_8px_rgba(255,23,68,0.3)]"
                          : "bg-black/80 border-white/10"
                      }`}
                    >
                      <span className="text-[7.5px] uppercase font-tactical font-bold text-white/60 block leading-tight mb-0.5">
                        ATRASO
                      </span>
                      <strong
                        className={`text-[11px] font-black leading-none block ${
                          e.esperaAtual >= e.maiorEspera && e.maiorEspera > 0
                            ? "text-red-300"
                            : "text-white"
                        }`}
                      >
                        {e.esperaAtual}G
                      </strong>
                    </div>

                    <div className="rounded-lg bg-black/80 border border-amber-500/30 px-1 py-1">
                      <span className="text-[7.5px] uppercase font-tactical font-bold text-neon-gold/80 block leading-tight mb-0.5">
                        MÁXIMO
                      </span>
                      <strong className="text-neon-gold text-[11px] font-black leading-none block">
                        {e.maiorEspera}G
                      </strong>
                    </div>
                  </div>

                  {/* Linha 4: Barra de Densidade Neon Reforçada */}
                  <div className="h-2 my-1 overflow-hidden rounded-full bg-black/90 border border-white/15">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        e.ehUltimo
                          ? "bg-white shadow-[0_0_8px_#ffffff]"
                          : e.ehPuxada
                            ? "bg-neon-green shadow-[0_0_8px_#00FF7F]"
                            : e.ehVizinho
                              ? "bg-neon-gold shadow-[0_0_8px_#FFD600]"
                              : REDS.includes(e.num)
                                ? "bg-[#FF003C] shadow-[0_0_10px_#FF003C]"
                                : "bg-neon-cyan shadow-[0_0_8px_#00FFFF]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(6, (e.qtd / maxQtd) * 100))}%` }}
                    />
                  </div>

                  {/* Linha 4: Puxadas deste Número */}
                  {e.puxa && e.puxa.length > 0 && (
                    <div className="flex items-center gap-1 border-t border-white/10 pt-1.5 text-[9.5px]">
                      <span className="font-tactical text-white/70 font-bold uppercase tracking-wider">
                        PUXA:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {e.puxa.slice(0, 2).map((p) => (
                          <span
                            key={`puxa-${e.num}-${p.destino}`}
                            className="rounded bg-emerald-950/90 px-1.5 py-0.5 font-mono font-bold text-emerald-300 border border-green-500/50 shadow-sm"
                          >
                            {p.destino} ({p.qtd}x)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linha 5: Status Tag Contextual dos 3 Últimos ou Categorias */}
                  {e.destaqueUltimo ? (
                    <div
                      className={`mt-1.5 rounded py-0.5 text-center font-tactical text-[10px] font-black uppercase tracking-widest border ${
                        e.destaqueUltimo.pos === 1
                          ? "bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.5)] animate-pulse"
                          : e.destaqueUltimo.pos === 2
                            ? "bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(255,214,0,0.5)]"
                            : "bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-400 shadow-[0_0_10px_rgba(255,16,240,0.5)]"
                      }`}
                    >
                      ★ {e.destaqueUltimo.fullLabel}
                    </div>
                  ) : e.ehPuxada ? (
                    <div className="mt-1.5 rounded bg-emerald-950/90 py-0.5 text-center font-tactical text-[10px] font-black uppercase text-neon-green tracking-widest border border-neon-green/70 shadow-[0_0_8px_rgba(0,255,127,0.35)]">
                      PUXANDO AGORA
                    </div>
                  ) : e.ehVizinho ? (
                    <div className="mt-1.5 rounded bg-amber-950/90 py-0.5 text-center font-tactical text-[10px] font-black uppercase text-neon-gold tracking-widest border border-neon-gold/70 shadow-[0_0_8px_rgba(250,204,21,0.35)]">
                      VIZINHO DO CILINDRO
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

