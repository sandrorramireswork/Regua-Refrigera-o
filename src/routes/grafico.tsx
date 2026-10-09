import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LineChart } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import { TabGraficoColunas } from "@/components/roleta/TabGraficoColunas";
import { TabGraficoDuzias } from "@/components/roleta/TabGraficoDuzias";
import { TabGraficoSetores } from "@/components/roleta/TabGraficoSetores";
import { TabGraficoChancesSimples } from "@/components/roleta/TabGraficoChancesSimples";
import { TabGraficoPadraoF } from "@/components/roleta/TabGraficoPadraoF";
import { SentinelaGraficosDoutorado } from "@/components/roleta/SentinelaGraficosDoutorado";

export const Route = createFileRoute("/grafico")({
  head: () => ({
    meta: [
      { title: "Gráficos de Tendência & Radar de Densidade (Tolerância 2x) | Roleta Pro" },
      {
        name: "description",
        content:
          "Dashboard com gráficos de frequência de colunas, dúzias, setores, chances simples e radar de densidade (Padrão F) com tolerância de 2 erros da roleta.",
      },
      { property: "og:title", content: "Gráficos de Tendência & Radar de Densidade (Tolerância 2x) | Roleta Pro" },
      {
        property: "og:description",
        content: "Frequência de colunas, dúzias, setores, chances simples e radar de densidade com tolerância de 2 erros da roleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GraficoPage,
});

function GraficoPage() {
  const { setores } = useConfig();
  const { spins, addSpin } = useSpins(setores);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 pb-12 pt-3">
      <header className="mb-4 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/painel"
            aria-label="Voltar ao painel"
            className="neon-cyan-glow flex items-center justify-center rounded-md p-2 transition hover:bg-neon-cyan/20"
          >
            <ArrowLeft className="h-4 w-4 text-neon-cyan" />
          </Link>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-neon-cyan" />
            <h1 className="font-display text-sm font-black tracking-wide text-white uppercase sm:text-base">
              ANÁLISE DE <span className="text-neon-cyan">TENDÊNCIAS</span> & <span className="text-neon-gold">PADRÃO F (DENSIDADE)</span>{" "}
              <span className="text-neon-gold text-xs font-bold">(TOLERÂNCIA 2X)</span>
            </h1>
          </div>
        </div>

        <Link
          to="/painel"
          className="rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/20"
        >
          Voltar ao Painel
        </Link>
      </header>

      <main className="w-full space-y-6">
        {/* Comando Nível Hard Doutorado - Sentinela de Vigilância Ao Vivo & Modo Expert */}
        <SentinelaGraficosDoutorado spins={spins} onAddSpin={addSpin} />

        {/* Gráfico 1: Análise de Colunas (Tolerância 2x) */}
        <section aria-label="Análise de Colunas">
          <TabGraficoColunas spins={spins} onAddSpin={addSpin} />
        </section>

        {/* Gráfico 2: Análise de Dúzias (Tolerância 2x) */}
        <section aria-label="Análise de Dúzias">
          <TabGraficoDuzias spins={spins} onAddSpin={addSpin} />
        </section>

        {/* Gráfico 3: Análise de Setores (Tolerância 2x) */}
        <section aria-label="Análise de Setores">
          <TabGraficoSetores spins={spins} onAddSpin={addSpin} />
        </section>

        {/* Gráfico 4: Análise de Chances Simples (Tolerância 2x) */}
        <section aria-label="Análise de Chances Simples">
          <TabGraficoChancesSimples spins={spins} onAddSpin={addSpin} />
        </section>

        {/* Gráfico 5: Padrão F - Radar de Densidade (Tolerância 2x) - Abaixo dos outros */}
        <section aria-label="Padrão F - Radar de Densidade">
          <TabGraficoPadraoF spins={spins} onAddSpin={addSpin} />
        </section>
      </main>
    </div>
  );
}
