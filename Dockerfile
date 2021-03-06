FROM node:5.7.1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install -q
COPY . /usr/src/app
RUN npm run build

CMD [ "node", "build/app.js" ]

EXPOSE 80