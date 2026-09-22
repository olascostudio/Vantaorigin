# One image that runs anywhere: your laptop, managed hosting, or a VPS.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first, so code changes don't reinstall them.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Don't run as root.
USER node

EXPOSE 8080
CMD ["node", "src/server.js"]
