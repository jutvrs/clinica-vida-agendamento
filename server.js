const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROFISSIONAIS_FILE = path.join(__dirname, 'data', 'profissionais.json');
const AGENDAMENTOS_FILE = path.join(__dirname, 'data', 'agendamentos.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

function salvarJson(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

function responder(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function normalizarCpf(cpf = '') {
  return String(cpf).replace(/\D/g, '');
}

function cpfValido(cpf) {
  cpf = normalizarCpf(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calcular = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10]);
}

function dataLocal(dataIso) {
  return new Date(`${dataIso}T12:00:00`);
}

function dataFuturaValida(dataIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso || '')) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = dataLocal(dataIso);
  return !Number.isNaN(data.getTime()) && data >= hoje;
}

function disponibilidade(profissionalId, data) {
  const profissionais = lerJson(PROFISSIONAIS_FILE);
  const profissional = profissionais.find((item) => item.id === Number(profissionalId));
  if (!profissional || !dataFuturaValida(data)) return [];
  if (!profissional.diasAtendimento.includes(dataLocal(data).getDay())) return [];
  const ocupados = lerJson(AGENDAMENTOS_FILE)
    .filter((item) => item.profissionalId === profissional.id && item.data === data && item.status === 'confirmado')
    .map((item) => item.horario);
  return profissional.horarios.filter((horario) => !ocupados.includes(horario));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (parte) => {
      corpo += parte;
      if (corpo.length > 1_000_000) reject(new Error('Corpo da requisição muito grande.'));
    });
    req.on('end', () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

async function tratarApi(req, res, url) {
  const profissionais = lerJson(PROFISSIONAIS_FILE);

  if (req.method === 'GET' && url.pathname === '/api/especialidades') {
    const especialidades = [...new Set(profissionais.map((item) => item.especialidade))].sort();
    return responder(res, 200, especialidades);
  }

  if (req.method === 'GET' && url.pathname === '/api/profissionais') {
    const especialidade = (url.searchParams.get('especialidade') || '').toLowerCase();
    const nome = (url.searchParams.get('nome') || '').toLowerCase();
    const resultado = profissionais.filter((item) =>
      (!especialidade || item.especialidade.toLowerCase() === especialidade) &&
      (!nome || item.nome.toLowerCase().includes(nome))
    );
    return responder(res, 200, resultado);
  }

  if (req.method === 'GET' && url.pathname === '/api/disponibilidade') {
    const profissionalId = url.searchParams.get('profissionalId');
    const data = url.searchParams.get('data');
    if (!profissionalId || !data) return responder(res, 400, { erro: 'Informe profissionalId e data.' });
    return responder(res, 200, { horarios: disponibilidade(profissionalId, data) });
  }

  if (req.method === 'GET' && url.pathname === '/api/agendamentos') {
    const cpf = normalizarCpf(url.searchParams.get('cpf'));
    if (!cpf) return responder(res, 400, { erro: 'Informe o CPF.' });
    const resultado = lerJson(AGENDAMENTOS_FILE)
      .filter((item) => item.cpf === cpf)
      .map((item) => ({
        ...item,
        profissional: profissionais.find((prof) => prof.id === item.profissionalId)?.nome || 'Não encontrado'
      }))
      .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));
    return responder(res, 200, resultado);
  }

  if (req.method === 'POST' && url.pathname === '/api/agendamentos') {
    const corpo = await lerCorpo(req);
    const nome = String(corpo.nome || '').trim();
    const cpf = normalizarCpf(corpo.cpf);
    const profissionalId = Number(corpo.profissionalId);
    const data = String(corpo.data || '');
    const horario = String(corpo.horario || '');
    const profissional = profissionais.find((item) => item.id === profissionalId);

    if (nome.length < 3) return responder(res, 400, { erro: 'Informe o nome completo do paciente.' });
    if (!cpfValido(cpf)) return responder(res, 400, { erro: 'Informe um CPF válido.' });
    if (!profissional) return responder(res, 400, { erro: 'Profissional não encontrado.' });
    if (!disponibilidade(profissionalId, data).includes(horario)) {
      return responder(res, 409, { erro: 'O horário selecionado não está mais disponível.' });
    }

    const agendamentos = lerJson(AGENDAMENTOS_FILE);
    const agendamento = {
      id: randomUUID(),
      protocolo: `CV-${Date.now().toString().slice(-8)}`,
      nome,
      cpf,
      profissionalId,
      especialidade: profissional.especialidade,
      data,
      horario,
      status: 'confirmado',
      criadoEm: new Date().toISOString()
    };
    agendamentos.push(agendamento);
    salvarJson(AGENDAMENTOS_FILE, agendamentos);
    return responder(res, 201, { ...agendamento, profissional: profissional.nome });
  }

  const cancelar = url.pathname.match(/^\/api\/agendamentos\/([a-f0-9-]+)$/i);
  if (req.method === 'DELETE' && cancelar) {
    const cpf = normalizarCpf(url.searchParams.get('cpf'));
    const agendamentos = lerJson(AGENDAMENTOS_FILE);
    const indice = agendamentos.findIndex((item) => item.id === cancelar[1] && item.cpf === cpf);
    if (indice < 0) return responder(res, 404, { erro: 'Agendamento não encontrado para este CPF.' });
    if (agendamentos[indice].status === 'cancelado') return responder(res, 409, { erro: 'Este agendamento já foi cancelado.' });
    agendamentos[indice].status = 'cancelado';
    agendamentos[indice].canceladoEm = new Date().toISOString();
    salvarJson(AGENDAMENTOS_FILE, agendamentos);
    return responder(res, 200, { mensagem: 'Agendamento cancelado com sucesso.' });
  }

  return responder(res, 404, { erro: 'Rota não encontrada.' });
}

function servirArquivo(res, pathname) {
  const rota = pathname === '/' ? '/index.html' : pathname;
  const arquivo = path.normalize(path.join(PUBLIC_DIR, rota));
  if (!arquivo.startsWith(PUBLIC_DIR)) return responder(res, 403, { erro: 'Acesso negado.' });
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) return responder(res, 404, { erro: 'Arquivo não encontrado.' });
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await tratarApi(req, res, url);
    servirArquivo(res, url.pathname);
  } catch (erro) {
    console.error(erro);
    responder(res, 500, { erro: erro.message || 'Erro interno do servidor.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Clínica Vida disponível em http://localhost:${PORT}`));
}

module.exports = server;
