function parseEatAndMeet(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = [];

    if (doc.querySelector(".weak-menu .tab-pane") === null) {
        throw new Error("Štruktúra menu Eat & Meet sa zmenila.");
    }

    for (let day = 1; day <= 5; day++) {
        const meals = doc.querySelectorAll(`#day-${day} .menu-body`);

        meals.forEach(function (meal) {
            const title = meal.querySelector("h4");
            const description = meal.querySelector(".menu-description .desc");
            const priceElement = meal.querySelector(".price");

            if (title === null || description === null || priceElement === null) {
                throw new Error("V menu Eat & Meet chýba názov alebo cena jedla.");
            }

            let type = title.textContent.trim();

            if (type.startsWith("Polievka")) {
                type = "Polievka";
            } else if (type.startsWith("MENU")) {
                type = "Hlavné jedlo";
            }

            const prices = priceElement.textContent.split("/");
            const price = Number.parseFloat(prices[0].trim().replace(",", "."));
            let studentPrice = null;

            if (prices.length > 1) {
                studentPrice = Number.parseFloat(prices[1].trim().replace(",", "."));
            }

            if (!Number.isFinite(price) || price < 0
                || (studentPrice !== null && (!Number.isFinite(studentPrice) || studentPrice < 0))) {
                throw new Error("Cenu jedla Eat & Meet sa nepodarilo rozpoznať.");
            }

            const allergenElement = description.querySelector("span");
            let allergens = "";

            if (allergenElement !== null) {
                allergens = allergenElement.textContent.replace("(", "").replace(")", "").trim();
                allergenElement.remove();
            }

            const name = description.textContent.trim();

            if (name === "") {
                throw new Error("V menu Eat & Meet chýba názov jedla.");
            }

            items.push({ day, date: null, type, name, price, studentPrice, allergens, weight: null });
        });
    }

    return items;
}
