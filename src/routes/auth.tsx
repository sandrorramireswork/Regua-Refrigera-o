import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Acesse sua conta do Roleta Pro by Sanka Master para registrar giros e acompanhar padrões ao vivo.",
      },
      { property: "og:title", content: "Entrar | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Acesse seu painel de operador de roleta com padrões e estatísticas ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel", replace: true });
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) navigate({ to: "/painel", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setOk(false);

    if (modo === "criar" && senha !== confirmar) {
      setMsg("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    if (modo === "criar") {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: nome.trim() },
        },
      });
      if (error) {
        setMsg(
          error.message.toLowerCase().includes("already")
            ? "Este e-mail já tem cadastro. Use a opção Entrar."
            : error.message,
        );
      } else {
        setOk(true);
        setMsg("Cadastro criado! Confirme pelo link enviado no seu e-mail e depois entre.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha inválidos.");
    }
    setCarregando(false);
  }

  async function google() {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/painel", replace: true });
  }

  function trocar(novo: "entrar" | "criar") {
    setModo(novo);
    setMsg(null);
    setOk(false);
    setNome("");
    setConfirmar("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="neon-cyan-glow w-full max-w-sm rounded-2xl bg-card/70 p-5">
        <h1 className="text-center font-display text-lg font-black text-neon-cyan">
          ROLETA PRO <span className="text-neon-magenta">by Sanka</span>
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border bg-input/60 p-1">
          <button
            onClick={() => trocar("entrar")}
            className={`rounded-md py-2 font-display text-xs font-black ${
              modo === "entrar" ? "num-green" : "text-muted-foreground"
            }`}
          >
            ENTRAR
          </button>
          <button
            onClick={() => trocar("criar")}
            className={`rounded-md py-2 font-display text-xs font-black ${
              modo === "criar" ? "num-green" : "text-muted-foreground"
            }`}
          >
            CRIAR CONTA
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {modo === "entrar"
            ? "Acesse seu painel de operador"
            : "Cadastre-se para digitar resultados e ver as análises"}
        </p>

        <form onSubmit={enviar} className="mt-4 space-y-3">
          {modo === "criar" && (
            <input
              type="text"
              required
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-neon-cyan"
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-neon-cyan"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={modo === "criar" ? "new-password" : "current-password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={modo === "criar" ? "Crie uma senha (mín. 6)" : "Senha"}
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-neon-cyan"
          />
          {modo === "criar" && (
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a senha"
              className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-neon-cyan"
            />
          )}
          <button
            type="submit"
            disabled={carregando}
            className="num-green w-full rounded-md py-2.5 font-display text-sm font-black disabled:opacity-60"
          >
            {carregando ? "AGUARDE..." : modo === "entrar" ? "ENTRAR" : "CRIAR MINHA CONTA"}
          </button>
        </form>

        <button
          onClick={() => void google()}
          className="neon-cyan-glow mt-3 w-full rounded-md py-2.5 text-sm font-semibold text-foreground"
        >
          Continuar com Google
        </button>

        {msg && (
          <p
            className={`mt-3 text-center text-xs ${ok ? "text-neon-cyan" : "text-neon-gold"}`}
          >
            {msg}
          </p>
        )}

        <button
          onClick={() => trocar(modo === "entrar" ? "criar" : "entrar")}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          {modo === "entrar" ? "Não tem conta? Cadastre-se agora" : "Já tenho conta, entrar"}
        </button>
      </div>
    </main>
  );
}

