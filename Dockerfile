FROM node:20.17-alpine3.20
RUN npm install -g ts-node
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn
COPY . .
CMD ["yarn", "bundler", "--unsafe", "--show-stack-traces", "--config", "./config/bundler.config.json"]
