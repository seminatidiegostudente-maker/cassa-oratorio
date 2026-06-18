// ================= FIREBASE =================

const firebaseConfig = {
  apiKey: "AIzaSyDWUaaJooUnPtt8I7ztXlmTZ3oWCVG_snM",
  authDomain: "cassa-oratorio.firebaseapp.com",
  databaseURL: "https://cassa-oratorio-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cassa-oratorio",
  storageBucket: "cassa-oratorio.appspot.com",
  messagingSenderId: "463871619471",
  appId: "1:463871619471:web:009b3411405f72ee3ddbfa"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();


// ================= PRODOTTI BASE =================
const prodotti = [
  { name: "🥟 Le scarpe dell'orco (Scarpinocc)", price: 10, max: 50 },
  { name: "🥟 La sbobba del cavaliere (Casoncelli)", price: 10, max: 50 },
  { name: "🍞 Il sacco del viandante (Pane e cotechino)", price: 10, max: 50 },
  { name: "🍔 Il panino del re (Hamburger)", price: 10, max: 50 },
  { name: "🥬 Il panino del re vegetariano (Hamburger vegetariano)", price: 10, max: 50 },
  { name: "🧆 Pepite d'oriente (Falafel)", price: 10, max: 50 },
  { name: "🍺 Elisir del monaco (Birra)", price: 10, max: 50 },
  { name: "🍹 Pozione del doge (Spritz)", price: 10, max: 50 },
  { name: "🥂 Il nettare della regina (Prosecco)", price: 10, max: 50 }
];



// ================= DOM =================

const itemsContainer = document.getElementById("items");

const summary = document.getElementById("summary");

const totalEl = document.getElementById("total");

const totalPriceEl = document.getElementById("totalPrice");

const grandTotalEl = document.getElementById("grandTotal");


// ================= STATO =================

let stato = [];

let carrello = [];

let metodoPagamento = "";


// ================= INIT DB =================

db.ref("prodotti").once("value", snap => {

  if (!snap.exists()) {

    const init = prodottiBase.map(p => ({
      name: p.name,
      price: p.price,
      stock: p.max
    }));

    db.ref("prodotti").set(init);
  }
});


// ================= LIVE DATA =================

db.ref("prodotti").on("value", snap => {

  const data = snap.val();

  if (!data) return;

  stato = data;

  render();
});


// ================= RENDER =================

function render() {

  itemsContainer.innerHTML = "";

  summary.innerHTML = "";

  let totale = 0;

  let totaleEuro = 0;

  stato.forEach((p, i) => {

    const qty = carrello[i] || 0;

    totale += qty;

    totaleEuro += qty * p.price;

    const div = document.createElement("div");

    div.className = "item";

    if (p.stock <= 0) {
      div.classList.add("fine");
    }

    div.innerHTML = `
      <div class="name">${p.name}</div>

      <div class="controls">
        <button class="minus">-</button>
        <div class="count">${qty}</div>
        <button class="plus">+</button>
      </div>

      <div class="price">€${p.price}</div>

      <div class="max">
        Disp: ${p.stock}
      </div>
    `;

    const plus = div.querySelector(".plus");

    const minus = div.querySelector(".minus");

    // ================= PIU =================

    plus.onclick = () => {

      if (stato[i].stock <= 0) return;

      stato[i].stock--;

      carrello[i] = (carrello[i] || 0) + 1;

      db.ref("prodotti/" + i).update({
        stock: stato[i].stock
      });

      render();
    };

    // ================= MENO =================

    minus.onclick = () => {

      if (!carrello[i] || carrello[i] <= 0) return;

      stato[i].stock++;

      carrello[i]--;

      db.ref("prodotti/" + i).update({
        stock: stato[i].stock
      });

      render();
    };

    itemsContainer.appendChild(div);

    // ================= SUMMARY =================

    if (qty > 0) {

      const r = document.createElement("div");

      r.textContent =
        `${p.name} x${qty} = €${(qty * p.price).toFixed(2)}`;

      summary.appendChild(r);
    }
  });

  // ================= TOTALI =================

  totalEl.textContent = totale;

  totalPriceEl.textContent = totaleEuro.toFixed(2);

  grandTotalEl.textContent =
    `€${totaleEuro.toFixed(2)}`;

  aggiornaResto();
}


// ================= RESET =================

document.getElementById("reset").onclick = () => {

  carrello = [];

  render();
};


// ================= PAGAMENTO =================

const cashBtn = document.getElementById("cashBtn");

const posBtn = document.getElementById("posBtn");

const cashArea = document.getElementById("cashArea");

const cashGiven = document.getElementById("cashGiven");

const restoEl = document.getElementById("resto");


// CONTANTI
cashBtn.onclick = () => {

  metodoPagamento = "Contanti";

  cashBtn.classList.add("activePay");

  posBtn.classList.remove("activePay");

  cashArea.style.display = "block";
};


// POS
posBtn.onclick = () => {

  metodoPagamento = "POS";

  posBtn.classList.add("activePay");

  cashBtn.classList.remove("activePay");

  cashArea.style.display = "none";
};


// ================= RESTO =================

function aggiornaResto() {

  const dato =
    parseFloat(cashGiven.value) || 0;

  const totale =
    parseFloat(totalPriceEl.textContent);

  const resto = dato - totale;

  restoEl.textContent = resto.toFixed(2);
}

cashGiven.addEventListener(
  "input",
  aggiornaResto
);


// ================= DATA E ORA =================

function aggiornaDataOra() {

  const now = new Date();

  const data =
    now.toLocaleDateString("it-IT");

  const ora =
    now.toLocaleTimeString("it-IT");

  document.getElementById("dataLive")
    .textContent = data;

  document.getElementById("orarioLive")
    .textContent = ora;
}

setInterval(aggiornaDataOra, 1000);

aggiornaDataOra();


// ================= CONFERMA =================

document.getElementById("confirm").onclick = () => {

  let testo = "🧾 RICEVUTA CRE\n\n";

  stato.forEach((p, i) => {

    const qty = carrello[i] || 0;

    if (qty > 0) {

      testo +=
        `${p.name} x${qty} = €${(qty * p.price).toFixed(2)}\n`;
    }
  });

  const famiglia =
    document.getElementById("famigliaInput").value;

  const tavolo =
    document.getElementById("tavoloInput").value;

  const persone =
    document.getElementById("personeInput").value;

  const data =
    document.getElementById("dataLive").textContent;

  const ora =
    document.getElementById("orarioLive").textContent;

  testo += `\n-----------------\n`;

  testo += `Famiglia: ${famiglia}\n`;

  testo += `Tavolo: ${tavolo}\n`;

  testo += `Persone: ${persone}\n`;

  testo += `Pagamento: ${metodoPagamento}\n`;

  testo += `Data: ${data}\n`;

  testo += `Ora: ${ora}\n`;

  if (metodoPagamento === "Contanti") {

    const dato =
      parseFloat(cashGiven.value) || 0;

    const totale =
      parseFloat(totalPriceEl.textContent);

    const resto = dato - totale;

    testo += `Dato: €${dato.toFixed(2)}\n`;

    testo += `Resto: €${resto.toFixed(2)}\n`;
  }

  testo += `\n-----------------\n`;

  testo +=
    `Totale: ${totalEl.textContent} piatti\n`;

  testo +=
    `€${totalPriceEl.textContent}\n`;

  const win =
    window.open("", "", "width=400,height=600");

  win.document.write(`
    <pre style="
      font-size:18px;
      font-family:Arial;
    ">
${testo}
    </pre>
  `);

  win.print();

  // RESET
  carrello = [];

  document.getElementById("famigliaInput").value = "";

  document.getElementById("tavoloInput").value = "";

  document.getElementById("personeInput").value = "";

  cashGiven.value = "";

  restoEl.textContent = "0.00";

  metodoPagamento = "";

  cashArea.style.display = "none";

  cashBtn.classList.remove("activePay");

  posBtn.classList.remove("activePay");

  render();
};
