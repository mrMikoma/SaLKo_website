# Cronjob Dockerfile for METAR updates
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy cronjob files
COPY cronjobs/updateMetar/ ./

# Install dependencies
RUN npm install --production

# Run the cronjob
CMD ["npm", "start"]
