FROM ghcr.io/puppeteer/puppeteer:24.4.0

RUN apt-get update && \
    apt-get install -y wget gnupg && \
    apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
        libgtk2.0-0 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 && \
    apt-get install -y chromium && \
    apt-get clean

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

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