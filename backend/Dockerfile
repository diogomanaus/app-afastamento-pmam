FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY src ./src
COPY init.sql ./init.sql
COPY brasao.jpeg ./brasao.jpeg
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "src/index.js"]
