import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { usePlayers } from "@/hooks/usePlayers";
import { formatBRL } from "@/lib/roulette";

export function TabJogadores() {
  const { players, total, addPlayer, removePlayer, addEntry, removeEntry } = usePlayers();
  const [nome, setNome] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [valor, setValor] = useState<Record<string, string>>({});
  const [obs, setObs] = useState<Record<string, string>>({});

  async function lancar(id: string, sinal: 1 | -1) {
    const v = Math.abs(Number((valor[id] ?? "").replace(",", ".")));
    if (!v) return;
    await addEntry(id, v * sinal, obs[id]?.trim() || undefined);
    setValor((p) => ({ ...p, [id]: "" }));
    setObs((p) => ({ ...p, [id]: "" }));
  }

  return (
    <div className="space-y-3">
      <div className="neon-cyan-glow flex items-center justify-between rounded-lg px-3 py-2">
        <span className="font-display text-[11px] uppercase tracking-widest text-neon-cyan">
          Saldo geral
        </span>
        <span
          className={`font-display text-sm font-black ${
            total >= 0 ? "text-neon-green" : "text-neon-red"
          }`}
        >
          {formatBRL(total)}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addPlayer(nome);
          setNome("");
        }}
        className="flex gap-1.5"
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do jogador"
          aria-label="Nome do jogador"
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-neon-cyan"
        />
        <button type="submit" className="num-green rounded-md px-3" aria-label="Adicionar jogador">
          <Plus className="h-4 w-4" />
        </button>
      </form>

      {players.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nenhum jogador ainda. Cadastre o primeiro acima.
        </p>
      )}

      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="neon-cyan-glow rounded-lg p-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setAberto(aberto === p.id ? null : p.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate font-display text-sm font-bold text-foreground">
                  {p.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {p.entries.length} lançamento(s)
                </div>
              </button>
              <span
                className={`font-display text-sm font-black ${
                  p.saldo > 0 ? "text-neon-green" : p.saldo < 0 ? "text-neon-red" : "text-muted-foreground"
                }`}
              >
                {formatBRL(p.saldo)}
              </span>
              <button
                onClick={() => void removePlayer(p.id)}
                aria-label={`Remover ${p.name}`}
                className="num-red rounded-md p-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {aberto === p.id && (
              <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                <div className="flex gap-1.5">
                  <input
                    inputMode="decimal"
                    value={valor[p.id] ?? ""}
                    onChange={(e) => setValor((s) => ({ ...s, [p.id]: e.target.value }))}
                    placeholder="Valor"
                    aria-label="Valor"
                    className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-neon-cyan"
                  />
                  <input
                    value={obs[p.id] ?? ""}
                    onChange={(e) => setObs((s) => ({ ...s, [p.id]: e.target.value }))}
                    placeholder="Observação"
                    aria-label="Observação"
                    className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-neon-cyan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => void lancar(p.id, 1)}
                    className="num-green rounded-md py-1.5 font-display text-[11px] font-bold"
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => void lancar(p.id, -1)}
                    className="num-red rounded-md py-1.5 font-display text-[11px] font-bold"
                  >
                    − Saída
                  </button>
                </div>
                <ul className="space-y-1">
                  {p.entries.slice(0, 12).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1 text-[11px]"
                    >
                      <span className="truncate text-muted-foreground">
                        {new Date(e.createdAt).toLocaleDateString("pt-BR")} {e.note ?? ""}
                      </span>
                      <span className={e.amount >= 0 ? "text-neon-green" : "text-neon-red"}>
                        {formatBRL(e.amount)}
                      </span>
                      <button
                        onClick={() => void removeEntry(e.id)}
                        aria-label="Remover lançamento"
                        className="text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
