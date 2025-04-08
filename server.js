import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ✅ CONFIG
const GLIDE_SECRET_TOKEN = "0214a9af-5147-4d64-a9c9-7eb72fc7f967";
const APP_ID = "zD98BIk5qPhXwwPS4Esr";
const TABLE_NAME = "native-table-2IJjrKBt704CS15j4s8N";
const GLIDE_API_URL = "https://api.glideapp.io/api/function/mutateTables";
const GLIDE_LIST_URL = `https://api.glideapp.io/api/function/listTables`;

// 🔄 Utility to fetch existing rows from Glide
async function getExistingRows() {
  try {
    const response = await axios.post(
      GLIDE_LIST_URL,
      {
        appID: APP_ID,
        queries: [
          {
            tableName: TABLE_NAME,
            filters: []
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${GLIDE_SECRET_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    const rows = response.data?.data?.[0]?.rows || [];
    return rows;
  } catch (err) {
    console.error("❌ Error fetching existing rows:", err.response?.data || err.message);
    return [];
  }
}

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

  const existingRows = await getExistingRows();
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

    const existingRow = existingRows.find(row => row["System ID"] === systemId);

    if (existingRow) {
      mutations.push({
        kind: "update-row",
        tableName: TABLE_NAME,
        columnValues,
        rowID: existingRow["🆔"]
      });
    } else {
      mutations.push({
        kind: "add-row-to-table",
        tableName: TABLE_NAME,
        columnValues
      });
    }
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

    res.status(200).send({ success: true, total: mutations.length });
  } catch (error) {
    console.error("❌ Error syncing to Glide:", error.response?.data || error.message);
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
