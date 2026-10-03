import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {readCdr} from './cdr.mjs';
async function fixture(code='0',id='F001-1'){
 const zip=new JSZip();zip.file('R-test.xml',`<ApplicationResponse><DocumentResponse><Response><ReferenceID>${id}</ReferenceID><ResponseCode>${code}</ResponseCode><Description>Resultado SUNAT</Description></Response><DocumentReference><ID>${id}</ID></DocumentReference></DocumentResponse></ApplicationResponse>`);
 return zip.generateAsync({type:'base64'});
}
test('acceptance requires matching document and CDR code zero',async()=>{
 assert.equal((await readCdr(await fixture(),'F001-1')).accepted,true);
 assert.equal((await readCdr(await fixture('4000'),'F001-1')).accepted,false);
 await assert.rejects(readCdr(await fixture('0','F001-2'),'F001-1'),/otro comprobante/);
});
test('CDR without XML is rejected',async()=>{
 const zip=new JSZip();zip.file('empty.txt','no CDR');
 await assert.rejects(readCdr(await zip.generateAsync({type:'base64'}),'F001-1'),/un XML/);
});
test('QR references must use HTTPS on a SUNAT host',async()=>{
 for(const [url,expected] of [['https://e-guiaremision.sunat.gob.pe/consulta','https://e-guiaremision.sunat.gob.pe/consulta'],['https://sunat.gob.pe.evil.example/consulta','']]){
  const zip=new JSZip();zip.file('R-test.xml',`<ApplicationResponse><DocumentResponse><Response><ReferenceID>F001-1</ReferenceID><ResponseCode>0</ResponseCode></Response><DocumentReference><ID>F001-1</ID><DocumentDescription>${url}</DocumentDescription></DocumentReference></DocumentResponse></ApplicationResponse>`);
  assert.equal((await readCdr(await zip.generateAsync({type:'base64'}),'F001-1')).qrText,expected);
 }
});
