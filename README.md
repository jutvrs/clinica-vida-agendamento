# Clínica Vida — Sistema de Agendamento

Projeto acadêmico completo (frontend + backend) para marcação, consulta e cancelamento de consultas e exames. A aplicação atende ao **Projeto 03 — Sistema de Agendamento** da atividade de Sistematização.

## Funcionalidades

- Escolha de especialidade e profissional;
- exibição dinâmica das datas e dos horários disponíveis;
- cadastro do paciente por nome e CPF;
- validação do CPF;
- confirmação com protocolo;
- consulta de agendamentos por CPF;
- cancelamento de agendamento;
- atualização automática dos horários ocupados;
- persistência local em arquivo JSON;
- layout responsivo para computador e celular;
- API REST com respostas padronizadas.

## Tecnologias

- HTML5;
- CSS3;
- JavaScript;
- Node.js 18 ou superior;
- armazenamento em JSON.

Não é necessário instalar bibliotecas externas.

## Como executar

1. Instale o [Node.js](https://nodejs.org/) na versão 18 ou superior.
2. Abra o terminal dentro da pasta do projeto.
3. Execute:

```bash
npm start
```

4. Acesse `http://localhost:3000` no navegador.
5. Para encerrar, pressione `Ctrl + C` no terminal.

## Executar os testes

```bash
npm test
```

## Estrutura do projeto

```text
projeto-agendamento-clinica/
├── data/
│   ├── agendamentos.json
│   └── profissionais.json
├── docs/
│   └── EAP.md
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── tests/
│   └── api.test.js
├── package.json
├── README.md
└── server.js
```

## Endpoints da API

| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/api/especialidades` | Listar especialidades |
| GET | `/api/profissionais?especialidade=...` | Filtrar profissionais |
| GET | `/api/disponibilidade?profissionalId=1&data=AAAA-MM-DD` | Consultar horários |
| POST | `/api/agendamentos` | Criar agendamento |
| GET | `/api/agendamentos?cpf=...` | Consultar por CPF |
| DELETE | `/api/agendamentos/{id}?cpf=...` | Cancelar agendamento |

## Roteiro sugerido para o vídeo

1. Apresentar o objetivo do sistema.
2. Mostrar rapidamente a organização das pastas e as tecnologias.
3. Iniciar o projeto com `npm start`.
4. Escolher especialidade, profissional, data e horário.
5. Preencher nome e um CPF válido e confirmar.
6. Copiar o CPF para a área “Meus agendamentos”.
7. Mostrar o agendamento e realizar o cancelamento.
8. Encerrar destacando que os dados ficam no arquivo `data/agendamentos.json`.

## Observação acadêmica

Os nomes e registros dos profissionais são fictícios. O projeto foi desenvolvido exclusivamente para fins educacionais.
