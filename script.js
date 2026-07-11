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

// Menu definitivo con scorte aggiornate e gestione Gnocchi a popup
const prodottiIniziali = [
  { name: "Casoncelli", price: 6, max: 100, type: "cibo" },
  { name: "Scarpinöcc", price: 6, max: 100, type: "cibo" },
  { name: "Gnocchi", price: 6, max: 80, type: "cibo" },
  { name: "Grigliata mista", price: 7, max: 70, type: "cibo" },
  { name: "Costine", price: 6, max: 50, type: "cibo" },
  { name: "Spiedini", price: 6, max: 50, type: "cibo" },
  { name: "Pane e cotechino", price: 4, max: 80, type: "cibo" },
  { name: "Roastbeaf", price: 6, max: 50, type: "cibo" },
  { name: "Patatine", price: 3, max: 5000, type: "cibo" },
  { name: "Spritz", price: 5, max: 5000, type: "bevanda" },
  { name: "Birra", price: 4, max: 5000, type: "bevanda" },
  { name: "Bibita lattina", price: 1.50, max: 5000, type: "bevanda" },
  { name: "Vino B/R 1L", price: 5, max: 5000, type: "bevanda" },
  { name: "Vino B/R 1/2L", price: 2.50, max: 5000, type: "bevanda" },
  { name: "Vino Bicchiere", price: 1.50, max: 5000, type: "bevanda" },
  { name: "Caffè", price: 1, max: 5000, type: "bevanda" },
  { name: "Acqua 0.5L", price: 1, max: 5000, type: "bevanda" },
  { name: "Tiramisù", price: 3, max: 30, type: "dolce" }
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

// Elementi popup Vino e Gnocchi
const vinoModal = document.getElementById("vinoModal");
const vinoModalTitle = document.getElementById("vinoModalTitle");
const cancelVinoBtn = document.getElementById("cancelVino");

const gnocchiModal = document.getElementById("gnocchiModal");
const cancelGnocchiBtn = document.getElementById("cancelGnocchi");

let stato = [];
let carrello = []; 
let metodoPagamento = "";

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
    const qtaSelezionata = carrello.filter(c => c.index === index).length;
    const rimasti = prod.max - qtaSelezionata;

    const div = document.createElement("div");
    div.className = `item ${rimasti <= 0 ? 'fine' : ''}`;

    div.innerHTML = `
      <div class="item-info">
        <span class="name">${prod.name}</span>
        <div class="item-meta">
          <span class="price">€${prod.price.toFixed(2)}</span>
          <span class="max">${rimasti <= 0 ? 'ESAURITO' : 'Disp: ' + (prod.max > 1000 ? '∞' : rimasti)}</span>
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
    if (prodServer.name.includes("Hamburger")) {
      pendingIndex = index;
      pendingDelta = delta;
      apriModalIngredienti(prodServer.name);
      return; 
    }
    if (prodServer.name.toLowerCase().includes("vino")) {
      pendingIndex = index;
      pendingDelta = delta;
      apriModalVino(prodServer.name);
      return;
    }
    if (prodServer.name.toLowerCase().includes("gnocchi")) {
      pendingIndex = index;
      pendingDelta = delta;
      apriModalGnocchi();
      return;
    }
    inserisciNelCarrello(index, "");
  } else {
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
    dettagli: dettagli,
    type: prodServer.type || "cibo"
  });
  renderProdotti();
  updateCarrelloEInterfaccia();
}

// ================= POPUP GESTIONE INGREDIENTI =================
function apriModalIngredienti(nomeHamburger) {
  modalTitle.innerText = "Farcitura " + nomeHamburger;
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

// ================= POPUP GESTIONE SCELTA VINO =================
function apriModalVino(nomeVino) {
  vinoModalTitle.innerText = "Seleziona Tipo: " + nomeVino;
  vinoModal.style.display = "flex";
}

window.selezionaTipoVino = function(tipo) {
  vinoModal.style.display = "none";
  inserisciNelCarrello(pendingIndex, tipo);
  pendingIndex = null;
  pendingDelta = null;
};

cancelVinoBtn.addEventListener("click", () => {
  vinoModal.style.display = "none";
  pendingIndex = null;
  pendingDelta = null;
});

// ================= POPUP GESTIONE SCELTA GNOCCHI (AGGIORNATO CON PESTO) =================
function apriModalGnocchi() {
  gnocchiModal.style.display = "flex";
}

window.selezionaCondimentoGnocchi = function(condimento) {
  gnocchiModal.style.display = "none";
  inserisciNelCarrello(pendingIndex, condimento);
  pendingIndex = null;
  pendingDelta = null;
};

cancelGnocchiBtn.addEventListener("click", () => {
  gnocchiModal.style.display = "none";
  pendingIndex = null;
  pendingDelta = null;
});

function updateCarrelloEInterfaccia() {
  summary.innerHTML = "";
  let totPezzi = carrello.length;
  let totPrezzo = 0;

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

// ================= FUNZIONE CONFERMA E STAMPA CON SPAZIATURA ULTRA GENEROSA =================
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

  const carrelloCompattato = [];
  carrello.forEach(item => {
    const esistente = carrelloCompattato.find(c => c.index === item.index && c.dettagli === item.dettagli);
    if (esistente) {
      esistente.qta += 1;
    } else {
      carrelloCompattato.push({ ...item, qta: 1 });
    }
  });

  const cibi = carrelloCompattato.filter(item => item.type === "cibo");
  const bevande = carrelloCompattato.filter(item => item.type === "bevanda");
  const dolci = carrelloCompattato.filter(item => item.type === "dolce");

  function generaRigheProdotti(lista) {
    let html = "";
    lista.forEach(item => {
      const subTot = (item.price * item.qta).toFixed(2);
      let nomePulito = item.name;
      if (nomePulito.length > 22) nomePulito = nomePulito.substring(0, 20) + "..";

      html += `
        <div class="ticket-row">
          <span class="ticket-col-name">${item.qta}x ${nomePulito}</span>
          <span class="ticket-col-price">€${subTot}</span>
        </div>
      `;
      if(item.dettagli) {
        html += `<div class="ticket-col-details">> ${item.dettagli}</div>`;
      }
    });
    return html;
  }

  // Sezione CIBO nella stampa
  if (cibi.length > 0) {
    ticketHTML += `<div style="text-align:center; font-weight:bold; margin: 4px 0 2px 0; font-size:11px;">--- CIBO ---</div>`;
    ticketHTML += generaRigheProdotti(cibi);
  }

  // Sezione BEVANDE nella stampa con margine ultra generoso (45px) per uno strappo senza pensieri
  if (bevande.length > 0) {
    ticketHTML += `<div style="text-align:center; font-weight:bold; margin: 45px 0 4px 0; border-top: 1px dashed #000; padding-top: 5px; font-size:11px;">--- BEVANDE ---</div>`;
    ticketHTML += generaRigheProdotti(bevande);
  }

  // Sezione DOLCI nella stampa con margine ultra generoso (45px) per uno strappo senza pensieri
  if (dolci.length > 0) {
    ticketHTML += `<div style="text-align:center; font-weight:bold; margin: 45px 0 4px 0; border-top: 1px dashed #000; padding-top: 5px; font-size:11px;">--- DOLCI ---</div>`;
    ticketHTML += generaRigheProdotti(dolci);
  }

  const totaleFinale = totalPriceEl.innerText;

  ticketHTML += `
    </div>
    <div class="ticket-footer" style="margin-top: 15px;">
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
        <span style="font-weight: bold; width: 40px; text-align:center; color: #4f46e5;">${prod.max > 1000 ? '∞' : prod.max}</span>
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