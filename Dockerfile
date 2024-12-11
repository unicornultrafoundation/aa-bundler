FROM node:20.17-alpine3.20
WORKDIR /usr/src/app
COPY package*.json ./
RUN yarn 
COPY . .
ENTRYPOINT ["yarn", "bundler", "--unsafe", "--show-stack-traces", "--config"]
