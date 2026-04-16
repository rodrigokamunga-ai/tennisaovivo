
export function formatDateBR(dateStr){
  if(!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function uid(){
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : `m_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

export function getFormatoConfig(formatoJogo){
  const config = {
    bestOfSets: 1,
    noAd: false,
    proSet: false,
    proSetGames: 6,
    tieBreakAt: 6,
    finalTBPoints: 7,
    superTBPoints: 10,
    decidingSuperTB: false,
    label: "Formato não definido"
  };

  switch (formatoJogo) {
    case "2_sets_adv_3tb10":
      config.bestOfSets = 3; config.noAd = false; config.decidingSuperTB = true; config.superTBPoints = 10;
      config.label = "2 sets com vantagem + 3º set em super tiebreak de 10";
      break;
    case "2_sets_noad_3tb10":
      config.bestOfSets = 3; config.noAd = true; config.decidingSuperTB = true; config.superTBPoints = 10;
      config.label = "2 sets sem vantagem + 3º set em super tiebreak de 10";
      break;
    case "1_set_adv_tb10":
      config.bestOfSets = 1; config.noAd = false; config.tieBreakAt = 6; config.finalTBPoints = 10;
      config.label = "1 set com vantagem + tiebreak de 10";
      break;
    case "1_set_adv_tb7":
      config.bestOfSets = 1; config.noAd = false; config.tieBreakAt = 6; config.finalTBPoints = 7;
      config.label = "1 set com vantagem + tiebreak de 7";
      break;
    case "1_set_noad_tb7":
      config.bestOfSets = 1; config.noAd = true; config.tieBreakAt = 6; config.finalTBPoints = 7;
      config.label = "1 set sem vantagem + tiebreak de 7";
      break;
    case "1_set_pro_8_adv_tb7":
      config.bestOfSets = 1; config.noAd = false; config.proSet = true; config.proSetGames = 8; config.tieBreakAt = 7; config.finalTBPoints = 7;
      config.label = "Pro set de 8 games com vantagem + tiebreak de 7";
      break;
    case "1_set_pro_8_noad_tb7":
      config.bestOfSets = 1; config.noAd = true; config.proSet = true; config.proSetGames = 8; config.tieBreakAt = 7; config.finalTBPoints = 7;
      config.label = "Pro set de 8 games sem vantagem + tiebreak de 7";
      break;
  }
  return config;
}

export function initialMatchData(overrides = {}){
  return {
    id: uid(),
    categoriaNome: "",
    dataJogo: "",
    nomeQuadra: "",
    faseTorneio: "",
    formatoJogo: "2_sets_adv_3tb10",
    linkPartida: "",
    status: "Não iniciada",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    players: { p1: "Jogador 1", p2: "Jogador 2" },
    score: { p1: 0, p2: 0, g1: 0, g2: 0, s1: 0, s2: 0, isTB: false },
    meta: { sacador: 1, servicoAtual: 1, statusServico: "1º Serviço" },
    stats1: statsDefaults(),
    stats2: statsDefaults(),
    history: [],
    feed: { text: "", priority: 0 },
    ...overrides
  };
}

export function statsDefaults(){
  return {
    fw: 0, bw: 0, rede: 0, rede_err: 0, enf: 0, enf_fh: 0, enf_bh: 0, df: 0, ace: 0,
    total: 0, primeiro_servico_total: 0, segundo_servico_total: 0, primeiro_servico_vencidos: 0,
    segundo_servico_vencidos: 0, erro_forcado: 0, erro_devolucao: 0, ponto_devolucao: 0,
    ponto_linha_base: 0, erro_linha_base: 0, break_won: 0, break_total: 0
  };
}
