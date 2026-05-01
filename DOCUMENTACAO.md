# SCAF – Sistema de Controle de Afastamentos
### Polícia Militar do Amazonas | Diretoria de Inativos – DINATIV

---

## 1. OBJETIVO

O **SCAF** é um sistema web interno desenvolvido para a **Diretoria de Inativos da PMAM (DINATIV)** com o objetivo de:

- Cadastrar e gerenciar os **policiais militares** lotados na unidade
- Registrar e controlar **afastamentos** (férias, licenças, dispensas, etc.)
- Gerar **requerimentos formais em PDF** prontos para assinatura digital via Gov.br
- Receber o **upload do documento assinado** digitalmente
- Planejar o **calendário anual de férias** com datas de início/fim por período
- Emitir **relatórios** filtráveis por ano, mês e militar

---

## 2. ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE                    │
│                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────┐ │
│  │  PostgreSQL │◄──│   Backend    │◄──│ Frontend │ │
│  │  porta 5432 │   │  Node/Express│   │  Nginx   │ │
│  │  (interno)  │   │  porta 3001  │   │ porta 80 │ │
│  └─────────────┘   └──────────────┘   └──────────┘ │
│                                              │       │
└──────────────────────────────────────────────┼───────┘
                                               │
                                    http://localhost (local)
                         ou  https://xxxx.ngrok-free.dev (internet)
```

### Três containers Docker:

| Container | Imagem | Função |
|---|---|---|
| `pmam_db` | postgres:15-alpine | Banco de dados relacional |
| `pmam_backend` | node:20-alpine | API REST (Express.js) |
| `pmam_frontend` | nginx:alpine | Serve o React compilado e faz proxy para o backend |

---

## 3. STACK TECNOLÓGICA

### Backend (`/backend`)
| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20 (LTS) | Runtime |
| Express.js | 4.21 | Framework HTTP / API REST |
| PostgreSQL | 15 | Banco de dados |
| pg (node-postgres) | 8.13 | Driver do banco |
| pdfkit | 0.15 | Geração de PDF do requerimento |
| multer | 1.4.5 | Upload de arquivos PDF assinados |
| helmet | 8.0 | Segurança HTTP |
| cors | 2.8 | Controle de origens permitidas |
| dotenv | 16.4 | Variáveis de ambiente |

### Frontend (`/frontend`)
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.7 | Tipagem estática |
| Vite | 6.0 | Build tool / bundler |
| Tailwind CSS | 3.4 | Estilização utilitária |
| React Router DOM | 6.28 | Navegação SPA |
| Axios | 1.7 | Requisições HTTP |
| date-fns | 4.1 | Manipulação de datas |
| react-hook-form | 7.54 | Gerenciamento de formulários |
| react-hot-toast | 2.4 | Notificações toast |
| lucide-react | 0.468 | Ícones SVG |
| recharts | 2.14 | Gráficos (dashboard) |

---

## 4. ESTRUTURA DE ARQUIVOS

```
App Afastamento PMAM/
├── docker-compose.yml          # Orquestração dos 3 containers
├── .env                        # Variáveis de ambiente (senhas, secrets)
│
├── backend/
│   ├── Dockerfile
│   ├── brasao.jpeg             # Brasão da PMAM (usado no PDF)
│   ├── init.sql                # Schema inicial do banco de dados
│   ├── package.json
│   └── src/
│       ├── index.js            # Entry point + migrações automáticas
│       ├── db.js               # Pool de conexão PostgreSQL
│       ├── middleware/
│       │   └── auth.js         # Autenticação (simplificada: usuário fixo ADMIN)
│       └── routes/
│           ├── afastamentos.js # CRUD + gerar PDF + upload assinado
│           ├── militares.js    # CRUD de policiais militares
│           ├── planoFerias.js  # CRUD do plano anual de férias
│           ├── relatorios.js   # Relatórios e gráficos
│           ├── unidades.js     # CRUD de unidades
│           ├── usuarios.js     # CRUD de usuários
│           └── auth.js         # Login (não utilizado atualmente)
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # Proxy reverso: /api → backend:3001
    ├── package.json
    └── src/
        ├── App.tsx             # Rotas da aplicação
        ├── main.tsx            # Entry point React
        ├── index.css           # Estilos globais + classes Tailwind customizadas
        ├── api/
        │   └── axios.ts        # Instância Axios com baseURL configurada
        ├── contexts/
        │   └── AuthContext.tsx # Contexto de autenticação (usuário fixo ADMIN)
        ├── components/
        │   ├── Layout.tsx      # Layout base com topbar
        │   ├── Sidebar.tsx     # Menu lateral de navegação
        │   └── StatusBadge.tsx # Badge colorido de status
        ├── types/
        │   └── index.ts        # Interfaces TypeScript + constantes
        └── pages/
            ├── Dashboard.tsx         # Painel inicial com resumo e gráficos
            ├── Militares.tsx         # Lista de militares com busca e paginação
            ├── MilitarForm.tsx       # Formulário de cadastro/edição de militar
            ├── Afastamentos.tsx      # Lista de afastamentos com filtros
            ├── AfastamentoForm.tsx   # Formulário de novo/editar afastamento
            ├── AfastamentoDetalhes.tsx # Detalhes + gerar PDF + upload assinado
            ├── PlanoFerias.tsx       # Plano anual com datas por período
            ├── Relatorios.tsx        # Relatório por ano/mês/militar
            └── Configuracoes.tsx     # Tipos de afastamento e configurações
```

---

## 5. BANCO DE DADOS

### Tabelas

```
unidades          → Unidades da PMAM (DINATIV é a unidade padrão)
usuários          → Usuários do sistema (não usado ativamente)
militares         → Cadastro dos policiais militares
tipos_afastamento → 15 tipos pré-cadastrados (férias, LTS, licenças, etc.)
afastamentos      → Registro de cada afastamento individual
plano_ferias      → Plano anual de férias por militar
```

### Relacionamentos
```
militares ──── unidades (N:1)
afastamentos ── militares (N:1)
afastamentos ── tipos_afastamento (N:1)
plano_ferias ── militares (N:1)
```

### Tipos de afastamento pré-cadastrados (15 tipos)
1. Férias Regulamentares
2. Licença para Tratamento de Saúde (Próprio)
3. Licença para Acompanhamento de Familiar Enfermo
4. Licença Maternidade
5. Licença Paternidade
6. Licença Especial
7. Licença Prêmio
8. Dispensa do Serviço
9. Afastamento para Curso de Formação/Especialização
10. Afastamento para Missão Especial
11. Licença por Acidente em Serviço
12. Licença para Tratar de Interesse Particular
13. Afastamento para Estudo/Pesquisa
14. Licença por Motivo de Doença em Pessoa da Família
15. Afastamento Eleitoral

---

## 6. FUNCIONALIDADES

### 6.1 Dashboard
- Cards com totais: afastamentos no ano, em andamento, pendentes, militares ativos
- Gráfico de barras: afastamentos por mês
- Gráfico de pizza: afastamentos por tipo
- Lista dos próximos afastamentos previstos

### 6.2 Militares
- Listagem com busca por nome/CPF/matrícula
- Filtro por status (ativo/inativo)
- Paginação (20 por página)
- Ativar/desativar militar
- Cadastro com campos: Nome*, CPF*, RG*, Posto/Graduação*, Matrícula, Data de Nascimento, Sexo, Data de Ingresso, E-mail, Telefone, Observações
- Unidade fixada automaticamente como DINATIV

### 6.3 Afastamentos
- Listagem com filtros: status, tipo, ano
- Registro de novo afastamento: militar, tipo, data início/fim, motivo, observações
- Cálculo automático de dias totais
- Alerta quando período excede prazo máximo do tipo
- Detalhes do afastamento com fluxo de 3 passos:
  1. **Gerar PDF** do requerimento formal com brasão PMAM
  2. **Assinar** pelo app Gov.br
  3. **Upload** do documento assinado
- Controle de status: Pendente → Aprovado / Em Andamento / Concluído / Reprovado / Cancelado

### 6.4 Geração de PDF (Requerimento Formal)
- Cabeçalho institucional com brasão da PMAM
- Identificação completa do militar (nome, posto, CPF, RG, matrícula)
- Período do afastamento e total de dias
- Fundamentação legal por tipo de afastamento
- Motivo declarado pelo requerente
- Pedido formal endereçado ao Comandante
- Espaço para assinatura digital (Gov.br)
- Numeração sequencial (ex: Nº 000001/2026)

### 6.5 Plano Anual de Férias
- **Férias Regulamentares (30 dias)**:
  - Divisão em período único (30 dias)
  - Divisão 15+15 dias (dois períodos)
  - Divisão 10+20 dias (dois períodos)
- **Dispensa por Honra ao Mérito (8 dias)**: concedida pelo Chefe/Diretor/Comandante
- Cada período com data de início e fim (calendário)
- Cálculo automático de dias
- Alerta de militares sem previsão no ano
- Exportação em CSV

### 6.6 Relatórios
- Filtros: ano, mês, tipo de afastamento, militar (busca por nome)
- Resumo por mês: quantidade de afastamentos e total de dias
- Listagem detalhada com todos os campos
- Exportação em CSV

### 6.7 Configurações
- Cadastro e gestão dos tipos de afastamento
- Configuração de prazo máximo, base legal e se requer documento

---

## 7. API REST – ENDPOINTS

### Militares
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/militares | Listar com filtros (q, ativo, page, limit) |
| GET | /api/militares/:id | Buscar por ID |
| POST | /api/militares | Cadastrar novo |
| PUT | /api/militares/:id | Atualizar |
| PATCH | /api/militares/:id/ativo | Ativar/desativar |

### Afastamentos
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/afastamentos | Listar com filtros |
| GET | /api/afastamentos/tipos | Listar tipos |
| GET | /api/afastamentos/:id | Buscar por ID |
| POST | /api/afastamentos | Registrar novo |
| PUT | /api/afastamentos/:id | Atualizar |
| PATCH | /api/afastamentos/:id/status | Atualizar status |
| POST | /api/afastamentos/:id/gerar-documento | Gerar PDF |
| POST | /api/afastamentos/:id/upload-assinado | Upload PDF assinado |

### Plano de Férias
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/plano-ferias?ano=XXXX | Listar planos do ano |
| POST | /api/plano-ferias | Criar/atualizar plano |
| PUT | /api/plano-ferias/:id | Editar plano |
| DELETE | /api/plano-ferias/:id | Remover plano |

### Relatórios
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/relatorios/resumo | Resumo anual (dashboard) |
| GET | /api/relatorios/mensal | Totais por mês |
| GET | /api/relatorios/afastamentos-detalhado | Relatório filtrado |

---

## 8. ACESSO AO SISTEMA

### Local (mesmo computador)
```
http://localhost
```

### Rede local (mesmo Wi-Fi)
```
http://[IP_DO_MAC]
```

### Internet (via ngrok – em uso)
```
https://pueblo-sensation-flogging.ngrok-free.dev
```
> Acessível de qualquer lugar, incluindo celular via iPhone Safari ✓

### Scripts de inicialização
```bash
# Iniciar o sistema
/Users/diogoburgos/Documents/Claude/iniciar.sh

# Parar o sistema
/Users/diogoburgos/Documents/Claude/parar.sh
```

---

## 9. ERROS CONHECIDOS E SOLUÇÕES APLICADAS

### ❌ Erro 1: CPF ou matrícula já cadastrado
**Causa:** O campo matrícula, quando deixado em branco no formulário, era enviado como string vazia `""`. O PostgreSQL considera duas strings vazias como iguais na constraint `UNIQUE`, causando conflito ao cadastrar o segundo militar sem matrícula.
**Solução:** Backend convertendo string vazia para `NULL` antes de salvar: `matricula && matricula.trim() ? matricula.trim() : null`

### ❌ Erro 2: Afastamentos não abria / formulário em branco
**Causa:** Incompatibilidade entre `react-datepicker v7.5` e `date-fns v4.1`. O datepicker usa APIs internas do date-fns que mudaram na versão 4, causando erro de runtime silencioso que derrubava o componente.
**Solução:** Substituído pelo `<input type="date">` nativo do HTML5, sem dependências externas.

### ❌ Erro 3: Relatório não exibia dados
**Causa:** As datas retornadas pela API de relatórios vinham no formato ISO completo `"2026-01-01T00:00:00.000Z"`. O código frontend tentava concatenar `+ 'T12:00:00'`, gerando `"2026-01-01T00:00:00.000ZT12:00:00"` — string de data inválida que quebrava o `parseISO()` durante a renderização.
**Solução:** Extrair apenas a parte da data com `.split('T')[0]` antes de formatar: `format(parseISO(d.split('T')[0]), 'dd/MM/yyyy')`

### ❌ Erro 4: PDF gerado não funcionava após reload da página
**Causa:** O banco de dados armazenava apenas o nome do arquivo (ex: `requerimento_000001_xxx.pdf`), sem o prefixo `/uploads/`. Ao recarregar a página, o link de download ficava quebrado.
**Solução:** Backend armazena o caminho completo `/uploads/requerimento_000001_xxx.pdf` no banco.

### ❌ Erro 5: Relatórios página em branco
**Causa:** O componente `PieChart` do Recharts travava silenciosamente com array de dados vazio no carregamento inicial, derrubando toda a página sem exibir erro visível.
**Solução:** Guard condicional `{pieData.length > 0 && <PieChart .../>}` + try/catch em todas as chamadas de API.

### ❌ Erro 6: docker-compose port 5432 já alocada
**Causa:** Outro PostgreSQL local estava usando a porta 5432.
**Solução:** Removido o mapeamento de porta externa do banco (porta 5432 ficou apenas interna ao Docker).

### ⚠️ Aviso: `version` obsoleto no docker-compose.yml
**Causa:** O atributo `version: '3.8'` foi descontinuado no Docker Compose moderno.
**Status:** Apenas aviso, não impede o funcionamento. Pode ser removido do arquivo.

---

## 10. MIGRAÇÕES AUTOMÁTICAS

Ao iniciar, o backend executa automaticamente:

```sql
-- Coluna para tipo do plano de férias
ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS tipo_plano VARCHAR(30) DEFAULT 'ferias';
ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS divisao VARCHAR(10) DEFAULT '30';
ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS mes_periodo2 INTEGER;
ALTER TABLE plano_ferias ADD COLUMN IF NOT EXISTS dias INTEGER DEFAULT 30;

-- Troca a constraint unique de (militar_id, ano) para (militar_id, ano, tipo_plano)
-- permitindo que um militar tenha férias E dispensa no mesmo ano

-- Garante que a unidade DINATIV existe no banco
INSERT INTO unidades (nome, sigla) VALUES ('Diretoria de Inativos da PMAM', 'DINATIV')
ON CONFLICT (sigla) DO NOTHING;
```

---

## 11. IDENTIDADE VISUAL

| Elemento | Valor |
|---|---|
| Cor primária (Azul PMAM) | `#1B3060` |
| Cor secundária (Dourado) | `#C8960C` |
| Fonte | Helvetica / sans-serif padrão |
| Brasão | `backend/brasao.jpeg` (incluído no PDF) |
| Logo sidebar | Ícone Shield (lucide-react) |

---

## 12. SEGURANÇA (ATUAL)

> ⚠️ **Nota:** O sistema atualmente opera sem autenticação ativa. O middleware de auth foi simplificado para um usuário fixo (`Administrador / admin@pmam.am.gov.br / perfil: admin`) para facilitar o uso interno. Para produção em rede pública, recomenda-se reativar o sistema de login com JWT.

- Helmet.js ativo (headers de segurança HTTP)
- CORS configurado
- Upload restrito a arquivos PDF (max 15 MB)
- Variáveis sensíveis em `.env` (não versionado)

---

*Documento gerado automaticamente em 26/04/2026*
*Sistema desenvolvido com Claude Code (Anthropic) para uso interno da DINATIV/PMAM*
