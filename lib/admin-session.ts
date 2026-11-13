import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const cookieName='cipaa_admin_session';
function secret(){return process.env.ADMIN_ACCESS_TOKEN||''}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('hex')}
function compare(a:string,b:string){const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function validAccessToken(token:string){const s=secret();return s.length>=32&&compare(token,s)}
export async function isAdmin(){const s=secret();if(s.length<32)return false;const raw=(await cookies()).get(cookieName)?.value||'';const [expiry,signature]=raw.split('.');if(!expiry||!signature||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;return compare(signature,sign(expiry))}
export async function createSession(){const expires=String(Date.now()+7*24*60*60*1000);(await cookies()).set(cookieName,expires+'.'+sign(expires),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*24*60*60})}
