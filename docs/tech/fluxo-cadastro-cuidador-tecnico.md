# Fluxo Técnico de Cadastro de Cuidador

Este documento descreve o fluxo técnico de criação e atualização do perfil de cuidador no Portal Cuidar+.

Os fluxos técnicos de criação de usuário e dados pessoais são pré-requisitos:

- `docs/tech/fluxo-criar-usuario-tecnico.md`
- `docs/tech/fluxo-dados-pessoais-tecnico.md`

## Arquivos Envolvidos

| Responsabilidade | Arquivo |
| --- | --- |
| Rota `/seja-cuidador` | `src/app/app.routes.ts` |
| Guarda de acesso | `src/app/core/guards/caregiver-signup.guard.ts` |
| Formulário de cuidador | `src/app/pages/become-caregiver/become-caregiver.ts` |
| Estilos do formulário | `src/app/pages/become-caregiver/become-caregiver.scss` |
| Serviço Auth/Firestore/Storage | `src/app/core/services/auth.ts` |
| Dashboard cuidador | `src/app/pages/caregiver-dashboard/caregiver-dashboard.ts` |
| Regras Firestore | `firestore.rules` |
| Regras Storage | `storage.rules` |

## Rota Envolvida

| Rota | Guarda | Componente |
| --- | --- | --- |
| `/seja-cuidador` | `caregiverSignupGuard` | `BecomeCaregiverComponent` |

## Pré-Requisitos

O `caregiverSignupGuard` exige:

1. Sessão ativa.
2. Email verificado.
3. Dados pessoais completos.

Se faltar sessão:

```ts
return router.createUrlTree(['/login'], {
  queryParams: { redirectTo: '/seja-cuidador' },
});
```

Se faltar verificação de email:

```ts
return router.createUrlTree(['/verificar-email'], {
  queryParams: { redirectTo: '/seja-cuidador' },
});
```

Se faltarem dados pessoais:

```ts
return router.createUrlTree(['/meus-dados-pessoais'], {
  queryParams: { redirectTo: '/seja-cuidador' },
});
```

## Componente de Cadastro

Arquivo:

`src/app/pages/become-caregiver/become-caregiver.ts`

Responsabilidades principais:

- Carregar perfil de cuidador existente.
- Preencher formulário com dados já salvos.
- Bloquear edição quando o perfil aprovado ainda está dentro da janela de bloqueio.
- Validar campos obrigatórios.
- Validar certificados de formação.
- Comprimir imagens dos certificados no browser.
- Montar `CaregiverRegistration`.
- Chamar `Auth.registerCaregiver`.
- Redirecionar para `/dashboard/cuidador`.

## Dados Enviados

O método `buildCaregiverRegistration(formData)` monta um objeto `CaregiverRegistration`.

| Grupo | Campos técnicos |
| --- | --- |
| `professional` | `summary`, `experienceYears`, `serviceTypes` |
| `training.items` | `id`, `trainingType`, `courseName`, `trainingEntity`, `completionDate`, `certificateFileName`, `certificate`, `certificateUpload` |
| `availability` | `weekDays`, `periods`, `availabilityTypes` |
| `rates` | `hourlyRate`, `shiftRate`, `dayRate`, `monthlyRate` |
| `skills` | Lista de competências |
| `languages` | Lista de idiomas |
| `mobility` | `drivingLicense`, `ownVehicle`, `acceptsTravel`, `travelRadius` |
| `reference` | `name`, `contact`, `contactCountry`, `contactCallingCode`, `contactNational`, `relation` |

## Validações Locais

Métodos principais:

- `getCaregiverValidationMessage(form, formData)`
- `getMissingRequiredGroup(data)`
- `getTrainingValidationMessage(formData)`

Regras atuais:

| Regra | Comportamento |
| --- | --- |
| `summary` obrigatório | Bloqueia submit se vazio. |
| `experienceYears` obrigatório | Também respeita `min=0` e `max=60`. |
| `serviceTypes` obrigatório | Exige pelo menos uma opção. |
| `weekDays` obrigatório | Exige pelo menos um dia. |
| `periods` obrigatório | Exige pelo menos um período. |
| `hourlyRate` obrigatório | Também respeita `min=0`. |
| `travelRadius` obrigatório | Exige seleção. |
| Contacto de referência | Se preenchido, deve ser telefone válido para o indicativo. |
| Formação informada | Exige nome do curso, entidade, data de conclusão e certificado. |
| Certificado | Deve ser imagem e ter no máximo 5 MB. |

Trecho essencial:

```ts
if (field.type === 'array' && this.arrayValue(formData, field.key).length === 0) {
  return `Selecione pelo menos uma opção em ${field.label}.`;
}
```

## Upload de Certificados

Os certificados são opcionais enquanto nenhuma formação for selecionada.

Quando uma formação é selecionada, o certificado torna-se obrigatório.

Fluxo técnico:

1. O componente valida o ficheiro.
2. O componente comprime a imagem no browser.
3. O componente envia `certificateUpload` dentro de `training.items`.
4. O serviço faz upload para Storage.

Caminho Storage:

```txt
caregivers/{uid}/certificates/{trainingItemId}.jpg
```

Metadados gravados:

```ts
certificate: {
  storagePath,
  fileName,
  contentType,
  originalSize,
  compressedSize,
  uploadedAt,
  status: 'pending',
}
```

## Serviço de Cadastro

Arquivo:

`src/app/core/services/auth.ts`

Método:

`Auth.registerCaregiver(data)`

Operações principais:

1. Garante usuário autenticado.
2. Busca `users/{uid}`.
3. Verifica `hasCompletePersonalData(account)`.
4. Busca perfil existente em `caregivers/{uid}`.
5. Verifica regra de bloqueio de edição após aprovação.
6. Faz upload dos certificados.
7. Atualiza `displayName`.
8. Atualiza `users/{uid}`.
9. Cria/atualiza `caregivers/{uid}`.

Trecho essencial:

```ts
if (!this.hasCompletePersonalData(account)) {
  throw new FirebaseError(
    'failed-precondition',
    'Complete os seus dados pessoais antes de criar ou atualizar o perfil de cuidador.',
  );
}
```

## Documento `users/{uid}` Atualizado

Ao guardar o cadastro de cuidador, o serviço atualiza:

```ts
{
  uid,
  email,
  role: 'caregiver',
  roles: {
    caregiver: true,
  },
  caregiverProfileStatus: 'pending',
  updatedAt,
}
```

Observação: a atualização usa `merge: true`.

## Documento `caregivers/{uid}` Criado ou Atualizado

Coleção:

`caregivers`

Documento:

`caregivers/{uid}`

Campos principais:

| Campo | Origem |
| --- | --- |
| `uid` | Firebase Auth |
| `email` | Auth ou `users/{uid}` |
| `status` | Definido como `pending` |
| `approval` | Definido como `false` |
| `approvalStatus` | Definido como `pending` |
| `approvalUserId` | `null` |
| `approvalDate` | `null` para nova submissão |
| `review.status` | `pending` |
| `review.requestedAt` | `serverTimestamp()` |
| `publicProfile` | Dados públicos do formulário e dados públicos da conta |
| `private` | Dados privados da conta, formação e referência |
| `createdAt` | `serverTimestamp()` em novo perfil |
| `updatedAt` | `serverTimestamp()` |

## Dados Públicos do Perfil

Gravados em `caregivers/{uid}.publicProfile`:

- Nome completo.
- Sexo.
- Nacionalidade.
- Distrito.
- Concelho.
- Raio de deslocação.
- Resumo profissional.
- Anos de experiência.
- Tipos de serviço.
- Tipos de formação.
- Disponibilidade.
- Valores.
- Competências.
- Idiomas.
- Mobilidade.

## Dados Privados do Perfil

Gravados em `caregivers/{uid}.private`:

- Data de nascimento.
- Telefone.
- NIF.
- Tipo de documento.
- Número do documento.
- Morada.
- Código postal.
- Formação e certificados.
- Referência.

## Estado de Revisão

Após guardar:

```ts
status: 'pending'
approvalStatus: 'pending'
approval: false
review.status: 'pending'
```

Isso coloca o cadastro na fila de análise administrativa.

## Bloqueio de Edição Após Aprovação

O componente usa:

`Auth.getCaregiverApprovalSummary(caregiverProfile)`

Regra atual:

- Se o perfil não está aprovado, pode editar.
- Se está aprovado, só pode editar novamente após 5 dias da data de aprovação.

Se estiver bloqueado:

- O formulário fica desabilitado.
- O botão de submit fica desabilitado.
- Uma mensagem informa a data em que poderá editar novamente.

## Regras Firestore Relevantes

Arquivo:

`firestore.rules`

Regra relevante:

```txt
match /caregivers/{uid} {
  allow create: if isOwner(uid);
  allow get: if isOwner(uid) || isActiveAdmin();
  allow list: if isActiveAdmin();
  allow update: if isOwner(uid) || canReview();
  allow delete: if false;
}
```

Impacto:

- O cuidador pode criar e atualizar seu próprio perfil.
- Admin/revisor pode ler e atualizar em contexto de revisão.
- Exclusão via client não é permitida.

## Regras Storage Relevantes

Arquivo:

`storage.rules`

Regra relevante:

```txt
match /caregivers/{uid}/certificates/{fileName} {
  allow read: if isOwner(uid) || isReviewerOrSuperUser();
  allow create, update: if isOwner(uid)
    && isImageUpload()
    && isUnder5Mb();
  allow delete: if isOwner(uid);
}
```

Impacto:

- O cuidador pode enviar certificados.
- Revisores podem ver certificados.
- Upload exige imagem e limite de 5 MB.

## Redirecionamento Final

Após `registerCaregiver(data)` concluir com sucesso:

```ts
await this.router.navigateByUrl('/dashboard/cuidador');
```

## Resultado Técnico Esperado

Ao final do fluxo:

1. `users/{uid}.role` é `caregiver`.
2. `users/{uid}.roles.caregiver` é `true`.
3. `users/{uid}.caregiverProfileStatus` é `pending`.
4. `caregivers/{uid}` existe ou foi atualizado.
5. `caregivers/{uid}.review.status` é `pending`.
6. Certificados enviados existem em Storage.
7. O cadastro aparece na fila de revisão administrativa.
8. O usuário é redirecionado para `/dashboard/cuidador`.
