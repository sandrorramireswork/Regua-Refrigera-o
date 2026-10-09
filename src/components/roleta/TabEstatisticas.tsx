import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcGrupos, contarPor, DISTORCAO_MINIMA, type SectorDef, type Spin } from "@/lib/roulette";

const TROFEUS = ["1º 🏆", "2º 🏆", "3º 🏆"];

function Tabela({
  titulo,
  cabecalho,
  linhas,
}: {
  titulo: string;
  cabecalho: string;
  linhas: { nome: string; qtd: number; perc: number }[];
}) {
  return (
    <div className="neon-cyan-glow overflow-hidden rounded-lg">
      <div className="bg-muted py-1 text-center font-display text-[11px] font-black text-neon-magenta">
        {titulo}
      </div>
      <table className="w-full text-center text-[11px]">
        <thead className="bg-card font-display text-[10px] text-neon-cyan">
          <tr>
            <th className="py-1.5">{cabecalho}</th>
            <th>Qtde</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome} className="border-t border-border/60">
              <td className="py-1.5 font-bold text-foreground">{l.nome}</td>
              <td className="font-bold">{l.qtd}</td>
              <td className="text-neon-gold">{l.perc.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TabDuziasColunas({ spins }: { spins: Spin[] }) {
  const g = calcGrupos(spins);

  if (spins.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Sem giros registrados ainda. Os percentuais aparecem conforme você registra a mesa.
      </p>
    );
  }

  const grafico = [...g.duzias, ...g.colunas].map((x) => ({
    nome: x.nome.replace("Dúzia", "Dz").replace("Coluna", "Col"),
    Qtde: x.qtd,
    Percentual: Number(x.perc.toFixed(1)),
    fill: x.nome.includes("Dúzia") ? "var(--neon-cyan)" : "var(--neon-magenta)",
  }));

  const fracoDz = g.distDuzias < DISTORCAO_MINIMA;
  const fracoCol = g.distColunas < DISTORCAO_MINIMA;

  return (
    <div className="space-y-3">
      <h2 className="neon-title text-center text-sm">
        Dúzias e Colunas · {g.total} giros · padrão {DISTORCAO_MINIMA.toFixed(2)}%
      </h2>

      <Tabela
        titulo="DÚZIAS"
        cabecalho="Dúzia"
        linhas={g.duzias.map((d) => ({ ...d, nome: `${d.idx}ª Dúzia (${d.idx * 12 - 11}-${d.idx * 12})` }))}
      />
      <Tabela titulo="COLUNAS" cabecalho="Coluna" linhas={g.colunas} />

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={grafico} margin={{ top: 14, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--neon-cyan)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Qtde" radius={4}>
              {grafico.map((d) => (
                <Cell key={d.nome} fill={d.fill} />
              ))}
              <LabelList
                dataKey="Percentual"
                position="top"
                formatter={(v: number) => `${v}%`}
                style={{ fill: "var(--neon-gold)", fontSize: 9 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="neon-cyan-glow rounded-lg p-2 text-[11px]">
        <div className="grid grid-cols-3 gap-1 font-display text-[10px] text-neon-gold">
          <span>⚠ ENTRADA</span>
          <span className="text-neon-magenta">Favoritos</span>
          <span className="text-neon-cyan">Distorção</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-1 grid grid-cols-3 gap-1 border-t border-border/60 pt-1">
            <span className="text-neon-gold">{TROFEUS[i]}</span>
            <span className="font-bold">
              {g.favColunas[i]!.idx}ªC · {g.favDuzias[i]!.idx}ªD
            </span>
            <span className="text-muted-foreground">
              {i === 0
                ? `Dúzia ${g.distDuzias.toFixed(1)}% · Coluna ${g.distColunas.toFixed(1)}%`
                : `${g.favDuzias[i]!.perc.toFixed(1)}% · ${g.favColunas[i]!.perc.toFixed(1)}%`}
            </span>
          </div>
        ))}
        {(fracoDz || fracoCol) && (
          <div className="mt-2 rounded bg-neon-gold/15 px-2 py-1 text-center font-display text-[10px] font-bold text-neon-gold">
            ⚠ DISTORÇÃO ABAIXO DE {DISTORCAO_MINIMA}% —{" "}
            {fracoDz && fracoCol ? "dúzias e colunas" : fracoDz ? "dúzias" : "colunas"} equilibradas,
            aguardar
          </div>
        )}
      </div>
    </div>
  );
}

export function TabSetoresCores({ spins, setores }: { spins: Spin[]; setores: SectorDef[] }) {
  const dados = setores.map((s) => {
    const qtd = spins.filter((x) => x.props.setor === s.name).length;
    return { nome: s.name, qtd, perc: (qtd / (spins.length || 1)) * 100 };
  });
  const cores = contarPor(spins, (s) => s.props.cor);
  const corData = (["red", "black", "green"] as const).map((c) => ({
    nome: c === "red" ? "Vermelho" : c === "black" ? "Preto" : "Verde",
    qtd: cores.find((x) => x.key === c)?.qtd ?? 0,
    perc: cores.find((x) => x.key === c)?.perc ?? 0,
    fill:
      c === "red" ? "var(--neon-red)" : c === "black" ? "var(--neon-black)" : "var(--neon-green)",
  }));

  if (spins.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Sem giros registrados ainda. Os percentuais aparecem conforme você registra a mesa.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="neon-title text-center text-sm">Cilindro e Cores · {spins.length} giros</h2>
      <div className="neon-cyan-glow overflow-hidden rounded-lg">
        <table className="w-full text-center text-[11px]">
          <thead className="bg-muted font-display text-[10px] text-neon-cyan">
            <tr>
              <th className="py-1.5">Setor</th>
              <th>Qtde</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((s) => (
              <tr key={s.nome} className="border-t border-border/60">
                <td className="py-1.5 text-neon-gold">{s.nome}</td>
                <td>{s.qtd}</td>
                <td>{s.perc.toFixed(1)}%</td>
              </tr>
            ))}
            {corData.map((c) => (
              <tr key={c.nome} className="border-t border-border/60">
                <td className="py-1.5" style={{ color: c.fill }}>
                  {c.nome}
                </td>
                <td>{c.qtd}</td>
                <td>{c.perc.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <XAxis dataKey="nome" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--neon-magenta)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="qtd" fill="var(--neon-magenta)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={corData} dataKey="qtd" nameKey="nome" innerRadius={26} outerRadius={52}>
                {corData.map((c) => (
                  <Cell key={c.nome} fill={c.fill} stroke="var(--background)" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--neon-cyan)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
