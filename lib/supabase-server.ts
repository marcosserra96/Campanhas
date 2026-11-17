import 'server-only';
const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://kgbnapstffmqdwhtslwt.supabase.co';
const key=process.env.SUPABASE_SECRET_KEY||'';
export function configured(){return !!key}
export async function db<T=Record<string,unknown>[]>(table:string,query='',method='GET',payload?:unknown):Promise<T>{
 if(!key)throw new Error('Supabase não configurado: adicione SUPABASE_SECRET_KEY no ambiente do servidor.');
 if(!/^[a-z_]+$/.test(table))throw new Error('Tabela inválida');
 const res=await fetch(url+'/rest/v1/'+table+(query?'?'+query:''),{
  method,headers:{apikey:key,'Content-Type':'application/json',Prefer:'return=representation'},body:payload===undefined?undefined:JSON.stringify(payload),cache:'no-store'
 });
 if(!res.ok){const message=await res.text();throw new Error('Supabase '+res.status+': '+message.slice(0,250))}
 const text=await res.text();return (text?JSON.parse(text):[]) as T;
}

export async function rpc<T=unknown>(fn:string,payload:Record<string,unknown>):Promise<T>{
 if(!key)throw new Error('Supabase não configurado.');
 if(!/^[a-z_]+$/.test(fn))throw new Error('Função inválida.');
 const res=await fetch(url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
 if(!res.ok){const message=await res.text();throw new Error('Supabase '+res.status+': '+message.slice(0,550))}
 return await res.json() as T;
}
