# Toxicology Archive Security Specification

## 1. Data Invariants
1. **Owner-Only PII Isolation**: `/users/{userId}` contains `email` and `photoURL`. Only the authenticated, email-verified user whose `request.auth.uid == userId` may read or write their profile.
2. **Parent Master Gate**: Subcollections `/users/{userId}/bookmarks/{docId}` and `/users/{userId}/audits/{auditId}` require an existing parent `/users/{userId}` document (`exists(...)`) and matching `userId == request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `uid`, `userId`, `docId`, and `createdAt` cannot be modified after creation. `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
4. **Strict Key & Size Enforcement**: No ghost/shadow fields (`keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update). All strings enforce `.size()` upper bounds matching `firebase-blueprint.json`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Unauthenticated read/write** to `/users/uid1`: Expect `PERMISSION_DENIED`.
2. **Unverified email write** (`email_verified: false`) to `/users/uid1`: Expect `PERMISSION_DENIED`.
3. **Cross-user PII read** (`uid2` reading `/users/uid1`): Expect `PERMISSION_DENIED`.
4. **Shadow field injection** on `/users/uid1` (`isAdmin: true`): Expect `PERMISSION_DENIED`.
5. **Identity spoofing** on `/users/uid1/bookmarks/doc1` (`userId: "uid2"`): Expect `PERMISSION_DENIED`.
6. **ID poisoning** with invalid characters or 1.5KB path variable `/users/uid1/audits/bad$id`: Expect `PERMISSION_DENIED`.
7. **Orphaned subcollection write** to `/users/uid1/bookmarks/doc1` when `/users/uid1` does not exist: Expect `PERMISSION_DENIED`.
8. **Client timestamp forgery** (`createdAt` != `request.time`): Expect `PERMISSION_DENIED`.
9. **Immutable field mutation** (`createdAt` or `userId` altered on audit update): Expect `PERMISSION_DENIED`.
10. **Score range poisoning** (`incentivesScore: 999` or negative number): Expect `PERMISSION_DENIED`.
11. **Invalid enum verdict** (`verdict: "HACKED"`): Expect `PERMISSION_DENIED`.
12. **Blanket list scraping** across `/users`: Expect `PERMISSION_DENIED`.
