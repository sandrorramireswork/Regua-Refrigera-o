import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CILINDRO, type Spin } from "@/lib/roulette";
import { distanciaAngular, indiceRotor } from "@/lib/quant";

const CORES_SETOR: Record<string, string> = {
  Voisins: "#00E5FF",
  Tiers: "#FF2E9A",
  Orphelins: "#FFD600",
};

function corDoSetor(setor: string, i: number) {
  return CORES_SETOR[setor] ?? ["#00E676", "#FF1744", "#8A8FFF", "#FF9100"][i % 4]!;
}

interface Ponto {
  giro: number;
  num: number;
  angulo: number;
  salto: number;
  setor: string;
}

/** Dispersão dos giros registrados neste aparelho: número, setor e ângulo no cilindro */
export function TabDispersao({ spins }: { spins: Spin[] }) {
  const [eixo, setEixo] = useState<"numero" | "angulo" | "salto">("angulo");
  const [janela, setJanela] = useState(60);

  const pontos = useMemo<Ponto[]>(() => {
    const recorte = spins.slice(0, janela);
    // do mais antigo para o mais novo, para o eixo do tempo crescer
    return recorte
      .map((s, i) => {
        const anterior = recorte[i + 1];
        const idx = indiceRotor(s.num);
        return {
          giro: recorte.length - i,
          num: s.num,
          angulo: idx < 0 ? 0 : Math.round((idx / CILINDRO.length) * 360),
          salto: anterior ? distanciaAngular(s.num, anterior.num) : 0,
          setor: s.props.setor === "—" ? "Zero" : s.props.setor,
        };
      })
      .reverse();
  }, [spins, janela]);

  const setores = useMemo(() => [...new Set(pontos.map((p) => p.setor))], [pontos]);

  if (pontos.length < 3) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Ainda não há giros suficientes para desenhar a dispersão.
      </p>
    );
  }

  const rotulo =
    eixo === "numero" ? "Número (0-36)" : eixo === "angulo" ? "Ângulo no cilindro (°)" : "Salto em casas";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">
          {pontos.length} giros deste aparelho
        </span>
        <div className="ml-auto flex gap-1">
          {(["angulo", "numero", "salto"] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEixo(e)}
              className={`rounded-md px-2 py-1 font-black ${
                eixo === e ? "num-green" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {e === "angulo" ? "Ângulo" : e === "numero" ? "Número" : "Salto"}
            </button>
          ))}
        </div>
        <select
          aria-label="Quantidade de giros"
          className="rounded-md border border-border bg-card px-2 py-1 text-[10px] text-foreground"
          value={janela}
          onChange={(ev) => setJanela(Number(ev.target.value))}
        >
          {[30, 60, 120, 240].map((n) => (
            <option key={n} value={n}>
              últimos {n}
            </option>
          ))}
        </select>
      </div>

      <div className="neon-cyan-glow rounded-lg p-2">
        <div className="font-display text-[10px] uppercase tracking-widest text-neon-magenta">
          {rotulo} por giro
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 8, bottom: 8, left: -18 }}>
              <CartesianGrid stroke="#00E5FF22" />
              <XAxis
                type="number"
                dataKey="giro"
                name="Giro"
                stroke="#8A8FA8"
                tick={{ fontSize: 9 }}
              />
              <YAxis
                type="number"
                dataKey={eixo}
                name={rotulo}
                stroke="#8A8FA8"
                tick={{ fontSize: 9 }}
                domain={eixo === "angulo" ? [0, 360] : eixo === "numero" ? [0, 36] : [0, 18]}
              />
              <ZAxis range={[45, 45]} />
              <Tooltip
                contentStyle={{
                  background: "#0B0C13",
                  border: "1px solid #00E5FF55",
                  fontSize: 11,
                }}
                formatter={(v: number, n: string) => [v, n]}
                labelFormatter={() => ""}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {setores.map((s, i) => (
                <Scatter
                  key={s}
                  name={s}
                  data={pontos.filter((p) => p.setor === s)}
                  fill={corDoSetor(s, i)}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="neon-cyan-glow rounded-lg p-2">
        <div className="font-display text-[10px] uppercase tracking-widest text-neon-magenta">
          Últimos giros
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {pontos
            .slice()
            .reverse()
            .slice(0, 30)
            .map((p, i) => (
              <span
                key={`${p.giro}-${i}`}
                className="rounded-md border px-1.5 py-1 text-[10px] font-black"
                style={{ borderColor: corDoSetor(p.setor, 0), color: corDoSetor(p.setor, 0) }}
                title={`${p.setor} · ${p.angulo}° · salto ${p.salto}`}
              >
                {p.num}
                <span className="ml-1 text-[9px] opacity-70">{p.angulo}°</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
