/**
 * fetch-air-quality.js
 * Automated data generator for GitHub Actions & GitHub Pages
 * Fetches all Taiwan MOENV air quality stations + Open-Meteo weather
 * and outputs static data files to data/air-quality.json and data/stations.json
 */

const fs = require('fs');
const path = require('path');
const { getStationAirQuality, stationsMap, stationLookup } = require('../server.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function main() {
  console.log('📡 正在產生所有測站空品與氣象快照資料...');
  const stationDict = {};
  const siteIds = Object.keys(stationLookup);
  console.log(`總計測站數: ${siteIds.length}`);

  // Fetch in batches of 5
  for (let i = 0; i < siteIds.length; i += 5) {
    const batch = siteIds.slice(i, i + 5);
    await Promise.all(batch.map(async (id) => {
      try {
        const data = await getStationAirQuality(id);
        stationDict[id] = data;
        process.stdout.write('.');
      } catch (e) {
        console.warn(`\n⚠️ 測站 ${id} 抓取略過:`, e.message);
      }
    }));
  }
  console.log('\n✅ 測站資料擷取完成！');

  const airQualityPayload = {
    updatedAt: new Date().toISOString(),
    stations: stationDict
  };

  const stationsPayload = {
    counties: stationsMap,
    defaultStation: { id: '26', name: '沙鹿', county: '臺中市' }
  };

  fs.writeFileSync(path.join(DATA_DIR, 'air-quality.json'), JSON.stringify(airQualityPayload, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'stations.json'), JSON.stringify(stationsPayload, null, 2), 'utf8');

  console.log(`🎉 靜態數據檔案生成完成！`);
  console.log(`📁 ${path.join(DATA_DIR, 'air-quality.json')}`);
  console.log(`📁 ${path.join(DATA_DIR, 'stations.json')}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
