import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import { calcTransicoes, getProps, vizinhos, REDS } from "@/lib/roulette";

export const Route = createFileRoute("/numeros")({
  head: () => ({
    meta: [
      { title: "Mapa dos Números | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Veja cada número da roleta com seus vizinhos no cilindro, quem puxa ele, quem ele puxa e o histórico real de giros.",
      },
      { property: "og:title", content: "Mapa dos Números | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Vizinhos, puxadas e histórico real de cada número da roleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Numeros,
});

function classeNum(n: number) {
  return n === 0 ? "num-green" : REDS.includes(n) ? "num-red" : "num-black";
}

function Bolinha({ n, pequena = false }: { n: number; pequena?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-black ${
        pequena ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-base"
      } ${classeNum(n)}`}
    >
      {n}
    </span>
  );
}

function Numeros() {
  const { setores } = useConfig();
  const { spins } = useSpins(setores);

  const [busca, setBusca] = useState("");

  const transicoes = useMemo(
    () => calcTransicoes(spins, { minCount: 1, topN: 5000, windowSize: 5000 }),
    [spins],
  );

  const linhas = useMemo(() => {
    const cronologico = [...spins].reverse().map((s) => s.num);
    return Array.from({ length: 37 }, (_, num) => {
      const posicoes: number[] = [];
      cronologico.forEach((v, i) => {
        if (v === num) posicoes.push(cronologico.length - i); // giros atrás
      });
      const puxa = transicoes
        .filter((t) => t.origem === num)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 4);
      const puxadoPor = transicoes
        .filter((t) => t.destino === num)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 4);
      const props = getProps(num, setores);
      return {
        num,
        props,
        letra: props.setor !== "—" ? props.setor.charAt(0).toUpperCase() : "",
        qtd: posicoes.length,
        perc: (posicoes.length / (spins.length || 1)) * 100,
        ultimas: posicoes.slice(-8).reverse(),
        semSair: posicoes.length > 0 ? Math.min(...posicoes) - 1 : spins.length,
        vizinhos: vizinhos(num, 2).filter((v) => v !== num),
        puxa,
        puxadoPor,
      };
    });
  }, [spins, transicoes, setores]);

  const filtradas = busca.trim()
    ? linhas.filter((l) => String(l.num) === busca.trim())
    : linhas;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <Link to="/painel" aria-label="Voltar ao painel" className="neon-cyan-glow rounded-md p-1.5">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="truncate font-display text-base font-black tracking-wide text-neon-cyan">
          MAPA DOS NÚMEROS
        </h1>
      </header>

      <p className="mt-2 text-[10px] text-muted-foreground">{spins.length} giros exclusivos deste aparelho</p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        placeholder="Filtrar por número (0 a 36)"
        aria-label="Filtrar por número"
        className="mt-2 w-full rounded-md border border-neon-cyan/40 bg-card/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />

      {spins.length === 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ainda não há giros reais registrados para montar o mapa.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {filtradas.map((l) => (
          <section key={l.num} className="neon-cyan-glow rounded-lg p-2.5">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
              <Bolinha n={l.num} />
              <div className="min-w-0">
                <div className="truncate font-display text-xs font-black text-neon-gold">
                  {l.letra || "—"} · {l.props.setor} · {l.props.nomeCor}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {l.qtd} saídas · {l.perc.toFixed(1)}% · sem sair há {l.semSair} giros
                </div>
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-neon-gold/50 bg-neon-gold/10 p-1.5">
                <div className="text-[9px] uppercase text-neon-gold">Vizinhos no cilindro</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {l.vizinhos.map((v) => (
                    <Bolinha key={v} n={v} pequena />
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-neon-magenta/50 bg-neon-magenta/10 p-1.5">
                <div className="text-[9px] uppercase text-neon-magenta">Quem puxa este número</div>
                {l.puxadoPor.length === 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">Sem histórico.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {l.puxadoPor.map((t) => (
                      <span key={t.origem} className="flex items-center gap-1">
                        <Bolinha n={t.origem} pequena />
                        <span className="text-[9px] text-neon-magenta">
                          {t.qtd}x · {t.perc.toFixed(0)}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-neon-green/50 bg-neon-green/10 p-1.5">
                <div className="text-[9px] uppercase text-neon-green">Ele puxa</div>
                {l.puxa.length === 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">Sem histórico.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {l.puxa.map((t) => (
                      <span key={t.destino} className="flex items-center gap-1">
                        <Bolinha n={t.destino} pequena />
                        <span className="text-[9px] text-neon-green">
                          {t.qtd}x · {t.perc.toFixed(0)}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-neon-cyan/50 bg-neon-cyan/10 p-1.5">
                <div className="text-[9px] uppercase text-neon-cyan">Histórico de giros</div>
                {l.ultimas.length === 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">Nunca saiu.</p>
                ) : (
                  <p className="mt-1 text-[10px] text-neon-cyan">
                    saiu há {l.ultimas.map((p) => `${p - 1}`).join(" · ")} giros
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
