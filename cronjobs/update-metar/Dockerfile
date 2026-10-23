# Cronjob Dockerfile for METAR updates
FROM node:24.22.1-alpine

# Set working directory
WORKDIR /app

# Copy package manifests
COPY cronjobs/update-metar/package.json cronjobs/update-metar/package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy cronjob files
COPY cronjobs/update-metar/ ./

# Run the cronjob
CMD ["npm", "start"]
