/**
 * Offline fallback page — shown by the service worker when the user is
 * offline and the page is not in the cache.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-gray-900 font-ethiopic mb-3">
          ኢንተርኔት አልተገናኘም
        </h1>
        <p className="text-gray-500 font-ethiopic mb-6 leading-relaxed">
          አሁን ከኢንተርኔት ጋር ያልተገናኙ ስለሆነ ይህ ገጽ አልተጫነም።
          <br />
          ኢንተርኔት ሲመለስ ዳግም ይሞክሩ።
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-ethiopic font-semibold hover:bg-blue-700 transition-colors"
        >
          ዳግም ሞክር
        </button>
        <p className="text-xs text-gray-400 mt-4 font-ethiopic">
          ቁጥሮች እና ረቂቆች ሲምጡ ወዲያው ይቀርባሉ።
        </p>
      </div>
    </div>
  );
}
