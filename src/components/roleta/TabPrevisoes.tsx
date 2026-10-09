import { useMemo, useState } from "react";
import {
  calcDesempenhoPadrao,
  calcZona,
  getProps,
  melhorPuxada,
  CILINDRO,
  type Padrao,
  type PullRules,
  type Spin,
} from "@/lib/roulette";
import {
  anguloDe,
  distanciaAngular,
  kellyFracionado,
  zScore,
} from "@/lib/quant";

const NUMEROS = Array.from({ length: 37 }, (_, i) => i);

function vizinhosCilindro(n: number, k = 2): number[] {
  const i = CILINDRO.indexOf(n);
  if (i < 0) return [n];
  return [-k, -1, 0, 1, k]
    .slice(0, 2 * k + 1)
    .map((d) => CILINDRO[(i + d + CILINDRO.length) % CILINDRO.length]!);
}

export function TabPrevisoes({
  spins,
  padroes,
  regras,
  origem,
}: {
  spins: Spin[];
  padroes: Padrao[];
  regras?: PullRules;
  origem?: string;
}) {
  const ativos = padroes.filter((p) => p.ativa);
  const [num, setNum] = useState<number>(spins[0]?.num ?? 0);
  const [code, setCode] = useState<string>(ativos[0]?.code ?? padroes[0]?.code ?? "P1");

  const padrao = padroes.find((p) => p.code === code) ?? null;

  const dados = useMemo(() => {
    const zona = calcZona(spins, num, 2);
    const zonaCilindro = vizinhosCilindro(num, 2);
    const setZ = new Set(zonaCilindro);
    const qtdCil = spins.filter((s) => setZ.has(s.num)).length;
    const percCil = (qtdCil / (spins.length || 1)) * 100;
    const z = zScore(percCil, spins.length);
    const kelly = kellyFracionado(percCil / 100);
    const puxa = melhorPuxada(spins, num, regras);

    // acerto histórico: após o número sair, algum da zona nos 3 giros seguintes
    const cronologico = [...spins].reverse();
    let ocorrencias = 0;
    let acertos = 0;
    for (let i = 0; i < cronologico.length; i += 1) {
      if (cronologico[i]!.num !== num) continue;
      const prox = cronologico.slice(i + 1, i + 4);
      if (prox.length < 3) continue;
      ocorrencias += 1;
      if (prox.some((s) => setZ.has(s.num))) acertos += 1;
    }
    const taxa = ocorrencias ? (acertos / ocorrencias) * 100 : 0;

    const ultimo = spins[0];
    const distancia = ultimo ? distanciaAngular(ultimo.num, num) : null;

    const desempenho = padrao ? calcDesempenhoPadrao(spins, padrao) : null;

    return {
      zona,
      zonaCilindro,
      qtdCil,
      percCil,
      z,
      kelly,
      puxa,
      ocorrencias,
      acertos,
      taxa,
      distancia,
      desempenho,
    };
  }, [spins, num, padrao, regras]);

  const props = getProps(num);
  const corTexto =
    props.cor === "red" ? "text-neon-red" : props.cor === "black" ? "text-foreground" : "text-neon-green";

  if (spins.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Registre giros para calcular previsões com dados reais.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-center text-[10px] text-muted-foreground">
        {origem ?? `${spins.length} giros`}
      </p>

      {/* seleção */}
      <div className="rounded-lg border border-neon-cyan/40 bg-card/60 p-2">
        <div className="mb-1 font-display text-[10px] text-neon-cyan">NÚMERO DA PREVISÃO</div>
        <div className="grid grid-cols-7 gap-1">
          {NUMEROS.map((n) => {
            const p = getProps(n);
            const ativo = n === num;
            const base =
              p.cor === "red"
                ? "border-[#FF003C] text-[#FF003C] shadow-[0_0_6px_rgba(255,0,60,0.4)]"
                : p.cor === "black"
                  ? "border-white/60 text-white bg-black/80 shadow-[0_0_6px_rgba(255,255,255,0.3)]"
                  : "border-[#00FF88] text-[#00E676] shadow-[0_0_6px_rgba(0,255,136,0.4)]";
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNum(n)}
                className={`rounded border py-1 font-display text-[11px] font-bold ${base} ${
                  ativo ? "bg-neon-cyan/20 ring-2 ring-neon-cyan" : "bg-background/60"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="mt-2 font-display text-[10px] text-neon-cyan">PADRÃO</div>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full rounded border border-neon-cyan/40 bg-background/70 p-1.5 text-[11px]"
        >
          {padroes.map((p) => (
            <option key={p.id} value={p.code}>
              {p.code} — {p.nome} {p.ativa ? "" : "(inativo)"}
            </option>
          ))}
        </select>
      </div>

      {/* resumo */}
      <div className="rounded-lg border border-neon-gold/50 bg-card/60 p-3 text-center">
        <div className={`font-display text-4xl font-black ${corTexto}`}>{num}</div>
        <div className="mt-1 text-[11px] text-neon-gold">
          Setor {props.setor} · Dúzia {props.duzia || "—"} · Coluna {props.coluna || "—"} ·{" "}
          {anguloDe(num).toFixed(1)}°
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Zona alvo: {dados.zonaCilindro.join(" · ")}
        </div>
      </div>

      {/* métricas quantitativas do camuflado */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Metric label="Frequência da zona" value={`${dados.percCil.toFixed(2)}%`} ok={dados.percCil >= 22.5} />
        <Metric label="Z-Score (p=13,51%)" value={dados.z.toFixed(2)} ok={dados.z >= 1.65} />
        <Metric
          label="Kelly (¼ conservador)"
          value={`${(dados.kelly * 100).toFixed(2)}% da banca`}
          ok={dados.kelly > 0}
        />
        <Metric
          label="Δ angular do último"
          value={dados.distancia === null ? "—" : `${dados.distancia} casas`}
          ok={dados.distancia !== null && dados.distancia <= 2}
        />
        <Metric label="Saídas do número" value={`${dados.zona.qtd} na zona`} ok={dados.zona.qtd > 0} />
        <Metric
          label="Puxa com mais força"
          value={dados.puxa ? `${dados.puxa.destino} (${dados.puxa.qtd}x)` : "sem dado"}
          ok={!!dados.puxa}
        />
      </div>

      {/* histórico do número */}
      <div className="neon-cyan-glow rounded-lg p-3 text-[11px]">
        <div className="font-display text-[10px] text-neon-cyan">HISTÓRICO REAL DO NÚMERO {num}</div>
        <p className="mt-1 text-muted-foreground">
          Depois que o {num} saiu, a zona apareceu em até 3 giros{" "}
          <span className="font-bold text-neon-green">{dados.acertos}</span> de{" "}
          <span className="font-bold">{dados.ocorrencias}</span> vezes ({dados.taxa.toFixed(1)}%).
        </p>
        {dados.ocorrencias === 0 && (
          <p className="mt-1 text-muted-foreground">
            Ainda não há ocorrências fechadas desse número no histórico atual.
          </p>
        )}
      </div>

      {/* desempenho do padrão */}
      <div className="neon-cyan-glow rounded-lg p-3 text-[11px]">
        <div className="font-display text-[10px] text-neon-cyan">
          DESEMPENHO DO PADRÃO {padrao?.code ?? "—"}
        </div>
        {dados.desempenho && dados.desempenho.total > 0 ? (
          <>
            <p className="mt-1">
              <span className="font-bold text-neon-green">{dados.desempenho.wins}</span> wins em{" "}
              <span className="font-bold">{dados.desempenho.total}</span> ocorrências ·{" "}
              <span className="font-bold text-neon-gold">{dados.desempenho.perc.toFixed(1)}%</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {dados.desempenho.historico.slice(0, 8).map((r, i) => (
                <span
                  key={i}
                  className={`rounded px-1.5 py-0.5 font-display text-[10px] font-bold ${
                    r.win ? "bg-neon-green/20 text-neon-green" : "bg-neon-red/20 text-neon-red"
                  }`}
                >
                  {r.win ? `W${r.entrada}` : "L"}
                </span>
              ))}
            </div>
            <p className="mt-1 text-muted-foreground">Alvos: {padrao?.alvos}</p>
          </>
        ) : (
          <p className="mt-1 text-muted-foreground">
            Esse padrão ainda não teve ocorrências fechadas nos giros reais disponíveis.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        ok ? "border-neon-green/60 bg-neon-green/5" : "border-border bg-card/50"
      }`}
    >
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-display text-sm font-bold ${ok ? "text-neon-green" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
