import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Eye,
  EyeOff,
  LoaderCircle,
  Check,
} from "lucide-react";
import { useSettings, SETTINGS_PADRAO } from "@/hooks/useSettings";
import { pedirPermissao } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkAiConfigStatus, saveAiApiKey, testAiApiKey } from "@/lib/roulette-image.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações de Alertas e IA | Roleta Pro by Sanka Master" },
      {
        name: "description",
        content:
          "Ajuste os parâmetros dos alertas, limite de distorção e configure a chave do Google Gemini para leitura automática de imagens.",
      },
      { property: "og:title", content: "Configurações de Alertas e IA | Roleta Pro by Sanka Master" },
      {
        property: "og:description",
        content: "Parâmetros do operador, avisos e chave de IA para leitura de imagens da roleta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

function Switch({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="neon-cyan-glow flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left"
    >
      <span className="min-w-0">
        <span className="block font-display text-[12px] font-bold text-foreground">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{desc}</span>
      </span>
      <span
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          value ? "num-green" : "bg-muted"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-background transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function Configuracoes() {
  const { settings, update, reset } = useSettings();

  const checkStatusFn = useServerFn(checkAiConfigStatus);
  const saveKeyFn = useServerFn(saveAiApiKey);
  const testKeyFn = useServerFn(testAiApiKey);

  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    provider: string;
    maskedKey?: string;
  } | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    checkStatusFn()
      .then((res) => {
        setAiStatus({
          configured: res.configured,
          provider: res.provider,
          ...(res.maskedKey ? { maskedKey: res.maskedKey } : {}),
        });
        if (!res.configured) {
          const stored = localStorage.getItem("roleta_gemini_api_key");
          if (stored) setApiKey(stored);
        }
      })
      .catch(console.error);
  }, [checkStatusFn]);

  async function handleTestKey() {
    const key = apiKey.trim();
    if (!key) {
      toast.error("Insira uma chave para testar.");
      return;
    }
    setTestingKey(true);
    try {
      const res = await testKeyFn({ data: { apiKey: key } });
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar chave.");
    } finally {
      setTestingKey(false);
    }
  }

  async function handleSaveKey() {
    const key = apiKey.trim();
    if (!key) {
      toast.error("Insira uma chave válida.");
      return;
    }
    setSavingKey(true);
    try {
      localStorage.setItem("roleta_gemini_api_key", key);
      const res = await saveKeyFn({ data: { apiKey: key } });
      if (res.ok) {
        setAiStatus({ configured: true, provider: "gemini" });
        toast.success("Chave salva com sucesso no projeto e no navegador!");
      } else {
        toast.error(res.error || "Erro ao salvar chave.");
      }
    } catch (err) {
      localStorage.setItem("roleta_gemini_api_key", key);
      setAiStatus({ configured: true, provider: "gemini" });
      toast.success("Chave salva localmente no navegador!");
    } finally {
      setSavingKey(false);
    }
  }

  async function ligarCelular(v: boolean) {
    if (v) await pedirPermissao();
    update({ avisoCelular: v });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-3 px-3 pb-8 pt-3">
      <header className="flex items-center gap-2">
        <Link to="/painel" aria-label="Voltar ao painel" className="neon-cyan-glow rounded-md p-1.5">
          <ArrowLeft className="h-4 w-4 text-neon-cyan" />
        </Link>
        <h1 className="font-display text-base font-black tracking-wide text-neon-cyan">
          CONFIGURAÇÕES
        </h1>
        <button
          onClick={reset}
          aria-label="Restaurar padrão"
          className="ml-auto neon-cyan-glow flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] text-neon-gold"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Padrão
        </button>
      </header>

      <section className="neon-cyan-glow rounded-lg p-3">
        <h2 className="font-display text-[11px] uppercase tracking-widest text-neon-magenta">
          Limite de distorção
        </h2>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Diferença mínima de porcentagem entre o 1º e o 2º lugar das dúzias e colunas. Abaixo desse
          valor a mesa é considerada equilibrada e a entrada perfeita é bloqueada.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={settings.limiteDistorcao}
            onChange={(e) => update({ limiteDistorcao: Number(e.target.value) })}
            className="h-1.5 w-full accent-[var(--neon-cyan)]"
            aria-label="Limite de distorção em porcentagem"
          />
          <span className="w-16 shrink-0 text-right font-display text-lg font-black text-neon-gold">
            {settings.limiteDistorcao.toFixed(1)}%
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Valor de fábrica: {SETTINGS_PADRAO.limiteDistorcao}%
        </p>
      </section>

      <section className="neon-cyan-glow rounded-lg p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[11px] uppercase tracking-widest text-[#00FF88]">
            Pressão de Confluência (Radar Tático)
          </h2>
          <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-black text-[#00FF88] border border-emerald-500/40">
            NÍVEL EXPERT
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Porcentagem mínima de confluência exigida na Dúzia e na Coluna para disparar o alerta estroboscópico sutil e validar a &quot;Entrada Nível Expert&quot; na Grade Tática Balística.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={settings.pressaoConfluenciaMinima ?? 75}
            onChange={(e) => update({ pressaoConfluenciaMinima: Number(e.target.value) })}
            className="h-1.5 w-full accent-[#00FF88]"
            aria-label="Pressão mínima de confluência em porcentagem"
          />
          <span className="w-16 shrink-0 text-right font-display text-lg font-black text-[#00FF88] drop-shadow-[0_0_8px_#00FF88]">
            {(settings.pressaoConfluenciaMinima ?? 75)}%
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Recomendado: 75% a 80% (Valor de fábrica: {SETTINGS_PADRAO.pressaoConfluenciaMinima}%)
        </p>
      </section>

      <section className="neon-cyan-glow rounded-lg p-3 border border-amber-500/20 bg-amber-950/10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[11px] uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <KeyRound className="size-3.5" />
            Inteligência Artificial (OCR de Imagens)
          </h2>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] font-black border",
              aiStatus?.configured
                ? "bg-emerald-950/80 text-[#00FF88] border-emerald-500/40"
                : "bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse"
            )}
          >
            {aiStatus?.configured ? "CONECTADA" : "CONFIGURAÇÃO PENDENTE"}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Chave da API do Google Gemini para ler automaticamente capturas de tela e fotos da roleta pelo botão &quot;Receber Imagem&quot; ou na aba &quot;Rodadas por Imagem&quot;.
        </p>

        {aiStatus?.maskedKey && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400 font-mono bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
            <Check className="size-3 text-emerald-400 shrink-0" /> Chave ativa no .env: {aiStatus.maskedKey}
          </div>
        )}

        <div className="mt-2.5 space-y-2">
          <div className="relative">
            <Input
              type={showKeyPassword ? "text" : "password"}
              placeholder="Cole sua chave AIzaSy... do Gemini"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 text-xs font-mono pr-8 bg-background/80 border-amber-500/40 focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => setShowKeyPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKeyPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          {apiKey.startsWith("gen-lang-client") && (
            <p className="text-[10px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-500/40">
              ⚠️ <strong>Atenção:</strong> Você colou o ID de projeto (<code>gen-lang-client...</code>). Para o Gemini funcionar, use a chave de API que começa com <code>AIzaSy...</code>.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 underline hover:text-cyan-300"
            >
              Gerar chave grátis no Google AI Studio <ExternalLink size={10} />
            </a>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTestKey}
                disabled={testingKey || !apiKey.trim()}
                className="h-7 text-[11px] border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40"
              >
                {testingKey ? <LoaderCircle className="size-3 animate-spin mr-1" /> : null}
                Testar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveKey}
                disabled={savingKey || !apiKey.trim()}
                className="h-7 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                {savingKey ? <LoaderCircle className="size-3 animate-spin mr-1" /> : "Salvar Chave"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-[11px] uppercase tracking-widest text-neon-magenta">
          Tipos de aviso
        </h2>
        <Switch
          label="Banner de padrão"
          desc="Faixa verde piscante no topo quando um padrão confirma."
          value={settings.avisoBanner}
          onChange={(v) => update({ avisoBanner: v })}
        />
        <Switch
          label="Aviso amarelo de distorção"
          desc="Faixa dourada avisando que a mesa está equilibrada."
          value={settings.avisoAmarelo}
          onChange={(v) => update({ avisoAmarelo: v })}
        />
        <Switch
          label="Notificação no celular"
          desc="Aviso do sistema mesmo com a tela em outro app."
          value={settings.avisoCelular}
          onChange={(v) => void ligarCelular(v)}
        />
        <Switch
          label="Som do alerta"
          desc="Toque sonoro no momento da confirmação."
          value={settings.avisoSom}
          onChange={(v) => update({ avisoSom: v })}
        />
        <Switch
          label="Vibração"
          desc="Vibra o aparelho junto com o alerta."
          value={settings.avisoVibracao}
          onChange={(v) => update({ avisoVibracao: v })}
        />
      </section>
    </div>
  );
}
