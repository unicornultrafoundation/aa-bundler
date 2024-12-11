FROM node:20.17-alpine3.20
WORKDIR /usr/src/app
COPY . .
#COPY yarn.lock ./
#RUN npm install -g ts-node
RUN apk update && apk add bash git perl
RUN yarn
RUN yarn preprocess
ENV CONFIG=testnet
ENTRYPOINT yarn bundler --unsafe --show-stack-traces --config "./${CONFIG}.config.json"
EXPOSE 3000/tcp
