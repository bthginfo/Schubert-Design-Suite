"""Official pinned XRechnung schemas/Schematron; original XML stays unmodified on incoming validation."""
import hashlib
import json
import os
import tempfile
from pathlib import Path
from lxml import etree
from saxonche import PySaxonProcessor

ROOT = Path(os.environ.get('XRECHNUNG_RESOURCES', '/opt/kosit/config'))
VERSION = 'XRechnung3.0.2/config2026-08-31/CEN1.3.16/DE2.6.0'
NS = {'rsm':'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100','ram':'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'}
GUIDELINE = 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0'

def parse(value):
    if len(value)>5*1024*1024 or b'<!DOCTYPE' in value.upper() or b'<!ENTITY' in value.upper():
        raise ValueError('XML_ACTIVE_CONTENT')
    return etree.fromstring(value,etree.XMLParser(resolve_entities=False,no_network=True))

def validate(value):
    original=parse(value)
    scenario_ns={'s':'http://www.xoev.de/de/validator/framework/1/scenarios'}
    config=etree.parse(str(ROOT/'scenarios.xml'),etree.XMLParser(resolve_entities=False,no_network=True))
    cii=etree.QName(original).localname=='CrossIndustryInvoice'
    if cii:
        marker=original.find('rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID',NS)
        if marker is None or marker.text!=GUIDELINE:raise ValueError('XRECHNUNG_GUIDELINE')
        scenario_name='EN16931 XRechnung (CII)'
    else:
        kind=etree.QName(original).localname
        if kind not in {'Invoice','CreditNote'}:raise ValueError('XRECHNUNG_SYNTAX')
        marker=original.find('{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CustomizationID')
        if marker is None or marker.text!=GUIDELINE:raise ValueError('XRECHNUNG_GUIDELINE')
        scenario_name='EN16931 XRechnung (UBL '+kind+')'
    scenarios=config.xpath('//s:scenario[s:name=$name]',namespaces=scenario_ns,name=scenario_name)
    if len(scenarios)!=1:raise ValueError('XRECHNUNG_CONFIGURATION')
    scenario=scenarios[0]
    schema=scenario.find('s:validateWithXmlSchema/s:resource/s:location',scenario_ns).text
    etree.XMLSchema(etree.parse(str(ROOT/schema))).assertValid(original)
    overrides={item.text:item.get('level') for item in scenario.findall('s:createReport/s:customLevel',scenario_ns)}
    failures=[];warnings=[];reports=[]
    with tempfile.TemporaryDirectory(prefix='xrechnung-') as directory:
        source=Path(directory)/'invoice.xml';source.write_bytes(etree.tostring(original,xml_declaration=True,encoding='UTF-8'))
        with PySaxonProcessor(license=False) as processor:
            xslt=processor.new_xslt30_processor()
            for location in scenario.findall('s:validateWithSchematron/s:resource/s:location',scenario_ns):
                output=xslt.transform_to_string(source_file=str(source),stylesheet_file=str(ROOT/location.text))
                report=etree.fromstring(output.encode('utf-8'));reports.append(hashlib.sha256(output.encode()).hexdigest())
                for item in report.findall('.//{http://purl.oclc.org/dsdl/svrl}failed-assert'):
                    level=overrides.get(item.get('id'),item.get('flag',item.get('role','error')))
                    detail={'id':item.get('id'),'level':level,'message':' '.join(item.itertext()).strip()[:1000]}
                    (warnings if level in {'warning','information','info'} else failures).append(detail)
    if failures:
        print(json.dumps({'code':'XRECHNUNG_VALIDATION','rules':[f['id'] for f in failures]}),flush=True)
        raise ValueError('XRECHNUNG_VALIDATION: '+','.join(f['id'] or 'schema' for f in failures)[:1000])
    return {'valid':True,'version':VERSION,'schema':schema,'schematronHashes':reports,'warnings':warnings,'xmlHash':hashlib.sha256(value).hexdigest()}

def from_facturx(value,profile):
    root=parse(value)
    context=root.find('rsm:ExchangedDocumentContext',NS)
    context.find('ram:GuidelineSpecifiedDocumentContextParameter/ram:ID',NS).text=GUIDELINE
    process=etree.Element('{'+NS['ram']+'}BusinessProcessSpecifiedDocumentContextParameter')
    etree.SubElement(process,'{'+NS['ram']+'}ID').text=profile['process_id'];context.insert(0,process)
    agreement=root.find('rsm:SupplyChainTradeTransaction/ram:ApplicableHeaderTradeAgreement',NS)
    buyer_ref=etree.Element('{'+NS['ram']+'}BuyerReference');buyer_ref.text=profile['buyer_reference'];agreement.insert(0,buyer_ref)
    def endpoint(party,address,scheme):
        element=etree.Element('{'+NS['ram']+'}URIUniversalCommunication')
        etree.SubElement(element,'{'+NS['ram']+'}URIID',schemeID=scheme).text=address
        tax=party.find('ram:SpecifiedTaxRegistration',NS)
        party.insert(list(party).index(tax) if tax is not None else len(party),element)
    seller=agreement.find('ram:SellerTradeParty',NS);buyer=agreement.find('ram:BuyerTradeParty',NS)
    if profile.get('seller_identifier'):
        identifier=etree.Element('{'+NS['ram']+'}ID');identifier.text=profile['seller_identifier'];seller.insert(0,identifier)
    contact=etree.Element('{'+NS['ram']+'}DefinedTradeContact');etree.SubElement(contact,'{'+NS['ram']+'}PersonName').text=profile['seller_contact']
    phone=etree.SubElement(contact,'{'+NS['ram']+'}TelephoneUniversalCommunication');etree.SubElement(phone,'{'+NS['ram']+'}CompleteNumber').text=profile['seller_phone']
    email=etree.SubElement(contact,'{'+NS['ram']+'}EmailURIUniversalCommunication');etree.SubElement(email,'{'+NS['ram']+'}URIID').text=profile['seller_email']
    address=seller.find('ram:PostalTradeAddress',NS);seller.insert(list(seller).index(address),contact)
    endpoint(seller,profile['seller_endpoint'],profile['seller_endpoint_scheme']);endpoint(buyer,profile['buyer_endpoint'],profile['buyer_endpoint_scheme'])
    output=etree.tostring(root,xml_declaration=True,encoding='UTF-8')
    return output,validate(output)
