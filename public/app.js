const especialidade = document.querySelector('#especialidade');
const profissional = document.querySelector('#profissional');
const data = document.querySelector('#data');
const horario = document.querySelector('#horario');
const cpf = document.querySelector('#cpf');
const cpfConsulta = document.querySelector('#cpf-consulta');
const mensagem = document.querySelector('#mensagem-agendamento');
const lista = document.querySelector('#lista-agendamentos');

const hoje = new Date();
const limite = new Date();
limite.setDate(hoje.getDate() + 60);
const paraIso = (valor) => valor.toISOString().split('T')[0];
data.min = paraIso(hoje);
data.max = paraIso(limite);

function formatarCpf(evento) {
  let valor = evento.target.value.replace(/\D/g, '').slice(0, 11);
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  evento.target.value = valor;
}
cpf.addEventListener('input', formatarCpf);
cpfConsulta.addEventListener('input', formatarCpf);

async function requisitar(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.');
  return dados;
}

async function carregarEspecialidades() {
  try {
    const itens = await requisitar('/api/especialidades');
    especialidade.innerHTML = '<option value="">Selecione</option>' +
      itens.map((item) => `<option value="${item}">${item}</option>`).join('');
  } catch (erro) {
    mensagem.textContent = erro.message;
    mensagem.className = 'mensagem erro';
  }
}

especialidade.addEventListener('change', async () => {
  profissional.disabled = true;
  data.disabled = true;
  horario.disabled = true;
  profissional.innerHTML = '<option value="">Carregando...</option>';
  if (!especialidade.value) {
    profissional.innerHTML = '<option value="">Selecione a especialidade</option>';
    return;
  }
  try {
    const itens = await requisitar(`/api/profissionais?especialidade=${encodeURIComponent(especialidade.value)}`);
    profissional.innerHTML = '<option value="">Selecione</option>' +
      itens.map((item) => `<option value="${item.id}">${item.nome} — ${item.registro}</option>`).join('');
    profissional.disabled = false;
  } catch (erro) {
    profissional.innerHTML = '<option value="">Erro ao carregar</option>';
  }
});

profissional.addEventListener('change', () => {
  data.disabled = !profissional.value;
  data.value = '';
  horario.disabled = true;
  horario.innerHTML = '<option value="">Selecione a data</option>';
});

data.addEventListener('change', async () => {
  horario.disabled = true;
  horario.innerHTML = '<option value="">Carregando...</option>';
  if (!data.value) return;
  try {
    const resultado = await requisitar(`/api/disponibilidade?profissionalId=${profissional.value}&data=${data.value}`);
    horario.innerHTML = resultado.horarios.length
      ? '<option value="">Selecione</option>' + resultado.horarios.map((item) => `<option>${item}</option>`).join('')
      : '<option value="">Sem horários nesta data</option>';
    horario.disabled = resultado.horarios.length === 0;
  } catch (erro) {
    horario.innerHTML = '<option value="">Erro ao consultar</option>';
  }
});

document.querySelector('#form-agendamento').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensagem.textContent = 'Confirmando...';
  mensagem.className = 'mensagem';
  try {
    const resultado = await requisitar('/api/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: document.querySelector('#nome').value,
        cpf: cpf.value,
        profissionalId: profissional.value,
        data: data.value,
        horario: horario.value
      })
    });
    mensagem.textContent = `Consulta confirmada! Protocolo: ${resultado.protocolo}.`;
    mensagem.className = 'mensagem sucesso';
    evento.target.reset();
    profissional.disabled = true;
    data.disabled = true;
    horario.disabled = true;
  } catch (erro) {
    mensagem.textContent = erro.message;
    mensagem.className = 'mensagem erro';
  }
});

function formatarData(dataIso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${dataIso}T12:00:00Z`));
}

async function consultarAgendamentos(cpfInformado) {
  lista.innerHTML = '<p>Consultando...</p>';
  try {
    const itens = await requisitar(`/api/agendamentos?cpf=${encodeURIComponent(cpfInformado)}`);
    if (!itens.length) {
      lista.innerHTML = '<p>Nenhum agendamento foi encontrado para este CPF.</p>';
      return;
    }
    lista.innerHTML = itens.map((item) => `
      <article class="agendamento ${item.status}">
        <div>
          <h3>${item.especialidade} — ${item.profissional}</h3>
          <p><strong>${formatarData(item.data)}, às ${item.horario}</strong></p>
          <p>Paciente: ${item.nome} · Protocolo: ${item.protocolo}</p>
          <p class="status">Status: ${item.status}</p>
        </div>
        ${item.status === 'confirmado' ? `<button class="botao-cancelar" data-id="${item.id}">Cancelar</button>` : ''}
      </article>
    `).join('');
  } catch (erro) {
    lista.innerHTML = `<p class="mensagem erro">${erro.message}</p>`;
  }
}

document.querySelector('#form-consulta').addEventListener('submit', (evento) => {
  evento.preventDefault();
  consultarAgendamentos(cpfConsulta.value);
});

lista.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('.botao-cancelar');
  if (!botao || !confirm('Deseja realmente cancelar este agendamento?')) return;
  try {
    await requisitar(`/api/agendamentos/${botao.dataset.id}?cpf=${encodeURIComponent(cpfConsulta.value)}`, { method: 'DELETE' });
    await consultarAgendamentos(cpfConsulta.value);
  } catch (erro) {
    alert(erro.message);
  }
});

carregarEspecialidades();
