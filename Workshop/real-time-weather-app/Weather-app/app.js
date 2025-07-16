// DOM Elements
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const currentLocation = document.getElementById('current-location');
const currentDate = document.getElementById('current-date');
const currentTemp = document.getElementById('current-temp');
const weatherIcon = document.getElementById('weather-icon');
const weatherDescription = document.getElementById('weather-description');
const windSpeed = document.getElementById('wind-speed');
const humidity = document.getElementById('humidity');
const pressure = document.getElementById('pressure');
const forecastCards = document.getElementById('forecast-cards');
const hourlyContainer = document.getElementById('hourly-container');
const favoritesContainer = document.getElementById('favorites-container');
const themeToggle = document.getElementById('theme-toggle');
const unitsToggle = document.getElementById('units-toggle');
const notification = document.getElementById('notification');

const apiKey = 'e8cc583c31474987003bee80ae259eba'; // Replace with your OpenWeatherMap API key

// Global Variables
let currentWeatherData = null;
let forecastData = null;
let hourlyData = null;
let isCelsius = true;
let favorites = [];
let userPreferences = {
    theme: 'light',
    units: 'metric'
};

// Initialize the app
function initApp() {
    // Check for saved preferences
    const savedPrefs = localStorage.getItem('weatherAppPreferences');
    if (savedPrefs) {
        userPreferences = JSON.parse(savedPrefs);
        applyPreferences();
    }
    
    // Check for saved favorites
    const savedFavorites = localStorage.getItem('weatherAppFavorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
        renderFavorites();
    }
    
    // Set default location or use geolocation
    if (userPreferences.defaultLocation) {
        fetchWeather(userPreferences.defaultLocation);
    } else {
        getLocation();
    }
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', () => {
        const location = locationInput.value.trim();
        if (location) {
            fetchWeather(location);
            locationInput.value = '';
        }
    });
    
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const location = locationInput.value.trim();
            if (location) {
                fetchWeather(location);
                locationInput.value = '';
            }
        }
    });
    
    themeToggle.addEventListener('click', toggleTheme);
    unitsToggle.addEventListener('click', toggleUnits);
}

// Toggle between light and dark theme
function toggleTheme() {
    userPreferences.theme = userPreferences.theme === 'light' ? 'dark' : 'light';
    applyPreferences();
    savePreferences();
    
    // Update button text
    const icon = themeToggle.querySelector('i');
    if (userPreferences.theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

// Toggle between Celsius and Fahrenheit
function toggleUnits() {
    isCelsius = !isCelsius;
    userPreferences.units = isCelsius ? 'metric' : 'imperial';
    applyPreferences();
    savePreferences();
    
    // Update button text
    unitsToggle.textContent = isCelsius ? '°C / °F' : '°F / °C';
    
    // Update displayed temperatures
    if (currentWeatherData) {
        updateWeatherDisplay(currentWeatherData);
    }
    if (forecastData) {
        renderForecast(forecastData);
    }
    if (hourlyData) {
        renderHourlyForecast(hourlyData);
    }
}

// Apply user preferences
function applyPreferences() {
    document.body.setAttribute('data-theme', userPreferences.theme);
    
    // Update theme toggle button
    const themeIcon = themeToggle.querySelector('i');
    if (userPreferences.theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
    
    // Update units toggle button
    unitsToggle.textContent = isCelsius ? '°C / °F' : '°F / °C';
}

// Save preferences to localStorage
function savePreferences() {
    localStorage.setItem('weatherAppPreferences', JSON.stringify(userPreferences));
}

// Save favorites to localStorage
function saveFavorites() {
    localStorage.setItem('weatherAppFavorites', JSON.stringify(favorites));
}

// Get user's current location
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Default to a popular location if geolocation fails
                fetchWeather('New York');
                showNotification('Using default location. Allow geolocation for more accurate results.');
            }
        );
    } else {
        // Geolocation not supported
        fetchWeather('New York');
        showNotification('Geolocation not supported. Using default location.');
    }
}

// Fetch weather data by location name
async function fetchWeather(location) {
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=${userPreferences.units}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Location not found');
        }
        
        const currentData = await currentResponse.json();
        
        // Fetch forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=${userPreferences.units}`
        );
        const forecastData = await forecastResponse.json();
        
        // Process the data
        processWeatherData({
            current: currentData,
            forecast: forecastData
        });
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showNotification('Error fetching weather data. Please try another location.');
    }
}

// Fetch weather data by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${userPreferences.units}`
        );
        const currentData = await currentResponse.json();
        
        // Fetch forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${userPreferences.units}`
        );
        const forecastData = await forecastResponse.json();
        
        // Process the data
        processWeatherData({
            current: currentData,
            forecast: forecastData
        });
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showNotification('Error fetching weather data. Please try again.');
    }
}

// Process weather data and update UI
function processWeatherData(data) {
    currentWeatherData = data.current;
    forecastData = data.forecast;
    
    // Extract hourly data (next 12 hours)
    hourlyData = data.forecast.list.slice(0, 12);
    
    // Update UI
    updateWeatherDisplay(currentWeatherData);
    renderForecast(forecastData);
    renderHourlyForecast(hourlyData);
    
    // Update location in preferences if it's not set
    if (!userPreferences.defaultLocation) {
        userPreferences.defaultLocation = currentWeatherData.name;
        savePreferences();
    }
    
    // Add to favorites if not already there
    addToFavoritesIfNew(currentWeatherData.name);
}

// Update current weather display
function updateWeatherDisplay(data) {
    currentLocation.textContent = `${data.name}, ${data.sys.country}`;
    
    // Format date
    const now = new Date();
    currentDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Temperature
    currentTemp.textContent = Math.round(data.main.temp);
    
    // Weather icon and description
    const weather = data.weather[0];
    weatherDescription.textContent = weather.description;
    updateWeatherIcon(weatherIcon, weather.id, weather.icon);
    
    // Weather details
    windSpeed.textContent = isCelsius 
        ? `${Math.round(data.wind.speed * 3.6)} km/h` 
        : `${Math.round(data.wind.speed)} mph`;
    
    humidity.textContent = `${data.main.humidity}%`;
    pressure.textContent = `${data.main.pressure} hPa`;
}

// Update weather icon based on weather code
function updateWeatherIcon(element, weatherCode, iconCode) {
    // Clear previous classes
    element.className = 'weather-icon';
    
    // Add appropriate icon class
    const iconClass = getWeatherIconClass(weatherCode, iconCode);
    element.innerHTML = `<i class="fas ${iconClass}"></i>`;
}

// Get appropriate Font Awesome icon class based on weather code
function getWeatherIconClass(weatherCode, iconCode) {
    // Day or night icon
    const isDay = iconCode.endsWith('d');
    
    if (weatherCode >= 200 && weatherCode < 300) {
        return 'fa-bolt'; // Thunderstorm
    } else if (weatherCode >= 300 && weatherCode < 400) {
        return 'fa-cloud-rain'; // Drizzle
    } else if (weatherCode >= 500 && weatherCode < 600) {
        return isDay ? 'fa-cloud-sun-rain' : 'fa-cloud-moon-rain'; // Rain
    } else if (weatherCode >= 600 && weatherCode < 700) {
        return 'fa-snowflake'; // Snow
    } else if (weatherCode >= 700 && weatherCode < 800) {
        return 'fa-smog'; // Atmosphere (fog, haze, etc.)
    } else if (weatherCode === 800) {
        return isDay ? 'fa-sun' : 'fa-moon'; // Clear
    } else if (weatherCode > 800) {
        return isDay ? 'fa-cloud-sun' : 'fa-cloud-moon'; // Clouds
    }
    
    return 'fa-question'; // Default
}

// Render 5-day forecast
function renderForecast(data) {
    forecastCards.innerHTML = '';
    
    // Group forecast by day
    const dailyForecast = {};
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dailyForecast[day]) {
            dailyForecast[day] = {
                temps: [],
                weather: item.weather[0],
                date: date
            };
        }
        
        dailyForecast[day].temps.push(item.main.temp);
    });
    
    // Get the next 5 days
    const forecastDays = Object.keys(dailyForecast).slice(0, 5);
    
    forecastDays.forEach(day => {
        const dayData = dailyForecast[day];
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="day">${day}</div>
            <div class="forecast-icon">
                <i class="fas ${getWeatherIconClass(dayData.weather.id, dayData.weather.icon)}"></i>
            </div>
            <div class="temps">
                <span class="max-temp">${maxTemp}°</span>
                <span class="min-temp">${minTemp}°</span>
            </div>
        `;
        
        forecastCards.appendChild(card);
    });
}

// Render hourly forecast
function renderHourlyForecast(data) {
    hourlyContainer.innerHTML = '';
    
    data.forEach(item => {
        const date = new Date(item.dt * 1000);
        const time = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true
        }).replace(' ', '').toLowerCase();
        
        const temp = Math.round(item.main.temp);
        const weather = item.weather[0];
        
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="time">${time}</div>
            <div class="hourly-icon">
                <i class="fas ${getWeatherIconClass(weather.id, weather.icon)}"></i>
            </div>
            <div class="hourly-temp">${temp}°</div>
        `;
        
        hourlyContainer.appendChild(card);
    });
}

// Add location to favorites if it's new
function addToFavoritesIfNew(location) {
    if (!favorites.includes(location)) {
        favorites.push(location);
        saveFavorites();
        renderFavorites();
    }
}

// Render favorites list
function renderFavorites() {
    favoritesContainer.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = '<p>No favorites yet. Search for locations to add them.</p>';
        return;
    }
    
    favorites.forEach(location => {
        const li = document.createElement('li');
        li.textContent = location;
        li.addEventListener('click', () => {
            fetchWeather(location);
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(location);
        });
        
        li.appendChild(removeBtn);
        favoritesContainer.appendChild(li);
    });
}

// Remove location from favorites
function removeFavorite(location) {
    favorites = favorites.filter(fav => fav !== location);
    saveFavorites();
    renderFavorites();
}

// Show notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);