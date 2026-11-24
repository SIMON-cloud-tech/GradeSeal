# ── Base image ──
FROM node:22-alpine

# ── Set working directory ──
WORKDIR /app

# ── Root dependencies (if any) ──
COPY package*.json ./
RUN if [ -f package.json ]; then npm install; fi

# ── BACKEND ──
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev || npm install --omit=dev
COPY server/ ./

# ── FRONTEND ──
WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm ci || npm install
COPY client/ ./
RUN rm -rf dist && npm run build

# ── Move fresh built frontend to backend's static folder ──
WORKDIR /app
RUN rm -rf ./server/public && mkdir -p ./server/public && cp -r ./client/dist/* ./server/public/

# ── Expose port ──
EXPOSE 5000

# ── Start backend ──
WORKDIR /app/server
CMD ["node", "server.js"]
