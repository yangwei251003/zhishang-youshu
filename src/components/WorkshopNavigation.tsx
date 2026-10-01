interface Props { inspiration:boolean; modal:string|null; introduction:boolean; tour:boolean; hydrated:boolean; onWorkshop:()=>void; onInspiration:()=>void; onManual:()=>void; onWorks:()=>void; onApprentice:()=>void; onTour:()=>void }
export default function WorkshopNavigation(p:Props){
  const items=[
    {id:'workshop',label:'实验工坊',page:true,active:!p.inspiration,action:p.onWorkshop},
    {id:'inspiration',label:'剪纸灵感库',page:true,active:p.inspiration,action:p.onInspiration},
    {id:'manual',label:'工坊指南',page:false,active:p.modal==='manual',action:p.onManual},
    {id:'works',label:'我的作品',page:false,active:p.modal==='works',action:p.onWorks},
    {id:'apprentice',label:'纸上第一课',page:false,active:p.introduction,action:p.onApprentice,disabled:!p.hydrated},
    {id:'tour',label:'使用引导',page:false,active:p.tour,action:p.onTour,disabled:!p.hydrated},
  ];
  return <nav className="main-nav" aria-label="主导航">{items.map(item=><button key={item.id} className={item.active?(item.page?'nav-active':'nav-overlay-active'):undefined} aria-current={item.page&&item.active?'page':undefined} aria-pressed={!item.page?item.active:undefined} disabled={item.disabled} data-tour-entry={item.id==='tour'?'':undefined} onClick={item.action}>{item.label}{item.page&&item.active&&<span className="nav-dot" aria-hidden="true"/>}</button>)}</nav>;
}
