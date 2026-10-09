import { createFileRoute } from "@tanstack/react-router";
import { CyberTacticalApp } from "@/components/cyber-balistica/CyberTacticalApp";

export const Route = createFileRoute("/cyber-balistica")({
  head: () => ({
    meta: [
      { title: "ZONA ALVO BALÍSTICA | Tactical Cyberpunk SaaS" },
      {
        name: "description",
        content:
          "SaaS de análise balística de roleta em estilo Tactical Cyberpunk Neon. Header fixo, teclado digital agressivo, KPIs de 40 números, gráfico Chart.js, gestão de banca e efeito Green no G1.",
      },
      { property: "og:title", content: "ZONA ALVO BALÍSTICA | SINAL EXPERT" },
      {
        property: "og:description",
        content:
          "Análise balística de roleta com rotor europeu, estatísticas em tempo real e gamificação tática.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CyberBalisticaRoute,
});

function CyberBalisticaRoute() {
  return <CyberTacticalApp />;
}
