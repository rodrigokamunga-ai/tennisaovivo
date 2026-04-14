const partidasRef = db.ref("matches");

const params = new URLSearchParams(window.location.search);
const partidaId = params.get("id");

const el = (id) => document.getElementById(id);

const campos = {
  jogador1: el("jogador1"),
  jogador2: el("jogador2"),
  scoreGames1: el("scoreGames1"),
  scoreGames2: el("scoreGames2"),
  tituloPartida: el("tituloPartida"),
  subtituloPartida: el("subtituloPartida"),
  mensagemErro: el("mensagemErro"),
  statusPreview: el("statusPreview"),
  formatoPreview: el("formatoPreview"),
  cronometro: el("cronometro"),
  btnIniciar: el("btnIniciar"),
  cardJogador1: el("cardJogador1"),
  cardJogador2: el("cardJogador2"),
};

let partidaAtual = null;
let timerInterval = null;

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

function getRules(formatoJogo) {
  const rules = {
    "2_sets_adv_3tb10": {
      setsToWin: 2,
      gamesToWinSet: 6,
      advantage: true,
      tiebreakAt: 6,
      tiebreakPoints: 10,
      finalSetSuperTiebreak: true
    },
    "2_sets_noad_3tb10": {
      setsToWin: 2,
      gamesToWinSet: 6,
      advantage: false,
      tiebreakAt: 6,
      tiebreakPoints: 10,
      finalSetSuperTiebreak: true
    },
    "1_set_adv_tb10": {
      setsToWin: 1,
      gamesToWinSet: 6,
      advantage: true,
      tiebreakAt: 6,
      tiebreakPoints: 10,
      finalSetSuperTiebreak: false
    },
    "1_set_adv_tb7": {
      setsToWin: 1,
      gamesToWinSet: 6,
      advantage: true,
      tiebreakAt: 6,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false
    },
    "1_set_noad_tb7": {
      setsToWin: 1,
      gamesToWinSet: 6,
      advantage: false,
      tiebreakAt: 6,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false
    },
    "1_set_pro_8_adv_tb7": {
      setsToWin: 1,
      gamesToWinSet: 8,
      advantage: true,
      tiebreakAt: 8,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false
    },
    "1_set_pro_8_noad_tb7": {
      setsToWin: 1,
      gamesToWinSet: 8,
      advantage: false,
      tiebreakAt: 8,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false
    }
  };

  return rules[formatoJogo] || rules["2_sets_adv_3tb10"];
}

function setTexto(elm, valor, fallback = "-") {
  if (!elm) return;
  elm.textContent = valor !== undefined && valor !== null && valor !== "" ? valor : fallback;
}

function applyStatusClass(elm, status) {
  if (!elm) return;

  elm.className = "match-status-pill";

  if (status === "Em andamento") {
    elm.classList.add("live");
  } else if (status === "Concluída") {
    elm.classList.add("done");
  } else if (status === "Suspensa") {
    elm.classList.add("warning");
  } else {
    elm.classList.add("new");
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function getDurationMs(partida) {
  if (!partida) return 0;

  if (partida.status === "Em andamento" && partida.startedAt) {
    return Date.now() - partida.startedAt;
  }

  if (partida.startedAt && partida.endedAt) {
    return partida.endedAt - partida.startedAt;
  }

  if (partida.durationMs != null) {
    return partida.durationMs;
  }

  return 0;
}

function updateTimer() {
  if (!campos.cronometro) return;

  if (!partidaAtual || !partidaAtual.startedAt || partidaAtual.status !== "Em andamento") {
    campos.cronometro.textContent = formatDuration(partidaAtual?.durationMs || 0);
    return;
  }

  const elapsed = Date.now() - partidaAtual.startedAt;
  campos.cronometro.textContent = formatDuration(elapsed);
}

function clearWinnerClasses() {
  campos.cardJogador1?.classList.remove("winner", "loser");
  campos.cardJogador2?.classList.remove("winner", "loser");
}

function normalizeScoreObject(score = {}) {
  return {
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
  };
}

function ensureScoreFields(partida) {
  partida.score = normalizeScoreObject(partida.score);
  return partida;
}

function getCurrentPhase(partida) {
  const rules = getRules(partida.formatoJogo);
  const s1 = Number(partida.score?.sets1 || 0);
  const s2 = Number(partida.score?.sets2 || 0);
  const g1 = Number(partida.score?.games1 || 0);
  const g2 = Number(partida.score?.games2 || 0);

  if (rules.finalSetSuperTiebreak) {
    if (s1 === 1 && s2 === 1) return "superTiebreak";
    return "gamesNormais";
  }

  if (g1 >= rules.tiebreakAt && g2 >= rules.tiebreakAt) {
    return "tiebreak";
  }

  return "gamesNormais";
}

function isTiebreakWon(tb1, tb2, targetPoints) {
  const diff = Math.abs(tb1 - tb2);
  return (tb1 >= targetPoints || tb2 >= targetPoints) && diff >= 2;
}

function isSetWon(g1, g2, rules) {
  const diff = Math.abs(g1 - g2);

  if (rules.advantage) {
    return (g1 >= rules.gamesToWinSet || g2 >= rules.gamesToWinSet) && diff >= 2;
  }

  return (g1 >= rules.gamesToWinSet || g2 >= rules.gamesToWinSet) && diff >= 1;
}

function isMatchFinished(partida) {
  const rules = getRules(partida.formatoJogo);
  const s1 = Number(partida.score?.sets1 || 0);
  const s2 = Number(partida.score?.sets2 || 0);

  if (rules.finalSetSuperTiebreak) {
    return s1 === 2 || s2 === 2;
  }

  return s1 >= rules.setsToWin || s2 >= rules.setsToWin;
}

function highlightWinner() {
  if (!partidaAtual) return;

  clearWinnerClasses();

  const score = partidaAtual.score || {};
  const s1 = Number(score.sets1 || 0);
  const s2 = Number(score.sets2 || 0);
  const g1 = Number(score.games1 || 0);
  const g2 = Number(score.games2 || 0);

  if (s1 !== s2) {
    if (s1 > s2) {
      campos.cardJogador1?.classList.add("winner");
      campos.cardJogador2?.classList.add("loser");
    } else {
      campos.cardJogador2?.classList.add("winner");
      campos.cardJogador1?.classList.add("loser");
    }
    return;
  }

  if (g1 > g2) {
    campos.cardJogador1?.classList.add("winner");
    campos.cardJogador2?.classList.add("loser");
  } else if (g2 > g1) {
    campos.cardJogador2?.classList.add("winner");
    campos.cardJogador1?.classList.add("loser");
  }
}

function setCurrentScoreUILabel(label) {
  const labels = document.querySelectorAll(".score-label");
  if (labels && labels.length >= 2) {
    labels[0].textContent = label;
    labels[1].textContent = label;
  }
}

function refreshScoreUI(partida) {
  const rules = getRules(partida.formatoJogo);
  const phase = getCurrentPhase(partida);

  if (phase === "superTiebreak" || (rules.finalSetSuperTiebreak && partida.score.sets1 === 1 && partida.score.sets2 === 1)) {
    setCurrentScoreUILabel("Supertiebreak");
    if (campos.scoreGames1) campos.scoreGames1.value = partida.score.tb1;
    if (campos.scoreGames2) campos.scoreGames2.value = partida.score.tb2;
  } else {
    setCurrentScoreUILabel("Games");
    if (campos.scoreGames1) campos.scoreGames1.value = partida.score.games1;
    if (campos.scoreGames2) campos.scoreGames2.value = partida.score.games2;
  }
}

function renderPartida(partida) {
  if (!partida) return;

  partida = ensureScoreFields(partida);

  if (campos.jogador1) campos.jogador1.value = partida.players?.j1 || "Jogador 1";
  if (campos.jogador2) campos.jogador2.value = partida.players?.j2 || "Jogador 2";

  setTexto(campos.tituloPartida, partida.categoriaNome || "Partida");
  setTexto(
    campos.subtituloPartida,
    `${partida.nomeQuadra || "-"} • ${partida.faseTorneio || "-"} • ${partida.dataJogo || "-"}`
  );
  setTexto(campos.formatoPreview, getFormatoLabel(partida.formatoJogo));

  applyStatusClass(campos.statusPreview, partida.status);
  setTexto(campos.statusPreview, partida.status || "Não iniciada");

  if (campos.btnIniciar) {
    if (partida.status === "Em andamento") {
      campos.btnIniciar.textContent = "Partida em andamento";
      campos.btnIniciar.disabled = true;
    } else if (partida.status === "Concluída") {
      campos.btnIniciar.textContent = "Partida concluída";
      campos.btnIniciar.disabled = true;
    } else {
      campos.btnIniciar.textContent = "Iniciar partida";
      campos.btnIniciar.disabled = false;
    }
  }

  refreshScoreUI(partida);
  highlightWinner();
  updateTimer();
}

async function carregarPartida(id) {
  try {
    const snap = await partidasRef.child(id).once("value");
    const partida = snap.val();

    if (!partida) {
      if (campos.mensagemErro) {
        campos.mensagemErro.style.display = "block";
        campos.mensagemErro.textContent = "Partida não encontrada.";
      } else {
        alert("Partida não encontrada.");
      }
      return;
    }

    partidaAtual = ensureScoreFields({
      ...partida,
      score: normalizeScoreObject(partida.score)
    });

    renderPartida(partidaAtual);
  } catch (error) {
    console.error(error);
    if (campos.mensagemErro) {
      campos.mensagemErro.style.display = "block";
      campos.mensagemErro.textContent = "Erro ao carregar a partida.";
    } else {
      alert("Erro ao carregar a partida.");
    }
  }
}

async function savePartida() {
  if (!partidaId || !partidaAtual) return;

  const dados = {
    players: {
      j1: campos.jogador1?.value.trim() || "Jogador 1",
      j2: campos.jogador2?.value.trim() || "Jogador 2"
    },
    score: normalizeScoreObject(partidaAtual.score),
    durationMs: getDurationMs(partidaAtual),
    updatedAt: Date.now(),
    createdAt: partidaAtual?.createdAt || Date.now(),
    startedAt: partidaAtual?.startedAt || null,
    endedAt: partidaAtual?.endedAt || null,
    status: partidaAtual?.status || "Não iniciada",
    categoriaNome: partidaAtual?.categoriaNome || "",
    dataJogo: partidaAtual?.dataJogo || "",
    nomeQuadra: partidaAtual?.nomeQuadra || "",
    faseTorneio: partidaAtual?.faseTorneio || "",
    formatoJogo: partidaAtual?.formatoJogo || "2_sets_adv_3tb10"
  };

  return partidasRef.child(partidaId).update(dados).then(() => {
    partidaAtual = {
      ...partidaAtual,
      ...dados,
      score: normalizeScoreObject(dados.score)
    };
    renderPartida(partidaAtual);
  });
}

async function iniciarPartida() {
  if (!partidaId) {
    alert("ID da partida não encontrado na URL.");
    return;
  }

  try {
    const dados = {
      status: "Em andamento",
      startedAt: partidaAtual?.startedAt || Date.now(),
      endedAt: null,
      updatedAt: Date.now()
    };

    await partidasRef.child(partidaId).update(dados);
    partidaAtual = { ...partidaAtual, ...dados };
    renderPartida(partidaAtual);
  } catch (error) {
    console.error(error);
    alert("Erro ao iniciar a partida.");
  }
}

async function encerrarPartida() {
  if (!partidaId || !partidaAtual) return;

  try {
    const dados = {
      status: "Concluída",
      endedAt: Date.now(),
      durationMs: getDurationMs(partidaAtual),
      updatedAt: Date.now()
    };

    await partidasRef.child(partidaId).update(dados);
    partidaAtual = { ...partidaAtual, ...dados };
    renderPartida(partidaAtual);

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao encerrar a partida.");
  }
}

async function zerarPlacar() {
  if (!partidaId || !partidaAtual) return;

  try {
    const dados = {
      score: {
        games1: 0,
        games2: 0,
        set1j1: 0,
        set1j2: 0,
        set2j1: 0,
        set2j2: 0,
        tb1: 0,
        tb2: 0,
        sets1: 0,
        sets2: 0
      },
      updatedAt: Date.now()
    };

    await partidasRef.child(partidaId).update(dados);
    partidaAtual.score = normalizeScoreObject(dados.score);
    renderPartida(partidaAtual);
  } catch (error) {
    console.error(error);
    alert("Erro ao zerar o placar.");
  }
}

function saveSetScore(partida, winnerPlayer, g1, g2) {
  const totalSetsPlayed = Number(partida.score.sets1 || 0) + Number(partida.score.sets2 || 0);

  if (totalSetsPlayed === 0) {
    partida.score.set1j1 = g1;
    partida.score.set1j2 = g2;
  } else if (totalSetsPlayed === 1) {
    partida.score.set2j1 = g1;
    partida.score.set2j2 = g2;
  }

  if (winnerPlayer === 1) {
    partida.score.sets1 += 1;
  } else {
    partida.score.sets2 += 1;
  }
}

function applyPoint(player) {
  if (!partidaAtual) return;

  partidaAtual = ensureScoreFields(partidaAtual);
  const rules = getRules(partidaAtual.formatoJogo);
  const phase = getCurrentPhase(partidaAtual);

  // SUPER TIEBREAK
  if (phase === "superTiebreak" || (rules.finalSetSuperTiebreak && partidaAtual.score.sets1 === 1 && partidaAtual.score.sets2 === 1)) {
    if (player === 1) partidaAtual.score.tb1 += 1;
    if (player === 2) partidaAtual.score.tb2 += 1;

    if (isTiebreakWon(partidaAtual.score.tb1, partidaAtual.score.tb2, rules.tiebreakPoints)) {
      if (partidaAtual.score.tb1 > partidaAtual.score.tb2) {
        partidaAtual.score.sets1 += 1;
      } else {
        partidaAtual.score.sets2 += 1;
      }

      partidaAtual.status = "Concluída";
      partidaAtual.endedAt = Date.now();
      partidaAtual.durationMs = getDurationMs(partidaAtual);
    }

    renderPartida(partidaAtual);
    savePartida();
    if (partidaAtual.status === "Concluída") encerrarPartida();
    return;
  }

  // GAMES NORMAIS
  if (player === 1) partidaAtual.score.games1 += 1;
  if (player === 2) partidaAtual.score.games2 += 1;

  const g1 = partidaAtual.score.games1;
  const g2 = partidaAtual.score.games2;

  if (isSetWon(g1, g2, rules)) {
    const winnerPlayer = g1 > g2 ? 1 : 2;

    // salva o set encerrado no campo correto
    saveSetScore(partidaAtual, winnerPlayer, g1, g2);

    // zera games do set atual
    partidaAtual.score.games1 = 0;
    partidaAtual.score.games2 = 0;

    // se ficou 1x1 no formato 2 sets + supertiebreak, prepara o TB
    if (rules.finalSetSuperTiebreak && partidaAtual.score.sets1 === 1 && partidaAtual.score.sets2 === 1) {
      partidaAtual.score.tb1 = 0;
      partidaAtual.score.tb2 = 0;
    }

    if (isMatchFinished(partidaAtual)) {
      partidaAtual.status = "Concluída";
      partidaAtual.endedAt = Date.now();
      partidaAtual.durationMs = getDurationMs(partidaAtual);
    }
  }

  renderPartida(partidaAtual);
  savePartida();

  if (partidaAtual.status === "Concluída") {
    encerrarPartida();
  }
}

function ajustarScore(campo, delta) {
  if (!partidaAtual) return;

  partidaAtual = ensureScoreFields(partidaAtual);
  const rules = getRules(partidaAtual.formatoJogo);
  const phase = getCurrentPhase(partidaAtual);

  // supertiebreak
  if (phase === "superTiebreak" || (rules.finalSetSuperTiebreak && partidaAtual.score.sets1 === 1 && partidaAtual.score.sets2 === 1)) {
    const key = campo === "scoreGames1" ? "tb1" : "tb2";
    partidaAtual.score[key] = Math.max(0, Number(partidaAtual.score[key] || 0) + delta);

    if (isTiebreakWon(partidaAtual.score.tb1, partidaAtual.score.tb2, rules.tiebreakPoints)) {
      if (partidaAtual.score.tb1 > partidaAtual.score.tb2) {
        partidaAtual.score.sets1 += 1;
      } else {
        partidaAtual.score.sets2 += 1;
      }

      partidaAtual.status = "Concluída";
      partidaAtual.endedAt = Date.now();
      partidaAtual.durationMs = getDurationMs(partidaAtual);
    }

    renderPartida(partidaAtual);
    savePartida();
    if (partidaAtual.status === "Concluída") encerrarPartida();
    return;
  }

  // games normais
  const key = campo === "scoreGames1" ? "games1" : "games2";
  partidaAtual.score[key] = Math.max(0, Number(partidaAtual.score[key] || 0) + delta);

  const g1 = partidaAtual.score.games1;
  const g2 = partidaAtual.score.games2;

  if (isSetWon(g1, g2, rules)) {
    const winnerPlayer = g1 > g2 ? 1 : 2;

    saveSetScore(partidaAtual, winnerPlayer, g1, g2);

    partidaAtual.score.games1 = 0;
    partidaAtual.score.games2 = 0;

    if (rules.finalSetSuperTiebreak && partidaAtual.score.sets1 === 1 && partidaAtual.score.sets2 === 1) {
      partidaAtual.score.tb1 = 0;
      partidaAtual.score.tb2 = 0;
    }

    if (isMatchFinished(partidaAtual)) {
      partidaAtual.status = "Concluída";
      partidaAtual.endedAt = Date.now();
      partidaAtual.durationMs = getDurationMs(partidaAtual);
    }
  }

  renderPartida(partidaAtual);
  savePartida();

  if (partidaAtual.status === "Concluída") {
    encerrarPartida();
  }
}

function bindBotoes() {
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      if (action === "g1+") applyPoint(1);
      if (action === "g1-") ajustarScore("scoreGames1", -1);
      if (action === "g2+") applyPoint(2);
      if (action === "g2-") ajustarScore("scoreGames2", -1);
      if (action === "iniciar") iniciarPartida();
      if (action === "zerar") zerarPlacar();
      if (action === "encerrar") encerrarPartida();
    });
  });
}

function autoSaveOnChange() {
  const camposParaOuvir = [
    campos.jogador1,
    campos.jogador2,
    campos.scoreGames1,
    campos.scoreGames2
  ].filter(Boolean);

  camposParaOuvir.forEach((campo) => {
    campo.addEventListener("change", () => {
      if (partidaId) savePartida();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!partidaId) {
    if (campos.mensagemErro) {
      campos.mensagemErro.style.display = "block";
      campos.mensagemErro.textContent = "ID da partida não informado na URL.";
    } else {
      alert("ID da partida não informado na URL.");
    }
    return;
  }

  await carregarPartida(partidaId);
  bindBotoes();
  autoSaveOnChange();

  timerInterval = setInterval(() => {
    updateTimer();
  }, 1000);
});