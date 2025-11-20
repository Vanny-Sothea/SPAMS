# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.15.0

# Copy package files + tsconfig
COPY package*.json pnpm-lock.yaml tsconfig*.json ./

# Install all dependencies (including dev for TS compilation)
RUN pnpm install

#  Copy source code
COPY . ./

# Compile TypeScript
RUN pnpm exec tsc


# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@10.15.0

# Copy node_modules from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules

# Copy compiled JS
COPY --from=build /usr/src/app/dist ./dist

# Copy any other necessary files (config, .env example, etc.)
COPY package*.json ./

EXPOSE 3002
CMD ["node", "dist/server.js"]
