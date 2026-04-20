# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Seoul
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 8080
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main"]
