const assert = require('assert');
const fs = require('fs');
const path = require('path');
const server = require('../server');

const arquivoAgendamentos = path.join(__dirname, '..', 'data', 'agendamentos.json');
const backup = fs.readFileSync(arquivoAgendamentos, 'utf8');

async function executar() {
  await new Promise((resolve) => server.listen(0, resolve));
  const porta = server.address().port;
  const base = `http://localhost:${porta}`;

  try {
    let resposta = await fetch(`${base}/api/especialidades`);
    assert.equal(resposta.status, 200);
    const especialidades = await resposta.json();
    assert.ok(especialidades.includes('Cardiologia'));

    resposta = await fetch(`${base}/api/profissionais?especialidade=Cardiologia`);
    const profissionais = await resposta.json();
    assert.equal(profissionais.length, 1);
    assert.equal(profissionais[0].nome, 'Dr. Bruno Almeida');

    resposta = await fetch(`${base}/api/agendamentos?cpf=00000000000`);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), []);

    resposta = await fetch(`${base}/api/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Paciente Teste', cpf: '11111111111', profissionalId: 2, data: '2030-01-01', horario: '09:00' })
    });
    assert.equal(resposta.status, 400);

    const proximaData = new Date();
    proximaData.setHours(12, 0, 0, 0);
    do proximaData.setDate(proximaData.getDate() + 1);
    while (![2, 4].includes(proximaData.getDay()));
    const dataIso = proximaData.toISOString().split('T')[0];

    resposta = await fetch(`${base}/api/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Paciente Teste', cpf: '52998224725', profissionalId: 2, data: dataIso, horario: '09:00' })
    });
    assert.equal(resposta.status, 201);
    const criado = await resposta.json();
    assert.ok(criado.id);
    assert.equal(criado.status, 'confirmado');

    resposta = await fetch(`${base}/api/agendamentos?cpf=52998224725`);
    const encontrados = await resposta.json();
    assert.equal(encontrados.length, 1);
    assert.equal(encontrados[0].protocolo, criado.protocolo);

    resposta = await fetch(`${base}/api/agendamentos/${criado.id}?cpf=52998224725`, { method: 'DELETE' });
    assert.equal(resposta.status, 200);

    console.log('✓ Especialidades retornadas');
    console.log('✓ Filtro de profissionais validado');
    console.log('✓ Consulta sem registros validada');
    console.log('✓ Validação de CPF inválido confirmada');
    console.log('✓ Criação, consulta e cancelamento validados');
    console.log('Todos os testes passaram.');
  } finally {
    fs.writeFileSync(arquivoAgendamentos, backup);
    server.close();
  }
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
