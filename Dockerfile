FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma CLI (same version as package.json) so the container can run `migrate deploy`.
RUN npm install -g prisma@6.19.3 && npm cache clean --force
COPY --from=build /app/prisma ./prisma
COPY docker/start.sh ./start.sh
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["sh", "start.sh"]
