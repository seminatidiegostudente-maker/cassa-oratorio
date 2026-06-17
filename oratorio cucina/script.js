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

let stato = [];


// ================= INIZIALIZZA DB =================
db.ref("prodotti").once("value", snapshot => {
  if (!snapshot.exists()) {
    const init = prodotti.map(p => ({
      name: p.name,
      price: p.price,
      stock: p.max
    }));
    db.ref("prodotti").set(init);
  }
});


// ================= LETTURA LIVE =================
db.ref("prodotti").on("value", snapshot => {
  const data = snapshot.val();

  if (data) {
    stato = data.map((p, i) => ({
      ...p,
      count: 0,
      index: i
    }));
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

    totale += p.count;
    totaleEuro += p.count * p.price;

    const div = document.createElement("div");
    div.className = "item";

    if (p.stock <= 0) div.classList.add("fine");

    div.innerHTML = `
      <div class="name">${p.name}</div>

      <div class="controls">
        <button class="minus">-</button>
        <div class="count">${p.count}</div>
        <button class="plus">+</button>
      </div>

      <div class="price">€${p.price}</div>
      <div class="max">Disp: ${p.stock}</div>
    `;

    const plus = div.querySelector(".plus");
    const minus = div.querySelector(".minus");

    // +++
    plus.onclick = () => {
      if (p.stock > 0) {
        p.stock--;
        p.count--;

        db.ref("prodotti/" + p.index).update({
          stock: p.stock
        });

        render();
      }
    };

    // ---
    minus.onclick = () => {
      if (p.count > 0) {
        p.stock++;
        p.count++;

        db.ref("prodotti/" + p.index).update({
          stock: p.stock
        });

        render();
      }
    };

    itemsContainer.appendChild(div);

    if (p.count > 0) {
      const r = document.createElement("div");
      r.textContent = `${p.name} x${p.count} = €${(p.count * p.price).toFixed(2)}`;
      summary.appendChild(r);
    }
  });

  totalEl.textContent = totale;
  totalPriceEl.textContent = totaleEuro.toFixed(2);
}


// ================= RESET =================
document.getElementById("reset").onclick = () => {
  stato.forEach(p => p.count = 0);
  render();
};


// ================= CONFERMA =================
document.getElementById("confirm").onclick = () => {

  let testo = "🧾 RICEVUTA CRE\n\n";

  stato.forEach(p => {
    if (p.count > 0) {
      testo += `${p.name} x${p.count} = €${(p.count * p.price).toFixed(2)}\n`;

      const nuovoStock = p.stock;

      db.ref("prodotti/" + p.index).update({
        stock: nuovoStock
      });
    }
  });

  testo += `\n-----------------\n`;
  testo += `Totale: ${totalEl.textContent} piatti\n`;
  testo += `€${totalPriceEl.textContent}\n`;

  const win = window.open("", "", "width=400,height=600");

  win.document.write(`
    <pre style="font-size:18px;font-family:Arial;">
${testo}
    </pre>
  `);

  win.print();

  stato.forEach(p => p.count = 0);
  render();
};