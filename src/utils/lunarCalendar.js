/**
 * Vietnamese Lunar Calendar Conversion Utility
 *
 * Uses external API for accurate conversion.
 * URL: https://open.oapi.vn/date/convert-to-lunar
 */

export const getSimpleLunarDate = date => {
  // Keep the simplified local check as a synchronous fallback/stub
  // or entirely rely on the async API.
  // For React state initialization, we can't be async immediately,
  // so we return null here and let the async fetch update it.
  return null;
};

export const fetchLunarDate = async (day, month, year) => {
  // 1. Check Cache first
  const cacheKey = `lunar_cache_${year}_${month}_${day}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn("[LunarAPI] Cache read error:", e);
  }

  // 2. Clear old caches (cleanup)
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("lunar_cache_") && key !== cacheKey) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // ignore storage error
  }

  try {
    const response = await fetch("https://open.oapi.vn/date/convert-to-lunar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        day: day,
        month: month,
        year: year,
      }),
    });

    if (!response.ok) {
      console.error("Lunar API Error:", response.statusText);
      return null;
    }

    const result = await response.json();

    if (result && result.code === "success" && result.data) {
      const lunarData = {
        day: result.data.day,
        month: result.data.month,
        year: result.data.year,
        heavenlyStems: result.data.heavenlyStems,
        earthlyBranches: result.data.earthlyBranches,
      };

      // 3. Store in Cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(lunarData));
      } catch (e) {
        // ignore quota error
      }

      return lunarData;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch lunar date:", error);
    return null;
  }
};
