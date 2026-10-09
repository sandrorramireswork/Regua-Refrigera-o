import { detectarPadroes, type Padrao, type Spin } from "@/lib/roulette";

export function TabPadroes({ spins, padroes }: { spins: Spin[]; padroes: Padrao[] }) {
  const resultados = detectarPadroes(spins, padroes);

  if (resultados.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Nenhum padrão configurado. Defina os padrões no painel de administração.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {resultados.map(({ padrao, ativo }) => (
        <div
          key={padrao.id}
          className={`rounded-lg border p-2 ${
            ativo ? "num-green animate-flash-green" : "neon-cyan-glow bg-card/60"
          }`}
        >
          <div className="font-display text-sm font-black text-foreground">{padrao.code}</div>
          <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
            {padrao.nome}
          </div>
          <div className="mt-1 truncate text-[10px] text-neon-gold">{padrao.alvos}</div>
          <div
            className={`mt-1.5 rounded px-1.5 py-1 text-center font-display text-[11px] font-bold ${
              ativo
                ? "bg-neon-green/25 text-neon-green"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {!padrao.ativa ? "⏸ Desativado" : ativo ? "🚨 ENTRAR AGORA" : "⏳ Analisando"}
          </div>
        </div>
      ))}
    </div>
  );
}
