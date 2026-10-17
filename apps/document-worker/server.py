import base64
import csv
import datetime as dt
import hashlib
import hmac
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw, ImageFont
from pypdf import PdfReader
from invoices import generate, inspect_invoice_pdf, VERSION

LIMIT = 40 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 50_000_000
CAPACITY = threading.BoundedSemaphore(int(os.environ.get("DOCUMENT_CONCURRENCY", "2")))
SCANNER_LOCK = threading.Lock()


class WorkerError(Exception):
    def __init__(self, code, status=422):
        self.code, self.status = code, status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise WorkerError("SOURCE_REDIRECT_BLOCKED")


def source_bytes(data):
    source = data.get("source")
    if not source:
        value = base64.b64decode(data.get("bytes", ""), validate=True)
        if not 0 < len(value) <= 2_800_000:
            raise WorkerError("SOURCE_LIMIT")
        return value
    size, expected, token = int(source["byteLength"]), source["contentHash"], source["token"]
    if not 0 < size <= LIMIT or not re.fullmatch(r"[a-f0-9]{64}", expected) or len(token) > 4000:
        raise WorkerError("SOURCE_CONTRACT")
    gateway = os.environ.get("ASSET_GATEWAY_URL", "")
    if not gateway.startswith("https://") and not (os.environ.get("ALLOW_LOCAL_GATEWAY") == "true" and gateway.startswith("http://127.0.0.1:")):
        raise WorkerError("SOURCE_GATEWAY_UNAVAILABLE", 503)
    opener, chunks = urllib.request.build_opener(NoRedirect), []
    for offset in range(0, size, 1024 * 1024):
        length = min(1024 * 1024, size - offset)
        body = json.dumps({"token": token, "offset": offset, "length": length}).encode()
        request = urllib.request.Request(gateway, data=body, method="POST", headers={"Content-Type": "application/json"})
        with opener.open(request, timeout=30) as response:
            part = response.read(length + 1)
            if len(part) != length or response.headers.get("X-Content-Hash") != expected or response.headers.get("X-Content-Offset") != str(offset):
                raise WorkerError("SOURCE_CHUNK_HASH")
            chunks.append(part)
    result = b"".join(chunks)
    if hashlib.sha256(result).hexdigest() != expected:
        raise WorkerError("SOURCE_HASH")
    return result


def scan(value):
    with SCANNER_LOCK:
        database = Path(os.environ.get("CLAMAV_DATABASE", "/tmp/schubert-clamav"))
        if not database.exists():
            database.mkdir(parents=True)
            packaged = Path("/opt/clamav-db")
            if packaged.exists():
                for path in packaged.glob("*"):
                    if path.is_file():
                        shutil.copyfile(path, database / path.name)
        definitions = list(database.glob("*.c[vl]d"))
        if not definitions or time.time() - max(path.stat().st_mtime for path in definitions) > 86400:
            update = subprocess.run(["freshclam", "--stdout", "--datadir=" + str(database), "--user=" + os.environ.get("USER", "worker")], capture_output=True, timeout=120)
            if update.returncode != 0:
                raise WorkerError("SCANNER_DEFINITIONS_UNAVAILABLE", 503)
        with tempfile.TemporaryDirectory(prefix="scan-") as directory:
            path = Path(directory) / "original.bin"
            path.write_bytes(value)
            result = subprocess.run(["clamscan", "--database=" + str(database), "--no-summary", "--max-filesize=40M", "--max-scansize=100M", "--max-files=2000", "--max-recursion=12", "--alert-exceeds-max=yes", str(path)], capture_output=True, timeout=90)
            if result.returncode not in (0, 1):
                raise WorkerError("SCANNER_UNAVAILABLE", 503)
        return {"clean": result.returncode == 0, "report": "ClamAV: OK" if result.returncode == 0 else "ClamAV: blockiert", "engine": subprocess.run(["clamscan", "--version"], capture_output=True, timeout=10).stdout.decode().strip(), "definitionsCheckedAt": dt.datetime.now(dt.timezone.utc).isoformat()}


def extract_document(value, mime, page_start=0, page_limit=50):
    fields, text, page_count = [], [], 1
    if mime == "application/pdf":
        reader = PdfReader(io.BytesIO(value), strict=True)
        if reader.is_encrypted:
            raise WorkerError("PDF_ENCRYPTED")
        page_count = len(reader.pages)
        if not 0 <= page_start < page_count <= 1000:
            raise WorkerError("PDF_PAGE_LIMIT")
        if page_start == 0:
            from facturx import parse_ubl_cii_xml, data_dict_to_json
            for filename, entries in list(reader.attachments.items())[:20]:
                if not filename.lower().endswith('.xml'):
                    continue
                for embedded in entries[:1]:
                    if len(embedded) > 5 * 1024 * 1024 or re.search(br'<!DOCTYPE|<!ENTITY', embedded, re.I):
                        raise WorkerError('XML_ACTIVE_CONTENT')
                    if b'CrossIndustryInvoice' not in embedded[:3000] and b'urn:oasis:names:specification:ubl' not in embedded[:3000]:
                        continue
                    parsed = parse_ubl_cii_xml(embedded, check_xsd=True, check_schematron='base')
                    structured = str(data_dict_to_json(parsed))
                    text.append(structured)
                    fields.append({'name': 'embedded_einvoice', 'value': structured[:100000], 'source': 'attachment=' + filename})
        processed_end = page_start
        ocr_count = 0
        for index in range(page_start, min(page_count, page_start + page_limit)):
            current = reader.pages[index].extract_text() or ""
            if len(current.strip()) < 10:
                if ocr_count >= 5:
                    break
                with pdfium.PdfDocument(value) as raster_pdf:
                    image = raster_pdf[index].render(scale=1.8).to_pil()
                    with tempfile.TemporaryDirectory(prefix='ocr-') as directory:
                        image_path = Path(directory) / 'page.png'
                        image.save(image_path)
                        run = subprocess.run(['tesseract', str(image_path), 'stdout', '-l', 'deu+eng'], capture_output=True, timeout=45)
                        if run.returncode != 0:
                            raise WorkerError('OCR_UNAVAILABLE')
                        current = run.stdout.decode('utf-8')
                ocr_count += 1
            text.append(current)
            processed_end = index + 1
            for match in re.finditer(r"\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m²|m2|m)\b", current):
                fields.append({"name": "measure_candidate", "value": match.group(0), "source": f"page={index + 1};characters={match.start()}:{match.end()}"})
    elif mime in {"application/xml", "text/xml"}:
        if re.search(br"<!DOCTYPE|<!ENTITY", value, re.I):
            raise WorkerError("XML_ACTIVE_CONTENT")
        from facturx import parse_ubl_cii_xml, data_dict_to_json
        if b'urn:xeinkauf.de:kosit:xrechnung_3.0' in value:
            from xrechnung import validate
            validation = validate(value)
            fields.append({'name':'xrechnung_validation','value':json.dumps(validation),'source':'exact_original_xml'})
        parsed = parse_ubl_cii_xml(value)
        text.append(str(data_dict_to_json(parsed)))
    else:
        text.append(value.decode("utf-8", errors="replace"))
    next_page = processed_end if mime == 'application/pdf' and processed_end < page_count else None
    return {"text": "\n".join(text)[:500000], "fields": fields[:2000], "parserVersion": VERSION, "kind": "pdf_text" if mime == "application/pdf" else "structured", "pageStart": page_start, "pageCount": page_count, "nextPageStart": next_page}


def preview(value, mime, page_index, max_dimension=1440):
    if max_dimension not in {512, 1440}:
        raise WorkerError("PREVIEW_DIMENSION")
    positions = []
    if mime == "application/pdf":
        document = pdfium.PdfDocument(value)
        if not 0 <= page_index < len(document) <= 1000:
            raise WorkerError("PDF_PAGE_INDEX")
        page = document[page_index]
        width_pt, height_pt = page.get_size()
        scale = min(2, max_dimension / max(width_pt, height_pt))
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil().copy().convert("RGB")
        with pdfplumber.open(io.BytesIO(value)) as pdf:
            for word in pdf.pages[page_index].extract_words()[:2000]:
                positions.append({"text": word["text"], "x": word["x0"] * scale, "y": word["top"] * scale, "width": (word["x1"] - word["x0"]) * scale, "height": (word["bottom"] - word["top"]) * scale, "confidence": None, "sourceKind": "pdf_text"})
        page.close()
        bitmap.close()
        document.close()
    else:
        with Image.open(io.BytesIO(value)) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    if not positions:
        with tempfile.TemporaryDirectory(prefix="ocr-") as directory:
            path = Path(directory) / "page.png"
            image.save(path)
            ocr = subprocess.run(["tesseract", str(path), "stdout", "-l", "deu+eng", "tsv"], capture_output=True, timeout=90)
            if ocr.returncode == 0:
                for word in csv.DictReader(io.StringIO(ocr.stdout.decode("utf-8")), delimiter="\t"):
                    if word.get("text", "").strip() and float(word.get("conf", -1)) >= 0:
                        positions.append({"text": word["text"], "x": int(word["left"]), "y": int(word["top"]), "width": int(word["width"]), "height": int(word["height"]), "confidence": float(word["conf"]) / 100, "sourceKind": "ocr_candidate"})
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    while output.tell()>2_500_000 and max(image.size)>512:
        old_width=image.width
        image.thumbnail((int(image.width*.8),int(image.height*.8)),Image.Resampling.LANCZOS)
        factor=image.width/old_width
        for position in positions:
            for key in ["x","y","width","height"]:position[key]*=factor
        output=io.BytesIO();image.save(output,format="PNG",optimize=True)
    return {"pngBase64": base64.b64encode(output.getvalue()).decode("ascii"), "width": image.width, "height": image.height, "textPositions": positions[:2000], "previewHash": hashlib.sha256(output.getvalue()).hexdigest(), "sourceHash": hashlib.sha256(value).hexdigest(), "pageIndex": page_index, "generatorVersion": VERSION, "requiresReview": True}


def dispatch(path, data):
    if path in {"/invoice/prevalidate", "/invoice/generate"}:
        if path.endswith("prevalidate"):
            invoice = {**data["invoice"], "number": data.get("number", "TEST-NOT-ISSUED"), "issued_at": dt.datetime.now(dt.timezone.utc).isoformat()}
            snapshot = {**data, **{key: invoice.get(key, "0") for key in ["net_total", "tax_total", "gross_total", "prepaid_total", "payable_total"]}, "invoice": invoice}
            if snapshot.get("payable_total") is None:
                snapshot["payable_total"] = snapshot["gross_total"]
        else:
            snapshot = data["snapshot"]
        return generate(snapshot, include_pdf=True)
    value = source_bytes(data)
    if path == '/invoice/inspect':
        return inspect_invoice_pdf(value)
    if path == "/invoice/xrechnung":
        from xrechnung import from_facturx
        xml, report = from_facturx(value, data["profile"])
        return {"xmlBase64":base64.b64encode(xml).decode("ascii"),"report":report,"valid":True}
    if path == "/invoice/validate-xml":
        from xrechnung import validate
        return validate(value)
    if path == "/image/label":
        with Image.open(io.BytesIO(value)) as original:
            if original.width * original.height > 4_000_000:
                raise WorkerError("IMAGE_DIMENSIONS")
            image = original.convert("RGB")
            label = str(data.get("label", "KI-Visualisierung · Konzept"))[:150]
            revision = str(data.get("revision", ""))[:36]
            draw = ImageDraw.Draw(image)
            draw.rectangle((0, image.height-55, image.width, image.height), fill=(246,245,242))
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
            draw.text((16,image.height-44),label,fill=(32,37,34),font=font)
            draw.text((16,image.height-24),"Planrevision "+revision,fill=(55,65,60),font=font)
            output = io.BytesIO();image.save(output,format="PNG",optimize=True)
            return {"pngBase64":base64.b64encode(output.getvalue()).decode("ascii"),"contentHash":hashlib.sha256(output.getvalue()).hexdigest(),"generatorVersion":VERSION,"accuracy":"generative_visualization"}
    if path == "/audio/inspect":
        if len(value) > 2_800_000:
            raise WorkerError("AUDIO_SIZE")
        with tempfile.TemporaryDirectory(prefix="audio-") as directory:
            original = Path(directory) / "input.audio"
            original.write_bytes(value)
            result = subprocess.run(["ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe", "-select_streams", "a:0", "-show_packets", "-show_entries", "format=format_name,duration:packet=pts_time,duration_time", "-of", "json", str(original)], capture_output=True, timeout=25)
            if result.returncode != 0 or len(result.stdout) > 2_000_000:
                raise WorkerError("AUDIO_INSPECTION")
            metadata = json.loads(result.stdout)
            container = metadata.get("format", {}).get("format_name", "")
            if not any(name in container.split(",") for name in ["matroska", "webm", "mov", "mp4", "m4a", "mp3", "wav", "ogg"]):
                raise WorkerError("AUDIO_FORMAT")
            packets = metadata.get("packets", [])
            ends = [float(packet.get("pts_time", 0)) + float(packet.get("duration_time", 0)) for packet in packets]
            duration = max([float(metadata.get("format", {}).get("duration", 0))] + ends)
            if not 0 < duration <= 125:
                raise WorkerError("AUDIO_DURATION")
            return {"durationSeconds": duration, "container": container, "contentHash": hashlib.sha256(value).hexdigest(), "inspectorVersion": VERSION}
    if path == "/scan":
        return scan(value)
    if path == "/planning/source-preview":
        return preview(value, data["mime"], int(data.get("pageIndex", 0)), int(data.get("maxDimension", 1440)))
    if path == "/extract/document":
        return extract_document(value, data["mime"], int(data.get("pageStart", 0)))
    if path == "/extract/table":
        if data["mime"] != "application/pdf":
            raise WorkerError("TABLE_FORMAT")
        rows, headers = [], None
        with pdfplumber.open(io.BytesIO(value)) as pdf:
            if len(pdf.pages) > 100:
                raise WorkerError("PDF_TABLE_PAGE_LIMIT")
            for page in pdf.pages:
                for table in page.extract_tables():
                    if not table:
                        continue
                    if headers is None:
                        headers = [str(cell or "").strip() for cell in table[0]]
                    for cells in table[1:]:
                        rows.append(dict(zip(headers, cells)))
                        if len(rows) > 5000:
                            raise WorkerError("TABLE_ROW_LIMIT")
        return {"rows": rows, "requiresReview": True, "parserVersion": VERSION}
    raise WorkerError("WORKER_ROUTE", 404)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, status, value):
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        self.respond(200 if self.path == "/health" else 404, {"available": self.path == "/health", "generatorVersion": VERSION})

    def do_POST(self):
        secret = os.environ.get("DOCUMENT_WORKER_SECRET", "")
        if len(secret) < 32 or not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + secret):
            return self.respond(401, {"error": "WORKER_AUTH"})
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 < length <= 4_000_000:
            return self.respond(413, {"error": "WORKER_BODY_LIMIT"})
        if not CAPACITY.acquire(blocking=False):
            return self.respond(429, {"error": "WORKER_BUSY"})
        try:
            data = json.loads(self.rfile.read(length))
            self.respond(200, dispatch(self.path, data))
        except WorkerError as error:
            self.respond(error.status, {"error": error.code})
        except ValueError as error:
            code = str(error) if re.fullmatch(r"[A-Z_]{3,80}", str(error)) else "DOCUMENT_VALIDATION_FAILED"
            print(json.dumps({"code": code, "errorType": type(error).__name__, "frames": [{"file": Path(frame.filename).name, "line": frame.lineno, "function": frame.name} for frame in traceback.extract_tb(error.__traceback__)[-5:]]}), flush=True)
            self.respond(422, {"error": code})
        except Exception:
            self.respond(503, {"error": "DOCUMENT_PROCESSING_UNAVAILABLE"})
        finally:
            CAPACITY.release()


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler).serve_forever()
