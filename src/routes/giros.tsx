import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import {
  calcTendencias,
  melhorPuxada,
  type Spin,
} from "@/lib/roulette";

export const Route = createFileRoute("/giros")({
  head: () => ({
    meta: [
      { title: "Histórico de Giros | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Revisão completa de cada giro registrado: data, hora, número, cor, setor, puxa e tendências.",
      },
      { property: "og:title", content: "Histórico de Giros | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Revisão giro a giro com classificação e tendências reais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Giros,
});

function corClass(n: number) {
  return n === 0 ? "text-neon-green" : "";
}

function numBadgeClass(s: Spin) {
  return s.props.cor === "red" ? "num-red" : s.props.cor === "green" ? "num-green" : "num-black";
}

function Giros() {
  const { setores, pullRules } = useConfig();
  const { spins, loading } = useSpins(setores);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-3 pb-6 pt-3">
      <header className="flex items-center gap-2">
        <Link
          to="/painel"
          aria-label="Voltar ao painel"
          className="neon-cyan-glow rounded-md p-1.5"
        >
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black tracking-wide text-neon-cyan">
          GIROS <span className="text-neon-magenta">({spins.length})</span>
        </h1>
        <span className="ml-auto text-[9px] text-muted-foreground">DESTE APARELHO</span>
      </header>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Carregando giros...</p>
      ) : spins.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
           Nenhum giro registrado ainda neste aparelho.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {spins.map((s, i) => {
            const historico = spins.slice(i); // este giro + anteriores
            const puxada = melhorPuxada(historico, s.num, pullRules);
            const tend = calcTendencias(historico);
            const letra = s.props.setor !== "—" ? s.props.setor.charAt(0).toUpperCase() : "—";
            const d = new Date(s.createdAt);
            const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <li key={s.id} className="neon-cyan-glow rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {data} · {hora}
                  </span>
                  <span
                    className={`ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-black ${numBadgeClass(s)}`}
                  >
                    {s.num}
                  </span>
                  <span className={`text-xs font-bold ${corClass(s.num)}`}>
                    {s.props.nomeCor}
                  </span>
                  <span className="font-display text-xs font-bold text-neon-gold">
                    {letra} <span className="font-normal text-muted-foreground">{s.props.setor}</span>
                  </span>
                </div>
                <div className="mt-1.5 text-[10px] font-bold text-neon-cyan">
                  {puxada
                    ? `PUXA: ${puxada.destino} (${puxada.qtd}x · ${puxada.perc.toFixed(0)}%)`
                    : "PUXA: sem histórico para este número"}
                </div>
                {tend.total > 0 && (
                  <div className="mt-1 text-[10px]">
                    <span className="text-muted-foreground">Tendências até aqui: </span>
                    <span className="text-neon-magenta">
                      {s.props.duzia ? `${s.props.duzia}ª dúzia` : "—"}
                    </span>
                    {" · "}
                    <span className="text-neon-cyan">
                      {s.props.coluna ? `${s.props.coluna}ª coluna` : "—"}
                    </span>
                    {" · "}
                    <span className="text-neon-gold">
                      {tend.paridade.nome} {tend.paridade.perc.toFixed(1)}%
                    </span>
                    {" · "}
                    <span className={tend.cor.nome === "VERMELHO" ? "text-neon-red" : "text-foreground"}>
                      {tend.cor.nome} {tend.cor.perc.toFixed(1)}%
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
