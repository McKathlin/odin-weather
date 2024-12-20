//=============================================================================
// Weather querying
//=============================================================================

async function fetchWeatherIn (locationStr) {
  const BASE_PATH = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';
  const MY_FREE_KEY = 'J9RKTKAX2HRTXCXKVAQE4DERZ';
  const RESPONSE_STATUS_OK = 200;

  const location = encodeURIComponent(locationStr);
  const INCLUDES = [
    'current',
    'days', 
    'hours', 
    'alerts',
  ];
  const INCLUDES_STR = INCLUDES.join(',');
  const query = `${BASE_PATH}/${location}?key=${MY_FREE_KEY}&include=${INCLUDES_STR}`;

  const response = await fetch(query);
  if (response.status != RESPONSE_STATUS_OK) {
    throw new Error(`HTTP ${response.status} response`);
  }
  const report = await response.json();
  
  console.log(report);
  return simplifyWeather(report);
}

//=============================================================================
// Weather Information Processing
//=============================================================================

function simplifyWeather (fullReport) {
  const today = fullReport.days[0];
  return {
    address: fullReport.resolvedAddress,
    conditions: today.conditions.split(', '),
    description: today.description,
    highTemp: today.tempmax,
    lowTemp: today.tempmin,
    windDirection: today.winddir,
    windSpeed: today.windspeed,
  };
}

//=============================================================================
// Page Elements and Setup
//=============================================================================

const locationInput = document.getElementById('location');
const fetchWeatherButton = document.getElementById('fetch-weather-button');

fetchWeatherButton.addEventListener('click', function(event) {
  event.preventDefault();
  showWeatherResults();
})

document.addEventListener('keypress', function(event) {
  if (event.key == "Enter") {
    event.preventDefault();
    showWeatherResults();
  }
})

function showWeatherResults() {
  const location = locationInput.value.trim();
  if (!location) {
    return;
  }

  fetchWeatherIn(location).then((simpleWeather) => {
    console.log("Simplified weather report:", simpleWeather);
  });
}

// winddir key:
// Direction is in degrees clockwise, starting from north-sourced.
// 0 is from due north V (heading southward)
// 90 is from due west > (heading eastward)
// 180 is from due south ^ (heading northward)
// 270 is from due east < (heading westward)