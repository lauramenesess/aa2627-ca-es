// Agenti: Batteri/cellule di una colonia in crescita, visualizzati come filamenti a spessore variabile con ombra portata, illuminazione direzionale e piccoli nuclei luminosi sulle punte attive.
// Comportamento: Ogni agente avanza seguendo una leggera turbolenza (noise) e orientandosi verso le aree con maggiore concentrazione di feromoni/nutrienti rilevate da tre sensori frontali (sinistra, centro, destra). Il trascinamento del mouse deposita nuovi nutrienti, attira/perturba localmente la colonia e sposta la sorgente luminosa.
// Interazione: I batteri comunicano indirettamente tramite l'ambiente (stigmergia): depositano una traccia chimica sulla griglia sottostante e leggono le tracce lasciate dagli altri agenti per auto-organizzarsi in reti ramificate e filamenti. Inoltre, applicano una leggera repulsione diretta se si sovrappongono troppo.
// Nascita e morte: La colonia nasce da un piccolo nucleo centrale in setup(). Gli agenti si riproducono per mitosi (sdoppiandosi con un leggero angolo) quando trovano abbastanza spazio e la popolazione è sotto il limite massimo; muoiono quando esauriscono la loro energia vitale o restano intrappolati in zone troppo dense, lasciando visibile la struttura della colonia.

// DATI GLOBALI //////////////////////////////////////////////////////////////
let agenti = [];              // Array degli agenti
const MAX_AGENTI = 550;       // Limite massimo per mantenere fluide le prestazioni
let griglia;                  // Mappa chimica per le tracce dei batteri (1D array)
let cols, rows;               // Dimensioni della griglia
const RISOLUZIONE = 4;        // Risoluzione della griglia chimica (in pixel)

// Direzione normalizzata della luce principale (in alto a sinistra)
let luceDirX, luceDirY;

// CLASSE "AGENTE" ///////////////////////////////////////////////////////////
class Agente {
    constructor(x, y, angolo, generazione = 0) {
        this.pos = createVector(x, y);
        this.prevPos = this.pos.copy();
        this.angolo = angolo;
        this.velocita = random(1.0, 1.9);
        this.generazione = generazione;

        // Proprietà vitali
        this.vita = random(180, 320);
        this.vitaMax = this.vita;
        this.energiaDivisione = random(40, 80); // Timer per la mitosi

        // Variazione individuale dello spessore per creare contrasto tra filamenti
        this.spessoreBase = random(1.0, 5.8);
        this.faseSpessore = random(1000);

        // Parametri sensoriali stile Physarum
        this.angoloSensore = PI / 4;     // 45 gradi a destra e sinistra
        this.distanzaSensore = 14;       // Quanto lontano "annusa"
        this.angoloSterzata = PI / 6;    // Capacità di curvatura
    }

    // Legge il valore chimico nella griglia a una certa distanza e angolo
    annusa(offsetAngolo) {
        let ang = this.angolo + offsetAngolo;
        let dx = cos(ang) * this.distanzaSensore;
        let dy = sin(ang) * this.distanzaSensore;
        let sx = floor((this.pos.x + dx) / RISOLUZIONE);
        let sy = floor((this.pos.y + dy) / RISOLUZIONE);

        if (sx >= 0 && sx < cols && sy >= 0 && sy < rows) {
            return griglia[sx + sy * cols];
        }
        return -1; // Fuori dai bordi respinge
    }

    update() {
        this.prevPos = this.pos.copy();

        // 1. INTERAZIONE CHIMICA (Sensori stile Physarum)
        let vDestra = this.annusa(this.angoloSensore);
        let vCentro = this.annusa(0);
        let vSinistra = this.annusa(-this.angoloSensore);

        if (vCentro > vSinistra && vCentro > vDestra) {
            // Continua dritto
        } else if (vCentro < vSinistra && vCentro < vDestra) {
            // Sceglie casualmente tra destra e sinistra
            this.angolo += (random() < 0.5 ? 1 : -1) * this.angoloSterzata;
        } else if (vDestra > vSinistra) {
            this.angolo += this.angoloSterzata;
        } else if (vSinistra > vDestra) {
            this.angolo -= this.angoloSterzata;
        }

        // Componente organica imprevedibile (Perlin noise)
        let n = noise(this.pos.x * 0.008, this.pos.y * 0.008, frameCount * 0.01);
        this.angolo += map(n, 0, 1, -0.15, 0.15);

        // 2. INTERAZIONE DIRETTA (Leggera repulsione locale stile Cytographia)
        for (let i = 0; i < agenti.length; i += 3) {
            let altro = agenti[i];
            if (altro !== this) {
                let d = p5.Vector.dist(this.pos, altro.pos);
                if (d > 0 && d < 10) {
                    let diff = p5.Vector.sub(this.pos, altro.pos);
                    this.angolo = lerp(this.angolo, diff.heading(), 0.2);
                }
            }
        }

        // 3. INTERAZIONE CON IL MOUSE (Trascinamento)
        if (mouseIsPressed) {
            let mouseVec = createVector(mouseX, mouseY);
            let dMouse = p5.Vector.dist(this.pos, mouseVec);
            if (dMouse < 140) {
                let forzaMouse = createVector(mouseX - pmouseX, mouseY - pmouseY);
                let versoMouse = p5.Vector.sub(mouseVec, this.pos);
                let angoloTarget = versoMouse.heading();

                this.angolo = lerp(this.angolo, angoloTarget, 0.12);
                this.pos.add(forzaMouse.mult(0.25));
                this.vita = min(this.vita + 1.5, this.vitaMax);
            }
        }

        // 4. MOVIMENTO E DEPOSITO TRACCIA
        this.pos.x += cos(this.angolo) * this.velocita;
        this.pos.y += sin(this.angolo) * this.velocita;

        // Rimbalzo morbido sui bordi dello schermo
        if (this.pos.x < 10 || this.pos.x > width - 10) this.angolo = PI - this.angolo;
        if (this.pos.y < 10 || this.pos.y > height - 10) this.angolo = -this.angolo;

        // Deposita feromone nella griglia
        let gx = floor(this.pos.x / RISOLUZIONE);
        let gy = floor(this.pos.y / RISOLUZIONE);
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
            let idx = gx + gy * cols;
            if (griglia[idx] > 0.85) {
                this.vita -= 1.2;
            }
            griglia[idx] = min(griglia[idx] + 0.35, 1.0);
        }

        // 5. MITOSI (Riproduzione della colonia)
        this.energiaDivisione--;
        if (this.energiaDivisione <= 0 && agenti.length < MAX_AGENTI && this.vita > 60) {
            let nuovoAngolo = this.angolo + random([-0.5, 0.5]) + random(-0.2, 0.2);
            agenti.push(new Agente(this.pos.x, this.pos.y, nuovoAngolo, this.generazione + 1));
            this.energiaDivisione = random(55, 110);
        }

        // Consumo vitale
        this.vita -= 1;
    }

    display() {
        let rapportoVita = constrain(this.vita / this.vitaMax, 0, 1);

        // Spessore dinamico: combina fase vitale, generazione e modulazione organica con noise
        let ondaSpessore = noise(this.faseSpessore + frameCount * 0.03);
        let fattoreGenerazione = map(min(this.generazione, 25), 0, 25, 1.25, 0.75);
        let spessore = this.spessoreBase * fattoreGenerazione * map(ondaSpessore, 0, 1, 0.45, 1.45);
        spessore = constrain(spessore, 0.4, 6.5);

        // Direzione del segmento e luce locale (luce globale + eventuale luce radiale del mouse)
        let dx = this.pos.x - this.prevPos.x;
        let dy = this.pos.y - this.prevPos.y;
        let len = max(sqrt(dx * dx + dy * dy), 0.001);
        let dirX = dx / len;
        let dirY = dy / len;

        // Normale perpendicolare al filamento per calcolare l'esposizione alla luce
        let normX = -dirY;
        let normY = dirX;

        let lx = luceDirX;
        let ly = luceDirY;

        if (mouseIsPressed) {
            let toMouseX = mouseX - this.pos.x;
            let toMouseY = mouseY - this.pos.y;
            let distMouse = sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
            if (distMouse > 1 && distMouse < 260) {
                let pesoMouse = 1 - distMouse / 260;
                lx = lerp(lx, toMouseX / distMouse, pesoMouse * 0.85);
                ly = lerp(ly, toMouseY / distMouse, pesoMouse * 0.85);
                let lMag = max(sqrt(lx * lx + ly * ly), 0.001);
                lx /= lMag;
                ly /= lMag;
            }
        }

        // Fattore di illuminazione (-1 in ombra, +1 in piena luce)
        let esposizioneLuce = abs(normX * lx + normY * ly);
        esposizioneLuce = lerp(0.5, esposizioneLuce, 0.75) * (0.4 + 0.6 * rapportoVita);

        // 1. OMBRA PORTATA (spostata nella direzione opposta alla luce principale)
        let ombraX = -luceDirX * (1.5 + spessore * 0.55);
        let ombraY = -luceDirY * (1.5 + spessore * 0.55);
        stroke(3, 5, 8, 28 * rapportoVita);
        strokeWeight(spessore * 1.15);
        line(
            this.prevPos.x + ombraX,
            this.prevPos.y + ombraY,
            this.pos.x + ombraX,
            this.pos.y + ombraY
        );

        // 2. CORPO DEL FILAMENTO (sfumatura tra zona in ombra e zona illuminata)
        let rOmbra = lerp(14, 70, rapportoVita);
        let gOmbra = lerp(75, 145, rapportoVita);
        let bOmbra = lerp(72, 130, rapportoVita);

        let rLuce = lerp(110, 245, rapportoVita);
        let gLuce = lerp(210, 255, rapportoVita);
        let bLuce = lerp(195, 235, rapportoVita);

        let r = lerp(rOmbra, rLuce, esposizioneLuce);
        let g = lerp(gOmbra, gLuce, esposizioneLuce);
        let b = lerp(bOmbra, bLuce, esposizioneLuce);

        stroke(r, g, b, (26 + esposizioneLuce * 42) * rapportoVita);
        strokeWeight(spessore);
        line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);

        // 3. RIFLESSO / HIGHLIGHT SUL LATO ILLUMINATO
        if (spessore > 1.3 && esposizioneLuce > 0.35) {
            let highX = lx * (spessore * 0.22);
            let highY = ly * (spessore * 0.22);
            stroke(245, 255, 250, 32 * esposizioneLuce * rapportoVita);
            strokeWeight(max(0.4, spessore * 0.32));
            line(
                this.prevPos.x + highX,
                this.prevPos.y + highY,
                this.pos.x + highX,
                this.pos.y + highY
            );
        }

        // 4. NUCLEO LUMINOSO SULLE PUNTE ATTIVE
        if (rapportoVita > 0.65) {
            noStroke();
            fill(240, 255, 245, 115);
            ellipse(this.pos.x, this.pos.y, max(1.8, spessore * 0.75), max(1.8, spessore * 0.75));
        }
    }
}

// INIZIALIZZAZIONI E REINIZIALIZZAZIONI /////////////////////////////////////
function setup() {
    createCanvas(windowWidth, windowHeight);

    // Imposta la direzione della luce principale (proveniente in diagonale dall'alto a sinistra)
    let luceVec = createVector(0.65, 0.76).normalize();
    luceDirX = luceVec.x;
    luceDirY = luceVec.y;

    inizializzaColonia();
}

function inizializzaColonia() {
    background(10, 14, 18);
    agenti = [];

    cols = ceil(width / RISOLUZIONE);
    rows = ceil(height / RISOLUZIONE);
    griglia = new Float32Array(cols * rows);

    let numIniziale = 120;
    for (let i = 0; i < numIniziale; i++) {
        let ang = random(TWO_PI);
        let r = random(5, 25);
        agenti.push(new Agente(width / 2 + cos(ang) * r, height / 2 + sin(ang) * r, ang));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    inizializzaColonia();
}

// AGGIORNAMENTO DATI E DISEGNO FOTOGRAMMA ///////////////////////////////////
function draw() {
    noStroke();
    fill(10, 14, 18, 3);
    rect(0, 0, width, height);

    for (let i = 0; i < griglia.length; i++) {
        griglia[i] *= 0.992;
    }

    if (mouseIsPressed) {
        let gx = floor(mouseX / RISOLUZIONE);
        let gy = floor(mouseY / RISOLUZIONE);
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                let nx = gx + dx;
                let ny = gy + dy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    griglia[nx + ny * cols] = 1.0;
                }
            }
        }

        if (agenti.length < MAX_AGENTI && frameCount % 2 === 0) {
            let angoloMovimento = atan2(mouseY - pmouseY, mouseX - pmouseX);
            agenti.push(new Agente(mouseX + random(-5, 5), mouseY + random(-5, 5), angoloMovimento + random(-0.8, 0.8)));
        }
    }

    if (agenti.length === 0) {
        for (let i = 0; i < 40; i++) {
            agenti.push(new Agente(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.8), random(TWO_PI)));
        }
    }

    for (let i = agenti.length - 1; i >= 0; --i) {
        agenti[i].update();
        if (agenti[i].vita <= 0) {
            agenti.splice(i, 1);
        } else {
            agenti[i].display();
        }
    }
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        inizializzaColonia();
    }
}