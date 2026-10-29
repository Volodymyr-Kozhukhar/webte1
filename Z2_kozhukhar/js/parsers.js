const sourceDayNames = ["", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"];

function parsePrice(text) {
    // Read the number before the currency sign.
    const price = Number.parseFloat(text.trim().replace(",", "."));

    if (!Number.isFinite(price) || price < 0) {
        throw new Error("Cenu jedla sa nepodarilo rozpoznať.");
    }

    return price;
}

function parseMenuDate(text) {
    // Convert the source date to YYYY-MM-DD.
    const parts = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    return parts === null ? null : `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

function getWeight(text) {
    // Regex is only used on short text, not on HTML.
    const portions = text.match(/\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\b/gi);
    return portions === null ? null : portions.join(" / ");
}

function parseEatAndMeet(html) {
    // This document is separate from our visible page.
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = [];

    if (doc.querySelector(".weak-menu .tab-pane") === null) {
        throw new Error("Štruktúra menu Eat & Meet sa zmenila.");
    }

    for (let day = 1; day <= 7; day++) {
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

            // Eat & Meet lists the regular price first.
            const prices = priceElement.textContent.split("/");
            const price = parsePrice(prices[0]);
            let studentPrice = null;

            if (prices.length > 1) {
                studentPrice = parsePrice(prices[1]);
            }

            const allergenElement = description.querySelector("span");
            let allergens = "";

            if (allergenElement !== null) {
                allergens = allergenElement.textContent.replace("(", "").replace(")", "").trim();
                // Keep allergens out of the meal name.
                allergenElement.remove();
            }

            const name = description.textContent.trim();

            if (name === "") {
                throw new Error("V menu Eat & Meet chýba názov jedla.");
            }

            // Same fields; this source has no menu date.
            items.push({ day, date: null, type, name, price, studentPrice, priceNote: "", allergens, weight: getWeight(name) });
        });
    }

    return items;
}

function parseHospodaMeal(row, day, date, isSpecial) {
    const title = row.querySelector(".min-w-0 > .font-bold");
    const metadata = row.querySelector(".text-xs");
    const priceElement = row.querySelector(":scope > .shrink-0");

    if (title === null || (!isSpecial && (metadata === null || metadata.querySelector("span") === null))) {
        throw new Error("Štruktúra jedla Naše Hospoda sa zmenila.");
    }

    const weight = getWeight(title.textContent);
    const nameElement = title.cloneNode(true);
    // Portion and item number are separate spans in this source.
    nameElement.querySelectorAll("span").forEach(function (span) { span.remove(); });
    const name = nameElement.textContent.trim();
    const type = isSpecial ? "Týždenný špeciál" : metadata.querySelector("span").textContent.trim();
    const allergenText = metadata === null ? "" : metadata.textContent.split("Alergény:")[1] || "";
    const allergens = allergenText.replace(/\s+/g, "");
    // A missing price does not mean the meal is free.
    const price = priceElement === null ? null : parsePrice(priceElement.textContent);
    const priceNote = price === null ? "Cena neuvedená" : "";

    if (name === "") {
        throw new Error("V menu Naše Hospoda chýba názov jedla.");
    }

    return { day, date, type, name, price, studentPrice: null, priceNote, allergens, weight };
}

function parseHospoda(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const articles = doc.querySelectorAll("#menu article");
    const items = [];
    let specials = [];
    let foundDays = 0;

    articles.forEach(function (article) {
        const heading = article.querySelector("h3");
        if (heading !== null && heading.textContent.trim() === "Týždenný špeciál") {
            specials = article.querySelectorAll(".divide-y > div");
        }
    });

    articles.forEach(function (article) {
        const label = article.querySelector(".uppercase");
        if (label === null) { return; }
        const day = sourceDayNames.indexOf(label.textContent.trim().toLowerCase());
        if (day < 1) { return; }
        foundDays++;

        const dateElement = article.querySelector(".mt-1.font-bold.text-white");
        if (dateElement === null) {
            throw new Error("V menu Naše Hospoda chýba dátum.");
        }
        const date = parseMenuDate(dateElement.textContent);
        const meals = article.querySelectorAll(".divide-y > div");

        meals.forEach(function (meal) {
            items.push(parseHospodaMeal(meal, day, date, false));
        });

        // Weekly specials apply to days with an open daily menu.
        if (meals.length > 0) {
            specials.forEach(function (meal) {
                items.push(parseHospodaMeal(meal, day, date, true));
            });
        }
    });

    if (foundDays === 0) {
        throw new Error("Štruktúra menu Naše Hospoda sa zmenila.");
    }

    return items;
}

function parseDruzba(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = doc.querySelectorAll(".inner-column h2");
    const items = [];
    let foundDays = 0;

    headings.forEach(function (heading) {
        const label = heading.textContent.trim();
        const day = sourceDayNames.indexOf(label.split(/\s+/)[0].toLowerCase());
        if (day < 1) { return; }
        foundDays++;
        const date = parseMenuDate(label);
        // Each day heading is followed by its menu table.
        const table = heading.parentElement.nextElementSibling;

        if (table === null || table.tagName !== "TABLE") {
            throw new Error("V menu Družba chýba tabuľka jedál.");
        }

        table.querySelectorAll("tr").forEach(function (row) {
            const cells = row.querySelectorAll("td");
            if (cells.length === 0) { return; }
            if (cells.length !== 2) {
                throw new Error("Štruktúra riadka menu Družba sa zmenila.");
            }

            const firstText = cells[0].textContent.trim();
            const priceText = cells[1].textContent.trim();
            // Skip spacer rows and headers made with td cells.
            if ((firstText === "" && priceText === "")
                || (firstText === "Názov" && priceText === "Cena")) { return; }

            // Soup labels and names can be in separate tags.
            let name = firstText.replace(/\s+/g, " ");
            const type = name.startsWith("Polievka") ? "Polievka" : "Hlavné jedlo";
            const weight = getWeight(name);
            // Only a final numeric bracket is an allergen list.
            const allergenMatch = name.match(/\(([\d,\s]+)\)\s*$/);
            const allergens = allergenMatch === null ? "" : allergenMatch[1].replace(/\s+/g, "");
            if (allergenMatch !== null) { name = name.slice(0, allergenMatch.index).trim(); }
            // Drop list numbers, soup label and the first portion.
            name = name.replace(/^[IVX]+\.\s*/, "").replace(/^Polievka\s*/i, "");
            name = name.replace(/^\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\s*:?\s*/i, "").trim();
            if (name === "") { throw new Error("V menu Družba chýba názov jedla."); }

            let price = null;
            let studentPrice = null;
            let priceNote = "";

            if (priceText.toLowerCase() === "v cene menu") {
                priceNote = priceText;
            } else if (/^isic/i.test(priceText)) {
                // Druzba lists ISIC first, regular price second.
                const prices = priceText.replace(/^isic\s*/i, "").split("/");
                if (prices.length !== 2) { throw new Error("Ceny menu Družba sa zmenili."); }
                studentPrice = parsePrice(prices[0]);
                price = parsePrice(prices[1]);
            } else {
                price = parsePrice(priceText);
            }

            items.push({ day, date, type, name, price, studentPrice, priceNote, allergens, weight });
        });
    });

    if (foundDays === 0) {
        throw new Error("Štruktúra menu Družba sa zmenila.");
    }

    return items;
}
