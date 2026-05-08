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
const prodottiBase = [
  { name: "🍝 Pasta", price: 5, max: 10 },
  { name: "🐟 Pesce", price: 8, max: 20 },
  { name: "🍗 Pollo", price: 6, max: 15 },
  { name: "🥩 Carne", price: 7, max: 30 },
  { name: "🥔 Gnocchi", price: 5, max: 12 },
  { name: "🍖 Costine", price: 9, max: 25 },
  { name: "🍟 Patatine", price: 3, max: 40 },
  { name: "🌭 Hot Dog", price: 4, max: 30 },
  { name: "🥪 Panino", price: 4, max: 50 },
  { name: "🥤 Bibita", price: 2, max: 60 },
  { name: "🍰 Dolce", price: 3, max: 20 },
  { name: "☕ Caffè", price: 1, max: 100 }
];


// ================= DOM =================
const itemsContainer = document.getElementById("items");
const summary = document.getElementById("summary");
const totalEl = document.getElementById("total");
const totalPriceEl = document.getElementById("totalPrice");

let stato = [];
let carrello = {};


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

  if (data) {
    stato = data;
    render();
  }
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

    if (p.stock <= 0) div.classList.add("fine");

    div.innerHTML = `
      <div class="name">${p.name}</div>

      <div class="controls">
        <button class="minus">-</button>
        <div class="count">${qty}</div>
        <button class="plus">+</button>
      </div>

      <div class="price">€${p.price}</div>
      <div class="max">Disp: ${p.stock}</div>
    `;

    const plus = div.querySelector(".plus");
    const minus = div.querySelector(".minus");

    // ================= + =================
    plus.onclick = () => {
      if (stato[i].stock > 0) {

        stato[i].stock--;
        carrello[i] = (carrello[i] || 0) + 1;

        db.ref("prodotti/" + i).update({
          stock: stato[i].stock
        });

        render();
      }
    };

    // ================= - =================
    minus.onclick = () => {
      if (carrello[i] > 0) {

        stato[i].stock++;
        carrello[i]--;

        db.ref("prodotti/" + i).update({
          stock: stato[i].stock
        });

        render();
      }
    };

    itemsContainer.appendChild(div);

    // summary
    if (qty > 0) {
      const r = document.createElement("div");
      r.textContent = `${p.name} x${qty} = €${(qty * p.price).toFixed(2)}`;
      summary.appendChild(r);
    }
  });

  totalEl.textContent = totale;
  totalPriceEl.textContent = totaleEuro.toFixed(2);
}


// ================= RESET =================
document.getElementById("reset").onclick = () => {
  carrello = {};
  render();
};


// ================= CONFERMA =================
document.getElementById("confirm").onclick = () => {

  let testo = "🧾 RICEVUTA CRE\n\n";

  stato.forEach((p, i) => {
    const qty = carrello[i] || 0;

    if (qty > 0) {
      testo += `${p.name} x${qty} = €${(qty * p.price).toFixed(2)}\n`;
    }
  });

  testo += `\n-----------------\n`;
  testo += `Totale: ${totalEl.textContent} piatti\n`;
  testo += `€${totalPriceEl.textContent}\n`;

  const win = window.open("", "", "width=400,height=600");
  win.document.write(`<pre style="font-size:18px;font-family:Arial;">${testo}</pre>`);
  win.print();

  carrello = {};
  render();
};
