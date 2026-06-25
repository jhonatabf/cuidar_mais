# Mapa do Site do Portal Cuidar+

Este documento descreve o mapa atual do Portal Cuidar+, sem incluir o painel administrativo nem rotas iniciadas por `/admin`.

## Escopo

Incluído:

- Páginas públicas do portal.
- Fluxos de autenticação e cadastro do utilizador comum.
- Áreas autenticadas de família e cuidador.
- Páginas legais e institucionais.
- Rotas dinâmicas públicas, como perfil de cuidador.

Excluído:

- `/admin`
- `/admin/login`
- `/admin/revisoes/:type/:id`
- Qualquer fluxo interno de gestão administrativa.

## Navegação Global

### Header

O cabeçalho público aparece fora da área administrativa e contém:

| Item | Rota | Observação |
| --- | --- | --- |
| Marca Cuidar+ | `/` | Volta para a página inicial. |
| Como funciona | `/como-funciona` | Explica o funcionamento geral da plataforma. |
| Cuidadores | `/como-funciona/cuidadores` | Explica o fluxo para cuidadores. |
| Famílias | `/como-funciona/familias` | Explica o fluxo para famílias. |
| Segurança | `/rgpd` | Página de proteção de dados/RGPD. |
| Sobre | `/faq` | Direciona para perguntas frequentes. |
| Entrar / Cadastrar | `/login` | Disponível quando não existe sessão ativa. |

Quando existe sessão ativa, o cabeçalho exibe o menu da conta com:

| Item | Rota/Ação | Condição |
| --- | --- | --- |
| Alterar foto de perfil | Upload direto | Apenas com email verificado. |
| Meus dados pessoais | `/meus-dados-pessoais` | Apenas com email verificado. |
| Dashboard cuidador | `/dashboard/cuidador` | Quando o utilizador tem perfil de cuidador. |
| Dashboard família | `/dashboard/familia` | Quando o utilizador tem perfil de família. |
| Criar perfil de cuidador | `/seja-cuidador` | Quando ainda não tem perfil de cuidador. |
| Criar perfil de família | `/dashboard/familia` | Quando ainda não tem perfil de família. |
| Sair | Logout | Encerra a sessão e volta para `/`. |

### Footer

O rodapé público aparece fora da área administrativa e contém:

| Grupo | Item | Rota |
| --- | --- | --- |
| Institucional | Sobre nós | `/faq` |
| Institucional | Como funciona | `/como-funciona` |
| Institucional | Segurança | `/rgpd` |
| Institucional | Blog | `/faq` |
| Institucional | Contato | `/contacto` |
| Ajuda | Perguntas frequentes | `/faq` |
| Ajuda | Termos | `/termos` |
| Ajuda | Política de privacidade | `/privacidade` |

## Rotas Públicas

| Rota | Título | Componente | Objetivo |
| --- | --- | --- | --- |
| `/` | Cuidar+ \| Cuidados ao domicilio | `HomeComponent` | Página inicial, com entrada para famílias e cuidadores. |
| `/como-funciona` | Como Funciona \| Cuidar+ | `HowItWorksComponent` | Explica o funcionamento geral do serviço. |
| `/como-funciona/familias` | Como Funciona para Familias \| Cuidar+ | `HowItWorksFamiliesComponent` | Explica a jornada para famílias. |
| `/como-funciona/cuidadores` | Como Funciona para Cuidadores \| Cuidar+ | `HowItWorksCaregiversComponent` | Explica a jornada para cuidadores. |
| `/encontrar-cuidador` | Encontrar Cuidador \| Cuidar+ | `FindCaregiverComponent` | Lista cuidadores disponíveis para pesquisa. |
| `/cuidador/:id` | Perfil do Cuidador \| Cuidar+ | `CaregiverProfileComponent` | Mostra o perfil público de um cuidador específico. |
| `/login` | Login \| Cuidar+ | `LoginComponent` | Autenticação de famílias e cuidadores. |
| `/cadastro` | Cadastro \| Cuidar+ | `RegisterComponent` | Criação de conta comum, família ou cuidador. |
| `/verificar-email` | Verificar Email \| Cuidar+ | `EmailVerificationComponent` | Orienta o utilizador a validar o email. |
| `/faq` | FAQ \| Cuidar+ | `FaqComponent` | Perguntas frequentes e conteúdo institucional. |
| `/contacto` | Contacto \| Cuidar+ | `ContactComponent` | Página de contacto. |
| `/termos` | Termos \| Cuidar+ | `TermsComponent` | Termos e condições. |
| `/privacidade` | Privacidade \| Cuidar+ | `PrivacyComponent` | Política de privacidade. |
| `/cookies` | Cookies \| Cuidar+ | `CookiesComponent` | Política/informação sobre cookies. |
| `/rgpd` | RGPD \| Cuidar+ | `GdprComponent` | Informação de proteção de dados. |

## Rotas Autenticadas do Portal

Estas rotas pertencem ao portal comum e exigem sessão do utilizador.

| Rota | Título | Guarda | Componente | Regras principais |
| --- | --- | --- | --- | --- |
| `/meus-dados-pessoais` | Meus Dados Pessoais \| Cuidar+ | `authGuard` | `PersonalDataComponent` | Exige sessão e email verificado. |
| `/dashboard/familia` | Dashboard Familia \| Cuidar+ | `familyDashboardGuard` | `FamilyDashboardComponent` | Exige sessão, email verificado, dados pessoais completos e perfil de família. |
| `/dashboard/cuidador` | Dashboard Cuidador \| Cuidar+ | `caregiverDashboardGuard` | `CaregiverDashboardComponent` | Exige sessão, email verificado, dados pessoais completos e perfil de cuidador ou intenção de cuidador. |
| `/seja-cuidador` | Seja Cuidador \| Cuidar+ | `caregiverSignupGuard` | `BecomeCaregiverComponent` | Exige sessão, email verificado e dados pessoais completos. |

## Fluxos Principais

### Fluxo de visitante

1. O visitante entra por `/`.
2. Pode seguir para:
   - `/encontrar-cuidador`, se for família.
   - `/seja-cuidador`, se quiser ser cuidador.
   - `/como-funciona`, para entender a plataforma.
3. Ao tentar acessar áreas protegidas, é redirecionado para `/login`.

### Fluxo de cadastro

1. Utilizador acessa `/cadastro`.
2. Escolhe o tipo de conta:
   - `Familia`
   - `Cuidador`
3. Preenche dados essenciais:
   - Nome.
   - Data de nascimento.
   - NIF.
   - Documento de identificação.
   - Email.
   - Password.
4. Após criar a conta, é enviado para `/verificar-email`.
5. Depois da verificação, continua para:
   - `/dashboard/familia`, se for família.
   - `/seja-cuidador`, se for cuidador.

### Fluxo de login

1. Utilizador acessa `/login`.
2. Insere email e password.
3. Se o email não estiver verificado, é encaminhado para `/verificar-email`.
4. Se estiver verificado, o portal calcula o destino:
   - `/meus-dados-pessoais?redirectTo=...`, se faltarem dados pessoais obrigatórios.
   - `/dashboard/cuidador`, se já tiver perfil de cuidador.
   - `/seja-cuidador`, se for cuidador sem perfil completo.
   - `/dashboard/familia`, se for família.

### Fluxo de dados pessoais

1. Utilizador acessa `/meus-dados-pessoais`.
2. Preenche dados de conta, identificação, contacto, localização e segurança.
3. Campos/documentos atualmente exigidos:
   - Aceitação dos Termos e Condições.
   - Aceitação da Política de Privacidade.
   - Nome completo.
   - Data de nascimento.
   - Sexo.
   - Nacionalidade.
   - Contacto telefónico.
   - NIF.
   - Tipo e número do documento.
   - Foto da frente do documento.
   - Foto do verso do documento, exceto para passaporte.
   - Distrito.
   - Concelho.
   - Código Postal.
   - Foto do comprovativo de morada.
   - Declaração de inexistência de pendência criminal.
   - Foto do atestado de criminalidade.
4. Quando acessado com `redirectTo`, após guardar os dados o utilizador segue automaticamente para a próxima etapa.

### Fluxo de cuidador

1. Utilizador entra em `/seja-cuidador`.
2. Caso não esteja autenticado, vai para `/login`.
3. Caso o email não esteja verificado, vai para `/verificar-email`.
4. Caso faltem dados pessoais obrigatórios, vai para `/meus-dados-pessoais?redirectTo=/seja-cuidador`.
5. Depois, preenche o perfil de cuidador:
   - Resumo profissional.
   - Experiência.
   - Formação e certificados.
   - Disponibilidade.
   - Valores.
   - Competências.
   - Idiomas.
   - Mobilidade.
   - Referência.
6. O perfil entra em revisão.
7. O cuidador acompanha o estado em `/dashboard/cuidador`.

### Fluxo de família

1. Utilizador entra em `/dashboard/familia`.
2. Caso não esteja autenticado, vai para `/login`.
3. Caso o email não esteja verificado, vai para `/verificar-email`.
4. Caso faltem dados pessoais obrigatórios, vai para `/meus-dados-pessoais?redirectTo=/dashboard/familia`.
5. Depois acessa o dashboard de família.

## Perfis e Conteúdo Público de Cuidador

### Pesquisa

Rota: `/encontrar-cuidador`

Objetivo:

- Apresentar cuidadores.
- Permitir abrir o perfil público por meio da rota `/cuidador/:id`.

### Perfil público

Rota: `/cuidador/:id`

Objetivo:

- Mostrar dados públicos do cuidador.
- Permitir voltar para a pesquisa.
- Permitir iniciar pedido de contacto via `/cadastro`.

## Páginas Legais e de Suporte

| Rota | Função |
| --- | --- |
| `/termos` | Termos e condições do portal. |
| `/privacidade` | Política de privacidade. |
| `/cookies` | Informação sobre cookies. |
| `/rgpd` | Informação sobre proteção de dados. |
| `/contacto` | Canal de contacto. |
| `/faq` | Perguntas frequentes e conteúdo institucional. |

## Tratamento de Rotas Inválidas

| Rota | Comportamento |
| --- | --- |
| `**` | Redireciona para `/`. |

## Observações

- O portal comum exige confirmação de email para as áreas autenticadas.
- O portal comum utiliza a coleção `users` para dados pessoais, dados privados e perfis de família.
- O perfil de cuidador utiliza a coleção `caregivers` para os dados profissionais e de revisão.
- A área administrativa é independente e não faz parte deste mapa.
