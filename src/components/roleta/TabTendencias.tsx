import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcGrupos, checarRegra, type Padrao, type Spin } from "@/lib/roulette";
import { calcSniper } from "@/lib/quant";

const CORES = [
  "var(--neon-green)",
  "var(--neon-cyan)",
  "var(--neon-magenta)",
  "var(--neon-gold)",
  "var(--neon-red)",
];

function pontosHistoricos(spins: Spin[], limite = 24) {
  const total = spins.length;
  if (total < 8) return [];
  const inicio = Math.min(total, 8);
  const passo = Math.max(1, Math.ceil((total - inicio + 1) / limite));
  const pontos: number[] = [];
  for (let n = inicio; n <= total; n += passo) pontos.push(n);
  if (pontos.at(-1) !== total) pontos.push(total);
  return pontos;
}

function tamanhoRegra(padrao: Padrao) {
  const regra = padrao.regra;
  if (regra.type === "colors" || regra.type === "sectors" || regra.type === "numbers") {
    return regra.sequence.length;
  }
  return Math.max(2, regra.count || 2);
}

function serieDesempenho(cronologico: Spin[], padrao: Padrao, pontos: number[]) {
  const alvos = new Set(
    (padrao.alvos.match(/\d+/g) ?? [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36),
  );
  const tamanho = tamanhoRegra(padrao);
  let total = 0;
  let wins = 0;
  let proximoPonto = 0;
  const valores = new Map<number, number>();

  for (let n = 1; n <= cronologico.length; n += 1) {
    const ocorrencia = n - 4;
    if (ocorrencia >= 0) {
      const inicio = Math.max(0, ocorrencia - tamanho + 1);
      const contexto = cronologico.slice(inicio, ocorrencia + 1).reverse();
      if (checarRegra(contexto, padrao.regra)) {
        total += 1;
        if (cronologico.slice(ocorrencia + 1, ocorrencia + 4).some((spin) => alvos.has(spin.num))) wins += 1;
      }
    }
    while (pontos[proximoPonto] === n) {
      valores.set(n, total > 0 ? (wins / total) * 100 : 0);
      proximoPonto += 1;
    }
  }
  return valores;
}

export function TabTendencias({ spins, padroes }: { spins: Spin[]; padroes: Padrao[] }) {
  const ativos = padroes.filter((p) => p.ativa);
  const [selecionados, setSelecionados] = useState<string[]>(() => ativos.slice(0, 4).map((p) => p.code));
  const [periodo, setPeriodo] = useState<number | "all">(50);

  const visiveis = ativos.filter((p) => selecionados.includes(p.code));
  const spinsFiltrados = useMemo(
    () => (periodo === "all" ? spins : spins.slice(0, periodo)),
    [spins, periodo],
  );

  const { padroesData, camufladoData } = useMemo(() => {
    const cronologico = [...spinsFiltrados].reverse();
    const pontos = pontosHistoricos(spinsFiltrados);
    const desempenhoPorPadrao = new Map(
      visiveis.map((padrao) => [padrao.code, serieDesempenho(cronologico, padrao, pontos)]),
    );
    const seriesPadroes = pontos.map((n) => {
      const linha: Record<string, number | string> = { giro: n };
      for (const padrao of visiveis) {
        linha[padrao.code] = Number((desempenhoPorPadrao.get(padrao.code)?.get(n) ?? 0).toFixed(1));
      }
      return linha;
    });
    const seriesCamuflado = pontos.map((n) => {
      const janela = cronologico.slice(0, n).reverse();
      const grupos = calcGrupos(janela);
      const sniper = calcSniper(janela, {
        duziaForte: grupos.favDuzias[0]?.idx ?? 0,
        colunaForte: grupos.favColunas[0]?.idx ?? 0,
      });
      return {
        giro: n,
        Zona: Number((sniper?.zonaPerc ?? 0).toFixed(1)),
        "Z-Score": Number((sniper?.z ?? 0).toFixed(2)),
        Kelly: Number(((sniper?.kelly ?? 0) * 100).toFixed(2)),
      };
    });
    return { padroesData: seriesPadroes, camufladoData: seriesCamuflado };
  }, [spinsFiltrados, visiveis]);

  function alternar(code: string) {
    setSelecionados((atual) =>
      atual.includes(code) ? atual.filter((item) => item !== code) : [...atual, code],
    );
  }

  if (spins.length < 8) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Registre pelo menos 8 giros para iniciar os gráficos de tendências.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* BARRA DE AJUSTE DE PERÍODO (Lovable Period Selector) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neon-gold" />
          <span className="text-[11px] font-semibold text-neon-gold uppercase tracking-wider mr-1">
            Ajuste de Período:
          </span>
          {[15, 30, 50, 100].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                periodo === p
                  ? "bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p}G
            </button>
          ))}
          <button
            onClick={() => setPeriodo("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              periodo === "all"
                ? "bg-neon-magenta/20 text-neon-magenta ring-1 ring-neon-magenta shadow-[0_0_8px_rgba(255,16,240,0.4)]"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            Todos ({spins.length})
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Amostra filtrada: <strong className="text-neon-cyan">{spinsFiltrados.length} giros</strong>
        </span>
      </div>
      <section className="neon-cyan-glow rounded-lg p-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-black text-neon-green">TENDÊNCIA DOS 35 PADRÕES</h2>
            <p className="text-[10px] text-muted-foreground">Evolução da taxa real de wins em até três entradas</p>
          </div>
          <span className="shrink-0 text-[10px] text-neon-gold">{spins.length} giros</span>
        </div>

        <div className="mt-2 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
          {ativos.map((padrao) => {
            const marcado = selecionados.includes(padrao.code);
            return (
              <Button
                key={padrao.id}
                type="button"
                size="sm"
                variant={marcado ? "default" : "outline"}
                onClick={() => alternar(padrao.code)}
                className={`h-6 px-2 font-display text-[9px] ${marcado ? "num-green" : "neon-cyan-glow"}`}
              >
                {padrao.code}
              </Button>
            );
          })}
        </div>

        {visiveis.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">Selecione um padrão para acompanhar.</p>
        ) : (
          <div className="mt-2 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={padroesData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="giro" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} unit="%" />
                <Tooltip content={<NeonTooltip sufixo="%" />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {visiveis.map((padrao, i) => (
                  <Line
                    key={padrao.code}
                    type="monotone"
                    dataKey={padrao.code}
                    stroke={CORES[i % CORES.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="neon-cyan-glow rounded-lg p-2">
        <h2 className="font-display text-sm font-black text-neon-magenta">EVOLUÇÃO DO CAMUFLADO</h2>
        <p className="text-[10px] text-muted-foreground">Frequência da zona, Z-Score e Kelly por ponto histórico</p>
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={camufladoData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="giro" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
              <YAxis yAxisId="percentual" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} unit="%" />
              <YAxis yAxisId="z" orientation="right" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<NeonTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line yAxisId="percentual" type="monotone" dataKey="Zona" stroke="var(--neon-cyan)" strokeWidth={2} dot={false} />
              <Line yAxisId="z" type="monotone" dataKey="Z-Score" stroke="var(--neon-gold)" strokeWidth={2} dot={false} />
              <Line yAxisId="percentual" type="monotone" dataKey="Kelly" stroke="var(--neon-magenta)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[9px] font-bold">
          <span className="text-neon-cyan">ZONA EM %</span>
          <span className="text-neon-gold">Z-SCORE</span>
          <span className="text-neon-magenta">KELLY EM %</span>
        </div>
      </section>
    </div>
  );
}

function NeonTooltip({ active, payload, label, sufixo = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-neon-cyan bg-card px-2 py-1.5 text-[10px] shadow-lg">
      <div className="mb-1 font-display font-black text-neon-cyan">GIRO {label}</div>
      {payload.map((item: any) => (
        <div key={item.dataKey} style={{ color: item.color }}>
          {item.dataKey}: {Number(item.value).toFixed(item.dataKey === "Z-Score" ? 2 : 1)}{sufixo || (item.dataKey === "Z-Score" ? "" : "%")}
        </div>
      ))}
    </div>
  );
}