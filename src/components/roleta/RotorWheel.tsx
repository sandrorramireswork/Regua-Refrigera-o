import { frequenciaRotor } from "@/lib/quant";
import type { Spin } from "@/lib/roulette";

/** Cilindro europeu em SVG com mapa de calor e destaque da zona sniper */
export function RotorWheel({
  spins,
  destaque = [],
  size = 260,
}: {
  spins: Spin[];
  destaque?: number[];
  size?: number;
}) {
  const dados = frequenciaRotor(spins);
  const n = dados.length;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size / 2 - 4;
  const rIn = rOut - 34;
  const set = new Set(destaque);
  const ultimo = spins[0]?.num;

  const arc = (i: number) => {
    const a0 = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (r: number, a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    return `M ${p(rOut, a0)} A ${rOut} ${rOut} 0 0 1 ${p(rOut, a1)} L ${p(rIn, a1)} A ${rIn} ${rIn} 0 0 0 ${p(rIn, a0)} Z`;
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[280px]"
      role="img"
      aria-label="Cilindro europeu com mapa de calor dos números"
    >
      {dados.map((d) => {
        const base = d.cor === "green" ? "#00E676" : d.cor === "red" ? "#FF003C" : "#000000";
        const ativo = set.has(d.num);
        const ang = (d.idx / n) * Math.PI * 2 - Math.PI / 2;
        const rt = (rIn + rOut) / 2;
        return (
          <g key={d.num}>
            <path
              d={arc(d.idx)}
              fill={base}
              fillOpacity={0.25 + d.intensidade * 0.75}
              stroke={ativo ? "#FFD600" : "#00E5FF33"}
              strokeWidth={ativo ? 2.2 : 0.6}
            />
            <text
              x={cx + rt * Math.cos(ang)}
              y={cy + rt * Math.sin(ang) + 3}
              textAnchor="middle"
              fontSize="8"
              fontWeight="900"
              fill={d.num === ultimo ? "#FFD600" : "#e9ecff"}
            >
              {d.num}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={rIn - 4} fill="#090A0F" stroke="#00E5FF55" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="#00E5FF">
        ÚLTIMO
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="20" fontWeight="900" fill="#FFD600">
        {ultimo ?? "—"}
      </text>
    </svg>
  );
}
