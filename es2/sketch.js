// PARAMETRI GENERALI E GLOBALI
let livelloMax;          // numero massimo di ricorsioni
let numRami;             // satellite generati a ogni livello
let fattoreScala;        // scala dei figli rispetto al padre
let ampiezzaRotazione;   // quanto si aprono i rami attorno al centro
let torsione;            // rotazione extra a ogni livello, dà la spirale
let hueBase, hueGamma;   // tinta di partenza e quanto sale a ogni livello
let satBase, briBase;    // saturazione e luminosità di base
let struttura;           // ampiezza del wobble del bordo (forme organiche)
let cR, cG, cB;          // colore RGB corrente da stampare sui pixel

// FUNZIONE RICORSIVA
// Le coordinate sono in pixel assoluti: translate/rotate non agiscono
// sull'array pixels, quindi ogni livello ruota i punti da sé.
function disegnaElemento(x, y, s, angolo, livello) {
  // colore della fiamma: varia con livello e angolo, come le mappe di fuga
  let h = hueBase + (livello * hueGamma) / livelloMax + angolo * 25;
  h = ((h % 360) + 360) % 360;
  let c = color(h, satBase, briBase);
  cR = red(c);
  cG = green(c);
  cB = blue(c);

  // intensità che cala ai livelli profondi, per non bruciare i groppi
  let forza = map(livello, 0, livelloMax, 1, 0.30);
  disegnaAmpolla(x, y, s, angolo, forza);

  // satellite: elementi minori ruotati e scalati attorno al corpo
  let nuovoLivello = livello + 1;
  if (nuovoLivello < livelloMax) {
    for (let i = 0; i < numRami; i++) {
      let angRamo =
        angolo +
        ampiezzaRotazione * ((i + 0.5) / numRami - 0.5) +
        torsione * nuovoLivello;
      let dist = s * fattoreScala * (1 + 0.25 * ((i + 0.5) / numRami - 0.5) * 2);
      let sRamo = max(6, s * fattoreScala * (0.9 - livello * 0.08));
      disegnaElemento(
        x + cos(angRamo) * dist,
        y + sin(angRamo) * dist,
        sRamo,
        angRamo,
        nuovoLivello
      );
    }
  }
}

// Stampa su pixels[] un'ampolla soffusa con contorno ondulato:
// il bulbo di Mandelbrot qui è un'ellisse con bordo perturbato da seni.
function disegnaAmpolla(cx, cy, s, angolo, forza) {
  const R = s * 0.42;
  const cosA = cos(angolo);
  const sinA = sin(angolo);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      // punto riportato nel riferimento locale ruotato
      let lx = dx * cosA + dy * sinA;
      let ly = -dx * sinA + dy * cosA;
      // distanza normalizzata dall'ellisse (più stretta che larga)
      let dn = sqrt((lx * lx) / (R * R) + (ly * ly) / (R * R * 0.55));
      // wobble: bordo organico, diverso a ogni scala
      dn += struttura * (sin(lx * 0.13) + cos(ly * 0.17));
      if (dn < 1) {
        plotta(cx + dx, cy + dy, forza * pow(1 - dn, 2.2));
      } else if (dn < 1 + 0.09) {
        // alone sottile sul bordo, richiama i contorni dei frattali
        plotta(cx + dx, cy + dy, forza * 0.5 * (1 - (dn - 1) / 0.09));
      }
    }
  }
}

// somma il colore corrente sul pixel: le sovrapposizioni diventano glow
function plotta(px, py, inten) {
  px |= 0;
  py |= 0;
  if (px < 0 || py < 0 || px >= width || py >= height) return;
  let i = 4 * (py * width + px);
  pixels[i] = min(255, pixels[i] + cR * inten);
  pixels[i + 1] = min(255, pixels[i + 1] + cG * inten);
  pixels[i + 2] = min(255, pixels[i + 2] + cB * inten);
  pixels[i + 3] = 255;
}

// IMPOSTAZIONE PARAMETRI
function setupParametri() {
  livelloMax = int(random(4, 7)); // 4..6: oltre, l'esecuzione cresce troppo
  numRami = int(random(3, 5));    // 3 o 4 autochiamate
  fattoreScala = random(0.55, 0.7);
  ampiezzaRotazione = random(TWO_PI * 0.5, TWO_PI * 0.95);
  torsione = random(-0.6, 0.6);
  hueBase = random(360);
  hueGamma = random(60, 140);
  satBase = random(75, 95);
  briBase = random(70, 95);
  struttura = random(0.05, 0.12);
  redraw();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1); // pixels[] coincide con le coordinate del canvas
  noLoop();
  cursor(HAND);
  colorMode(HSB, 360, 100, 100, 1);
  setupParametri();
}

function draw() {
  background(0, 0, 4); // blu notte quasi nero per far salire i glow
  loadPixels();
  // la ricorsione parte dal bulbo principale al centro
  disegnaElemento(width / 2, height / 2, min(width, height) * 0.5, 0, 0);
  updatePixels();
}

function mouseClicked() {
  setupParametri();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
