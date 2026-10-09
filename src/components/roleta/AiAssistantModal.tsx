import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Send,
  X,
  Trash2,
  Loader2,
  Database,
  Minimize2,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import {
  askAiAssistant,
  type ToolCallSummary,
  type AiAssistantResponse,
} from "@/lib/ai-assistant.functions";
import { useSpins } from "@/hooks/useSpins";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallSummary[];
  timestamp: string;
  modelUsed?: string;
  error?: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Sou o seu **Assistente IA do Neon Roulette Pro** integrado ao **Supabase MCP** e alimentado pelo **Google Gemini**.\n\nPosso consultar dados de mesas, analisar padrões, verificar o status do banco e sugerir decisões analíticas de roleta. Em que posso te ajudar agora?",
  timestamp: "Agora",
};

const SUGGESTIONS = [
  "Quais são os padrões probabilísticos mais frequentes?",
  "Como está a calibração do Motor Balístico e setores?",
  "Consulte o status das tabelas do projeto no Supabase MCP",
  "Sugira uma gestão de banca com Kelly e Stop-Loss",
];

export function AiAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { spins } = useSpins();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const payloadMessages = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Extrair giros recentes da mesa para contexto
      const recentSpins = spins.slice(0, 20).map((s) => s.num);

      const response = (await askAiAssistant({
        data: {
          messages: payloadMessages,
          projectContext: {
            currentSpinsCount: spins.length,
            recentSpins,
          },
        },
      })) as AiAssistantResponse;

      if (response && response.ok) {
        const assistantMsg: ChatMessage = {
          id: String(Date.now() + 1),
          role: "assistant",
          content: response.text,
          toolCalls: response.toolCalls,
          modelUsed: response.modelUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: String(Date.now() + 1),
          role: "assistant",
          content: `⚠️ **Atenção**: ${response?.error ?? "Erro desconhecido"}`,
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `❌ **Erro de conexão**: ${err instanceof Error ? err.message : "Falha ao consultar o serviço de IA."}`,
        error: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      {/* Botão Flutuante de Abertura */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-primary/50 bg-card/90 px-4 py-2.5 text-xs font-semibold text-primary shadow-[0_0_20px_rgba(0,255,255,0.25)] backdrop-blur-md transition-all hover:scale-105 hover:border-primary hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] active:scale-95"
          aria-label="Abrir Assistente IA"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
          </span>
          <Bot className="h-4 w-4" />
          <span className="font-display tracking-wider">IA MCP ASSIST</span>
        </button>
      )}

      {/* Janela do Chat Flutuante */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden border border-primary/40 bg-card/95 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(0,255,255,0.2)] backdrop-blur-xl transition-all duration-200 ${
            isMinimized
              ? "bottom-5 right-5 h-14 w-80 rounded-2xl"
              : "bottom-4 right-4 h-[580px] max-h-[90vh] w-[95vw] max-w-md rounded-2xl sm:bottom-6 sm:right-6"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 bg-background/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                  Neon IA <span className="text-primary">• Supabase MCP</span>
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span>Gemini 2.5 Flash</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                title={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Barra de Ações Rápidas do Topo */}
              <div className="flex items-center justify-between border-b border-border/40 bg-card/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3 text-primary" />
                  <span>Projeto: wfwaqqpmxogzasjocdxa</span>
                </div>
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
                  title="Limpar histórico da conversa"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Lista de Mensagens */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-tr-sm bg-primary/20 text-foreground border border-primary/30"
                          : msg.error
                            ? "rounded-tl-sm bg-destructive/10 border border-destructive/40 text-destructive-foreground"
                            : "rounded-tl-sm bg-muted/30 border border-border/80 text-foreground"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans text-xs">
                        {msg.content}
                      </div>

                      {/* Exibição de Chamadas MCP se houver */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-border/40 pt-1.5">
                          <p className="text-[10px] font-semibold text-primary/80">
                            Ferramentas Supabase MCP utilizadas:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.toolCalls.map((tc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono text-primary border border-primary/30"
                              >
                                ⚡ {tc.toolName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="mt-1 px-1 text-[9px] text-muted-foreground/70">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Consultando Gemini e ferramentas Supabase MCP...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Sugestões Rápidas (Chips) */}
              {messages.length <= 2 && (
                <div className="border-t border-border/40 bg-background/50 px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                    Perguntas sugeridas:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(sug)}
                        className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 text-[10px] text-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-95"
                      >
                        <ChevronRight className="h-2.5 w-2.5 text-primary" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Bar */}
              <div className="border-t border-border/80 bg-background/80 p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte ao assistente da roleta..."
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
                    aria-label="Enviar"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
