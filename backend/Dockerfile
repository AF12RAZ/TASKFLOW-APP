FROM node:20-alpine

# Create non-root user (security)
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install only production deps
RUN npm install --production

# Copy rest of backend code
COPY . .

# Switch to non-root user
USER app

EXPOSE 5000

CMD ["node", "src/server.js"]

