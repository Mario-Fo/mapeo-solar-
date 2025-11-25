import React, { useEffect, useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { API_BASE_URL } from "./config";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const COLORES = [
  "rgba(16, 185, 129, 1)",
  "rgba(59, 130, 246, 1)",
  "rgba(244, 114, 182, 1)",
  "rgba(234, 179, 8, 1)",
  "rgba(56, 189, 248, 1)",
  "rgba(249, 115, 22, 1)",
  "rgba(139, 92, 246, 1)",
  "rgba(45, 212, 191, 1)",
  "rgba(248, 113, 113, 1)",
];

export default function GraficaGeneral({ sensorIds = [1,2,3,4,5,6,7,8,9], rangoHoras }) {
  const [series, setSeries] = useState([]);

  useEffect(() => {
    async function cargar() {
      try {
        const respuestas = await Promise.all(
          sensorIds.map((id) =>
            fetch(`${API_BASE_URL}/api/series?sensorId=${id}`)
          )
        );

        const jsons = await Promise.all(respuestas.map((r) => r.json()));

        const ahoraMs = Date.now();
        const limiteMs = ahoraMs - rangoHoras * 60 * 60 * 1000;

        const datosPorSensor = sensorIds.map((id, index) => {
          const lecturas = jsons[index]
            .filter((l) => l?.ts) // evitar nulos
            .map((l) => ({
              ts: new Date(l.ts),
              lux: Number(l.lux),
            }))
            .filter((l) => !isNaN(l.ts.getTime()))
            .filter((l) => l.ts.getTime() >= limiteMs);

          return { sensorId: id, lecturas };
        });

        setSeries(datosPorSensor);
      } catch (e) {
        console.error("Error al cargar series generales", e);
      }
    }

    cargar();
  }, [sensorIds, rangoHoras]);

  // Buscar la serie con más datos
  const labels = useMemo(() => {
    const referencia = series.reduce(
      (a, b) => (b.lecturas.length > a.lecturas.length ? b : a),
      { lecturas: [] }
    );

    return referencia.lecturas.map((l) =>
      l.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }, [series]);

  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((serie, idx) => ({
        label: `Sensor ${serie.sensorId}`,
        data: serie.lecturas.map((l) => l.lux),
        borderColor: COLORES[idx % COLORES.length],
        backgroundColor: COLORES[idx % COLORES.length].replace(", 1)", ", 0.25)"),
        borderWidth: 2,
        tension: 0.3,
        pointRadius: serie.lecturas.length > 80 ? 0 : 2,
      })),
    }),
    [labels, series]
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold mb-2">Intensidad general</h3>

      {labels.length ? (
        <Line data={data} />
      ) : (
        <div className="text-xs text-slate-300">
          Sin lecturas en el rango seleccionado.
        </div>
      )}
    </div>
  );
}
