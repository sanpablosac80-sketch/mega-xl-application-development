import JSZip from 'jszip';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
export async function readCdr(base64,expectedId){
 if(typeof base64!=='string'||base64.length>8_000_000)throw Error('CDR no válido');
 const zip=await JSZip.loadAsync(base64,{base64:true,checkCRC32:true});
 const files=Object.values(zip.files).filter(f=>!f.dir&&f.name.toLowerCase().endsWith('.xml'));
 if(files.length!==1)throw Error('El CDR debe contener un XML');
 const file=files[0];
 if(file._data?.uncompressedSize>5_000_000)throw Error('CDR demasiado grande');
 const xml=await file.async('string');
 if(xml.length>5_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('XML CDR no válido');
 const d=new XMLParser({removeNSPrefix:true,parseTagValue:false}).parse(xml).ApplicationResponse;
 const response=d?.DocumentResponse;
 if(!response||Array.isArray(response))throw Error('Respuesta CDR no válida');
 const id=String(response.DocumentReference?.ID||response.Response?.ReferenceID||'');
 if(id!==expectedId)throw Error('CDR corresponde a otro comprobante');
 if(response.Response?.ReferenceID&&String(response.Response.ReferenceID)!==expectedId)throw Error('Referencia del CDR no coincide con el comprobante');
 const code=String(response.Response?.ResponseCode??'');
 if(!/^\d+$/.test(code))throw Error('Código CDR no válido');
 const description=String(response.Response?.Description||'').slice(0,2000);
 const candidates=[response.DocumentReference?.DocumentDescription,d.Note].flat().filter(x=>typeof x==='string');
 let qrText='';
 for(const candidate of candidates){try{const url=new URL(candidate.trim());if(url.protocol==='https:'&&url.hostname.endsWith('.sunat.gob.pe')&&!url.username&&!url.password){qrText=url.href;break}}catch{}}
 return {code,accepted:code==='0',description,qrText,bytes:await zip.generateAsync({type:'uint8array'})};
}
