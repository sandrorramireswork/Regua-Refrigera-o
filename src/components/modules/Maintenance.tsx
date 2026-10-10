import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function Maintenance() {
  const { viewMode } = useAppContext();

  const flareData = [
    { size: '1/4"', male: '14mm', nut: '17mm' },
    { size: '5/16" (R410A)', male: '17mm', nut: '19mm' },
    { size: '3/8"', male: '17mm', nut: '22mm' },
    { size: '1/2"', male: '20mm', nut: '24mm' },
    { size: '5/8"', male: '22mm', nut: '27mm' },
    { size: '3/4"', male: '27mm', nut: '32mm (ou 29mm)' },
    { size: '7/8"', male: '32mm', nut: '36mm' },
    { size: '1"', male: '36mm', nut: '41mm' },
    { size: '1 1/8"', male: '41mm', nut: '46mm' },
  ];

  return (
    <div className={`grid gap-6 ${viewMode === 'mobile' ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
      <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
        <CardHeader>
          <CardTitle className="font-display tracking-widest text-primary text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            GUIA DE CHAVES PARA FLANGE
          </CardTitle>
          <CardDescription className="font-mono text-xs uppercase">
            Medidas exatas de chaves (boca/inglesa) para conexões de refrigeração
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden">
            <table className="w-full text-left font-mono">
              <thead className="bg-primary/10 border-b border-primary/20">
                <tr>
                  <th className="px-4 py-3 text-xs tracking-widest uppercase text-cyan-400 font-tactical">Bitola</th>
                  <th className="px-4 py-3 text-xs tracking-widest uppercase text-green-400 font-tactical">Macho (União)</th>
                  <th className="px-4 py-3 text-xs tracking-widest uppercase text-orange-400 font-tactical">Fêmea (Porca/Nut)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {flareData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-base font-bold text-white">{item.size}</td>
                    <td className="px-4 py-4 text-sm text-green-300 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">{item.male}</td>
                    <td className="px-4 py-4 text-sm text-orange-300 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">{item.nut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 border border-white/5 rounded-lg bg-black/60 text-xs font-mono text-muted-foreground">
            <p className="mb-2">
              <strong className="text-primary">Nota Técnica:</strong> Utilizar a chave com a medida correta evita o "arredondamento" da porca de latão, garantindo o torque correto e prevenindo vazamentos de fluido refrigerante ao longo do tempo.
            </p>
            <p>
              Recomenda-se sempre utilizar duas chaves (uma para segurar a base e outra para apertar a porca) utilizando a técnica de contra-aperto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
