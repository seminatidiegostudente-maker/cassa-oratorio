// ================= FIREBASE REALTIME DATABASE CONFIGURATION =================
const firebaseConfig = {
  apiKey: "AIzaSyDWUaaJooUnPtt8I7ztXlmTZ3oWCVG_snM",
  authDomain: "cassa-oratorio.firebaseapp.com",
  databaseURL: "https://cassa-oratorio-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cassa-oratorio",
  storageBucket: "cassa-oratorio.appspot.com",
  messagingSenderId: "463871619471",
  appId: "1:463871619471:web:009b3411405f72ee3ddbfa"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const prodottiIniziali = [
  { name: "Casoncelli", price: 6, max: 100 },
  { name: "Scarpinocc", price: 6, max: 100 },
  { name: "Pane e cotechino", price: 4, max: 100 },
  { name: "Hamburger+Patatine", price: 8, max: 120 },
  { name: "Hamburger Veg+Patatine", price: 8, max: 20 },
  { name: "Falafel", price: 5, max: 40 },
  { name: "Roastbeef", price: 5, max: 40 },
  { name: "Patatine Fritte", price: 3, max: 5000 },
];

// Elements
const itemsContainer = document.getElementById("items");
const summary = document.getElementById("summary");
const totalEl = document.getElementById("total");
const totalPriceEl = document.getElementById("totalPrice");
const grandTotalEl = document.getElementById("grandTotal");
const cashBtn = document.getElementById("cashBtn");
const posBtn = document.getElementById("posBtn");
const cashArea = document.getElementById("cashArea");
const cashGiven = document.getElementById("cashGiven");
const restoEl = document.getElementById("resto");
const confirmBtn = document.getElementById("confirm");
const resetBtn = document.getElementById("reset");

// Admin Panel Elements
const adminBtn = document.getElementById("adminBtn");
const adminPanel = document.getElementById("adminPanel");
const adminItemsList = document.getElementById("adminItemsList");
const closeAdminBtn = document.getElementById("closeAdminBtn");

// Modal Elements
const ingredientsModal = document.getElementById("ingredientsModal");
const modalTitle = document.getElementById("modalTitle");
const saveIngredientsBtn = document.getElementById("saveIngredients");
const cancelIngredientsBtn = document.getElementById("cancelIngredients");

let stato = [];
let carrello = []; // Conterrà oggetti con { idUnico, index, name, price, qta: 1, dettagli: "..." }
let metodoPagamento = "";

// Variabili temporanee per la gestione del popup ingredienti
let pendingIndex = null;
let pendingDelta = null;

// ================= CLOCK LIVE =================
function updateClock() {
  const d = new Date();
  document.getElementById("dataLive").innerText = d.toLocaleDateString('it-IT');
  document.getElementById("orarioLive").innerText = d.toLocaleTimeString('it-IT');
}
setInterval(updateClock, 1000);
updateClock();

// ================= ACCESSO LIVE DATABASE =================
db.ref("prodotti").on("value", (snapshot) => {
  if (!snapshot.exists()) {
    db.ref("prodotti").set(prodottiIniziali);
  } else {
    stato = snapshot.val();
    renderProdotti();
    updateCarrelloEInterfaccia();
    if(adminPanel.style.display === "block") renderAdminPanel();
  }
});

// ================= RENDERING PRODOTTI CASSA =================
function renderProdotti() {
  itemsContainer.innerHTML = "";
  if (!stato) return;
  
  stato.forEach((prod, index) => {
    // Calcola quanti pezzi di questo specifico prodotto (index) sono nel carrello in totale
    const qtaSelezionata = carrello.filter(c => c.index === index).length;
    const rimasti = prod.max - qtaSelezionata;

    const div = document.createElement("div");
    div.className = `item ${rimasti <= 0 ? 'fine' : ''}`;

    div.innerHTML = `
      <div class="item-info">
        <span class="name">${prod.name}</span>
        <div class="item-meta">
          <span class="price">€${prod.price.toFixed(2)}</span>
          <span class="max">${rimasti <= 0 ? 'ESAURITO' : 'Disp: ' + rimasti}</span>
        </div>
      </div>
      <div class="controls">
        <button class="minus" ${qtaSelezionata === 0 ? 'disabled' : ''} onclick="cambiaQta(${index}, -1)">-</button>
        <span class="count">${qtaSelezionata}</span>
        <button class="plus" ${rimasti <= 0 ? 'disabled' : ''} onclick="cambiaQta(${index}, 1)">+</button>
      </div>
    `;
    itemsContainer.appendChild(div);
  });
}

// ================= LOGICA CARRELLO LOCALE =================
window.cambiaQta = function(index, delta) {
  const prodServer = stato[index];
  
  if (delta === 1) {
    // Se è un hamburger, apriamo il popup degli ingredienti prima di inserirlo
    if (prodServer.name.includes("Hamburger")) {
      pendingIndex = index;
      pendingDelta = delta;
      apriModalIngredienti(prodServer.name);
      return; 
    }
    // Altrimenti inserimento diretto standard
    inserisciNelCarrello(index, "");
  } else {
    // Rimozione: toglie l'ultimo inserito di quel tipo
    const indexDaRimuovere = carrello.map(c => c.index).lastIndexOf(index);
    if (indexDaRimuovere !== -1) {
      carrello.splice(indexDaRimuovere, 1);
    }
    renderProdotti();
    updateCarrelloEInterfaccia();
  }
};

function inserisciNelCarrello(index, dettagli) {
  const prodServer = stato[index];
  carrello.push({
    idUnico: Date.now() + Math.random(),
    index: index,
    name: prodServer.name,
    price: prodServer.price,
    dettagli: dettagli
  });
  renderProdotti();
  updateCarrelloEInterfaccia();
}

// ================= POPUP GESTIONE INGREDIENTI =================
function apriModalIngredienti(nomeHamburger) {
  modalTitle.innerText = "Farcitura " + nomeHamburger;
  // Resetta i checkbox a selezionati di default
  document.getElementById("ing-insalata").checked = true;
  document.getElementById("ing-formaggio").checked = true;
  document.getElementById("ing-pomodori").checked = true;
  document.getElementById("ing-maionese").checked = true;
  document.getElementById("ing-ketchup").checked = true;
  
  ingredientsModal.style.display = "flex";
}

cancelIngredientsBtn.addEventListener("click", () => {
  ingredientsModal.style.display = "none";
  pendingIndex = null;
  pendingDelta = null;
});

saveIngredientsBtn.addEventListener("click", () => {
  const opzioni = [];
  if (document.getElementById("ing-insalata").checked) opzioni.push("Insalata");
  if (document.getElementById("ing-formaggio").checked) opzioni.push("Formaggio");
  if (document.getElementById("ing-pomodori").checked) opzioni.push("Pomodori");
  if (document.getElementById("ing-maionese").checked) opzioni.push("Maionese");
  if (document.getElementById("ing-ketchup").checked) opzioni.push("Ketchup");

  let stringaDettagli = "";
  if (opzioni.length === 5) {
    stringaDettagli = "Tutto dentro";
  } else if (opzioni.length === 0) {
    stringaDettagli = "Solo carne";
  } else {
    stringaDettagli = opzioni.join(", ");
  }

  ingredientsModal.style.display = "none";
  inserisciNelCarrello(pendingIndex, stringaDettagli);
  pendingIndex = null;
  pendingDelta = null;
});

// Raggruppa i prodotti simili nel carrello SOLO per visualizzarli nel riepilogo dello schermo
function updateCarrelloEInterfaccia() {
  summary.innerHTML = "";
  let totPezzi = carrello.length;
  let totPrezzo = 0;

  // Mostra ogni singolo elemento nel riepilogo, utile per vedere le farciture diverse
  carrello.forEach((item) => {
    totPrezzo += item.price;

    const wrapper = document.createElement("div");
    wrapper.className = "summary-row-wrapper";

    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span>1x ${item.name}</span> <span>€${item.price.toFixed(2)}</span>`;
    wrapper.appendChild(row);

    if (item.dettagli) {
      const details = document.createElement("div");
      details.className = "summary-details";
      details.innerText = `[${item.dettagli}]`;
      wrapper.appendChild(details);
    }

    summary.appendChild(wrapper);
  });

  totalEl.innerText = totPezzi;
  totalPriceEl.innerText = totPrezzo.toFixed(2);
  grandTotalEl.innerText = `€${totPrezzo.toFixed(2)}`;
  calcolaResto();
}

// ================= GESTIONE PAGAMENTI =================
cashBtn.addEventListener("click", () => impostaMetodo("contanti"));
posBtn.addEventListener("click", () => impostaMetodo("pos"));

function impostaMetodo(tipo) {
  metodoPagamento = tipo;
  if (tipo === "contanti") {
    cashBtn.classList.add("activePay");
    posBtn.classList.remove("activePay");
    cashArea.style.display = "block";
  } else {
    posBtn.classList.add("activePay");
    cashBtn.classList.remove("activePay");
    cashArea.style.display = "none";
    cashGiven.value = "";
    restoEl.innerText = "0.00";
  }
}

cashGiven.addEventListener("input", calcolaResto);
document.querySelectorAll(".btn-quick").forEach(btn => {
  btn.addEventListener("click", () => {
    cashGiven.value = btn.getAttribute("data-amount");
    calcolaResto();
  });
});

function calcolaResto() {
  const tot = parseFloat(totalPriceEl.innerText) || 0;
  const dato = parseFloat(cashGiven.value) || 0;
  if (dato >= tot && tot > 0) {
    restoEl.innerText = (dato - tot).toFixed(2);
  } else {
    restoEl.innerText = "0.00";
  }
}

resetBtn.addEventListener("click", svuotaTutto);
function svuotaTutto() {
  carrello = [];
  metodoPagamento = "";
  cashBtn.classList.remove("activePay");
  posBtn.classList.remove("activePay");
  cashArea.style.display = "none";
  cashGiven.value = "";
  restoEl.innerText = "0.00";
  document.getElementById("famigliaInput").value = "";
  document.getElementById("tavoloInput").value = "";
  document.getElementById("personeInput").value = "";
  renderProdotti();
  updateCarrelloEInterfaccia();
}

// ================= FUNZIONE CONFERMA E STAMPA CON DETTAGLIO FARCITURE =================
confirmBtn.addEventListener("click", () => {
  const famiglia = document.getElementById("famigliaInput").value.trim();
  const tavolo = document.getElementById("tavoloInput").value.trim();
  const persone = document.getElementById("personeInput").value.trim();

  if (carrello.length === 0) { alert("Il carrello è vuoto!"); return; }
  if (!metodoPagamento) { alert("Seleziona un metodo di pagamento!"); return; }
  if (!famiglia) { alert("Inserisci il nome della Famiglia/Persona!"); return; }

  const vecchioScontrino = document.getElementById("print-ticket");
  if (vecchioScontrino) vecchioScontrino.remove();

  const ticket = document.createElement("div");
  ticket.id = "print-ticket";

  const d = new Date();
  const dataStr = d.toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'});
  const oraStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  let ticketHTML = `
    <div class="ticket-header">
      <h2>CRE ORATORIO</h2>
      <p>${dataStr} ${oraStr} | <b>Tav:</b> ${tavolo || '-'} (P:${persone || '-'})</p>
      <p><b>FAMIGLIA:</b> ${famiglia.toUpperCase()}</p>
    </div>
    <div class="ticket-items">
  `;

  // Per lo scontrino uniamo i prodotti uguali che hanno anche gli STESSI ingredienti, ottimizzando lo spazio
  const carrelloCompattato = [];
  carrello.forEach(item => {
    const esistente = carrelloCompattato.find(c => c.index === item.index && c.dettagli === item.dettagli);
    if (esistente) {
      esistente.qta += 1;
    } else {
      carrelloCompattato.push({ ...item, qta: 1 });
    }
  });

  carrelloCompattato.forEach(item => {
    const subTot = (item.price * item.qta).toFixed(2);
    let nomePulito = item.name;
    if (nomePulito.length > 22) nomePulito = nomePulito.substring(0, 20) + "..";

    ticketHTML += `
      <div class="ticket-row">
        <span class="ticket-col-name">${item.qta}x ${nomePulito}</span>
        <span class="ticket-col-price">€${subTot}</span>
      </div>
    `;
    if(item.dettagli) {
      ticketHTML += `<div class="ticket-col-details">> ${item.dettagli}</div>`;
    }
  });

  const totaleFinale = totalPriceEl.innerText;

  ticketHTML += `
    </div>
    <div class="ticket-footer">
      <div class="ticket-total">
        <span>TOTALE:</span>
        <span>€${totaleFinale}</span>
      </div>
      <p><b>Pag:</b> ${metodoPagamento.toUpperCase()}${metodoPagamento === "contanti" && parseFloat(cashGiven.value) > 0 ? ` [Ricevuti: €${parseFloat(cashGiven.value).toFixed(2)} - Resto: €${restoEl.innerText}]` : ''}</p>
      <p class="grazie">Buon appetito!</p>
      <div class="spazio-taglio"></div>
    </div>
  `;

  ticket.innerHTML = ticketHTML;
  document.body.appendChild(ticket);

  // Calcolo dei decrementi totali da inviare a Firebase per ciascun prodotto
  const conteggioPerIndex = {};
  carrello.forEach(item => {
    conteggioPerIndex[item.index] = (conteggioPerIndex[item.index] || 0) + 1;
  });

  const aggiornamentiDb = {};
  Object.keys(conteggioPerIndex).forEach(index => {
    aggiornamentiDb[`prodotti/${index}/max`] = stato[index].max - conteggioPerIndex[index];
  });

  db.ref().update(aggiornamentiDb)
    .then(() => {
      setTimeout(() => {
        window.print();
        svuotaTutto();
      }, 300);
    })
    .catch((error) => {
      alert("Errore di sincronizzazione con Firebase: " + error.message);
    });
});

// ================= GESTIONE PANNELLO MAGAZZINO/ADMIN =================
adminBtn.addEventListener("click", () => {
  if(adminPanel.style.display === "none") {
    adminPanel.style.display = "block";
    renderAdminPanel();
  } else {
    adminPanel.style.display = "none";
  }
});
closeAdminBtn.addEventListener("click", () => adminPanel.style.display = "none");

function renderAdminPanel() {
  adminItemsList.innerHTML = "";
  if (!stato) return;
  
  stato.forEach((prod, index) => {
    const div = document.createElement("div");
    div.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; background: white; padding: 6px 10px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
    div.innerHTML = `
      <span style="font-weight: 600; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prod.name}</span>
      <div style="display:flex; align-items:center; gap: 5px;">
        <button style="width:24px; height:24px; font-weight:bold; cursor:pointer;" onclick="aggiornaScortaServer(${index}, -5)">-5</button>
        <button style="width:24px; height:24px; font-weight:bold; cursor:pointer;" onclick="aggiornaScortaServer(${index}, -1)">-1</button>
        <span style="font-weight: bold; width: 40px; text-align:center; color: #4f46e5;">${prod.max}</span>
        <button style="width:24px; height:24px; font-weight:bold; cursor:pointer;" onclick="aggiornaScortaServer(${index}, 1)">+1</button>
        <button style="width:24px; height:24px; font-weight:bold; cursor:pointer;" onclick="aggiornaScortaServer(${index}, 5)">+5</button>
      </div>
    `;
    adminItemsList.appendChild(div);
  });
}

window.aggiornaScortaServer = function(index, delta) {
  let nuovaScorta = stato[index].max + delta;
  if(nuovaScorta < 0) nuovaScorta = 0;
  db.ref(`prodotti/${index}/max`).set(nuovaScorta);
};