FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (dev + prod) so we can build and generate Prisma client
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy only schema first to leverage layer cache if code changes more often than schema
COPY prisma ./prisma
# Generate Prisma client for linux-musl (Alpine) platform
RUN npx prisma generate

# Copy rest of the source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy package manifest and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# Copy generated Prisma client and built app
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 8080
CMD ["node", "dist/server.js"]