FROM node:20-alpine

WORKDIR /app

# Install build dependencies for argon2 and netcat for entrypoint
RUN apk add --no-cache python3 make g++ curl netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy prisma schema first for generation
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src/

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

CMD ["./entrypoint.sh"]
