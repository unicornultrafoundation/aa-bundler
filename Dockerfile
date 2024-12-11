FROM node:20.17-alpine3.20
WORKDIR /usr/src/app
#COPY yarn.lock ./
#RUN npm install -g ts-node
RUN apk update && apk add git
COPY . .
RUN yarn
RUN yarn preprocess
ENV CONFIG=testnet
ENTRYPOINT yarn bundler --unsafe --show-stack-traces --config "./packages/bundler/$CONFIG.config.json"
