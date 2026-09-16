(function () {
// Mesma chave da versão anterior: as anotações já feitas continuam valendo
const STORE = "caderneta-sherlock-v1";
const LOCAIS = ["Banco", "Bar", "Casa de Penhores", "Charutaria", "Chaveiro", "Docas",
  "Estação de Carruagens", "Farmácia", "Hotel", "Livraria", "Museu", "Parque", "Scotland Yard", "Teatro"];
const KEY_LABEL = ["Sem chave", "⚷ Minha chave", "✕ Trancado"];
const FILTROS = [
  { k: "todos", l: "Todos" },
  { k: "pistas", l: "Com pistas" },
  { k: "pendentes", l: "Não visitados" }
];
const THEMES = {
  auto: { icon: "◐", title: "Tema: automático", next: "dark" },
  dark: { icon: "☾", title: "Tema: escuro", next: "light" },
  light: { icon: "☀", title: "Tema: claro", next: "auto" }
};

const $ = (s, root) => (root || document).querySelector(s);
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

/* ---------- Estado ---------- */

let data;
try { data = JSON.parse(localStorage.getItem(STORE)); } catch (e) { data = null; }
if (!data || !Array.isArray(data.cases)) data = { cases: [], filtro: "todos", theme: "auto" };
// Versões antigas criavam um caso de exemplo na primeira abertura
data.cases = data.cases.filter((c) => !c.exemplo);
if (!data.cases.length) {
  const n = novoCaso();
  data.cases.push(n);
  data.currentId = n.id;
}
if (!data.cases.some((c) => c.id === data.currentId)) data.currentId = data.cases[0].id;
if (!THEMES[data.theme]) data.theme = "auto";
if (!FILTROS.some((f) => f.k === data.filtro)) data.filtro = "todos";

const ui = { tab: "caso", detail: null };
const cur = () => data.cases.find((c) => c.id === data.currentId);

/* ---------- Salvamento ---------- */

let saveTimer = null;
const setSaved = (t) => { $("#saved").textContent = t; };
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
    setSaved("salvo");
  } catch (e) {
    setSaved("sem salvar");
  }
}
function save() {
  clearTimeout(saveTimer);
  setSaved("salvando…");
  saveTimer = setTimeout(flush, 350);
}
// Salva na hora ao sair do app, trocar de app ou bloquear a tela
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && saveTimer) flush(); });
window.addEventListener("pagehide", () => { if (saveTimer) flush(); });

/* ---------- Tema ---------- */

const mqDark = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const t = data.theme;
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-th");
  else root.setAttribute("data-th", t);
  const dark = t === "dark" || (t === "auto" && mqDark.matches);
  $("#theme-color").setAttribute("content", dark ? "#0E1311" : "#EFEEE7");
  $("#theme-icon").textContent = THEMES[t].icon;
  $("#theme-btn").title = THEMES[t].title;
}
if (mqDark.addEventListener) mqDark.addEventListener("change", applyTheme);

/* ---------- Renderização ---------- */

const rotulo = (c) => "Caso " + (c.numero || "s/nº") + " — " + (c.titulo || "sem título");

function grow(t) {
  if (!t || !t.offsetParent) return;
  t.style.height = "auto";
  t.style.height = t.scrollHeight + 2 + "px";
}

function renderSelect() {
  $("#caso-sel").innerHTML = data.cases
    .map((c) => '<option value="' + c.id + '"' + (c.id === data.currentId ? " selected" : "") + ">" + esc(rotulo(c)) + "</option>")
    .join("");
}

function renderHero() {
  const c = cur();
  $("#numero").value = c.numero;
  $("#titulo").value = c.titulo;
}

function renderTabs() {
  const c = cur();
  const counts = {
    caso: c.relato.trim() ? "relato" : "vazio",
    locais: c.locais.filter((l) => l.visitado).length + "/" + c.locais.length,
    perguntas: c.perguntas.filter((p) => p.a.trim()).length + "/" + c.perguntas.length
  };
  document.querySelectorAll(".tab").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.tab === ui.tab));
    $(".tab-count", b).textContent = counts[b.dataset.tab];
  });
}

function tplCaso(c) {
  return (
    '<div class="sec-head"><h2 class="h2">Relato</h2><span class="sec-meta">o que foi lido no início</span></div>' +
    '<textarea class="lined" data-field="relato" aria-label="Relato do caso" placeholder="Vítima, suspeitos, horário, local do crime…">' + esc(c.relato) + "</textarea>" +
    '<div class="case-foot">' +
      "<p>As anotações ficam salvas neste aparelho e continuam aqui mesmo fechando o app ou bloqueando a tela.</p>" +
      '<button type="button" class="btn-danger" data-action="delete-case">Apagar este caso</button>' +
    "</div>"
  );
}

function tplTiles(c) {
  const f = data.filtro;
  const tiles = c.locais
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => !((f === "pistas" && !l.nota.trim()) || (f === "pendentes" && l.visitado)))
    .map(({ l, i }) => {
      const nota = l.nota.trim();
      return (
        '<button type="button" class="tile' + (nota ? " has-note" : "") + '" data-action="open-local" data-i="' + i + '">' +
          '<span class="tile-top">' +
            (l.visitado ? '<span class="dot dot-ok" title="Visitado">✓</span>' : "") +
            (l.chave === 1 ? '<span class="dot dot-key" title="Minha chave">⚷</span>' : "") +
            (l.chave === 2 ? '<span class="dot dot-lock" title="Trancado">✕</span>' : "") +
            (nota ? '<span class="tag-pista">pista</span>' : "") +
          "</span>" +
          '<span class="tile-name">' + esc(l.nome) + "</span>" +
          '<span class="tile-prev">' + esc(nota ? l.nota.split("\n")[0] : "") + "</span>" +
        "</button>"
      );
    });
  if (!tiles.length) {
    return '<p class="tiles-empty">' + (f === "pistas" ? "Nenhum local com pista ainda." : "Todos os locais já foram visitados.") + "</p>";
  }
  return tiles.join("");
}

function tplLocais(c) {
  return (
    '<div class="chips" role="group" aria-label="Filtrar locais">' +
      FILTROS.map((x) => '<button type="button" class="chip" data-action="filter" data-f="' + x.k + '" aria-pressed="' + (data.filtro === x.k) + '">' + x.l + "</button>").join("") +
    "</div>" +
    '<div class="tiles" id="tiles">' + tplTiles(c) + "</div>" +
    '<form class="add-loc" id="add-loc">' +
      '<input id="novo-local" aria-label="Nome do novo local" autocomplete="off" placeholder="Outro local do tabuleiro">' +
      '<button type="submit" class="btn-outline">Adicionar</button>' +
    "</form>"
  );
}

function tplDetailActions(l) {
  return (
    '<button type="button" class="pill pill-visit" data-action="toggle-visit" aria-pressed="' + !!l.visitado + '">' + (l.visitado ? "✓ Visitado" : "Marcar visitado") + "</button>" +
    '<button type="button" class="pill pill-key" data-action="cycle-key" data-state="' + l.chave + '">' + KEY_LABEL[l.chave] + "</button>" +
    (l.custom ? '<button type="button" class="link-btn" data-action="delete-local">Remover local</button>' : "")
  );
}

function tplDetail(c) {
  const l = c.locais[ui.detail];
  return (
    '<div class="detail-head">' +
      '<button type="button" class="icon-btn" data-action="close-detail" aria-label="Voltar aos locais">←</button>' +
      '<h2 class="h2 h2-lg">' + esc(l.nome) + "</h2>" +
    "</div>" +
    '<textarea class="lined lined-detail" data-field="nota" aria-label="Pistas encontradas em ' + esc(l.nome) + '" placeholder="Pistas encontradas aqui…">' + esc(l.nota) + "</textarea>" +
    '<div class="detail-actions" id="detail-actions">' + tplDetailActions(l) + "</div>"
  );
}

function tplPerguntas(c) {
  return (
    c.perguntas.map((p, i) =>
      '<div class="qcard" data-i="' + i + '">' +
        '<input class="q-text" data-field="q" aria-label="Pergunta" placeholder="Pergunta" value="' + esc(p.q) + '">' +
        '<button type="button" class="q-del" data-action="delete-q" aria-label="Remover pergunta">×</button>' +
        '<input class="q-ans" data-field="a" aria-label="Resposta" placeholder="Sua resposta" value="' + esc(p.a) + '">' +
      "</div>").join("") +
    '<div><button type="button" class="btn-dashed" data-action="add-q">+ Pergunta</button></div>'
  );
}

function renderPanel(animate) {
  const c = cur();
  const panel = $("#panel");
  let html;
  if (ui.tab === "caso") html = tplCaso(c);
  else if (ui.tab === "perguntas") html = tplPerguntas(c);
  else if (ui.detail == null) html = tplLocais(c);
  else html = tplDetail(c);
  panel.innerHTML = '<section class="panel' + (animate ? " enter" : "") + '">' + html + "</section>";
  panel.querySelectorAll("textarea.lined").forEach(grow);
}

function renderAll() {
  renderSelect();
  renderHero();
  renderTabs();
  renderPanel(true);
}

// Rola só o suficiente pro topo do painel ficar logo abaixo das abas
function scrollToPanel() {
  const offset = $(".top").offsetHeight + $(".tabs").offsetHeight;
  const y = $("#panel").getBoundingClientRect().top + window.scrollY - offset;
  if (window.scrollY > y) window.scrollTo(0, y);
}

/* ---------- Navegação do detalhe (botão voltar do celular fecha o local) ---------- */

function openDetail(i) {
  ui.detail = i;
  history.pushState({ detail: true }, "");
  renderPanel(true);
  scrollToPanel();
}
function closeDetail() {
  if (history.state && history.state.detail) history.back();
  else { ui.detail = null; renderPanel(true); }
}
function leaveDetail() {
  if (history.state && history.state.detail) history.replaceState(null, "");
  ui.detail = null;
}
window.addEventListener("popstate", () => {
  if (ui.detail != null) {
    ui.detail = null;
    renderPanel(true);
  }
});

/* ---------- Eventos ---------- */

document.addEventListener("input", (e) => {
  const t = e.target;
  const c = cur();
  const field = t.dataset.field;
  if (t.id === "numero" || t.id === "titulo") {
    c[t.id] = t.value;
    const opt = $("#caso-sel").selectedOptions[0];
    if (opt) opt.textContent = rotulo(c);
  } else if (field === "relato") {
    c.relato = t.value;
    grow(t);
    renderTabs();
  } else if (field === "nota" && ui.detail != null) {
    c.locais[ui.detail].nota = t.value;
    grow(t);
  } else if (field === "q" || field === "a") {
    c.perguntas[+t.closest("[data-i]").dataset.i][field] = t.value;
    if (field === "a") renderTabs();
  } else {
    return;
  }
  save();
});

document.addEventListener("change", (e) => {
  if (e.target.id !== "caso-sel") return;
  data.currentId = e.target.value;
  leaveDetail();
  ui.tab = "caso";
  renderAll();
  window.scrollTo(0, 0);
  save();
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const c = cur();

  switch (b.dataset.action) {
    case "tab":
      if (ui.tab === b.dataset.tab && ui.detail == null) return;
      leaveDetail();
      ui.tab = b.dataset.tab;
      renderTabs();
      renderPanel(true);
      scrollToPanel();
      break;

    case "theme":
      data.theme = THEMES[data.theme].next;
      applyTheme();
      save();
      break;

    case "new-case": {
      const n = novoCaso();
      data.cases.unshift(n);
      data.currentId = n.id;
      leaveDetail();
      ui.tab = "caso";
      renderAll();
      window.scrollTo(0, 0);
      $("#numero").focus();
      save();
      break;
    }

    case "delete-case":
      if (!confirm("Apagar \"" + rotulo(c) + "\" e todas as anotações dele?")) return;
      data.cases = data.cases.filter((x) => x.id !== c.id);
      if (!data.cases.length) data.cases.push(novoCaso());
      data.currentId = data.cases[0].id;
      leaveDetail();
      ui.tab = "caso";
      renderAll();
      window.scrollTo(0, 0);
      save();
      break;

    case "filter":
      data.filtro = b.dataset.f;
      document.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.f === data.filtro)));
      $("#tiles").innerHTML = tplTiles(c);
      save();
      break;

    case "open-local":
      openDetail(+b.dataset.i);
      break;

    case "close-detail":
      closeDetail();
      break;

    case "toggle-visit": {
      const l = c.locais[ui.detail];
      l.visitado = !l.visitado;
      $("#detail-actions").innerHTML = tplDetailActions(l);
      renderTabs();
      save();
      break;
    }

    case "cycle-key": {
      const l = c.locais[ui.detail];
      l.chave = (l.chave + 1) % 3;
      $("#detail-actions").innerHTML = tplDetailActions(l);
      save();
      break;
    }

    case "delete-local": {
      const l = c.locais[ui.detail];
      if (!confirm("Remover o local \"" + l.nome + "\"?")) return;
      c.locais.splice(ui.detail, 1);
      closeDetail();
      if (ui.detail != null) { ui.detail = null; renderPanel(true); } // history.back() fecha de forma assíncrona
      renderTabs();
      save();
      break;
    }

    case "add-q":
      c.perguntas.push({ q: "", a: "" });
      renderPanel(false);
      renderTabs();
      $('.qcard[data-i="' + (c.perguntas.length - 1) + '"] .q-text').focus();
      save();
      break;

    case "delete-q":
      c.perguntas.splice(+b.closest("[data-i]").dataset.i, 1);
      renderPanel(false);
      renderTabs();
      save();
      break;
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "add-loc") return;
  e.preventDefault();
  const inp = $("#novo-local");
  const nome = inp.value.trim();
  if (!nome) { inp.focus(); return; }
  const c = cur();
  c.locais.push({ nome, nota: "", visitado: false, chave: 0, custom: true });
  data.filtro = "todos";
  renderPanel(false);
  renderTabs();
  $("#novo-local").focus();
  save();
});

window.addEventListener("resize", () => document.querySelectorAll("textarea.lined").forEach(grow));

/* ---------- Início ---------- */

applyTheme();
renderAll();

// Pede ao navegador pra não apagar os dados quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
})();
