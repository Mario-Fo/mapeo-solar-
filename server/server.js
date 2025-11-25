import Fastify from "fastify";
import cors from "@fastify/cors";
import pkg from "pg";
import { z } from "zod";
import { WebSocketServer } from "ws";

const { Pool } = pkg;

const DEMO_MODE = false;
const FILAS = 3;
const COLUMNAS = 3;

// =======================
// 🔥 Servidor Fastify
// =======================
const servidor = Fastify({ logger: true });

await servidor.register(cors, { origin: "*" });

// =======================
// 🔥 Conexión BD REAL
// =======================
const bd = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:1234@localhost:5432/mapeo_solar2",
});

// =======================
// 🔥 ENDPOINT HEATMAP
// =======================
servidor.get("/api/heatmap", async (_req, _reply) => {
  if (DEMO_MODE) return { grid: generarHeatmapDemo() };

  const { rows } = await bd.query(`
    SELECT s.id, s.etiqueta, s.fila, s.columna, r.lux, r.ts
    FROM sensores s
    JOIN LATERAL (
      SELECT lux, ts
      FROM lecturas
      WHERE sensor_id = s.id
      ORDER BY ts DESC
      LIMIT 1
    ) r ON TRUE
    ORDER BY s.fila, s.columna
  `);

  return { grid: rows };
});

// =======================
// 🔥 ENDPOINT SERIES POR SENSOR
// =======================
servidor.get("/api/series", async (req, _reply) => {
  const id = Number(req.query.sensorId || 1);
  if (DEMO_MODE) return generarSeriesDemo(id);

  const { sensorId, from, to } = req.query;

  const consulta = `
    SELECT ts, lux
    FROM lecturas
    WHERE sensor_id = $1
      AND ts >= COALESCE($2, '-infinity')
      AND ts <= COALESCE($3, 'infinity')
    ORDER BY ts ASC
  `;

  const { rows } = await bd.query(consulta, [sensorId, from, to]);
  return rows;
});

// =======================
// 🔥 ENDPOINT REPORTES
// =======================
servidor.get("/api/reports", async (req, _reply) => {
  const esquemaRango = z.enum(["day", "week", "month"]);
  const validado = esquemaRango.safeParse(req.query.range);
  const rango = validado.success ? validado.data : "day";

  if (DEMO_MODE) return generarReportesDemo(rango);

  const vista =
    rango === "day"
      ? "lecturas_dia"
      : rango === "week"
      ? "lecturas_semana"
      : "lecturas_mes";

  const { rows } = await bd.query(`
    SELECT periodo AS key,
           promedio AS avg,
           maximo AS max,
           minimo AS min
    FROM ${vista}
    ORDER BY periodo ASC
  `);

  return rows.map((r) => ({
    ...r,
    avg: Number(r.avg),
    max: Number(r.max),
    min: Number(r.min),
  }));
});

// =======================
// 🔥 NUEVO ENDPOINT: BATCH
//    Inserta TODAS las lecturas
//    en una sola llamada
// =======================
servidor.post("/api/lecturas-multi", async (req, reply) => {
  const { lecturas } = req.body || {};

  if (!lecturas || !Array.isArray(lecturas)) {
    return reply
      .code(400)
      .send({ ok: false, error: "Se requiere arreglo lecturas[]" });
  }

  try {
    for (const l of lecturas) {
      await bd.query(
        `INSERT INTO lecturas (sensor_id, lux, ts)
         VALUES ($1, $2, NOW())`,
        [l.sensor_id, l.lux]
      );
    }

    return { ok: true, count: lecturas.length };
  } catch (err) {
    servidor.log.error(err);
    return reply.code(500).send({ ok: false, error: "Error al insertar batch" });
  }
});

// =======================
// 🔥 WEBSOCKET (DEMO)
// =======================
const wsServidor = new WebSocketServer({ noServer: true });

servidor.server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wsServidor.handleUpgrade(req, socket, head, (ws) => {
      ws.send(
        JSON.stringify({ tipo: "hola", ts: new Date().toISOString() })
      );
    });
  }
});

// =======================
// 🔥 INICIAR SERVIDOR
// =======================
const puerto = process.env.PORT || 3000;

servidor.listen({ port: puerto, host: "0.0.0.0" }).catch((err) => {
  servidor.log.error(err);
  process.exit(1);
});
