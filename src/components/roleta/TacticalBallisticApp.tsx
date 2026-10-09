import React, { useMemo } from "react";
import type { Spin, SectorDef, Padrao } from "@/lib/roulette";
import { SETORES_PADRAO } from "@/lib/roulette";
import {
  CATALOGO_PADROES_TATICOS,
  trackAllPatterns,
  calculateConfluenceFromPatterns,
} from "@/lib/pattern-tracker-engine";
import { useSettings } from "@/hooks/useSettings";
import { GradeTaticaBalisticaView } from "./GradeTaticaBalisticaView";
import { RadarOportunidadesPanel } from "./RadarOportunidadesPanel";

interface TacticalBallisticAppProps {
  spins: Spin[];
  padroes?: Padrao[] | undefined;
  setores?: SectorDef[] | undefined;
  pressaoMinima?: number | undefined;
  onSelectNumber?: ((num: number) => void) | undefined;
  onUndo?: (() => void) | undefined;
  onClearAll?: (() => void) | undefined;
  onOpenSettings?: (() => void) | undefined;
}

export function TacticalBallisticApp({
  spins,
  padroes = CATALOGO_PADROES_TATICOS,
  setores = SETORES_PADRAO,
  pressaoMinima: pressaoMinimaProp,
  onSelectNumber,
  onUndo,
  onClearAll,
  onOpenSettings,
}: TacticalBallisticAppProps) {
  const { settings } = useSettings();
  const pressaoMinima = pressaoMinimaProp ?? settings.pressaoConfluenciaMinima ?? 75;

  // 1 & 2: Rastreamento com Janela Deslizante de 30 rodadas e Score de Confiança (0-100)
  const trackedPatterns = useMemo(() => {
    return trackAllPatterns(spins, padroes, setores);
  }, [spins, padroes, setores]);

  // 3: Cálculo de confluência ponderada com multiplicador 2x a partir dos Padrões Válidos (Score > 80)
  const confluence = useMemo(() => {
    return calculateConfluenceFromPatterns(trackedPatterns, spins, { pressaoMinima });
  }, [trackedPatterns, spins, pressaoMinima]);

  return (
    <div className="w-full min-h-screen bg-[#030712] text-white p-2 sm:p-4 font-sans">
      {/* =========================================================================
          LAYOUT DIVIDIDO DE ALTA PERFORMANCE (ITEM 4 DO PROMPT):
          - Grade Tática Balística central e à esquerda da tela
          - Radar de Oportunidades posicionado estritamente no Painel Lateral Direito
          ========================================================================= */}
      <div className="mx-auto max-w-[1720px] grid grid-cols-1 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_430px] gap-4 items-start">
        {/* ÁREA CENTRAL E ESQUERDA: GRADE TÁTICA BALÍSTICA */}
        <main className="w-full min-w-0 flex flex-col gap-4" aria-label="Área Central e Esquerda: Grade Tática">
          <GradeTaticaBalisticaView
            patterns={trackedPatterns}
            spins={spins}
            setores={setores}
            pressaoMinima={pressaoMinima}
            onSelectNumber={onSelectNumber}
            onUndo={onUndo}
            onClearAll={onClearAll}
          />
        </main>

        {/* ÁREA LATERAL DIREITA: RADAR DE OPORTUNIDADES */}
        <aside className="w-full min-w-0 sticky top-4 flex flex-col gap-4" aria-label="Painel Lateral Direito: Radar de Oportunidades">
          <RadarOportunidadesPanel
            confluence={confluence}
            onSelectNumber={onSelectNumber}
            onOpenSettings={onOpenSettings}
          />
        </aside>
      </div>
    </div>
  );
}
