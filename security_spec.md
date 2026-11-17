# Firestore Security Specification — TankMath Armageddon

## 1. Data Invariants
1. A player save document at `/saves/{userId}` belongs exclusively to `request.auth.uid == userId`, contains zero PII (`email`, `phone`, `address`), and can only be read (`get`), created, updated, or deleted by its verified owner. `list` is explicitly forbidden on `/saves`.
2. A leaderboard entry at `/leaderboard/{userId}` can only be written by the verified authenticated user whose UID matches both the document ID `{userId}` and `data.userId`, ensuring one tamper-resistant ranking record per player.
3. All numeric fields (`bestScore`, `totalXp`, `unlockedStage`, `highestTier`, `accuracyPct`, etc.) are strictly range-bounded integers; all strings have strict `.size()` bounds; `unlockedWeapons` is bounded to `<= 3` allowed values via `.hasOnly()`; `createdAt` is immutable and server-stamped (`request.time`).

## 2. Adversarial "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Identity Spoof on Save Create**: `uid_A` writes `/saves/uid_B` with `userId: "uid_B"`.
2. **UID Field Mismatch on Leaderboard Create**: `uid_A` writes `/leaderboard/uid_A` with `userId: "uid_B"`.
3. **Ghost Shadow Field on Save Update**: `uid_A` updates `/saves/uid_A` adding `{ isAdmin: true }`.
4. **Ghost Shadow Field on Leaderboard Create**: `uid_A` creates `/leaderboard/uid_A` with `{ verifiedCheaterBypass: true }`.
5. **Unverified Email Spoof**: User with `email_verified: false` attempts create/update on `/saves/{uid}` or `/leaderboard/{uid}`.
6. **Client-Forged Timestamp**: Client sends `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
7. **Immutable Timestamp Tamper**: Client updates `/saves/{uid}` attempting to modify `createdAt`.
8. **Resource Exhaustion / String Poisoning**: Client sets `displayName` to a 5,000-character string or uses an invalid `{userId}` path > 128 chars or containing `$`.
9. **Score Type / Bounds Poisoning**: Client sets `bestScore: 999999999` or `"9999"` (string) or `accuracyPct: 250`.
10. **Array Bombing**: Client sends `unlockedWeapons: ['standard', 'x', ... 100 items]` or invalid weapon IDs.
11. **Cross-User Save Listing**: `uid_A` calls `list` on `/saves`.
12. **Unauthenticated Write**: Anonymous/unauthenticated client attempts `create`/`update`/`delete` on `/leaderboard/{uid}` or `/saves/{uid}`.
