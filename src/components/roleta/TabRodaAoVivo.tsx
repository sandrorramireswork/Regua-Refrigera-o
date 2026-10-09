import { useMemo, useState } from "react";
import {
  CILINDRO,
  calcEstatisticas,
  calcGrupos,
  calcTransicoes,
  getProps,
  vizinhos,
  type Spin,
  type EstatNum,
} from "@/lib/roulette";
import { REDS } from "@/lib/roulette";
import { anguloDe } from "@/lib/quant";

/** Inicial do setor do cilindro (V / T / O) */
function inicialSetor(setor: string) {
  return setor && setor !== "—" ? setor.charAt(0).toUpperCase() : "";
}


export { calcEstatisticas, type EstatNum } from "@/lib/roulette";

export function corDoNumero(n: number) {
  return n === 0 ? "#00E676" : REDS.includes(n) ? "#FF003C" : "#000000";
}

/** Roda dos setores com último resultado + vizinhos em amarelo e puxadas em verde */
export function TabRodaAoVivo({ spins }: { spins: Spin[] }) {
  const ultimo = spins[0]?.num;

  const amarelos = useMemo(
    () => (ultimo === undefined ? new Set<number>() : new Set(vizinhos(ultimo, 2))),
    [ultimo],
  );

  const puxadas = useMemo(() => {
    if (ultimo === undefined) return [] as { destino: number; qtd: number; perc: number }[];
    return calcTransicoes(spins, { minCount: 1, topN: 2000, windowSize: 1000 })
      .filter((t) => t.origem === ultimo)
      .sort((a, b) => b.qtd - a.qtd || b.perc - a.perc)
      .slice(0, 5)
      .map((t) => ({ destino: t.destino, qtd: t.qtd, perc: t.perc }));
  }, [spins, ultimo]);

  const verdes = useMemo(() => new Set(puxadas.map((p) => p.destino)), [puxadas]);

  // Vizinhos (2 de cada lado) e o que cada um puxa
  const puxadasVizinhos = useMemo(() => {
    if (ultimo === undefined) return [] as { vizinho: number; alvos: { destino: number; qtd: number; perc: number }[] }[];
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
  const estat = useMemo(() => calcEstatisticas(spins), [spins]);
  const grupos = useMemo(() => calcGrupos(spins), [spins]);
  const forteDuzia = grupos.favDuzias[0] ?? { idx: 0, nome: "—", qtd: 0, perc: 0 };
  const forteColuna = grupos.favColunas[0] ?? { idx: 0, nome: "—", qtd: 0, perc: 0 };
  const letraUltimo =
    ultimo === undefined ? "" : inicialSetor(getProps(ultimo).setor);
  const letraPuxa =
    puxadas[0] === undefined ? "" : inicialSetor(getProps(puxadas[0].destino).setor);
  const esperado = spins.length / 37;
  const maxQtd = Math.max(1, ...estat.map((item) => item.qtd));
  const anguloUltimo = ultimo === undefined ? 0 : anguloDe(ultimo);

  const [ordenacao, setOrdenacao] = useState<"padrao" | "numerica" | "saidas" | "espera">("padrao");

  const listaExibicao = useMemo(() => {
    if (ordenacao === "padrao") {
      return CILINDRO.map((n) => estat[n]!).filter(Boolean);
    }
    if (ordenacao === "saidas") {
      return [...estat].sort((a, b) => b.qtd - a.qtd || a.esperaAtual - b.esperaAtual);
    }
    if (ordenacao === "espera") {
      return [...estat].sort((a, b) => b.esperaAtual - a.esperaAtual || b.maiorEspera - a.maiorEspera);
    }
    return estat;
  }, [estat, ordenacao]);


  if (spins.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Ainda não há giros registrados para desenhar a roda.
      </p>
    );
  }

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
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground">
        {spins.length} giros deste aparelho ·
        esperado por número: {esperado.toFixed(1)} saídas
      </div>

      <section className="neon-cyan-glow grid gap-3 rounded-lg p-2 sm:p-3 md:grid-cols-[480px_1fr]">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto h-auto w-full max-w-[480px]"
          role="img"
          aria-label="Roda da roleta com último resultado, vizinhos e números que puxam"
        >
          {CILINDRO.map((num, i) => {
            const ehUltimo = num === ultimo;
            const ehVizinho = amarelos.has(num);
            const ehPuxada = verdes.has(num);
            const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            const salto = ehUltimo ? 22 : 0;
            const rt = (rIn + rOut) / 2 + salto;
            const repeticoes = estat[num]?.qtd ?? 0;
            const barra = repeticoes === 0 ? 3 : 4 + (repeticoes / maxQtd) * 15;
            const rb0 = rOut + 3 + salto;
            const rb1 = rb0 + barra;
            const stroke = ehUltimo
              ? "#FFFFFF"
              : ehVizinho
                ? "#FFD600"
                : ehPuxada
                  ? "#00FF7F"
                  : "#00E5FF22";
            return (
              <g key={num}>
                <line
                  x1={cx + rb0 * Math.cos(ang)}
                  y1={cy + rb0 * Math.sin(ang)}
                  x2={cx + rb1 * Math.cos(ang)}
                  y2={cy + rb1 * Math.sin(ang)}
                  className="stroke-foreground"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity={repeticoes === 0 ? 0.12 : 0.45 + (repeticoes / maxQtd) * 0.55}
                >
                  <title>{num}: {repeticoes} repetições</title>
                </line>
                <path
                  d={arco(i, rOut + salto, rIn + salto)}
                  fill={ehVizinho ? "#FFD600" : ehPuxada ? "#00FF7F" : corDoNumero(num)}
                  fillOpacity={ehVizinho ? 0.9 : ehPuxada ? 0.8 : 0.85}
                  stroke={ehUltimo ? "#00B0FF" : stroke}
                  strokeWidth={ehUltimo ? 4 : ehVizinho || ehPuxada ? 2 : 0.6}
                  style={ehUltimo ? { filter: "drop-shadow(0 0 10px #00B0FF)" } : undefined}
                />
                <text
                  x={cx + rt * Math.cos(ang)}
                  y={cy + rt * Math.sin(ang) + 6}
                  textAnchor="middle"
                  fontSize={ehUltimo ? "19" : "15"}
                  fontWeight="900"
                  fill={ehVizinho || ehPuxada ? "#07080d" : "#FFFFFF"}
                  stroke={ehUltimo ? "#000000" : "none"}
                  strokeWidth={ehUltimo ? 1 : 0}
                  style={
                    ehVizinho || ehPuxada
                      ? undefined
                      : { filter: ehUltimo ? "drop-shadow(0 0 6px #00B0FF)" : "drop-shadow(0 0 2px rgba(0,176,255,0.7))", textShadow: "0 0 2px rgba(0,176,255,0.6)" }
                  }
                >
                  {num}
                </text>
                {cianos.has(num) && (
                  <circle
                    cx={cx + rt * Math.cos(ang)}
                    cy={cy + rt * Math.sin(ang)}
                    r={15}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth={3.5}
                    style={{ filter: "drop-shadow(0 0 8px #00E5FF)" }}
                  >
                    <title>{num}: puxado por vizinho do último</title>
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
            <linearGradient id="texto3d" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FFD600" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <filter id="saliente" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#FFFFFF" floodOpacity="0.9" />
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#FFD600" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#B8860B" floodOpacity="0.6" />
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={rIn - 6} fill="#07080d" stroke="#FFD60055" />
          <circle cx={cx} cy={cy} r={rIn - 18} fill="url(#centro3d)" opacity="0.22" />
          <circle cx={cx} cy={cy} r={rIn - 24} fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.35" />
          <text x={cx} y={cy - 46} textAnchor="middle" fontSize="10" className="fill-muted-foreground font-bold tracking-wider">
            RESULTADO
          </text>
          <text
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            fontSize="82"
            fontWeight="900"
            fill={ultimo === undefined ? "#e8eaf6" : corDoNumero(ultimo)}
            stroke="#000000"
            strokeWidth={1.2}
            style={{ filter: "url(#saliente)" }}
          >
            {ultimo ?? "—"}
          </text>
          <text x={cx} y={cy + 54} textAnchor="middle" fontSize="28" fontWeight="900" className="fill-neon-cyan">
            {letraUltimo || "—"}
          </text>
          <text
            fontSize="16"
            fontWeight="900"
            className="fill-neon-green"
            style={{ filter: "drop-shadow(0 0 7px #00FF7F)" }}
          >
            <textPath href="#puxa-contorno-interno" startOffset="50%" textAnchor="middle">
              PUXA {puxadas[0]?.destino ?? "—"} · SETOR {letraPuxa || "—"}
            </textPath>
          </text>
        </svg>


        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-neon-magenta/60 bg-neon-magenta/10 p-2 text-center">
              <div className="text-[9px] uppercase text-muted-foreground">Dúzia forte</div>
              <div className="font-display text-base font-black text-neon-magenta">{forteDuzia.idx}ª · {forteDuzia.perc.toFixed(1)}%</div>
            </div>
            <div className="rounded-md border border-neon-cyan/60 bg-neon-cyan/10 p-2 text-center">
              <div className="text-[9px] uppercase text-muted-foreground">Coluna forte</div>
              <div className="font-display text-base font-black text-neon-cyan">{forteColuna.idx}ª · {forteColuna.perc.toFixed(1)}%</div>
            </div>
            <div className="rounded-md border border-neon-gold/60 bg-neon-gold/10 p-2 text-center">
              <div className="text-[9px] uppercase text-muted-foreground">Ângulo</div>
              <div className="font-display text-base font-black text-neon-gold">{anguloUltimo.toFixed(1)}°</div>
            </div>
          </div>
          <div className="rounded-md border border-neon-gold/50 bg-neon-gold/10 p-2">
            <div className="text-[10px] uppercase text-neon-gold">Vizinhos do último (amarelo)</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...amarelos].map((v) => (
                <span
                  key={v}
                  className="rounded-md border border-neon-gold px-2 py-1 font-display text-sm font-black text-neon-gold"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-neon-green/60 bg-neon-green/10 p-2">
            <div className="text-[10px] uppercase text-neon-green">Puxando agora (verde)</div>
            {puxadas.length === 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Sem histórico de puxada para o número {ultimo}.
              </p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {puxadas.map((p) => (
                  <span
                    key={p.destino}
                    className="rounded-md border border-neon-green bg-neon-green/15 px-2 py-1 font-display text-sm font-black text-neon-green"
                    style={{ textShadow: "0 0 8px #00FF7F" }}
                  >
                    {p.destino}
                    <span className="ml-1 text-[10px] opacity-80">
                      {p.qtd}x · {p.perc.toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-neon-cyan/60 bg-neon-cyan/10 p-2">
            <div className="text-[10px] uppercase text-neon-cyan">
              Vizinhos do {ultimo ?? "—"} e o que cada um puxa (ciano)
            </div>
            <div className="mt-1.5 space-y-1.5">
              {puxadasVizinhos.map((v) => (
                <div key={v.vizinho} className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md border border-neon-gold px-2 py-1 font-display text-sm font-black text-neon-gold">
                    {v.vizinho}
                  </span>
                  <span className="text-[10px] text-muted-foreground">puxa</span>
                  {v.alvos.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">sem histórico</span>
                  ) : (
                    v.alvos.map((a) => (
                      <span
                        key={a.destino}
                        className="rounded-md border border-neon-cyan bg-neon-cyan/15 px-2 py-1 font-display text-sm font-black text-neon-cyan"
                        style={{ textShadow: "0 0 8px #00E5FF" }}
                      >
                        {a.destino}
                        <span className="ml-1 text-[10px] opacity-80">
                          {a.qtd}x · {a.perc.toFixed(0)}%
                        </span>
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="neon-cyan-glow rounded-lg p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-[11px] uppercase tracking-widest text-neon-magenta">
              Mesa quente · saídas e máximas
            </div>
            <div className="text-[9px] text-muted-foreground">
              barra branca = repetições · dourado = maior espera
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="text-[9px] uppercase text-muted-foreground mr-1">Ordem:</span>
            <button
              onClick={() => setOrdenacao("padrao")}
              className={`rounded px-2 py-0.5 font-bold transition-colors ${
                ordenacao === "padrao"
                  ? "bg-neon-cyan text-black shadow-[0_0_8px_#00E5FF]"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Roleta Padrão (Cilindro)
            </button>
            <button
              onClick={() => setOrdenacao("numerica")}
              className={`rounded px-2 py-0.5 font-bold transition-colors ${
                ordenacao === "numerica"
                  ? "bg-neon-cyan text-black shadow-[0_0_8px_#00E5FF]"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              0–36
            </button>
            <button
              onClick={() => setOrdenacao("saidas")}
              className={`rounded px-2 py-0.5 font-bold transition-colors ${
                ordenacao === "saidas"
                  ? "bg-neon-magenta text-white shadow-[0_0_8px_#FF2E9A]"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Mais Saídas
            </button>
            <button
              onClick={() => setOrdenacao("espera")}
              className={`rounded px-2 py-0.5 font-bold transition-colors ${
                ordenacao === "espera"
                  ? "bg-neon-gold text-black shadow-[0_0_8px_#FFD600]"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              Mais Atrasados
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
          {listaExibicao.map((e) => (
            <div
              key={e.num}
              className="relative overflow-hidden rounded-md border px-1.5 py-1.5"
              style={{
                borderColor:
                  e.num === ultimo
                    ? "#FFFFFF"
                    : verdes.has(e.num)
                      ? "#00FF7F"
                      : amarelos.has(e.num)
                        ? "#FFD600"
                        : "#00E5FF33",
              }}
              title={`${e.num}: ${e.qtd} saídas · maior espera ${e.maiorEspera} giros · sem sair há ${e.esperaAtual}`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded font-display text-[12px] font-black text-white"
                  style={{ background: corDoNumero(e.num) }}
                >
                  {e.num}
                </span>
                <span className="font-display text-base font-black text-foreground drop-shadow-[0_0_6px_var(--foreground)]">
                  {e.qtd}x
                </span>
                <span className="ml-auto text-right text-[9px] font-black leading-tight text-neon-gold">
                  máx<br />{e.maiorEspera}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground shadow-[0_0_8px_var(--foreground)]"
                  style={{ width: `${(e.qtd / maxQtd) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
