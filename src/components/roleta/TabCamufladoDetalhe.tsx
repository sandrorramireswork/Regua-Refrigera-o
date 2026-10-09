import {
  GRUPOS_COLUNA,
  calcCiclosColuna,
  deslocamentoRecente,
  distanciaAngular,
  frequenciaRotor,
  kellyFracionado,
  motorTerminais,
  type Sniper,
} from "@/lib/quant";
import { CILINDRO, type Spin } from "@/lib/roulette";
import { AngulosCilindro } from "@/components/roleta/AngulosCilindro";

const P_GRUPO = 12 / 37;

function zGrupo(qtd: number, n: number) {
  if (n <= 0) return 0;
  const obs = qtd / n;
  return (obs - P_GRUPO) / Math.sqrt((P_GRUPO * (1 - P_GRUPO)) / n);
}

function grupoDe(num: number): string | null {
  const g = GRUPOS_COLUNA.find((x) => (x.numbers as readonly number[]).includes(num));
  return g?.id ?? null;
}

/** Aba "Padrão Camuflado" — leitura detalhada dos subgrupos 147/258/369 */
export function TabCamufladoDetalhe({
  spins,
  sniper,
  origem,
}: {
  spins: Spin[];
  sniper: Sniper | null;
  origem?: string;
}) {
  const validos = spins.filter((s) => s.num !== 0);
  const n = validos.length;

  if (n < 3) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Sem giros suficientes na fonte atual para a análise detalhada do Padrão Camuflado.
      </p>
    );
  }

  const ciclos = calcCiclosColuna(spins);

  // sequência de grupos (mais recente primeiro) e intervalos entre aparições
  const seq = validos.map((s) => grupoDe(s.num));
  const gaps = new Map<string, number[]>();
  GRUPOS_COLUNA.forEach((g) => gaps.set(g.id, []));
  let ultimoIdx = new Map<string, number>();
  seq.forEach((g, i) => {
    if (!g) return;
    const anterior = ultimoIdx.get(g);
    if (anterior !== undefined) gaps.get(g)!.push(i - anterior);
    ultimoIdx.set(g, i);
  });

  // matriz de transição entre grupos (o que o grupo puxa)
  const trans = new Map<string, number>();
  for (let i = seq.length - 1; i > 0; i -= 1) {
    const de = seq[i];
    const para = seq[i - 1];
    if (!de || !para) continue;
    trans.set(`${de}>${para}`, (trans.get(`${de}>${para}`) ?? 0) + 1);
  }

  // dispersão física: distância angular média entre giros consecutivos por grupo
  const desloc = deslocamentoRecente(spins, 10);
  const rotor = frequenciaRotor(spins);
  const zonasQuentes = CILINDRO.map((_, i) => {
    const nums = [-2, -1, 0, 1, 2].map((d) => CILINDRO[(i + d + CILINDRO.length) % CILINDRO.length]!);
    const set = new Set(nums);
    const qtd = spins.filter((s) => set.has(s.num)).length;
    const p = qtd / (spins.length || 1);
    return {
      nums,
      qtd,
      perc: p * 100,
      z: (p - 5 / 37) / Math.sqrt(((5 / 37) * (1 - 5 / 37)) / (spins.length || 1)),
      kelly: kellyFracionado(p),
    };
  })
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  const terminais = motorTerminais(spins).slice(0, 5);
  const ultimo = spins[0];
  const grupoAtual = ultimo ? grupoDe(ultimo.num) : null;

  return (
    <div className="flex flex-col gap-3 pb-6">
      <p className="text-center text-[10px] text-muted-foreground">{origem ?? `${spins.length} giros`}</p>

      {/* RESUMO QUANTITATIVO */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Card label="Giros válidos (sem zero)" value={String(n)} />
        <Card label="Grupo do último giro" value={grupoAtual ?? "ZERO"} tom="gold" />
        <Card label="Δ angular médio (10)" value={`${desloc.toFixed(1)} casas`} />
        <Card
          label="Kelly da zona sniper"
          value={sniper ? `${(sniper.kelly * 100).toFixed(2)}%` : "—"}
          tom="green"
        />
      </div>

      {/* SUBGRUPOS DETALHADOS */}
      <div className="neon-cyan-glow overflow-x-auto rounded-lg">
        <table className="w-full min-w-[520px] text-center text-[11px]">
          <thead className="bg-muted font-display text-[10px] text-neon-cyan">
            <tr>
              <th className="py-1.5">Subgrupo</th>
              <th>Saídas</th>
              <th>Observado</th>
              <th>Esperado</th>
              <th>Desvio</th>
              <th>Z</th>
              <th>Atraso</th>
              <th>Gap médio</th>
              <th>Maior gap</th>
              <th>Prob. atraso</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => {
              const g = gaps.get(c.id) ?? [];
              const media = g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0;
              const maior = g.length ? Math.max(...g) : 0;
              const z = zGrupo(c.qtd, n);
              return (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="py-1.5 font-black text-neon-gold">{c.label}</td>
                  <td>{c.qtd}</td>
                  <td className="font-black">{c.perc.toFixed(1)}%</td>
                  <td className="text-muted-foreground">32.4%</td>
                  <td className={c.perc - 32.4 >= 0 ? "text-neon-green" : "text-neon-red"}>
                    {(c.perc - 32.4).toFixed(1)}%
                  </td>
                  <td className={Math.abs(z) >= 1.65 ? "font-black text-neon-green" : ""}>
                    {z.toFixed(2)}
                  </td>
                  <td className={c.atraso !== null && c.atraso >= 6 ? "font-black text-neon-red" : ""}>
                    {c.atraso ?? "—"}
                  </td>
                  <td>{media ? media.toFixed(1) : "—"}</td>
                  <td>{maior || "—"}</td>
                  <td className="text-neon-magenta">{(c.probAtraso * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SEQUÊNCIA CAMUFLADA */}
      <div className="neon-cyan-glow rounded-lg p-2">
        <div className="font-display text-[11px] font-black text-neon-cyan">
          SEQUÊNCIA DOS ÚLTIMOS 30 GIROS
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {validos.slice(0, 30).map((s, i) => {
            const g = grupoDe(s.num);
            return (
              <span
                key={`${s.id}-${i}`}
                className={`rounded-md border px-1.5 py-1 font-display text-[10px] font-black ${
                  g === "147"
                    ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan"
                    : g === "258"
                      ? "border-neon-magenta/60 bg-neon-magenta/10 text-neon-magenta"
                      : "border-neon-gold/60 bg-neon-gold/10 text-neon-gold"
                }`}
              >
                {s.num}
                <span className="ml-1 opacity-70">{g}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* MATRIZ ENTRE SUBGRUPOS */}
      <div className="neon-cyan-glow rounded-lg p-2">
        <div className="font-display text-[11px] font-black text-neon-cyan">
          O QUE CADA SUBGRUPO PUXA
        </div>
        <table className="mt-1.5 w-full text-center text-[11px]">
          <thead className="font-display text-[10px] text-neon-gold">
            <tr>
              <th className="py-1">De</th>
              {GRUPOS_COLUNA.map((g) => (
                <th key={g.id}>→ {g.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS_COLUNA.map((de) => {
              const totalDe = GRUPOS_COLUNA.reduce(
                (acc, para) => acc + (trans.get(`${de.id}>${para.id}`) ?? 0),
                0,
              );
              return (
                <tr key={de.id} className="border-t border-border/60">
                  <td className="py-1 font-black text-neon-gold">{de.label}</td>
                  {GRUPOS_COLUNA.map((para) => {
                    const q = trans.get(`${de.id}>${para.id}`) ?? 0;
                    const perc = totalDe ? (q / totalDe) * 100 : 0;
                    return (
                      <td
                        key={para.id}
                        className={perc >= 40 ? "font-black text-neon-green" : "text-foreground"}
                      >
                        {q} · {perc.toFixed(0)}%
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ZONAS FÍSICAS COM Z E KELLY */}
      <div className="neon-cyan-glow overflow-x-auto rounded-lg p-2">
        <div className="font-display text-[11px] font-black text-neon-cyan">
          TOP 5 ZONAS DO CILINDRO (5 CASAS)
        </div>
        <table className="mt-1.5 w-full min-w-[420px] text-center text-[11px]">
          <thead className="font-display text-[10px] text-neon-gold">
            <tr>
              <th className="py-1">Zona</th>
              <th>Saídas</th>
              <th>%</th>
              <th>Z-Score</th>
              <th>Kelly</th>
            </tr>
          </thead>
          <tbody>
            {zonasQuentes.map((z) => (
              <tr key={z.nums.join("-")} className="border-t border-border/60">
                <td className="py-1 font-black text-neon-cyan">{z.nums.join(" ")}</td>
                <td>{z.qtd}</td>
                <td className="font-black">{z.perc.toFixed(1)}%</td>
                <td className={z.z >= 1.65 ? "font-black text-neon-green" : ""}>{z.z.toFixed(2)}</td>
                <td className="text-neon-magenta">{(z.kelly * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TERMINAIS E ROTOR */}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="neon-cyan-glow rounded-lg p-2">
          <div className="font-display text-[11px] font-black text-neon-cyan">
            TERMINAIS MAIS FORTES
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {terminais.map((t) => (
              <span
                key={t.terminal}
                className="rounded-md border border-neon-gold/60 bg-neon-gold/10 px-2 py-1 font-black text-neon-gold"
              >
                T{t.terminal} · {t.qtd}x · {t.perc.toFixed(1)}%
                {t.afinidade !== null && (
                  <span className="ml-1 text-neon-cyan">→ T{t.afinidade}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="neon-cyan-glow rounded-lg p-2">
          <div className="font-display text-[11px] font-black text-neon-cyan">
            NÚMEROS MAIS QUENTES DO ROTOR
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            {[...rotor]
              .sort((a, b) => b.qtd - a.qtd)
              .slice(0, 8)
              .map((r) => (
                <span
                  key={r.num}
                  className={`rounded-md px-2 py-1 font-black ${
                    r.num === 0 ? "num-green" : r.cor === "red" ? "num-red" : "num-black"
                  }`}
                >
                  {r.num} · {r.qtd}x
                  {ultimo && (
                    <span className="ml-1 text-[9px] opacity-80">
                      Δ{distanciaAngular(ultimo.num, r.num)}
                    </span>
                  )}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* ÂNGULO REAL NO CILINDRO */}
      <AngulosCilindro spins={spins} zona={sniper?.zona} />

      {/* CHECKLIST SNIPER */}
      {sniper && (
        <div
          className={`rounded-lg border p-2 text-[11px] ${
            sniper.disparo ? "num-green" : "border-neon-cyan/50 bg-card/60"
          }`}
        >
          <div className="font-display text-[11px] font-black">
            CHECKLIST TIER 1 — {sniper.disparo ? "LIBERADO" : "BLOQUEADO"}
          </div>
          <ul className="mt-1 grid gap-0.5 md:grid-cols-2">
            <Item ok={sniper.zonaPerc >= 22.5} txt={`Zona ≥ 22,5% (${sniper.zonaPerc.toFixed(1)}%)`} />
            <Item ok={sniper.z >= 1.65} txt={`Z ≥ 1,65 (${sniper.z.toFixed(2)})`} />
            <Item ok={sniper.deslocamento <= 2} txt={`Δ ≤ 2 casas (${sniper.deslocamento})`} />
            <Item ok={sniper.retencaoSetor} txt="Retenção de setor" />
            <Item ok={sniper.duziaConfirma} txt="Dúzia forte confirma" />
            <Item ok={sniper.colunaConfirma} txt="Coluna forte confirma" />
          </ul>
        </div>
      )}
    </div>
  );
}

function Item({ ok, txt }: { ok: boolean; txt: string }) {
  return (
    <li className={ok ? "text-neon-green" : "text-muted-foreground"}>
      {ok ? "✓" : "✗"} {txt}
    </li>
  );
}

function Card({ label, value, tom }: { label: string; value: string; tom?: "gold" | "green" }) {
  return (
    <div className="rounded-md border border-border bg-card/60 px-2 py-1.5">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-display text-sm font-black ${
          tom === "gold" ? "text-neon-gold" : tom === "green" ? "text-neon-green" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
