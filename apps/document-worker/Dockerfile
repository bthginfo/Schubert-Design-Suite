FROM python:3.13-slim-bookworm
ARG VERAPDF_VERSION=1.30.3
ARG VERAPDF_SHA256=b512bf24945503a33fc10738ecffc1f2dccaaf8593a448e94ee9ac86a9559a59
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080 USER=worker VERAPDF_BIN=/opt/verapdf/verapdf
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip default-jre-headless \
    fonts-dejavu-core fonts-liberation libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 \
    ffmpeg tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng clamav clamav-freshclam \
 && useradd --uid 10001 --create-home worker \
 && mkdir -p /opt/clamav-db && freshclam --datadir=/opt/clamav-db --user=root \
 && rm -rf /var/lib/apt/lists/*
COPY verapdf-install.xml /tmp/verapdf-install.xml
RUN curl --fail --location --output /tmp/verapdf.zip "https://software.verapdf.org/releases/1.30/verapdf-greenfield-${VERAPDF_VERSION}-installer.zip" \
 && echo "${VERAPDF_SHA256}  /tmp/verapdf.zip" | sha256sum --check - \
 && unzip /tmp/verapdf.zip -d /tmp/verapdf-install \
 && java -jar "/tmp/verapdf-install/verapdf-greenfield-${VERAPDF_VERSION}/verapdf-izpack-installer-${VERAPDF_VERSION}.jar" /tmp/verapdf-install.xml \
 && rm -rf /tmp/verapdf.zip /tmp/verapdf-install /tmp/verapdf-install.xml
RUN mkdir -p /opt/kosit/config \
 && curl --fail --location --output /tmp/xrechnung.zip "https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/download/v2026-08-31/xrechnung-3.0.2-validator-configuration-2026-08-31.zip" \
 && echo "2530cd107c414511c5d0462ec10f886910395abfca820db82e83d70bf01221a8  /tmp/xrechnung.zip" | sha256sum --check - \
 && unzip /tmp/xrechnung.zip -d /opt/kosit/config && rm /tmp/xrechnung.zip
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=worker:worker server.py invoices.py xrechnung.py /app/
USER worker
EXPOSE 8080
CMD ["python", "server.py"]
