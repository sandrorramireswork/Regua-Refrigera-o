import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function Maintenance() {
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
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <Card className="glass-panel border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)] p-2.5 sm:p-6 rounded-xl sm:rounded-2xl">
        <CardHeader className="p-2 sm:p-4 pb-2">
          <CardTitle className="font-display tracking-widest text-primary text-sm sm:text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
            GUIA DE CHAVES PARA FLANGE
          </CardTitle>
          <CardDescription className="font-mono text-xs sm:text-sm uppercase">
            Medidas exatas de chaves (boca/inglesa) para conexões de refrigeração
          </CardDescription>
        </CardHeader>
        <CardContent className="p-1 sm:p-4">
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <table className="w-full text-left font-mono">
              <thead className="bg-primary/10 border-b border-primary/20">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm tracking-widest uppercase text-cyan-400 font-tactical font-bold">Bitola</th>
                  <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm tracking-widest uppercase text-green-400 font-tactical font-bold">Macho</th>
                  <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm tracking-widest uppercase text-orange-400 font-tactical font-bold">Porca (Nut)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {flareData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-3 sm:px-4 py-3.5 text-base sm:text-lg font-black text-white">{item.size}</td>
                    <td className="px-3 sm:px-4 py-3.5 text-sm sm:text-base font-bold text-green-300 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">{item.male}</td>
                    <td className="px-3 sm:px-4 py-3.5 text-sm sm:text-base font-bold text-orange-300 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">{item.nut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3.5 sm:p-4 border border-white/5 rounded-xl bg-black/60 text-xs sm:text-sm font-mono text-muted-foreground leading-relaxed">
            <p className="mb-2">
              <strong className="text-primary font-bold">Nota Técnica:</strong> Utilizar a chave com a medida correta evita o "arredondamento" da porca de latão, garantindo o torque correto e prevenindo vazamentos de fluido refrigerante ao longo do tempo.
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
