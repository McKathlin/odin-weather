//=============================================================================
// Weather querying
//=============================================================================

async function fetchWeatherIn (locationStr) {
  // Check for special values
  let easterEggWeather = this.fetchEasterEggWeather(locationStr);
  if (easterEggWeather) {
    await sleep(200);
    return easterEggWeather;
  }

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

function fetchEasterEggWeather (str) {
  if (str == 'example') {
    return {
      address: 'Example Town, Kentuckiana, USA',
      conditions: ['Partially cloudy'],
      description: 'Default weather throughout the day',
      highTemp: 55,
      lowTemp: 45,
      windDirection: 45,
      windSpeed: 10,
    };
  } else if (str.includes('hotman') || str.includes('flamey-o')) {
    return {
      address: 'Flamey-O, Hotman',
      conditions: ['Clear'],
      description: 'Scorching hot all day',
      highTemp: 120,
      lowTemp: 90,
      windDirection: 0,
      windSpeed: 0,
    };
  } else if (str.endsWith('hoth')) {
    return {
      address: 'Ice Breeze, Hoth',
      conditions: ['Snow', 'Hail', 'Cloudy'],
      description: 'freezing winds all day',
      highTemp: -20,
      lowTemp: -50,
      windDirection: 355,
      windSpeed: 60,
    };
  } else if (str == 'one') {
    return {
      address: 'One',
      conditions: '1',
      description: 'ONE!!!1',
      highTemp: 2,
      lowTemp: 1,
      windDirection: 1,
      windSpeed: 1,
    };
  } else {
    return null;
  }
}

//=============================================================================
// Display Components
//=============================================================================
// General helpers
//-----------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hideElement(element) {
  element.classList.add('hidden');
}

async function showElement(element) {
  element.classList.remove('hidden');
}

//-----------------------------------------------------------------------------
// Loading section
//-----------------------------------------------------------------------------

const LoadingDisplay = (function () {
  const section = document.getElementById('loading');
  const ellipsis = document.getElementById('ellipsis');

  const INTERVAL_DELAY = 250;
  let intervalId = null;

  const hide = async function () {
    hideElement(section);
    clearInterval(intervalId);
  }

  const show = async function () {
    intervalId = setInterval(function() {
      if (ellipsis.innerText.length >= 3) {
        ellipsis.innerText = '';
      } else {
        ellipsis.innerText += '.';
      }
    }, INTERVAL_DELAY);
    showElement(section);
  }

  return { hide, show };
}());

//-----------------------------------------------------------------------------
// Title card
//-----------------------------------------------------------------------------

const TitleCard = (function () {
  const locationNode = document.getElementById('location-output');

  let card = {};

  Object.defineProperty(card, 'location', {
    get: function () {
      return locationNode.innerText;
    },
    set: function (address) {
      locationNode.innerText = address;
    },
  });

  return card;
}());

//-----------------------------------------------------------------------------
// Thermometer cards
//-----------------------------------------------------------------------------

class ThermometerCard {
  constructor (cardNode) {
    this._colorMap = this._makeColorMap();
    this._cardNode = cardNode;
    this._thermometerNode = cardNode.querySelector('.thermometer');
    this._headingNode = cardNode.querySelector('.heading');
    this._temperatureNode = cardNode.querySelector('.temperature');
  }

  get heading() {
    return this._headingNode.innerText;
  }
  set heading(text) {
    this._headingNode.innerText = text;
  }

  get temperature () {
    return Number.parseFloat(this._thermometerNode.value);
  }
  set temperature (temp) {
    this._temperatureNode.innerText = temp;
    this._thermometerNode.value = temp;
    this._thermometerNode.innerText = `${temp} degrees Fahrenheit`;
    this._setBackgroundForTemperature(temp);
    this._setHaloForTemperature(temp);
  }

  _setBackgroundForTemperature (temp) {
    const GRADIENT_DIFF = 5;
    const top = this._colorMap.getColorAt(temp + GRADIENT_DIFF).toHexString();
    const mid = this._colorMap.getColorAt(temp).toHexString();
    const bottom = this._colorMap.getColorAt(temp - GRADIENT_DIFF).toHexString();
    const bg = `linear-gradient(${top}, ${mid}, ${bottom})`;
    this._cardNode.style.setProperty('background', bg);
  }

  _setHaloForTemperature (temp) {
    const HEAT_HALO_CUTOFF = 80;
    const COLD_HALO_CUTOFF = 32;
    const HALO_SIZE_FACTOR = 0.5;

    if (temp <= HEAT_HALO_CUTOFF && temp >= COLD_HALO_CUTOFF) {
      this._cardNode.style.setProperty('box-shadow', 'none');
    }

    // Heat halos are hot red-orange; cold halos are frosty light blue.
    const haloColor = temp > HEAT_HALO_CUTOFF ? '#ffbb11' : '#aaccff';

    const tempIntensity = Math.max(
      temp - HEAT_HALO_CUTOFF,
      COLD_HALO_CUTOFF - temp
    );

    const haloSize = Math.ceil(tempIntensity * HALO_SIZE_FACTOR);
    this._cardNode.style.setProperty(
      'box-shadow',
      `inset 0 0 ${haloSize}px ${haloColor}`
    );
  }

  _makeColorMap () {
    return new colorTools.GradientMap({
      0: '#0011cc',
      32: '#0077aa',
      60: '#118811',
      100: '#ff4400',
    });
  }
}

HighTempCard = new ThermometerCard(document.getElementById('high-temp-card'));
LowTempCard = new ThermometerCard(document.getElementById('low-temp-card'));

//-----------------------------------------------------------------------------
// Conditions card
//-----------------------------------------------------------------------------

class ConditionsCard {
  constructor(cardNode) {
    this._cardNode = cardNode;
    this._descriptionNode = cardNode.querySelector('.description');
    this._imageCreditNode = cardNode.querySelector('.image-credit');
  }

  setConditions({ conditions, description, address }) {
    this._descriptionNode.innerText = this._editDescription(description);

    const imageInfo = this._pickImage(conditions, description, address);
    this._cardNode.style.setProperty(
      'background-image',
      `url("./img/${imageInfo.filename}")`
    );
    this._imageCreditNode.innerText = imageInfo.credit;
  }

  _editDescription(description) {
    if (description.endsWith('.')) {
      return description.slice(0, description.length - 1);
    } else {
      return description
    }
  }

  _pickImage(conditions, description, address) {
    // Get the appropriate image list
    let conditionKey = 'partlyCloudy';
    if (conditions.includes('Snow')) {
      conditionKey = 'snow';
    } else if (description.toLowerCase().includes('storm')) {
      conditionKey = 'storm';
    } else if (conditions.includes('Rain')) {
      conditionKey = 'rain';
    } else if (conditions.includes('Clear')) {
      conditionKey = 'clear';
    } else if (conditions.includes('Overcast') || conditions.includes('Cloudy')) {
      conditionKey = 'cloudy';
    }
    const imageList = weatherImages[conditionKey];

    // Pick a deterministically seeded element from it
    const seed = this._makeDailySeed(address);
    return imageList[seed % imageList.length];
  }

  _makeDailySeed(seedString) {
    const now = new Date();
    return this._makeSeedNumber(seedString) + now.getMonth() + now.getDate();
  }

  _makeSeedNumber(seedString) {
    const BASE_CODE = 'a'.charCodeAt(0);
    let num = 0;
    for (let i = 0; i < seedString.length; i++) {
      num += seedString.charCodeAt(i) - BASE_CODE;
    }
    return Math.abs(num);
  }
}

TodayConditionsCard = new ConditionsCard(
  document.getElementById('conditions-card'));

//-----------------------------------------------------------------------------
// Quote card
//-----------------------------------------------------------------------------

// TODO

//-----------------------------------------------------------------------------
// Wind card
//-----------------------------------------------------------------------------
// Wind direction is in degrees clockwise, starting from north-sourced.
// 0 is from due north V (heading southward)
// 90 is from due west > (heading eastward)
// 180 is from due south ^ (heading northward)
// 270 is from due east < (heading westward)

class WindCard {
  constructor(cardNode) {
    this._cardNode = cardNode;
    this._windSpeedNode = cardNode.querySelector('.wind-speed');
    this._windArrowImage = cardNode.querySelector('.wind-arrow');
    this._windArrowContainer = cardNode.querySelector('.wind-graphic');
    this._windSpeed = null;
    this._windDirection = null;
  }

  get windSpeed() {
    return this._windSpeed;
  }

  get windDirection() {
    return this._windDirection;
  }

  setWind({ windSpeed, windDirection }) {
    this._windSpeed = windSpeed;
    this._windDirection = windDirection;
    this._windSpeedNode.innerText = windSpeed;
    this._styleArrow(windSpeed, windDirection);
    this._styleArrowContainer(windSpeed, windDirection);
    this._styleCard(windSpeed, windDirection);
  }

  // The arrow points in the wind's direction,
  // and its size depends on the wind's speed.
  _styleArrow(windSpeed, windDirection) {
    const MIN_ARROW_HEIGHT = 10;
    const SIZE_MULTIPLIER = 5;
    const arrowSize = MIN_ARROW_HEIGHT + (windSpeed * SIZE_MULTIPLIER);
    this._windArrowImage.style.setProperty('height', `${arrowSize}px`);
    this._windArrowImage.style.setProperty('transform', `rotate(${windDirection}deg)`);
  }

  // Thin stripes with just enough blur for anti-aliasing.
  // Their direction lines up with the arrow, and their opacity depends on wind speed.
  _styleArrowContainer(windSpeed, windDirection) {
    const opacity = Math.min(0.02 * windSpeed, 1);
    const gradientAngle = windDirection - 90;
    const lightColor = new colorTools.Color(70, 140, 210, opacity);
    const darkColor = new colorTools.Color(0, 0, 100, opacity);
    const gradient = `#794186 repeating-linear-gradient(${gradientAngle}deg, ${lightColor}, ${lightColor} 6px, ${darkColor} 8px, ${darkColor} 14px, ${lightColor} 16px)`;
    this._windArrowContainer.style.setProperty('background', gradient);
  }

  // Like the arrow container, but with larger, blurrier, and more subdued stripes.
  _styleCard(windSpeed, windDirection) {
    const opacity = Math.min(0.005 * windSpeed, 1);
    const gradientAngle = windDirection - 90;
    const lightColor = new colorTools.Color(70, 140, 210, opacity);
    const darkColor = new colorTools.Color(0, 0, 100, opacity);
    const gradient = `#5447a5 repeating-linear-gradient(${gradientAngle}deg, ${lightColor}, ${lightColor} 20px, ${darkColor} 30px, ${darkColor} 50px, ${lightColor} 60px)`;
    this._cardNode.style.setProperty('background', gradient);
  }
}

TodayWindCard = new WindCard(document.getElementById('wind-card'));

//=============================================================================
// Page Elements and Setup
//=============================================================================
// Page Elements
//-----------------------------------------------------------------------------

const locationInput = document.getElementById('location-input');
const fetchWeatherButton = document.getElementById('fetch-weather-button');

const resultsSection = document.getElementById('results');

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
  await hideElement(resultsSection);
  await LoadingDisplay.show();
  await sleep(1000);

  // Show the results when they're ready.
  const simpleWeather = await fetchWeatherIn(location);
  await showWeatherResults(simpleWeather);
}

async function showWeatherResults (simpleWeather) {
  console.log("Simplified weather report:", simpleWeather);

  TitleCard.location = simpleWeather.address;
  HighTempCard.temperature = simpleWeather.highTemp;
  LowTempCard.temperature = simpleWeather.lowTemp;
  TodayWindCard.setWind(simpleWeather);
  TodayConditionsCard.setConditions(simpleWeather);

  await sleep(200);
  await LoadingDisplay.hide();
  await showElement(resultsSection);
}
