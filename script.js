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
  { name: "🥟 La sbobba del cavaliere (Casoncelli)", price: 6, max: 100 },
  { name: "🥟 Le scarpe dell'orco (Scarpinocc)", price: 6, max: 100 },
  { name: "🥣 Cous Cous", price: 6, max: 20 },
  { name: "🍞 Il sacco del viandante (Pane e cotechino)", price: 4, max: 100 },
  { name: "🍔 Il panino del re (Hamburger+Patatine)", price: 8, max: 120 },
  { name: "🥬 Il panino del re veg (Hamburger Veg+Patatine)", price: 8, max: 20 },
  { name: "🧆 Pepite d'oriente (Falafel)", price: 5, max: 40 },
  { name: "🥩 Roastbeef", price: 5, max: 40 },
  { name: "🍟 Patatine Fritte", price: 3, max: 5000 },
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

let stato = [];
let carrello = [];
let metodoPagamento = "";

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
  stato.forEach((prod, index) => {
    const itemInCarrello = carrello.find(c => c.index === index);
    const qtaSelezionata = itemInCarrello ? itemInCarrello.qta : 0;
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
  const itemInCarrello = carrello.find(c => c.index === index);
  const qtaAttuale = itemInCarrello ? itemInCarrello.qta : 0;
  const nuovaQta = qtaAttuale + delta;

  if (nuovaQta > prodServer.max || nuovaQta < 0) return;

  if (nuovaQta === 0) {
    carrello = carrello.filter(c => c.index !== index);
  } else {
    if (itemInCarrello) {
      itemInCarrello.qta = nuovaQta;
    } else {
      carrello.push({ index, name: prodServer.name, price: prodServer.price, qta: nuovaQta });
    }
  }
  renderProdotti();
  updateCarrelloEInterfaccia();
};

function updateCarrelloEInterfaccia() {
  summary.innerHTML = "";
  let totPezzi = 0;
  let totPrezzo = 0;

  carrello.forEach(item => {
    totPezzi += item.qta;
    const subTot = item.price * item.qta;
    totPrezzo += subTot;

    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span>${item.qta}x ${item.name}</span> <span>€${subTot.toFixed(2)}</span>`;
    summary.appendChild(row);
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

// ================= FUNZIONE CONFERMA E STAMPA (OTTIMIZZATA POS-58) =================
confirmBtn.addEventListener("click", () => {
  const famiglia = document.getElementById("famigliaInput").value.trim();
  const tavolo = document.getElementById("tavoloInput").value.trim();
  const persone = document.getElementById("personeInput").value.trim();

  if (carrello.length === 0) { alert("Il carrello è vuoto!"); return; }
  if (!metodoPagamento) { alert("Seleziona un metodo di pagamento!"); return; }
  if (!famiglia) { alert("Inserisci il nome della Famiglia/Persona!"); return; }

  // 1. Rimuove eventuali scontrini stampati precedentemente
  const vecchioScontrino = document.getElementById("print-ticket");
  if (vecchioScontrino) vecchioScontrino.remove();

  // 2. Crea il contenitore temporaneo per lo scontrino
  const ticket = document.createElement("div");
  ticket.id = "print-ticket";

  const d = new Date();
  const dataStr = d.toLocaleDateString('it-IT');
  const oraStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  let ticketHTML = `
    <div class="ticket-header">
      <h2>CASSA CRE ORATORIO</h2>
      <p>--------------------------------</p>
      <p><b>Data:</b> ${dataStr} - <b>Ora:</b> ${oraStr}</p>
      <p><b>Fam:</b> ${famiglia.toUpperCase()}</p>
      <p><b>Tavolo:</b> ${tavolo || '-'}  |  <b>Persone:</b> ${persone || '-'}</p>
      <p>--------------------------------</p>
    </div>
    <div class="ticket-items">
  `;

  // Ciclo dei prodotti nel carrello pulito dalle emoji per sicurezza di stampa
  carrello.forEach(item => {
    const subTot = (item.price * item.qta).toFixed(2);
    // Pulizia emoji e troncamento a 16 caratteri per non rompere l'incolonnamento sui 58mm
    let nomePulito = item.name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
    if (nomePulito.length > 16) nomePulito = nomePulito.substring(0, 14) + "..";

    ticketHTML += `
      <div class="ticket-row">
        <span>${item.qta}x ${nomePulito}</span>
        <span>€${subTot}</span>
      </div>
    `;
  });

  const totaleFinale = totalPriceEl.innerText;

  ticketHTML += `
    </div>
    <div class="ticket-footer">
      <div class="ticket-total">
        <span>TOTALE:</span>
        <span>€${totaleFinale}</span>
      </div>
      <p><b>Pagamento:</b> ${metodoPagamento.toUpperCase()}</p>
      ${metodoPagamento === "contanti" && parseFloat(cashGiven.value) > 0 ? `<p><b>Ricevuto:</b> €${parseFloat(cashGiven.value).toFixed(2)}</p><p><b>Resto:</b> €${restoEl.innerText}</p>` : ''}
      <p>--------------------------------</p>
      <p class="grazie">Buon appetito!</p>
      <p class="spazio-taglio">.</p>
    </div>
  `;

  ticket.innerHTML = ticketHTML;
  document.body.appendChild(ticket);

  // 3. Esegue la transazione scalando dal database Firebase (Coordinamento Live Casse)
  const aggiornamentiDb = {};
  carrello.forEach(item => {
    aggiornamentiDb[`prodotti/${item.index}/max`] = stato[item.index].max - item.qta;
  });

  db.ref().update(aggiornamentiDb)
    .then(() => {
      // 4. Lancia la stampa di sistema del browser
      window.print();
      svuotaTutto();
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