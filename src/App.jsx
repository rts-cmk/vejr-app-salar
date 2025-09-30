import { useState } from "react";
import "./app.css";

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";

export default function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!city.trim()) {
      setError("Skriv venligst et bynavn først.");
      return;
    }
    if (!API_KEY) {
      setError("Din API-nøgle mangler. Tilføj VITE_OPENWEATHER_API_KEY i .env og genstart dev-serveren.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWeather(null);

      // 1) Geokodning
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=1&appid=${API_KEY}`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        throw new Error(`GEOCODE_HTTP_${geoRes.status}`);
      }
      const geoData = await geoRes.json();
      if (!Array.isArray(geoData) || geoData.length === 0) {
        setError("Byen blev ikke fundet.");
        return;
      }
      const { lat, lon, name, country } = geoData[0];

      // 2) Vejr
      const wxUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=da&appid=${API_KEY}`;
      const weatherRes = await fetch(wxUrl);
      if (!weatherRes.ok) {
        throw new Error(`WEATHER_HTTP_${weatherRes.status}`);
      }
      const data = await weatherRes.json();

      setWeather({
        city: country ? `${name}, ${country}` : name,
        temp: Number.isFinite(data?.main?.temp) ? Math.round(data.main.temp) : null,
        icon: data?.weather?.[0]?.icon || "",
        description: data?.weather?.[0]?.description || "",
        wind: Number.isFinite(data?.wind?.speed) ? Math.round(data.wind.speed) : null,
        humidity: Number.isFinite(data?.main?.humidity) ? data.main.humidity : null,
      });
    } catch (err) {
      console.error("Fejl:", err);
      const msg = String(err?.message || "");
      if (msg.includes("HTTP_401")) {
        setError("401: API-nøglen er ugyldig/deaktiveret. Forny nøglen hos OpenWeather.");
      } else if (msg.includes("HTTP_429")) {
        setError("429: For mange forespørgsler. Prøv igen senere.");
      } else if (msg.includes("Failed to fetch")) {
        setError("Netværksfejl. Tjek internetforbindelse/firewall/VPN.");
      } else {
        setError("Der opstod en fejl. Prøv igen.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="weather-app">
      <h1>🌤️ Vejr App</h1>

      <div className="controls">
        <input
          type="text"
          placeholder="Skriv bynavn..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Søger..." : "Søg"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {weather && (
        <div className="weather-info">
          <h2>{weather.city}</h2>
          {weather.icon && (
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.description || "Vejr-ikon"}
              width={80}
              height={80}
            />
          )}
          {typeof weather.temp === "number" && (
            <p className="temp">{weather.temp}°C</p>
          )}
          {weather.description && <p>{weather.description}</p>}
          <div className="meta">
            {typeof weather.wind === "number" && <span>Vind: {weather.wind} m/s</span>}
            {typeof weather.humidity === "number" && <span>Fugt: {weather.humidity}%</span>}
          </div>
        </div>
      )}
    </div>
  );
}
