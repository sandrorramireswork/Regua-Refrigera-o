import { createMCPClient } from "@ai-sdk/mcp";
import { createToolSchemas } from "@supabase/mcp-server-supabase";

export const DEFAULT_SUPABASE_MCP_URL =
  process.env["SUPABASE_MCP_URL"] ||
  "https://mcp.supabase.com/mcp?project_ref=wfwaqqpmxogzasjocdxa&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching";

/**
 * Inicializa o cliente MCP e retorna os schemas estáticos de ferramentas do Supabase.
 */
export async function getSupabaseMcpTools(customUrl?: string) {
  const url = customUrl || DEFAULT_SUPABASE_MCP_URL;
  try {
    const mcpClient = await createMCPClient({
      transport: {
        type: "http",
        url,
      },
    });

    const tools = await mcpClient.tools({
      schemas: createToolSchemas(),
    });

    return { mcpClient, tools, error: null };
  } catch (err) {
    console.error("[MCP] Erro ao conectar com o Supabase MCP:", err);
    return {
      mcpClient: null,
      tools: undefined,
      error: err instanceof Error ? err.message : "Erro desconhecido ao conectar ao MCP Supabase",
    };
  }
}
