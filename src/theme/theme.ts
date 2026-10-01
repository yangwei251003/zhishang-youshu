import palettes from './palettes.json';
export const THEMES = palettes;
export type ThemeId = 'plain' | 'bamboo' | 'lacquer' | 'ink' | 'indigo';
export interface ThemePreference { mode:'manual'|'system'; value:ThemeId }
export const THEME_KEY='paperWorkshop.theme.v1';
export function parseTheme(raw:string|null):ThemePreference {
  try { const p=JSON.parse(raw??'null'); if(p && ['manual','system'].includes(p.mode) && THEMES.some(t=>t.id===p.value)) return {mode:p.mode,value:p.value}; } catch { /* Invalid storage is not fatal. */ }
  return {mode:'manual',value:'plain'};
}
let preference:ThemePreference={mode:'manual',value:'plain'};
const listeners=new Set<()=>void>();
export function themeState(){return preference;}
export function subscribeTheme(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
function apply(){ const id=preference.mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'ink':'plain'):preference.value; document.documentElement.dataset.theme=id; }
export function initializeTheme(){
  try{preference=parseTheme(localStorage.getItem(THEME_KEY));}catch{/* Storage may be disabled. */}
  apply(); const query=matchMedia('(prefers-color-scheme: dark)');const change=()=>{if(preference.mode==='system')apply();};query.addEventListener('change',change);
  return()=>query.removeEventListener('change',change);
}
let transition:ViewTransition|undefined;
export async function setTheme(next:ThemePreference, origin?:{x:number;y:number}) {
  preference=next;try{localStorage.setItem(THEME_KEY,JSON.stringify(next));}catch{/* Session still works. */}
  listeners.forEach(fn=>fn());transition?.skipTransition();
  if(!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches){apply();return;}
  const x=origin?.x??innerWidth/2,y=origin?.y??innerHeight/2,r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  try { const current=document.startViewTransition(apply);transition=current;await current.ready;
    document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]}, {duration:520,easing:'ease-out',pseudoElement:'::view-transition-new(root)'});
    await current.finished;if(transition===current)transition=undefined;
  }catch{apply();}
}
