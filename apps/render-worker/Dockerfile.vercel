# Build context: apps/render-worker. This file is the same reproducible runtime as Dockerfile.
FROM python:3.13-slim-bookworm
ARG BLENDER_VERSION=4.5.14
ARG BLENDER_SHA256=9ba871ff2ecd36526b77432745980b7e6664ecd0c7ca11c48849073dcfe06da3
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libxkbcommon0 libsm6 libice6 libgomp1 libasound2 \
 && (curl --fail --location --retry 2 --output /tmp/blender.tar.xz "https://download.blender.org/release/Blender4.5/blender-${BLENDER_VERSION}-linux-x64.tar.xz" || curl --fail --location --retry 2 --output /tmp/blender.tar.xz "https://ftp.halifax.rwth-aachen.de/blender/release/Blender4.5/blender-${BLENDER_VERSION}-linux-x64.tar.xz") \
 && echo "${BLENDER_SHA256}  /tmp/blender.tar.xz" | sha256sum --check - \
 && mkdir /opt/blender && tar -xf /tmp/blender.tar.xz --strip-components=1 -C /opt/blender \
 && rm /tmp/blender.tar.xz && apt-get purge -y curl xz-utils && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home renderer
ENV BLENDER_BIN=/opt/blender/blender PORT=8080 RENDER_CONCURRENCY=1 RENDER_THREADS=4 RENDER_TIMEOUT_SECONDS=480 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN pip install --no-cache-dir Pillow==13.0.0
COPY --chown=renderer:renderer server.py render_scene.py /app/
USER renderer
EXPOSE 8080
CMD ["python","server.py"]
