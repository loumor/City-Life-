FROM node:latest 

RUN npm install nodemon -g

WORKDIR /src 
ADD package.json package.json
RUN npm install

COPY . /src

WORKDIR /src

RUN npm install 

EXPOSE 3000

CMD ["npm", "start"]

