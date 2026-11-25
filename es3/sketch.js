// Creatura: una colonia di meduse geometriche timide e permalose.
// Stato interno: l'allarme del gruppo cresce vicino al mouse e rientra lentamente.
// Interazione: le meduse scappano dal mouse, crescono col movimento del mouse e fanno un lampo col volume del microfono.
// Regole: il gruppo fluttua con noise(); vicino al mouse ogni medusa fugge per conto suo.
// Per il microfono: https://cdn.jsdelivr.net/npm/p5.sound@0.4.1/dist/p5.sound.min.js
// Guida p5.sound.js: https://codestesie.it/guide/p5sound-p5js2/
// Consegna: https://codestesie.it/aa2627/ca/attivita/es3/

const numeroMeduse = 1;
const ampiezzaGruppo = 190;
const raggioAttenzioneGruppo = 200;
const velocitaFluttuazione = 1.25;
const velocitaFugaMassima = 4.5;
const accelerazioneCalma = 0.025;
const accelerazioneFugaMassima = 0.18;
const rispostaAllarme = 1.0;
const ritornoCalma = 0.01;
const velocitaNoise = 0.0015;
const margineCanvas = 120;
const opacitaSfondo = 18;
const volumeSuonoBasso = 0.0015;
const volumeSuonoAlto = 0.012;
const sogliaAccensioneRumore = 0.3;
const ritardoStella = 0.16;

const larghezzaOmbrella = 100;
const altezzaOmbrella = 58;
const numeroTentacoli = 7;
const lunghezzaTentacoli = 105;
const segmentiTentacolo = 10;
const ampiezzaOndeggiamento = 18;
const velocitaOndeggiamento = 0.0015;

const velocitaAccensione = 0.65;
const velocitaSpegnimento = 0.35;

const numeroBollicine = 45;
const numeroAlghe = 22;
const scalaBaseMedusa = 0.32;
const sensibilitaCrescitaMouse = 0.003;
const decadimentoCrescita = 0.0035;

let meduse = [];
let bollicine = [];
let alghe = [];
let gruppoX = 0;
let gruppoY = 0;
let velocitaGruppoX = 0;
let velocitaGruppoY = 0;
let allarmeGruppo = 0;
let stellaX = 0;
let stellaY = 0;
let velocitaStellaX = 0;
let velocitaStellaY = 0;
let spintaCrescitaMouse = 0;
let bagliore = 0;
let microfono;
let analisiVolume;

function setup() {
  const tela = createCanvas(windowWidth, windowHeight);
  tela.style('cursor', 'default');
  colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < numeroMeduse; i++) {
    meduse.push(creaMedusa(i));
  }

  for (let i = 0; i < numeroBollicine; i++) {
    bollicine.push(creaBollicina());
  }

  for (let i = 0; i < numeroAlghe; i++) {
    alghe.push(creaAlga(i, numeroAlghe));
  }

  microfono = new p5.AudioIn();
  analisiVolume = new p5.Amplitude();
  analisiVolume.smooth(0.9);
  microfono.disconnect();
  microfono.connect(analisiVolume);
  microfono.start();
}

function mousePressed() {
  if (typeof userStartAudio === 'function') {
    userStartAudio();
  }
}

function mouseMoved() {
  const spostamento = dist(mouseX, mouseY, pmouseX, pmouseY);
  spintaCrescitaMouse = constrain(
    spintaCrescitaMouse + spostamento * sensibilitaCrescitaMouse,
    0,
    1
  );
}

function draw() {
  // Blu marino profondo con leggera scia
  background(222, 85, 13, opacitaSfondo);

  aggiornaBollicine();
  disegnaBollicine();
  disegnaAlghe();

  aggiornaMovimento();
  aggiornaBagliore();

  push();
  translate(width / 2, height / 2);

  // Ombra morbida sugli oggetti verso il fondale
  for (const medusa of meduse) {
    disegnaOmbraOggetto(medusa);
  }

  for (const medusa of meduse) {
    push();
    translate(medusa.x, medusa.y);
    scale(medusa.scala);
    disegnaMedusa(medusa);
    pop();
  }
  pop();

  disegnaIstruzioni();
}

function disegnaOmbraOggetto(medusa) {
  push();
  noStroke();
  const distanzaDalFondo = max(60, height * 0.5 - medusa.y);
  const fattoreOmbra = constrain(1 - distanzaDalFondo / height, 0.15, 0.85);
  const raggioOmbra = larghezzaOmbrella * medusa.scala * (0.65 + fattoreOmbra * 0.45);
  fill(225, 92, 5, 18 * fattoreOmbra);
  ellipse(medusa.x + 14, height * 0.5 - 22, raggioOmbra * 1.35, raggioOmbra * 0.25);
  pop();
}

function disegnaIstruzioni() {
  push();
  noStroke();
  fill(220, 75, 10, 75);
  rect(18, 18, 290, 52, 8);

  fill(185, 25, 96, 95);
  textSize(13);
  textAlign(LEFT, TOP);
  text('Muovi il mouse per farla scappare e crescere', 28, 26);
  text('Fai rumore per farla illuminare', 28, 46);
  pop();
}

function creaBollicina() {
  const profondita = random(0.3, 1.0);
  return {
    x: random(width),
    y: random(height),
    profondita: profondita,
    raggio: random(3, 15) * profondita,
    velocitaY: random(0.4, 1.4) * (0.6 + profondita * 0.6),
    fase: random(TWO_PI),
    trasparenza: random(14, 36) * profondita
  };
}

function aggiornaBollicine() {
  for (const b of bollicine) {
    b.y -= b.velocitaY;
    b.x += sin(frameCount * 0.02 + b.fase) * (0.3 + b.profondita * 0.35);
    if (b.y < -25) {
      b.y = height + 25;
      b.x = random(width);
    }
  }
}

function disegnaBollicine() {
  push();
  for (const b of bollicine) {
    const luminosita = 65 + b.profondita * 35;
    // Corpo trasparente + ombra sul lato inferiore destro + punto luce in alto a sinistra
    fill(190, 35, luminosita, b.trasparenza * 0.4);
    stroke(185, 30, 100, b.trasparenza);
    strokeWeight(0.8 + b.profondita * 0.8);
    circle(b.x, b.y, b.raggio * 2);

    noStroke();
    fill(225, 80, 12, b.trasparenza * 0.45);
    arc(b.x, b.y, b.raggio * 1.85, b.raggio * 1.85, -0.2, PI * 0.85, CHORD);

    fill(180, 15, 100, b.trasparenza * 0.85);
    circle(b.x - b.raggio * 0.35, b.y - b.raggio * 0.35, max(1.5, b.raggio * 0.45));
  }
  pop();
}

function creaAlga(indice, totale) {
  const baseX = map(indice, 0, max(1, totale - 1), 25, width - 25);
  const profondita = random(0.35, 1.0);
  return {
    x: baseX + random(-18, 18),
    profondita: profondita,
    altezza: random(65, 165) * (0.65 + profondita * 0.45),
    segmenti: 8,
    spessore: random(4, 10) * (0.6 + profondita * 0.5),
    tinta: random(145, 178),
    fase: random(TWO_PI)
  };
}

function disegnaAlghe() {
  push();
  noFill();
  strokeCap(ROUND);
  const tempo = millis() * 0.0014;
  for (const alga of alghe) {
    const lumOmbra = 16 + alga.profondita * 18;
    const lumLuce = 34 + alga.profondita * 34;
    const alphaAlga = 38 + alga.profondita * 42;

    // Lato in ombra dell'alga
    stroke(alga.tinta, 70, lumOmbra, alphaAlga);
    strokeWeight(alga.spessore);
    beginShape();
    for (let s = 0; s <= alga.segmenti; s++) {
      const t = s / alga.segmenti;
      const onda = sin(tempo + alga.fase + t * 2.8) * (6 + t * 18) * alga.profondita;
      const px = alga.x + onda + 1.5;
      const py = height - t * alga.altezza;
      vertex(px, py);
    }
    endShape();

    // Lato illuminato dell'alga
    stroke(alga.tinta - 8, 55, lumLuce, alphaAlga * 0.85);
    strokeWeight(max(1.5, alga.spessore * 0.45));
    beginShape();
    for (let s = 0; s <= alga.segmenti; s++) {
      const t = s / alga.segmenti;
      const onda = sin(tempo + alga.fase + t * 2.8) * (6 + t * 18) * alga.profondita;
      const px = alga.x + onda - 1.5;
      const py = height - t * alga.altezza;
      vertex(px, py);
    }
    endShape();
  }
  pop();
}

function calcolaScalaMassima() {
  // Limita la dimensione massima a circa un quarto della grandezza del canvas
  const dimensioneRiferimento = min(width, height) * 0.25;
  const ingombroBase = max(larghezzaOmbrella, lunghezzaTentacoli + altezzaOmbrella * 0.5);
  return max(scalaBaseMedusa, dimensioneRiferimento / ingombroBase);
}

function aggiornaMovimento() {
  spintaCrescitaMouse = max(0, spintaCrescitaMouse - decadimentoCrescita);

  const mouseXLocale = mouseX - width / 2;
  const mouseYLocale = mouseY - height / 2;
  const mouseNelCanvas =
    mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;

  const obiettivoStellaX = mouseNelCanvas ? mouseXLocale : stellaX;
  const obiettivoStellaY = mouseNelCanvas ? mouseYLocale : stellaY;
  velocitaStellaX = lerp(velocitaStellaX, obiettivoStellaX - stellaX, ritardoStella);
  velocitaStellaY = lerp(velocitaStellaY, obiettivoStellaY - stellaY, ritardoStella);
  stellaX += velocitaStellaX;
  stellaY += velocitaStellaY;

  const distanzaStellaDalGruppo = dist(stellaX, stellaY, gruppoX, gruppoY);
  let vicinanzaMassima = mouseNelCanvas
    ? constrain(1 - distanzaStellaDalGruppo / raggioAttenzioneGruppo, 0, 1)
    : 0;

  if (mouseNelCanvas) {
    for (const medusa of meduse) {
      const d = dist(stellaX, stellaY, medusa.x, medusa.y);
      const v = constrain(1 - d / raggioAttenzioneGruppo, 0, 1);
      if (v > vicinanzaMassima) vicinanzaMassima = v;
    }
  }

  const allarmeObiettivo = pow(vicinanzaMassima, 1.2);
  const risposta = allarmeObiettivo > allarmeGruppo
    ? rispostaAllarme
    : ritornoCalma;
  allarmeGruppo = lerp(allarmeGruppo, allarmeObiettivo, risposta);

  const tempoNoise = millis() * velocitaNoise;
  const derivaGruppoX = map(
    noise(tempoNoise, 100),
    0,
    1,
    -velocitaFluttuazione,
    velocitaFluttuazione
  );
  const derivaGruppoY = map(
    noise(tempoNoise, 200),
    0,
    1,
    -velocitaFluttuazione,
    velocitaFluttuazione
  );
  let fugaGruppoX = 0;
  let fugaGruppoY = 0;

  if (distanzaStellaDalGruppo > 0.001 && vicinanzaMassima > 0) {
    const intensitaFuga = velocitaFugaMassima * allarmeGruppo * vicinanzaMassima;
    fugaGruppoX = ((gruppoX - stellaX) / distanzaStellaDalGruppo) * intensitaFuga;
    fugaGruppoY = ((gruppoY - stellaY) / distanzaStellaDalGruppo) * intensitaFuga;
  }

  const accelerazioneGruppo = lerp(
    accelerazioneCalma,
    accelerazioneFugaMassima,
    allarmeGruppo
  );
  velocitaGruppoX = lerp(
    velocitaGruppoX,
    derivaGruppoX + fugaGruppoX,
    accelerazioneGruppo
  );
  velocitaGruppoY = lerp(
    velocitaGruppoY,
    derivaGruppoY + fugaGruppoY,
    accelerazioneGruppo
  );
  gruppoX += velocitaGruppoX;
  gruppoY += velocitaGruppoY;

  const limiteX = max(0, width / 2 - margineCanvas);
  const limiteY = max(0, height / 2 - margineCanvas);
  gruppoX = constrain(gruppoX, -limiteX, limiteX);
  gruppoY = constrain(gruppoY, -limiteY, limiteY);

  const scalaMassima = calcolaScalaMassima();
  const scalaObiettivo = lerp(scalaBaseMedusa, scalaMassima, spintaCrescitaMouse);

  for (const medusa of meduse) {
    medusa.scala = lerp(medusa.scala, scalaObiettivo, 0.08);

    const bersaglioX = gruppoX + medusa.offsetX;
    const bersaglioY = gruppoY + medusa.offsetY;
    const derivaIndividualeX = map(
      noise(medusa.offsetNoiseX, tempoNoise),
      0,
      1,
      -velocitaFluttuazione,
      velocitaFluttuazione
    );
    const derivaIndividualeY = map(
      noise(medusa.offsetNoiseY, tempoNoise),
      0,
      1,
      -velocitaFluttuazione,
      velocitaFluttuazione
    );
    const distanzaStella = dist(stellaX, stellaY, medusa.x, medusa.y);
    const vicinanzaStella = mouseNelCanvas
      ? constrain(1 - distanzaStella / raggioAttenzioneGruppo, 0, 1)
      : 0;
    const intensitaFuga =
      medusa.velocitaFuga * (0.4 + allarmeGruppo * 0.85) * vicinanzaStella;
    let fugaX = 0;
    let fugaY = 0;

    if (distanzaStella > 0.001 && intensitaFuga > 0) {
      fugaX = ((medusa.x - stellaX) / distanzaStella) * intensitaFuga;
      fugaY = ((medusa.y - stellaY) / distanzaStella) * intensitaFuga;
    }

    if (vicinanzaStella > 0.03 || allarmeGruppo > 0.02) {
      medusa.velocitaX = lerp(
        medusa.velocitaX,
        derivaIndividualeX + fugaX,
        medusa.accelerazioneFuga
      );
      medusa.velocitaY = lerp(
        medusa.velocitaY,
        derivaIndividualeY + fugaY,
        medusa.accelerazioneFuga
      );
      medusa.x += medusa.velocitaX;
      medusa.y += medusa.velocitaY;
    } else {
      medusa.x = lerp(
        medusa.x,
        bersaglioX + derivaIndividualeX,
        medusa.adesioneGruppo
      );
      medusa.y = lerp(
        medusa.y,
        bersaglioY + derivaIndividualeY,
        medusa.adesioneGruppo
      );
      medusa.velocitaX = 0;
      medusa.velocitaY = 0;
    }

    const limiteMedusaX = max(0, width / 2 - margineCanvas);
    const limiteMedusaY = max(0, height / 2 - margineCanvas);
    medusa.x = constrain(medusa.x, -limiteMedusaX, limiteMedusaX);
    medusa.y = constrain(medusa.y, -limiteMedusaY, limiteMedusaY);
  }
}

function creaMedusa(indice) {
  const angolo = random(TWO_PI);
  const distanza = random(25, ampiezzaGruppo);
  return {
    x: cos(angolo) * distanza,
    y: sin(angolo) * distanza,
    velocitaX: 0,
    velocitaY: 0,
    scala: scalaBaseMedusa,
    adesioneGruppo: random(0.035, 0.075),
    velocitaFuga: random(9, velocitaFugaMassima),
    accelerazioneFuga: random(0.12, 0.2),
    offsetX: cos(angolo) * distanza,
    offsetY: sin(angolo) * distanza,
    offsetNoiseX: random(1000) + indice * 20,
    offsetNoiseY: random(1000) + indice * 20
  };
}

function aggiornaBagliore() {
  const livello = analisiVolume ? analisiVolume.getLevel() : 0;
  const sogliaRumore = lerp(
    volumeSuonoBasso,
    volumeSuonoAlto,
    sogliaAccensioneRumore
  );
  const baglioreObiettivo = constrain(
    map(livello, sogliaRumore, volumeSuonoAlto, 0, 1),
    0,
    1
  );
  const velocita = baglioreObiettivo > bagliore ? velocitaAccensione : velocitaSpegnimento;
  bagliore = lerp(bagliore, baglioreObiettivo, velocita);
}

function disegnaMedusa(medusa) {
  const tintaOmbrella = lerpColor(color(190, 45, 55), color(175, 85, 100), bagliore);
  const tintaTentacoli = lerpColor(color(185, 55, 75), color(165, 75, 100), bagliore);
  const coloreAlone = color(180, 65, 100, 8 + bagliore * 42);
  const tempoOndeggiamento = millis() * velocitaOndeggiamento;

  // Alone luminoso esterno
  noFill();
  stroke(coloreAlone);
  strokeWeight(14 + bagliore * 12);
  arc(0, 0, larghezzaOmbrella, altezzaOmbrella, PI, TWO_PI, CHORD);
  line(-larghezzaOmbrella / 2, 0, larghezzaOmbrella / 2, 0);

  // Corpo principale dell'ombrella
  stroke(tintaOmbrella);
  strokeWeight(2 + bagliore * 2);
  fill(lerpColor(color(190, 45, 48, 82), color(175, 45, 100, 100), bagliore));
  arc(0, 0, larghezzaOmbrella, altezzaOmbrella, PI, TWO_PI, CHORD);

  // Ombra interna nella parte bassa dell'ombrella
  noStroke();
  fill(220, 75, 22, 38);
  arc(0, -2, larghezzaOmbrella * 0.92, altezzaOmbrella * 0.35, 0, PI, CHORD);

  // Punto luce in alto a sinistra sull'ombrella
  fill(180, 20, 100, 28 + bagliore * 25);
  arc(-larghezzaOmbrella * 0.14, -altezzaOmbrella * 0.16, larghezzaOmbrella * 0.42, altezzaOmbrella * 0.36, PI, TWO_PI, CHORD);

  stroke(tintaOmbrella);
  strokeWeight(2 + bagliore * 2);
  line(-larghezzaOmbrella / 2, 0, larghezzaOmbrella / 2, 0);

  disegnaTentacoli(tempoOndeggiamento, coloreAlone, 12 + bagliore * 10);
  disegnaTentacoli(tempoOndeggiamento, tintaTentacoli, 1.5 + bagliore);
}

function disegnaTentacoli(tempoOndeggiamento, colore, spessore) {
  noFill();
  stroke(colore);
  strokeWeight(spessore);
  for (let i = 0; i < numeroTentacoli; i++) {
    const partenzaX = map(i, 0, numeroTentacoli - 1, -larghezzaOmbrella * 0.38, larghezzaOmbrella * 0.38);
    beginShape();

    for (let segmento = 0; segmento <= segmentiTentacolo; segmento++) {
      const progresso = segmento / segmentiTentacolo;
      const onda = noise(i * 0.7, progresso * 1.8, tempoOndeggiamento) - 0.5;
      const oscillazione = sin(tempoOndeggiamento * 2 + i * 0.8 + progresso * 3);
      const x = partenzaX + progresso * ampiezzaOndeggiamento * (onda * 2 + oscillazione);
      const y = progresso * lunghezzaTentacoli;
      vertex(x, y);
    }

    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  for (let i = 0; i < alghe.length; i++) {
    alghe[i].x = map(i, 0, max(1, alghe.length - 1), 25, width - 25);
  }
}