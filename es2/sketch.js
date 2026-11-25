// PARAMETRI GLOBALI
let livelloMax, numRami, fattoreScala;
let ampiezzaRotazione, torsione;
let hueBase, hueGamma, satBase, briBase;
let ampiezzaForma, frequenzaForma;
let spessoreMin, spessoreMax, alone;
let cR, cG, cB;
let tempo, velocitaNoise;

function disegnaElemento(x, y, s, angolo, livello) {
  const h = (((hueBase + (livello * hueGamma) / livelloMax + angolo * 20) % 360) + 360) % 360;
  // Profondità: i livelli più vicini sono più luminosi, quelli lontani più scuri
  const profondita = map(livello, 0, max(1, livelloMax - 1), 1, 0.45);
  const bri = constrain(briBase * profondita, 15, 100);
  const col = color(h, satBase, bri);
  cR = red(col);
  cG = green(col);
  cB = blue(col);

  const forza = map(livello, 0, livelloMax, 1, 0.55) * (0.65 + 0.35 * profondita);
  const Rcorrente = s * 0.42;
  disegnaAmpolla(x, y, s, angolo, forza, profondita);

  if (livello + 1 < livelloMax) {
    for (let i = 0; i < numRami; i++) {
      const offsetRamo = (i + 0.5) / numRami - 0.5;
      const angRamo = angolo + ampiezzaRotazione * offsetRamo + torsione * (livello + 1);
      const sRamo = max(6, s * fattoreScala * (0.9 - livello * 0.08));
      const Rfiglio = sRamo * 0.42;

      // Contatto continuo: la distanza segue la somma dei raggi con leggera sovrapposizione
      const dist = (Rcorrente + Rfiglio) * 0.78;

      disegnaElemento(
        x + cos(angRamo) * dist,
        y + sin(angRamo) * dist,
        sRamo,
        angRamo,
        livello + 1
      );
    }
  }
}

function disegnaAmpolla(cx, cy, s, angolo, forza, profondita) {
  const R = s * 0.42;
  const Rmax = ceil(R * (1 + 0.5 * ampiezzaForma) + alone);
  // Spessore random a ogni frame: dà il tremolio
  const spessore = random(spessoreMin, spessoreMax) * (0.75 + 0.4 * profondita);
  // Offset del noise legati alla posizione (stesso pattern per la stessa ampolla) e al tempo (scorrimento continuo)
  const offX = cx * 0.013 + tempo;
  const offY = cy * 0.013 - tempo * 0.6;
  const cosA = cos(angolo);
  const sinA = sin(angolo);

  // Direzione luce fissa (dall'alto a sinistra) per dare volume 3D
  const lxLight = -0.6;
  const lyLight = -0.8;

  for (let dy = -Rmax; dy <= Rmax; dy++) {
    for (let dx = -Rmax; dx <= Rmax; dx++) {
      const lx = dx * cosA + dy * sinA;
      const ly = -dx * sinA + dy * cosA;
      const dn = sqrt((lx * lx) / (R * R) + (ly * ly) / (R * R * 0.55));
      const theta = atan2(ly, lx);

      const rumore = constrain(
        noise(cos(theta) * frequenzaForma + offX, sin(theta) * frequenzaForma + offY),
        0,
        1
      );
      const bordo = 1 + ampiezzaForma * (rumore - 0.9);
      const distBordo = abs(dn - bordo) * R;

      // Shading 3D: bombatura interna + luce direzionale sul contorno
      const bombatura = constrain(1 - dn / max(0.001, bordo), 0, 1);
      const luce = constrain(
        0.55 + 0.45 * ((dx / max(1, Rmax)) * lxLight + (dy / max(1, Rmax)) * lyLight),
        0.2,
        1.35
      );

      if (distBordo < spessore) {
        const profilo = 1 - distBordo / spessore;
        plotta(cx + dx, cy + dy, forza * profilo * luce);
      } else if (distBordo < spessore + alone) {
        const sfumatura = 1 - (distBordo - spessore) / alone;
        plotta(cx + dx, cy + dy, forza * 0.45 * sfumatura * (0.6 + 0.4 * luce));
      } else if (dn < bordo) {
        // Leggero riempimento interno sfumato per far percepire il volume dell'ampolla
        plotta(cx + dx, cy + dy, forza * 0.12 * bombatura * luce);
      }
    }
  }
}

function plotta(px, py, inten) {
  px |= 0;
  py |= 0;
  if (px < 0 || py < 0 || px >= width || py >= height) return;

  const i = 4 * (py * width + px);
  pixels[i] = min(255, pixels[i] + cR * inten);
  pixels[i + 1] = min(255, pixels[i + 1] + cG * inten);
  pixels[i + 2] = min(255, pixels[i + 2] + cB * inten);
  pixels[i + 3] = 255;
}

function setupParametri() {
  livelloMax = int(random(4, 7));
  numRami = int(random(3, 5));
  fattoreScala = random(0.55, 0.75);
  ampiezzaRotazione = random(TWO_PI * 0.5, TWO_PI * 0.95);
  torsione = random(-0.6, 0.6);
  hueBase = random(360);
  hueGamma = random(60, 140);
  satBase = 100;
  briBase = random(90, 100);
  ampiezzaForma = random(0.2, 0.45);
  frequenzaForma = random(1.5, 3.5);
  spessoreMin = random(1.5, 2.5);
  spessoreMax = random(4, 6);
  alone = random(5, 9);
  // Progressione del noise più rapida
  tempo = 0;
  velocitaNoise = random(0.01, 0.03);
  redraw();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(20);
  cursor(HAND);
  colorMode(HSB, 360, 100, 100, 1);
  setupParametri();
}

function draw() {
  background(0, 0, 4);
  loadPixels();
  disegnaElemento(width / 2, height / 2, min(width, height) * 0.5, 0, 0);
  updatePixels();
  tempo += velocitaNoise;
}

function mouseClicked() {
  setupParametri();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}