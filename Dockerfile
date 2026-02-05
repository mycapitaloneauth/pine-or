FROM node:18-slim
WORKDIR /app

# Install deps
COPY package.json ./
RUN npm install --production

# Copy source
COPY . ./

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
