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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// winddir key:
// Direction is in degrees clockwise, starting from north-sourced.
// 0 is from due north V (heading southward)
// 90 is from due west > (heading eastward)
// 180 is from due south ^ (heading northward)
// 270 is from due east < (heading westward)

//=============================================================================
// Page Elements and Setup
//=============================================================================
// Page Elements
//-----------------------------------------------------------------------------

const locationInput = document.getElementById('location-input');
const fetchWeatherButton = document.getElementById('fetch-weather-button');

const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');

const locationOutput = document.getElementById('location-output');

//-----------------------------------------------------------------------------
// Event listeners
//-----------------------------------------------------------------------------

fetchWeatherButton.addEventListener('click', function(event) {
  event.preventDefault();
  loadWeatherResults();
});

document.addEventListener('keypress', function(event) {
  if (event.key == "Enter") {
    event.preventDefault();
    loadWeatherResults();
  }
});

//-----------------------------------------------------------------------------
// Display
//-----------------------------------------------------------------------------

async function loadWeatherResults () {
  // If there's no location, ignore.
  const location = locationInput.value.trim();
  if (!location) {
    return;
  }

  // Loading...
  await showLoadingMessage();
  await sleep(2000);

  // Show the results when they're ready.
  const simpleWeather = await fetchWeatherIn(location);
  await hideLoadingMessage();
  await sleep(500);
  await showWeatherResults(simpleWeather);
}

async function showLoadingMessage () {
  loadingSection.classList.remove('hidden');
  // TODO: show a loading animation
}

async function hideLoadingMessage () {
  loadingSection.classList.add('hidden');
  // TODO: clean up loading information resources
}

async function showWeatherResults (simpleWeather) {
  console.log("Simplified weather report:", simpleWeather);
  locationOutput.innerText = simpleWeather.address;
  resultsSection.classList.remove("hidden");
}
