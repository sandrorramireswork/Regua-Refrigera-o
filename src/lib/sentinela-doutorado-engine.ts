import { CILINDRO, getProps, type Spin } from "@/lib/roulette";
import { DENSITY_QUADRANTS } from "@/lib/density-radar";

export type CategoriaTendencia =
  | "coluna"
  | "duzia"
  | "padrao_f"
  | "setor_balistico"
  | "chance_simples";

export interface TendenciaDef {
  id: string;
  nome: string;
  categoria: CategoriaTendencia;
  categoriaLabel: string;
  corHex: string;
  corNome: string;
  numeros: number[];
  probTeorica: number;
}

// 1. Definições das 20 métricas monitoradas nos gráficos
export const TENDENCIAS_REGISTRY: TendenciaDef[] = [
  // Colunas (Tolerância 2x)
  {
    id: "col_1",
    nome: "Coluna 1",
    categoria: "coluna",
    categoriaLabel: "Colunas",
    corHex: "#FF10F0",
    corNome: "Rosa",
    numeros: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
    probTeorica: 12 / 37,
  },
  {
    id: "col_2",
    nome: "Coluna 2",
    categoria: "coluna",
    categoriaLabel: "Colunas",
    corHex: "#00FFFF",
    corNome: "Ciano",
    numeros: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    probTeorica: 12 / 37,
  },
  {
    id: "col_3",
    nome: "Coluna 3",
    categoria: "coluna",
    categoriaLabel: "Colunas",
    corHex: "#FF6700",
    corNome: "Laranja",
    numeros: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    probTeorica: 12 / 37,
  },

  // Dúzias (Tolerância 2x)
  {
    id: "duz_1",
    nome: "Dúzia 1 (1-12)",
    categoria: "duzia",
    categoriaLabel: "Dúzias",
    corHex: "#FF10F0",
    corNome: "Rosa",
    numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    probTeorica: 12 / 37,
  },
  {
    id: "duz_2",
    nome: "Dúzia 2 (13-24)",
    categoria: "duzia",
    categoriaLabel: "Dúzias",
    corHex: "#00FFFF",
    corNome: "Ciano",
    numeros: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    probTeorica: 12 / 37,
  },
  {
    id: "duz_3",
    nome: "Dúzia 3 (25-36)",
    categoria: "duzia",
    categoriaLabel: "Dúzias",
    corHex: "#FF6700",
    corNome: "Laranja",
    numeros: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
    probTeorica: 12 / 37,
  },

  // Padrão F (Densidade física do cilindro)
  {
    id: "pf_q1",
    nome: "Padrão F - Q1",
    categoria: "padrao_f",
    categoriaLabel: "Padrão F (Densidade)",
    corHex: "#FF10F0",
    corNome: "Rosa",
    numeros: DENSITY_QUADRANTS[0], // [32, 15, 19, 4, 21, 2, 25, 17, 34]
    probTeorica: 9 / 37,
  },
  {
    id: "pf_q2",
    nome: "Padrão F - Q2",
    categoria: "padrao_f",
    categoriaLabel: "Padrão F (Densidade)",
    corHex: "#00FFFF",
    corNome: "Ciano",
    numeros: DENSITY_QUADRANTS[1], // [6, 27, 13, 36, 11, 30, 8, 23, 10]
    probTeorica: 9 / 37,
  },
  {
    id: "pf_q3",
    nome: "Padrão F - Q3",
    categoria: "padrao_f",
    categoriaLabel: "Padrão F (Densidade)",
    corHex: "#FF6700",
    corNome: "Laranja",
    numeros: DENSITY_QUADRANTS[2], // [5, 24, 16, 33, 1, 20, 14, 31, 9]
    probTeorica: 9 / 37,
  },
  {
    id: "pf_q4",
    nome: "Padrão F - Q4",
    categoria: "padrao_f",
    categoriaLabel: "Padrão F (Densidade)",
    corHex: "#FACB15",
    corNome: "Dourado",
    numeros: DENSITY_QUADRANTS[3], // [22, 18, 29, 7, 28, 12, 35, 3, 26]
    probTeorica: 9 / 37,
  },

  // Setores Balísticos do Cilindro
  {
    id: "set_voisins",
    nome: "Voisins du Zéro",
    categoria: "setor_balistico",
    categoriaLabel: "Setores Balísticos",
    corHex: "#00FF66",
    corNome: "Verde Neon",
    numeros: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
    probTeorica: 17 / 37,
  },
  {
    id: "set_tiers",
    nome: "Tiers du Cylindre",
    categoria: "setor_balistico",
    categoriaLabel: "Setores Balísticos",
    corHex: "#00E5FF",
    corNome: "Ciano Elétrico",
    numeros: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    probTeorica: 12 / 37,
  },
  {
    id: "set_orphelins",
    nome: "Orphelins",
    categoria: "setor_balistico",
    categoriaLabel: "Setores Balísticos",
    corHex: "#FF007F",
    corNome: "Magenta Neon",
    numeros: [1, 20, 14, 31, 9, 17, 34, 6],
    probTeorica: 8 / 37,
  },
  {
    id: "set_zero",
    nome: "Jeu Zéro",
    categoria: "setor_balistico",
    categoriaLabel: "Setores Balísticos",
    corHex: "#E040FB",
    corNome: "Roxo Elétrico",
    numeros: [12, 35, 3, 26, 0, 32, 15],
    probTeorica: 7 / 37,
  },

  // Chances Simples
  {
    id: "cs_vermelho",
    nome: "Vermelho",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#FF3366",
    corNome: "Vermelho",
    numeros: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    probTeorica: 18 / 37,
  },
  {
    id: "cs_preto",
    nome: "Preto",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#708090",
    corNome: "Preto",
    numeros: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
    probTeorica: 18 / 37,
  },
  {
    id: "cs_par",
    nome: "Par",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#00E676",
    corNome: "Verde",
    numeros: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
    probTeorica: 18 / 37,
  },
  {
    id: "cs_impar",
    nome: "Ímpar",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#FF9100",
    corNome: "Laranja",
    numeros: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
    probTeorica: 18 / 37,
  },
  {
    id: "cs_alto",
    nome: "Alto (19-36)",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#651FFF",
    corNome: "Roxo",
    numeros: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
    probTeorica: 18 / 37,
  },
  {
    id: "cs_baixo",
    nome: "Baixo (1-18)",
    categoria: "chance_simples",
    categoriaLabel: "Chances Simples",
    corHex: "#00B0FF",
    corNome: "Azul",
    numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    probTeorica: 18 / 37,
  },
];

export interface MetricaTendenciaCalculada {
  def: TendenciaDef;
  pontosTotal: number;
  pontosHistorico: number[];
  errosAtuais: number;
  penalidadesTotal: number;
  acertosTotal: number;
  // Métricas de Doutorado nos últimos 5 a 6 giros
  ganho5R: number;
  semQuedas5R: boolean;
  velocidadeRecente: number; // pts por giro
  aceleracaoCurva: number; // derivada de 2ª ordem
  zScore: number; // desvio padrão em relação ao esperado
  acertos5R: number;
  scoreSuspeita: number; // 0 a 100%
  isMovimentoSuspeito: boolean;
  statusNivel: "critico" | "alto" | "moderado" | "neutro";
}

export interface ResultadoSentinelaDoutorado {
  timestamp: number;
  totalGiros: number;
  modoExpertAtivo: boolean;
  tendenciasSuspeitas: MetricaTendenciaCalculada[];
  tendenciaPrincipal: MetricaTendenciaCalculada | null;
  confluenciaDoutorado: {
    tendenciaA: MetricaTendenciaCalculada | null;
    tendenciaB: MetricaTendenciaCalculada | null;
    sniperNumbers: number[];
    descricaoConfluencia: string;
    movimentoExato: string;
    justificativaCientifica: string;
  } | null;
  todasMetricas: MetricaTendenciaCalculada[];
}

/**
 * Motor Estatístico Nível Doutorado:
 * Processa a sequência cronológica de giros aplicando a regra exata de tolerância 2x
 * e avalia vetores de crescimento anômalo (velocidade, aceleração e Z-Score).
 */
export function executarSentinelaDoutorado(
  numerosCronologicos: number[],
  limiarRigorZ: number = 1.96 // Default: 95% de significância estatística (Z >= 1.96)
): ResultadoSentinelaDoutorado {
  const totalGiros = numerosCronologicos.length;

  const todasMetricas: MetricaTendenciaCalculada[] = TENDENCIAS_REGISTRY.map((def) => {
    let pts = 0;
    let err = 0;
    let pen = 0;
    let hits = 0;
    const histPts: number[] = [0];

    const numsSet = new Set(def.numeros);

    numerosCronologicos.forEach((num) => {
      if (num === 0 && !numsSet.has(0)) {
        err++;
      } else if (numsSet.has(num)) {
        pts += 1;
        err = 0;
        hits++;
      } else {
        err++;
      }

      // Tolerância de 2 erros consecutivos
      if (err >= 2) {
        pts -= 1;
        err = 0;
        pen++;
      }

      histPts.push(pts);
    });

    // Análise da janela recente (últimas 5 rodadas = 6 pontos)
    let ganho5R = 0;
    let semQuedas5R = false;
    let velocidadeRecente = 0;
    let aceleracaoCurva = 0;
    let zScore = 0;
    let acertos5R = 0;

    const nJanela = Math.min(5, Math.max(1, totalGiros));
    const ultimosNumeros = numerosCronologicos.slice(-nJanela);
    acertos5R = ultimosNumeros.filter((n) => numsSet.has(n)).length;

    // Cálculo Z-Score na janela recente
    const p = def.probTeorica;
    const n = ultimosNumeros.length || 1;
    const esperado = n * p;
    const variancia = n * p * (1 - p);
    const desvPadrao = Math.sqrt(variancia) || 1;
    zScore = Number(((acertos5R - esperado) / desvPadrao).toFixed(2));

    if (histPts.length >= 6) {
      const janela = histPts.slice(-6);
      const pUltimo = janela[janela.length - 1] ?? 0;
      const pPrimeiro = janela[0] ?? 0;
      ganho5R = pUltimo - pPrimeiro;

      let semQueda = true;
      for (let i = 1; i < janela.length; i++) {
        const atual = janela[i];
        const ant = janela[i - 1];
        if (atual === undefined || ant === undefined || atual < ant) {
          semQueda = false;
          break;
        }
      }
      semQuedas5R = semQueda;

      velocidadeRecente = Number((ganho5R / 5).toFixed(2));

      // Aceleração: taxa recente (últimos 2 giros) vs anterior (giros 3 a 5 atrás)
      const pMeio = janela[3] ?? pPrimeiro;
      const velRecente = (pUltimo - pMeio) / 2;
      const velAnterior = (pMeio - pPrimeiro) / 3;
      aceleracaoCurva = Number((velRecente - velAnterior).toFixed(2));
    } else if (histPts.length >= 2) {
      const pUltimo = histPts[histPts.length - 1] ?? 0;
      const pPrimeiro = histPts[0] ?? 0;
      ganho5R = pUltimo - pPrimeiro;
      semQuedas5R = ganho5R > 0;
      velocidadeRecente = Number((ganho5R / histPts.length).toFixed(2));
      aceleracaoCurva = 0;
    }

    // Algoritmo de Score de Suspeita (0 a 100)
    // Fatores:
    // 1. Z-Score (máx 40 pts)
    const ptsZ = Math.min(40, Math.max(0, (zScore / 2.5) * 40));
    // 2. Ganho sem quedas (máx 35 pts)
    const ptsGanho = semQuedas5R ? Math.min(35, Math.max(10, ganho5R * 8)) : Math.max(0, ganho5R * 3);
    // 3. Aceleração positiva (máx 25 pts)
    const ptsAcel = aceleracaoCurva > 0 ? Math.min(25, aceleracaoCurva * 25) : 0;

    let scoreSuspeita = Math.round(ptsZ + ptsGanho + ptsAcel);
    if (scoreSuspeita > 100) scoreSuspeita = 100;

    // Condição estrita de Movimento Suspeito de Crescimento (Nível Hard Doutorado)
    // Ativa se: Z-Score cruza o limiar rigoroso (ex: 1.96σ) OU ganho >= 3 sem quedas com Z >= 1.4σ
    const isMovimentoSuspeito =
      (zScore >= limiarRigorZ && ganho5R >= 2 && semQuedas5R) ||
      (ganho5R >= 4 && semQuedas5R) ||
      (scoreSuspeita >= 75 && semQuedas5R);

    let statusNivel: "critico" | "alto" | "moderado" | "neutro" = "neutro";
    if (isMovimentoSuspeito && (zScore >= 2.3 || ganho5R >= 4)) {
      statusNivel = "critico";
    } else if (isMovimentoSuspeito) {
      statusNivel = "alto";
    } else if (scoreSuspeita >= 50) {
      statusNivel = "moderado";
    }

    return {
      def,
      pontosTotal: pts,
      pontosHistorico: histPts,
      errosAtuais: err,
      penalidadesTotal: pen,
      acertosTotal: hits,
      ganho5R,
      semQuedas5R,
      velocidadeRecente,
      aceleracaoCurva,
      zScore,
      acertos5R,
      scoreSuspeita,
      isMovimentoSuspeito,
      statusNivel,
    };
  });

  // Filtrar tendências suspeitas ordenadas por score de suspeita e Z-Score
  const tendenciasSuspeitas = todasMetricas
    .filter((m) => m.isMovimentoSuspeito)
    .sort((a, b) => b.scoreSuspeita - a.scoreSuspeita || b.zScore - a.zScore || b.ganho5R - a.ganho5R);

  const modoExpertAtivo = tendenciasSuspeitas.length > 0;
  const tendenciaPrincipal = tendenciasSuspeitas[0] ?? null;

  // Cálculo da Super-Confluência Doutorado
  let confluenciaDoutorado: ResultadoSentinelaDoutorado["confluenciaDoutorado"] = null;

  if (tendenciaPrincipal) {
    // Buscar uma segunda métrica com maior sinergia de categoria diferente
    // Exemplo: se a principal for Coluna, buscar no Padrão F ou Setor Balístico
    const outraTendencia =
      tendenciasSuspeitas.find((t) => t.def.categoria !== tendenciaPrincipal.def.categoria) ||
      todasMetricas
        .filter((t) => t.def.categoria !== tendenciaPrincipal.def.categoria)
        .sort((a, b) => b.pontosTotal - a.pontosTotal)[0] ||
      null;

    const setA = new Set(tendenciaPrincipal.def.numeros);
    const setB = outraTendencia ? new Set(outraTendencia.def.numeros) : new Set<number>();

    // Interseção Sniper
    const sniperNumbers = outraTendencia
      ? tendenciaPrincipal.def.numeros.filter((n) => setB.has(n))
      : tendenciaPrincipal.def.numeros.slice(0, 4);

    const nomeA = `${tendenciaPrincipal.def.nome} (${tendenciaPrincipal.def.categoriaLabel})`;
    const nomeB = outraTendencia
      ? `${outraTendencia.def.nome} (${outraTendencia.def.categoriaLabel})`
      : "Proteção Zero & Adjacências";

    const movimentoExato = `ENTRADA IMEDIATA NA ${tendenciaPrincipal.def.nome.toUpperCase()} (${tendenciaPrincipal.def.corNome.toUpperCase()}) COM COBERTURA NO 0 E CONFLUÊNCIA EM ${outraTendencia?.def.nome.toUpperCase() || "CILINDRO"}. ALVOS SNIPER DE INTERSEÇÃO: [ ${sniperNumbers.join(", ")} ] · JANELA TÁTICA: PRÓXIMOS 3 A 4 GIROS!`;

    const justificativaCientifica = `Ruptura detectada com Z = +${tendenciaPrincipal.zScore}σ (desvio crítico), taxa de velocidade de +${tendenciaPrincipal.velocidadeRecente} pts/giro e aceleração de +${tendenciaPrincipal.aceleracaoCurva} pts/giro² sem sofrer penalidades nos últimos 5 giros (+${tendenciaPrincipal.ganho5R} pts acumulados).`;

    confluenciaDoutorado = {
      tendenciaA: tendenciaPrincipal,
      tendenciaB: outraTendencia,
      sniperNumbers,
      descricaoConfluencia: `${nomeA} ∩ ${nomeB}`,
      movimentoExato,
      justificativaCientifica,
    };
  }

  return {
    timestamp: Date.now(),
    totalGiros,
    modoExpertAtivo,
    tendenciasSuspeitas,
    tendenciaPrincipal,
    confluenciaDoutorado,
    todasMetricas,
  };
}
