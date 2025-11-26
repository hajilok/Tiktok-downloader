const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// helper: try to extract JSON from <script id="SIGI_STATE"> ...</script>
function extractSigiState(html) {
  const re = /<script id="SIGI_STATE">(.*?)<\/script>/s;
  const m = html.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function findPlayUrlFromSigi(sigi) {
  // SIGI_STATE commonly has an ItemModule with video metadata
  if (!sigi) return null;
  const itemModule = sigi.ItemModule || sigi['ItemModule'];
  if (itemModule && typeof itemModule === 'object') {
    const ids = Object.keys(itemModule);
    if (ids.length) {
      const entry = itemModule[ids[0]];
      if (entry && entry.video) {
        // playAddr sometimes within entry.video
        const playAddr = entry.video.playAddr || entry.video.downloadAddr || entry.video.playAddrLow;
        if (playAddr) return playAddr;
      }
    }
  }
  // alternate shapes
  // look for props -> pageProps -> itemInfo
  try {
    const maybe = sigi.props?.pageProps?.itemInfo?.itemStruct;
    if (maybe && maybe.video && (maybe.video.playAddr || maybe.video.downloadAddr)) {
      return maybe.video.playAddr || maybe.video.downloadAddr;
    }
  } catch (e) {}
  return null;
}

async function fetchTikTokPage(url) {
  // ensure user sends full url starting with http(s)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch TikTok page: ' + res.status);
  return await res.text();
}

// API: GET /api/download?url={tiktok_video_url}
app.get('/api/download', async (req, res) => {
  const videoPageUrl = req.query.url;
  if (!videoPageUrl) return res.status(400).json({ error: 'url query required' });

  try {
    const html = await fetchTikTokPage(videoPageUrl);

    // 1) Try SIGI_STATE JSON
    const sigi = extractSigiState(html);
    let videoUrl = findPlayUrlFromSigi(sigi);

    // 2) fallback: regex search for "playAddr":"..."
    if (!videoUrl) {
      const m = html.match(/"playAddr":"(https:[^\\"]+)"/);
      if (m) {
        videoUrl = m[1].replace(/\\u0026/g, '&');
      }
    }

    if (!videoUrl) {
      return res.status(404).json({ error: 'Unable to extract video URL. TikTok layout may have changed.' });
    }

    // The extracted URL may be signed and expire. We return it so the frontend can render or download.
    return res.json({ videoUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});
const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log('Server listening on', PORT));


