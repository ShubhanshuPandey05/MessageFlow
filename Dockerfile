FROM ghcr.io/puppeteer/puppeteer:24.4.0

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]    