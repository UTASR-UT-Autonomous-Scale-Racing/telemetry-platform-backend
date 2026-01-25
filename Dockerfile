FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (dev + prod) and build TypeScript
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/server.js"]