import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import {
  BANKROLL_PADRAO,
  calcBankroll,
  lerBankrollConfig,
  salvarBankrollConfig,
  type BankrollConfig,
} from "@/lib/bankroll";

export const Route = createFileRoute("/bankroll")({
  head: () => ({
    meta: [
      { title: "Bankroll do Operador | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Capital, limite de perda e saldo da banca atualizados a cada giro real da mesa, com histórico de entradas confirmadas.",
      },
      { property: "og:title", content: "Bankroll do Operador | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Controle de capital, stop de perda, meta e saldo ao vivo por giro real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankrollPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function BankrollPage() {
  const { setores } = useConfig();
  const { spins } = useSpins(setores);

  const [cfg, setCfg] = useState<BankrollConfig>(BANKROLL_PADRAO);
  useEffect(() => setCfg(lerBankrollConfig()), []);
  function update(patch: Partial<BankrollConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    salvarBankrollConfig(next);
  }

  const bank = useMemo(() => calcBankroll(spins, cfg), [spins, cfg]);
  const perdaUsada = cfg.limitePerda > 0 ? Math.min(100, (Math.max(0, -bank.saldo) / cfg.limitePerda) * 100) : 0;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md space-y-3 p-3 pb-10">
      <header className="flex items-center justify-between gap-2">
        <Link to="/painel" className="neon-cyan-glow rounded-md p-1.5" aria-label="Voltar ao painel">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black tracking-wide text-neon-cyan">BANKROLL</h1>
        <span className="text-[9px] text-muted-foreground">DADOS DESTE APARELHO</span>
      </header>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Big label="Capital" valor={brl(cfg.capital)} />
        <Big
          label="Saldo"
          valor={`${bank.saldo >= 0 ? "+" : ""}${brl(bank.saldo)}`}
          tom={bank.saldo >= 0 ? "green" : "red"}
        />
        <Big label="Banca atual" valor={brl(bank.banca)} tom={bank.banca >= cfg.capital ? "green" : "gold"} />
      </div>

      <div className="rounded-lg border border-border bg-card/60 p-2">
        <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
          <span>Limite de perda</span>
          <span className={perdaUsada >= 100 ? "text-neon-red" : "text-foreground"}>
            {brl(Math.max(0, -bank.saldo))} / {brl(cfg.limitePerda)}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${perdaUsada >= 100 ? "bg-neon-red" : perdaUsada >= 60 ? "bg-neon-gold" : "bg-neon-green"}`}
            style={{ width: `${perdaUsada}%` }}
          />
        </div>
        {bank.parado && (
          <p className="mt-1 font-display text-[11px] font-black text-neon-red">
            🛑 STOP ATINGIDO — encerrar a sessão
          </p>
        )}
        {bank.metaBatida && (
          <p className="mt-1 font-display text-[11px] font-black text-neon-green">
            ✅ META BATIDA — recolher o lucro
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Capital inicial (R$)" valor={cfg.capital} onChange={(v) => update({ capital: v })} />
        <Campo label="Valor por número (R$)" valor={cfg.unidade} onChange={(v) => update({ unidade: v })} />
        <Campo
          label="Limite de perda (R$)"
          valor={cfg.limitePerda}
          onChange={(v) => update({ limitePerda: v })}
        />
        <Campo label="Meta de ganho (R$)" valor={cfg.meta} onChange={(v) => update({ meta: v })} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <Mini label="Entradas" valor={String(bank.entradas)} />
        <Mini label="Wins" valor={`${bank.wins}`} tom="green" />
        <Mini label="Acerto" valor={`${bank.taxa.toFixed(1)}%`} tom="green" />
        <Mini label="Pior queda" valor={brl(bank.drawdown)} tom="red" />
      </div>

      <div className="rounded-lg border border-border bg-card/60 p-2">
        <div className="font-display text-[11px] font-black uppercase text-neon-gold">
          Entradas confirmadas · {bank.girosAnalisados} giros reais
        </div>
        {bank.lances.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-muted-foreground">
            Nenhuma entrada confirmada ainda nos giros deste aparelho.
          </p>
        ) : (
          <table className="mt-1 w-full text-left text-[10px]">
            <thead className="text-[9px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Giro</th>
                <th>Nº</th>
                <th>Alvos</th>
                <th>Aposta</th>
                <th>Resultado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {bank.lances.slice(0, 30).map((l) => (
                <tr key={`${l.giro}-${l.num}`} className="border-t border-border/60">
                  <td className="py-0.5 text-muted-foreground">{l.giro}</td>
                  <td className="font-display font-black text-foreground">{l.num}</td>
                  <td className="text-muted-foreground">{l.alvos.join(" ")}</td>
                  <td>{brl(l.aposta)}</td>
                  <td className={l.win ? "text-neon-green" : "text-neon-red"}>
                    {l.win ? "+" : ""}
                    {brl(l.resultado)}
                  </td>
                  <td className={l.saldo >= 0 ? "text-neon-green" : "text-neon-red"}>{brl(l.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground">
        Cada entrada cobre os 5 números da zona confirmada pelo Sniper, usando apenas giros reais da
        histórico deste aparelho. Pagamento considerado: 35 para 1.
      </p>
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-border bg-card/60 p-2">
      <span className="block text-[9px] uppercase text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        value={valor}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-0.5 w-full bg-transparent font-display text-sm font-black text-foreground outline-none"
      />
    </label>
  );
}

function Big({ label, valor, tom }: { label: string; valor: string; tom?: "green" | "red" | "gold" }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-1.5 py-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-display text-[13px] font-black ${
          tom === "green"
            ? "text-neon-green"
            : tom === "red"
              ? "text-neon-red"
              : tom === "gold"
                ? "text-neon-gold"
                : "text-foreground"
        }`}
      >
        {valor}
      </div>
    </div>
  );
}

function Mini({ label, valor, tom }: { label: string; valor: string; tom?: "green" | "red" }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-1.5 py-1">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`font-display text-xs font-black ${
          tom === "green" ? "text-neon-green" : tom === "red" ? "text-neon-red" : "text-foreground"
        }`}
      >
        {valor}
      </div>
    </div>
  );
}
