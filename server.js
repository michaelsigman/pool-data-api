// server.js
import express from "express";
import axios from "axios";
import * as glide from "@glideapps/tables";

const app = express();
app.use(express.json());

// ✅ CONFIG
const GLIDE_SECRET_TOKEN = "0214a9af-5147-4d64-a9c9-7eb72fc7f967";
const APP_ID = "zD98BIk5qPhXwwPS4Esr";
const TABLE_ID = "native-table-2IJjrKBt704CS15j4s8N";
const GLIDE_API_URL = "https://api.glideapp.io/api/function/mutateTables";

// Setup Glide table instance (for SDK use only, not used in HTTP logic)
const iaqualinkPoolsTable = glide.table({
  token: GLIDE_SECRET_TOKEN,
  app: APP_ID,
  table: TABLE_ID,
  columns: {
    systemId: { type: "string", name: "System ID" },
    systemName: { type: "string", name: "System Name" },
    status: { type: "string", name: "Status" },
    airTemp: { type: "string", name: "Air Temp" },
    poolTemp: { type: "string", name: "Pool Temp" },
    spaTemp: { type: "string", name: "Spa Temp" },
    poolHeaterStatus: { type: "string", name: "Pool Heater Status" },
    spaHeaterStatus: { type: "string", name: "Spa Heater Status" },
    filterPumpStatus: { type: "string", name: "Filter Pump Status" },
    spaPumpStatus: { type: "string", name: "Spa Pump Status" },
    currentPoolSetTemp: { type: "string", name: "Current Pool Set Temp" },
    currentSpaSetTemp: { type: "string", name: "Current Spa Set Temp" },
    aux1Status: { type: "string", name: "Aux 1 Status" },
    aux2Status: { type: "string", name: "Aux 2 Status" },
    aux3Status: { type: "string", name: "Aux 3 Status" },
    aux4Status: { type: "string", name: "Aux 4 Status" },
    aux5Status: { type: "string", name: "Aux 5 Status" },
    aux6Status: { type: "string", name: "Aux 6 Status" },
    aux7Status: { type: "string", name: "Aux 7 Status" },
    aux8Status: { type: "string", name: "Aux 8 Status" },
    aux9Status: { type: "string", name: "Aux 9 Status" },
    aux10Status: { type: "string", name: "Aux 10 Status" },
    aux11Status: { type: "string", name: "Aux 11 Status" },
    aux12Status: { type: "string", name: "Aux 12 Status" },
    aux13Status: { type: "string", name: "Aux 13 Status" },
    aux14Status: { type: "string", name: "Aux 14 Status" },
    aux15Status: { type: "string", name: "Aux 15 Status" },
    aux16Status: { type: "string", name: "Aux 16 Status" },
    aux17Status: { type: "string", name: "Aux 17 Status" },
    aux18Status: { type: "string", name: "Aux 18 Status" },
    aux19Status: { type: "string", name: "Aux 19 Status" },
    lastUpdated: { type: "date-time", name: "Last Updated" },
    username: { type: "string", name: "Username" }
  }
});

// 🟢 GET all rows from Glide Table
app.get("/get", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.glideapp.io/api/function/getTableData",
      {
        appID: APP_ID,
        tableName: TABLE_ID
      },
      {
        headers: {
          Authorization: `Bearer ${GLIDE_SECRET_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("❌ Error fetching existing rows:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch rows" });
  }
});

// 🔵 POST /ingest — Add new data
app.post("/ingest", async (req, res) => {
  let parsed = req.body;

  // Handle Glide's wrapper (stringified JSON in 'body')
  if (typeof parsed.body === "string") {
    try {
      parsed = JSON.parse(parsed.body);
    } catch (err) {
      return res.status(400).send({ error: "Invalid JSON in 'body'" });
    }
  }

  const { data, username } = parsed;

  if (!data || typeof data !== "object") {
    return res.status(400).send({ error: "Missing or invalid pool data" });
  }

  // Build a list of mutations
  const mutations = [];

  for (const [systemId, info] of Object.entries(data)) {
    const d = info.devices || {};
    const aux = Object.fromEntries(
      Array.from({ length: 19 }, (_, i) => [
        `Aux ${i + 1} Status`,
        d[`aux_${i + 1}`] || "0"
      ])
    );

    const columnValues = {
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

    mutations.push({
      kind: "add-row-to-table",
      tableName: TABLE_ID,
      columnValues
    });
  }

  try {
    const response = await axios.post(
      GLIDE_API_URL,
      {
        appID: APP_ID,
        mutations
      },
      {
        headers: {
          Authorization: `Bearer ${GLIDE_SECRET_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).send({ success: true, added: mutations.length });
  } catch (error) {
    console.error("❌ Error posting to Glide:", error.response?.data || error.message);
    res.status(500).send({ error: error.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});