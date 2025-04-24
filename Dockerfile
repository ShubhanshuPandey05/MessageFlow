FROM ghcr.io/puppeteer/puppeteer:24.4.0



ENV \
    # Configure default locale (important for chrome-headless-shell).
    LANG=en_US.UTF-8 \
    # UID of the non-root user 'pptruser'
    PPTRUSER_UID=10042


RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros \
    fonts-kacst fonts-freefont-ttf dbus dbus-x11

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


RUN PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer \
  npx puppeteer browsers install chrome --install-deps

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