import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ✅ CONFIG
const GLIDE_API_TOKEN = "0214a9af-5147-4d64-a9c9-7eb72fc7f967";
const APP_ID = "zD98BIk5qPhXwwPS4Esr";
const TABLE_ID = "native-table-2IJjrKBt704CS15j4s8N";
const BASE_URL = `https://api.glideapp.io/api/data/${APP_ID}/tables/${TABLE_ID}`;

// ✅ Axios instance with correct base + auth
const glide = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${GLIDE_API_TOKEN}`,
    "Content-Type": "application/json"
  }
});

// ✅ /ingest endpoint
app.post("/ingest", async (req, res) => {
  let parsed = req.body;

  // Handle Glide wrapping payload in a string
  if (typeof req.body.body === "string") {
    try {
      parsed = JSON.parse(req.body.body);
    } catch (err) {
      return res.status(400).send({ error: "Invalid JSON in 'body'" });
    }
  }

  const { data, username } = parsed;

  if (!data || typeof data !== "object") {
    return res.status(400).send({ error: "Missing or invalid pool data" });
  }

  try {
    // 🔁 Loop through all pools
    for (const [systemId, info] of Object.entries(data)) {
      const d = info.devices || {};

      // Build aux fields dynamically
      const aux = Object.fromEntries(
        Array.from({ length: 19 }, (_, i) => [
          `aux${i + 1}Status`,
          d[`aux_${i + 1}`] || "0"
        ])
      );

      const record = {
        systemId,
        systemName: info.name || "",
        status: info.status || "",
        airTemp: d.air_temp || "",
        poolTemp: d.pool_temp || "",
        spaTemp: d.spa_temp || "",
        poolHeaterStatus: d.pool_heater || "",
        spaHeaterStatus: d.spa_heater || "",
        filterPumpStatus: d.pool_pump || "",
        spaPumpStatus: d.spa_pump || "",
        currentPoolSetTemp: d.pool_set_point || "",
        currentSpaSetTemp: d.spa_set_point || "",
        lastUpdated: new Date().toLocaleDateString(),
        username: username || "",
        ...aux
      };

      // 🔍 Check if row with systemId exists
      const filterUrl = `/rows?filterBy=data.systemId=${systemId}`;
      const existingRes = await glide.get(filterUrl);
      const existing = existingRes.data?.[0];

      if (existing) {
        // ✅ Update existing row
        await glide.patch(`/rows/${existing.id}`, { data: record });
      } else {
        // ➕ Add new row
        await glide.post(`/rows`, { data: record });
      }
    }

    res.status(200).send({ success: true, message: "Pools synced to Glide!" });
  } catch (err) {
    console.error("Error syncing pool data:", err.response?.data || err.message);
    res.status(500).send({ error: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
