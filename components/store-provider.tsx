'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {initial,Store} from '@/lib/types';
type Context={store:Store;setStore:(update:(s:Store)=>Store)=>void;ready:boolean};
const Context=createContext<Context|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){
 const [store,setInner]=useState<Store>(initial); const [ready,setReady]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem('cipaa-campaigns-v1');if(raw){const data=JSON.parse(raw) as Store;if(Array.isArray(data.campaigns)&&Array.isArray(data.donations))setInner(data);}}catch{}setReady(true)},[]);
 const setStore=(update:(s:Store)=>Store)=>setInner(prev=>{const next=update(prev);try{localStorage.setItem('cipaa-campaigns-v1',JSON.stringify(next))}catch{}return next});
 return <Context.Provider value={{store,setStore,ready}}>{children}</Context.Provider>;
}
export function useStore(){const c=useContext(Context);if(!c)throw Error('StoreProvider ausente');return c}
