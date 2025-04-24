FROM ghcr.io/puppeteer/puppeteer:24.4.0

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Fix permissions
USER root
RUN chown -R pptruser:pptruser /app

# Switch back to pptruser
USER pptruser

# Install app dependencies
RUN npm install

# Copy app source
COPY --chown=pptruser:pptruser . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "index.js"]