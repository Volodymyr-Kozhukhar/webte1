const school = [48.151965, 17.072995];
const home = [48.125, 17.105];
const mapMessage = document.querySelector("#map-message");

function getDistance(start, end) {
    const earthRadius = 6371;
    const lat1 = start[0] * Math.PI / 180;
    const lat2 = end[0] * Math.PI / 180;
    const latitudeDifference = (end[0] - start[0]) * Math.PI / 180;
    const longitudeDifference = (end[1] - start[1]) * Math.PI / 180;

    let a = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDifference / 2) ** 2;
    a = Math.max(0, Math.min(1, a));
    const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * angle;
}

if (typeof L === "undefined") {
    mapMessage.textContent = "Mapu sa nepodarilo načítať. Skontrolujte pripojenie na internet a obnovte stránku.";
} else {
    const map = L.map("map").setView(school, 13);

    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tiles.on("tileerror", function () {
        mapMessage.textContent = "Mapové podklady sa nepodarilo načítať. Skontrolujte pripojenie na internet.";
    });

    const schoolMarker = L.marker(school, { title: "Škola – FEI STU", alt: "Škola – FEI STU" })
        .addTo(map)
        .bindPopup("Škola – FEI STU, Ilkovičova 3", { maxWidth: 180 });

    const homeMarker = L.marker(home, { title: "Domov – fiktívne miesto", alt: "Domov – fiktívne miesto" })
        .addTo(map)
        .bindPopup("Domov – fiktívne miesto v Bratislave", { maxWidth: 180 });

    map.fitBounds([school, home], { padding: [60, 60] });
    mapMessage.textContent = "Na mape zobrazujem svoju školu a fiktívne miesto bydliska.";

    const pointName = document.querySelector("#point-name");
    const pointSelect = document.querySelector("#point-select");
    const pointsList = document.querySelector("#points-list");
    const pointsMessage = document.querySelector("#points-message");
    const targetSelect = document.querySelector("#target-select");
    const distanceButton = document.querySelector("#distance-button");
    const distanceMessage = document.querySelector("#distance-message");
    const lineColor = getComputedStyle(document.documentElement).getPropertyValue("--color-brand-secondary").trim();
    const targets = {
        school: { name: "Škola – FEI STU", coordinates: school, marker: schoolMarker },
        home: { name: "Domov – fiktívne miesto", coordinates: home, marker: homeMarker }
    };
    const points = [];
    const markers = [];
    let connection = null;

    pointName.disabled = false;

    function addPoint(point) {
        const popup = document.createElement("span");
        popup.textContent = point.name;

        const marker = L.marker(point.coordinates, { title: point.name, alt: point.name })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 180 });

        if (points.length === 0) {
            pointSelect.textContent = "";
        }

        points.push(point);
        markers.push(marker);

        const option = document.createElement("option");
        option.value = points.length - 1;
        option.textContent = point.name;
        pointSelect.append(option);
        pointSelect.value = option.value;
        pointSelect.disabled = false;
        targetSelect.disabled = false;
        distanceButton.disabled = false;

        const item = document.createElement("li");
        item.textContent = point.name;
        pointsList.append(item);

        return marker;
    }

    function savePoints() {
        try {
            localStorage.setItem("webte1-map-points", JSON.stringify(points));
        } catch {
            pointsMessage.textContent = "Bod som pridal, ale prehliadač nepovolil jeho uloženie. Po obnovení stránky sa nemusí zachovať.";
        }
    }

    try {
        const savedPoints = JSON.parse(localStorage.getItem("webte1-map-points") || "[]");

        if (!Array.isArray(savedPoints)) {
            throw new Error("Invalid saved points");
        }

        const validPoints = savedPoints.every(function (point) {
            return point !== null && typeof point === "object"
                && typeof point.name === "string" && point.name.trim().length > 0 && point.name.length <= 80
                && Array.isArray(point.coordinates) && point.coordinates.length === 2
                && Number.isFinite(point.coordinates[0]) && Math.abs(point.coordinates[0]) <= 90
                && Number.isFinite(point.coordinates[1]) && Math.abs(point.coordinates[1]) <= 180;
        });

        if (!validPoints) {
            throw new Error("Invalid saved points");
        }

        savedPoints.forEach(function (point) {
            addPoint(point);
        });

        if (points.length > 0) {
            pointsMessage.textContent = `Načítal som uložené body: ${points.length}.`;
        }
    } catch {
        pointsMessage.textContent = "Uložené body sa nepodarilo načítať. Nové body môžem pridať názvom a kliknutím na mapu.";
    }

    map.on("click", function (event) {
        const name = pointName.value.trim();

        if (name === "" || name.length > 80) {
            pointsMessage.textContent = "Najprv zadajte názov bodu (1 až 80 znakov), potom kliknite na mapu.";
            pointName.focus();
            return;
        }

        const position = event.latlng.wrap();
        const point = { name: name, coordinates: [position.lat, position.lng] };
        addPoint(point).openPopup();
        pointName.value = "";
        pointsMessage.textContent = `Pridal som bod: ${name}.`;
        savePoints();

        if (connection !== null) {
            showDistance();
        }
    });

    pointSelect.addEventListener("change", function () {
        const index = Number(pointSelect.value);
        map.panTo(points[index].coordinates);
        markers[index].openPopup();

        if (connection !== null) {
            showDistance();
        }
    });

    function showDistance() {
        const index = Number(pointSelect.value);
        const point = points[index];
        const target = targets[targetSelect.value];
        const distance = getDistance(point.coordinates, target.coordinates);
        const distanceText = distance.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (connection !== null) {
            map.removeLayer(connection);
        }

        connection = L.polyline([point.coordinates, target.coordinates], { color: lineColor, weight: 3 }).addTo(map);
        map.fitBounds(connection.getBounds(), { padding: [60, 60], maxZoom: 16 });
        distanceMessage.textContent = `${point.name} → ${target.name}: ${distanceText} km vzdušnou čiarou.`;

        markers.forEach(function (marker, markerIndex) {
            const text = document.createElement("span");
            text.textContent = points[markerIndex].name;
            marker.setPopupContent(text);
        });
        schoolMarker.setPopupContent("Škola – FEI STU, Ilkovičova 3");
        homeMarker.setPopupContent("Domov – fiktívne miesto v Bratislave");

        const pointPopup = document.createElement("span");
        pointPopup.textContent = `${point.name} → ${target.name}: ${distanceText} km`;
        markers[index].setPopupContent(pointPopup).openPopup();

        const targetPopup = document.createElement("span");
        targetPopup.textContent = `${target.name} → ${point.name}: ${distanceText} km`;
        target.marker.setPopupContent(targetPopup);
    }

    distanceButton.addEventListener("click", showDistance);

    targetSelect.addEventListener("change", function () {
        if (connection !== null) {
            showDistance();
        }
    });
}
