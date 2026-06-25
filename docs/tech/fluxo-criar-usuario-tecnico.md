# Fluxo Técnico de Criação de Usuário

Este documento descreve o fluxo técnico da criação de usuário comum no Portal Cuidar+.

Não inclui a área administrativa.

## Arquivos Envolvidos

| Responsabilidade | Arquivo |
| --- | --- |
| Rotas do portal | `src/app/app.routes.ts` |
| Página inicial | `src/app/pages/home/home.ts` |
| Formulário de cadastro | `src/app/pages/register/register.ts` |
| Serviço de autenticação e gravação | `src/app/core/services/auth.ts` |
| Configuração Firebase | `src/app/core/firebase/firebase.config.ts` |
| Regras Firestore | `firestore.rules` |

## Rotas Envolvidas

| Rota | Componente | Observação |
| --- | --- | --- |
| `/` | `HomeComponent` | Entrada principal do portal. |
| `/login` | `LoginComponent` | Entrada alternativa para chegar ao cadastro. |
| `/cadastro` | `RegisterComponent` | Formulário que cria o usuário. |
| `/verificar-email` | `EmailVerificationComponent` | Destino após criação. |
| `/seja-cuidador` | `BecomeCaregiverComponent` | Pode iniciar o fluxo via guarda, mas não cria usuário diretamente. |

## Entrada Pelo Portal

Na home, os links relevantes para criação de usuário são:

- `routerLink="/cadastro"` no CTA `Comece agora`.
- `routerLink="/seja-cuidador"` no CTA `Sou cuidador`.
- O header possui `routerLink="/login"` em `Entrar / Cadastrar`.

O fluxo de criação real acontece em `/cadastro`.

## Componente de Cadastro

Arquivo:

`src/app/pages/register/register.ts`

O componente `RegisterComponent` controla:

- Estado `isSubmitting`.
- Estado `errorMessage`.
- Leitura opcional de `redirectTo` vindo por query param.
- Validação local do formulário.
- Chamada para `Auth.registerAccount`.
- Redirecionamento para `/verificar-email`.

## Campos do Formulário

Os campos são enviados via `FormData`:

| Campo HTML | Uso técnico |
| --- | --- |
| `accountType` | Primeiro campo do formulário. Define `role`, `roles`, `caregiverProfileStatus`, `familyProfileStatus` e destino pós-cadastro. |
| `fullName` | Nome do usuário e `displayName` no Firebase Auth. |
| `birthDate` | Data usada na validação de idade e gravada em `users/{uid}`. |
| `nif` | Gravado em `users/{uid}.private.nif`. |
| `documentType` | Gravado em `users/{uid}.private.documentType`. |
| `idDocument` | Gravado em `users/{uid}.private.idDocument`. |
| `email` | Usado no Firebase Auth e gravado em `users/{uid}.email`. |
| `password` | Usado apenas para criar a conta no Firebase Auth. Não é gravado no Firestore. |

## Validações Locais

Método principal:

`RegisterComponent.getValidationMessage(form)`

Regras atuais:

- Percorre todos os `input` e `select` do formulário.
- Usa `control.checkValidity()`.
- Usa `data-error-label` para montar mensagens.
- Valida `birthDate` com `isAdult`.
- Bloqueia menores de 18 anos.
- Só chama o serviço se não houver mensagem de erro.

Trecho essencial:

```ts
if (!control.checkValidity()) {
  return this.controlValidationMessage(control);
}

if (control.name === 'birthDate' && !this.isAdult(control.value)) {
  return 'É necessário ter pelo menos 18 anos para se cadastrar.';
}
```

## Chamada de Criação

Método:

`RegisterComponent.onSubmit(event)`

Responsabilidades:

1. Executar validação local.
2. Criar `FormData`.
3. Extrair `accountType`.
4. Chamar `this.auth.registerAccount(...)`.
5. Redirecionar para `/verificar-email`.

Trecho essencial:

```ts
await this.auth.registerAccount({
  accountType,
  fullName,
  birthDate,
  nif,
  documentType,
  idDocument,
  email,
  password,
});
```

## Serviço de Autenticação

Arquivo:

`src/app/core/services/auth.ts`

Método:

`Auth.registerAccount(data)`

Operações principais:

1. Cria usuário no Firebase Auth.
2. Atualiza `displayName`.
3. Cria documento em `users/{uid}`.
4. Envia email de verificação.

Trecho essencial:

```ts
const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
await updateProfile(credential.user, { displayName: data.fullName });
await setDoc(doc(firestoreDb, 'users', credential.user.uid), { ... });
await this.sendEmailVerificationMessage(credential.user);
```

## Documento Firestore Criado

Coleção:

`users`

Documento:

`users/{uid}`

Estrutura inicial:

| Campo | Origem | Observação |
| --- | --- | --- |
| `uid` | Firebase Auth | `credential.user.uid` |
| `email` | Formulário | Mesmo email usado no Auth. |
| `fullName` | Formulário | Também usado como `displayName`. |
| `birthDate` | Formulário | Já passou pela validação de idade. |
| `private.nif` | Formulário | Dado privado. |
| `private.documentType` | Formulário | Dado privado. |
| `private.idDocument` | Formulário | Dado privado. |
| `role` | Derivado de `accountType` | `caregiver` ou `family`. |
| `roles.caregiver` | Derivado de `accountType` | Boolean. |
| `roles.family` | Derivado de `accountType` | Boolean. |
| `caregiverProfileStatus` | Derivado de `accountType` | `pending` para cuidador, `null` para família. |
| `familyProfileStatus` | Derivado de `accountType` | `pending` para família, `null` para cuidador. |
| `familyReview` | Derivado de `accountType` | Objeto inicial apenas para família. |
| `emailVerified` | Firebase Auth | Estado inicial do usuário. |
| `createdAt` | Firestore | `serverTimestamp()`. |
| `updatedAt` | Firestore | `serverTimestamp()`. |

## Derivação Por Tipo de Conta

### Cuidador

Quando `accountType === 'Cuidador'`:

```ts
role: 'caregiver'
roles.caregiver: true
roles.family: false
caregiverProfileStatus: 'pending'
familyProfileStatus: null
familyReview: null
```

Destino:

`/verificar-email?redirectTo=/seja-cuidador`

### Família

Quando `accountType !== 'Cuidador'`:

```ts
role: 'family'
roles.caregiver: false
roles.family: true
caregiverProfileStatus: null
familyProfileStatus: 'pending'
familyReview.status: 'pending'
```

Destino:

`/verificar-email?redirectTo=/dashboard/familia`

## Email de Verificação

Método:

`Auth.sendEmailVerificationMessage(user)`

Regra:

- Se `user.emailVerified` já for `true`, não envia.
- Caso contrário, chama `sendEmailVerification`.
- A URL configurada aponta para `/verificar-email`.

Trecho essencial:

```ts
if (user.emailVerified) {
  return;
}

await sendEmailVerification(user, {
  url: `${window.location.origin}/verificar-email`,
  handleCodeInApp: false,
});
```

## Redirecionamento Pós-Cadastro

Após `registerAccount` concluir:

```ts
const fallback = accountType === 'Cuidador' ? '/seja-cuidador' : '/dashboard/familia';
await this.router.navigate(['/verificar-email'], {
  queryParams: { redirectTo: this.redirectTo() || fallback },
});
```

Observações:

- Se a rota recebeu `redirectTo`, ele tem prioridade.
- Sem `redirectTo`, o destino depende do tipo de conta escolhido antes da criação do usuário.
- A escolha do tipo de conta não acontece após a verificação de email; ela acontece no início do formulário `/cadastro`.

## Regras Firestore Relevantes

Arquivo:

`firestore.rules`

Regra relevante:

```txt
match /users/{uid} {
  allow create: if isOwner(uid);
  allow get: if isOwner(uid) || isActiveAdmin();
  allow list: if isActiveAdmin();
  allow update: if isOwner(uid) || canReview();
  allow delete: if false;
}
```

Impacto no fluxo:

- O usuário autenticado recém-criado pode criar seu próprio documento em `users/{uid}`.
- A criação depende de `request.auth.uid == uid`.
- Exclusão de usuário via client não é permitida.

## Erros Tratados

O componente captura erros e usa:

`Auth.getFirebaseErrorMessage(error)`

Mapeamentos relevantes:

| Código | Mensagem |
| --- | --- |
| `auth/email-already-in-use` | Este email já está associado a uma conta. |
| `auth/invalid-email` | O email informado não é válido. |
| `auth/weak-password` | A palavra-passe deve ter pelo menos 6 caracteres. |
| `auth/too-many-requests` | Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente. |
| `permission-denied` | Não foi possível gravar no Firestore. Verifique as regras de segurança. |

## Pontos de Atenção

- O cadastro inicial não recolhe todos os dados pessoais obrigatórios atuais. Ele cria a conta e grava apenas a base inicial.
- Dados pessoais completos são tratados posteriormente em `/meus-dados-pessoais`.
- Uploads de documentos privados não fazem parte da rota `/cadastro`; pertencem ao fluxo de dados pessoais.
- A password nunca deve ser gravada em Firestore.
- O usuário só deve acessar dashboards ou criação de perfil depois de verificar o email e completar dados obrigatórios.
