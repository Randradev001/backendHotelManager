FROM node:22-bookworm-slim
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node index.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node deploy/database-transfer.js ./deploy/database-transfer.js
USER node
EXPOSE 3000
CMD ["node", "index.js"]
