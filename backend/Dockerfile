# syntax=docker/dockerfile:1

# ---- Stage 1: build the Vue frontend ----
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: fetch the PocketBase binary ----
FROM alpine:3.20 AS pb-download
ARG PB_VERSION=0.39.9
ARG TARGETARCH
RUN apk add --no-cache curl unzip ca-certificates && \
    curl -Lo /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" && \
    unzip /tmp/pb.zip -d /pb && \
    rm /tmp/pb.zip

# ---- Stage 3: final runtime image ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=pb-download /pb/pocketbase /usr/local/bin/pocketbase
WORKDIR /pb
COPY --from=frontend-build /app/dist ./pb_public
EXPOSE 8090
ENTRYPOINT ["pocketbase", "serve", "--http=0.0.0.0:8090"]
