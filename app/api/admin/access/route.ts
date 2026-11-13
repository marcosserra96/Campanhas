import {NextRequest,NextResponse} from 'next/server';
import {createSession,validAccessToken,isAdmin} from '@/lib/admin-session';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origem não autorizada'},{status:403});
 const {token}=await request.json().catch(()=>({token:''})) as {token?:string};
 if(!token||!validAccessToken(token))return NextResponse.json({error:'Link administrativo inválido.'},{status:401});
 await createSession();return NextResponse.json({ok:true});
}
export async function GET(){return NextResponse.json({authorized:await isAdmin()},{headers:{'Cache-Control':'no-store'}})}
