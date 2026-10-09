import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CILINDRO, type Spin } from "@/lib/roulette";
import { PASSO_ANGULAR, anguloDe, deltaAngularAssinado, distanciaAngular } from "@/lib/quant";

interface Ponto {
  giro: number;
  num: number;
  angulo: number;
  delta: number;
  casas: number;
}

/** Ângulo real de cada número no cilindro europeu, em tempo real */
export function AngulosCilindro({ spins, zona }: { spins: Spin[]; zona?: number[] | undefined }) {
  const [janela, setJanela] = useState(30);

  const pontos = useMemo<Ponto[]>(() => {
    const recorte = spins.slice(0, janela);
    return recorte
      .map((s, i) => {
        const anterior = recorte[i + 1];
        return {
          giro: recorte.length - i,
          num: s.num,
          angulo: Number(anguloDe(s.num).toFixed(1)),
          delta: anterior ? Number(deltaAngularAssinado(anterior.num, s.num).toFixed(1)) : 0,
          casas: anterior ? distanciaAngular(anterior.num, s.num) : 0,
        };
      })
      .reverse();
  }, [spins, janela]);

  const ultimo = pontos[pontos.length - 1];
  const mediaAbs =
    pontos.length > 1
      ? pontos.slice(1).reduce((a, p) => a + Math.abs(p.delta), 0) / (pontos.length - 1)
      : 0;

  const zonaAngulos = (zona ?? []).map((n) => ({ num: n, ang: anguloDe(n) }));

  if (pontos.length < 2) {
    return (
      <p className="py-4 text-center text-[11px] text-muted-foreground">
        Sem giros suficientes para calcular os ângulos do cilindro.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-neon-magenta/40 bg-card/60 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-[11px] font-black uppercase text-neon-magenta">
          Ângulo real no cilindro · tempo real
        </h3>
        <div className="flex gap-1">
          {[20, 30, 60, 120].map((j) => (
            <button
              key={j}
              onClick={() => setJanela(j)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                janela === j ? "num-green" : "neon-cyan-glow text-muted-foreground"
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Mini label="Último nº" valor={ultimo ? String(ultimo.num) : "—"} />
        <Mini label="Ângulo" valor={ultimo ? `${ultimo.angulo.toFixed(1)}°` : "—"} tom="magenta" />
        <Mini label="Δ médio" valor={`${mediaAbs.toFixed(1)}°`} tom="gold" />
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#233" strokeDasharray="3 3" />
            <XAxis dataKey="giro" tick={{ fontSize: 9, fill: "#8aa" }} />
            <YAxis
              domain={[0, 360]}
              ticks={[0, 90, 180, 270, 360]}
              tick={{ fontSize: 9, fill: "#8aa" }}
            />
            <Tooltip
              contentStyle={{ background: "#0b0f14", border: "1px solid #FF2E9A", fontSize: 11 }}
              formatter={(v: number, k: string) =>
                k === "angulo" ? [`${v}°`, "Ângulo"] : [`${v}°`, "Δ do giro anterior"]
              }
              labelFormatter={(l) => `Giro ${l}`}
            />
            <ReferenceLine y={180} stroke="#334" />
            <Line
              type="monotone"
              dataKey="angulo"
              stroke="#FF2E9A"
              strokeWidth={2}
              dot={{ r: 2, fill: "#FF2E9A" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="delta"
              stroke="#00E5FF"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {zonaAngulos.length > 0 && (
        <div>
          <div className="text-[9px] uppercase text-muted-foreground">
            Zona alvo · ângulo de cada número
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {zonaAngulos.map((z) => (
              <span
                key={z.num}
                className="rounded border border-neon-green/60 bg-neon-green/10 px-1.5 py-0.5 text-[10px] font-bold text-neon-green"
              >
                {z.num} · {z.ang.toFixed(1)}°
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px]">
          <thead className="text-[9px] uppercase text-muted-foreground">
            <tr>
              <th className="py-1">Giro</th>
              <th>Nº</th>
              <th>Ângulo</th>
              <th>Δ°</th>
              <th>Casas</th>
            </tr>
          </thead>
          <tbody>
            {[...pontos]
              .reverse()
              .slice(0, 12)
              .map((p) => (
                <tr key={`${p.giro}-${p.num}`} className="border-t border-border/60">
                  <td className="py-0.5 text-muted-foreground">{p.giro}</td>
                  <td className="font-display font-black text-foreground">{p.num}</td>
                  <td className="text-neon-magenta">{p.angulo.toFixed(1)}°</td>
                  <td className={p.delta >= 0 ? "text-neon-green" : "text-neon-gold"}>
                    {p.delta > 0 ? "+" : ""}
                    {p.delta.toFixed(1)}°
                  </td>
                  <td className="text-muted-foreground">{p.casas}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] text-muted-foreground">
        Cada casa do cilindro europeu vale {PASSO_ANGULAR.toFixed(2)}° ({CILINDRO.length} casas).
      </p>
    </div>
  );
}

function Mini({ label, valor, tom }: { label: string; valor: string; tom?: "magenta" | "gold" }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2 py-1">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-display text-sm font-black ${
          tom === "magenta"
            ? "text-neon-magenta"
            : tom === "gold"
              ? "text-neon-gold"
              : "text-foreground"
        }`}
      >
        {valor}
      </div>
    </div>
  );
}
