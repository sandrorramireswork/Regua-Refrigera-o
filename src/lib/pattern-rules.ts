import type { PatternRule } from "@/lib/roulette";

/** Converte a regra do padrão em texto editável */
export function regraParaTexto(r: PatternRule): string {
  if (r.type === "colors" || r.type === "sectors" || r.type === "numbers") {
    return r.sequence.join(", ");
  }
  return String(r.count ?? 2);
}

/** Converte o texto digitado de volta para a regra do padrão */
export function textoParaRegra(tipo: PatternRule["type"], texto: string): PatternRule {
  const partes = texto
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  switch (tipo) {
    case "colors":
      return {
        type: "colors",
        sequence: partes.map((p) => {
          const v = p.toLowerCase();
          if (v.startsWith("verd") || v === "green" || v === "g") return "green";
          if (v.startsWith("v") || v === "red" || v === "r") return "red";
          return "black";
        }),
      };
    case "sectors":
      return { type: "sectors", sequence: partes };
    case "numbers":
      return { type: "numbers", sequence: partes.map(Number).filter((n) => !Number.isNaN(n)) };
    default:
      return { type: tipo, count: Math.max(2, Number(texto) || 2) } as PatternRule;
  }
}
