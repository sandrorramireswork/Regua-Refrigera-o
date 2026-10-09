import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Compass,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Zap,
  Check,
  Sparkles,
} from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useSpins } from "@/hooks/useSpins";
import { useSettings } from "@/hooks/useSettings";
import { TacticalBallisticApp } from "@/components/roleta/TacticalBallisticApp";

export const Route = createFileRoute("/grade-tatica")({
  head: () => ({
    meta: [
      { title: "Grade Tática Balística & Radar de Oportunidades | Roleta Pro" },
      {
        name: "description",
        content:
          "Aplicação web tática com dark mode para análise estatística e rastreamento de roleta: Janela Deslizante de 30 rodadas, Score de Confiança 0-100, Confluência Ponderada 2x e Radar de Oportunidades.",
      },
      { property: "og:title", content: "Grade Tática Balística & Radar de Oportunidades | Roleta Pro" },
      {
        property: "og:description",
        content:
          "Rastreamento de padrões isolados em janela deslizante de 30 giros, Score 0-100 e cálculo matemático da Dúzia e Coluna com confluência 2x.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: GradeTaticaPage,
});

function GradeTaticaPage() {
  const { setores, padroes } = useConfig();
  const { spins, addSpin, undo, clearAll } = useSpins(setores);
  const { settings, update } = useSettings();

  const [menuPressaoAberto, setMenuPressaoAberto] = useState(false);

  const pressaoAtual = settings.pressaoConfluenciaMinima ?? 75;
  const presets = [65, 70, 75, 80, 85, 90];

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO & ATALHOS TÁTICOS */}
      <header className="border-b border-cyan-500/20 bg-[#040a18]/90 px-3 sm:px-4 py-2.5 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-2">
          {/* LADO ESQUERDO: VOLTAR & TÍTULO */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/painel"
              aria-label="Voltar ao Painel Geral"
              className="flex items-center justify-center rounded-lg border border-cyan-500/40 bg-black/60 p-2 text-cyan-300 transition hover:bg-cyan-950/80 hover:text-cyan-200 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.4)] shrink-0">
                <Compass className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                  GRADE TÁTICA BALÍSTICA
                </h1>
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline truncate">
                  Janela 30 Rodadas · Score 0-100 · Confluência 2.0x
                </span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: ATALHO DE AJUSTE DE PRESSÃO + CONTROLES */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* =========================================================================
                BOTÃO AJUSTÁVEL DE PRESSÃO DE CONFLUÊNCIA NO ATALHO SUPERIOR (PROMPT ITEM 4)
                ========================================================================= */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuPressaoAberto((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[#00FF88]/60 bg-emerald-950/40 px-2.5 py-1.5 font-display text-[11px] font-black uppercase text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.25)] transition hover:bg-emerald-950 hover:border-[#00FF88] cursor-pointer"
                title="Ajustar Pressão Mínima de Confluência para Entrada Nível Expert"
                aria-expanded={menuPressaoAberto}
              >
                <Zap className="h-3.5 w-3.5 fill-current animate-pulse text-[#00FF88]" />
                <span className="hidden xs:inline">Pressão:</span>
                <span className="font-mono text-white text-xs">{pressaoAtual}%</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${menuPressaoAberto ? "rotate-180" : ""}`} />
              </button>

              {/* POPOVER DE AJUSTE RÁPIDO DA PRESSÃO */}
              {menuPressaoAberto && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuPressaoAberto(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border-2 border-[#00FF88]/70 bg-[#040e1d]/98 p-3.5 shadow-[0_0_28px_rgba(0,255,136,0.4)] backdrop-blur-xl font-display">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#00FF88]" />
                        <span className="text-[11px] font-black uppercase text-white tracking-wider">
                          PRESSÃO DE CONFLUÊNCIA
                        </span>
                      </div>
                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88] border border-[#00FF88]/40">
                        NÍVEL EXPERT
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-300 font-mono leading-relaxed mb-3">
                      Limiar mínimo de convergência para disparar o alerta estroboscópico sutil e liberar a Entrada Nível Expert.
                    </p>

                    {/* BOTÕES DE PRESET RÁPIDO */}
                    <div className="mb-3">
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1.5">
                        PRESETS RECOMENDADOS:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {presets.map((val) => {
                          const isSel = pressaoAtual === val;
                          return (
                            <button
                              key={`preset-${val}`}
                              type="button"
                              onClick={() => {
                                update({ pressaoConfluenciaMinima: val });
                              }}
                              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 font-mono text-xs font-black transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#00FF88] text-black shadow-[0_0_10px_#00FF88]"
                                  : "border border-cyan-500/30 bg-black/60 text-slate-300 hover:border-cyan-400 hover:text-white"
                              }`}
                            >
                              {val}% {isSel && <Check className="h-3 w-3 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SLIDER DE AJUSTE FINO */}
                    <div className="rounded-xl border border-white/10 bg-black/60 p-2.5 mb-3">
                      <div className="flex justify-between items-center mb-1 text-[10px] font-mono">
                        <span className="text-slate-400">Ajuste fino:</span>
                        <span className="text-base font-black text-[#00FF88]">{pressaoAtual}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={1}
                        value={pressaoAtual}
                        onChange={(e) =>
                          update({ pressaoConfluenciaMinima: Number(e.target.value) })
                        }
                        className="h-1.5 w-full accent-[#00FF88] cursor-pointer"
                        aria-label="Ajustar pressão de confluência"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 font-mono mt-1">
                        <span>50% (Mais flexível)</span>
                        <span>75% (Ideal)</span>
                        <span>95% (Ultra seletivo)</span>
                      </div>
                    </div>

                    {/* LINK PARA CONFIGURAÇÕES COMPLETAS */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
                      <span className="text-slate-400 font-mono">Persistido no storage</span>
                      <Link
                        to="/configuracoes"
                        onClick={() => setMenuPressaoAberto(false)}
                        className="text-cyan-300 hover:text-cyan-200 underline font-mono flex items-center gap-1"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Todas Configurações
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BOTÃO DESFAZER */}
            <button
              onClick={() => void undo()}
              aria-label="Desfazer último giro"
              className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-black/60 px-2.5 py-1.5 font-mono text-[11px] font-bold text-cyan-300 hover:bg-cyan-950/80 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desfazer</span>
            </button>

            {/* BOTÃO LIMPAR */}
            <button
              onClick={() => void clearAll()}
              aria-label="Limpar histórico"
              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-black/60 px-2.5 py-1.5 font-mono text-[11px] font-bold text-rose-300 hover:bg-rose-950/80 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>

            {/* BOTÃO CONFIGURAÇÕES GERAIS */}
            <Link
              to="/configuracoes"
              title="Abrir Configurações"
              className="rounded-lg border border-cyan-500/30 bg-black/60 p-2 text-cyan-300 hover:bg-cyan-950/80 hover:text-cyan-200"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Link>

            {/* LINK PAINEL */}
            <Link
              to="/painel"
              className="hidden sm:inline-flex rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 font-display text-[11px] font-black uppercase text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.3)] transition hover:bg-cyan-500/30"
            >
              Painel
            </Link>
          </div>
        </div>
      </header>

      {/* APLICAÇÃO TÁTICA BALÍSTICA & RADAR DE OPORTUNIDADES */}
      <TacticalBallisticApp
        spins={spins}
        padroes={padroes}
        setores={setores}
        pressaoMinima={pressaoAtual}
        onSelectNumber={(num) => {
          void addSpin(num);
        }}
        onUndo={() => {
          void undo();
        }}
        onClearAll={() => {
          void clearAll();
        }}
        onOpenSettings={() => setMenuPressaoAberto(true)}
      />
    </div>
  );
}
