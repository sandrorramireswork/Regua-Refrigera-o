import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ClipboardPaste,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  ImageUp,
  KeyRound,
  LoaderCircle,
  Plus,
  RotateCcw,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfig } from "@/hooks/useConfig";
import { supabase } from "@/integrations/supabase/client";
import { getProps } from "@/lib/roulette";
import { checkAiConfigStatus, readRouletteImage, saveAiApiKey, testAiApiKey } from "@/lib/roulette-image.functions";
import {
  extractImageFromClipboardEvent,
  processAndNormalizeImage,
  readImageFromSystemClipboard,
  type ProcessedImageData,
} from "@/lib/image-upload-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/importar-imagem")({
  head: () => ({
    meta: [
      { title: "Importar Giros por Imagem | Roleta Pro" },
      { name: "description", content: "Reconheça, confira e salve giros reais de roleta a partir de uma imagem." },
      { property: "og:title", content: "Importar Giros por Imagem | Roleta Pro" },
      { property: "og:description", content: "Leitura visual de resultados de roleta com conferência antes de salvar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarImagem,
});

type MessageTone = "neutral" | "success" | "danger";

function numberClass(number: number) {
  const props = getProps(number);
  return props.cor === "red" ? "num-red" : props.cor === "green" ? "num-green" : "num-black";
}

function ImportarImagem() {
  const navigate = useNavigate();
  const { setores } = useConfig();
  const recognize = useServerFn(readRouletteImage);
  const saveKeyFn = useServerFn(saveAiApiKey);
  const testKeyFn = useServerFn(testAiApiKey);
  const checkStatusFn = useServerFn(checkAiConfigStatus);

  const fileInput = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileDetails, setFileDetails] = useState<ProcessedImageData | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Configuração da chave IA
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("roleta_gemini_api_key") || "";
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  // Sequência manual por texto
  const [sequenceText, setSequenceText] = useState("");
  const [showSequenceInput, setShowSequenceInput] = useState(false);

  const [message, setMessage] = useState<{ tone: MessageTone; text: string }>({
    tone: "neutral",
    text: "Cole uma captura (Ctrl + V), clique para escolher ou arraste para enviar o histórico dos resultados.",
  });

  useEffect(() => {
    checkStatusFn()
      .then((res) => {
        const hasKey = res.configured || !!apiKeyInput;
        setAiConfigured(hasKey);
        if (!hasKey) setShowKeyInput(true);
      })
      .catch(() => setAiConfigured(!!apiKeyInput));
  }, [checkStatusFn, apiKeyInput]);

  async function handleIncomingFile(file: File | Blob, preferredName?: string) {
    setProcessingImage(true);
    try {
      const processed = await processAndNormalizeImage(file, preferredName);
      setPreview(processed.dataUrl);
      setImageDataUrl(processed.dataUrl);
      setFileDetails(processed);
      setDraft([]);
      setMessage({
        tone: "success",
        text: `Imagem pronta (${processed.width}x${processed.height}px · ${processed.sizeKb} KB). Toque em "Reconhecer giros".`,
      });
      toast.success("Imagem carregada!");
    } catch (err) {
      console.error("[ImportarImagem] Erro:", err);
      const text = err instanceof Error ? err.message : "Não foi possível carregar a imagem.";
      setMessage({ tone: "danger", text });
      toast.error(text);
    } finally {
      setProcessingImage(false);
    }
  }

  // Listener global de Paste (Ctrl + V)
  useEffect(() => {
    function handleGlobalPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

      const file = extractImageFromClipboardEvent(event);
      if (file) {
        event.preventDefault();
        event.stopPropagation();
        handleIncomingFile(file, `print-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.png`);
      } else if (!isInput && event.clipboardData?.getData("text")) {
        const text = event.clipboardData.getData("text").trim();
        const matches = text.match(/\b([0-9]|[1-2][0-9]|3[0-6])\b/g);
        if (matches && matches.length > 0) {
          const numbers = matches.map(Number);
          setDraft((prev) => [...prev, ...numbers]);
          setMessage({
            tone: "success",
            text: `${numbers.length} números importados do texto colado.`,
          });
          toast.success(`${numbers.length} números adicionados!`);
        }
      }
    }

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, []);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleIncomingFile(file, file.name);
    }
    event.target.value = "";
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const firstFile = event.dataTransfer.files?.[0];
    if (firstFile) {
      handleIncomingFile(firstFile, firstFile.name);
      return;
    }

    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        const item = event.dataTransfer.items[i];
        if (item && item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            handleIncomingFile(file, file.name);
            return;
          }
        }
      }
    }
  }

  async function handlePasteButtonClick() {
    const result = await readImageFromSystemClipboard();
    if ("file" in result) {
      handleIncomingFile(result.file, result.file.name);
    } else {
      setMessage({ tone: "neutral", text: result.error });
      toast.info("Pressione Ctrl + V no teclado para colar a imagem diretamente.");
    }
  }

  function handleDropzoneClick() {
    if (!busy && !processingImage) {
      fileInput.current?.click();
    }
  }

  function handleDropzoneKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDropzoneClick();
    }
  }

  function clearImage() {
    setPreview("");
    setImageDataUrl("");
    setFileDetails(null);
    setMessage({
      tone: "neutral",
      text: "Envie uma captura nítida que mostre o histórico dos resultados.",
    });
  }

  async function handleTestKey() {
    const key = apiKeyInput.trim();
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
    const key = apiKeyInput.trim();
    if (!key) {
      toast.error("Insira uma chave válida.");
      return;
    }
    setSavingKey(true);
    try {
      localStorage.setItem("roleta_gemini_api_key", key);
      const res = await saveKeyFn({ data: { apiKey: key } });
      if (res.ok) {
        setAiConfigured(true);
        setShowKeyInput(false);
        toast.success("Chave configurada com sucesso!");
      } else {
        toast.error(res.error || "Erro ao salvar chave.");
      }
    } catch {
      setAiConfigured(true);
      setShowKeyInput(false);
      toast.success("Chave salva localmente!");
    } finally {
      setSavingKey(false);
    }
  }

  async function scanImage() {
    if (!imageDataUrl) {
      toast.error("Selecione ou cole uma imagem primeiro.");
      return;
    }

    const currentKey = apiKeyInput.trim() || localStorage.getItem("roleta_gemini_api_key") || undefined;

    setBusy(true);
    setMessage({ tone: "neutral", text: "Lendo com IA os números e a ordem do histórico…" });
    try {
      const result = await recognize({ data: { imageDataUrl, apiKey: currentKey } });
      if (!result.ok) {
        if ("needsApiKey" in result && result.needsApiKey) {
          setShowKeyInput(true);
        }
        setMessage({ tone: "danger", text: result.error });
        toast.error(result.error);
        return;
      }
      setDraft(result.spins);
      setMessage({ tone: "success", text: `${result.spins.length} giros reconhecidos. Confira antes de salvar.` });
      toast.success(`${result.spins.length} giros reconhecidos!`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível ler a imagem.";
      setMessage({ tone: "danger", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  function handleImportSequence() {
    if (!sequenceText.trim()) return;
    const matches = sequenceText.match(/\b([0-9]|[1-2][0-9]|3[0-6])\b/g);
    if (!matches || matches.length === 0) {
      toast.error("Nenhum número entre 0 e 36 encontrado.");
      return;
    }
    const numbers = matches.map(Number);
    setDraft((prev) => [...prev, ...numbers]);
    setSequenceText("");
    setShowSequenceInput(false);
    toast.success(`${numbers.length} números importados!`);
  }

  function updateSpin(index: number, value: number) {
    const valid = Math.min(36, Math.max(0, isNaN(value) ? 0 : value));
    setDraft((current) => current.map((number, itemIndex) => (itemIndex === index ? valid : number)));
  }

  function addNewSpin() {
    setDraft((current) => [...current, 0]);
  }

  function invertSpinsOrder() {
    setDraft((current) => [...current].reverse());
    toast.info("Ordem invertida.");
  }

  function clearDraft() {
    setDraft([]);
    setMessage({ tone: "neutral", text: "Lista limpa." });
  }

  async function saveSpins() {
    if (!draft.length) return;
    setBusy(true);
    setMessage({ tone: "neutral", text: "Salvando os giros na sua conta…" });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userError || !userId) throw new Error("Sua sessão terminou. Entre novamente para salvar.");

      // draft[0] é a última rodada (mais recente).
      // Ao salvar no banco, o item com created_at mais novo fica no topo do painel.
      // Invertemos para que draft[0] fique com o maior timestamp (data atual):
      const chronological = [...draft].reverse();
      const firstCreatedAt = Date.now() - chronological.length * 1000;
      const rows = chronological.map((number, index) => {
        const props = getProps(number, setores);
        return {
          user_id: userId,
          number,
          color: props.cor,
          dozen: props.duzia,
          column_idx: props.coluna,
          sector: props.setor,
          source: "image",
          created_at: new Date(firstCreatedAt + index * 1000).toISOString(),
        };
      });
      const { error } = await supabase.from("spins").insert(rows);
      if (error) throw new Error("Não foi possível salvar os giros reconhecidos.");

      // Limpa e sincroniza o registro ao vivo local e público
      const clearTimestamp = new Date(firstCreatedAt - 100).toISOString();
      localStorage.setItem("roleta-spins-cleared-at", clearTimestamp);
      const liveRows = rows
        .map((r) => ({
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Math.random()),
          number: r.number,
          created_at: r.created_at,
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      localStorage.setItem("roleta-spins-v2", JSON.stringify(liveRows.slice(0, 1000)));

      void supabase
        .from("public_live_spins")
        .insert(
          liveRows.map((s) => ({
            id: s.id,
            number: s.number,
            created_at: s.created_at,
            device_id: localStorage.getItem("roleta-public-device-id") || s.id,
          }))
        )
        .then(() => {}, () => {});

      setMessage({ tone: "success", text: `${draft.length} giros salvos. Registro ao vivo limpo e sincronizado!` });
      toast.success(`${draft.length} giros salvos e registro ao vivo atualizado com sucesso!`);
      await navigate({ to: "/painel" });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível salvar os giros.";
      setMessage({ tone: "danger", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <header className="flex items-center gap-3">
        <Button asChild size="icon" variant="outline" aria-label="Voltar ao painel">
          <Link to="/painel">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <p className="font-display text-[10px] uppercase text-neon-magenta font-bold">Entrada visual</p>
          <h1 className="font-display text-lg font-black uppercase text-neon-cyan sm:text-2xl">
            Importar giros por imagem
          </h1>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ENVIAR / COLAR CAPTURA */}
        <section className="neon-cyan-glow rounded-lg bg-card p-3 sm:p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-neon-cyan">
              <ImageUp size={18} className="text-cyan-400" />
              Enviar captura
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-6 text-[10px] px-2 font-mono",
                  aiConfigured
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/30"
                    : "border-amber-500/50 text-amber-300 bg-amber-950/40 animate-pulse"
                )}
                onClick={() => setShowKeyInput((v) => !v)}
                title="Configurar chave do Google Gemini para OCR"
              >
                <KeyRound size={11} className="mr-1" />
                {aiConfigured ? "IA Conectada" : "Configurar Chave IA"}
              </Button>
              <span className="text-[10px] uppercase tracking-wider rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-cyan-300">
                Ctrl + V Ativo
              </span>
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Cole com <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-cyan-300">Ctrl + V</kbd>, clique para escolher arquivo ou arraste a captura de tela.
          </p>

          {/* PAINEL DE CONFIGURAÇÃO DE CHAVE IA */}
          {showKeyInput && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound size={14} /> Chave do Google Gemini (OCR Gratuito)
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyInput(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-[11px] text-amber-200/80">
                Cole sua chave da API do Google Gemini. O Google oferece uso gratuito direto no site:
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 underline hover:text-cyan-300"
              >
                Criar chave gratuita no Google AI Studio (aistudio.google.com) <ExternalLink size={11} />
              </a>

              <div className="mt-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeyPassword ? "text" : "password"}
                    placeholder="Cole sua chave AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestKey}
                  disabled={testingKey || !apiKeyInput.trim()}
                  className="h-8 text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40"
                >
                  {testingKey ? <LoaderCircle className="size-3 animate-spin mr-1" /> : null}
                  Testar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveKey}
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="h-8 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  {savingKey ? <LoaderCircle className="size-3.5 animate-spin mr-1" /> : "Salvar Chave"}
                </Button>
              </div>

              {apiKeyInput.startsWith("gen-lang-client") && (
                <p className="mt-2 text-[10px] text-amber-300 bg-amber-950/70 p-2 rounded border border-amber-500/40">
                  ⚠️ <strong>Atenção:</strong> Você colou o ID de projeto (<code>gen-lang-client...</code>). Para a IA funcionar, é necessária a chave que começa com <code>AIzaSy...</code>. Clique no link acima para copiar sua chave.
                </p>
              )}
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={chooseFile}
            aria-label="Selecionar imagem dos giros"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={handleDropzoneClick}
            onKeyDown={handleDropzoneKeyDown}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropFile}
            className={cn(
              "group relative mt-3 grid min-h-64 place-items-center rounded-lg border-2 border-dashed p-3 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-neon-cyan",
              dragging
                ? "border-neon-magenta bg-magenta-950/20 scale-[1.01]"
                : preview
                ? "border-cyan-500/40 bg-background/80 hover:border-cyan-400"
                : "border-border/80 bg-background/50 hover:border-cyan-400/70 hover:bg-card/70"
            )}
          >
            {processingImage ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <LoaderCircle className="size-8 animate-spin text-neon-cyan" />
                <p className="text-xs font-bold text-cyan-300">Processando imagem…</p>
              </div>
            ) : preview ? (
              <div className="relative w-full">
                <img
                  src={preview}
                  alt="Captura selecionada para leitura"
                  className="max-h-[420px] w-full rounded-md object-contain shadow-md"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md bg-black/80 px-2 py-1 backdrop-blur-sm">
                  {fileDetails && (
                    <span className="text-[10px] font-mono text-cyan-300">
                      {fileDetails.width}×{fileDetails.height} · {fileDetails.sizeKb} KB
                    </span>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    title="Remover imagem"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 px-3">
                <div className="rounded-full bg-cyan-950/50 p-3 ring-1 ring-cyan-500/30 group-hover:scale-110 transition-transform">
                  <ImageUp className="size-8 text-cyan-400" />
                </div>
                <p className="mt-3 text-sm font-bold text-foreground">
                  Arraste uma captura ou clique para escolher
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Suporta <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-cyan-300">Ctrl + V</kbd>, PrintScreen, JPG, PNG e WebP
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-[10px] font-medium text-cyan-300">
                  <ClipboardPaste size={12} />
                  Pressione Ctrl + V para colar a qualquer momento
                </div>
              </div>
            )}
          </div>

          {fileDetails && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate max-w-[260px] font-mono">{fileDetails.fileName}</span>
              <button
                type="button"
                onClick={clearImage}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Trocar captura
              </button>
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePasteButtonClick}
              disabled={busy || processingImage}
              className="border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 text-cyan-300"
              title="Colar imagem da área de transferência (Ctrl+V)"
            >
              <ClipboardPaste className="mr-1.5 size-4 text-cyan-400" />
              Colar (Ctrl+V)
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={busy || processingImage}
              className="border-border hover:border-cyan-500/50"
            >
              <ImageUp className="mr-1.5 size-4" />
              Escolher imagem
            </Button>

            <Button
              type="button"
              onClick={scanImage}
              disabled={!imageDataUrl || busy || processingImage}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-950/50"
            >
              {busy ? <LoaderCircle className="mr-1.5 size-4 animate-spin" /> : <ScanLine className="mr-1.5 size-4" />}
              {busy ? "Lendo com IA…" : "Reconhecer giros"}
            </Button>
          </div>

          {/* SEQUÊNCIA POR TEXTO */}
          <div className="mt-3 border-t border-border/50 pt-2.5">
            <button
              type="button"
              onClick={() => setShowSequenceInput((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-cyan-300"
            >
              <FileText size={12} />
              {showSequenceInput ? "Ocultar sequência em texto" : "Ou colar sequência em texto (ex: 32, 15, 0, 26, 3)"}
            </button>

            {showSequenceInput && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  placeholder="Ex: 32, 15, 19, 4, 21, 2, 25, 17, 34, 6"
                  value={sequenceText}
                  onChange={(e) => setSequenceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleImportSequence();
                    }
                  }}
                  className="h-8 text-xs font-mono bg-background/80"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleImportSequence}
                  disabled={!sequenceText.trim()}
                  className="h-8 text-xs font-bold shrink-0"
                >
                  Importar
                </Button>
              </div>
            )}
          </div>

          <div
            aria-live="polite"
            className={cn(
              "mt-3 rounded-md border px-3 py-2 text-xs leading-5",
              message.tone === "danger" && "border-destructive/50 bg-destructive/10 text-destructive",
              message.tone === "success" && "border-neon-green/50 bg-neon-green/10 text-neon-green font-medium",
              message.tone === "neutral" && "border-border bg-muted/60 text-muted-foreground"
            )}
          >
            {message.text}
          </div>
        </section>

        {/* CONFERÊNCIA DOS GIROS */}
        <section className="neon-cyan-glow flex min-w-0 flex-col rounded-lg bg-card border border-cyan-500/20">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-[10px] uppercase text-neon-magenta font-bold">Conferência</p>
              <h2 className="text-sm font-bold text-foreground">Giros reconhecidos</h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-foreground">
              {draft.length} resultados
            </span>
          </div>

          {draft.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <span className="text-[11px] text-muted-foreground">
                <strong className="text-cyan-400 font-mono">#1 = Última rodada</strong> (Linha 1 esq → dir, Linha 2 esq → dir...):
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={addNewSpin}
                  title="Adicionar número"
                >
                  <Plus size={13} className="mr-1" />
                  Adicionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={invertSpinsOrder}
                  title="Inverter ordem"
                >
                  <ArrowUpDown size={13} className="mr-1" />
                  Inverter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2 text-rose-400 hover:text-rose-300"
                  onClick={clearDraft}
                  title="Limpar lista"
                >
                  <RotateCcw size={13} className="mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          )}

          <div className="max-h-[540px] flex-1 overflow-auto p-3">
            {draft.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {draft.map((number, index) => (
                  <article
                    key={`${index}-${number}`}
                    className={cn(
                      "grid min-w-0 grid-cols-[38px_1fr_32px] items-center gap-2 rounded-md border p-2 shadow-sm",
                      index === 0
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "border-border bg-background"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono text-muted-foreground text-center">#{index + 1}</span>
                      {index === 0 && (
                        <span className="text-[8px] font-black uppercase text-cyan-300 bg-cyan-950/80 px-1 rounded border border-cyan-500/40">
                          Última
                        </span>
                      )}
                    </div>
                    <Input
                      aria-label={`Número do giro ${index + 1}`}
                      type="number"
                      min={0}
                      max={36}
                      value={number}
                      className={cn("h-9 text-center font-display text-base font-black", numberClass(number))}
                      onChange={(event) => updateSpin(index, Number(event.target.value))}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Excluir giro ${index + 1}`}
                      onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-border px-6 text-center text-xs leading-5 text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">Os números reconhecidos aparecerão aqui</p>
                  <p className="mt-1">
                    Cole uma captura com <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-cyan-300">Ctrl+V</kbd> ou escolha um arquivo para processar.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={addNewSpin}
                    >
                      <Plus size={13} className="mr-1" />
                      Inserir número
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowSequenceInput(true)}
                    >
                      <FileText size={13} className="mr-1" />
                      Colar sequência em texto
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 bg-card/40">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 shadow-lg shadow-emerald-950/40"
              onClick={saveSpins}
              disabled={!draft.length || busy}
            >
              {busy ? <LoaderCircle className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}
              Salvar {draft.length ? `${draft.length} giros` : ""} na minha conta
            </Button>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              A ordem exibida vai do resultado mais antigo ao mais recente.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}