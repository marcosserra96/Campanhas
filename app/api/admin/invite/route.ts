import {NextRequest,NextResponse} from 'next/server';
import {isAdmin,createInviteToken} from '@/lib/admin-session';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(!await isAdmin())return NextResponse.json({error:'Apenas a CIPAA pode gerar convites.'},{status:401});
 const token=createInviteToken();
 return NextResponse.json({url:request.nextUrl.origin+'/cipaa#invite='+encodeURIComponent(token)},{headers:{'Cache-Control':'no-store'}});
}
