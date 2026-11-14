# Reglas de Firestore esenciales (copiables)

Helpers asumidos: `isSignedIn()`, `me()` = `request.auth.uid`, `isAdmin()` (doc en `admins/{uid}` o claim), `incoming()` = `request.resource.data`, `isShortString(s, n)`, `optString(d, k, n)`, `hasVerifiedEmail()`.

```
// 1 correo = 1 pase. Doc id = sha256(email en minúsculas).
match /pass_emails/{key} {
  allow get: if isSignedIn();
  allow list, delete: if isAdmin();
  allow create: if isSignedIn() && key.size() == 64 &&
    request.resource.data.keys().hasOnly(['code', 'userId', 'at']) &&
    request.resource.data.userId == me() &&
    isShortString(request.resource.data.code, 40) &&
    request.resource.data.at == request.time;
  allow update: if isSignedIn() &&
    (resource.data.userId == me() ||
      (hasVerifiedEmail() && hashing.sha256(request.auth.token.email.lower()).toHexString().lower() == key)) &&
    request.resource.data.keys().hasOnly(['code', 'userId', 'at']) &&
    request.resource.data.userId == me() &&
    request.resource.data.at == request.time;
}

// Roles: solo el admin los concede; cada quien lee el suyo.
match /credential_grants/{uid} {
  allow get: if isAdmin() || (isSignedIn() && uid == me());
  allow list, delete: if isAdmin();
  allow create, update: if isAdmin() &&
    incoming().keys().hasOnly(['speaker', 'sponsor', 'initiate', 'press', 'updatedAt']);
}

// Solicitud de rol (ej. Guild): una por cuenta, solo el dueño.
match /initiate_requests/{uid} {
  allow get: if isAdmin() || (isSignedIn() && uid == me());
  allow list, delete: if isAdmin();
  allow create, update: if isSignedIn() && uid == me() &&
    incoming().keys().hasOnly(['uid', 'name', 'email', 'passCode', 'pillar', 'portfolio', 'note', 'at']) &&
    incoming().uid == me() && incoming().at == request.time;
}

// Config viva (interruptor de la IA, etc.): todos leen, solo admin escribe.
match /site_config/{id} { allow get: if true; allow write: if isAdmin(); }
```

Principios: `hasOnly` en cada escritura, tamaños máximos, `at == request.time`, nadie escribe datos de otro uid, listas solo para admin. Publicar las reglas en la consola de Firebase después de cada cambio. Probar con el emulador (`scripts/rules-test/`).
