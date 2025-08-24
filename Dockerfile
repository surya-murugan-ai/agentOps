FROM node:18-alpine

# Install Python and curl for health checks
RUN apk add --no-cache python3 py3-pip curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Install Python dependencies
RUN pip3 install pandas openpyxl requests

# Build the application
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]