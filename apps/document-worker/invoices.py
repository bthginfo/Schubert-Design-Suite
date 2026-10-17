"""Deterministic invoice generation. No customer content is executed or sent to an LLM."""
import base64
import csv
import io
import datetime as dt
import hashlib
import html
import importlib.metadata
import json
import os
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from facturx import generate_xml, generate_from_binary, xml_check_xsd, xml_check_schematron

VERSION = "schubert-documents/1.1.0"
PROFILE = "Factur-X EN16931"
UNITS = {"piece": "C62", "mm": "MMT", "m": "MTR", "m2": "MTK", "m3": "MTQ", "kg": "KGM", "h": "HUR", "day": "DAY", "package": "XPK"}
D = lambda value: Decimal(str(value).replace(",", "."))
M = lambda value: D(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def iso_date(value):
    return dt.date.fromisoformat(str(value)[:10])


def party(value):
    result = {"name": value.get("company_name") or value.get("name"), "addr_l1": value.get("street"), "postcode": value.get("postal_code"), "city": value.get("city"), "country_code": value.get("country")}
    if not all(result.values()):
        raise ValueError("INVOICE_PARTY_REQUIRED")
    if value.get("vat_id"):
        result["vat_identifier"] = value["vat_id"]
    if value.get("tax_number"):
        result["tax_identifier"] = value["tax_number"]
    return result


def invoice_data(snapshot):
    inv = snapshot["invoice"]
    credit = D(snapshot["gross_total"]) < 0
    factor = Decimal(-1 if credit else 1)
    groups, lines = {}, []
    net = Decimal(0)
    for index, line in enumerate(snapshot["lines"]):
        if line.get("line_type", "item") != "item" or line.get("optional") and not line.get("selected"):
            continue
        quantity, rate = D(line["quantity"]), D(line["tax_rate"])
        price = D(line["unit_price"]) * (1 - D(line.get("discount_percent", 0)) / 100) * factor
        amount = M(quantity * price)
        # EN16931 forbids a negative item price; a negative adjustment uses a signed quantity.
        if price < 0:
            quantity, price = -quantity, -price
        if price < 0 or amount != M(D(line["net_amount"]) * factor):
            raise ValueError("INVOICE_LINE_ARITHMETIC")
        category = line.get("tax_category") or inv.get("tax_category") or ("S" if rate > 0 else None)
        reason = line.get("tax_exemption_reason") or inv.get("tax_exemption_reason")
        if category not in {"S", "Z", "E", "AE", "K", "G", "O"} or category == "S" and rate <= 0 or category != "S" and rate != 0:
            raise ValueError("INVOICE_TAX_CATEGORY_REQUIRED")
        if category in {"E", "AE", "K", "G", "O"} and not reason:
            raise ValueError("INVOICE_EXEMPTION_REASON_REQUIRED")
        key = (category, str(rate), reason)
        groups[key] = groups.get(key, Decimal(0)) + amount
        net += amount
        lines.append({"BT-126": str(line.get("position", index + 1)), "BT-153": line["description"], "BT-129": str(quantity), "BT-130": UNITS[line["unit"]], "BT-146": str(price), "BT-149": "1", "BT-131": str(amount), "BT-151": category, "BT-152": str(rate)})
    if not lines or M(net) != M(D(snapshot["net_total"]) * factor):
        raise ValueError("INVOICE_NET_ARITHMETIC")
    taxes = []
    for (category, rate, reason), base in sorted(groups.items(), key=lambda entry: str(entry[0])):
        row = {"BT-116": str(M(base)), "BT-117": str(M(base * D(rate) / 100)), "BT-118": category, "BT-119": rate}
        if reason:
            row["BT-120"] = reason
        taxes.append(row)
    tax = sum(D(t["BT-117"]) for t in taxes)
    if M(tax) != M(D(snapshot["tax_total"]) * factor) or M(net + tax) != M(D(snapshot["gross_total"]) * factor):
        raise ValueError("INVOICE_TAX_ARITHMETIC")
    prepaid = D(snapshot.get("prepaid_total", 0)) * factor
    payable = D(snapshot.get("payable_total", snapshot["gross_total"])) * factor
    if M(net + tax - prepaid) != M(payable):
        raise ValueError("INVOICE_PAYABLE_ARITHMETIC")
    issued = iso_date(inv.get("issued_at") or dt.datetime.now(dt.timezone.utc).isoformat())
    result = {"BT-1": inv["number"], "BT-2": issued, "BT-3": "381" if credit else "386" if inv.get("kind") in {"advance", "progress"} else "380", "BT-5": inv.get("currency", "EUR"), "BT-9": iso_date(inv["due_date"]), "BT-72": iso_date(inv["service_date"]), "BT-20": inv.get("terms") or "Zahlbar bis " + str(inv["due_date"])[:10], "BG-4": party(snapshot["issuer"]), "BG-7": party(snapshot["customer"]), "BG-25": lines, "BG-23": taxes, "BT-106": str(M(net)), "BT-109": str(M(net)), "BT-110": str(M(tax)), "BT-112": str(M(net + tax)), "BT-113": str(M(prepaid)), "BT-115": str(M(payable)), "BT-81": "30", "BT-84": str(snapshot["issuer"]["iban"]).replace(" ", ""), "BT-85": snapshot["issuer"].get("bank_holder") or snapshot["issuer"].get("name") or snapshot["issuer"].get("company_name")}
    if snapshot["issuer"].get("bic"):
        result["BT-86"] = snapshot["issuer"]["bic"]
    refs = snapshot.get("references") or []
    if refs:
        result["BG-3"] = [{"BT-25": ref["number"]} for ref in refs if ref.get("number")]
    if snapshot.get("prepaid_tax_summaries"):
        notes = ["Anrechnung tatsächlich vereinnahmter Teilentgelte nach Rückzahlungen:"]
        for ref in refs:
            notes.append(f"{ref.get('number')}: angefordert/brutto {ref.get('invoiced_gross','0')}; erhalten {ref.get('received_amount','0')}; zurückgezahlt {ref.get('refunded_amount','0')}; angerechnet {ref.get('applied_amount','0')}")
        for row in snapshot["prepaid_tax_summaries"]:
            notes.append(f"Steuerfall {row['tax_category']}, {row['tax_rate']} %: Netto {row['net_amount']}; Steuer {row['tax_amount']}; Brutto {row['gross_amount']}")
        result["BG-1"] = [{"BT-22": "\n".join(notes)}]
        out = io.StringIO(newline="")
        writer = csv.writer(out, delimiter=";", lineterminator="\r\n")
        writer.writerow(["Vorbeleg", "Art", "Fakturiert brutto", "Erhalten", "Zurueckgezahlt", "Angerechnet", "Steuerfall", "Steuersatz", "Nettoanteil", "Steueranteil", "Bruttoanteil", "Zahlungsnachweise"])
        safe = lambda v: ("'" + str(v)) if str(v).lstrip().startswith(("=", "+", "@")) else str(v)
        for ref in refs:
            splits = ref.get("tax_splits") or [{}]
            for row in splits:
                writer.writerow([safe(ref.get("number", "")), ref.get("kind", ""), ref.get("invoiced_gross", ""), ref.get("received_amount", ""), ref.get("refunded_amount", ""), ref.get("applied_amount", ""), row.get("tax_category", ""), row.get("tax_rate", ""), row.get("net_amount", ""), row.get("tax_amount", ""), row.get("gross_amount", ""), " ".join(a["id"] for a in ref.get("allocations", []))])
        result["BG-24"] = [{"BT-122": "SETTLEMENT-" + inv["number"], "BT-123": "Anrechnung vereinnahmter Teilentgelte mit Steuer- und Zahlungsnachweisen", "BT-125": out.getvalue().encode("utf-8"), "BT-125-1": "text/csv", "BT-125-2": "Anrechnungsaufstellung.csv"}]
    return result


def invoice_html(snapshot):
    inv, issuer, customer = snapshot["invoice"], snapshot["issuer"], snapshot["customer"]
    credit = D(snapshot["gross_total"]) < 0
    title = "Rechnungskorrektur / Gutschrift" if credit else {"advance": "Anzahlungsrechnung", "progress": "Abschlagsrechnung", "final": "Schlussrechnung", "partial": "Teilrechnung"}.get(inv.get("kind"), "Rechnung")
    esc = lambda value: html.escape(str(value or ""), quote=True)
    money = lambda value: f"{M(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + (" €" if inv.get("currency", "EUR") == "EUR" else " " + inv["currency"])
    number = lambda value: format(D(value), "f").rstrip("0").rstrip(".").replace(".", ",") if "." in format(D(value), "f") else format(D(value), "f")
    address = lambda p: "<br>".join(esc(p.get(k)) for k in ["name", "street"]) + "<br>" + esc(p.get("postal_code")) + " " + esc(p.get("city"))
    date = lambda value: iso_date(value).strftime("%d.%m.%Y")
    unit_names = {"piece":"Stück","m2":"m²","m3":"m³","h":"Std.","package":"Pauschale","day":"Tag"}
    rows = []
    for line in snapshot["lines"]:
        if line.get("optional") and not line.get("selected"):
            continue
        if line.get("line_type", "item") != "item":
            rows.append('<tr><td colspan="4">' + esc(line["description"]) + '</td><td class=num>' + (money(line['net_amount']) if line.get('line_type') == 'subtotal' else '') + '</td></tr>')
            continue
        rows.append("<tr><td>" + esc(line.get("position")) + "</td><td>" + esc(line["description"]) + "</td><td class=num>" + esc(number(line["quantity"])) + " " + esc(unit_names.get(line["unit"],line["unit"])) + "</td><td class=num>" + money(line["unit_price"]) + "</td><td class=num>" + money(line["net_amount"]) + "</td></tr>")
    groups = "".join("<p>USt. " + esc(number(row["tax_rate"])) + " % <b>" + money(row["tax_amount"]) + "</b></p>" for row in snapshot.get("tax_summaries", []))
    prepaids = "<p>Vereinnahmte Anzahlungen <b>" + money(snapshot["prepaid_total"]) + "</b></p>" if D(snapshot.get("prepaid_total", 0)) else ""
    annex = ""
    if inv.get("kind") == "final":
        annex = '<h2>Abrechnung und Anrechnung</h2><p>Die Teilleistungsrechnungen sind bereits in den negativen Abgrenzungspositionen berücksichtigt. Zahlungen auf Anzahlungen/Abschläge werden gesondert angerechnet. Offene Abschlagsforderungen werden in die Schlussforderung übergeleitet.</p><table><thead><tr><th>Vorbeleg</th><th>Fakturiert brutto</th><th>Erhalten</th><th>Zurückgezahlt</th><th>Angerechnet</th></tr></thead><tbody>'
        for ref in snapshot.get("references", []):
            annex += '<tr>' + ''.join('<td>' + esc(ref.get(k, '')) + '</td>' for k in ['number','invoiced_gross','received_amount','refunded_amount','applied_amount']) + '</tr>'
        annex += '</tbody></table><h3>Vereinnahmte Anrechnung nach Steuerfällen</h3><table><thead><tr><th>Steuerfall</th><th>Netto</th><th>Steuer</th><th>Brutto</th></tr></thead><tbody>'
        for row in snapshot.get("prepaid_tax_summaries", []):
            annex += '<tr><td>' + esc(row['tax_category']) + ' · ' + esc(row['tax_rate']) + ' %</td><td>' + money(row['net_amount']) + '</td><td>' + money(row['tax_amount']) + '</td><td>' + money(row['gross_amount']) + '</td></tr>'
        annex += '</tbody></table>'
    return f'''<!doctype html><html lang="de"><meta charset="utf-8"><title>{esc(title)} {esc(inv['number'])}</title><style>
    @page{{size:A4;margin:22mm 17mm 25mm;@bottom-left{{content:"SCHUBERT · {esc(inv['number'])}";font-size:8pt;color:#67716b}}@bottom-right{{content:"Seite " counter(page) " / " counter(pages);font-size:8pt;color:#67716b}}}}
    body{{font:10pt "DejaVu Sans",sans-serif;color:#202b24;line-height:1.45}}header{{border-bottom:1pt solid #365c4c;padding-bottom:5mm}}h1{{font-size:25pt;font-weight:400;margin:9mm 0 2mm}}.brand{{font-size:19pt;letter-spacing:3pt}}.issuer{{font-size:8pt;color:#5c665f}}.recipient{{margin:10mm 0}}table{{width:100%;border-collapse:collapse;table-layout:fixed;margin:8mm 0}}thead{{display:table-header-group}}th{{font-size:8pt;text-align:left;background:#f1f4f1}}td,th{{padding:3mm 1.5mm;border-bottom:.4pt solid #d9dfda;vertical-align:top;overflow-wrap:anywhere}}tr{{break-inside:avoid}}.num{{text-align:right}}.totals{{width:60%;margin-left:auto;break-inside:avoid}}.totals p{{display:flex;justify-content:space-between;white-space:nowrap}}.total{{font-size:14pt}}.terms{{white-space:pre-wrap;margin-top:8mm}}.footer{{margin-top:10mm;border-top:.4pt solid #d9dfda;font-size:8pt;white-space:pre-wrap}}
    </style><header><div class=brand>SCHUBERT</div><div class=issuer>{esc(issuer.get('name') or issuer.get('company_name'))} · {esc(issuer.get('street'))} · {esc(issuer.get('postal_code'))} {esc(issuer.get('city'))}</div></header><div class=recipient>{address(customer)}</div><h1>{esc(title)}</h1><p>{esc(inv['number'])} · {esc(inv.get('title'))}<br>Ausgestellt: {date(inv['issued_at'])} · Leistungsdatum: {date(inv['service_date'])}<br>Zahlungsziel: {date(inv['due_date'])}</p><table><colgroup><col style="width:7%"><col style="width:43%"><col style="width:16%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr><th>Pos.</th><th>Leistung</th><th class=num>Menge</th><th class=num>Einzel netto</th><th class=num>Betrag netto</th></tr></thead><tbody>{''.join(rows)}</tbody></table><div class=totals><p>Netto <b>{money(snapshot['net_total'])}</b></p>{groups}<p>Brutto <b>{money(snapshot['gross_total'])}</b></p>{prepaids}<p class=total>{'Guthaben zu Ihren Gunsten' if credit else 'Zahlbetrag'} <b>{money(snapshot.get('payable_total',snapshot['gross_total']))}</b></p></div>{annex}<div class=terms>{esc(inv.get('terms'))}</div><div class=footer>{esc(issuer.get('name') or issuer.get('company_name'))}
    {esc(issuer.get('street'))} · {esc(issuer.get('postal_code'))} {esc(issuer.get('city'))}
    IBAN {esc(issuer.get('iban'))} · BIC {esc(issuer.get('bic'))}
    USt-ID {esc(issuer.get('vat_id'))} · Steuernummer {esc(issuer.get('tax_number'))}</div></html>'''


def pdfa_check(pdf_bytes):
    executable = os.environ.get("VERAPDF_BIN", "/opt/verapdf/verapdf")
    if not Path(executable).exists():
        raise RuntimeError("PDFA_VALIDATOR_UNAVAILABLE")
    with tempfile.TemporaryDirectory(prefix="verify-") as directory:
        path = Path(directory) / "document.pdf"
        path.write_bytes(pdf_bytes)
        run = subprocess.run([executable, "--format", "xml", "--flavour", "3b", str(path)], capture_output=True, timeout=90)
        output = ET.fromstring(run.stdout)
    compliant = []
    def collect(value):
        if isinstance(value, dict):
            if "isCompliant" in value:
                compliant.append(value["isCompliant"] is True)
            for entry in value.values():
                collect(entry)
        elif isinstance(value, list):
            for entry in value:
                collect(entry)
    compliant = [element.attrib['isCompliant'] == 'true' for element in output.iter() if 'isCompliant' in element.attrib]
    if not compliant or not all(compliant):
        rules = []
        def failed_rules(value):
            if isinstance(value, dict):
                if value.get('status') in ['failed', 'FAILED']:
                    rules.append({key: value[key] for key in ['ruleId', 'specification', 'clause', 'testNumber', 'status'] if key in value})
                for child in value.values(): failed_rules(child)
            elif isinstance(value, list):
                for child in value: failed_rules(child)
        rules = [element.attrib for element in output.iter() if element.tag.rsplit('}',1)[-1] == 'rule' and element.attrib.get('status') == 'failed']
        print(json.dumps({'code': 'PDFA_REPORT', 'compliance': compliant, 'failedRules': rules, 'exitCode': run.returncode}), flush=True)
        raise ValueError("PDFA_VALIDATION_FAILED")
    return {"valid": True, "validator": "veraPDF", "reportHash": digest(run.stdout)}


def generate(snapshot, include_pdf=True):
    data = invoice_data(snapshot)
    xml = generate_xml(data, flavor="factur-x", level="en16931", check_xsd=True, check_schematron="base")
    xml_check_xsd(xml, flavor="factur-x", level="en16931")
    xml_check_schematron(xml, flavor="factur-x", level="en16931", check_option="base")
    result = {"valid": True, "profile": PROFILE, "validator": "factur-x/" + importlib.metadata.version("factur-x") + " XSD + EN16931 Schematron", "generatorVersion": VERSION, "report": {"xmlValid": True, "xmlHash": digest(xml), "profile": PROFILE}, "xmlBase64": base64.b64encode(xml).decode("ascii")}
    if snapshot.get("recipient_profile"):
        from xrechnung import from_facturx
        xxml, xproof = from_facturx(xml, snapshot["recipient_profile"])
        result.update({"xrechnungXmlBase64": base64.b64encode(xxml).decode("ascii"), "xrechnungHash": digest(xxml), "xrechnungReport": xproof})
        result["report"]["xrechnung"] = xproof
    if include_pdf:
        from weasyprint import HTML
        def no_network(url, *args, **kwargs):
            raise ValueError("EXTERNAL_ASSET_BLOCKED")
        base = HTML(string=invoice_html(snapshot), url_fetcher=no_network).write_pdf(pdf_variant="pdf/a-3b", srgb=True)
        pdf = generate_from_binary(base, xml, flavor="factur-x", level="en16931", check_xsd=True, check_schematron=False, lang="de-DE")
        result["report"]["pdfa"] = pdfa_check(pdf)
        result.update({"pdfaValid": True, "pdfBase64": base64.b64encode(pdf).decode("ascii"), "pdfHash": digest(pdf)})
    return result


def inspect_invoice_pdf(value):
    """Validate the exact persisted PDF and return its embedded original XML on retries."""
    import io
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(value), strict=True)
    embedded = [data for name, entries in reader.attachments.items() if name.lower() in {"factur-x.xml", "zugferd-invoice.xml"} for data in entries]
    if len(embedded) != 1 or len(embedded[0]) > 5 * 1024 * 1024:
        raise ValueError("INVOICE_EMBEDDED_XML")
    xml = embedded[0]
    if b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
        raise ValueError("XML_ACTIVE_CONTENT")
    xml_check_xsd(xml, flavor="factur-x", level="en16931")
    xml_check_schematron(xml, flavor="factur-x", level="en16931", check_option="base")
    pdfa = pdfa_check(value)
    return {"valid": True, "pdfaValid": True, "pdfHash": digest(value), "xmlHash": digest(xml), "xmlBase64": base64.b64encode(xml).decode("ascii"), "profile": PROFILE, "validator": "veraPDF + factur-x XSD + EN16931 Schematron", "report": {"pdfa": pdfa, "xmlValid": True}}
