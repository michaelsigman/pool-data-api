import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// === CONFIG ===
const GLIDE_API_TOKEN = process.env.GLIDE_API_TOKEN; // Set this in Render or .env
const APP_ID = "zD98BIk5qPhXwwPS4Esr";
const TABLE_ID = "native-table-2IJjrKBt704CS15j4s8N";
const BASE_URL = `https://api.glideapp.io/api/data/${APP_ID}/tables/${TABLE_ID}`;

// === AUTHENTICATED AXIOS INSTANCE ===
const glide = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${GLIDE_API_TOKEN}`,
    "Content-Type": "application/json"
  }
});

app.post("/ingest", async (req, res) => {
  let parsed = req.body;

  if (typeof req.body.body === "string") {
    try {
      parsed = JSON.parse(req.body.body);
    } catch (err) {
      return res.status(400).send({ error: "Invalid JSON in 'body'" });
    }
  }

  const { data, username } = parsed;
  if (!data || typeof data !== "object") {
    return res.status(400).send({ error: "Missing or invalid 'data'" });
  }

  try {
    // 1. Fetch all current rows from Glide
    const response = await glide.get("/rows");
    const allRows = response.data;

    let updated = 0;
    let added = 0;

    // 2. Loop through each pool system
    for (const [systemId, info] of Object.entries(data)) {
      const d = info.devices || {};

      const aux = Object.fromEntries(
        Array.from({ length: 19 }, (_, i) => [
          `Aux ${i + 1} Status`,
          d[`aux_${i + 1}`] || "0"
        ])
      );

      const rowData = {
        "System ID": systemId,
        "System Name": info.name || "",
        "Status": info.status || "",
        "Air Temp": d.air_temp || "",
        "Pool Temp": d.pool_temp || "",
        "Spa Temp": d.spa_temp || "",
        "Pool Heater Status": d.pool_heater || "",
        "Spa Heater Status": d.spa_heater || "",
        "Filter Pump Status": d.pool_pump || "",
        "Spa Pump Status": d.spa_pump || "",
        "Current Pool Set Temp": d.pool_set_point || "",
        "Current Spa Set Temp": d.spa_set_point || "",
        "Last Updated": new Date().toISOString(),
        "Username": username || "",
        ...aux
      };

      const existing = allRows.find(row => row["System ID"] === systemId);

      if (existing) {
        // Update existing row
        await glide.patch(`/rows/${existing.id}`, { data: rowData });
        updated++;
      } else {
        // Add new row
        await glide.post("/rows", { data: rowData });
        added++;
      }
    }

    res.status(200).send({ success: true, updated, added });
  } catch (err) {
    console.error("❌ Error syncing pool data:", err.response?.data || err.message);
    res.status(500).send({ error: err.message });
  }
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
