// server.js
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ✅ CONFIG
const GLIDE_SECRET_TOKEN = "0214a9af-5147-4d64-a9c9-7eb72fc7f967";
const APP_ID = "zD98BIk5qPhXwwPS4Esr";
const TABLE_NAME = "native-table-2IJjrKBt704CS15j4s8N";
const GLIDE_API_URL = "https://api.glideapp.io/api/function/mutateTables";

// Fetch existing rows
let existingSystemIds = new Set();
const fetchExistingRows = async () => {
  try {
    const res = await axios.post(
      "https://api.glideapp.io/api/function/getTableData",
      {
        appID: APP_ID,
        tableName: TABLE_NAME,
      },
      {
        headers: {
          Authorization: `Bearer ${GLIDE_SECRET_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rows = res.data.rows || [];
    rows.forEach((row) => {
      if (row["System ID"]) {
        existingSystemIds.add(row["System ID"]);
      }
    });
  } catch (error) {
    console.error("❌ Error fetching existing rows:", error.response?.data || error.message);
  }
};

// ✅ GET route to test server & fetch existing rows
app.get("/get", async (req, res) => {
  await fetchExistingRows();
  res.status(200).send({ systemIds: Array.from(existingSystemIds) });
});

// ✅ POST route to ingest pool data
app.post("/ingest", async (req, res) => {
  let parsed = req.body;

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

  // Fetch existing before mutating
  await fetchExistingRows();

  const mutations = [];

  for (const [systemId, info] of Object.entries(data)) {
    if (existingSystemIds.has(systemId)) {
      console.log(`⚠️ Skipping existing system ID: ${systemId}`);
      continue; // Skip adding duplicates
    }

    const d = info.devices || {};
    const aux = Object.fromEntries(
      Array.from({ length: 19 }, (_, i) => [
        `Aux ${i + 1} Status`,
        d[`aux_${i + 1}`] || "0",
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
      ...aux,
    };

    mutations.push({
      kind: "add-row-to-table",
      tableName: TABLE_NAME,
      columnValues,
    });
  }

  if (!mutations.length) {
    return res.status(200).send({ message: "No new rows to add." });
  }

  try {
    const response = await axios.post(
      GLIDE_API_URL,
      {
        appID: APP_ID,
        mutations,
      },
      {
        headers: {
          Authorization: `Bearer ${GLIDE_SECRET_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).send({ success: true, added: mutations.length });
  } catch (error) {
    console.error("❌ Error posting to Glide:", error.response?.data || error.message);
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});