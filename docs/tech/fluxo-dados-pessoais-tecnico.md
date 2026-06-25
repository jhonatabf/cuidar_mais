# Fluxo Técnico de Dados Pessoais

Este documento descreve o fluxo técnico de preenchimento e atualização de dados pessoais no Portal Cuidar+.

O fluxo de criação de usuário é pré-requisito obrigatório e está documentado em `docs/tech/fluxo-criar-usuario-tecnico.md`.

## Arquivos Envolvidos

| Responsabilidade | Arquivo |
| --- | --- |
| Rota `/meus-dados-pessoais` | `src/app/app.routes.ts` |
| Guarda de autenticação | `src/app/core/guards/auth.guard.ts` |
| Guardas que redirecionam para dados pessoais | `src/app/core/guards/caregiver-signup.guard.ts`, `src/app/core/guards/dashboard.guard.ts` |
| Formulário de dados pessoais | `src/app/pages/personal-data/personal-data.ts` |
| Estilos do formulário | `src/app/pages/personal-data/personal-data.scss` |
| Serviço de Auth/Firestore/Storage | `src/app/core/services/auth.ts` |
| Regras Firestore | `firestore.rules` |
| Regras Storage | `storage.rules` |

## Rotas Envolvidas

| Rota | Guarda | Componente | Observação |
| --- | --- | --- | --- |
| `/meus-dados-pessoais` | `authGuard` | `PersonalDataComponent` | Exige sessão e email verificado. |
| `/seja-cuidador` | `caregiverSignupGuard` | `BecomeCaregiverComponent` | Redireciona para dados pessoais se faltarem dados obrigatórios. |
| `/dashboard/familia` | `familyDashboardGuard` | `FamilyDashboardComponent` | Redireciona para dados pessoais se faltarem dados obrigatórios. |
| `/dashboard/cuidador` | `caregiverDashboardGuard` | `CaregiverDashboardComponent` | Redireciona para dados pessoais se faltarem dados obrigatórios. |

## Pré-Requisitos

Antes de acessar `/meus-dados-pessoais`, o usuário precisa:

1. Ter passado pelo fluxo de criação de usuário.
2. Ter uma sessão Firebase Auth ativa.
3. Ter email verificado.

O `authGuard` aplica as regras:

```ts
if (!user) {
  return router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } });
}

if (!(await auth.isCurrentUserEmailVerified())) {
  return router.createUrlTree(['/verificar-email'], { queryParams: { redirectTo: state.url } });
}
```

## Redirecionamento Como Etapa Obrigatória

Os guards de cuidador e família usam `auth.hasCompletePersonalData(account)`.

Quando faltam dados:

```ts
return router.createUrlTree(['/meus-dados-pessoais'], {
  queryParams: { redirectTo: '/seja-cuidador' },
});
```

ou:

```ts
return router.createUrlTree(['/meus-dados-pessoais'], {
  queryParams: { redirectTo: '/dashboard/familia' },
});
```

No componente, `redirectTo` altera a mensagem da tela e, após guardar com sucesso, redireciona automaticamente.

## Componente de Dados Pessoais

Arquivo:

`src/app/pages/personal-data/personal-data.ts`

Responsabilidades principais:

- Carregar usuário atual.
- Carregar documento `users/{uid}`.
- Preencher valores existentes.
- Validar campos obrigatórios.
- Validar telefone com `libphonenumber-js`.
- Validar documentos privados.
- Comprimir imagens no browser.
- Chamar `Auth.updateUserPersonalData`.
- Redirecionar para `redirectTo`, quando existir.

## Campos Enviados

O método `buildPersonalData(formData)` monta um objeto `UserPersonalData`.

| Campo | Destino |
| --- | --- |
| `email` | `users/{uid}.email` |
| `fullName` | `users/{uid}.fullName` e `displayName` no Firebase Auth |
| `birthDate` | `users/{uid}.birthDate` |
| `gender` | `users/{uid}.gender` |
| `nationality` | `users/{uid}.nationality` |
| `phone` | `users/{uid}.phone` |
| `phoneCountry` | `users/{uid}.phoneCountry` |
| `phoneCallingCode` | `users/{uid}.phoneCallingCode` |
| `phoneNational` | `users/{uid}.phoneNational` |
| `acceptedTerms` | `users/{uid}.acceptedTerms` |
| `acceptedPrivacy` | `users/{uid}.acceptedPrivacy` |
| `private.nif` | `users/{uid}.private.nif` |
| `private.documentType` | `users/{uid}.private.documentType` |
| `private.idDocument` | `users/{uid}.private.idDocument` |
| `private.address` | `users/{uid}.private.address` |
| `private.postalCode` | `users/{uid}.private.postalCode` |
| `private.criminalRecordNoPending` | `users/{uid}.private.criminalRecordNoPending` |
| `location.district` | `users/{uid}.location.district` |
| `location.county` | `users/{uid}.location.county` |

## Documentos Privados

Tipos usados:

```ts
type UserPrivateDocumentKind =
  | 'identityFront'
  | 'identityBack'
  | 'addressProof'
  | 'criminalRecordCertificate';
```

Documentos exigidos:

| Tipo | Obrigatório | Condição |
| --- | --- | --- |
| `identityFront` | Sim | Sempre. |
| `identityBack` | Sim | Apenas quando `documentType !== 'Passaporte'`. |
| `addressProof` | Sim | Sempre. |
| `criminalRecordCertificate` | Sim | Sempre. |

Validações:

- O ficheiro precisa ser imagem.
- O tamanho máximo é 5 MB.
- Se já existir documento salvo, o usuário não é obrigado a reenviar.
- Se não existir documento salvo, o upload é obrigatório.

## Upload e Storage

O componente comprime a imagem no browser antes de enviar:

- Lê o ficheiro com `FileReader`.
- Carrega em `HTMLImageElement`.
- Desenha em `canvas`.
- Exporta como JPEG.
- Limita a maior dimensão para 1600 px.

O serviço grava os ficheiros em:

```txt
users/{uid}/documents/{kind}.jpg
```

Exemplos:

```txt
users/{uid}/documents/identityFront.jpg
users/{uid}/documents/identityBack.jpg
users/{uid}/documents/addressProof.jpg
users/{uid}/documents/criminalRecordCertificate.jpg
```

Metadados gravados em Firestore:

```ts
private.documents[kind] = {
  storagePath,
  downloadUrl,
  fileName,
  contentType,
  originalSize,
  compressedSize,
  uploadedAt,
}
```

## Serviço de Atualização

Arquivo:

`src/app/core/services/auth.ts`

Método:

`Auth.updateUserPersonalData(data)`

Operações principais:

1. Garante que existe usuário autenticado.
2. Busca `users/{uid}` atual.
3. Faz upload dos documentos novos.
4. Mantém documentos existentes quando não há novo upload.
5. Atualiza `displayName` no Firebase Auth.
6. Atualiza `users/{uid}` no Firestore com `merge: true`.

Trecho essencial:

```ts
const documents = await this.uploadUserPrivateDocuments(
  user.uid,
  data.private.documents ?? existingAccount?.private?.documents ?? {},
  data.private.documentUploads ?? {},
);
```

## Validação de Completude

Método:

`Auth.hasCompletePersonalData(account)`

Ele usa:

`Auth.getMissingPersonalDataFields(account)`

Campos atualmente considerados obrigatórios:

- Nome completo.
- Data de nascimento.
- Sexo.
- Nacionalidade.
- Telemóvel.
- Termos aceitos.
- Política de Privacidade aceita.
- NIF.
- Tipo de documento.
- Número do documento.
- Código Postal.
- Declaração de inexistência de pendência criminal.
- Foto da frente do documento.
- Foto do verso, exceto para passaporte.
- Foto do comprovativo de morada.
- Foto do atestado de criminalidade.
- Distrito.
- Concelho.

Observação: morada completa existe no formulário, mas atualmente não entra na lista de campos obrigatórios de completude.

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

Impacto:

- O usuário pode atualizar o próprio documento.
- Revisores/admins podem atualizar em contexto de revisão.
- Exclusão pelo client não é permitida.

## Regras Storage Relevantes

Arquivo:

`storage.rules`

Regra relevante:

```txt
match /users/{uid}/documents/{fileName} {
  allow read: if isOwner(uid) || isReviewerOrSuperUser();
  allow create, update: if isOwner(uid)
    && isImageUpload()
    && isUnder5Mb();
  allow delete: if isOwner(uid);
}
```

Impacto:

- O usuário pode enviar e ler os próprios documentos.
- Revisores/super usuários podem ler os documentos para análise.
- Upload exige imagem e limite de 5 MB.

## Erros Tratados

O componente exibe mensagens locais antes de chamar o serviço.

Exemplos:

| Caso | Mensagem |
| --- | --- |
| Termos não aceites | Aceitação dos Termos e Condições é obrigatório. |
| Política não aceite | Aceitação da Política de Privacidade é obrigatório. |
| Telefone inválido | Introduza um número de telemóvel válido para o indicativo selecionado. |
| Documento obrigatório ausente | `{Documento} é obrigatória.` |
| Ficheiro não imagem | `{Documento} deve ser uma imagem.` |
| Ficheiro acima de 5 MB | `{Documento} deve ter no máximo 5 MB.` |

Erros vindos do serviço são mapeados por:

`Auth.getFirebaseErrorMessage(error)`

## Resultado Técnico Esperado

Ao final do fluxo:

1. `users/{uid}` contém dados pessoais completos.
2. `users/{uid}.private.documents` contém os metadados dos documentos privados.
3. Os ficheiros existem em Firebase Storage em `users/{uid}/documents`.
4. `hasCompletePersonalData(account)` passa a retornar `true`.
5. Se havia `redirectTo`, o usuário é redirecionado para a rota pretendida.
