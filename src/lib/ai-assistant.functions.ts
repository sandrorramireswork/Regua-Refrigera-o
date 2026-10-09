import { createServerFn } from "@tanstack/react-start";
import { generateText, isStepCount } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getSupabaseMcpTools } from "./ai-mcp.server";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(5000),
});

const askAiInputSchema = z.object({
  messages: z.array(messageSchema).min(1),
  projectContext: z
    .object({
      currentSpinsCount: z.number().optional(),
      recentSpins: z.array(z.number()).optional(),
    })
    .optional(),
});

export type ToolCallSummary = {
  toolName: string;
  argsSummary?: string | undefined;
};

export type AiAssistantResponse =
  | {
      ok: true;
      text: string;
      toolCalls: ToolCallSummary[];
      modelUsed: string;
    }
  | {
      ok: false;
      error: string;
      needsApiKey?: boolean;
    };

export const askAiAssistant = createServerFn({ method: "POST" })
  .validator((data: unknown) => askAiInputSchema.parse(data))
  .handler(async ({ data }): Promise<AiAssistantResponse> => {
    const apiKey =
      process.env["GEMINI_API_KEY"] ||
      process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
      process.env["LOVABLE_API_KEY"];

    if (!apiKey) {
      return {
        ok: false,
        needsApiKey: true,
        error:
          "Chave de API do Google Gemini não configurada. Defina 'GEMINI_API_KEY=sua_chave' no arquivo .env para habilitar as respostas do modelo.",
      };
    }

    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const model = google("gemini-2.5-flash");

      // Conectar ferramentas via MCP do Supabase
      const { tools, error: mcpError } = await getSupabaseMcpTools();

      const systemPrompt = `Você é o Assistente Especialista de Inteligência Artificial do Neon Roulette Pro.
Você analisa dados de roleta europeia (0 a 36), padrões probabilísticos (P1 a P4, Sniper, Camuflado), cálculo balístico, gestão de banca (Smart Bankroll, Kelly Criterion, Stop-Win/Stop-Loss) e histórico de giros.
Você tem acesso ao Supabase através do protocolo MCP oficial para consultar tabelas, esquemas, documentos e status do projeto 'wfwaqqpmxogzasjocdxa'.

Diretrizes:
- Responda sempre em português de forma clara, objetiva, profissional e amigável.
- Use formatação Markdown elegante com tabelas e listas quando apresentar dados ou estatísticas.
- Quando usar ferramentas do banco de dados (MCP), interprete os resultados e forneça insights analíticos práticos para o operador da mesa.
${
  data.projectContext?.recentSpins?.length
    ? `- Contexto ao vivo da mesa atual: Últimos giros registrados: [${data.projectContext.recentSpins.slice(0, 15).join(", ")}]. Total de giros na sessão: ${data.projectContext.currentSpinsCount ?? data.projectContext.recentSpins.length}.`
    : ""
}
${mcpError ? `- Aviso: A conexão direta ao MCP encontrou uma limitação (${mcpError}), portanto responda com seus conhecimentos analíticos integrados.` : ""}`;

      // Executa geração com o Vercel AI SDK
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: tools as any,
        stopWhen: isStepCount(5),
      });

      const toolCalls: ToolCallSummary[] = [];
      if (result.steps) {
        for (const step of result.steps) {
          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const tc of step.toolCalls) {
              const rawInput = (tc as any).input ?? (tc as any).args;
              toolCalls.push({
                toolName: tc.toolName,
                argsSummary: rawInput ? JSON.stringify(rawInput).slice(0, 150) : undefined,
              });
            }
          }
        }
      }

      return {
        ok: true,
        text: result.text || "Análise concluída com sucesso.",
        toolCalls,
        modelUsed: "gemini-2.5-flash",
      };
    } catch (err: unknown) {
      console.error("[AiAssistant] Erro ao processar requisição:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Ocorreu um erro interno ao processar a resposta de IA.";
      return {
        ok: false,
        error: errorMessage,
      };
    }
  });
