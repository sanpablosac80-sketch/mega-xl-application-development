import {NextRequest} from 'next/server'
import {GET as documentGET} from '../gre-document/route'
export const runtime='nodejs'
export function GET(req:NextRequest){
 const url=new URL(req.url);url.searchParams.set('type','xml')
 return documentGET(new NextRequest(url,{headers:req.headers}))
}
