const restaurant = {
    name: "Eat & Meet",
    url: "https://eatandmeet.sk/",
    localUrl: "data/eatandmeet.html",
    snapshotDate: "2026-10-26"
};

const menuResults = document.querySelector("#menu-results");
const menuMessage = document.querySelector("#menu-message");
const loadingMessage = document.querySelector("#loading-message");
const refreshButton = document.querySelector("#refresh-menu");
const dayNames = ["", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];

function renderMenu(items) {
    const currentDay = new Date().getDay();
    const selectedDay = currentDay >= 1 && currentDay <= 5 ? currentDay : 1;
    const meals = items.filter(function (item) {
        return item.day === selectedDay;
    });

    menuResults.replaceChildren();

    document.querySelectorAll("#day-filters button").forEach(function (button) {
        const isSelected = Number(button.dataset.day) === selectedDay;
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    if (meals.length === 0) {
        menuMessage.textContent = "Menu na tento deň nie je k dispozícii.";
        return;
    }

    const article = document.createElement("article");
    article.className = "col-12";
    const heading = document.createElement("h3");
    heading.className = "h5";
    const source = document.createElement("a");
    source.href = restaurant.url;
    source.textContent = restaurant.name;
    heading.append(source);

    const updated = document.createElement("p");
    updated.className = "small";
    const time = document.createElement("time");
    const now = new Date();
    time.dateTime = now.toISOString();
    time.textContent = now.toLocaleString("sk-SK");
    updated.append("Načítané z lokálnej kópie: ", time);
    article.append(heading, updated);

    meals.forEach(function (meal) {
        const row = document.createElement("div");
        row.className = "menu-item";
        row.classList.toggle("menu-soup", meal.type === "Polievka");
        const details = document.createElement("div");
        const type = document.createElement("p");
        type.className = "small mb-1";
        type.textContent = meal.type;
        const name = document.createElement("p");
        name.className = "mb-0";
        name.textContent = meal.name;
        details.append(type, name);

        if (meal.allergens !== "") {
            const allergens = document.createElement("p");
            allergens.className = "small mb-0";
            allergens.textContent = `Alergény: ${meal.allergens}`;
            details.append(allergens);
        }

        const price = document.createElement("p");
        price.className = "menu-price";
        price.textContent = meal.price.toLocaleString("sk-SK", { style: "currency", currency: "EUR" });

        if (meal.studentPrice !== null) {
            const student = document.createElement("span");
            student.className = "d-block small fw-normal";
            student.textContent = `ISIC: ${meal.studentPrice.toLocaleString("sk-SK", { style: "currency", currency: "EUR" })}`;
            price.append(student);
        }

        row.append(details, price);
        article.append(row);
    });

    menuResults.append(article);
    menuMessage.textContent = `${dayNames[selectedDay]} · Lokálna kópia zo dňa ${restaurant.snapshotDate}.`;
}

async function loadMenu() {
    refreshButton.disabled = true;
    loadingMessage.hidden = false;
    menuMessage.textContent = "";

    try {
        const html = await $.ajax({ url: restaurant.localUrl, dataType: "text", timeout: 10000 });
        const items = parseEatAndMeet(html);
        renderMenu(items);
    } catch (error) {
        menuResults.replaceChildren();
        menuMessage.textContent = `Menu sa nepodarilo načítať. ${error.message || "Skontrolujte pripojenie alebo lokálnu kópiu."}`;
    } finally {
        loadingMessage.hidden = true;
        refreshButton.disabled = false;
    }
}

refreshButton.addEventListener("click", loadMenu);
loadMenu();
