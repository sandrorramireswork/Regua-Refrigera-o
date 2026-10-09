import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpDown,
  Calendar,
  Check,
  ClipboardPaste,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  History,
  ImageUp,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScanLine,
  Sparkles,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProps } from "@/lib/roulette";
import { checkAiConfigStatus, readRouletteImage, saveAiApiKey, testAiApiKey } from "@/lib/roulette-image.functions";
import {
  extractImageFromClipboardEvent,
  processAndNormalizeImage,
  readImageFromSystemClipboard,
  type ProcessedImageData,
} from "@/lib/image-upload-utils";
import {
  getSavedCaptures,
  saveImageCapture,
  deleteSavedCapture,
  isNewDaySession,
  getTodayDateString,
  type SavedImageCapture,
} from "@/lib/daily-captures";
import { cn } from "@/lib/utils";

type MessageTone = "neutral" | "success" | "danger";

function numberClass(number: number) {
  const props = getProps(number);
  return props.cor === "red" ? "num-red" : props.cor === "green" ? "num-green" : "num-black";
}

export interface TabRodadasImagemProps {
  onAddSpins: (numbers: number[]) => void;
  onReplaceSpins?: (numbers: number[]) => void;
  onClearAll?: () => void;
  onNavigateToLive?: () => void;
  initialFile?: File | null;
  onClearInitialFile?: () => void;
}

export function TabRodadasImagem({
  onAddSpins,
  onReplaceSpins,
  onClearAll,
  onNavigateToLive,
  initialFile,
  onClearInitialFile,
}: TabRodadasImagemProps) {
  const recognize = useServerFn(readRouletteImage);
  const saveKeyFn = useServerFn(saveAiApiKey);
  const testKeyFn = useServerFn(testAiApiKey);
  const checkStatusFn = useServerFn(checkAiConfigStatus);

  const fileInput = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileDetails, setFileDetails] = useState<ProcessedImageData | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Histórico de capturas diárias salvas
  const [savedCaptures, setSavedCaptures] = useState<SavedImageCapture[]>(() => getSavedCaptures());
  const [isNewDay, setIsNewDay] = useState<boolean>(() => isNewDaySession());
  const [activeCaptureId, setActiveCaptureId] = useState<string | null>(null);

  // Automação: Sempre limpa o registro de giros ao vivo ao atualizar por imagem
  const [limparAoAtualizar, setLimparAoAtualizar] = useState(true);
  // Auto-sincronizar imediatamente com o Registro ao Vivo ao receber a imagem
  const [autoSincronizar, setAutoSincronizar] = useState(true);

  // Estado da chave de IA (Gemini / Lovable)
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("roleta_gemini_api_key") || "";
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  // Entrada de sequência manual por texto (ex: 32, 15, 0, 26, 3)
  const [sequenceText, setSequenceText] = useState("");
  const [showSequenceInput, setShowSequenceInput] = useState(false);

  const [message, setMessage] = useState<{ tone: MessageTone; text: string }>({
    tone: "neutral",
    text: "Cole uma captura (Ctrl + V), clique para escolher ou arraste uma imagem da mesa.",
  });

  // Escuta arquivo inicial recebido via paste global no painel
  useEffect(() => {
    if (initialFile) {
      void handleIncomingFile(initialFile, initialFile.name);
      onClearInitialFile?.();
    }
  }, [initialFile]);

  // Verifica se o servidor já possui chave configurada
  useEffect(() => {
    checkStatusFn()
      .then((res) => {
        const hasKey = res.configured || !!apiKeyInput;
        setAiConfigured(hasKey);
        if (!hasKey) {
          setShowKeyInput(true);
        }
      })
      .catch(() => {
        setAiConfigured(!!apiKeyInput);
      });
  }, [checkStatusFn, apiKeyInput]);

  // Função central para processar qualquer arquivo ou captura de imagem
  async function handleIncomingFile(file: File | Blob, preferredName?: string) {
    setProcessingImage(true);
    try {
      const processed = await processAndNormalizeImage(file, preferredName);
      setPreview(processed.dataUrl);
      setImageDataUrl(processed.dataUrl);
      setFileDetails(processed);
      setDraft([]);

      if (autoSincronizar) {
        toast.info("Processando captura com IA e atualizando Registro ao Vivo…");
        await runOcrAndSync(processed.dataUrl, processed.fileName);
      } else {
        setMessage({
          tone: "success",
          text: `Imagem pronta (${processed.width}x${processed.height}px · ${processed.sizeKb} KB). Clique em "Reconhecer rodadas".`,
        });
        toast.success("Imagem carregada com sucesso!");
      }
    } catch (err) {
      console.error("[TabRodadasImagem] Erro ao processar imagem:", err);
      const text = err instanceof Error ? err.message : "Não foi possível carregar a imagem.";
      setMessage({ tone: "danger", text });
      toast.error(text);
    } finally {
      setProcessingImage(false);
    }
  }

  // Listener global de Paste (Ctrl + V) enquanto o componente está ativo
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
            text: `${numbers.length} números colados via texto e adicionados à lista de conferência.`,
          });
          toast.success(`${numbers.length} números importados do texto colado!`);
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
      text: "Área limpa. Cole uma captura com Ctrl+V ou selecione um novo arquivo.",
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
      toast.error("Insira uma chave de API válida.");
      return;
    }
    setSavingKey(true);
    try {
      localStorage.setItem("roleta_gemini_api_key", key);
      const res = await saveKeyFn({ data: { apiKey: key } });
      if (res.ok) {
        setAiConfigured(true);
        setShowKeyInput(false);
        toast.success("Chave salva com sucesso no projeto e no navegador!");
        setMessage({
          tone: "success",
          text: "Chave configurada com sucesso! Você já pode reconhecer as imagens.",
        });
      } else {
        toast.error(res.error || "Erro ao salvar chave.");
      }
    } catch (err) {
      console.warn("Save key fallback to localStorage:", err);
      setAiConfigured(true);
      setShowKeyInput(false);
      toast.success("Chave salva localmente no navegador!");
    } finally {
      setSavingKey(false);
    }
  }

  // Aplica a lista de giros no Registro ao Vivo (com ou sem limpeza do histórico anterior)
  function applySpinsToLive(spinsList: number[], isSilent = false) {
    if (!spinsList.length) return;
    const chronological = [...spinsList].reverse();
    const count = spinsList.length;
    const latestNum = spinsList[0];

    if (limparAoAtualizar) {
      if (onReplaceSpins) {
        onReplaceSpins(chronological);
      } else {
        onClearAll?.();
        onAddSpins(chronological);
      }
      if (!isSilent) {
        toast.success(`Registro ao vivo limpo e sincronizado com ${count} rodadas da imagem!`, {
          action: onNavigateToLive
            ? {
                label: "Ver Registro ao Vivo",
                onClick: onNavigateToLive,
              }
            : undefined,
        });
      }
      setMessage({
        tone: "success",
        text: `Registro ao vivo limpo e sincronizado! ${count} rodadas aplicadas (Último giro ativo: ${latestNum}). Imagem salva no histórico diário!`,
      });
    } else {
      onAddSpins(chronological);
      if (!isSilent) {
        toast.success(`${count} rodadas adicionadas ao registro ao vivo!`);
      }
      setMessage({
        tone: "success",
        text: `${count} rodadas adicionadas com sucesso! Último giro ativo: ${latestNum}.`,
      });
    }
  }

  // Executa OCR com IA e salva a captura no histórico diário persistente
  async function runOcrAndSync(targetDataUrl: string, name?: string) {
    const currentKey = apiKeyInput.trim() || localStorage.getItem("roleta_gemini_api_key") || undefined;
    setBusy(true);
    setMessage({
      tone: "neutral",
      text: "Lendo histórico de resultados com IA e salvando captura diária…",
    });

    try {
      const result = await recognize({ data: { imageDataUrl: targetDataUrl, apiKey: currentKey } });
      if (!result.ok) {
        if ("needsApiKey" in result && result.needsApiKey) {
          setShowKeyInput(true);
        }
        setMessage({ tone: "danger", text: result.error });
        toast.error(result.error);
        return;
      }

      setDraft(result.spins);

      if (result.spins.length > 0) {
        // Salva a imagem lida com sucesso no histórico diário
        const saved = saveImageCapture({
          fileName: name || fileDetails?.fileName || `mesa-${getTodayDateString()}.png`,
          previewUrl: targetDataUrl,
          numbers: result.spins,
        });
        setSavedCaptures(getSavedCaptures());
        setActiveCaptureId(saved.id);
        setIsNewDay(false);

        // Aplica imediatamente ao Registro ao Vivo
        if (autoSincronizar) {
          applySpinsToLive(result.spins);
        } else {
          setMessage({
            tone: "success",
            text: `${result.spins.length} rodadas reconhecidas e salvas! Clique em 'Atualizar Registro ao Vivo' para aplicar.`,
          });
          toast.success(`${result.spins.length} rodadas reconhecidas e salvas com sucesso!`);
        }
      } else {
        setMessage({
          tone: "danger",
          text: "Nenhuma rodada identificada na captura. Tente uma imagem mais nítida.",
        });
        toast.error("Nenhuma rodada identificada na captura.");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível ler a imagem.";
      setMessage({ tone: "danger", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  async function scanImage() {
    if (!imageDataUrl) {
      toast.error("Selecione ou cole uma imagem primeiro.");
      return;
    }
    await runOcrAndSync(imageDataUrl, fileDetails?.fileName);
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
    toast.success(`${numbers.length} números importados da sequência!`);
    setMessage({
      tone: "success",
      text: `${numbers.length} números adicionados à conferência. Confira antes de registrar.`,
    });
  }

  function updateSpin(index: number, value: number) {
    const valid = Math.min(36, Math.max(0, isNaN(value) ? 0 : value));
    const nextDraft = draft.map((number, itemIndex) => (itemIndex === index ? valid : number));
    setDraft(nextDraft);
    if (autoSincronizar) {
      applySpinsToLive(nextDraft, true);
    }
  }

  function addNewSpin() {
    const nextDraft = [...draft, 0];
    setDraft(nextDraft);
    if (autoSincronizar) {
      applySpinsToLive(nextDraft, true);
    }
  }

  function invertSpinsOrder() {
    const nextDraft = [...draft].reverse();
    setDraft(nextDraft);
    toast.info("Ordem das rodadas invertida.");
    if (autoSincronizar) {
      applySpinsToLive(nextDraft, true);
    }
  }

  function removeSpin(index: number) {
    const nextDraft = draft.filter((_, itemIndex) => itemIndex !== index);
    setDraft(nextDraft);
    if (autoSincronizar && nextDraft.length > 0) {
      applySpinsToLive(nextDraft, true);
    }
  }

  function clearDraft() {
    setDraft([]);
    setMessage({ tone: "neutral", text: "Lista de conferência limpa." });
  }

  function addRecognizedSpins() {
    applySpinsToLive(draft);
  }

  // Prepara o sistema para o próximo dia de operação
  function iniciarOutroDia() {
    onClearAll?.();
    setPreview("");
    setImageDataUrl("");
    setFileDetails(null);
    setDraft([]);
    setActiveCaptureId(null);
    setIsNewDay(false);
    localStorage.setItem("roleta_ultima_data_captura", getTodayDateString());
    setMessage({
      tone: "success",
      text: "Novo dia de operação iniciado! Registro ao vivo limpo. Cole (Ctrl+V) ou selecione a imagem da mesa de hoje.",
    });
    toast.success("Novo dia iniciado! Envie a imagem da mesa de hoje.");
  }

  // Re-injeta uma captura passada no Registro ao Vivo
  function reaplicarCaptura(cap: SavedImageCapture) {
    setDraft(cap.numbers);
    if (cap.previewUrl) {
      setPreview(cap.previewUrl);
      setImageDataUrl(cap.previewUrl);
    }
    setActiveCaptureId(cap.id);
    applySpinsToLive(cap.numbers);
    toast.success(`Captura de ${cap.displayDate} reaplicada ao Registro ao Vivo!`);
  }

  // Exclui do histórico de capturas salvas
  function excluirCaptura(id: string) {
    const updated = deleteSavedCapture(id);
    setSavedCaptures(updated);
    if (activeCaptureId === id) setActiveCaptureId(null);
    toast.info("Captura removida do histórico diário.");
  }

  return (
    <div className="space-y-4 pb-8">
      {/* BANNER DE NOVO DIA DE OPERAÇÃO */}
      {isNewDay && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-950/80 p-3.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-900/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]">
              <Sunrise className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-display font-black uppercase text-amber-300 tracking-wide">
                Novo Dia de Operação Detectado
              </p>
              <p className="text-[10.5px] text-amber-200/90 font-mono mt-0.5">
                Envie a captura da mesa de hoje para salvar no histórico diário e atualizar o Registro ao Vivo.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={iniciarOutroDia}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 cursor-pointer"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Iniciar Novo Dia (Limpar Mesa)
          </Button>
        </div>
      )}

      {/* GRADE PRINCIPAL: RECEBER IMAGEM & CONFERÊNCIA */}
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* SEÇÃO 1: RECEBER IMAGEM */}
        <section className="neon-cyan-glow min-w-0 rounded-lg bg-card/60 p-3 sm:p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold text-neon-cyan">
              <ImageUp size={18} className="text-cyan-400" />
              RECEBER IMAGEM
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={iniciarOutroDia}
                className="h-6 text-[10px] px-2 font-mono border-amber-500/50 text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 cursor-pointer"
                title="Limpar giros ao vivo para iniciar novo dia de operação e repetir o processo"
              >
                <Sunrise size={11} className="mr-1" />
                Novo Dia
              </Button>
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
          Cole sua captura (<strong>Ctrl + V</strong>), clique para escolher ou arraste para a área abaixo.
        </p>

        {/* PAINEL CONFIGURAR CHAVE IA */}
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

        {/* Input invisível para seleção de arquivo */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={chooseFile}
          aria-label="Selecionar imagem das rodadas"
        />

        {/* ÁREA DE DROPZONE E PREVIEW INTERATIVA */}
        <div
          ref={dropzoneRef}
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
            "group relative mt-3 grid min-h-56 place-items-center rounded-lg border-2 border-dashed p-3 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-neon-cyan",
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
              <p className="text-xs font-bold text-cyan-300">Otimizando e preparando imagem…</p>
            </div>
          ) : preview ? (
            <div className="relative w-full">
              <img
                src={preview}
                alt="Captura selecionada"
                className="max-h-[360px] w-full rounded-md object-contain shadow-md"
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
                <ImageUp className="size-7 text-cyan-400" />
              </div>
              <p className="mt-3 text-xs sm:text-sm font-bold text-foreground">
                Clique para escolher ou arraste a imagem aqui
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Suporta cópia e cola (<kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300">Ctrl + V</kbd>), PrintScreen, JPG, PNG e WebP
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-[10px] font-medium text-cyan-300">
                <ClipboardPaste size={12} />
                Área de transferência pronta para colar
              </div>
            </div>
          )}
        </div>

        {/* DETALHES DO ARQUIVO */}
        {fileDetails && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate max-w-[260px] font-mono">{fileDetails.fileName}</span>
            <button
              type="button"
              onClick={clearImage}
              className="text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Trocar imagem
            </button>
          </div>
        )}

        {/* BOTÕES DE AÇÃO: COLAR, ESCOLHER, RECONHECER */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePasteButtonClick}
            disabled={busy || processingImage}
            className="border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 text-cyan-300"
            title="Colar imagem da área de transferência (ou aperte Ctrl+V)"
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
            {busy ? "Lendo com IA…" : "Reconhecer rodadas"}
          </Button>
        </div>

        {/* ENTRADA DE SEQUÊNCIA MANUAL POR TEXTO */}
        <div className="mt-3 border-t border-border/50 pt-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSequenceInput((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-cyan-300"
            >
              <FileText size={12} />
              {showSequenceInput ? "Ocultar colagem de números em texto" : "Ou colar sequência digitada (ex: 32, 15, 0, 26, 3)"}
            </button>
          </div>

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

        {/* MENSAGEM DE STATUS */}
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

      {/* SEÇÃO 2: CONFERÊNCIA DAS RODADAS RECONHECIDAS */}
      <section className="neon-cyan-glow flex min-w-0 flex-col rounded-lg bg-card/60 border border-cyan-500/20">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
          <div>
            <p className="font-display text-[10px] uppercase text-neon-magenta font-bold">Ordem visual</p>
            <h2 className="text-sm font-bold text-foreground">RODADAS RECONHECIDAS</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-foreground">
              {draft.length} resultados
            </span>
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS DE CONFERÊNCIA */}
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
                title="Adicionar um novo número manualmente"
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
                title="Inverter a ordem de todos os números"
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
                title="Limpar todos os números"
              >
                <RotateCcw size={13} className="mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        )}

        {/* LISTA DE NÚMEROS RECONHECIDOS */}
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
                      : "border-border bg-background/80"
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
                    aria-label={`Número da rodada ${index + 1}`}
                    type="number"
                    min={0}
                    max={36}
                    value={number}
                    className={cn("h-9 min-w-0 text-center font-display text-base font-black", numberClass(number))}
                    onChange={(event) => updateSpin(index, Number(event.target.value))}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Excluir rodada ${index + 1}`}
                    onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 size={14} />
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-border/80 px-6 text-center text-xs leading-5 text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Aguardando leitura de imagem</p>
                <p className="mt-1">
                  Cole uma captura de tela com <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-cyan-300">Ctrl+V</kbd> ou clique em "Escolher imagem" e depois em "Reconhecer rodadas".
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

        {/* RODAPÉ COM BOTÃO PARA REGISTRAR NO PAINEL */}
        <div className="border-t border-border p-3 bg-card/40 space-y-2.5">
          {/* Opção de limpar o registro de rodadas ao vivo ao atualizar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/40 border border-cyan-500/30 px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono">
              <input
                type="checkbox"
                checked={limparAoAtualizar}
                onChange={(e) => setLimparAoAtualizar(e.target.checked)}
                className="h-4 w-4 rounded border-cyan-500/60 bg-black/80 text-cyan-400 accent-[#00E5FF] focus:ring-cyan-400 cursor-pointer"
              />
              <span className="font-bold text-cyan-200">
                Limpar registro ao vivo ao atualizar
              </span>
            </label>
            <span className="text-[10px] font-mono text-white/60">
              {limparAoAtualizar
                ? "Substitui todo o histórico atual pelo resultado da imagem"
                : "Acrescenta os giros ao histórico existente"}
            </span>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 shadow-lg shadow-emerald-950/40 text-sm uppercase tracking-wider cursor-pointer"
            onClick={addRecognizedSpins}
            disabled={!draft.length || busy}
          >
            <Check className="mr-1.5 size-5" />
            {limparAoAtualizar
              ? `Limpar e Atualizar Registro ao Vivo (${draft.length} rodadas)`
              : `Adicionar ${draft.length > 0 ? `${draft.length} rodadas` : ""} ao painel`}
          </Button>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {limparAoAtualizar
                ? "Giro #1 da imagem será o último resultado ativo."
                : "Ordem cronológica mantida para análise balística."}
            </span>
            {onNavigateToLive && (
              <button
                type="button"
                onClick={onNavigateToLive}
                className="text-cyan-400 hover:text-cyan-300 underline font-mono cursor-pointer"
              >
                Abrir Roda ao Vivo
              </button>
            )}
          </div>
        </div>
      </section>
      </div>

      {/* SEÇÃO 3: HISTÓRICO DE CAPTURAS DIÁRIAS SALVAS */}
      <section
        className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden p-4 space-y-3.5 shadow-md"
        aria-label="Histórico de Capturas Diárias Salvas"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-display font-black uppercase text-foreground tracking-wide">
                  Histórico de Capturas Diárias Salvas
                </h3>
                <span className="rounded-full bg-cyan-950 border border-cyan-500/50 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  {savedCaptures.length} salva{savedCaptures.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground font-mono mt-0.5">
                Toda imagem lida com sucesso é salva automaticamente. No dia seguinte, clique em "Iniciar Novo Dia" para zerar e repetir o processo.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={iniciarOutroDia}
            className="text-xs border-amber-500/50 hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            <Sunrise className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
            Iniciar Novo Dia (Zerar Mesa)
          </Button>
        </div>

        {savedCaptures.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-muted-foreground space-y-2 bg-black/20">
            <Calendar className="mx-auto h-8 w-8 text-cyan-400/40" />
            <p className="text-xs font-mono font-medium text-foreground">
              Nenhuma captura salva no histórico ainda.
            </p>
            <p className="text-[11px] max-w-md mx-auto text-muted-foreground/80 font-mono">
              Assim que você colar (Ctrl + V) ou enviar um print da mesa com sucesso, a imagem e as rodadas serão salvas aqui automaticamente. No dia seguinte, você pode repetir o ciclo com 1 clique!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedCaptures.map((cap) => {
              const isActive = activeCaptureId === cap.id;
              return (
                <div
                  key={cap.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3 bg-black/50 transition-all",
                    isActive
                      ? "border-cyan-400/80 bg-cyan-950/20 shadow-[0_0_15px_rgba(0,255,255,0.15)] ring-1 ring-cyan-400/40"
                      : "border-border/60 hover:border-cyan-500/40"
                  )}
                >
                  <div className="space-y-2.5">
                    {/* Top line: Data e Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-cyan-200 truncate">
                          {cap.displayDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="rounded bg-black/70 border border-white/20 px-1.5 py-0.5 font-mono text-[9.5px] text-white/80">
                          {cap.numbers.length} giros
                        </span>
                        {isActive && (
                          <span className="rounded bg-emerald-950/80 border border-emerald-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 animate-pulse">
                            ATIVO NO PAINEL
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Previews: Thumbnail da imagem + Números identificados */}
                    <div className="flex gap-2.5 items-start">
                      {cap.previewUrl && (
                        <div className="h-16 w-20 shrink-0 rounded-md overflow-hidden border border-white/15 bg-black/80 flex items-center justify-center">
                          <img
                            src={cap.previewUrl}
                            alt={cap.fileName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground truncate" title={cap.fileName}>
                          {cap.fileName}
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                          {cap.numbers.slice(0, 12).map((num, i) => (
                            <span
                              key={`${cap.id}-num-${i}`}
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full font-display text-[9px] font-bold text-white shadow-xs",
                                numberClass(num)
                              )}
                            >
                              {num}
                            </span>
                          ))}
                          {cap.numbers.length > 12 && (
                            <span className="text-[9px] font-mono text-muted-foreground self-center ml-0.5">
                              +{cap.numbers.length - 12}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações da Captura Salva */}
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reaplicarCaptura(cap)}
                      className="text-[11px] h-7 border-cyan-500/40 hover:bg-cyan-950/50 text-cyan-300 cursor-pointer"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reaplicar ao Registro ao Vivo
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => excluirCaptura(cap.id)}
                      className="text-[11px] h-7 text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 cursor-pointer px-2"
                      title="Excluir captura do histórico"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}