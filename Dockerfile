FROM node:18-alpine

# Install Python and curl for health checks
RUN apk add --no-cache python3 py3-pip curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all Node.js dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Install Python dependencies with --break-system-packages flag
RUN pip3 install --break-system-packages pandas openpyxl requests

# Build the application
RUN npm run build

# Copy and set up the startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Remove dev dependencies but keep necessary packages for migrations
RUN npm prune --production --include=dev && npm install drizzle-kit typescript tsx

# Set environment variable
ENV NODE_ENV=production
ENV PORT=5000

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["/app/start.sh"]