(function () {
const STORE = "caderneta-sherlock-v1";
const LOCAIS = ["Banco", "Bar", "Casa de Penhores", "Charutaria", "Chaveiro", "Docas",
  "Estação de Carruagens", "Farmácia", "Hotel", "Livraria", "Museu", "Parque", "Scotland Yard", "Teatro"];
const KEY_LABEL = ["Sem chave", "Minha chave", "Trancado"];
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="15" r="4.2"/><path d="M11 12l9-9M16.5 6.5l3 3M14 9l2 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>'
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function novoCaso() {
  return {
    id: uid(), numero: "", titulo: "", relato: "",
    perguntas: [
      { q: "Quem é o culpado?", a: "" },
      { q: "Qual foi a arma?", a: "" },
      { q: "Qual o motivo?", a: "" }
    ],
    locais: LOCAIS.map((nome) => ({ nome, nota: "", visitado: false, chave: 0 }))
  };
}

function exemplo() {
  const c = novoCaso();
  c.exemplo = true;
  c.numero = "7";
  c.titulo = "O relógio parado";
  c.relato = "Lorde Ashby achado morto no quarto 12 do hotel. Relógio do quarto parou às 23h40. Suspeitos: a sobrinha, o mordomo e um marinheiro.";
  c.perguntas[0].a = "Mordomo? conferir álibi";
  const loc = (n) => c.locais.find((l) => l.nome === n);
  Object.assign(loc("Farmácia"), { nota: "Alguém comprou arsênico na terça. Assinou \"J. Hale\".", visitado: true });
  Object.assign(loc("Hotel"), { nota: "Porteiro viu mulher de chapéu verde sair às 23h50.", visitado: true, chave: 1 });
  Object.assign(loc("Docas"), { chave: 2 });
  return c;
}

let state;
try { state = JSON.parse(localStorage.getItem(STORE)); } catch (e) { state = null; }
if (!state || !Array.isArray(state.cases) || !state.cases.length) {
  const ex = exemplo();
  state = { currentId: ex.id, cases: [ex], filtro: "todos" };
}
if (!state.cases.some((c) => c.id === state.currentId)) state.currentId = state.cases[0].id;

const cur = () => state.cases.find((c) => c.id === state.currentId);

let saveTimer = null;
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
    $("#status").textContent = "Salvo";
  } catch (e) {
    $("#status").textContent = "Sem salvar";
  }
}
function save() {
  clearTimeout(saveTimer);
  $("#status").textContent = "…";
  saveTimer = setTimeout(flush, 300);
}
// Salva na hora ao sair do app, trocar de app ou bloquear a tela
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && saveTimer) flush(); });
window.addEventListener("pagehide", () => { if (saveTimer) flush(); });

function grow(t) {
  if (!t.offsetParent) return;
  t.style.height = "auto";
  t.style.height = Math.max(t.scrollHeight, 84) + "px";
}

const rotulo = (c) => "Caso " + (c.numero || "s/nº") + " — " + (c.titulo || "sem título");

function renderSelect() {
  $("#caso-sel").innerHTML = state.cases
    .map((c) => '<option value="' + c.id + '"' + (c.id === state.currentId ? " selected" : "") + ">" + esc(rotulo(c)) + "</option>")
    .join("");
}

function renderPerguntas() {
  const c = cur();
  $("#qs").innerHTML = c.perguntas.map((p, i) =>
    '<div class="q" data-i="' + i + '">' +
      '<input class="q-text" id="q-text-' + i + '" aria-label="Pergunta" value="' + esc(p.q) + '" placeholder="Pergunta">' +
      '<button class="q-del" type="button" aria-label="Remover pergunta">×</button>' +
      '<input class="q-ans" id="q-ans-' + i + '" aria-label="Resposta" value="' + esc(p.a) + '" placeholder="Sua resposta">' +
    "</div>").join("");
  updPergMeta();
}

function updPergMeta() {
  const c = cur();
  const feitas = c.perguntas.filter((p) => p.a.trim()).length;
  $("#perg-meta").textContent = feitas + " de " + c.perguntas.length + " respondidas";
}

function badges(l) {
  let h = "";
  if (l.chave === 1) h += '<span class="badge b-mine" title="Minha chave">' + ICON.key + "</span>";
  if (l.chave === 2) h += '<span class="badge b-locked" title="Trancado">' + ICON.lock + "</span>";
  if (l.visitado) h += '<span class="badge b-vis" title="Visitado">' + ICON.check + "</span>";
  return h;
}

function renderLocais() {
  const c = cur();
  $("#locs").innerHTML = c.locais.map((l, i) =>
    '<details class="loc" data-i="' + i + '" data-visited="' + l.visitado + '">' +
      "<summary>" +
        '<span class="loc-name">' + esc(l.nome) + "</span>" +
        '<span class="badges">' + badges(l) + "</span>" +
        '<span class="loc-prev">' + esc(l.nota.split("\n")[0]) + "</span>" +
      "</summary>" +
      '<div class="loc-body">' +
        '<textarea class="lined loc-note" id="loc-note-' + i + '" aria-label="Pistas em ' + esc(l.nome) + '" placeholder="Pistas encontradas aqui…">' + esc(l.nota) + "</textarea>" +
        '<div class="loc-actions">' +
          '<label class="check"><input type="checkbox" class="loc-vis" id="loc-vis-' + i + '"' + (l.visitado ? " checked" : "") + "> Visitado</label>" +
          '<button type="button" class="key" data-state="' + l.chave + '">' + (l.chave === 2 ? ICON.lock : ICON.key) + "<span>" + KEY_LABEL[l.chave] + "</span></button>" +
          (l.custom ? '<button type="button" class="loc-del">Remover local</button>' : "") +
        "</div>" +
      "</div>" +
    "</details>").join("");
  updLocMeta();
  applyFilter();
}

function updLoc(i) {
  const l = cur().locais[i];
  const d = $('.loc[data-i="' + i + '"]');
  d.dataset.visited = l.visitado;
  d.querySelector(".badges").innerHTML = badges(l);
  d.querySelector(".loc-prev").textContent = l.nota.split("\n")[0];
  const k = d.querySelector(".key");
  k.dataset.state = l.chave;
  k.innerHTML = (l.chave === 2 ? ICON.lock : ICON.key) + "<span>" + KEY_LABEL[l.chave] + "</span>";
}

function updLocMeta() {
  const c = cur();
  const vis = c.locais.filter((l) => l.visitado).length;
  $("#loc-meta").textContent = vis + "/" + c.locais.length + " visitados";
}

function applyFilter() {
  const f = state.filtro || "todos";
  document.querySelectorAll(".filter button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === f));
  cur().locais.forEach((l, i) => {
    const d = $('.loc[data-i="' + i + '"]');
    d.hidden = (f === "pistas" && !l.nota.trim()) || (f === "pendentes" && l.visitado);
  });
}

function render() {
  const c = cur();
  renderSelect();
  $("#numero").value = c.numero;
  $("#titulo").value = c.titulo;
  $("#relato").value = c.relato;
  $("#demo").hidden = !c.exemplo;
  renderPerguntas();
  renderLocais();
  grow($("#relato"));
}

const idx = (t) => +t.closest("[data-i]").dataset.i;

document.addEventListener("input", (e) => {
  const t = e.target, c = cur();
  if (t.id === "numero" || t.id === "titulo") {
    c[t.id] = t.value;
    const opt = $("#caso-sel").selectedOptions[0];
    if (opt) opt.textContent = rotulo(c);
  } else if (t.id === "relato") { c.relato = t.value; grow(t); }
  else if (t.classList.contains("q-text")) c.perguntas[idx(t)].q = t.value;
  else if (t.classList.contains("q-ans")) { c.perguntas[idx(t)].a = t.value; updPergMeta(); }
  else if (t.classList.contains("loc-note")) { const i = idx(t); c.locais[i].nota = t.value; grow(t); updLoc(i); }
  else return;
  save();
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "caso-sel") {
    state.currentId = t.value;
    render();
    window.scrollTo(0, 0);
    save();
  } else if (t.classList.contains("loc-vis")) {
    const i = idx(t);
    cur().locais[i].visitado = t.checked;
    updLoc(i); updLocMeta(); save();
  }
});

document.addEventListener("toggle", (e) => {
  if (e.target.classList && e.target.classList.contains("loc") && e.target.open) {
    grow(e.target.querySelector(".loc-note"));
  }
}, true);

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const c = cur();
  if (t.id === "novo") {
    const n = novoCaso();
    state.cases.unshift(n);
    state.currentId = n.id;
    render();
    window.scrollTo(0, 0);
    $("#numero").focus();
    save();
  } else if (t.id === "apagar") {
    if (!confirm("Apagar \"" + rotulo(c) + "\" e todas as anotações dele?")) return;
    state.cases = state.cases.filter((x) => x.id !== c.id);
    if (!state.cases.length) state.cases.push(novoCaso());
    state.currentId = state.cases[0].id;
    render();
    window.scrollTo(0, 0);
    save();
  } else if (t.id === "add-q") {
    c.perguntas.push({ q: "", a: "" });
    renderPerguntas();
    $("#q-text-" + (c.perguntas.length - 1)).focus();
    save();
  } else if (t.classList.contains("q-del")) {
    c.perguntas.splice(idx(t), 1);
    renderPerguntas();
    save();
  } else if (t.classList.contains("key")) {
    const i = idx(t);
    c.locais[i].chave = (c.locais[i].chave + 1) % 3;
    updLoc(i);
    save();
  } else if (t.classList.contains("loc-del")) {
    const i = idx(t);
    if (!confirm("Remover o local \"" + c.locais[i].nome + "\"?")) return;
    c.locais.splice(i, 1);
    renderLocais();
    save();
  } else if (t.dataset.f) {
    state.filtro = t.dataset.f;
    applyFilter();
    save();
  }
});

$("#add-loc").addEventListener("submit", (e) => {
  e.preventDefault();
  const inp = $("#novo-local");
  const nome = inp.value.trim();
  if (!nome) { inp.focus(); return; }
  const c = cur();
  c.locais.push({ nome, nota: "", visitado: false, chave: 0, custom: true });
  inp.value = "";
  state.filtro = "todos";
  renderLocais();
  const d = $('.loc[data-i="' + (c.locais.length - 1) + '"]');
  d.open = true;
  d.querySelector(".loc-note").focus();
  save();
});

render();

// Pede ao navegador pra não apagar os dados quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
})();
