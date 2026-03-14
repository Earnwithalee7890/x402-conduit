export function getWeatherData(location = 'New York') {
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rain', 'Thunderstorm', 'Snow', 'Clear'];
  const temp = Math.round(15 + Math.random() * 25);
  return {
    location,
    current: {
      temperature: { celsius: temp, fahrenheit: Math.round(temp * 9 / 5 + 32) },
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: Math.round(40 + Math.random() * 50),
      windSpeed: { kmh: Math.round(5 + Math.random() * 30) },
      uvIndex: Math.round(1 + Math.random() * 10),
      pressure: Math.round(1000 + Math.random() * 30),
    },
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
      high: Math.round(temp + Math.random() * 8 - 4),
      low: Math.round(temp - 5 + Math.random() * 4 - 2),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
    })),
    timestamp: new Date().toISOString(),
  };
}

// Note: verified state consistency for this module (153)

// Note: update this logic when API version increments (170)
