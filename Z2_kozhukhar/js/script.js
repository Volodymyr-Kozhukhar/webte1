// Each source has its own parser, but returns the same meal fields.
const restaurants = [
    { id: "eatandmeet", name: "Eat & Meet", url: "https://eatandmeet.sk/", localUrl: "data/eatandmeet.html", snapshotDate: "2026-10-26", parse: parseEatAndMeet },
    { id: "hospoda", name: "Naše Hospoda Karloveská", url: "https://www.nasehospoda-karloveska.sk/", localUrl: "data/hospoda.html", snapshotDate: "2026-10-26", parse: parseHospoda },
    { id: "druzba", name: "Družba Cantina", url: "https://www.druzbacatering.sk/obedove-menu/", localUrl: "data/druzba.html", snapshotDate: "2026-10-26", parse: parseDruzba }
];

const menuResults = document.querySelector("#menu-results");
const menuMessage = document.querySelector("#menu-message");
const loadingMessage = document.querySelector("#loading-message");
const refreshButton = document.querySelector("#refresh-menu");
const dayControls = document.querySelector("#day-controls");
const dayButtons = document.querySelectorAll("#day-filters button");
const dayNames = ["", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const currentDay = new Date().getDay();
// Date uses 0 for Sunday; our sources use 7.
let selectedDay = currentDay === 0 ? 7 : currentDay;
let menuData = [];

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
            updated.append(`Lokálna kópia zo dňa ${entry.restaurant.snapshotDate}. Načítané: `, time);
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

    menuMessage.textContent = selectedDay === "week" ? "Celý týždeň" : dayNames[selectedDay];
}

async function loadRestaurant(restaurant) {
    const html = await $.ajax({ url: restaurant.localUrl, dataType: "text", timeout: 10000 });
    // The parser runs after its HTML arrives.
    return { items: restaurant.parse(html), updatedAt: new Date().toISOString() };
}

async function loadMenu() {
    refreshButton.disabled = true;
    dayControls.disabled = true;
    loadingMessage.hidden = false;
    menuMessage.textContent = "";

    try {
        // Start all requests before waiting for their results.
        const requests = restaurants.map(function (restaurant) { return loadRestaurant(restaurant); });
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
        dayControls.disabled = false;
    }
}

// Register once; a click changes state and renders the loaded data.
dayButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedDay = button.dataset.day === "week" ? "week" : Number(button.dataset.day);
        renderMenu();
    });
});

refreshButton.addEventListener("click", loadMenu);
loadMenu();
