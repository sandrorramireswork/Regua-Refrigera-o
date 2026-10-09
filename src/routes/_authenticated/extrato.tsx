import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useGameEntries } from "@/hooks/useGameEntries";

export const Route = createFileRoute("/_authenticated/extrato")({
  head: () => ({
    meta: [
      { title: "Extrato de Giros e Saldo | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Extrato da sua conta: cada aposta registrada com lucro líquido, percentual e saldo acumulado giro a giro.",
      },
      { property: "og:title", content: "Extrato de Giros e Saldo | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Lucro líquido de cada aposta e saldo acumulado da sua conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Extrato,
});

const dinheiro = (v: number) =>
  `${v > 0 ? "+" : v < 0 ? "-" : ""}R$ ${Math.abs(v).toFixed(2)}`;

function Extrato() {
  const { entries, loading, totalResult, totalBet, wins } = useGameEntries();

  // do mais antigo para o mais novo, para acumular o saldo
  const cronologico = [...entries].reverse();
  let acumulado = 0;
  const linhas = cronologico.map((e) => {
    acumulado += e.result;
    return { ...e, saldo: acumulado };
  });
  linhas.reverse(); // exibe do mais recente para o mais antigo

  const taxa = entries.length > 0 ? (wins / entries.length) * 100 : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-3 pb-10 pt-3">
      <header className="flex items-center gap-2">
        <Link to="/painel" aria-label="Voltar ao painel" className="neon-cyan-glow rounded-md p-1.5">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black tracking-wide text-neon-cyan">
          EXTRATO <span className="text-neon-magenta">({entries.length})</span>
        </h1>
      </header>

      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cartao titulo="Saldo acumulado" valor={dinheiro(totalResult)} destaque={totalResult >= 0} />
        <Cartao titulo="Total apostado" valor={`R$ ${totalBet.toFixed(2)}`} />
        <Cartao titulo="Entradas vencedoras" valor={`${wins}/${entries.length}`} />
        <Cartao titulo="Aproveitamento" valor={`${taxa.toFixed(1)}%`} destaque={taxa >= 50} />
      </section>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Carregando extrato...</p>
      ) : linhas.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          Nenhuma aposta registrada nesta conta ainda. Registre pela tela de Jogos.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {linhas.map((l) => {
            const d = new Date(l.createdAt);
            const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const perc = l.bet > 0 ? (l.result / l.bet) * 100 : 0;
            const ganhou = l.result > 0;
            return (
              <li key={l.id} className="neon-cyan-glow rounded-lg p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {data} · {hora}
                  </span>
                  <span className="font-display text-xs font-black text-neon-gold">
                    {l.patternCode}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    aposta R$ {l.bet.toFixed(2)}
                  </span>
                  <span
                    className={`font-display text-sm font-black ${ganhou ? "text-neon-green" : l.result < 0 ? "text-neon-red" : "text-foreground"}`}
                  >
                    {dinheiro(l.result)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className={ganhou ? "text-neon-green" : "text-neon-red"}>
                    {perc >= 0 ? "+" : ""}
                    {perc.toFixed(0)}% da aposta
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-neon-cyan">
                    Saldo acumulado: <strong>{dinheiro(l.saldo)}</strong>
                  </span>
                  {l.note && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{l.note}</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Cartao({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="neon-cyan-glow rounded-lg p-2.5">
      <div className="text-[9px] uppercase text-neon-magenta">{titulo}</div>
      <div
        className={`font-display text-sm font-black ${destaque === undefined ? "text-foreground" : destaque ? "text-neon-green" : "text-neon-red"}`}
      >
        {valor}
      </div>
    </div>
  );
}
