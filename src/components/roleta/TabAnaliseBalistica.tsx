import { useEffect, useRef, useState } from "react";
import { Gauge, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBallistics } from "@/hooks/useBallistics";
import { DEFAULT_BALLISTIC_CALIBRATION, type BallisticRecord } from "@/lib/ballistics";

function useStopwatch() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setValue(Date.now() - startedAt.current), 20);
    return () => window.clearInterval(timer);
  }, [running]);

  function toggle() {
    if (running) setRunning(false);
    else {
      startedAt.current = Date.now() - value;
      setRunning(true);
    }
  }

  return { value, setValue, running, toggle, reset: () => { setRunning(false); setValue(0); } };
}

export function TabAnaliseBalistica({ spinCount }: { spinCount: number }) {
  const { records, calibration, saveCalibration, addRecord, clearRecords } = useBallistics();
  const ball = useStopwatch();
  const rotor = useStopwatch();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [scatter, setScatter] = useState(12);

  function analyze() {
    if (ball.value <= 0 || rotor.value <= 0) {
      toast.error("Informe ou capture os dois deltas de tempo.");
      return;
    }
    const record = addRecord({
      round: Math.max(spinCount, records.length + 1),
      ballDeltaMs: Math.round(ball.value),
      rotorDeltaMs: Math.round(rotor.value),
      scatterMode: mode,
      manualScatter: scatter,
    });
    toast.success(`Rodada analisada: provável ${record.probableNumber}`);
    ball.reset();
    rotor.reset();
  }

  return (
    <div className="space-y-3 pb-5">
      <section className="neon-cyan-glow rounded-lg bg-card/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-display text-[10px] uppercase text-neon-magenta">Captura e projeção</p>
            <h2 className="font-display text-sm font-black uppercase text-neon-cyan">Motor Balístico</h2>
          </div>
          <span className="rounded-md border border-neon-green/60 px-2 py-1 text-[9px] font-black text-neon-green">
            {records.length} ANÁLISES
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <StopwatchControl label="Delta da bolinha" stopwatch={ball} />
          <StopwatchControl label="Delta do rotor" stopwatch={rotor} />
        </div>

        <div className="mt-3 grid gap-3 border-t border-border pt-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">
            Coeficiente bolinha
            <Input className="mt-1" type="number" min="0.01" step="0.01" value={calibration.ballCoefficient} onChange={(event) => saveCalibration({ ...calibration, ballCoefficient: Number(event.target.value) || 0.01 })} />
          </label>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">
            Coeficiente rotor
            <Input className="mt-1" type="number" min="0.01" step="0.01" value={calibration.rotorCoefficient} onChange={(event) => saveCalibration({ ...calibration, rotorCoefficient: Number(event.target.value) || 0.01 })} />
          </label>
          <label className="text-[10px] font-bold uppercase text-muted-foreground">
            Offset da zona (°)
            <Input className="mt-1 lg:w-32" type="number" step="0.1" value={calibration.targetOffsetDegrees} onChange={(event) => saveCalibration({ ...calibration, targetOffsetDegrees: Number(event.target.value) || 0 })} />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <Button size="sm" variant={mode === "auto" ? "default" : "ghost"} onClick={() => setMode("auto")}>Auto</Button>
            <Button size="sm" variant={mode === "manual" ? "default" : "ghost"} onClick={() => setMode("manual")}>Manual</Button>
          </div>
          <label className="min-w-36 flex-1 text-[10px] font-bold uppercase text-muted-foreground">
            Dispersão +{scatter} casas
            <input aria-label="Dispersão manual" className="mt-2 w-full accent-primary" type="range" min="9" max="15" value={scatter} disabled={mode === "auto"} onChange={(event) => setScatter(Number(event.target.value))} />
          </label>
          <Button onClick={analyze}><Gauge />Calcular rodada</Button>
          <Button size="icon" variant="outline" aria-label="Restaurar calibração" onClick={() => saveCalibration(DEFAULT_BALLISTIC_CALIBRATION)}><RotateCcw /></Button>
        </div>
        <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
          Impacto primário: menor valor absoluto de Zona Alvo − Ângulo Estático. No automático, a estabilidade escolhe de +9 a +15 casas.
        </p>
      </section>

      <section className="neon-cyan-glow overflow-hidden rounded-lg bg-card/60">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <p className="font-display text-[10px] uppercase text-neon-magenta">Tabela de zona</p>
            <h3 className="text-xs font-black text-foreground">ANÁLISE EM TEMPO REAL</h3>
          </div>
          <Button size="icon" variant="ghost" aria-label="Limpar análises" disabled={!records.length} onClick={clearRecords}><Trash2 /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1680px] w-full text-left text-[10px]">
            <thead className="bg-muted/70 font-display uppercase text-neon-cyan">
              <tr>{HEADERS.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2">{header}</th>)}</tr>
            </thead>
            <tbody>
              {records.map((record) => <BallisticRow key={record.id} record={record} />)}
            </tbody>
          </table>
          {!records.length && <p className="px-4 py-10 text-center text-xs text-muted-foreground">Capture os dois tempos para gerar a primeira análise.</p>}
        </div>
      </section>
    </div>
  );
}

function StopwatchControl({ label, stopwatch }: { label: string; stopwatch: ReturnType<typeof useStopwatch> }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <label className="text-[10px] font-bold uppercase text-muted-foreground">{label} (ms)</label>
      <div className="mt-1 flex gap-1.5">
        <Input aria-label={`${label} em milissegundos`} type="number" min="0" step="1" value={Math.round(stopwatch.value)} disabled={stopwatch.running} onChange={(event) => stopwatch.setValue(Math.max(0, Number(event.target.value) || 0))} className="font-display text-base font-black text-neon-gold" />
        <Button size="icon" variant={stopwatch.running ? "destructive" : "outline"} aria-label={stopwatch.running ? `Parar ${label}` : `Iniciar ${label}`} onClick={stopwatch.toggle}>{stopwatch.running ? <Square /> : <Play />}</Button>
        <Button size="icon" variant="ghost" aria-label={`Zerar ${label}`} onClick={stopwatch.reset}><RotateCcw /></Button>
      </div>
    </div>
  );
}

const HEADERS = ["Rodada", "Delta de Tempo (ms)", "Velocidade Angular", "Ângulo de Queda Calculado", "Zona Alvo (Graus)", "Ponto de Impacto Primário (Número)", "Número Provável (Após Dispersão)", "Índice de Confiança (%)", "Terminais", "Dúzia", "Coluna", "Metade", "Cor"];

function BallisticRow({ record }: { record: BallisticRecord }) {
  return (
    <tr className={`border-t border-border/60 ${record.confidence > 80 ? "bg-neon-green/10" : ""}`}>
      <Cell value={record.round} />
      <Cell value={`${record.deltaTimeMs} · B ${record.ballDeltaMs} / R ${record.rotorDeltaMs}`} />
      <Cell value={`${record.angularVelocity.toFixed(2)}°/s`} />
      <Cell value={`${record.calculatedDropAngle.toFixed(2)}°`} />
      <Cell value={`${record.targetZoneDegrees.toFixed(2)}°`} accent="cyan" />
      <Cell value={record.primaryImpactNumber} accent="gold" />
      <Cell value={`${record.probableNumber} (+${record.scatter})`} accent="green" />
      {record.confidence > 80 ? (
        <Cell value={`${record.confidence.toFixed(1)}%`} accent="green" />
      ) : (
        <Cell value={record.confidence > 0 ? `${record.confidence.toFixed(1)}%` : "Aguardando 3"} />
      )}
      <Cell value={record.terminal} />
      <Cell value={record.dozen} />
      <Cell value={record.column} />
      <Cell value={record.half} />
      <Cell value={record.color} />
    </tr>
  );
}

function Cell({ value, accent }: { value: string | number; accent?: "cyan" | "gold" | "green" }) {
  const color = accent === "cyan" ? "text-neon-cyan" : accent === "gold" ? "text-neon-gold" : accent === "green" ? "text-neon-green" : "text-foreground";
  return <td className={`whitespace-nowrap px-3 py-2 font-bold ${color}`}>{value}</td>;
}