import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RadarPadroesFlutuante } from "@/components/radar-padroes/RadarPadroesFlutuante";
import { Activity, ArrowLeft, RotateCcw, Sparkles, Zap, Shield, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/radar-padroes")({
  head: () => ({
    meta: [
      { title: "RADAR DE PADRÕES | Analisador Estatístico de Roleta" },
      {
        name: "description",
        content:
          "Analisador estatístico de padrões de roleta em tempo real. Rastreamento contínuo de Vermelho/Preto, Par/Ímpar, Dúzias e Colunas com alertas de alta assertividade.",
      },
    ],
  }),
  component: RadarPadroesRoute,
});

function RadarPadroesRoute() {
  const [numerosSessao, setNumerosSessao] = useState<number[]>([
    26, 0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8,
  ]);

  const handleAddNumero = (num: number) => {
    setNumerosSessao((prev) => [num, ...prev]);
  };

  const handleLimpar = () => {
    setNumerosSessao([]);
  };

  return (
    <div className="min-h-screen bg-[#090214] text-white font-sans selection:bg-[#ff007f] selection:text-white relative overflow-hidden">
      {/* BACKGROUND AMBIENTE GLASSMORPHISM ROXO & ROSA NEON */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-700/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full bg-[#ff007f]/15 blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-indigo-900/30 blur-[140px]" />
      </div>

      {/* HEADER SUPERIOR DE NAVEGAÇÃO */}
      <header className="relative z-10 border-b border-[#ff007f]/20 bg-[#120524]/80 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/painel"
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-pink-200 hover:border-[#ff007f] hover:text-white transition-all shadow-[0_0_10px_rgba(255,0,127,0.2)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Painel</span>
            </Link>

            <div className="flex items-center gap-2 border-l border-purple-800/50 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff007f]/20 border border-[#ff007f] text-[#ff007f] shadow-[0_0_12px_#ff007f]">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Radar de Padrões
                </h1>
                <span className="text-[10px] text-pink-300 font-mono">
                  Analisador Estatístico de Tendências Básicas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#ff007f]/40 bg-[#ff007f]/10 px-3 py-1 text-xs font-mono font-bold text-pink-200">
              <span className="h-2 w-2 rounded-full bg-[#ff007f] animate-pulse" />
              {numerosSessao.length} Giros Registrados
            </span>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-rose-500 hover:text-white transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE TESTE E GUIA DE OPERAÇÃO */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="rounded-3xl border border-[#ff007f]/30 bg-[#16062b]/80 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(255,0,127,0.15)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase text-[#ff007f] font-mono tracking-wider">
                COMO FUNCIONA O RADAR
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Foco Absoluto em Características Básicas (Alta Assertividade)
              </h2>
              <p className="text-sm text-pink-200/80 mt-1 max-w-3xl">
                O radar ignora a busca pelo número exato e rastreia tendências contínuas de 
                <strong> Vermelho/Preto</strong>, <strong>Par/Ímpar</strong>, 
                <strong> Dúzias (1ª, 2ª, 3ª)</strong> e <strong>Colunas (1ª, 2ª, 3ª)</strong>.
                Quando um desvio estatístico atinge o limiar crítico, o alerta expande na base do grid.
              </p>
            </div>

            {/* TECLADO DE DISPARO RÁPIDO PARA TESTAR */}
            <div className="flex flex-col gap-2 shrink-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Simulador Rápido (Clique para Inserir):
              </span>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {[0, 1, 2, 4, 7, 10, 15, 19, 22, 26, 28, 32, 35].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleAddNumero(n)}
                    className="h-8 w-8 rounded-lg border border-[#ff007f]/40 bg-purple-950/80 font-mono text-xs font-bold text-white hover:bg-[#ff007f] hover:scale-110 active:scale-95 transition-all shadow-[0_0_6px_rgba(255,0,127,0.3)]"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-purple-800/40 text-xs">
            <div className="rounded-2xl border border-purple-800/40 bg-black/40 p-3">
              <span className="text-[#ff007f] font-black block">1. Gatilho de Repetição</span>
              <span className="text-slate-300 text-[11px] mt-0.5 block">
                Dispara quando uma cor ou paridade bate 4 ou mais vezes consecutivas.
              </span>
            </div>
            <div className="rounded-2xl border border-purple-800/40 bg-black/40 p-3">
              <span className="text-pink-400 font-black block">2. Gatilho de Ausência</span>
              <span className="text-slate-300 text-[11px] mt-0.5 block">
                Alerta quando uma Dúzia ou Coluna atinge 0% nos últimos 7 a 10 giros.
              </span>
            </div>
            <div className="rounded-2xl border border-purple-800/40 bg-black/40 p-3">
              <span className="text-indigo-400 font-black block">3. Gatilho Ping-Pong</span>
              <span className="text-slate-300 text-[11px] mt-0.5 block">
                Identifica alternância estrita (V/P/V/P ou P/I/P/I) para prever quebra.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* COMPONENTE PRINCIPAL FLUTUANTE ARRASTÁVEL COM FRAMER-MOTION */}
      <RadarPadroesFlutuante
        externalNumbers={numerosSessao}
        onAddNumber={handleAddNumero}
      />
    </div>
  );
}
