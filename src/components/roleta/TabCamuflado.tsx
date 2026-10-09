import { calcCiclosColuna, calcSniper, deslocamentoRecente, type Sniper } from "@/lib/quant";
import { calcGrupos, calcTransicoes, type Spin } from "@/lib/roulette";
import { RotorWheel } from "./RotorWheel";

export function TabCamuflado({
  spins,
  sniper,
  origem,
}: {
  spins: Spin[];
  sniper: Sniper | null;
  origem?: string;
}) {
  const grupos = calcGrupos(spins);
  const ultimo = spins[0];
  const matriz = calcTransicoes(spins, { minCount: 1, topN: 400, windowSize: 5000 });
  const doUltimo = ultimo ? matriz.filter((t) => t.origem === ultimo.num).slice(0, 5) : [];
  const topGeral = matriz.slice(0, 8);
  const s =
    sniper ??
    calcSniper(spins, {
      duziaForte: grupos.favDuzias[0]?.idx ?? 0,
      colunaForte: grupos.favColunas[0]?.idx ?? 0,
    });
  const ciclos = calcCiclosColuna(spins);
  const desloc = deslocamentoRecente(spins);

  if (!s) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Registre giros para ativar a mesa quântica do Padrão Camuflado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-center text-[10px] text-muted-foreground">
        {origem ?? `${spins.length} giros`}
      </p>
      <div
        className={`rounded-lg border p-3 text-center font-display ${
          s.disparo
            ? "num-green animate-flash-green"
            : "border-neon-cyan/50 bg-card/60"
        }`}
      >
        <div className="text-sm font-black">
          {s.disparo ? "🎯 SNIPER ENTRY — CONFLUÊNCIA TIER 1 ELITE" : "AGUARDANDO CONFLUÊNCIA TIER 1"}
        </div>
        <div className="mt-1 text-[11px] text-neon-gold">ZONA: {s.zona.join(" · ")}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {"★".repeat(s.estrelas)}
          {"☆".repeat(Math.max(0, 3 - s.estrelas))} · Kelly {(s.kelly * 100).toFixed(2)}% da banca
        </div>
      </div>

      <RotorWheel spins={spins} destaque={s.zona} />

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Metric label="Frequência da zona" value={`${s.zonaPerc.toFixed(2)}%`} ok={s.zonaPerc >= 22.5} />
        <Metric label="Z-Score (p=13,51%)" value={s.z.toFixed(2)} ok={s.z >= 1.65} />
        <Metric label="Δ angular do último" value={`${s.deslocamento} casas`} ok={s.deslocamento <= 2} />
        <Metric label="Δ médio (10 giros)" value={desloc.toFixed(1)} ok={desloc <= 4} />
        <Metric label="Retenção de setor" value={s.retencaoSetor ? "SIM" : "NÃO"} ok={s.retencaoSetor} />
        <Metric
          label="Filtros de mesa"
          value={`${s.duziaConfirma ? "Dúzia ✓" : "Dúzia ✗"} / ${s.colunaConfirma ? "Coluna ✓" : "Coluna ✗"}`}
          ok={s.duziaConfirma && s.colunaConfirma}
        />
      </div>

      <div className="neon-cyan-glow overflow-hidden rounded-lg">
        <table className="w-full text-center text-[11px]">
          <thead className="bg-muted font-display text-[10px] text-neon-cyan">
            <tr>
              <th className="py-1.5">Grupo</th>
              <th>Últimas 3</th>
              <th>Atraso</th>
              <th>%</th>
              <th>Prob. atraso</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="py-1.5 font-black text-neon-gold">{c.label}</td>
                <td>{c.ultimas.join(", ") || "—"}</td>
                <td className={c.atraso !== null && c.atraso >= 6 ? "font-black text-neon-red" : ""}>
                  {c.atraso ?? "—"}
                </td>
                <td>{c.perc.toFixed(1)}%</td>
                <td className="text-neon-magenta">{(c.probAtraso * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MATRIZ DE TRANSIÇÃO */}
      <div className="neon-cyan-glow rounded-lg p-2">
        <div className="font-display text-[11px] font-black text-neon-cyan">MATRIZ DE TRANSIÇÃO</div>
        {ultimo && (
          <div className="mt-1.5 text-[11px]">
            <div className="text-[10px] uppercase text-muted-foreground">
              O que o {ultimo.num} costuma puxar
            </div>
            {doUltimo.length === 0 ? (
              <div className="text-muted-foreground">Sem histórico para este número ainda.</div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {doUltimo.map((t) => (
                  <span
                    key={`${t.origem}-${t.destino}`}
                    className="rounded-md border border-neon-magenta/60 bg-neon-magenta/10 px-2 py-1 font-black text-neon-magenta"
                  >
                    {t.destino} · {t.qtd}x · {t.perc.toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <table className="mt-2 w-full text-center text-[11px]">
          <thead className="font-display text-[10px] text-neon-gold">
            <tr>
              <th className="py-1">Origem</th>
              <th>Destino</th>
              <th>Vezes</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {topGeral.map((t) => (
              <tr key={`g-${t.origem}-${t.destino}`} className="border-t border-border/60">
                <td className="py-1 font-black">{t.origem}</td>
                <td className="font-black text-neon-cyan">→ {t.destino}</td>
                <td>{t.qtd}</td>
                <td className="text-neon-green">{t.perc.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${
        ok ? "border-neon-green/60 bg-neon-green/10" : "border-border bg-card/60"
      }`}
    >
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={`font-display text-sm font-black ${ok ? "text-neon-green" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
