import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/useConfig";
import { useGameEntries } from "@/hooks/useGameEntries";
import { lerBankrollConfig } from "@/lib/bankroll";

export const Route = createFileRoute("/_authenticated/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos e Resultados | Roleta Pro by Sanka" },
      { name: "description", content: "Registre aposta, padrão e resultado para acompanhar sua banca e o histórico de jogos." },
      { property: "og:title", content: "Jogos e Resultados | Roleta Pro by Sanka" },
      { property: "og:description", content: "Controle individual de apostas, resultados e saldo da banca." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JogosPage,
});

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function JogosPage() {
  const { padroes } = useConfig();
  const { entries, loading, totalBet, totalResult, wins, addEntry, removeEntry } = useGameEntries();
  const [patternCode, setPatternCode] = useState("P1");
  const [bet, setBet] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [outcome, setOutcome] = useState<"win" | "loss">("win");
  const [note, setNote] = useState("");
  const capital = lerBankrollConfig().capital;
  const current = capital + totalResult;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedBet = Number(bet.replace(",", "."));
    const parsedResult = Math.abs(Number(resultValue.replace(",", ".")));
    if (!(parsedBet > 0) || !(parsedResult >= 0)) {
      toast.error("Informe a aposta e o resultado.");
      return;
    }
    const error = await addEntry({
      patternCode,
      bet: parsedBet,
      result: outcome === "win" ? parsedResult : -parsedResult,
      note,
    });
    if (error) {
      toast.error(error);
      return;
    }
    setBet("");
    setResultValue("");
    setNote("");
    toast.success("Jogo registrado");
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl space-y-3 p-3 pb-10">
      <header className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Voltar ao painel" className="neon-cyan-glow">
          <Link to="/painel"><ArrowLeft className="text-neon-cyan" /></Link>
        </Button>
        <h1 className="font-display text-base font-black text-neon-cyan">JOGOS E RESULTADOS</h1>
      </header>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Resumo label="Capital" value={brl(capital)} />
        <Resumo label="Resultado" value={`${totalResult >= 0 ? "+" : ""}${brl(totalResult)}`} tone={totalResult >= 0 ? "green" : "red"} />
        <Resumo label="Banca atual" value={brl(current)} tone={current >= capital ? "green" : "gold"} />
      </section>

      <form onSubmit={submit} className="neon-cyan-glow grid gap-3 rounded-lg bg-card/60 p-3 sm:grid-cols-2">
        <label className="space-y-1 text-[10px] uppercase text-muted-foreground">
          Padrão
          <select value={patternCode} onChange={(e) => setPatternCode(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-neon-cyan">
            {padroes.map((pattern) => <option key={pattern.id} value={pattern.code}>{pattern.code} · {pattern.nome}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-[10px] uppercase text-muted-foreground">
          Valor apostado
          <input inputMode="decimal" value={bet} onChange={(e) => setBet(e.target.value)} placeholder="0,00" className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-neon-cyan" />
        </label>
        <div className="space-y-1">
          <span className="block text-[10px] uppercase text-muted-foreground">Resultado</span>
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" onClick={() => setOutcome("win")} className={outcome === "win" ? "num-green" : "border-border text-muted-foreground"}>WIN</Button>
            <Button type="button" variant="outline" onClick={() => setOutcome("loss")} className={outcome === "loss" ? "num-red" : "border-border text-muted-foreground"}>LOSS</Button>
          </div>
        </div>
        <label className="space-y-1 text-[10px] uppercase text-muted-foreground">
          Lucro ou prejuízo líquido
          <input inputMode="decimal" value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="0,00" className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-neon-cyan" />
        </label>
        <label className="space-y-1 text-[10px] uppercase text-muted-foreground sm:col-span-2">
          Observação
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mesa, estratégia ou anotação" className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-neon-cyan" />
        </label>
        <Button type="submit" className="num-green sm:col-span-2">Registrar jogo</Button>
      </form>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Resumo label="Jogos" value={String(entries.length)} />
        <Resumo label="Wins" value={String(wins)} tone="green" />
        <Resumo label="Total apostado" value={brl(totalBet)} />
      </section>

      <section className="rounded-lg border border-border bg-card/60 p-3">
        <h2 className="font-display text-xs font-black text-neon-magenta">HISTÓRICO INDIVIDUAL</h2>
        {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Carregando...</p> : entries.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Nenhum jogo registrado.</p> : (
          <ul className="mt-2 space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-2 text-[10px]">
                <span className="font-display font-black text-neon-cyan">{entry.patternCode}</span>
                <span className="min-w-0"><span className="block text-foreground">Aposta {brl(entry.bet)}</span><span className="block truncate text-muted-foreground">{new Date(entry.createdAt).toLocaleString("pt-BR")} {entry.note ? `· ${entry.note}` : ""}</span></span>
                <span className={`font-display font-black ${entry.result >= 0 ? "text-neon-green" : "text-neon-red"}`}>{entry.result >= 0 ? "+" : ""}{brl(entry.result)}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Excluir jogo" onClick={() => void removeEntry(entry.id)} className="text-neon-red"><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Resumo({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "gold" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "red" ? "text-neon-red" : tone === "gold" ? "text-neon-gold" : "text-foreground";
  return <div className="rounded-lg border border-border bg-card/60 px-1.5 py-2"><div className="text-[9px] uppercase text-muted-foreground">{label}</div><div className={`font-display text-xs font-black sm:text-sm ${color}`}>{value}</div></div>;
}