# Use a multi-stage build for efficiency
# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build argument for Gemini API Key (needed for Vite build)
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Run the build script
# This produces dist/assets (frontend) and dist/server.cjs (backend)
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy the production output from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# The server listens on the port defined by the Cloud Run environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the bundled server
CMD ["node", "dist/server.cjs"]
