// Each source has its own parser, but returns the same meal fields.
const restaurants = [
    { id: "eatandmeet", name: "Eat & Meet", url: "https://eatandmeet.sk/", localUrl: "data/eatandmeet.html", snapshotDate: "2026-10-26", parse: parseEatAndMeet },
    { id: "hospoda", name: "Naše Hospoda Karloveská", url: "https://www.nasehospoda-karloveska.sk/", localUrl: "data/hospoda.html", snapshotDate: "2026-10-26", parse: parseHospoda },
    { id: "druzba", name: "Družba Cantina", url: "https://www.druzbacatering.sk/obedove-menu/", localUrl: "data/druzba.html", snapshotDate: "2026-10-26", parse: parseDruzba }
];

const menuResults = document.querySelector("#menu-results");
const menuMessage = document.querySelector("#menu-message");
const loadingMessage = document.querySelector("#loading-message");
const storageMessage = document.querySelector("#storage-message");
const refreshButton = document.querySelector("#refresh-menu");
const clearButton = document.querySelector("#clear-data");
const dayControls = document.querySelector("#day-controls");
const dayButtons = document.querySelectorAll("#day-filters button");
const restaurantFilters = document.querySelector("#restaurant-filters");
const restaurantCheckboxes = document.querySelectorAll("#restaurant-filters input");
const cachePrefix = "webte1-z2-menu-";
const dayNames = ["", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const currentDay = new Date().getDay();
// Date uses 0 for Sunday; our sources use 7.
let selectedDay = currentDay === 0 ? 7 : currentDay;
let menuData = [];

function isValidMeal(meal) {
    // Parsed JSON can still have wrong fields or types.
    return meal !== null && typeof meal === "object"
        && Number.isInteger(meal.day) && meal.day >= 1 && meal.day <= 7
        && (meal.date === null || (typeof meal.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meal.date) && Number.isFinite(Date.parse(meal.date))))
        && typeof meal.type === "string" && meal.type.trim() !== ""
        && typeof meal.name === "string" && meal.name.trim() !== ""
        && (meal.price === null || (Number.isFinite(meal.price) && meal.price >= 0))
        && (meal.studentPrice === null || (Number.isFinite(meal.studentPrice) && meal.studentPrice >= 0))
        && typeof meal.priceNote === "string" && typeof meal.allergens === "string"
        && (meal.weight === null || typeof meal.weight === "string");
}

function readCache(restaurant) {
    try {
        const text = localStorage.getItem(cachePrefix + restaurant.id);
        if (text === null) { return null; }
        const saved = JSON.parse(text);

        if (saved === null || typeof saved !== "object" || !Array.isArray(saved.items)
            || !saved.items.every(isValidMeal) || typeof saved.updatedAt !== "string"
            || !Number.isFinite(Date.parse(saved.updatedAt))) {
            storageMessage.textContent = "Uložené dáta sú poškodené. Načítam lokálne kópie.";
            return null;
        }

        // Compare local days, not UTC dates. New snapshots also need parsing.
        if (saved.snapshotDate !== restaurant.snapshotDate
            || new Date(saved.updatedAt).toDateString() !== new Date().toDateString()
            || Date.parse(saved.updatedAt) > Date.now()) {
            return null;
        }

        return { items: saved.items, updatedAt: saved.updatedAt };
    } catch {
        // Invalid JSON or blocked storage must not stop menu loading.
        storageMessage.textContent = "Uložené dáta sa nepodarilo prečítať. Načítam lokálne kópie.";
        return null;
    }
}

function saveCache(restaurant, data) {
    try {
        // Store data only; parser functions stay in the configuration.
        const saved = { snapshotDate: restaurant.snapshotDate, items: data.items, updatedAt: data.updatedAt };
        localStorage.setItem(cachePrefix + restaurant.id, JSON.stringify(saved));
    } catch {
        // A full or blocked storage does not hide loaded meals.
        storageMessage.textContent = "Dáta sa nepodarilo uložiť. Menu zostáva dostupné na tejto stránke.";
    }
}

function createMeal(meal) {
    const row = document.createElement("div");
    row.className = "menu-item";
    row.classList.toggle("menu-soup", meal.type === "Polievka");
    const details = document.createElement("div");
    const type = document.createElement("p");
    type.className = "small mb-1";
    type.textContent = meal.type;
    const name = document.createElement("p");
    name.className = "mb-0";
    // Source text is never inserted as HTML.
    name.textContent = meal.name;
    details.append(type, name);

    if (meal.weight !== null) {
        const weight = document.createElement("p");
        weight.className = "small mb-0";
        weight.textContent = `Porcia: ${meal.weight}`;
        details.append(weight);
    }

    if (meal.allergens !== "") {
        const allergens = document.createElement("p");
        allergens.className = "small mb-0";
        allergens.textContent = `Alergény: ${meal.allergens}`;
        details.append(allergens);
    }

    const price = document.createElement("p");
    price.className = "menu-price";
    // Included or missing prices stay as text, not 0 EUR.
    price.textContent = meal.price === null ? meal.priceNote
        : meal.price.toLocaleString("sk-SK", { style: "currency", currency: "EUR" });

    if (meal.studentPrice !== null) {
        const student = document.createElement("span");
        student.className = "d-block small fw-normal";
        student.textContent = `ISIC: ${meal.studentPrice.toLocaleString("sk-SK", { style: "currency", currency: "EUR" })}`;
        price.append(student);
    }

    row.append(details, price);
    return row;
}

function createDay(items, day) {
    const section = document.createElement("section");
    const heading = document.createElement("h4");
    heading.className = "h6 mt-4";
    heading.textContent = dayNames[day];
    const meals = items.filter(function (item) { return item.day === day; });

    if (meals.length > 0 && meals[0].date !== null) {
        const date = document.createElement("time");
        date.dateTime = meals[0].date;
        // Parse as local time, not UTC midnight.
        date.textContent = new Date(meals[0].date + "T12:00:00").toLocaleDateString("sk-SK");
        heading.append(" · ", date);
    }

    section.append(heading);

    if (meals.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Menu na tento deň nie je k dispozícii.";
        section.append(empty);
    } else {
        meals.forEach(function (meal) { section.append(createMeal(meal)); });
    }

    return section;
}

function renderMenu() {
    // Rebuild from loaded data; switching days makes no requests.
    menuResults.replaceChildren();
    dayButtons.forEach(function (button) {
        const isSelected = button.dataset.day === String(selectedDay);
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    menuData.forEach(function (entry) {
        const checkbox = document.querySelector(`#restaurant-${entry.restaurant.id}`);
        // Filters only change the view, not the saved data.
        if (!checkbox.checked) { return; }

        const article = document.createElement("article");
        article.className = "col-12";
        article.dataset.restaurant = entry.restaurant.id;
        const heading = document.createElement("h3");
        heading.className = "h5";
        const source = document.createElement("a");
        source.href = entry.restaurant.url;
        source.textContent = entry.restaurant.name;
        heading.append(source);
        article.append(heading);

        if (entry.error !== null) {
            const error = document.createElement("p");
            error.textContent = entry.error;
            article.append(error);
        } else {
            const updated = document.createElement("p");
            updated.className = "small";
            const time = document.createElement("time");
            // Use load time, not the time of each render.
            time.dateTime = entry.updatedAt;
            time.textContent = new Date(entry.updatedAt).toLocaleString("sk-SK");
            updated.append(`Lokálna kópia zo dňa ${entry.restaurant.snapshotDate}. Posledné spracovanie: `, time);
            article.append(updated);

            if (selectedDay === "week") {
                for (let day = 1; day <= 7; day++) {
                    article.append(createDay(entry.items, day));
                }
            } else {
                article.append(createDay(entry.items, selectedDay));
            }
        }

        menuResults.append(article);
    });

    if (menuData.length === 0) {
        menuMessage.textContent = "Dáta nie sú načítané. Použite tlačidlo Aktualizovať menu.";
    } else if (menuResults.childElementCount === 0) {
        menuMessage.textContent = "Vyberte aspoň jednu reštauráciu.";
    } else {
        menuMessage.textContent = selectedDay === "week" ? "Celý týždeň" : dayNames[selectedDay];
    }
}

async function loadRestaurant(restaurant, forceRefresh) {
    if (!forceRefresh) {
        const cached = readCache(restaurant);
        if (cached !== null) { return cached; }
    }

    // Bypass the HTTP cache too when reading the local file.
    const html = await $.ajax({ url: restaurant.localUrl, dataType: "text", timeout: 10000, cache: false });
    // The parser runs after its HTML arrives.
    const data = { items: restaurant.parse(html), updatedAt: new Date().toISOString() };
    saveCache(restaurant, data);
    return data;
}

async function loadMenu(forceRefresh) {
    refreshButton.disabled = true;
    clearButton.disabled = true;
    dayControls.disabled = true;
    restaurantFilters.disabled = true;
    loadingMessage.hidden = false;
    menuMessage.textContent = "";
    storageMessage.textContent = "";

    try {
        // Start all requests before waiting for their results.
        const requests = restaurants.map(function (restaurant) { return loadRestaurant(restaurant, forceRefresh); });
        const results = await Promise.allSettled(requests);

        menuData = results.map(function (result, index) {
            // Results keep the input order, even if requests finish out of order.
            if (result.status === "fulfilled") {
                return { restaurant: restaurants[index], items: result.value.items, updatedAt: result.value.updatedAt, error: null };
            }

            // One rejected request or parser does not hide the others.
            const message = result.reason instanceof Error ? result.reason.message : "Lokálnu kópiu sa nepodarilo načítať.";
            return { restaurant: restaurants[index], items: [], updatedAt: null, error: message };
        });

        renderMenu();
    } catch (error) {
        menuResults.replaceChildren();
        menuMessage.textContent = `Menu sa nepodarilo zobraziť. ${error.message}`;
    } finally {
        // Always restore controls, including after an error.
        loadingMessage.hidden = true;
        refreshButton.disabled = false;
        clearButton.disabled = false;
        dayControls.disabled = false;
        restaurantFilters.disabled = false;
    }
}

function clearSavedData() {
    try {
        // Remove only our keys; other projects can share this origin.
        restaurants.forEach(function (restaurant) {
            localStorage.removeItem(cachePrefix + restaurant.id);
        });
        menuData = [];
        storageMessage.textContent = "Uložené dáta boli vymazané.";
        renderMenu();
    } catch {
        storageMessage.textContent = "Nepodarilo sa vymazať všetky uložené dáta.";
    }
}

// Register once; a click changes state and renders the loaded data.
dayButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedDay = button.dataset.day === "week" ? "week" : Number(button.dataset.day);
        renderMenu();
    });
});

restaurantCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", renderMenu);
});

// The wrapper passes a boolean, not the click event.
refreshButton.addEventListener("click", function () { loadMenu(true); });
clearButton.addEventListener("click", clearSavedData);
loadMenu(false);
