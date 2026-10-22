# Code voor sleutelhangers

Bewaard op 22 oktober 2026, bij het weghalen van de sleutelhangers uit
`index.html`. De sleutelhangers waren de ronde edelsteen-badges met een
voortgangsring, die je horizontaal kon doorscrollen en kon aantikken om de
schrifttekst te zien. Ze zijn opgevolgd door de borstplaat.

Hieronder staat alles wat is verwijderd, in de volgorde waarin het in
`index.html` stond. Wil je ze terug, dan is het terugplakken plus de vier
kleine aanpassingen onder "Losse draadjes".

---

## 1. CSS

Stond in de `<style>` in de `<head>`, direct vóór het blok
`/* ── SCROLLBARE CONTAINERS (alle weken + postvak) ── */`.

```css
    /* ── SLEUTELHANGERS (edelstenen badges) ── */
    .sleutel-scroll{display:flex;gap:16px;overflow-x:auto;padding:6px 2px 14px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;}
    .sleutel-scroll::-webkit-scrollbar{height:5px;}
    .sleutel-scroll::-webkit-scrollbar-track{background:#0d2d4a;border-radius:10px;}
    .sleutel-scroll::-webkit-scrollbar-thumb{background:#2a4a6a;border-radius:10px;}
    .sleutel{flex-shrink:0;width:100px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;text-align:center;}
    .sleutel.vervaagd{opacity:0.38;}
    .sleutel.vervaagd .badge-steen{filter:grayscale(0.35);}
    .badge-steen{width:82px;height:82px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border:3px solid;box-shadow:inset 0 3px 10px rgba(0,0,0,0.35),0 2px 6px rgba(0,0,0,0.3);}
    .badge-glans{position:absolute;top:9px;left:20px;width:26px;height:16px;border-radius:50%;background:rgba(255,255,255,0.28);filter:blur(3px);transform:rotate(-25deg);}
    .badge-ring{position:absolute;inset:5px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);}
    .badge-tijd{font-size:18px;font-weight:700;line-height:1;z-index:1;}
    .badge-tijd-lbl{font-size:8px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;margin-top:1px;opacity:0.9;z-index:1;}
    .badge-kern{font-size:8px;font-style:italic;margin-top:2px;opacity:0.95;z-index:1;}
    .sleutel-steen{font-size:9px;color:#c8a400;font-weight:600;margin-bottom:2px;letter-spacing:0.03em;}
    .sleutel-vers{font-size:9px;color:#7ab8d4;line-height:1.35;font-style:italic;padding:0 2px;}
    .badge-check{position:absolute;bottom:-3px;right:-3px;width:21px;height:21px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#6fd8a4,#3d9170 55%,#1d5c44);background-clip:padding-box;border:2px solid rgba(255,255,255,0.42);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;z-index:10;text-shadow:0 1px 2px rgba(0,0,0,0.35);box-shadow:0 0 6px rgba(45,122,90,0.5),inset 0 1px 2px rgba(255,255,255,0.4),inset 0 -2px 3px rgba(0,0,0,0.3);}
    .badge-check::before{content:'';position:absolute;inset:-4px;border-radius:50%;z-index:-1;background:radial-gradient(circle,rgba(61,145,112,0.5),rgba(61,145,112,0) 70%);animation:vinkGloed 3.2s ease-in-out infinite;}
    .badge-lock{position:absolute;bottom:-3px;right:-3px;width:21px;height:21px;border-radius:50%;background:#1a3f5c;border:2px solid #0a2238;display:flex;align-items:center;justify-content:center;color:#7ab8d4;font-size:10px;z-index:10;}

    /* ── FLIP BADGE ── */
    .badge-flip{width:82px;height:82px;perspective:600px;cursor:pointer;margin-bottom:9px;position:relative;overflow:visible;}
    .badge-flip-inner{position:relative;width:100%;height:100%;transition:transform 0.5s;transform-style:preserve-3d;}
    .badge-flip.geflipt .badge-flip-inner{transform:rotateY(180deg);}
    .badge-face{position:absolute;top:0;left:0;width:82px;height:82px;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:50%;display:flex;align-items:center;justify-content:center;}
    .badge-front{z-index:2;}
    .badge-back{transform:rotateY(180deg);background:#0a1626;border:2px solid #1a3f5c;padding:9px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.6);z-index:1;overflow:hidden;}
    /* Extra volle ondoorzichtige laag achter de tekst zodat de voorkant niet doorschijnt */
    .badge-back::before{content:'';position:absolute;inset:0;border-radius:50%;background:#0a1626;z-index:0;}
    .badge-back-tekst{position:relative;z-index:1;font-size:7.5px;line-height:1.35;color:#f0e8d0;font-style:italic;text-align:center;white-space:pre-line;overflow:hidden;}
```

De animatie `@keyframes vinkGloed` hoorde hier ook bij, maar is **niet**
verwijderd: de vinkjes op de borstplaat gebruiken die nu ook. Bij terugzetten
hoef je die dus niet toe te voegen.

---

## 2. HTML

Stond in de Vandaag-pagina, direct vóór `<!-- BORSTPLAAT SECTIE -->`.

```html
    <!-- SLEUTELHANGERS -->
    <div class="card" id="sleutelhangers-card">
      <div class="card-label" style="display:flex;align-items:center;justify-content:space-between;">
        <span><i class="ti ti-diamond"></i> Mijn sleutelhangers</span>
        <span style="font-size:10px;color:#3a6a8c;font-weight:400;">langste eerst →</span>
      </div>
      <div style="font-size:11px;color:#7ab8d4;margin-bottom:12px;font-style:italic;">Naar de borstplaat van de hogepriester — Exodus 28</div>
      <div id="sleutelhangers-scroll" class="sleutel-scroll"></div>
      <div id="sleutelhangers-sub" style="font-size:11px;color:#7ab8d4;line-height:1.5;margin-top:2px;"></div>
    </div>
```

---

## 3. De zichtbaarheidsvlag

Stond boven de mijlpalenlijst. Hiermee werd de kaart verborgen zonder de code
weg te halen — de tussenstap voordat alles eruit ging.

```javascript
// Sleutelhangers tijdelijk verborgen. Zet op true om ze weer te tonen;
// de kaart en alle code blijven gewoon staan, alleen de weergave is uit.
const TOON_SLEUTELHANGERS = false;
```

---

## 4. alleSleutelhangers()

Breidde de vaste mijlpalenlijst uit met een gouden mijlpaal voor elk jaar
vanaf 2 tot en met 10 jaar.

```javascript
// Genereer jaarlijkse gouden mijlpalen vanaf 2 jaar (t/m 10 jaar)
function alleSleutelhangers() {
  const lijst = [...SLEUTELHANGERS];
  for (let jr = 2; jr <= 10; jr++) {
    const achter = jr === 2
      ? '"De Heer is mijn kracht en mijn lied; Hij is mij tot heil geworden" — Exodus 15:2'
      : '"Wie volhardt, ontvangt de belofte" — Hebreeën 10:36';
    lijst.push({
      dagen: 365*jr, tijd:String(jr), eenheid:'jaar', kern:'Trouw', steen:'Goud',
      achter, grad:['#ffd94a','#b8860b'], border:'#ffe87a', txt:'#3a2a00'
    });
  }
  return lijst;
}
```

---

## 5. renderSleutelhangers()

De weergave zelf: badges bouwen, sorteren in behaald / ooit behaald / nog te
gaan, de voortgangsring op de eerstvolgende, en de regel eronder.

```javascript
function renderSleutelhangers() {
  const scroll = document.getElementById('sleutelhangers-scroll');
  const sub = document.getElementById('sleutelhangers-sub');
  if (!scroll) return;

  // De kaart blijft bestaan en wordt gewoon gevuld; alleen verborgen.
  const slKaart = document.getElementById('sleutelhangers-card');
  if (slKaart) slKaart.style.display = TOON_SLEUTELHANGERS ? '' : 'none';

  const huidigeDagen = getDagenDoelbewust();
  // Bijhouden gebeurt in getDagenDoelbewust(); hier alleen uitlezen.
  const hoogsteOoit = hoogsteReeksOoit();

  const alle = alleSleutelhangers();
  const behaald = alle.filter(s => huidigeDagen >= s.dagen).sort((a,b) => b.dagen - a.dagen);
  const ooitBehaald = alle.filter(s => huidigeDagen < s.dagen && hoogsteOoit >= s.dagen).sort((a,b) => b.dagen - a.dagen);
  const nogTeGaan = alle.filter(s => hoogsteOoit < s.dagen).sort((a,b) => a.dagen - b.dagen);

  scroll.innerHTML = '';

  let flipTeller = 0;
  function maakBadge(s, staat, vorigeDrempel) {
    // staat: 'behaald' | 'ooit' | 'todo'
    const isTodo = staat === 'todo';
    const flipId = 'flip-' + (flipTeller++);

    let hoekIcoon = '';
    if (staat === 'behaald') hoekIcoon = '<div class="badge-check"><i class="ti ti-check"></i></div>';
    else if (staat === 'ooit') hoekIcoon = '<div class="badge-check" style="background:#7a6a8a;"><i class="ti ti-check"></i></div>';
    else hoekIcoon = '<div class="badge-lock"><i class="ti ti-lock"></i></div>';

    const badgeStyle = isTodo
      ? 'background:#0d2035;border-color:#1a3f5c;color:#3a6a8c;'
      : `background:radial-gradient(circle at 38% 30%,${s.grad[0]},${s.grad[1]});border-color:${s.border};color:${s.txt};`;
    const glans = isTodo ? '' : '<div class="badge-glans"></div>';

    // Voortgangsring op de eerstvolgende te behalen badge
    let ringHTML = '';
    if (isTodo && vorigeDrempel !== null) {
      const totaalNodig = s.dagen - vorigeDrempel;
      const alGehaald = Math.max(0, huidigeDagen - vorigeDrempel);
      const pct = Math.max(0, Math.min(100, Math.round((alGehaald / totaalNodig) * 100)));
      // SVG voortgangsring — net buiten de badgerand
      const r = 42, omtrek = 2 * Math.PI * r;
      const offset = omtrek * (1 - pct/100);
      ringHTML = `<svg width="90" height="90" viewBox="0 0 90 90" style="position:absolute;top:-4px;left:-4px;transform:rotate(-90deg);pointer-events:none;z-index:5;">
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="#1a3f5c" stroke-width="3"/>
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="#f0a500" stroke-width="3" stroke-linecap="round" stroke-dasharray="${omtrek.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" style="transition:stroke-dashoffset 0.6s;"/>
      </svg>`;
    }

    // Achterkant-tekst
    let achterTekst = s.achter || '';
    if (isTodo) {
      const resterend = s.dagen - huidigeDagen;
      achterTekst = resterend > 0 ? `Nog ${resterend} ${resterend === 1 ? 'dag' : 'dagen'} te gaan tot deze sleutelhanger` : s.achter;
    }
    if (staat === 'ooit') {
      achterTekst = s.achter + '\n\n(Ooit behaald — een teken van kracht)';
    }

    // Voorkant onderschrift
    let onderVers = '';
    let versKleur = '#7ab8d4';
    if (isTodo) {
      const resterend = s.dagen - huidigeDagen;
      onderVers = resterend > 0 ? `Nog ${resterend} ${resterend === 1 ? 'dag' : 'dagen'}` : 'Bijna!';
      versKleur = '#3a6a8c';
    } else if (staat === 'ooit') {
      onderVers = 'Ooit behaald';
    } else {
      onderVers = 'Tik voor de tekst';
    }

    const eenheidHTML = s.eenheid ? `<div class="badge-tijd-lbl">${s.eenheid}</div>` : '';
    const tijdFontSize = s.tijd.length > 2 ? 'font-size:13px;' : '';

    const sleutel = document.createElement('div');
    sleutel.className = 'sleutel' + (staat === 'ooit' ? ' vervaagd' : '');
    sleutel.innerHTML = `
      <div class="badge-flip" id="${flipId}" onclick="this.classList.toggle('geflipt')">
        ${ringHTML}
        <div class="badge-flip-inner">
          <div class="badge-face badge-front">
            <div class="badge-steen" style="${badgeStyle}">
              ${glans}<div class="badge-ring"></div>
              <div class="badge-tijd" style="${tijdFontSize}">${s.tijd}</div>
              ${eenheidHTML}
              <div class="badge-kern">${s.kern}</div>
            </div>
          </div>
          <div class="badge-face badge-back" style="border-color:${isTodo?'#1a3f5c':s.border};">
            <div class="badge-back-tekst">${achterTekst}</div>
          </div>
        </div>
        ${hoekIcoon}
      </div>
      <div class="sleutel-steen" style="${isTodo?'color:#3a6a8c;':''}">${s.steen}</div>
      <div class="sleutel-vers" style="color:${versKleur};">${onderVers}</div>`;
    return sleutel;
  }

  // Bepaal vorige drempel voor de voortgangsring op eerstvolgende badge
  const behaaldeDrempels = alle.filter(s => huidigeDagen >= s.dagen).map(s => s.dagen);
  const vorigeDrempel = behaaldeDrempels.length > 0 ? Math.max(...behaaldeDrempels) : 0;

  behaald.forEach(s => scroll.appendChild(maakBadge(s, 'behaald', null)));
  ooitBehaald.forEach(s => scroll.appendChild(maakBadge(s, 'ooit', null)));
  // Eerstvolgende krijgt de voortgangsring; de 2 daarna niet
  nogTeGaan.slice(0, 3).forEach((s, idx) => {
    scroll.appendChild(maakBadge(s, 'todo', idx === 0 ? vorigeDrempel : null));
  });

  if (sub) {
    if (behaald.length === 0 && ooitBehaald.length === 0) {
      sub.innerHTML = `Je huidige reeks: <b style="color:#e8f4f8;">${huidigeDagen} ${huidigeDagen===1?'dag':'dagen'} sereen en doelbewust</b>. Je eerste sleutelhanger komt eraan!`;
    } else if (ooitBehaald.length > 0) {
      sub.innerHTML = `Huidige reeks: <b style="color:#e8f4f8;">${huidigeDagen} ${huidigeDagen===1?'dag':'dagen'}</b> — vervaagde stenen tonen wat je al bereikte`;
    } else {
      sub.innerHTML = `Huidige reeks: <b style="color:#e8f4f8;">${huidigeDagen} ${huidigeDagen===1?'dag':'dagen'} sereen en doelbewust</b>`;
    }
  }

  updateBorstplaatColors();
}
window.renderSleutelhangers = renderSleutelhangers;
```

---

## Losse draadjes

Vier plekken buiten de blokken hierboven zijn aangepast. Bij terugzetten moet
je deze ook terugdraaien.

**1. Media-query voor minder beweging** (in de CSS, bij `vinkGloed`). Was:

```css
@media (prefers-reduced-motion: reduce) { .bp-check::before, .badge-check::before { animation:none; opacity:0.7; } }
```

Nu staat er alleen `.bp-check::before`.

**2. De veeg-uitzondering** (rond regel 8390, in de swipe-herkenning tussen
tabs). Was:

```javascript
binnenScroll = !!(e.target.closest && e.target.closest('.sleutel-scroll, .badge-flip, .bericht-wrap, .biblio-plank, .lezer-overlay'));
```

`.sleutel-scroll, .badge-flip, ` is eruit gehaald, zodat een veeg over de
badges niet meer als uitzondering gold.

**3. De aanroep.** In de functie die na een check-in alles opnieuw opbouwt,
stond `renderSleutelhangers();`. Die functie eindigde met
`updateBorstplaatColors();`, dus die aanroep is nu rechtstreeks
`updateBorstplaatColors();`.

**4. `window.renderSleutelhangers = renderSleutelhangers;`** stond direct onder
de functie en is meeverwijderd.

---

## Wat NIET is verwijderd

De mijlpalenlijst `SLEUTELHANGERS` staat nog in `index.html`, onder de kop
`// ── MIJLPALEN ──`. De borstplaat haalt daar zijn kernwoorden, schriftteksten
en tijdlabels uit (via `bpMijlpaal()`), dus die lijst mag niet weg. Hieronder
staat hij als naslag, zoals hij op 22 oktober 2026 was.

```javascript
const SLEUTELHANGERS = [
  {dagen:1,    tijd:'1',  eenheid:'dag',   kern:'Rein',       steen:'Wit linnen', achter:'"Al waren uw zonden als scharlaken, zij zullen wit worden als sneeuw" — Jesaja 1:18', grad:['#ffffff','#c8d0d8'], border:'#ffffff', txt:'#3a4a5a'},
  {dagen:40,   tijd:'40', eenheid:'dagen', kern:'Woestijn',   steen:'Topaas',     achter:'"De mens zal niet van brood alleen leven" — Mattheüs 4:4', grad:['#e8d84a','#9a8410'], border:'#f5e97a', txt:'#3a3000'},
  {dagen:30,   tijd:'1',  eenheid:'maand', kern:'Kostbaar',   steen:'Robijn',     achter:'"Kostbaar zijt gij in Mijn ogen, en Ik heb u lief" — Jesaja 43:4', grad:['#e74c5e','#8b1020'], border:'#ff7080', txt:'#fff0f2'},
  {dagen:60,   tijd:'2',  eenheid:'maand', kern:'Leven',      steen:'Smaragd',    achter:'"Ik ben de wijnstok, gij de ranken; wie in Mij blijft, draagt veel vrucht" — Johannes 15:5', grad:['#2ecc71','#0d6b3a'], border:'#4fe89a', txt:'#eafff2'},
  {dagen:90,   tijd:'3',  eenheid:'maand', kern:'Vertrouwen', steen:'Turkoois',   achter:'"Vertrouw op de Heer met heel uw hart" — Spreuken 3:5', grad:['#40c0e0','#1a6a9a'], border:'#7ae0f8', txt:'#04283a'},
  {dagen:120,  tijd:'4',  eenheid:'maand', kern:'Standvast',  steen:'Saffier',    achter:'"Hij zal niet wankelen; als een rots sta ik vast" — Psalm 62:3', grad:['#3a6ad0','#1a2a8a'], border:'#6a9af0', txt:'#eef2ff'},
  {dagen:150,  tijd:'5',  eenheid:'maand', kern:'Zuiver',     steen:'Diamant',    achter:'"Zalig de reinen van hart, want zij zullen God zien" — Mattheüs 5:8', grad:['#ffffff','#b0c4d4'], border:'#e8f4ff', txt:'#3a4a5a'},
  {dagen:180,  tijd:'6',  eenheid:'maand', kern:'Vuur',       steen:'Barnsteen',  achter:'"Laat uw licht schijnen voor de mensen" — Mattheüs 5:16', grad:['#ff9a3c','#b34d10'], border:'#ffb860', txt:'#3a1a00'},
  {dagen:210,  tijd:'7',  eenheid:'maand', kern:'Rust',       steen:'Agaat',      achter:'"Wees stil en weet, Ik ben uw God" — Psalm 46:11', grad:['#d8d0c0','#8a8478'], border:'#e8e0d0', txt:'#3a3830'},
  {dagen:240,  tijd:'8',  eenheid:'maand', kern:'Waardig',    steen:'Amethist',   achter:'"Gij zijt een koninklijk priesterschap, een heilig volk" — 1 Petrus 2:9', grad:['#9b59d0','#4a1a7a'], border:'#b880e8', txt:'#f5eaff'},
  {dagen:270,  tijd:'9',  eenheid:'maand', kern:'Vrucht',     steen:'Aquamarijn', achter:'"De vrucht van de Geest is liefde, blijdschap, vrede" — Galaten 5:22', grad:['#5fd0c0','#1a8a8a'], border:'#8ae8dc', txt:'#04302c'},
  {dagen:300,  tijd:'10', eenheid:'maand', kern:'Diepte',     steen:'Onyx',       achter:'"Zie, Ik heb u in mijn handpalmen gegrift" — Jesaja 49:16', grad:['#4a4a52','#0a0a10'], border:'#5a5a66', txt:'#d0d0d8'},
  {dagen:330,  tijd:'11', eenheid:'maand', kern:'Volharding', steen:'Jaspis',     achter:'"Wie volhardt tot het einde, die zal behouden worden" — Mattheüs 24:13', grad:['#c0a84a','#6a5a10'], border:'#d8c060', txt:'#2a2400'},
  {dagen:365,  tijd:'1',  eenheid:'jaar',  kern:'Trouw',      steen:'Goud',       achter:'"Die op de Heer vertrouwen, vernieuwen hun kracht; zij lopen en worden niet moe" — Jesaja 40:31', grad:['#ffd94a','#b8860b'], border:'#ffe87a', txt:'#3a2a00'},
  {dagen:395,  tijd:'1j 1m', eenheid:'',   kern:'Gewijd',     steen:'Purperen wol',achter:'"Gij zijt een uitverkoren geslacht, God ten eigendom" — 1 Petrus 2:9', grad:['#a03a6a','#5a1a3a'], border:'#c85a8a', txt:'#ffe8f2'},
];
```

Ook gebleven, omdat de borstplaat ze gebruikt:

- `getDagenDoelbewust()` — het aantal dagen sinds de laatste terugval
- `hoogsteReeksOoit()` en `onthoudHoogsteReeks()` — je langste reeks ooit
- `@keyframes vinkGloed` — de gloed om de groene vinkjes
