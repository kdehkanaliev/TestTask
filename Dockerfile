# ============ Build stage ============
FROM node:20-alpine AS builder

WORKDIR /app

# Faqat package fayllarini ko'chirib, dependency cache'ni optimallashtiramiz
COPY package*.json ./
RUN npm ci --only=production

# ============ Production stage ============
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Runtime uchun root bo'lmagan user yaratamiz
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Dependencylar allaqachon o'rnatilgan (production-only)
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Startupda db schema yaratib, so'ng serverni ishga tushiramiz
USER appuser

EXPOSE 3000

CMD ["sh", "-c", "node db/init.js && node server.js"]
