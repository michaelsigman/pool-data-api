import express from "express";
import dotenv from "dotenv";
import * as glide from "@glideapps/tables";

dotenv.config();
const app = express();
app.use(express.json());

// 🟩 Your Glide Table config
const iaqualinkPoolsTable = glide.table({
  token: process.env.GLIDE_API_KEY,
  app: "zD98BIk5qPhXwwPS4Esr",
  table: "native-table-2IJjrKBt704CS15j4s8N",
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
    lastUpdated: { type: "string", name: "Last Updated" },
    username: { type: "string", name: "Username" },
    // AUX fields
    ...Object.fromEntries(
      Array.from({ length: 19 }, (_, i) => [
        `aux${i + 1}Status`,
        { type: "string", name: `Aux ${i + 1} Status` }
      ])
    )
  }
});

app.post("/ingest", async (req, res) => {
  const { data, username } = req.body;
  if (!data || typeof data !== "object") {
    return res.status(400).send({ error: "Missing or invalid pool data" });
  }

  try {
    for (const [systemId, info] of Object.entries(data)) {
      const d = info.devices || {};
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

      const existing = await iaqualinkPoolsTable.findFirst({ systemId });
      if (existing) {
        await iaqualinkPoolsTable.update(existing.id, record);
      } else {
        await iaqualinkPoolsTable.add(record);
      }
    }

    res.status(200).send({ success: true, message: "Pools synced to Glide!" });
  } catch (err) {
    console.error("Error syncing pool data:", err);
    res.status(500).send({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
