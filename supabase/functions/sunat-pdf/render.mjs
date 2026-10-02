import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import QRCode from 'qrcode';
const arr = v => v == null ? [] : Array.isArray(v) ? v : [v];
const value = v => typeof v === 'object' && v !== null ? String(v['#text'] ?? '') : String(v ?? '');
const amount = v => { const n = Number(value(v)); if (!Number.isFinite(n)) throw new Error('Importe XML inválido'); return n.toFixed(2); };
export function readInvoice(xml) {
  if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('XML no válido');
  const root = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, trimValues: true }).parse(xml);
  const d = root.Invoice;
  if (!d || value(d.InvoiceTypeCode) !== '01') throw new Error('Solo se admite factura electrónica en esta versión');
  const supplier = d.AccountingSupplierParty?.Party, customer = d.AccountingCustomerParty?.Party;
  const identification = p => arr(p?.PartyIdentification)[0]?.ID ?? p?.PartyTaxScheme?.CompanyID;
  const name = p => value(arr(p?.PartyLegalEntity)[0]?.RegistrationName ?? p?.PartyTaxScheme?.RegistrationName);
  const address = p => {
    const a = arr(p?.PartyLegalEntity)[0]?.RegistrationAddress ?? p?.PostalAddress;
    return arr(a?.AddressLine).map(l => value(l.Line)).filter(Boolean).join(', ') || value(a?.StreetName);
  };
  const tax = arr(d.TaxTotal), totals = d.LegalMonetaryTotal;
  const igv = tax.flatMap(t => arr(t.TaxSubtotal)).filter(t => value(t.TaxCategory?.TaxScheme?.ID) === '1000').reduce((sum,t)=>sum+Number(value(t.TaxAmount)),0).toFixed(2);
  const id = value(d.ID), date = value(d.IssueDate), currency = value(d.DocumentCurrencyCode);
  const ruc = value(identification(supplier)), recipient = identification(customer);
  if (!/^\d{11}$/.test(ruc) || !/^F[A-Z0-9]{3}-\d{1,8}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !currency) throw new Error('Identificación XML incompleta');
  const total = amount(totals?.PayableAmount), digest = value(d.UBLExtensions?.UBLExtension?.ExtensionContent?.Signature?.SignedInfo?.Reference?.DigestValue);
  const terms = arr(d.PaymentTerms);
  return { id,date,currency,ruc,supplier:name(supplier),supplierAddress:address(supplier),customer:name(customer),customerDocument:value(recipient),customerDocumentType:recipient?.['@_schemeID'] ?? '',customerAddress:address(customer),total,igv,digest,
    qr:[ruc,'01',...id.split('-'),igv,total,date,recipient?.['@_schemeID']??'',value(recipient),digest].join('|'),
    lines:arr(d.InvoiceLine).map(l => ({id:value(l.ID),quantity:value(l.InvoicedQuantity),unit:l.InvoicedQuantity?.['@_unitCode']??'',description:arr(l.Item?.Description).map(value).join(' / '),unitValue:amount(l.Price?.PriceAmount),unitPrice:value(arr(l.PricingReference?.AlternativeConditionPrice).find(p=>value(p.PriceTypeCode)==='01')?.PriceAmount),net:amount(l.LineExtensionAmount)})),
    taxes:tax.flatMap(t=>arr(t.TaxSubtotal)).map(t=>({name:value(t.TaxCategory?.TaxScheme?.Name),base:amount(t.TaxableAmount),tax:amount(t.TaxAmount)})),
    payment:terms.find(t=>value(t.ID)==='FormaPago'),installments:terms.filter(t=>/^Cuota/.test(value(t.PaymentMeansID))),notes:arr(d.Note).map(value),discount:value(totals?.AllowanceTotalAmount)
  };
}
export async function renderInvoice(xml, status) {
  const d=readInvoice(xml), pdf=await PDFDocument.create();
  const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue=rgb(.08,.40,.64), pale=rgb(.92,.97,.99), ink=rgb(.13,.20,.27);
  // Standard PDF fonts support Latin-1. Unsupported characters are replaced visibly.
  const clean=s=>String(s).replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
  let page,y,pageNumber=0;
  function text(s,x,at,size=9,b=false){page.drawText(clean(s),{x,y:at,size,font:b?bold:font,color:ink});}
  function wrap(s,width,size=9){const words=clean(s).split(/\s+/),out=[];let line='';for(const w of words){if(font.widthOfTextAtSize(line?line+' '+w:w,size)>width&&line){out.push(line);line='';}if(font.widthOfTextAtSize(w,size)>width){for(const char of w){if(font.widthOfTextAtSize(line+char,size)>width){out.push(line);line='';}line+=char;}}else line+=(line?' ':'')+w;}if(line)out.push(line);return out;}
  function block(s,x,width,size=9,b=false){for(const line of wrap(s,width,size)){room(size+4);text(line,x,y,size,b);y-=size+4;}}
  const beta=/BETA/.test(status); // Production rendering requires separate compliance validation.
  function newPage(){page=pdf.addPage([595.28,841.89]);pageNumber++;page.drawRectangle({x:32,y:735,width:531,height:75,color:pale});text('MEGA XL',46,780,22,true);text('FACTURA ELECTRÓNICA',340,782,12,true);text('RUC: '+d.ruc,340,761,10);text(d.id,340,742,11,true);text(d.supplier.slice(0,48),46,750,10,true);text(beta?'PRUEBA SUNAT BETA - SIN VALIDEZ TRIBUTARIA':'BORRADOR - VALIDACIÓN TRIBUTARIA PENDIENTE',32,716,10,true);text('Página '+pageNumber,505,23,8);y=690;}
  function room(height){if(y-height<55)newPage();}
  newPage();
  block('Domicilio fiscal: '+(d.supplierAddress||'No consignado en el XML; pendiente de completar'),32,531);
  block('Cliente: '+d.customer,32,531,10,true);block('Documento: '+d.customerDocument,32,531);
  if(d.customerAddress)block('Dirección: '+d.customerAddress,32,531);
  block('Emisión: '+d.date+'     Moneda: '+d.currency,32,531);
  block('Forma de pago: '+(value(d.payment?.PaymentMeansID)||'No consignada'),32,531);y-=12;
  function tableHeader(){page.drawRectangle({x:32,y:y-7,width:531,height:23,color:pale});for(const [s,x] of [['Cant.',37],['Und.',80],['Descripción',121],['V. unit.',355],['P. unit.',420],['Valor neto',493]])text(s,x,y,8,true);y-=28;}
  tableHeader();
  for(const l of d.lines){const description=wrap(l.description || '[Sin descripción en XML]',222,9);for(let start=0;start<description.length;){if(y<85){newPage();tableHeader();}const count=Math.min(description.length-start,Math.floor((y-58)/13));if(count<1){newPage();tableHeader();continue;}if(start===0){text(l.quantity,37,y,8);text(l.unit,80,y,8);text(l.unitValue,355,y,8);text(l.unitPrice?amount(l.unitPrice):'-',420,y,8);text(l.net,493,y,8);}for(const s of description.slice(start,start+count)){text(s,121,y);y-=13;}start+=count;}y-=10;}
  room(170);y-=8;
  for(const t of d.taxes){block(t.name+' - base: '+t.base+' / tributo: '+t.tax,340,220);}
  if(d.discount)block('Descuento total: '+amount(d.discount),340,220);
  block('TOTAL '+d.currency+' '+d.total,340,220,14,true);
  if(d.installments.length){room(40);block('Monto pendiente: '+value(d.payment?.Amount),32,531);for(const t of d.installments){room(35);block(value(t.PaymentMeansID)+' | '+value(t.PaymentDueDate)+' | '+value(t.Amount)+' '+d.currency,32,531);}}
  for(const note of d.notes){room(35);block(note,32,531);}
  room(165);y-=12;
  if(d.digest){const png=await QRCode.toBuffer(d.qr,{type:'png',width:384,margin:4,errorCorrectionLevel:'M'});const image=await pdf.embedPng(png);page.drawImage(image,{x:32,y:y-105,width:105,height:105});}
  else text('QR pendiente de firma',32,y-40,8);
  let footerY=y; text('Representación impresa de la factura electrónica',150,footerY,9,true);footerY-=17;
  for(const line of wrap('Estado: '+status,410,8)){text(line,150,footerY,8);footerY-=12;}
  for(const line of wrap('Valor resumen: '+(d.digest||'XML sin firma'),410,7)){text(line,150,footerY,7);footerY-=11;}
  text('Datos reproducidos del XML conservado por Mega XL.',150,footerY-5,8);
  pdf.setTitle('MEGA XL - Factura '+d.id);pdf.setAuthor('MEGA XL');
  return {bytes:await pdf.save(),filename:d.ruc+'-01-'+d.id+'.pdf',invoice:d};
}
