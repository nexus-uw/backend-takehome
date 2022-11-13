FROM node:18-alpine
RUN apk --no-cache add wget
WORKDIR /build
COPY package*.json /build/
RUN npm ci

COPY . /build
RUN npm run build

EXPOSE 8000
USER node
HEALTHCHECK --interval=30s --timeout=1s CMD wget localhost:8000/health/ping -q -O/dev/null || exit 1
ENV NODE_ENV production
ENV PG_HOST postgres
# todo use multi stage build to exclude devDependencies for a slimmer container

CMD ["node","api.js"]
