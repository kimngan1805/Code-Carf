CREATE TABLE "PasswordResetToken" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "passwordDigest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE TABLE "PasswordResetRateLimit" (
  "key" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "PasswordResetRateLimit_pkey" PRIMARY KEY ("key", "windowStart")
);
CREATE INDEX "PasswordResetRateLimit_windowStart_idx" ON "PasswordResetRateLimit"("windowStart");
