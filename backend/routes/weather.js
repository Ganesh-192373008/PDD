const express = require('express');
const router = express.Router();
const https = require('https');

// Helper to map WMO code to human readable weather description and icon
const mapWmoCode = (code) => {
  const mapping = {
    0: { text: 'Clear Sky', icon: 'clear' },
    1: { text: 'Mainly Clear', icon: 'mostly_clear' },
    2: { text: 'Partly Cloudy', icon: 'partly_cloudy' },
    3: { text: 'Overcast', icon: 'cloudy' },
    45: { text: 'Foggy', icon: 'fog' },
    48: { text: 'Depositing Rime Fog', icon: 'fog' },
    51: { text: 'Light Drizzle', icon: 'drizzle' },
    53: { text: 'Moderate Drizzle', icon: 'drizzle' },
    55: { text: 'Dense Drizzle', icon: 'drizzle' },
    56: { text: 'Light Freezing Drizzle', icon: 'drizzle' },
    57: { text: 'Dense Freezing Drizzle', icon: 'drizzle' },
    61: { text: 'Slight Rain', icon: 'rain' },
    63: { text: 'Moderate Rain', icon: 'rain' },
    65: { text: 'Heavy Rain', icon: 'rain' },
    66: { text: 'Light Freezing Rain', icon: 'rain' },
    67: { text: 'Heavy Freezing Rain', icon: 'rain' },
    71: { text: 'Slight Snow Fall', icon: 'snow' },
    73: { text: 'Moderate Snow Fall', icon: 'snow' },
    75: { text: 'Heavy Snow Fall', icon: 'snow' },
    77: { text: 'Snow Grains', icon: 'snow' },
    80: { text: 'Slight Rain Showers', icon: 'rain' },
    81: { text: 'Moderate Rain Showers', icon: 'rain' },
    82: { text: 'Violent Rain Showers', icon: 'rain' },
    85: { text: 'Slight Snow Showers', icon: 'snow' },
    86: { text: 'Heavy Snow Showers', icon: 'snow' },
    95: { text: 'Thunderstorm', icon: 'thunderstorm' },
    96: { text: 'Thunderstorm with Slight Hail', icon: 'thunderstorm' },
    99: { text: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm' },
  };
  return mapping[code] || { text: 'Cloudy', icon: 'cloudy' };
};

// @route   GET api/weather
// @desc    Get real weather forecast using GPS coordinates
router.get('/', (req, res) => {
  // Get query params, fallback to Pune, Maharashtra default coordinates
  const lat = req.query.lat || '18.5204';
  const lon = req.query.lon || '73.8567';
  const cityName = req.query.city || 'Pune, MH';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

  https.get(url, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          return res.status(400).json({ message: 'Error retrieving weather data', error: json.reason });
        }

        const current = json.current;
        const daily = json.daily;
        
        // Map WMO codes
        const mappedWeather = mapWmoCode(current.weather_code);

        // Map daily forecast
        const forecast = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < daily.time.length; i++) {
          const date = new Date(daily.time[i]);
          const dayName = days[date.getDay()];
          const mappedDayWeather = mapWmoCode(daily.weather_code[i]);
          
          forecast.push({
            date: daily.time[i],
            day: dayName,
            tempMax: daily.temperature_2m_max[i],
            tempMin: daily.temperature_2m_min[i],
            condition: mappedDayWeather.text,
            icon: mappedDayWeather.icon,
            rainProb: daily.precipitation_probability_max[i]
          });
        }

        // Return structured response
        res.json({
          location: cityName,
          latitude: lat,
          longitude: lon,
          temperature: current.temperature_2m,
          feelsLike: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          condition: mappedWeather.text,
          icon: mappedWeather.icon,
          rainProb: daily.precipitation_probability_max[0] || 0,
          forecast
        });

      } catch (err) {
        console.error('Error parsing weather JSON:', err);
        res.status(500).json({ message: 'Error parsing weather data.' });
      }
    });
  }).on('error', (err) => {
    console.error('Weather API HTTP request error:', err);
    res.status(500).json({ message: 'Error contacting weather service.' });
  });
});

module.exports = router;
