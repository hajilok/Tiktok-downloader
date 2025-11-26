import React, { useState } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    try {
      const api = '/api/download?url=' + encodeURIComponent(url);
      const r = await fetch(api);
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        throw new Error(j?.error || 'Server error');
      }
      const j = await r.json();
      setVideoUrl(j.videoUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">TikTok Video Downloader</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste TikTok video URL here"
            className="w-full p-3 border rounded mb-2"
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading}>
            {loading ? 'Processing...' : 'Get video'}
          </button>
        </form>

        {error && <div className="text-red-600 mb-2">Error: {error}</div>}

        {videoUrl && (
          <div>
            <p className="mb-2">Direct video URL:</p>
            <a className="underline break-words" href={videoUrl} target="_blank" rel="noreferrer">Open video</a>

            <div className="mt-4">
              <video controls width="480" src={videoUrl} />
            </div>

            <div className="mt-2">
              <a href={videoUrl} download className="px-3 py-2 rounded border">Download</a>
              {/* If CORS blocks the direct download, use a server proxy: /api/proxy?target={videoUrl} */}
              <p className="text-sm mt-2 text-gray-600">If download is blocked due to CORS, use the server proxy: <code>/api/proxy?target=&lt;videoUrl&gt;</code></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
