const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// 🛠️ Replace with your real Glide values:
const GLIDE_API_KEY = "YOUR_GLIDE_API_KEY";
const GLIDE_TABLE_ID = "YOUR_GLIDE_TABLE_ID";
const GLIDE_FUNCTION_ID = "YOUR_GLIDE_FUNCTION_ID";

app.post("/ingest", async (req, res) => {
  try {
    const { data, username } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).send({ error: "Invalid or missing data" });
    }

    const auxKeys = Array.from({ length: 19 }, (_, i) => `aux_${i + 1}`);
    const poolRecords = Object.entries(data).map(([poolId, info]) => {
      const d = info.devices || {};
      const auxData = {};
      auxKeys.forEach(key => {
        auxData[`${key.replace('aux_', 'Aux ')} Status`] = d[key] || "0";
      });

      return {
        "System ID": poolId,
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
        "Last Updated": new Date().toLocaleDateString(),
        "Username": username || "",
        ...auxData
      };
    });

    for (const record of poolRecords) {
      await axios.post(
        `https://api.glideapp.io/api/function/${GLIDE_FUNCTION_ID}/tables/${GLIDE_TABLE_ID}/rows`,
        { values: record },
        { headers: { Authorization: `Bearer ${GLIDE_API_KEY}` } }
      );
    }

    res.status(200).send({ success: true, posted: poolRecords.length });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
