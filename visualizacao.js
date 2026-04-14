const matchesRef = db.ref("matches");

function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return "-";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function getMatchDuration(m) {
  if (m.durationMs != null) return formatDuration(m.durationMs);
  if (m.startedAt && m.endedAt) return formatDuration(m.endedAt - m.startedAt);
  if (m.startedAt && !m.endedAt) return formatDuration(Date.now() - m.startedAt);
  return "-";
}

function normalizeMatch(m, id) {
  const score = m.score || {};
  const players = m.players || {};

  return {
    id,
    ...m,
    score: {
      games1: Number(score.games1 || 0),
      games2: Number(score.games2 || 0),

      set1j1: Number(score.set1j1 || 0),
      set1j2: Number(score.set1j2 || 0),
      set2j1: Number(score.set2j1 || 0),
      set2j2: Number(score.set2j2 || 0),

      tb1: Number(score.tb1 || 0),
      tb2: Number(score.tb2 || 0),

      sets1: Number(score.sets1 || 0),
      sets2: Number(score.sets2 || 0)
    },
    players: {
      j1: players.j1 || "Jogador 1",
      j2: players.j2 || "Jogador 2"
    },
    durationText: getMatchDuration(m)
  };
}

function getStatusClass(status) {
  if (status === "Em andamento") return "pill live";
  if (status === "Concluída") return "pill done";
  if (status === "Suspensa") return "pill warning";
  return "pill new";
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

function createMatchCard(m) {
  const div = document.createElement("div");
  div.className = "match-card";

  const statusClass = getStatusClass(m.status);

  const set1J1 = m.score?.set1j1 ?? 0;
  const set1J2 = m.score?.set1j2 ?? 0;
  const set2J1 = m.score?.set2j1 ?? 0;
  const set2J2 = m.score?.set2j2 ?? 0;
  const tb1 = m.score?.tb1 ?? 0;
  const tb2 = m.score?.tb2 ?? 0;

  const hasSet2 = set2J1 > 0 || set2J2 > 0;
  const hasTB = tb1 > 0 || tb2 > 0;

  const pontos1 = hasTB ? tb1 : (m.score?.games1 ?? 0);
  const pontos2 = hasTB ? tb2 : (m.score?.games2 ?? 0);

  div.innerHTML = ` <div class="match-card-header"> <div> <h3 class="match-title">${m.categoriaNome || "Partida"}</h3> <small class="match-subtitle"> ${m.nomeQuadra || "-"} • ${m.faseTorneio || "-"} • ${m.dataJogo || "-"} </small> </div> <div class="${statusClass}">${m.status || "Não iniciada"}</div> </div> <div class="match-info-line"> <span><strong>Formato:</strong> ${getFormatoLabel(m.formatoJogo)}</span> <span><strong>Duração:</strong> ${m.durationText}</span> </div> <div class="score-table-wrap"> <div class="score-table-row score-table-head"> <div>Jogador</div> <div>1º SET</div> <div>2º SET</div> <div>PONTOS</div> </div> <div class="score-table-row"> <div class="score-player">${m.players.j1}</div> <div>${set1J1}</div> <div>${hasSet2 ? set2J1 : "-"}</div> <div>${pontos1}</div> </div> <div class="score-table-row"> <div class="score-player">${m.players.j2}</div> <div>${set1J2}</div> <div>${hasSet2 ? set2J2 : "-"}</div> <div>${pontos2}</div> </div> </div> `;

  return div;
}

function renderColunas(matches) {
  const colAtivas = document.getElementById("colAtivas");
  const colEncerradas = document.getElementById("colEncerradas");
  const contadorAtivas = document.getElementById("contadorAtivas");
  const contadorEncerradas = document.getElementById("contadorEncerradas");

  colAtivas.innerHTML = "";
  colEncerradas.innerHTML = "";

  const ativas = matches
    .filter((m) => m.status === "Em andamento")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const encerradas = matches
    .filter((m) => m.status === "Concluída")
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (contadorAtivas) contadorAtivas.textContent = ativas.length;
  if (contadorEncerradas) contadorEncerradas.textContent = encerradas.length;

  if (ativas.length === 0) {
    colAtivas.innerHTML = `<div class="card muted">Nenhuma partida em andamento.</div>`;
  } else {
    ativas.forEach((m) => {
      colAtivas.appendChild(createMatchCard(m));
    });
  }

  if (encerradas.length === 0) {
    colEncerradas.innerHTML = `<div class="card muted">Nenhuma partida encerrada.</div>`;
  } else {
    encerradas.forEach((m) => {
      colEncerradas.appendChild(createMatchCard(m));
    });
  }
}

matchesRef.on("value", (snap) => {
  const raw = snap.val() || {};
  const matches = Object.entries(raw).map(([id, m]) => normalizeMatch(m, id));
  renderColunas(matches);
});