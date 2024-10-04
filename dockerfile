FROM node:21

ENV NODE_ENV=prd

RUN mkdir /webservices

WORKDIR /webservices

COPY package.json .
COPY package-lock.json .

RUN npm i

COPY . .

#generate prisma client for debian
RUN npx prisma generate


EXPOSE 8122

RUN npm run build

CMD ["npm", "run", "start"]