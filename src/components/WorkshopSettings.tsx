import {useState,useEffect} from 'react';
import {Settings2,Check} from 'lucide-react';
import Dialog from './Dialog';
import AudioToggle from './AudioToggle';
import {THEMES,themeState,subscribeTheme,setTheme,type ThemeId} from '../theme/theme';
import './WorkshopSettings.css';
export default function WorkshopSettings(){
  const [open,setOpen]=useState(false),[theme,setPreference]=useState(themeState),[tab,setTab]=useState<'paper'|'audio'>('paper');
  useEffect(()=>subscribeTheme(()=>setPreference(themeState())),[]);
  return <><button className="settings-entry" aria-label="工坊设置" aria-pressed={open} onClick={()=>setOpen(true)}><Settings2 size={20}/><span>设置</span></button>
    {open&&<Dialog title="让工坊适合你" eyebrow="纸色与声音" onClose={()=>setOpen(false)}><div className="settings-tabs" role="tablist" aria-label="设置分类"><button role="tab" aria-selected={tab==='paper'} onClick={()=>setTab('paper')}>纸色</button><button role="tab" aria-selected={tab==='audio'} onClick={()=>setTab('audio')}>声音</button></div>{tab==='paper' ? <section className="theme-settings" aria-label="工坊主题"><h3>选一张喜欢的纸</h3><p>纸色、文字与工具一起变化。打印纸样始终保持原色。</p><div className="theme-options">{THEMES.map(t=><button key={t.id} aria-label={t.label} aria-pressed={theme.mode==='manual'&&theme.value===t.id} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();void setTheme({mode:'manual',value:t.id as ThemeId},{x:e.detail?e.clientX:r.left+r.width/2,y:e.detail?e.clientY:r.top+r.height/2});}}><span className="theme-swatch" aria-hidden="true" style={{background:t.tokens['bg-paper'],color:t.tokens['brand-text'],borderColor:t.tokens['line-strong']}}>纸{theme.mode==='manual'&&theme.value===t.id&&<Check size={13}/>}</span>{t.label}{t.dark&&<small>暗色</small>}</button>)}</div><label className="theme-system"><input type="checkbox" checked={theme.mode==='system'} onChange={e=>void setTheme({mode:e.target.checked?'system':'manual',value:theme.value})}/>跟随设备的明暗模式</label></section> : <AudioToggle/>}</Dialog>}
  </>;
}
