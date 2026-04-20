FROM node:22-slim

WORKDIR /app

# Install deps first (layer-cached)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Cloud Run sets PORT to 8080 by default
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]
