import express from "express";
import * as glide from "@glideapps/tables";

const app = express();
app.use(express.json());

// ✅ Glide Table Configuration
const iaqualinkPoolsTable = glide.table({
  token: "0214a9af-5147-4d64-a9c9-7eb72fc7f967",
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

// ✅ POST /ingest route
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

  try {
    const existingRows = await iaqualinkPoolsTable.get();

    let updated = 0;
    let added = 0;

    for (const [systemId, info] of Object.entries(data)) {
      const d = info.devices || {};
      const aux = Object.fromEntries(
        Array.from({ length: 19 }, (_, i) => [
          `aux${i + 1}Status`,
          d[`aux_${i + 1}`] || "0"
        ])
      );

      const columnValues = {
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
        lastUpdated: new Date().toISOString(),
        username: username || "",
        ...aux
      };

      const existing = existingRows.find(r => r.systemId === systemId);

      if (existing && existing.$rowID) {
        await iaqualinkPoolsTable.update(existing.$rowID, columnValues);
        updated++;
      } else {
        await iaqualinkPoolsTable.add(columnValues);
        added++;
      }
    }

    res.status(200).send({ success: true, updated, added });
  } catch (err) {
    console.error("❌ Error syncing:", err.message || err);
    res.status(500).send({ error: err.message });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
