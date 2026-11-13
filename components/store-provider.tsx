'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {Store} from '@/lib/types';
type Context={store:Store;setStore:(update:(s:Store)=>Store)=>void;refresh:()=>Promise<void>;ready:boolean;error:string;authorized:boolean};
const empty:Store={campaigns:[],donations:[],settings:{pinEnabled:false}};
const Context=createContext<Context|null>(null);
export function StoreProvider({children,admin=false}:{children:React.ReactNode;admin?:boolean}){
 const [store,setInner]=useState<Store>(empty);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const [authorized,setAuthorized]=useState(!admin);
 const refresh=useCallback(async()=>{
  try{
   const result=await fetch('/api/campaigns'+(admin?'?all=1':''),{cache:'no-store',credentials:'same-origin'});
   const json=await result.json();
   if(!result.ok)throw new Error(json.error||'Falha de conexão');
   setInner(json as Store);setAuthorized(true);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Falha de conexão');if(admin)setAuthorized(false)}
  finally{setReady(true)}
 },[admin]);
 useEffect(()=>{
  let active=true;
  (async()=>{
    if(admin&&location.hash.startsWith('#access=')){
     try{
      const token=decodeURIComponent(location.hash.slice('#access='.length));
      history.replaceState(null,'',location.pathname+location.search);
      const response=await fetch('/api/admin/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      if(!response.ok)throw Error('Link administrativo inválido.');
     }catch(e){if(active){setError(e instanceof Error?e.message:'Link inválido');setReady(true)}return}
    }
    if(active)await refresh();
  })();
  return()=>{active=false};
 },[admin,refresh]);
 useEffect(()=>{if(admin)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},8000);return()=>clearInterval(timer)},[admin,refresh]);
 const setStore=(update:(s:Store)=>Store)=>setInner(update);
 return <Context.Provider value={{store,setStore,ready,error,authorized,refresh}}>{children}</Context.Provider>;
}
export function useStore(){const c=useContext(Context);if(!c)throw Error('StoreProvider ausente');return c}
