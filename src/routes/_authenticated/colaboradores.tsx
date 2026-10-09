import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/useConfig";
import { getCollaborators, type Collaborator } from "@/lib/collaborators.functions";

export const Route = createFileRoute("/_authenticated/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores | Roleta Pro by Sanka" },
      {
        name: "description",
        content: "Consulte os colaboradores cadastrados e copie o link de acesso do Roleta Pro.",
      },
      { property: "og:title", content: "Colaboradores | Roleta Pro by Sanka" },
      {
        property: "og:description",
        content: "Lista administrativa de colaboradores cadastrados no Roleta Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollaboratorsPage,
});

const statusDetails: Record<Collaborator["status"], { label: string; className: string }> = {
  active: { label: "Ativo", className: "border-neon-green/60 bg-neon-green/10 text-neon-green" },
  confirmed: { label: "Confirmado", className: "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan" },
  pending: { label: "Confirmação pendente", className: "border-neon-gold/60 bg-neon-gold/10 text-neon-gold" },
  blocked: { label: "Bloqueado", className: "border-neon-red/60 bg-neon-red/10 text-neon-red" },
};

function formatDate(value: string | null): string {
  if (!value) return "Ainda não entrou";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CollaboratorsPage() {
  const { isAdmin, loading: loadingRole } = useConfig();
  const fetchCollaborators = useServerFn(getCollaborators);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [appLink, setAppLink] = useState("/auth");

  useEffect(() => {
    setAppLink(`${window.location.origin}/auth`);
  }, []);

  async function load() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setCollaborators(await fetchCollaborators());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a lista.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return collaborators;
    return collaborators.filter((item) =>
      `${item.name} ${item.email} ${statusDetails[item.status].label}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [collaborators, query]);

  const counts = useMemo(
    () => ({
      total: collaborators.length,
      active: collaborators.filter((item) => item.status === "active").length,
      pending: collaborators.filter((item) => item.status === "pending").length,
    }),
    [collaborators],
  );

  async function copyLink(name?: string) {
    try {
      await navigator.clipboard.writeText(appLink);
      toast.success(name ? `Link de ${name} copiado` : "Link do aplicativo copiado");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  if (loadingRole) {
    return <p className="p-6 text-center text-xs text-muted-foreground">Carregando…</p>;
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-neon-gold" />
        <h1 className="font-display text-base font-black text-neon-gold">ACESSO RESTRITO</h1>
        <p className="text-xs text-muted-foreground">Somente o administrador pode ver os colaboradores.</p>
        <Button asChild variant="outline" className="neon-cyan-glow">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl space-y-4 p-3 pb-10 sm:p-5">
      <header className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Voltar à administração" className="neon-cyan-glow">
          <Link to="/admin"><ArrowLeft className="text-neon-cyan" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-black text-neon-cyan sm:text-lg">COLABORADORES</h1>
          <p className="text-[10px] text-muted-foreground">Contas cadastradas no aplicativo</p>
        </div>
        <Button variant="outline" size="icon" aria-label="Atualizar colaboradores" className="neon-cyan-glow" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`text-neon-cyan ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Summary icon={Users} label="Cadastrados" value={counts.total} tone="cyan" />
        <Summary icon={UserRoundCheck} label="Ativos" value={counts.active} tone="green" />
        <Summary icon={Clock3} label="Pendentes" value={counts.pending} tone="gold" />
      </section>

      <section className="neon-cyan-glow space-y-3 rounded-lg bg-card/60 p-3">
        <div className="flex items-center gap-2 text-neon-cyan">
          <ShieldCheck className="h-4 w-4" />
          <h2 className="font-display text-xs font-black">LINK DE ACESSO</h2>
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
            {appLink}
          </div>
          <Button type="button" size="icon" aria-label="Copiar link do aplicativo" onClick={() => void copyLink()} className="num-green">
            <Copy />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Envie este endereço para o colaborador criar a conta ou entrar.</p>
      </section>

      <label className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 focus-within:border-neon-cyan">
        <Search className="h-4 w-4 text-neon-cyan" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, e-mail ou status"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <section className="space-y-2">
        {loading && collaborators.length === 0 ? (
          <div className="neon-cyan-glow rounded-lg p-6 text-center text-xs text-muted-foreground">Carregando colaboradores…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
            {query ? "Nenhum colaborador encontrado." : "Nenhum colaborador cadastrado."}
          </div>
        ) : (
          filtered.map((collaborator) => {
            const status = statusDetails[collaborator.status];
            return (
              <article key={collaborator.id} className="neon-cyan-glow grid gap-3 rounded-lg bg-card/60 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neon-magenta/70 bg-neon-magenta/10 font-display text-sm font-black text-neon-magenta">
                  {initials(collaborator.name)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-sm font-black text-foreground">{collaborator.name}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="truncate text-xs text-neon-cyan">{collaborator.email}</p>
                  <div className="grid gap-0.5 text-[10px] text-muted-foreground sm:grid-cols-2 sm:gap-3">
                    <span>Cadastro: {formatDate(collaborator.createdAt)}</span>
                    <span>Último acesso: {formatDate(collaborator.lastSignInAt)}</span>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="neon-cyan-glow w-full sm:w-auto" onClick={() => void copyLink(collaborator.name)}>
                  <Copy /> Copiar link
                </Button>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "cyan" | "green" | "gold";
}) {
  const color = tone === "green" ? "text-neon-green" : tone === "gold" ? "text-neon-gold" : "text-neon-cyan";
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2 text-center">
      <Icon className={`mx-auto h-4 w-4 ${color}`} />
      <strong className={`mt-1 block font-display text-lg font-black ${color}`}>{value}</strong>
      <span className="block text-[9px] uppercase text-muted-foreground">{label}</span>
    </div>
  );
}