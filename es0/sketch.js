// E0. Un pioniere rimesso in movimento
//
// Opera di riferimento: "Arabesque" (1975) di John Whitney Sr.
// Composizione di ellissi concentriche, ruotate una rispetto all'altra, su
// fondo nero. Il colore va dal giallo del centro al ciano e al magenta
// dell'esterno. L'animazione nasce dentro la logica dell'opera: gli anelli
// ruotano a velocita' diverse e il loro raggio respira, cosi' le linee si
// sovrappongono in un reticolo che si espande e si contrae.
//
// Interazione, comandata dal solo dito indice ripreso dalla webcam
// (ml5.js HandPose):
//   posizione X      -> velocita' di rotazione (a sinistra gira al contrario)
//   posizione Y      -> scala dell'intera composizione (in alto ingrandisce)
//   velocita'        -> scioglie e spezza le linee
//   spostamento      -> cambia la forma (eccentricita' e reticolo) e i colori
//   movimento        -> un tono tenue sale e scende con il dito (p5.sound)
//
// Vincoli ricavati dalle specifiche (E0):
// - riprodurre fedelmente l'opera scelta, con parametri numerici espliciti;
// - far variare i parametri fissati nel tempo o in base alle azioni di chi
//   guarda, senza aggiungere animazioni estranee all'opera.

// --- Dimensioni ---
const larghezzaTela = 600;
const altezzaTela = 600; 

// --- Geometria degli anelli ---
const numeroAnelli = 60;         // quanti ovali concentrici
const passoRaggi = 5;            // distanza in pixel tra un anello e il successivo

// La forma cambia a ogni movimento del dito: eccentricita' e rotazione
// scorrono verso questi valori.
let eccentricita = 0.45;         // schiacciamento degli ovali (1 = cerchio)
let sfasamentoRotazione = 3;     // gradi di rotazione aggiunti a ogni anello
let eccentricitaVoluta = 0.45;   // dove la forma sta andando
let sfasamentoVoluto = 3;

// --- Colore (gradiente dal centro verso l'esterno) ---
const coloreCentro = [255, 235, 0];    // giallo brillante
const coloreMedio = [0, 255, 200];     // ciano/verde
const coloreEsterno = [255, 0, 255];   // magenta

// --- Animazione ---
const velocitaRotazioneBase = 20;  // gradi al secondo dell'anello piu' interno
const differenzaVelocita = 0.3;    // gradi in piu' guadagnati da ogni anello
const ampiezzaPulsazione = 12;     // di quanti pixel respira il raggio
const velocitaPulsazione = 1.5;    // quante pulsazioni al secondo

// --- Deformazione delle linee, in base alla velocita' del dito ---
const puntiPerAnello = 90;        // quanti punti compongono ogni ovale
const ampiezzaScioglimento = 45;  // spostamento massimo dei punti, in pixel
const sogliaRottura = 0.9;        // oltre questa soglia i tratti iniziano a mancare
const velocitaRiferimento = 20;   // pixel di spostamento del dito = velocita' 1

// Spostamento del dito (in frazione di schermo) che fa cambiare forma e colore.
const distanzaMovimento = 0.1;

// --- Suono ---
// Un tono sinusoidale molto tenue accompagna il dito: l'altezza segue la
// posizione verticale (dito in alto = nota acuta, in basso = nota grave), il
// volume resta basso e si alza appena mentre il dito si muove. Parte al primo
// clic, perche' i browser non lasciano partire l'audio da soli.
const frequenzaGrave = 196;           // Hz con il dito in basso
const frequenzaAcuta = 494;           // Hz con il dito in alto
const volumeRiposo = 0.01;            // volume base con il dito presente
const volumeMovimento = 0.06;         // volume in piu' con il dito alla massima velocita'
const velocitaAssestamentoTono = 0.1; // quanto in fretta il tono insegue il valore voluto

let oscillatore;
let frequenzaTono = (frequenzaGrave + frequenzaAcuta) / 2;
let volumeTono = 0;

// --- Avviso in basso per attivare il suono ---
const testoAvviso = "clicca per attivare il suono";
const durataAvviso = 6;       // secondi prima che l'avviso sparisca
const dissolvenzaAvviso = 1;  // secondi della dissolvenza finale

let tempoAvviso = durataAvviso;

// --- Stato dell'interazione (valori smussati, per non tremare) ---
let velocitaRotazione = 1;
let scala = 1;
let scorrimentoColore = 0;
let scorrimentoColoreVoluto = 0;

// Il dito indice: posizione normalizzata 0..1.
let dito = { x: 0.5, y: 0.5, presente: false };

// Movimento del dito: la velocita' obiettivo viene misurata a ogni rilevamento,
// quella usata dal disegno la insegue e decade da sola.
let velocitaMano = 0;
let velocitaManoObiettivo = 0;
let puntaPrecedente = null;

// Ultimo punto in cui forma e colore sono cambiati.
let ultimoPuntoMano = null;

let manoPose;
let video;
let coloreCentroPronto;
let coloreMedioPronto;
let coloreEsternoPronto;

// Fasi accumulate nel tempo: cosi' l'angolo resta continuo anche quando la
// velocita' cambia con il movimento del dito.
let faseRotazione = 0;
let fasePulsazione = 0;
let faseRumore = 0;

async function setup() {
  createCanvas(larghezzaTela, altezzaTela);

  coloreCentroPronto = color(...coloreCentro);
  coloreMedioPronto = color(...coloreMedio);
  coloreEsternoPronto = color(...coloreEsterno);

  // p5 2 non usa piu' preload(): i modelli si caricano con await.
  try {
    manoPose = await ml5.handPose();
    video = createCapture(VIDEO);
    video.size(larghezzaTela, altezzaTela);
    video.hide();
    manoPose.detectStart(video, aggiornaMano);
  } catch (errore) {
    // Senza webcam la composizione continua ad animarsi da sola.
    console.log("HandPose non disponibile: la composizione va avanti senza dito.", errore);
  }

  // Il tono: una sinusoide, la forma d'onda piu' dolce. Nasce muto e si accende
  // al primo clic, quando il browser concede l'audio.
  try {
    oscillatore = new p5.Oscillator(frequenzaTono, "sine");
    oscillatore.amp(0);
  } catch (errore) {
    console.log("p5.sound non disponibile: la composizione resta muta.", errore);
  }
}

// L'audio puo' partire solo dopo un gesto: il primo clic accende il tono.
function mousePressed() {
  tempoAvviso = 0;
  if (!oscillatore || oscillatore.started) return;
  userStartAudio();
  oscillatore.start();
}

// Usa solo la punta del dito indice.
function aggiornaMano(mani) {
  if (mani.length === 0) {
    dito.presente = false;
    puntaPrecedente = null;
    return;
  }
  const punta = mani[0].index_finger_tip;

  dito.x = punta.x / video.width;
  dito.y = punta.y / video.height;

  // La velocita' e' lo spostamento della punta rispetto al rilevamento prima.
  if (puntaPrecedente) {
    const spostamento = dist(punta.x, punta.y, puntaPrecedente.x, puntaPrecedente.y);
    velocitaManoObiettivo = constrain(spostamento / velocitaRiferimento, 0, 1);
  }
  puntaPrecedente = { x: punta.x, y: punta.y };

  dito.presente = true;
}

function draw() {
  background(0);
  noFill();
  aggiornaControlli();

  const secondi = deltaTime / 1000;
  faseRotazione += secondi * velocitaRotazione;
  fasePulsazione += secondi * velocitaPulsazione;
  faseRumore += secondi * 0.25;

  // La velocita' insegue il valore misurato e decade da sola: quando il dito
  // si ferma, le linee tornano ovali puliti.
  velocitaMano = lerp(velocitaMano, velocitaManoObiettivo, 0.35);
  velocitaManoObiettivo *= 0.95;

  // Forma e colore raggiungono i valori scelti dolcemente.
  eccentricita = lerp(eccentricita, eccentricitaVoluta, 0.08);
  sfasamentoRotazione = lerp(sfasamentoRotazione, sfasamentoVoluto, 0.08);
  scorrimentoColore = lerp(scorrimentoColore, scorrimentoColoreVoluto, 0.08);

  gestisciMovimento();
  aggiornaSuono();

  push();
  translate(width / 2, height / 2);
  scale(scala);
  disegnaAnelli();
  pop();

  disegnaAvviso();
}

// L'avviso in basso: sparisce da solo dopo alcuni secondi, o subito al clic
// che accende il suono.
function disegnaAvviso() {
  if (tempoAvviso <= 0) return;

  tempoAvviso -= deltaTime / 1000;
  const opacita = constrain(tempoAvviso / dissolvenzaAvviso, 0, 1);

  push();
  noStroke();
  fill(255, 255 * opacita);
  textAlign(CENTER, CENTER);
  textSize(13);
  text(testoAvviso, width / 2, height - 24);
  pop();
}

// Traduce la posizione del dito in rotazione e scala.
function aggiornaControlli() {
  let velocitaVoluta = 1;
  let scalaVoluta = 1;

  if (dito.presente) {
    // Dito a sinistra: rotazione inversa; a destra: rotazione diretta.
    velocitaVoluta = map(dito.x, 0, 1, -2.5, 2.5);
    // Dito in alto: ingrandisce; in basso: rimpicciolisce.
    scalaVoluta = map(dito.y, 0, 1, 1.5, 0.6);
  }

  // lerp() insegue il valore voluto, cosi' i bruschi scarti diventano fluidi.
  velocitaRotazione = lerp(velocitaRotazione, velocitaVoluta, 0.05);
  scala = lerp(scala, scalaVoluta, 0.05);
}

// Quando il dito si e' spostato abbastanza dall'ultimo cambio, forma e colore
// passano a nuovi valori; restando fermo, restano come sono.
function gestisciMovimento() {
  if (!dito.presente) return;

  if (!ultimoPuntoMano) {
    ultimoPuntoMano = { x: dito.x, y: dito.y };
    return;
  }

  if (dist(dito.x, dito.y, ultimoPuntoMano.x, ultimoPuntoMano.y) >= distanzaMovimento) {
    cambiaForma();
    ultimoPuntoMano = { x: dito.x, y: dito.y };
  }
}

// La nuova forma segue la posizione verticale: in alto ovali tondi, in basso
// schiacciati; il reticolo e il colore prendono valori nuovi.
function cambiaForma() {
  eccentricitaVoluta = map(dito.y, 0, 1, 0.9, 0.25) + random(-0.1, 0.1);
  eccentricitaVoluta = constrain(eccentricitaVoluta, 0.2, 0.95);
  sfasamentoVoluto = random(0, 12);
  scorrimentoColoreVoluto = random(0, 1);
}

// Il tono segue il dito: l'altezza viene dalla posizione verticale, il volume
// sale appena con la velocita'. Senza dito il tono si spegne dolcemente.
function aggiornaSuono() {
  if (!oscillatore || !oscillatore.started) return;

  let frequenzaVoluta = frequenzaTono;
  let volumeVoluto = 0;

  if (dito.presente) {
    frequenzaVoluta = map(dito.y, 0, 1, frequenzaAcuta, frequenzaGrave);
    volumeVoluto = volumeRiposo + velocitaMano * volumeMovimento;
  }

  frequenzaTono = lerp(frequenzaTono, frequenzaVoluta, velocitaAssestamentoTono);
  volumeTono = lerp(volumeTono, volumeVoluto, velocitaAssestamentoTono);

  oscillatore.freq(frequenzaTono);
  oscillatore.amp(volumeTono, 0);
}

function disegnaAnelli() {
  for (let i = 0; i < numeroAnelli; i++) {
    const frazione = i / (numeroAnelli - 1); // 0 al centro, 1 all'esterno

    stroke(coloreAnello(frazione));
    strokeWeight(1.2);

    // Il raggio respira, con una piccola differenza di fase tra un anello
    // e il successivo: l'onda sembra partire dal centro.
    const respiro = sin(fasePulsazione * TWO_PI + i * 0.15) * ampiezzaPulsazione;
    const raggio = i * passoRaggi + respiro;

    // Ogni anello ruota a una velocita' propria: da qui nasce il reticolo.
    const angolo = faseRotazione * (velocitaRotazioneBase + i * differenzaVelocita)
      + i * sfasamentoRotazione;

    push();
    rotate(radians(angolo));
    disegnaOvale(raggio, i);
    pop();
  }
}

// Disegna un ovale punto per punto: il rumore di Perlin lo fa sciogliere,
// la soglia di rottura lo spezza in archi.
function disegnaOvale(raggio, indice) {
  let precedente = null;

  for (let k = 0; k <= puntiPerAnello; k++) {
    const ang = (k / puntiPerAnello) * TWO_PI;

    // Rumore campionato su un cerchio (cos, sin): si richiude senza cuciture.
    const scioglimento = noise(cos(ang) + 10, sin(ang) + 10, faseRumore + indice * 0.1);
    const scarto = (scioglimento - 0.5) * 2 * ampiezzaScioglimento * velocitaMano;
    const r = raggio + scarto;
    const punto = { x: cos(ang) * r, y: sin(ang) * r * eccentricita };

    if (precedente) {
      // Il tratto manca dove il rumore supera la soglia: piu' rapido il dito,
      // piu' la linea si spezza.
      const rottura = noise(cos(ang) + 40, sin(ang) + 40, faseRumore * 0.6 + indice * 0.05);
      if (rottura > velocitaMano * sogliaRottura) {
        line(precedente.x, precedente.y, punto.x, punto.y);
      }
    }
    precedente = punto;
  }
}

// Gradiente giallo -> ciano -> magenta, scorrito dall'ultimo cambio di forma.
function coloreAnello(frazione) {
  const t = (frazione + scorrimentoColore) % 1;
  if (t < 0.5) {
    return lerpColor(coloreCentroPronto, coloreMedioPronto, t / 0.5);
  }
  return lerpColor(coloreMedioPronto, coloreEsternoPronto, (t - 0.5) / 0.5);
}
