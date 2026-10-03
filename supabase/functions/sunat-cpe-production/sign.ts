import forge from 'npm:node-forge@1.3.1'
import {SignedXml} from 'npm:xml-crypto@6.1.2'
export function sign(xml:string,bytes:Uint8Array,password:string){
 let raw='';for(const b of bytes)raw+=String.fromCharCode(b)
 const p12=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(raw,'raw')),false,password)
 const cert=(p12.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[])[0]?.cert
 const key=(p12.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[])[0]?.key
 if(!cert||!key||new Date()<cert.validity.notBefore||new Date()>cert.validity.notAfter)throw Error('Certificado no vigente o incompleto')
 xml=xml.replace('<ext:ExtensionContent/>','<ext:ExtensionContent></ext:ExtensionContent>')
 const sig=new SignedXml({privateKey:forge.pki.privateKeyToPem(key)})
 sig.signatureAlgorithm='http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';sig.canonicalizationAlgorithm='http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
 sig.addReference({xpath:'/*',transforms:['http://www.w3.org/2000/09/xmldsig#enveloped-signature','http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],digestAlgorithm:'http://www.w3.org/2001/04/xmlenc#sha256',isEmptyUri:true})
 sig.getKeyInfoContent=()=>'<ds:X509Data><ds:X509Certificate>'+forge.pki.certificateToPem(cert).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r|\n/g,'')+'</ds:X509Certificate></ds:X509Data>'
 sig.computeSignature(xml,{location:{reference:"//*[local-name(.)='ExtensionContent'][1]",action:'append'},prefix:'ds',attrs:{Id:'SignatureSP'}})
 const result=sig.getSignedXml(),verify=new SignedXml({publicCert:forge.pki.certificateToPem(cert)})
 verify.loadSignature(result.match(/<ds:Signature[\s\S]*?<\/ds:Signature>/)![0]);if(!verify.checkSignature(result))throw Error('Firma local no válida')
 return result
}
