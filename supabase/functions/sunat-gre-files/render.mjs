import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import QRCode from 'qrcode';
const list=v=>v==null?[]:Array.isArray(v)?v:[v];
const val=v=>String(typeof v==='object'&&v!==null?v['#text']??'':v??'');
export function readGre(xml){
 if(xml.length>5_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('XML inválido');
 const d=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false}).parse(xml).DespatchAdvice;
 if(!d||val(d.DespatchAdviceTypeCode)!=='09')throw Error('Se requiere GRE remitente');
 const s=d.Shipment,stage=list(s?.ShipmentStage)[0],supplier=d.DespatchSupplierParty?.Party,customer=d.DeliveryCustomerParty?.Party;
 const party=p=>({name:val(p?.PartyLegalEntity?.RegistrationName),document:val(p?.PartyIdentification?.ID)});
 const address=a=>({ubigeo:val(a?.ID),address:list(a?.AddressLine).map(x=>val(x.Line)).join(', ')});
 const driver=list(stage?.DriverPerson)[0];
 return {id:val(d.ID),date:val(d.IssueDate),time:val(d.IssueTime),supplier:party(supplier),customer:party(customer),origin:address(s?.Delivery?.Despatch?.DespatchAddress),destination:address(s?.Delivery?.DeliveryAddress),reason:val(s?.HandlingCode),reasonDetail:val(s?.HandlingInstructions),weight:val(s?.GrossWeightMeasure),weightUnit:s?.GrossWeightMeasure?.['@_unitCode']??'',start:val(stage?.TransitPeriod?.StartDate),mode:val(stage?.TransportModeCode),carrier:party(stage?.CarrierParty),driver:val(driver?.ID),driverName:[val(driver?.FirstName),val(driver?.FamilyName)].filter(Boolean).join(' '),license:val(driver?.IdentityDocumentReference?.ID),plate:val(s?.TransportHandlingUnit?.TransportEquipment?.ID),lines:list(d.DespatchLine).map(l=>({id:val(l.ID),description:val(l.Item?.Description),quantity:val(l.DeliveredQuantity),unit:l.DeliveredQuantity?.['@_unitCode']??''}))};
}
export async function renderGre(xml,state,qrText=''){
 const g=readGre(xml),doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.12,.2,.27),blue=rgb(.08,.4,.64),pale=rgb(.92,.97,.99);let p,y,n=0;
 const clean=s=>String(s).replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
 const text=(s,x,at,size=9,b=false)=>p.drawText(clean(s),{x,y:at,size,font:b?bold:font,color:ink});
 const wrap=(s,width,size=9)=>{let out=[],line='';for(const word of clean(s).split(/\s+/)){for(const char of (line?' ':'')+word){if(font.widthOfTextAtSize(line+char,size)>width){out.push(line);line='';}line+=char;}}if(line)out.push(line);return out;};
 function page(){p=doc.addPage([595.28,841.89]);n++;text('MEGA XL',32,793,23,true);p.drawRectangle({x:310,y:731,width:253,height:81,color:pale,borderColor:blue,borderWidth:1});text('GUÍA DE REMISIÓN ELECTRÓNICA',320,789,10,true);text('REMITENTE',320,772,10,true);text('RUC '+g.supplier.document,320,754,10,true);text(g.id,320,737,11,true);text(g.supplier.name,32,758,9,true);text('BORRADOR / PRUEBA - NO SUSTENTA EL TRASLADO',32,710,10,true);text('Página '+n,510,24,8);y=688;}
 function room(h){if(y-h<55)page();}
 function block(s,size=9,b=false){for(const l of wrap(s,531,size)){room(size+5);text(l,32,y,size,b);y-=size+5;}}
 function right(s,end,at,size=9,b=false){text(s,end-(b?bold:font).widthOfTextAtSize(clean(s),size),at,size,b);}
 function header(){p.drawRectangle({x:32,y:y-8,width:531,height:24,color:pale});text('Ítem',38,y,8,true);text('Descripción de los bienes',74,y,8,true);right('Cantidad',478,y,8,true);text('Unidad',510,y,8,true);y-=29;}
 page();block('DESTINATARIO: '+g.customer.name,10,true);block('DOCUMENTO: '+g.customer.document);block('EMISIÓN: '+g.date+' '+g.time);block('INICIO DE TRASLADO: '+g.start);
 const reasons={'01':'Venta','14':'Venta sujeta a confirmación','02':'Compra','04':'Traslado entre establecimientos','18':'Emisor itinerante','08':'Importación','09':'Exportación','19':'Traslado a zona primaria','13':'Otros'};
 block('MOTIVO: '+g.reason+' - '+(reasons[g.reason]||'')+(g.reasonDetail?' / '+g.reasonDetail:''));block('MODALIDAD: '+(g.mode==='01'?'Transporte público':'Transporte privado'));block('PESO BRUTO: '+g.weight+' '+g.weightUnit);y-=10;
 block('PUNTO DE PARTIDA',9,true);block(g.origin.address+' | Ubigeo: '+g.origin.ubigeo);block('PUNTO DE LLEGADA',9,true);block(g.destination.address+' | Ubigeo: '+g.destination.ubigeo);y-=8;
 if(g.mode==='01')block('TRANSPORTISTA: '+g.carrier.name+' | RUC: '+g.carrier.document);
 else{block('VEHÍCULO: '+g.plate);if(g.driverName)block('CONDUCTOR: '+g.driverName);block('DOCUMENTO CONDUCTOR: '+g.driver+' | LICENCIA: '+g.license);}
 y-=12;header();for(const l of g.lines){const lines=wrap(l.description,350);room(lines.length*14+16);if(y>670)header();text(l.id,38,y,9);right(l.quantity,478,y);text(l.unit,510,y);for(const line of lines){text(line,74,y);y-=14;}y-=12;}
 room(135);y-=12;block('ESTADO: '+state,9,true);block('Representación de revisión del XML guardado. Sin aceptación SUNAT.',8);
 if(qrText){block('QR de consulta proporcionado por SUNAT:',8);const png=await QRCode.toBuffer(qrText,{width:384,margin:4});const im=await doc.embedPng(png);p.drawImage(im,{x:32,y:y-95,width:95,height:95});}
 else block('QR de SUNAT pendiente de aceptación. No se genera un QR de traslado ficticio.',8);
 doc.setTitle('MEGA XL GRE '+g.id);return {bytes:await doc.save(),filename:g.supplier.document+'-09-'+g.id+'.pdf',guide:g};
}
