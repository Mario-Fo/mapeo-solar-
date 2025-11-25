import React, { useEffect, useState } from "react";
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

export default function GraficaHoras({ sensorId = 1 }) {
  const [datos, setDatos] = useState([]);
  const [rangoHoras, setRangoHoras] = useState(1);
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    try {
      setCargando(true);

      const desde = new Date(
        Date.now() - rangoHoras * 60 * 60 * 1000
      ).toISOString();

      const url = `${API_BASE_URL}/api/series?sensorId=${sensorId}&from=${encodeURIComponent(
        desde
      )}`;

      const res = await fetch(url);

      if (!res.ok) {
        setDatos([]);
        return;
      }

      const d = await res.json();
      const filtrado = d
        .filter((x) => x.ts)
        .map((x) => ({ ts: new Date(x.ts), lux: Number(x.lux) }))
        .filter((x) => !isNaN(x.ts.getTime()));

      setDatos(filtrado);
    } catch (e) {
      console.error("Error al cargar /api/series", e);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [sensorId, rangoHoras]);

  const labels = datos.map((d) =>
    d.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  const valores = datos.map((d) => d.lux);

  const muchosPuntos = datos.length > 80;

  const data = {
    labels,
    datasets: [
      {
        label: `Lux del sensor ${sensorId}`,
        data: valores,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.3)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: muchosPuntos ? 0 : 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#e5e7eb", boxWidth: 16, font: { size: 10 } },
      },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { display: false } },
      y: { ticks: { color: "#9ca3af" }, grid: { display: false } },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Sensor {sensorId}</h3>

        <select
          value={rangoHoras}
          onChange={(e) => setRangoHoras(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
        >
          <option value={1}>Última 1 h</option>
          <option value={6}>Últimas 6 h</option>
          <option value={12}>Últimas 12 h</option>
          <option value={24}>Últimas 24 h</option>
        </select>
      </div>

      {cargando ? (
        <div className="text-xs text-slate-400">Cargando datos…</div>
      ) : datos.length === 0 ? (
        <div className="text-xs text-slate-400">
          Sin lecturas en las últimas {rangoHoras} horas.
        </div>
      ) : (
        <div className="mt-1 h-40 sm:h-48">
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
}
