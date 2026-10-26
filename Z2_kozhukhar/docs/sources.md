# Kontrola zdrojov

Kontrola: 26. 10. 2026.

| Zdroj | Adresa | Štruktúra a stav |
| --- | --- | --- |
| Eat & Meet | https://eatandmeet.sk/ | Bloky `#day-1` až `#day-7`, jedlá `.menu-body`, ceny `.price`, alergény `.desc span`. Menu je v HTML; dátum týždňa ani hmotnosti pri kontrolovaných jedlách nie sú uvedené. Prvý implementovaný parser spracuje pondelok až piatok. |
| Naše Hospoda Karloveská | https://www.nasehospoda-karloveska.sk/ | Samostatné HTML karty dní s dátumom, názvom, cenou a alergénmi. Vhodný kandidát na druhý parser. |
| Družba Cantina | https://www.druzbacatering.sk/obedove-menu/ | Tabuľky s nadpismi dní. Pri kontrole boli v HTML iba sobota a nedeľa; pracovné dni treba preveriť pred konečným výberom. Rezervný kandidát. |

Lokálne HTML kópie sú v `data/`. Sú to podklady na parsovanie; ich skripty a štýly sa v aplikácii nespúšťajú ani nevkladajú do hlavného dokumentu.

FreeFood sa nepodarilo bezpečne načítať pre chybu TLS certifikátu. Overovanie certifikátov nebolo vypnuté a tento zdroj nie je zahrnutý.

Projekt načítava lokálne HTML kópie. Proxy sa nepoužíva.

## Spustenie

Projekt otvorte cez lokálny HTTP server, napríklad VS Code Live Server. Pri priamom otvorení `index.html` cez `file://` môže prehliadač blokovať AJAX načítanie lokálnej HTML kópie.
