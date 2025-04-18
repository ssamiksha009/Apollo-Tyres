FROM node:23-alpine


WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
