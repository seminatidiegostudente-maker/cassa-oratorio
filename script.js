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

// Inizializzazione controllata dell'istanza
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ================= MENU PRODOTTI PREDEFINITI =================
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

// ================= ACQUISIZIONE ELEMENTI DOM =================
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

let stato = [];      // Stato live caricato in tempo reale dal server Firebase
let carrello = [];   // Quantità selezionate *localmente* dalla cassa corrente
let metodoPagamento = "";

// ================= AGGANCIO ASCOLTATORE LIVE FIREBASE =================
db.ref("prodotti").on("value", function(snap) {
  const data = snap.val();
  
  if (!data) {
    // Configurazione iniziale automatica al primo avvio assoluto
    const initConfig = prodottiIniziali.map(function(p) {
      return { name: p.name, price: p.price, stock: p.max };
    });
    db.ref("prodotti").set(initConfig);
    return;
  }
  
  stato = data;
  
  // Inizializza il vettore del carrello locale se vuoto
  if (carrello.length === 0) {
    carrello = new Array(stato.length).fill(0);
  }
  
  render();
  // Se il pannello amministratore è aperto, lo tiene aggiornato live con le scorte che cambiano
  if (document.getElementById("adminPanel").style.display === "block") {
    renderAdminPanel();
  }
});

// ================= LOGICA DI RENDERING DELLA SCHERMATA =================
function render() {
  if (!itemsContainer) return;
  itemsContainer.innerHTML = "";
  summary.innerHTML = "";

  let totalePiatti = 0;
  let totaleEuro = 0;

  stato.forEach(function(p, i) {
    const qty = carrello[i] || 0;
    // Calcoliamo la disponibilità reale sottraendo quello bloccato nel carrello locale della cassa
    const dispDisponibile = p.stock - qty;
    
    totalePiatti += qty;
    totaleEuro += qty * p.price;

    const div = document.createElement("div");
    div.className = "item";
    if (dispDisponibile <= 0) div.classList.add("fine");

    div.innerHTML = `
      <div class="item-info">
        <div class="name">${p.name}</div>
        <div class="item-meta">
          <span class="price">€${p.price.toFixed(2)}</span>
          <span class="max">Disp: ${dispDisponibile}</span>
        </div>
      </div>
      <div class="controls">
        <button class="minus" ${qty === 0 ? 'disabled' : ''}>-</button>
        <div class="count">${qty}</div>
        <button class="plus" ${dispDisponibile <= 0 ? 'disabled' : ''}>+</button>
      </div>
    `;

    // I click modificano SOLO la memoria locale della cassa. Nessun lag o desincronizzazione!
    div.querySelector(".plus").onclick = function() {
      if (dispDisponibile <= 0) return;
      carrello[i] = (carrello[i] || 0) + 1;
      render();
    };

    div.querySelector(".minus").onclick = function() {
      if (!carrello[i] || carrello[i] <= 0) return;
      carrello[i]--;
      render();
    };

    itemsContainer.appendChild(div);

    if (qty > 0) {
      const r = document.createElement("div");
      r.className = "summary-row";
      r.innerHTML = `<span>${p.name} <strong>x${qty}</strong></span> <span>€${(qty * p.price).toFixed(2)}</span>`;
      summary.appendChild(r);
    }
  });

  if (totalEl) totalEl.textContent = totalePiatti;
  if (totalPriceEl) totalPriceEl.textContent = totaleEuro.toFixed(2);
  if (grandTotalEl) grandTotalEl.textContent = "€" + totaleEuro.toFixed(2);
  
  aggiornaResto();
}

// ================= GESTIONE PULSANTI DI PAGAMENTO =================
if (cashBtn && posBtn) {
  cashBtn.onclick = function() {
    metodoPagamento = "Contanti";
    cashBtn.classList.add("activePay");
    posBtn.classList.remove("activePay");
    if (cashArea) cashArea.style.display = "block";
  };
  
  posBtn.onclick = function() {
    metodoPagamento = "POS";
    posBtn.classList.add("activePay");
    cashBtn.classList.remove("activePay");
    if (cashArea) cashArea.style.display = "none";
    if (cashGiven) cashGiven.value = "";
    aggiornaResto();
  };
}

// ================= CALCOLATORE RAPIDO DEL RESTO CONTANTI =================
function aggiornaResto() {
  if (!cashGiven || !restoEl || !totalPriceEl) return;
  const dato = parseFloat(cashGiven.value) || 0;
  const totale = parseFloat(totalPriceEl.textContent) || 0;
  const resto = dato - totale;
  restoEl.textContent = resto >= 0 ? resto.toFixed(2) : "0.00";
}

if (cashGiven) {
  cashGiven.addEventListener("input", aggiornaResto);
}

// Intercettazione pulsanti rapidi (5€, 10€, 20€, 50€)
document.querySelectorAll(".btn-quick").forEach(function(btn) {
  btn.onclick = function() {
    const amount = parseFloat(btn.getAttribute("data-amount"));
    cashGiven.value = amount.toFixed(2);
    aggiornaResto();
  };
});

// ================= AZZERAMENTO LOCALE ORDINE =================
if (resetBtn) {
  resetBtn.onclick = function() {
    if (carrello.every(q => q === 0)) return;
    if (confirm("Vuoi azzerare l'ordine corrente in questa cassa?")) {
      carrello = new Array(stato.length).fill(0);
      render();
    }
  };
}

// ================= CONFERMA ATOMICA E STAMPA SCONTRINO =================
if (confirmBtn) {
  confirmBtn.onclick = function() {
    let haProdotti = false;
    let updates = {};
    let testoRicevuta = "       🧾 RICEVUTA CRE ORATORIO\n\n";

    for (let i = 0; i < stato.length; i++) {
      const qty = carrello[i] || 0;
      if (qty > 0) {
        haProdotti = true;
        const stockServerAttuale = stato[i].stock;
        const stockAggiornato = stockServerAttuale - qty;

        // Blocco di sicurezza invalicabile se il magazzino si esaurisce nel frattempo da un'altra cassa
        if (stockAggiornato < 0) {
          alert(`🚨 Errore di sincronizzazione! Il piatto "${stato[i].name}" è terminato su Firebase un istante fa. L'ordine è stato interrotto per non generare errori in cucina.`);
          return;
        }

        updates[`prodotti/${i}/stock`] = stockAggiornato;
        testoRicevuta += `${stato[i].name}\n  x${qty} = €${(qty * stato[i].price).toFixed(2)}\n`;
      }
    }

    if (!haProdotti) {
      alert("Il carrello è vuoto! Seleziona almeno un piatto.");
      return;
    }

    if (!metodoPagamento) {
      alert("Seleziona prima il metodo di pagamento (Contanti o POS)!");
      return;
    }

    const fam = document.getElementById("famigliaInput")?.value || "Generico";
    const tav = document.getElementById("tavoloInput")?.value || "N/D";
    const pers = document.getElementById("personeInput")?.value || "N/D";
    const dataText = document.getElementById("dataLive")?.textContent || "";
    const oraText = document.getElementById("orarioLive")?.textContent || "";

    testoRicevuta += "\n----------------------------------------\n";
    testoRicevuta += `Cliente/Famiglia: ${fam}\n`;
    testoRicevuta += `Tavolo: ${tav}       | Persone: ${pers}\n`;
    testoRicevuta += `Pagamento: ${metodoPagamento}\n`;
    testoRicevuta += `Data: ${dataText} ore ${oraText}\n`;

    if (metodoPagamento === "Contanti" && cashGiven) {
      const dato = parseFloat(cashGiven.value) || 0;
      const totale = parseFloat(totalPriceEl.textContent) || 0;
      const resto = dato - totale;
      testoRicevuta += `Ricevuto: €${dato.toFixed(2)}\n`;
      testoRicevuta += `Resto: €${resto >= 0 ? resto.toFixed(2) : "0.00"}\n`;
    }

    testoRicevuta += "\n----------------------------------------\n";
    testoRicevuta += `TOTALE PEZZI: ${totalEl.textContent}\n`;
    testoRicevuta += `TOTALE PAGATO: €${totalPriceEl.textContent}\n\n`;
    testoRicevuta += "      Grazie per il vostro supporto! ❤️\n";

    // Spedizione pacchetto unico a Firebase. Se va a buon fine, apre la stampa
    db.ref().update(updates, function(error) {
      if (error) {
        alert("Errore di rete! Firebase non ha risposto. Riprova.");
      } else {
        const win = window.open("", "", "width=450,height=650");
        if (win) {
          win.document.write(`<pre style="font-size:16px; font-family:'Courier New', monospace; padding:20px; line-height:1.4;">${testoRicevuta}</pre>`);
          win.print();
          win.close();
        }

        // Reset completo dei campi per la fila successiva
        carrello = new Array(stato.length).fill(0);
        if (document.getElementById("famigliaInput")) document.getElementById("famigliaInput").value = "";
        if (document.getElementById("tavoloInput")) document.getElementById("tavoloInput").value = "";
        if (document.getElementById("personeInput")) document.getElementById("personeInput").value = "";
        if (cashGiven) cashGiven.value = "";
        if (restoEl) restoEl.textContent = "0.00";
        metodoPagamento = "";
        if (cashArea) cashArea.style.display = "none";
        if (cashBtn) cashBtn.classList.remove("activePay");
        if (posBtn) posBtn.classList.remove("activePay");
      }
    });
  };
}

// ================= SCHERMATA DI GESTIONE SEGRETA (LIVE ADMIN) =================
const adminBtn = document.getElementById("adminBtn");
const adminPanel = document.getElementById("adminPanel");
const adminItemsList = document.getElementById("adminItemsList");
const closeAdminBtn = document.getElementById("closeAdminBtn");

if (adminBtn) {
  adminBtn.onclick = function() {
    const password = prompt("Inserisci la password di sblocco magazzino:");
    if (password !== "oratorio2026") {
      alert("Password errata!");
      return;
    }
    adminPanel.style.display = "block";
    renderAdminPanel();
  };
}

if (closeAdminBtn) {
  closeAdminBtn.onclick = function() {
    adminPanel.style.display = "none";
  };
}

function renderAdminPanel() {
  if (!adminItemsList) return;
  adminItemsList.innerHTML = "";

  stato.forEach(function(p, i) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.padding = "8px 0";
    div.style.borderBottom = "1px solid #cbd5e1";

    div.innerHTML = `
      <span style="font-weight: bold; font-size: 13px; color: #334155; width: 45%; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
      <div style="display: flex; gap: 4px; align-items: center; width: 55%; justify-content: flex-end;">
        <span style="font-size: 11px; color: #64748b;">€</span>
        <input type="number" class="admin-price" value="${p.price}" style="width: 50px; height: 28px; font-size: 13px; padding: 2px;" data-index="${i}">
        <span style="font-size: 11px; color: #64748b; margin-left: 4px;">Pz:</span>
        <input type="number" class="admin-stock" value="${p.stock}" style="width: 55px; height: 28px; font-size: 13px; padding: 2px;" data-index="${i}">
        <button class="btn-save-single" style="background: #16a34a; color: white; height: 28px; width: 45px; font-size: 11px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;" data-index="${i}">Salva</button>
      </div>
    `;

    div.querySelector(".btn-save-single").onclick = function() {
      const idx = this.getAttribute("data-index");
      const nuovoPrezzo = parseFloat(div.querySelector(".admin-price").value) || 0;
      const nuovaScorta = parseInt(div.querySelector(".admin-stock").value) || 0;

      const updates = {};
      updates[`prodotti/${idx}/price`] = nuovoPrezzo;
      updates[`prodotti/${idx}/stock`] = nuovaScorta;

      db.ref().update(updates, function(error) {
        if (error) {
          alert("Errore nell'aggiornamento.");
        } else {
          alert("Aggiornato ovunque! ✅");
        }
      });
    };

    adminItemsList.appendChild(div);
  });
}

// ================= AGGIORNAMENTO ORA E DATA =================
function aggiornaDataOra() {
  const now = new Date();
  const dEl = document.getElementById("dataLive");
  const oEl = document.getElementById("orarioLive");
  if (dEl) dEl.textContent = now.toLocaleDateString("it-IT");
  if (oEl) oEl.textContent = now.toLocaleTimeString("it-IT");
}
setInterval(aggiornaDataOra, 1000);
aggiornaDataOra();