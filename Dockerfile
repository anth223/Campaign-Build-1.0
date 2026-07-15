# Use a standard Node LTS image for the build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Run the build (Vite build + esbuild compilation of server.ts)
RUN npm run build

# Use a clean, smaller Node Alpine image for production execution
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled files and build artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Expose port 3000 (standard ingress port for the app)
EXPOSE 3000

# Start the full-stack server
CMD ["npm", "start"]
