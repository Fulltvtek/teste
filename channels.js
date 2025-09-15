// channels.js — lista de canais
const CHANNELS = [
  { id: 1, number: 1, name: "Globo SP", category: "Abertos", quality: "HD", logoUrl: "https://reidoscanais.life/img/tvglobo.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=globosp-globosaopaulo" },
  { id: 2, number: 2, name: "Globo RJ", category: "Abertos", quality: "HD", logoUrl: "https://reidoscanais.life/img/tvglobo.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=globorj-globorio" },
  { id: 3, number: 3, name: "SBT",      category: "Abertos", quality: "HD", logoUrl: "https://reidoscanais.life/img/sbt.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=sbt" },
  { id: 4, number: 4, name: "BAND",     category: "Abertos", quality: "HD", logoUrl: "https://reidoscanais.life/img/band.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=band" },
  { id: 5, number: 5, name: "Record",   category: "Abertos", quality: "HD", logoUrl: "https://reidoscanais.life/img/record.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=record" },

  { id: 6, number: 6, name: "1 - Lounge",               category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa" },
  { id: 7, number: 7, name: "2- Dormitorio",            category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa2" },
  { id: 8, number: 8, name: "3- Refeitorio",            category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa3" },
  { id: 9, number: 9, name: "4 - Sala de Composição",   category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa4" },
  { id:10, number:10, name: "5 - Espaço Corpo",         category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa5" },
  { id:11, number:11, name: "6 - Deck/Área de Treino",  category: "Destaque", quality: "HD", logoUrl: "https://i.ibb.co/N6TQfNbf/Estrela-da-Casa-2-Logo-1.jpg", live: true, streamUrl: "https://reidoscanais.life/embed/?id=estreladacasa6" },

  { id:12, number:12, name: "ESPN",   category: "Esportes",   quality: "HD", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=espn" },
  { id:13, number:13, name: "ESPN 2", category: "Esportes",   quality: "HD", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=espn2" },
  { id:14, number:14, name: "ESPN 3", category: "Esportes",   quality: "HD", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=espn3" },
  { id:15, number:15, name: "ESPN 4", category: "Esportes",   quality: "HD", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=espn4" },
  { id:16, number:16, name: "ESPN 5", category: "Esportes",   quality: "HD", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=espn5" },
  { id:17, number:17, name: "Sportv", category: "Esportes",   quality: "HD", logoUrl: "https://i.imgur.com/eHJ8Vm3.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=sportvalternativo" },
  { id:18, number:18, name: "Sportv 2", category: "Esportes", quality: "HD", logoUrl: "https://i.imgur.com/eHJ8Vm3.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=sportv2" },
  { id:19, number:19, name: "Sportv 3", category: "Esportes", quality: "HD", logoUrl: "https://i.imgur.com/eHJ8Vm3.png", live: true, streamUrl: "https://reidoscanais.life/embed/?id=sportv3" },
];
