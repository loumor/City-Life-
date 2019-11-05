// Requires 
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express()
var Flickr = require('flickr-sdk');
var zomato = require('zomato');
var GoogleMaps = require('@google/maps');

// API Keys 
const apiKeyWeather = 'YOUR API KEY';
const apiKeyGoogle = 'YOUR API KEY';
const apiKeyFlickr = 'YOUR API KEY';
const apiKeyZmato = 'YOUR API KEY';

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs') // Set up webpage html document 

app.get('/', function (req, res) {
  // Render the webpage
  res.render('index', {weather: null, headlocation: null, lat: null, long: null, imgLinks: null, WebLinks: null, imgLinksFl: null, restLat: null, restLong: null, restname: null, error: null});
  
})
 
// Main Page
app.post('/', async function (req, res) {

  city = req.body.city; // Grab the users input city 
  flickrsort = req.body.flickSort; // Grab the users sort selection 
  weatherSort = req.body.weatherInfo; // Grab the users sort selection

  // Error Handling 
  let urlw = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKeyWeather}`
  // Send out a request 
  request(urlw, function (err, response, bodyW) {
    // Check for errors
    if(err || (JSON.parse(bodyW).cod == '404') || (JSON.parse(bodyW).cod == '401')){
      // Render the webpage after the users input has been evaluated 
      res.render('index', {
        weather:  `Enter a vaild City name`, 
        headlocation:  `Enter a vaild City name`, 
        lat: null, 
        long: null, 
        imgLinks: null, 
        WebLinks: null, 
        imgLinksFl: null, 
        restLat: null, 
        restLong: null, 
        restname: null, 
        error: null
      });
    }
  })

  const googleResults = await googleStart(city); // Google maps API
  const weatherResults = await weatherSearch(googleResults.basicLocation, city, weatherSort); // Openweather API 
  const zomatoResults = await zomatoStart(googleResults.latLocation, googleResults.longLocation); // Zomato API
  const flickrResults = await filckrSearch(googleResults.latLocation, googleResults.longLocation, flickrsort); // Flickr API
  // Render the webpage after the users input has been evaluated 
  res.render('index', {
        weather: weatherResults.weatherText, 
        headlocation: weatherResults.headLocationText, 
        lat: googleResults.latLocation, 
        long: googleResults.longLocation, 
        imgLinks: zomatoResults.imageLinks, 
        WebLinks: zomatoResults.websiteLinks, 
        imgLinksFl: flickrResults.imageLinksFlick, 
        restLat: zomatoResults.latitudeRest, 
        restLong: zomatoResults.longitudeRest, 
        restname: zomatoResults.restName, 
        error: null
  });
});

// Weather function 
async function weatherSearch(basicLocation, city, weatherSort){
  
  return new Promise(function (resolve, reject) {
  // API URL
  let urlw = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKeyWeather}`
  
  // Variables 
  var weatherInfo = ''; // Output weather information
  
  // Send out a request 
  request(urlw, function (err, response, bodyW) {
    // Check for errors
    if(err || (JSON.parse(bodyW).cod == '404') || (JSON.parse(bodyW).cod == '401')){
      
      resolve({
        weatherText: `Enter a vaild City name`,
        headLocationText: `Enter a vaild City name`
      })
      reject();

    } else { 
      let weather = JSON.parse(bodyW) // Get JSON result
      
      if (weather.weather[0]){ // When True the weather result exists
        // The following 'if' statements check which sort option the user has picked
        // then returns the correct result linking to that users choice 
        if (weatherSort == "none"){
          weatherInfo = "";
        }
        if (weatherSort == "Description"){
          weatherInfo = weather.weather[0].description;
        }
        if (weatherSort == "Humidity"){
          weatherInfo = `${weather.main.humidity}%`;
        }
        if (weatherSort == "Wind"){
          weatherInfo = `Speed: ${weather.wind.speed} km/h Direction: ${weather.wind.deg} Degrees`;
        }
        if (weatherSort == "Max & Min Temp"){
          weatherInfo = `Max: ${weather.main.temp_max} Min: ${weather.main.temp_min}`;
        }
        if (weatherSort == "Sunrise & Sunset"){
          weatherInfo = `Sunrise: ${weather.sys.sunrise} Sunset: ${weather.sys.sunset}`;
        }
      }

      resolve({
        weatherText: `It's ${weather.main.temp} degrees in ${weather.name}! ${weatherSort}: ${weatherInfo}`,
        headLocationText: `The City of ${basicLocation}`
      })
    }
  });
})
}


// Google Function 
async function googleStart(){
  return new Promise(function (resolve, reject) {

    var basicLocation = '';  // Name of City 
    var latLocation = ''; // Latitude of current City 
    var longLocation = ''; // Longitude of current City

  // Google Maps Initialize 
  var googleMapsClient = GoogleMaps.createClient({
    key: apiKeyGoogle
  });

  // Google Maps Locaton 
  googleMapsClient.geocode({
    address: city
  }, function(err, response) {
    if (!err) {
      latLocation = response.json.results[0].geometry.location.lat; // Store the latitude 
      //console.log(latLocation); // Debugging 
      longLocation = response.json.results[0].geometry.location.lng; // Store the longitude
      //console.log(longLocation); // Debugging
      basicLocation = response.json.results[0].formatted_address; // Sort the city name
      
      //console.log(basicLocation); // Debugging
      resolve({
        latLocation,
        longLocation,
        basicLocation
      })
    }
    else {
      console.error('bonk', err); // Catch errors 

      reject();
    }
  });
})
}

// Flickr API
async function filckrSearch(latLocation, longLocation, flicksort){
  return new Promise(function (resolve, reject) {
  var imageLinksFlick = []; // Array of <img> src's  
  // Create a new Flickr Client 
  var flickr = new Flickr(apiKeyFlickr);
  // Search Flickr based on latitude and longitude of city 
  flickr.photos.search({
    lat: latLocation,
    lon: longLocation,
    radius: 20, // Set radius to 20km 
    sort: flickrsort // Sort the photos by users selection 
  }).then(function (res) {
    //console.log('yay!', res.body.photos.photo[0]); // Debugging
    // Using a 'for' loop grab the <img> src's of all the Flickr photos from the returned JSON
    for (i = 0; i < res.body.photos.photo.length; i++){
      var farmid = res.body.photos.photo[i].farm;
      var serverid = res.body.photos.photo[i].server;
      var ID = res.body.photos.photo[i].id;
      var Secret = res.body.photos.photo[i].secret;
      let urlf = `http://farm${farmid}.staticflickr.com/${serverid}/${ID}_${Secret}.jpg`
      //console.log(urlf); // Debugging 
      
      imageLinksFlick[i] = urlf;
    }
    resolve({
      imageLinksFlick
    })

  }).catch(function (err) {
    reject();
    console.error('bonk', err); // Catch errors 
  });
})
}

// Zomato API
async function zomatoStart(latLocation, longLocation){
  return new Promise(function (resolve, reject) {
    var imageLinks = []; // Array of <img> src's
    var websiteLinks = []; // Array of Zomato Website links
    var latitudeRest = []; // Array of Restaurant latitudes
    var longitudeRest = []; // Array of Restaurant longitudes 
    var restName = []; // Array of Restaurant Names

  // Create new Zomato client
  var client = zomato.createClient({
    userKey: apiKeyZmato
  });
  
  // Search Zomato by longitude and latitude 
  client.getGeocode({
    lat: latLocation, //latitude
    lon: longLocation, //longitude

    }, function(err, result){
        if(!err){
         var jsonContent = JSON.parse(result); // Pass to JSON 
         //console.log(jsonContent.nearby_restaurants); // Debugging
         for (i = 0; i < jsonContent.nearby_restaurants.length; i++){
            // Using a 'for loop' obtain the latitude, longitude, <img> src, website URL and 
            // restaurant name from the users input city to the JSON result
            if(jsonContent.nearby_restaurants[i]){
              latitudeRest[i] = jsonContent.nearby_restaurants[i].restaurant.location.latitude;
              longitudeRest[i] = jsonContent.nearby_restaurants[i].restaurant.location.longitude;
              imageLinks[i] = jsonContent.nearby_restaurants[i].restaurant.thumb;
              websiteLinks[i] = jsonContent.nearby_restaurants[i].restaurant.url;
              restName[i] = jsonContent.nearby_restaurants[i].restaurant.name;
            }
          } 
          resolve({
            latitudeRest,
            longitudeRest,
            imageLinks,
            websiteLinks,
            restName
          })   
        }else {
          console.log(err); // Catch errors
          reject();
        }
    });
  })
}

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})


