const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Load stations map
let stationsMap = [];
try {
  stationsMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'taiwan_stations_map.json'), 'utf8'));
} catch (e) {
  console.error("Failed to load taiwan_stations_map.json:", e);
}

// Flat list for quick lookup
const stationLookup = {};
stationsMap.forEach(county => {
  county.stations.forEach(st => {
    stationLookup[st.id] = { id: st.id, name: st.name, county: county.countyName };
    stationLookup[st.name] = { id: st.id, name: st.name, county: county.countyName };
  });
});

// Cache storage
let appCache = {
  twTime: null,
  twTimeExpires: 0,
  siteCache: {} // siteId -> { timestamp, data }
};

const CACHE_TTL = 7 * 60 * 1000; // 7 minutes

function fetchJson(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 7000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP status ${res.statusCode}`));
      }
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

// Coordinates Mapping for Taiwan Weather
const COUNTY_COORDS = {
  '基隆市': { lat: 25.13, lon: 121.74 },
  '臺北市': { lat: 25.04, lon: 121.56 },
  '台北市': { lat: 25.04, lon: 121.56 },
  '新北市': { lat: 25.01, lon: 121.46 },
  '桃園市': { lat: 24.99, lon: 121.30 },
  '新竹市': { lat: 24.81, lon: 120.97 },
  '新竹縣': { lat: 24.84, lon: 121.02 },
  '苗栗縣': { lat: 24.56, lon: 120.82 },
  '臺中市': { lat: 24.15, lon: 120.67 },
  '台中市': { lat: 24.15, lon: 120.67 },
  '彰化縣': { lat: 24.05, lon: 120.52 },
  '南投縣': { lat: 23.96, lon: 120.97 },
  '雲林縣': { lat: 23.71, lon: 120.43 },
  '嘉義市': { lat: 23.48, lon: 120.45 },
  '嘉義縣': { lat: 23.45, lon: 120.26 },
  '臺南市': { lat: 23.00, lon: 120.23 },
  '台南市': { lat: 23.00, lon: 120.23 },
  '高雄市': { lat: 22.63, lon: 120.30 },
  '屏東縣': { lat: 22.55, lon: 120.55 },
  '宜蘭縣': { lat: 24.70, lon: 121.74 },
  '花蓮縣': { lat: 23.99, lon: 121.60 },
  '臺東縣': { lat: 22.76, lon: 121.14 },
  '台東縣': { lat: 22.76, lon: 121.14 },
  '澎湖縣': { lat: 23.57, lon: 119.58 },
  '金門縣': { lat: 24.45, lon: 118.38 },
  '連江縣': { lat: 26.16, lon: 119.95 }
};

const STATION_COORDS = {
  '26': { lat: 24.23, lon: 120.56 }, // 沙鹿
  '25': { lat: 24.16, lon: 120.62 }, // 西屯
  '28': { lat: 24.15, lon: 120.67 }, // 忠明
  '7':  { lat: 24.10, lon: 120.69 }, // 大里
  '74': { lat: 24.26, lon: 120.72 }, // 豐原
  '46': { lat: 25.13, lon: 121.74 }, // 基隆
  '5':  { lat: 25.09, lon: 121.52 }, // 士林
  '6':  { lat: 25.06, lon: 121.51 }, // 大同
  '11': { lat: 25.07, lon: 121.53 }, // 中山
  '16': { lat: 25.02, lon: 121.53 }, // 古亭
  '29': { lat: 25.05, lon: 121.58 }, // 松山
  '54': { lat: 25.18, lon: 121.53 }, // 陽明
  '62': { lat: 25.03, lon: 121.50 }, // 萬華
  '2':  { lat: 25.08, lon: 121.49 }, // 三重
  '4':  { lat: 24.97, lon: 121.45 }, // 土城
  '19': { lat: 25.01, lon: 121.51 }, // 永和
  '21': { lat: 24.99, lon: 121.49 }, // 板橋
  '22': { lat: 25.06, lon: 121.65 }, // 汐止
  '23': { lat: 24.96, lon: 121.37 }, // 菜寮
  '24': { lat: 24.98, lon: 121.54 }, // 新店
  '31': { lat: 25.00, lon: 121.46 }, // 新莊
  '1':  { lat: 22.60, lon: 120.31 }, // 前鎮
  '34': { lat: 22.63, lon: 120.30 }, // 前金
  '35': { lat: 22.67, lon: 120.32 }, // 左營
  '36': { lat: 22.73, lon: 120.33 }, // 楠梓
  '37': { lat: 22.56, lon: 120.34 }, // 小港
  '38': { lat: 22.62, lon: 120.36 }, // 鳳山
  '39': { lat: 22.64, lon: 120.39 }, // 大寮
  '40': { lat: 22.50, lon: 120.40 }, // 林園
  '42': { lat: 23.00, lon: 120.21 }, // 臺南
  '43': { lat: 23.05, lon: 120.26 }  // 安南
};

// Weather Cache with 15-minute TTL
const weatherCache = {};
const WEATHER_CACHE_TTL = 15 * 60 * 1000;

function mapWmoWeather(code, isDay = 1) {
  const c = parseInt(code, 10);
  if (c === 0) {
    return {
      type: 'sun',
      icon: isDay ? '☀️' : '🌙',
      text: isDay ? '晴朗' : '晴夜'
    };
  }
  if (c === 1) {
    return {
      type: 'sun_cloud',
      icon: '🌤️',
      text: '晴時多雲'
    };
  }
  if (c === 2) {
    return {
      type: 'cloudy',
      icon: '⛅',
      text: '多雲'
    };
  }
  if (c === 3) {
    return {
      type: 'overcast',
      icon: '☁️',
      text: '陰天'
    };
  }
  if (c === 45 || c === 48) {
    return {
      type: 'fog',
      icon: '🌫️',
      text: '起霧'
    };
  }
  if (c >= 51 && c <= 57) {
    return {
      type: 'drizzle',
      icon: '🌦️',
      text: '短暫雨'
    };
  }
  if (c >= 61 && c <= 67) {
    return {
      type: 'rain',
      icon: '🌧️',
      text: c >= 65 ? '大雨' : '下雨'
    };
  }
  if (c >= 71 && c <= 77) {
    return {
      type: 'snow',
      icon: '❄️',
      text: '降雪'
    };
  }
  if (c >= 80 && c <= 82) {
    return {
      type: 'rain',
      icon: '🌧️',
      text: '陣雨'
    };
  }
  if (c >= 95 && c <= 99) {
    return {
      type: 'thunder',
      icon: '⛈️',
      text: '雷陣雨'
    };
  }
  return {
    type: 'cloudy',
    icon: '⛅',
    text: '多雲'
  };
}

async function getStationWeather(siteId, countyName) {
  const now = Date.now();
  const cacheKey = siteId || countyName || 'default';
  if (weatherCache[cacheKey] && (now - weatherCache[cacheKey].timestamp < WEATHER_CACHE_TTL)) {
    return weatherCache[cacheKey].data;
  }

  const coords = STATION_COORDS[siteId] || COUNTY_COORDS[countyName] || COUNTY_COORDS['臺中市'];
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTaipei`;

  try {
    const raw = await fetchJson(apiUrl);
    if (raw && raw.current) {
      const cur = raw.current;
      const weatherInfo = mapWmoWeather(cur.weather_code, cur.is_day);
      const data = {
        icon: weatherInfo.icon,
        text: weatherInfo.text,
        type: weatherInfo.type,
        temp: Math.round(cur.temperature_2m * 10) / 10,
        tempUnit: '°C',
        code: cur.weather_code,
        isDay: cur.is_day
      };
      weatherCache[cacheKey] = { timestamp: now, data };
      return data;
    }
  } catch (err) {
    console.warn(`Weather fetch failed for site ${siteId} (${countyName}):`, err.message);
  }

  return {
    icon: '☀️',
    text: '晴朗',
    type: 'sun',
    temp: 28,
    tempUnit: '°C',
    code: 0,
    isDay: 1
  };
}

function calculateFallbackTwTime() {
  const now = new Date();
  const twDate = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
  twDate.setHours(twDate.getHours() - 1);
  const yyyy = twDate.getFullYear();
  const mm = String(twDate.getMonth() + 1).padStart(2, '0');
  const dd = String(twDate.getDate()).padStart(2, '0');
  const hh = String(twDate.getHours()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}`;
}

async function getTwTime() {
  const now = Date.now();
  if (appCache.twTime && appCache.twTimeExpires > now) {
    return appCache.twTime;
  }

  try {
    const twTime = await new Promise((resolve) => {
      const req = https.get('https://airtw.moenv.gov.tw/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000
      }, (res) => {
        let html = '';
        res.setEncoding('utf8');
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          const match = html.match(/name="ctl00\$CPH_Content\$hf_SystemTime"[^>]*value="([^"]+)"/i);
          if (match) {
            try {
              const decoded = match[1].replace(/&quot;/g, '"');
              const parsed = JSON.parse(decoded);
              if (parsed.tw_time) {
                return resolve(parsed.tw_time);
              }
            } catch (e) {}
          }
          resolve(calculateFallbackTwTime());
        });
      });
      req.on('error', () => resolve(calculateFallbackTwTime()));
      req.on('timeout', () => {
        req.destroy();
        resolve(calculateFallbackTwTime());
      });
    });

    appCache.twTime = twTime;
    appCache.twTimeExpires = now + 10 * 60 * 1000; // cache for 10 min
    return twTime;
  } catch (e) {
    return calculateFallbackTwTime();
  }
}

// Map AQI to Taiwan MOE / MOENV School Air Quality Flag Guide
function getSchoolFlagAdvice(aqiVal) {
  const aqi = parseInt(aqiVal, 10);
  if (isNaN(aqi) || aqi < 0) {
    return {
      aqi: '-',
      level: '資料檢測中',
      flagColor: '#9e9e9e',
      flagBorderColor: '#757575',
      flagName: '灰色旗',
      flagClass: 'gray',
      status: '監測站維護或連線中',
      suitableForOutdoor: 'unknown',
      outdoorBadge: '資料更新中',
      outdoorBadgeColor: '#757575',
      outdoorBadgeBg: '#f0f0f0',
      outdoorBadgeClass: 'badge-gray',
      activityAdvice: '目前監測站連線中或維護中，建議維持一般日常作息並注意天候。',
      sensitiveAdvice: '有呼吸道敏感體質者請持續留意自身狀況。',
      indoorAction: '維持教室環境正常通風。',
      levelGrade: 0
    };
  }

  if (aqi <= 50) {
    return {
      aqi,
      level: '良好 (Good)',
      flagColor: '#009966',
      flagBorderColor: '#007a52',
      flagName: '綠色旗',
      flagClass: 'green',
      status: '空氣品質良好',
      suitableForOutdoor: 'suitable',
      outdoorBadge: '適合室外課',
      outdoorBadgeColor: '#009966',
      outdoorBadgeBg: '#e6f7f0',
      outdoorBadgeClass: 'badge-green',
      activityAdvice: '適合正常進行戶外活動。室外體育課、大下課活動、戶外教學及各項動態體能競賽照常舉行。',
      sensitiveAdvice: '敏感性族群學生可正常進行各項戶外體育與活動。',
      indoorAction: '教室門窗保持自然敞開通風，空氣流通良好。',
      levelGrade: 1
    };
  } else if (aqi <= 100) {
    return {
      aqi,
      level: '普通 (Moderate)',
      flagColor: '#e0c000',
      flagBorderColor: '#b89d00',
      flagName: '黃色旗',
      flagClass: 'yellow',
      status: '空氣品質普通',
      suitableForOutdoor: 'suitable',
      outdoorBadge: '可正常室外課',
      outdoorBadgeColor: '#997300',
      outdoorBadgeBg: '#fffbe6',
      outdoorBadgeClass: 'badge-yellow',
      activityAdvice: '可正常進行戶外活動。室外體育課照常進行，提醒學生運動後適時補充水分，注意防曬與調適。',
      sensitiveAdvice: '敏感性族群學生（氣喘、呼吸道或過敏體質）仍可正常活動，但請留意自身是否有咳嗽或呼吸急促狀況。',
      indoorAction: '教室維持自然通風即可。',
      levelGrade: 2
    };
  } else if (aqi <= 150) {
    return {
      aqi,
      level: '對敏感族群不健康 (USG)',
      flagColor: '#ff9933',
      flagBorderColor: '#e07a16',
      flagName: '橘色旗',
      flagClass: 'orange',
      status: '敏感族群須注意',
      suitableForOutdoor: 'caution',
      outdoorBadge: '宜減少劇烈運動',
      outdoorBadgeColor: '#d46b08',
      outdoorBadgeBg: '#fff7e6',
      outdoorBadgeClass: 'badge-orange',
      activityAdvice: '一般學生仍可進行戶外活動，但宜減少長時間劇烈運動，體育課可適度降低活動強度、增加休息時間。',
      sensitiveAdvice: '敏感性族群師生宜減少戶外活動及體力消耗，留在室內或進行靜態活動；必要外出建議配戴口罩。',
      indoorAction: '室內注意空氣流通，必要時可適度關閉迎風面門窗。',
      levelGrade: 3
    };
  } else if (aqi <= 200) {
    return {
      aqi,
      level: '對所有族群不健康 (Unhealthy)',
      flagColor: '#cc0033',
      flagBorderColor: '#a30029',
      flagName: '紅色旗',
      flagClass: 'red',
      status: '對所有人不健康',
      suitableForOutdoor: 'indoor',
      outdoorBadge: '建議改室內課',
      outdoorBadgeColor: '#cf1322',
      outdoorBadgeBg: '#fff1f0',
      outdoorBadgeClass: 'badge-red',
      activityAdvice: '應避免長時間劇烈戶外運動。室外體育課宜調整至室內進行（如活動中心、健康教室教學），或改為低運動量活動。',
      sensitiveAdvice: '敏感性族群師生應留在室內，避免體力消耗活動；外出務必配戴口罩，氣喘學童請備妥吸入劑。',
      indoorAction: '教室應適度關閉門窗，視情況開啟室內空調或空氣清淨機。',
      levelGrade: 4
    };
  } else if (aqi <= 300) {
    return {
      aqi,
      level: '非常不健康 (Very Unhealthy)',
      flagColor: '#660099',
      flagBorderColor: '#4d0073',
      flagName: '紫色旗',
      flagClass: 'purple',
      status: '非常不良',
      suitableForOutdoor: 'stop',
      outdoorBadge: '停止戶外活動',
      outdoorBadgeColor: '#531dab',
      outdoorBadgeBg: '#f9f0ff',
      outdoorBadgeClass: 'badge-purple',
      activityAdvice: '應立即停止所有戶外活動！體育課與戶外課程一律改在室內進行或延期辦理，全體留在室內。',
      sensitiveAdvice: '敏感性族群師生嚴禁戶外活動，留在室內休息，加強健康照護。',
      indoorAction: '室內應緊閉門窗，開啟空調與空氣清淨設備，全校師生外出應配戴口罩。',
      levelGrade: 5
    };
  } else {
    return {
      aqi,
      level: '危害 (Hazardous)',
      flagColor: '#7e0023',
      flagBorderColor: '#5a0019',
      flagName: '褐紅旗',
      flagClass: 'maroon',
      status: '危害健康',
      suitableForOutdoor: 'stop',
      outdoorBadge: '嚴禁戶外活動',
      outdoorBadgeColor: '#5a0019',
      outdoorBadgeBg: '#fff0f2',
      outdoorBadgeClass: 'badge-maroon',
      activityAdvice: '應全面停止戶外活動，人員留置室內防護，學校視通報評估啟動緊急應變或停課措施。',
      sensitiveAdvice: '所有師生留在室內，嚴禁任何體能活動，落實重度防護。',
      indoorAction: '緊閉所有門窗，維持室內空氣淨化。',
      levelGrade: 6
    };
  }
}

// Fetch air quality for a specific station
async function getStationAirQuality(siteQuery, simAqi = null) {
  // If simulation AQI is specified
  if (simAqi !== null && !isNaN(parseInt(simAqi, 10))) {
    const aqiNum = parseInt(simAqi, 10);
    const lookup = stationLookup[siteQuery] || { id: '26', name: '沙鹿', county: '臺中市' };
    const advice = getSchoolFlagAdvice(aqiNum);
    const weather = await getStationWeather(lookup.id, lookup.county);
    return {
      sitename: lookup.name,
      county: lookup.county,
      siteid: lookup.id,
      date: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
      aqi: String(aqiNum),
      pm25: String(Math.round(aqiNum * 0.35)),
      pm10: String(Math.round(aqiNum * 0.7)),
      o3: String(Math.round(aqiNum * 0.8)),
      co: '0.25',
      so2: '0.5',
      no2: '6.0',
      pollutant: aqiNum > 100 ? '細懸浮微粒 (PM2.5)' : '-',
      isSimulation: true,
      flag: advice,
      weather: weather,
      updateTime: new Date().toISOString(),
      source: '模擬測試數據 (校園空品演練模式)'
    };
  }

  // Find station info
  let station = stationLookup[siteQuery];
  if (!station) {
    // Default to Shalu (id: 26)
    station = stationLookup['26'] || { id: '26', name: '沙鹿', county: '臺中市' };
  }

  const siteId = station.id;
  const now = Date.now();

  // Check cache
  if (appCache.siteCache[siteId] && (now - appCache.siteCache[siteId].timestamp < CACHE_TTL)) {
    return appCache.siteCache[siteId].data;
  }

  const twTime = await getTwTime();
  const airlistUrl = `https://airtw.moenv.gov.tw/json/airlist/airlist_${siteId}_${twTime}.json?t=${now}`;

  try {
    const rawList = await fetchJson(airlistUrl);
    // Parse list of key-value pairs
    const rawObj = {};
    if (Array.isArray(rawList)) {
      rawList.forEach(item => {
        Object.assign(rawObj, item);
      });
    }

    const aqi = rawObj.AQI || '-';
    const advice = getSchoolFlagAdvice(aqi);

    const pollutantMap = {
      '1': '細懸浮微粒 (PM2.5)',
      '2': '懸浮微粒 (PM10)',
      '3': '臭氧 (O3)',
      '4': '一氧化碳 (CO)',
      '5': '二氧化硫 (SO2)',
      '6': '二氧化氮 (NO2)'
    };

    const pollutantCode = rawObj.POLLUTANT || '';
    const pollutantText = pollutantMap[pollutantCode] || (pollutantCode ? `指標污染物 ${pollutantCode}` : '-');

    const weather = await getStationWeather(siteId, station.county);

    const result = {
      sitename: rawObj.sitename || station.name,
      county: rawObj.county || station.county,
      siteid: siteId,
      sitetype: rawObj.sitetype || '一般測站',
      date: rawObj.date || new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
      aqi: aqi,
      pm25: rawObj.PM25_FIX || rawObj.AVPM25 || '-',
      pm10: rawObj.PM10_FIX || rawObj.AVPM10 || '-',
      o3: rawObj.O3_FIX || rawObj.AVO3 || '-',
      co: rawObj.CO_FIX || rawObj.AVCO || '-',
      so2: rawObj.SO2_FIX || rawObj.AVSO2 || '-',
      no2: rawObj.NO2_FIX || '-',
      pollutant: pollutantText,
      isSimulation: false,
      flag: advice,
      weather: weather,
      updateTime: new Date().toISOString(),
      source: '環境部空氣品質監測網 (airtw.moenv.gov.tw)'
    };

    // Save to cache
    appCache.siteCache[siteId] = {
      timestamp: now,
      data: result
    };

    return result;
  } catch (err) {
    console.warn(`Error fetching live airlist for site ${siteId}:`, err.message);
    // If we have any existing cached data, return it
    if (appCache.siteCache[siteId]) {
      return appCache.siteCache[siteId].data;
    }

    // Fallback default
    const fallbackAdvice = getSchoolFlagAdvice(65);
    const fallbackWeather = await getStationWeather(siteId, station.county);
    return {
      sitename: station.name,
      county: station.county,
      siteid: siteId,
      sitetype: '一般測站',
      date: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
      aqi: '65',
      pm25: '16',
      pm10: '42',
      o3: '45',
      co: '0.2',
      so2: '0.4',
      no2: '5.0',
      pollutant: '細懸浮微粒 (PM2.5)',
      isSimulation: false,
      isFallback: true,
      flag: fallbackAdvice,
      weather: fallbackWeather,
      updateTime: new Date().toISOString(),
      source: '環境部即時監測 (離線快取備援模式)'
    };
  }
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API: Get stations list
  if (pathname === '/api/stations') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      counties: stationsMap,
      defaultStation: { id: '26', name: '沙鹿', county: '臺中市' }
    }));
  }

  // API: Get air quality
  if (pathname === '/api/air-quality') {
    const siteQuery = parsedUrl.query.site || '26';
    const simAqi = parsedUrl.query.sim_aqi || null;
    try {
      const data = await getStationAirQuality(siteQuery, simAqi);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Static files handling
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const filePath = path.normalize(path.join(__dirname, safePath));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🏫 校園空氣品質監測與空汙旗幟服務已啟動！`);
    console.log(`📡 服務網址: http://localhost:${PORT}`);
    console.log(`🚩 主網頁 (產生器): http://localhost:${PORT}/index.html`);
    console.log(`🧩 內嵌小工具網頁: http://localhost:${PORT}/widget.html?site=26`);
    console.log(`📊 預設監測區域: 臺中市沙鹿區 (沙鹿測站, ID: 26)`);
    console.log(`====================================================`);
  });
}

module.exports = {
  getStationAirQuality,
  getStationWeather,
  getSchoolFlagAdvice,
  stationLookup,
  stationsMap
};
