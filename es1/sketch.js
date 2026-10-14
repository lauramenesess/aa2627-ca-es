// E1. Materia dal caos
//
// Obiettivo: far generare un'immagine e la sua animazione definendo i calcoli
// che ottengono le componenti di rosso, verde e blu di tutti i pixel, lasciando
// che il caso o il rumore ne determinino l'aspetto.
//
// Vincoli ricavati dalle specifiche (E1):
// - tela di 600x600 pixel e immagine elaborata di 200x200 pixel;
// - codice di base invariato, tranne i calcoli di r, g e b nella funzione
//   tixy(), dove si possono aggiungere altre variabili;
// - variabile t usata almeno una volta nei calcoli, per animare l'immagine;
// - almeno una delle funzioni random(), randomGaussian() e noise(), con il
//   risultato usato nel calcolo di r, g o b;
// - anteprima "preview.png" con un fotogramma rappresentativo del risultato.
//
// Approccio: l'attrattore di Lorenz e' una traiettoria, non una funzione di
// ogni pixel; qui se ne imita l'aspetto con due fuochi (i due lobi della
// "farfalla") attorno ai quali si avvolgono anelli a spirale, deformati dal
// rumore di Perlin. Cosi' restano rispettati il modello per-pixel e i vincoli.
//
// Parametri del disegno (modifica questi numeri per cambiare il risultato).

const fuocoAx = 0.37;            // centro del lobo sinistro
const fuocoAy = 0.46;            // piu' in alto, per rompere la simmetria
const fuocoBx = 0.63;            // centro del lobo destro
const fuocoBy = 0.54;            // piu' in basso, per rompere la simmetria

const frequenzaAnelli = 38;      // quanti anelli concentrici per lobo
const avvolgimento = 3;          // bracci della spirale: deve essere un numero
                                 // intero, altrimenti si vede una cucitura
const velocitaScorrimento = 2.5; // quanto in fretta le scie scorrono con t

const scalaRumore = 25;           // grana del rumore: piccolo = macchie grandi
const velocitaRumore = 0.60;     // quanto in fretta cambia il rumore nel tempo
const ampiezzaRumore = 6;      // quanto il rumore deforma gli anelli

const potenzaTraccia = 3;        // scie piu' sottili e luminose
const raggioLobo = 0.55;         // oltre questa distanza il fondo resta nero

const velocitaColore = 0.2;      // quanto in fretta la tinta cambia con t
const ampiezzaColore = 90;       // quanto la tinta si allontana dal colore di base

function tixy(t, i, x, y) {
    // t = secondi (con decimali)
    // i = indice del pixel
    // x = coordinata x da 0.0 a 1.0
    // y = coordinata y da 0.0 a 1.0

    let dxA = x - fuocoAx;
    let dyA = y - fuocoAy;
    let dxB = x - fuocoBx;
    let dyB = y - fuocoBy;

    let dA = sqrt(dxA * dxA + dyA * dyA);   // distanza dal lobo sinistro
    let dB = sqrt(dxB * dxB + dyB * dyB);   // distanza dal lobo destro

    let angoloA = atan2(dyA, dxA);          // angolo attorno al lobo sinistro
    let angoloB = atan2(dyB, dxB);          // angolo attorno al lobo destro

    // Il rumore di Perlin deforma gli anelli: la grana resta continua nello
    // spazio e nel tempo, quindi le scie sembrano velluto e non neve.
    let n = noise(x * scalaRumore, y * scalaRumore, t * velocitaRumore);
    let scarto = (n - 0.5) * ampiezzaRumore;

    // Anelli concentrici attorno a ciascun fuoco; il termine con l'angolo li
    // torce a spirale, quello con t li fa scorrere. Per farli girare in sensi
    // opposti e come allo specchio, il lobo destro usa l'angolo riflesso
    // (PI - angoloB): cosi' non e' solo girato al contrario, ma e' davvero
    // l'immagine speculare di quello sinistro.
    let angoloSpecchio = PI - angoloB;
    let faseA = dA * frequenzaAnelli - angoloA * avvolgimento - t * velocitaScorrimento + scarto;
    let faseB = dB * frequenzaAnelli - angoloSpecchio * avvolgimento - t * velocitaScorrimento + scarto;
    let anelloA = 0.5 + 0.5 * sin(faseA);
    let anelloB =  0.5 + 0.5 * sin(faseB);

    // I due lobi si fondono al centro senza cuciture: pesa di piu' l'anello
    // del fuoco piu' vicino al pixel.
    let pesoA = 1 / (0.01 + dA * dA);
    let pesoB = 1 / (0.01 + dB * dB);
    let anello = (anelloA * pesoA + anelloB * pesoB) / (pesoA + pesoB);

    // Caduta verso l'esterno: lontano dai lobi il fondo torna nero.
    let vicino = min(dA, dB);
    let caduta = constrain(1 - vicino / raggioLobo, 0, 1);

    // Scie sottili e luminose invece di anelli pieni.
    let traccia = pow(anello, potenzaTraccia) * caduta;

    // Colore di base: blu/ciano a sinistra, viola/magenta a destra. Un angolo
    // che avanza con t sposta r, g e b l'uno rispetto agli altri (sfasati di
    // 120 gradi come su una ruota dei colori): la tinta scorre in modo fluido
    // da un colore all'altro, non a scatti.
    let angoloColore = t * velocitaColore;
    let spostamentoR = sin(angoloColore) * ampiezzaColore;
    let spostamentoG = sin(angoloColore + TWO_PI / 3) * ampiezzaColore;
    let spostamentoB = sin(angoloColore + TWO_PI * 2 / 3) * ampiezzaColore;

    let rosso = 30 + x * 225 + spostamentoR;
    let verde = 220 - x * 200 + spostamentoG;
    let blu = 255 - x * 30 + spostamentoB;

    let r = rosso * traccia;
    let g = verde * traccia;
    let b = blu * traccia;

    return [r, g, b];
}

let risoluzione = 200;
let bitmap;

function setup() {
    createCanvas(600, 600);
    pixelDensity(1);
    noSmooth();
    bitmap = createImage(risoluzione, risoluzione);
    bitmap.loadPixels();
    bitmap.pixels.fill(255);
}

function draw() {
    background(0);
    let i = 0;
    let t = millis()/1000;
    let iPix = 0;
    for (let y = 0; y < risoluzione; y++) {
        let yn = y/risoluzione; 
        for (let x = 0; x < risoluzione; x++, i++) {
            let xn = x/risoluzione;
            let col = tixy(t, i, xn, yn);
            bitmap.pixels[iPix++] = col[0];
            bitmap.pixels[iPix++] = col[1];
            bitmap.pixels[iPix++] = col[2];
            iPix++;
        }
    }
    bitmap.updatePixels();
    image(bitmap, 0, 0, width, height);
}
