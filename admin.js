const partidasRef = db.ref("matches");
let partidaAtualId = null;

const el = (id) => document.getElementById(id);

const campos = {
  categoriaNome: el("categoriaNome"),
  dataJogo: el("dataJogo"),
  nomeQuadra: el("nomeQuadra"),
  faseTorneio: el("faseTorneio"),
  formatoJogo: el("formatoJogo"),
  status: el("status"),
};

const btnSalvar = el("btnSalvar");
const btnLimpar = el("btnLimpar");
const btnNova = el("btnNova");
const tbodyPartidas = el("tbodyPartidas");

function getBaseUrl() {
  const { origin, pathname } = window.location;
  const basePath = pathname.substring(0, pathname.lastIndexOf("/") + 1);
  return `${origin}${basePath}`;
}

function getPartidaUrl(id) {
  return `${getBaseUrl()}partida.html?id=${encodeURIComponent(id)}`;
}

function getFormatoLabel(formato) {
  const map = {
    "2_sets_adv_3tb10": "2 sets com vantagem + 3º set em super tiebreak de 10",
    "2_sets_noad_3tb10": "2 sets sem vantagem + 3º set em super tiebreak de 10",
    "1_set_adv_tb10": "1 set com vantagem + tiebreak de 10",
    "1_set_adv_tb7": "1 set com vantagem + tiebreak de 7",
    "1_set_noad_tb7": "1 set sem vantagem + tiebreak de 7",
    "1_set_pro_8_adv_tb7": "Pro set de 8 games com vantagem + tiebreak de 7",
    "1_set_pro_8_noad_tb7": "Pro set de 8 games sem vantagem + tiebreak de 7"
  };
  return map[formato] || formato || "-";
}

function getStatusClass(status) {
  if (status === "Em andamento") return "pill live";
  if (status === "Concluída") return "pill done";
  if (status === "Suspensa") return "pill warning";
  return "pill new";
}

function limparFormulario() {
  partidaAtualId = null;

  campos.categoriaNome.value = "";
  campos.dataJogo.value = "";
  campos.nomeQuadra.value = "";
  campos.faseTorneio.value = "";
  campos.formatoJogo.value = "2_sets_adv_3tb10";
  campos.status.value = "Não iniciada";
}

function preencherFormulario(partida, id) {
  partidaAtualId = id;

  campos.categoriaNome.value = partida.categoriaNome || "";
  campos.dataJogo.value = partida.dataJogo || "";
  campos.nomeQuadra.value = partida.nomeQuadra || "";
  campos.faseTorneio.value = partida.faseTorneio || "";
  campos.formatoJogo.value = partida.formatoJogo || "2_sets_adv_3tb10";
  campos.status.value = partida.status || "Não iniciada";
}

function montarPayload() {
  return {
    categoriaNome: campos.categoriaNome.value.trim(),
    dataJogo: campos.dataJogo.value,
    nomeQuadra: campos.nomeQuadra.value.trim(),
    faseTorneio: campos.faseTorneio.value.trim(),
    formatoJogo: campos.formatoJogo.value,
    status: campos.status.value,
    updatedAt: Date.now(),
    score: {
      games1: 0,
      games2: 0,
      sets1: 0,
      sets2: 0,
      tb1: 0,
      tb2: 0
    },
    players: {
      j1: "Jogador 1",
      j2: "Jogador 2"
    }
  };
}

function validarFormulario(data) {
  if (!data.categoriaNome) {
    alert("Informe o nome da categoria.");
    return false;
  }
  if (!data.dataJogo) {
    alert("Informe a data do jogo.");
    return false;
  }
  if (!data.nomeQuadra) {
    alert("Informe o nome da quadra.");
    return false;
  }
  if (!data.faseTorneio) {
    alert("Informe a fase do torneio.");
    return false;
  }
  return true;
}

async function salvarPartida() {
  const data = montarPayload();

  if (!validarFormulario(data)) return;

  try {
    let id = partidaAtualId;

    if (id) {
      await partidasRef.child(id).update({
        ...data
      });
    } else {
      const novaRef = partidasRef.push();
      id = novaRef.key;
      partidaAtualId = id;
      await novaRef.set({
        ...data,
        createdAt: Date.now()
      });
    }

    alert("Partida salva com sucesso!");
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar a partida.");
  }
}

async function excluirPartida(id) {
  if (!confirm("Tem certeza que deseja excluir esta partida?")) return;

  try {
    await partidasRef.child(id).remove();
    if (partidaAtualId === id) limparFormulario();
    alert("Partida excluída com sucesso.");
  } catch (error) {
    console.error(error);
    alert("Erro ao excluir a partida.");
  }
}

function copiarLink(link) {
  navigator.clipboard.writeText(link)
    .then(() => alert("Link copiado com sucesso!"))
    .catch(() => alert("Não foi possível copiar o link."));
}

function iconCopy() {
  return ` <svg viewBox="0 0 24 24" aria-hidden="true"> <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"/> </svg> `;
}

function iconEdit() {
  return ` <svg viewBox="0 0 24 24" aria-hidden="true"> <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/> </svg> `;
}

function iconOpen() {
  return ` <svg viewBox="0 0 24 24" aria-hidden="true"> <path d="M14 3h7v7h-2V6.41l-8.29 8.3-1.42-1.42 8.3-8.29H14V3ZM5 5h6V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2v6H5V5Z"/> </svg> `;
}

function iconDelete() {
  return ` <svg viewBox="0 0 24 24" aria-hidden="true"> <path d="M9 3h6a2 2 0 0 1 2 2v1h4v2H3V6h4V5a2 2 0 0 1 2-2Zm1 3h4V5h-4v1Zm-4 4h2v9H6v-9Zm6 0h2v9h-2v-9Zm4 0h2v9h-2v-9ZM7 21a2 2 0 0 1-2-2V9h14v10a2 2 0 0 1-2 2H7Z"/> </svg> `;
}

function renderTabela(matches) {
  tbodyPartidas.innerHTML = "";

  const partidasOrdenadas = Object.entries(matches)
    .map(([id, partida]) => ({ id, ...partida }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (partidasOrdenadas.length === 0) {
    tbodyPartidas.innerHTML = ` <div class="empty-state"> Nenhuma partida cadastrada ainda. </div> `;
    return;
  }

  partidasOrdenadas.forEach((partida) => {
    const link = getPartidaUrl(partida.id);
    const statusClass = getStatusClass(partida.status);

    const card = document.createElement("div");
    card.className = "match-item";

    card.innerHTML = ` <div class="match-item-row"> <span class="match-label">Categoria</span> <span class="match-value">${partida.categoriaNome || "-"}</span> </div> <div class="match-item-row"> <span class="match-label">Data</span> <span class="match-value">${partida.dataJogo || "-"}</span> </div> <div class="match-item-row"> <span class="match-label">Quadra</span> <span class="match-value">${partida.nomeQuadra || "-"}</span> </div> <div class="match-item-row"> <span class="match-label">Fase</span> <span class="match-value">${partida.faseTorneio || "-"}</span> </div> <div class="match-item-row"> <span class="match-label">Formato</span> <span class="match-value">${getFormatoLabel(partida.formatoJogo)}</span> </div> <div class="match-item-row"> <span class="match-label">Status</span> <span class="match-value"> <span class="${statusClass}">${partida.status || "Não iniciada"}</span> </span> </div> <div class="match-item-row"> <span class="match-label">Link</span> <span class="match-value"> <div class="row-actions"> <button class="btn mini info icon-btn" data-action="copiar" data-link="${link}" title="Copiar link" aria-label="Copiar link"> ${iconCopy()} </button> </div> </span> </div> <div class="match-actions-block"> <div class="row-actions"> <button class="btn mini info icon-btn" data-action="editar" data-id="${partida.id}" title="Editar" aria-label="Editar"> ${iconEdit()} </button> <button class="btn mini warning icon-btn" data-action="abrir" data-link="${link}" title="Abrir" aria-label="Abrir"> ${iconOpen()} </button> <button class="btn mini danger icon-btn" data-action="excluir" data-id="${partida.id}" title="Excluir" aria-label="Excluir"> ${iconDelete()} </button> </div> </div> `;

    tbodyPartidas.appendChild(card);
  });
}

tbodyPartidas.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === "copiar") {
    copiarLink(btn.dataset.link);
  }

  if (action === "editar") {
    const id = btn.dataset.id;

    try {
      const snap = await partidasRef.child(id).once("value");
      const partida = snap.val();

      if (!partida) {
        alert("Partida não encontrada.");
        return;
      }

      preencherFormulario(partida, id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar a partida.");
    }
  }

  if (action === "abrir") {
    window.open(btn.dataset.link, "_blank", "noopener");
  }

  if (action === "excluir") {
    await excluirPartida(btn.dataset.id);
  }
});

btnSalvar.addEventListener("click", salvarPartida);
btnLimpar.addEventListener("click", limparFormulario);
btnNova.addEventListener("click", limparFormulario);

partidasRef.on("value", (snap) => {
  const data = snap.val() || {};
  renderTabela(data);
});

limparFormulario();