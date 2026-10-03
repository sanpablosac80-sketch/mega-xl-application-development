import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import QRCode from 'qrcode';
const arr = v => v == null ? [] : Array.isArray(v) ? v : [v];
const value = v => typeof v === 'object' && v !== null ? String(v['#text'] ?? '') : String(v ?? '');
const amount = v => { const n = Number(value(v)); if (!Number.isFinite(n)) throw new Error('Importe XML inválido'); return n.toFixed(2); };
export function readInvoice(xml) {
  if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('XML no válido');
  const root = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, trimValues: true }).parse(xml);
  const d = root.Invoice || root.CreditNote;
  const type=root.CreditNote ? '07' : value(d?.InvoiceTypeCode);
  const credit=type==='07';
  if (!d || !['01','03','07'].includes(type)) throw new Error('Tipo de comprobante no admitido');
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
  if (!/^\d{11}$/.test(ruc) || !/^[FB][A-Z0-9]{3}-\d{1,8}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !currency) throw new Error('Identificación XML incompleta');
  const total = amount(totals?.PayableAmount), digest = value(d.UBLExtensions?.UBLExtension?.ExtensionContent?.Signature?.SignedInfo?.Reference?.DigestValue);
  const terms = arr(d.PaymentTerms);
  const discounts = node => arr(node?.AllowanceCharge).filter(a => value(a.ChargeIndicator) === 'false').reduce((sum,a)=>sum+Number(amount(a.Amount)),0);
  const globalDiscount=discounts(d), itemDiscount=arr(d.InvoiceLine||d.CreditNoteLine).reduce((sum,l)=>sum+discounts(l),0);
  const discount=value(totals?.AllowanceTotalAmount) ? amount(totals.AllowanceTotalAmount) : (globalDiscount+itemDiscount).toFixed(2);
  return { type,title:credit?'NOTA DE CRÉDITO ELECTRÓNICA':type==='03'?'BOLETA DE VENTA ELECTRÓNICA':'FACTURA ELECTRÓNICA',reference:value(d.BillingReference?.InvoiceDocumentReference?.ID),reason:value(d.DiscrepancyResponse?.Description),id,date,currency,ruc,supplier:name(supplier),supplierAddress:address(supplier),customer:name(customer),customerDocument:value(recipient),customerDocumentType:recipient?.['@_schemeID'] ?? '',customerAddress:address(customer),total,igv,digest,
    qr:[ruc,type,...id.split('-'),igv,total,date,recipient?.['@_schemeID']??'',value(recipient),digest].join('|'),
    lines:arr(d.InvoiceLine||d.CreditNoteLine).map(l => ({id:value(l.ID),quantity:value(l.InvoicedQuantity||l.CreditedQuantity),unit:(l.InvoicedQuantity||l.CreditedQuantity)?.['@_unitCode']??'',description:arr(l.Item?.Description).map(value).join(' / '),discount:discounts(l).toFixed(2),unitValue:amount(l.Price?.PriceAmount),unitPrice:value(arr(l.PricingReference?.AlternativeConditionPrice).find(p=>value(p.PriceTypeCode)==='01')?.PriceAmount),net:amount(l.LineExtensionAmount)})),
    taxes:tax.flatMap(t=>arr(t.TaxSubtotal)).map(t=>({code:value(t.TaxCategory?.TaxScheme?.ID),name:value(t.TaxCategory?.TaxScheme?.Name),base:amount(t.TaxableAmount),tax:amount(t.TaxAmount)})),
    payment:terms.find(t=>value(t.ID)==='FormaPago'),installments:terms.filter(t=>/^Cuota/.test(value(t.PaymentMeansID))),notes:arr(d.Note).map(value),discount,globalDiscount:globalDiscount.toFixed(2),itemDiscount:itemDiscount.toFixed(2),charges:amount(totals?.ChargeTotalAmount),prepaid:amount(totals?.PrepaidAmount)
  };
}
function moneyWords(total,currency){
  const units=['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  const tens=['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const hundreds=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  function words(n){if(n<30)return units[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' Y '+units[n%10]:'');if(n===100)return 'CIEN';if(n<1000)return hundreds[Math.floor(n/100)]+(n%100?' '+words(n%100):'');if(n<1000000)return (n<2000?'MIL':words(Math.floor(n/1000))+' MIL')+(n%1000?' '+words(n%1000):'');return (n<2000000?'UN MILLÓN':words(Math.floor(n/1000000))+' MILLONES')+(n%1000000?' '+words(n%1000000):'');}
  const [integer,cents]=total.split('.'),n=Number(integer);
  if(!Number.isSafeInteger(n)||n<0||n>=1000000000000)return total+' '+currency;
  return words(n)+' CON '+cents+'/100 '+({'PEN':'SOLES','USD':'DÓLARES AMERICANOS'}[currency]||currency);
}
export async function renderInvoice(xml, status, addresses = {}) {
  const d=readInvoice(xml), pdf=await PDFDocument.create();
  const betaAddressFallback=/BETA/.test(status);
  if(betaAddressFallback){d.supplierAddress ||= addresses.supplierAddress || '';d.customerAddress ||= addresses.customerAddress || '';}
  const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue=rgb(.08,.40,.64), pale=rgb(.92,.97,.99), ink=rgb(.13,.20,.27);
  // Standard PDF fonts support Latin-1. Unsupported characters are replaced visibly.
  const clean=s=>String(s).replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
  let page,y,pageNumber=0;
  function text(s,x,at,size=9,b=false){page.drawText(clean(s),{x,y:at,size,font:b?bold:font,color:ink});}
  function wrap(s,width,size=9){const words=clean(s).split(/\s+/),out=[];let line='';for(const w of words){if(font.widthOfTextAtSize(line?line+' '+w:w,size)>width&&line){out.push(line);line='';}if(font.widthOfTextAtSize(w,size)>width){for(const char of w){if(font.widthOfTextAtSize(line+char,size)>width){out.push(line);line='';}line+=char;}}else line+=(line?' ':'')+w;}if(line)out.push(line);return out;}
  function block(s,x,width,size=9,b=false){for(const line of wrap(s,width,size)){room(size+4);text(line,x,y,size,b);y-=size+4;}}
  const beta=/BETA/.test(status); // Production rendering requires separate compliance validation.
  function newPage(){
    page=pdf.addPage([595.28,841.89]);pageNumber++;
    text('MEGA XL',32,791,24,true);
    let headY=769;
    for(const line of wrap(d.supplier,285,10)){text(line,32,headY,10,true);headY-=13;}
    for(const line of wrap('Domicilio fiscal: '+(d.supplierAddress||'PENDIENTE EN EL XML'),285,8)){text(line,32,headY,8);headY-=11;}
    page.drawRectangle({x:337,y:734,width:226,height:78,borderColor:blue,borderWidth:1,color:pale});
    text('RUC '+d.ruc,350,788,12,true);text(d.title,350,764,9,true);text(d.id,350,742,14,true);
    text(beta?'PRUEBA SUNAT BETA - SIN VALIDEZ TRIBUTARIA':status==='ACEPTADO'?'ACEPTADO POR SUNAT':'BORRADOR - VALIDACIÓN TRIBUTARIA PENDIENTE',32,711,9,true);
    text('Página '+pageNumber,505,23,8);y=Math.min(688,headY-20);
  }
  function room(height){if(y-height<55)newPage();}
  newPage();
  block('SEÑOR(ES): '+d.customer,32,531,10,true);
  block((d.customerDocumentType==='6'?'RUC: ':'DOCUMENTO: ')+d.customerDocument,32,531);
  block('DIRECCIÓN: '+(d.customerAddress||'No consignada en el XML'),32,531);
  block('FECHA DE EMISIÓN: '+d.date+'     MONEDA: '+d.currency,32,531);
  if(d.reference){block('COMPROBANTE MODIFICADO: '+d.reference,32,531);block('MOTIVO: '+d.reason,32,531);}
  if(d.type!=='07')block('FORMA DE PAGO: '+(value(d.payment?.PaymentMeansID)||'No consignada'),32,531);y-=18;
  function right(s,end,at,size=8,b=false){text(s,end-(b?bold:font).widthOfTextAtSize(clean(s),size),at,size,b);}

  function tableHeader(){
    page.drawRectangle({x:32,y:y-9,width:531,height:24,color:pale});
    for(const [label,x] of [['Ítem',35],['Und.',94],['Descripción',123]])text(label,x,y,8,true);
    for(const [label,end] of [['Cant.',86],['V. unit.',354],['P. unit.',421],['Dscto.',483],['V. venta',559]])right(label,end,y,8,true);
    y-=30;
  }
  tableHeader();
  for(const l of d.lines){
    const description=wrap(l.description || '[Sin descripción en XML]',163,9);
    for(let start=0;start<description.length;){
      if(y<85){newPage();tableHeader();}
      const count=Math.min(description.length-start,Math.floor((y-58)/13));
      if(count<1){newPage();tableHeader();continue;}
      if(start===0){text(l.id,35,y,8);right(l.quantity,86,y);text(l.unit,94,y,8);right(l.unitValue,354,y);right(l.unitPrice?amount(l.unitPrice):'-',421,y);right(l.discount,483,y);right(l.net,559,y);}
      for(const line of description.slice(start,start+count)){text(line,123,y);y-=13;}
      start+=count;
    }
    page.drawLine({start:{x:32,y:y-3},end:{x:563,y:y-3},thickness:.4,color:rgb(.82,.87,.91)});y-=15;
  }
  room(35);block('V. unitario, descuento y V. venta: sin tributos. P. unitario: con tributos.',32,531,7);
  const summary=[['Descuentos por ítem',d.itemDiscount],['Descuentos globales',d.globalDiscount],['TOTAL DESCUENTOS',d.discount]];
  const operationLabels={'1000':'Operaciones gravadas','9997':'Operaciones exoneradas','9998':'Operaciones inafectas','9995':'Exportación','9996':'Operaciones gratuitas'};
  for(const t of d.taxes){summary.push([operationLabels[t.code]||t.name+' - base',t.base]);if(Number(t.tax)!==0 || t.code==='1000')summary.push([t.name,t.tax]);}
  if(Number(d.charges))summary.push(['Otros cargos',d.charges]);
  if(Number(d.prepaid))summary.push(['Anticipos',d.prepaid]);
  summary.push(['IMPORTE TOTAL '+d.currency,d.total]);
  const summaryHeight=summary.length*23+20;
  room(summaryHeight+30);y-=14;
  page.drawRectangle({x:310,y:y-summaryHeight+15,width:253,height:summaryHeight,color:pale});
  for(let i=0;i<summary.length;i++){
    const [label,number]=summary[i],isTotal=i===summary.length-1,size=isTotal?11:9;
    text(label,322,y,size,isTotal);
    const f=isTotal?bold:font;
    text(number,551-f.widthOfTextAtSize(clean(number),size),y,size,isTotal);
    if(isTotal){page.drawLine({start:{x:322,y:y+15},end:{x:551,y:y+15},thickness:.6,color:blue});}
    y-=23;
  }
  y-=14;
  room(40);block('SON: '+moneyWords(d.total,d.currency),32,531,9,true);
  if(d.installments.length){room(40);block('Monto pendiente: '+value(d.payment?.Amount),32,531);for(const t of d.installments){room(35);block(value(t.PaymentMeansID)+' | '+value(t.PaymentDueDate)+' | '+value(t.Amount)+' '+d.currency,32,531);}}
  for(const note of d.notes){room(35);block(note,32,531);}
  room(165);y-=12;
  if(d.digest){const png=await QRCode.toBuffer(d.qr,{type:'png',width:384,margin:4,errorCorrectionLevel:'M'});const image=await pdf.embedPng(png);page.drawImage(image,{x:32,y:y-105,width:105,height:105});}
  else text('QR pendiente de firma',32,y-40,8);
  let footerY=y; text('Representación impresa del comprobante electrónico',150,footerY,9,true);footerY-=17;
  for(const line of wrap('Estado: '+status,410,8)){text(line,150,footerY,8);footerY-=12;}
  for(const line of wrap('Valor resumen: '+(d.digest||'XML sin firma'),410,7)){text(line,150,footerY,7);footerY-=11;}
  text(betaAddressFallback && (addresses.supplierAddress || addresses.customerAddress) ? 'BETA: direcciones complementadas desde los datos del CRM.' : 'Datos reproducidos del XML conservado por Mega XL.',150,footerY-5,8);
  pdf.setTitle('MEGA XL - '+d.id);pdf.setAuthor('MEGA XL');
  return {bytes:await pdf.save(),filename:d.ruc+'-'+d.type+'-'+d.id+'.pdf',invoice:d};
}
