import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import fs from "node:fs";
import path from "node:path";

const inputSchema = z.object({
  imageDataUrl: z.string().min(50).max(15_000_000),
  apiKey: z.string().optional(),
});

const outputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    spins: {
      type: "array",
      items: { type: "integer", minimum: 0, maximum: 36 },
    },
  },
  required: ["spins"],
} as const;

function gatewayMessage(status: number, fallback: string) {
  if (status === 401) return "A leitura por imagem não está configurada corretamente (chave inválida).";
  if (status === 402) return fallback || "Os créditos de leitura terminaram. Adicione créditos para continuar.";
  if (status === 403) return fallback || "A leitura por imagem está bloqueada nas configurações do projeto.";
  if (status === 429) return "Muitas imagens foram processadas agora. Aguarde alguns instantes e tente novamente.";
  if (status >= 500) return "O serviço de leitura de IA está temporariamente indisponível. Tente novamente em instantes.";
  return fallback || "Não foi possível interpretar esta imagem.";
}

function extractGatewayError(text: string) {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? "";
  } catch {
    return "";
  }
}

function readSseOutput(text: string) {
  let output = "";
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload) as {
        type?: string;
        delta?: string;
        response?: { output_text?: string };
      };
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") output += event.delta;
      if (!output && event.type === "response.completed" && event.response?.output_text) {
        output = event.response.output_text;
      }
    } catch {
      // Eventos de manutenção do fluxo
    }
  }
  return output;
}

export const checkAiConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  let envFileKey = "";
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        envFileKey = match[1].trim();
      }
    }
  } catch {
    // fallback
  }

  const lovable = !!process.env["LOVABLE_API_KEY"];
  const candidate =
    envFileKey ||
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
    process.env["GOOGLE_API_KEY"];

  const isValidGemini = !!(
    candidate &&
    candidate.trim().length > 15 &&
    !candidate.trim().startsWith("gen-lang-client")
  );

  return {
    configured: lovable || isValidGemini,
    provider: lovable ? ("lovable" as const) : isValidGemini ? ("gemini" as const) : ("none" as const),
    maskedKey:
      isValidGemini && candidate && candidate.length > 8
        ? `${candidate.slice(0, 6)}...${candidate.slice(-4)}`
        : undefined,
    isProjectIdNotice: !!candidate?.trim().startsWith("gen-lang-client"),
  };
});

const saveKeySchema = z.object({
  apiKey: z.string().min(5).max(250),
});

export const testAiApiKey = createServerFn({ method: "POST" })
  .validator((input) => saveKeySchema.parse(input))
  .handler(async ({ data }) => {
    const key = data.apiKey.trim();
    if (key.startsWith("gen-lang-client")) {
      return {
        ok: false as const,
        error:
          "O valor informado ('gen-lang-client...') é o nome de um projeto do Google Cloud, não uma chave de API. As chaves do Google Gemini começam com 'AIzaSy' e possuem 39 caracteres.",
      };
    }
    if (key.length < 25) {
      return {
        ok: false as const,
        error: "Chave muito curta. As chaves da API Gemini possuem cerca de 39 caracteres (ex: AIzaSy...).",
      };
    }

    try {
      const google = createGoogleGenerativeAI({ apiKey: key });
      const model = google("gemini-3.8-flash");
      const test = await generateText({
        model,
        messages: [{ role: "user", content: "Diga apenas: OK" }],
      });
      if (test.text) {
        return { ok: true as const, message: "Chave Gemini validada com sucesso junto à API do Google!" };
      }
      return { ok: false as const, error: "A API do Google não retornou resposta com esta chave." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("API_KEY_INVALID")) {
        return {
          ok: false as const,
          error:
            "Chave inválida segundo o Google. Gere uma chave gratuita em: https://aistudio.google.com/app/apikey",
        };
      }
      return {
        ok: false as const,
        error: `Erro ao validar chave: ${msg}`,
      };
    }
  });

export const saveAiApiKey = createServerFn({ method: "POST" })
  .validator((input) => saveKeySchema.parse(input))
  .handler(async ({ data }) => {
    const key = data.apiKey.trim();
    if (!key) return { ok: false as const, error: "Chave inválida." };

    if (key.startsWith("gen-lang-client")) {
      return {
        ok: false as const,
        error:
          "O valor informado ('gen-lang-client...') é o identificador de um projeto, não a chave de API. Obtenha uma chave que começa com 'AIzaSy' em: https://aistudio.google.com/app/apikey",
      };
    }

    try {
      process.env["GEMINI_API_KEY"] = key;

      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }

      if (envContent.includes("GEMINI_API_KEY=")) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/g, `GEMINI_API_KEY="${key}"$1`);
      } else {
        envContent = `${envContent.trimEnd()}\nGEMINI_API_KEY="${key}"\n`;
      }

      fs.writeFileSync(envPath, envContent, "utf8");
      return { ok: true as const, provider: "gemini" as const };
    } catch (err) {
      console.error("[saveAiApiKey] Erro ao gravar chave:", err);
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro ao salvar chave no arquivo .env.",
      };
    }
  });

export const readRouletteImage = createServerFn({ method: "POST" })
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(data.imageDataUrl)) {
      return { ok: false as const, error: "Formato de imagem inválido. Use JPG, PNG ou WebP." };
    }

    // Se o cliente forneceu apiKey diretamente na requisição, registra na sessão do processo
    if (data.apiKey) {
      process.env["GEMINI_API_KEY"] = data.apiKey;
    }

    let envFileKey = "";
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match && match[1]) {
          envFileKey = match[1].trim();
        }
      }
    } catch {}

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const rawGemini =
      data.apiKey ||
      envFileKey ||
      process.env["GEMINI_API_KEY"] ||
      process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
      process.env["GOOGLE_API_KEY"];

    const isProjectId = !!rawGemini && rawGemini.trim().startsWith("gen-lang-client");
    const geminiKey =
      rawGemini && rawGemini.trim().length > 15 && !isProjectId
        ? rawGemini.trim()
        : undefined;

    if (isProjectId && !lovableKey) {
      return {
        ok: false as const,
        needsApiKey: true,
        error:
          "O valor configurado ('gen-lang-client...') é um ID de projeto do Google Cloud, não uma chave de API. A chave do Gemini começa com 'AIzaSy' e possui 39 caracteres. Obtenha sua chave gratuita em https://aistudio.google.com/app/apikey.",
      };
    }

    // 1. Caso Lovable API Key esteja configurada
    if (lovableKey) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": lovableKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            reasoning: { effort: "low", summary: "concise" },
            input: [{
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Return JSON only. Read every completed European roulette result visible in this screenshot, without omitting any visible result, and only accept integers from 0 through 36. Ordering rule: Start at Line 1 (the topmost row of results). The first number on the leftmost side of Line 1 is the latest completed round (the most recent spin). Read Line 1 strictly from left to right. Then move to Line 2 and read it strictly from left to right. Continue row by row downwards (Line 3, Line 4...), always reading from left to right until all visible completed results are captured. The spins array must start with the most recent spin (Line 1 leftmost) and end with the oldest visible spin (bottom row rightmost). Preserve every duplicate result. Ignore percentages, bets, labels, statistics, wheel decorations, menus, clocks, balances and any number that is not a completed roulette result. Format: {\"spins\": [num1, num2, ...]}",
                },
                { type: "input_image", image_url: data.imageDataUrl },
              ],
            }],
            text: {
              format: {
                type: "json_schema",
                name: "roulette_spins",
                strict: true,
                schema: outputSchema,
              },
            },
          }),
        });

        const responseText = await response.text();
        if (response.ok) {
          const output = readSseOutput(responseText);
          const parsed = z.object({ spins: z.array(z.number().int().min(0).max(36)) }).parse(JSON.parse(output));
          if (parsed.spins.length) {
            return { ok: true as const, spins: parsed.spins };
          }
        } else if (!geminiKey) {
          return { ok: false as const, error: gatewayMessage(response.status, extractGatewayError(responseText)) };
        }
      } catch (err) {
        if (!geminiKey) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : "Erro ao consultar o serviço de leitura por imagem.",
          };
        }
      }
    }

    // 2. Caso Gemini API Key esteja configurada
    if (geminiKey) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: geminiKey });
        const model = google("gemini-3.8-flash");

        const prompt = `Você é um leitor óptico especialista em extração de histórico de resultados de roleta europeia (números 0 a 36).
Analise a captura de tela fornecida e extraia TODOS os números dos resultados finalizados da roleta visíveis na tela.

REGRAS ESTRITAS DE ORDENAÇÃO:
- A leitura segue a ordem das linhas de resultados da roleta:
  1. Comece na LINHA 1 (linha superior do histórico), lendo da ESQUERDA para a DIREITA. O primeiro número no canto esquerdo da Linha 1 é a ÚLTIMA RODADA (a mais recente que acabou de ser sorteada).
  2. Em seguida, leia a LINHA 2 (linha imediatamente abaixo), lendo da ESQUERDA para a DIREITA (rodadas anteriores).
  3. Em seguida, leia a LINHA 3 e as linhas seguintes sucessivamente, sempre da ESQUERDA para a DIREITA, até o final do histórico visível.
- A lista de resultados 'spins' DEVE começar pela ÚLTIMA RODADA (Linha 1, primeiro à esquerda) e terminar no resultado mais antigo (última linha, mais à direita).
- Não omita repetições. Apenas números inteiros de 0 a 36 que sejam resultados reais de giros da roleta.
- Ignore saldos, porcentagens, relógios, valores de apostas, fichas e botões.
- Retorne EXCLUSIVAMENTE um objeto JSON no formato: {"spins": [numero1, numero2, ...]}`;

        const result = await generateText({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image", image: data.imageDataUrl },
              ],
            },
          ],
        });

        const cleanJson = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { spins?: number[] };
          if (Array.isArray(parsed.spins) && parsed.spins.length > 0) {
            const validSpins = parsed.spins
              .map((n) => Number(n))
              .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);
            if (validSpins.length > 0) {
              return { ok: true as const, spins: validSpins };
            }
          }
        }
        return { ok: false as const, error: "Nenhum resultado de roleta foi identificado na imagem. Tente uma captura mais nítida." };
      } catch (err: unknown) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Erro ao processar imagem com o modelo de visão.",
        };
      }
    }

    return {
      ok: false as const,
      needsApiKey: true,
      error:
        "Chave de IA não encontrada. Insira sua chave Gemini no campo abaixo ou adicione GEMINI_API_KEY no arquivo .env para habilitar a leitura automática.",
    };
  });