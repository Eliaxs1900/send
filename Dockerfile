##
# Send - self-hosted, encrypted file sharing
#
# License https://github.com/mozilla/send/blob/master/LICENSE
##


# Build the client bundle
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build


# Runtime image
FROM node:24-slim
RUN set -x \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --home-dir /app --create-home app

WORKDIR /app

COPY --chown=app:app package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --chown=app:app app app
COPY --chown=app:app common common
COPY --chown=app:app public/locales public/locales
COPY --chown=app:app server server
COPY --chown=app:app --from=builder /app/dist dist

RUN ln -s dist/version.json version.json \
    && mkdir -p /data/uploads \
    && chown -R app:app /data

USER app

ENV NODE_ENV=production
ENV PORT=1443
ENV FILE_DIR=/data/uploads

EXPOSE ${PORT}

CMD ["node", "server/bin/prod.js"]
