FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

RUN npm run build

COPY . .

EXPOSE 8080
CMD [ "npm", "start" ]