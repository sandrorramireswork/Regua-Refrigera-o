import { motorCor, motorInercia, motorMaiorMenor, motorTerminais } from "@/lib/quant";
import { calcTransicoes, type PullRules, type Spin } from "@/lib/roulette";

export function TabMotores({ spins, regras }: { spins: Spin[]; regras: PullRules }) {
  if (spins.length < 2) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Registre pelo menos dois giros para calcular os motores matemáticos.
      </p>
    );
  }

  const inercia = motorInercia(spins);
  const mm = motorMaiorMenor(spins);
  const cor = motorCor(spins);
  const terminais = motorTerminais(spins).slice(0, 5);
  const gatilhos = calcTransicoes(spins, { ...regras, topN: 8, minCount: 1 });
  const maxQtd = Math.max(1, ...gatilhos.map((g) => g.qtd));

  return (
    <div className="flex flex-col gap-3 pb-4 text-[11px]">
      <Bloco titulo="Padrão 1 — Inércia">
        <Linha k="Repetições diretas" v={`${inercia.repeticoes}x`} />
        <Linha k="Sequência atual de dúzia" v={`${inercia.runDuzia} giros`} />
        <Linha k="Sequência atual de coluna" v={`${inercia.runColuna} giros`} />
        <Linha
          k="Proximidade no rotor (≤2 casas)"
          v={`${inercia.proximidade}x · ${inercia.percProximidade.toFixed(1)}%`}
        />
      </Bloco>

      <Bloco titulo="Padrão 2 — Maior / Menor">
        <Linha k="Maior (19-36)" v={`${mm.maior}`} />
        <Linha k="Menor (1-18)" v={`${mm.menor}`} />
        <Linha k="Desvio da base 50%" v={`${mm.desvio >= 0 ? "+" : ""}${mm.desvio.toFixed(1)}%`} />
        <Linha k="Sequência atual" v={`${mm.ladoAtual} · ${mm.runAtual} giros`} />
        {mm.sinalReversao && (
          <div className="mt-1 rounded-md bg-neon-red/15 px-2 py-1 text-center font-black text-neon-red">
            SINAL DE REVERSÃO — {mm.runAtual} giros seguidos em {mm.ladoAtual}
          </div>
        )}
      </Bloco>

      <Bloco titulo="Padrão 3 — Cor (Markov)">
        <Linha k="Cor atual" v={`${cor.corAtual} · ${cor.runAtual} seguidos`} />
        <Linha k="Maior sequência do histórico" v={`${cor.maiorRun} giros`} />
        <div className="mt-1 grid grid-cols-2 gap-1">
          {cor.matriz.map((m) => (
            <div key={`${m.de}-${m.para}`} className="rounded bg-muted px-2 py-1">
              {m.de === "red" ? "VERM" : "PRETO"} → {m.para === "red" ? "VERM" : "PRETO"}:{" "}
              <b className="text-neon-cyan">{m.perc.toFixed(0)}%</b> ({m.qtd}x)
            </div>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Padrão 4 — Duplos T (terminais)">
        <table className="w-full text-center">
          <thead className="text-[10px] text-neon-cyan">
            <tr>
              <th className="py-1">Term.</th>
              <th>Qtd</th>
              <th>%</th>
              <th>Afinidade</th>
            </tr>
          </thead>
          <tbody>
            {terminais.map((t) => (
              <tr key={t.terminal} className="border-t border-border/60">
                <td className="py-1 font-black text-neon-gold">T{t.terminal}</td>
                <td>{t.qtd}</td>
                <td>{t.perc.toFixed(1)}%</td>
                <td className="text-neon-magenta">
                  {t.afinidade !== null ? `T${t.afinidade} (${t.afinidadeQtd}x)` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloco>

      <Bloco titulo="Gatilhos — matriz de transição">
        <div className="flex flex-col gap-1">
          {gatilhos.map((g) => (
            <div key={`${g.origem}-${g.destino}`} className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-black">
                {g.origem} → {g.destino}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded bg-muted">
                <span
                  className="block h-full rounded bg-neon-cyan"
                  style={{ width: `${(g.qtd / maxQtd) * 100}%` }}
                />
              </span>
              <span className="w-16 shrink-0 text-right text-neon-magenta">
                {g.qtd}x · {g.perc.toFixed(0)}%
              </span>
            </div>
          ))}
          {gatilhos.length === 0 && <span className="text-muted-foreground">Sem transições ainda.</span>}
        </div>
      </Bloco>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="neon-cyan-glow rounded-lg bg-card/60 p-2.5">
      <h3 className="mb-1.5 font-display text-[11px] font-black uppercase tracking-wide text-neon-cyan">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-t border-border/40 py-0.5 first:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-black text-foreground">{v}</span>
    </div>
  );
}
