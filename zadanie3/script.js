const weatherUrl =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=46.432414" +
    "&longitude=30.709130" +
    "&current=temperature_2m,wind_speed_10m" +
    "&timezone=auto";

fetch(weatherUrl)
    .then(response => response.json())
    .then(data => {

        const temperature = data.current.temperature_2m;
        const wind = data.current.wind_speed_10m;

        document.getElementById("weather").innerHTML =
            "Pocasie pre Odesa" + "<br>" +
            "Teplota: " + temperature + " °C<br>" +
            "Vietor: " + wind + " km/h";

    })
    .catch(error => {

        document.getElementById("weather").innerHTML =
            "Nepodarilo sa načítať počasie.";

        console.error(error);

});

var map = L.map("map").setView(
    [46.432414, 30.709130],
    15
);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

L.marker([46.432414, 30.709130])
    .addTo(map)
    .bindPopup("Moj domik")
    .openPopup();