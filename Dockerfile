# ==============================================================================
# Multi-Stage Dockerfile for English Record Frontend
# ==============================================================================

# --- Stage 1: Build & Compile ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with frozen lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_S3_ENDPOINT
ARG VITE_S3_REGION
ARG VITE_S3_ACCESS_KEY_ID
ARG VITE_S3_SECRET_ACCESS_KEY
ARG VITE_S3_BUCKET_NAME
ARG VITE_R2_PUBLIC_URL
ARG VITE_AI_API_KEY
ARG VITE_CLOUDFLARE_ACCOUNT_ID
ARG VITE_CLOUDFLARE_API_TOKEN
ARG VITE_GEMINI_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_S3_ENDPOINT=$VITE_S3_ENDPOINT \
    VITE_S3_REGION=$VITE_S3_REGION \
    VITE_S3_ACCESS_KEY_ID=$VITE_S3_ACCESS_KEY_ID \
    VITE_S3_SECRET_ACCESS_KEY=$VITE_S3_SECRET_ACCESS_KEY \
    VITE_S3_BUCKET_NAME=$VITE_S3_BUCKET_NAME \
    VITE_R2_PUBLIC_URL=$VITE_R2_PUBLIC_URL \
    VITE_AI_API_KEY=$VITE_AI_API_KEY \
    VITE_CLOUDFLARE_ACCOUNT_ID=$VITE_CLOUDFLARE_ACCOUNT_ID \
    VITE_CLOUDFLARE_API_TOKEN=$VITE_CLOUDFLARE_API_TOKEN \
    VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Compile production bundle
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine-slim AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
