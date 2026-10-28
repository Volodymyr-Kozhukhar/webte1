# Kontrola zdrojov

Kontrola uložených kópií: 28. 10. 2026. Kópie sú z 26. 10. 2026.

| Zdroj | Adresa | Štruktúra a stav |
| --- | --- | --- |
| Eat & Meet | https://eatandmeet.sk/ | `parseEatAndMeet`: bloky `#day-1` až `#day-7`, jedlá `.menu-body`, ceny `.price`, alergény `.desc span`. Bežná cena je prvá, ISIC druhá. Dátum menu nie je uvedený. |
| Naše Hospoda Karloveská | https://www.nasehospoda-karloveska.sk/ | `parseHospoda`: karty dní v `#menu article`, dátumy, porcie, ceny a alergény. Týždenné špeciály pridávam ku dňom s otvoreným denným menu. Nedeľa je zatvorená. Chýbajúca cena zostáva neuvedená. |
| Družba Cantina | https://www.druzbacatering.sk/obedove-menu/ | `parseDruzba`: nadpis dňa a nasledujúca tabuľka. Uložená kópia obsahuje iba pondelok 26. 10. 2026. ISIC cena je prvá, bežná druhá. Polievka označená „v cene menu“ nemá vymyslenú nulovú cenu. |

Lokálne HTML kópie sú v `data/`. Sú to podklady na parsovanie; ich skripty a štýly sa v aplikácii nespúšťajú ani nevkladajú do hlavného dokumentu.

FreeFood sa nepodarilo bezpečne načítať pre chybu TLS certifikátu. Overovanie certifikátov nebolo vypnuté a tento zdroj nie je zahrnutý.

Projekt načítava lokálne HTML kópie. Proxy sa nepoužíva.

Tri požiadavky spúšťam naraz. `Promise.allSettled()` uchová úspechy aj chyby; každý zdroj má vlastný výsledok a čas načítania. Výber dňa a celého týždňa pracuje s načítanými dátami bez ďalších požiadaviek.

## Spustenie

Projekt otvorte cez lokálny HTTP server, napríklad VS Code Live Server. Pri priamom otvorení `index.html` cez `file://` môže prehliadač blokovať AJAX načítanie lokálnej HTML kópie.
