# Multi-stage build for production
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/apps/frontend
COPY apps/frontend/package*.json ./
RUN npm ci --include=dev
COPY apps/frontend/ .
RUN npm run build

# Backend production image
FROM node:18-alpine AS production

# Create app user (non-root)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeapp -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/
WORKDIR /app/apps/backend
RUN npm ci --only=production && npm cache clean --force

# Copy backend source
COPY apps/backend/ .

# Copy frontend build to the correct location
COPY --from=frontend-build /app/apps/frontend/dist ./public

# Prisma requires datasource URLs at generation time even though no DB connection is made.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expensetracker"
ENV DIRECT_URL="postgresql://postgres:postgres@localhost:5432/expensetracker"

# Generate Prisma client
RUN npx prisma generate

# Change ownership
RUN chown -R nodeapp:nodejs /app
USER nodeapp

# Expose port
EXPOSE 5000

# Health check - enhanced to verify both API and frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');const req=http.request({hostname:'localhost',port:5000,path:'/api/health',timeout:5000},res=>{let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>{try{const json=JSON.parse(data);process.exit(json.status==='healthy'&&json.database==='connected'?0:1)}catch(e){process.exit(1)}})});req.on('error',()=>process.exit(1));req.end();"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
