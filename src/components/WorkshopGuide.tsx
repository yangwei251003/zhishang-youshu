import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Clapperboard, Layers3, Printer, Scissors, UsersRound } from 'lucide-react';
import Dialog from './Dialog';
import WorkshopIntroVideo from './WorkshopIntroVideo';
import { WORKSHOP_FILM, WORKSHOP_TEAM } from '../content/workshop-intro';
import '../styles/guide.css';

export type GuideSection = 'about' | 'practice' | 'team';
const sections = [{ id: 'about', label: '认识工坊', icon: Clapperboard }, { id: 'practice', label: '动手指南', icon: BookOpen }, { id: 'team', label: '我们的团队', icon: UsersRound }] as const;

export default function WorkshopGuide({ initialSection = 'about', playOnOpen = false, onClose, onTour, children }: {
  initialSection?: GuideSection; playOnOpen?: boolean; onClose: () => void; onTour: () => void; children: ReactNode;
}) {
  const [section, setSection] = useState<GuideSection>(initialSection);
  const [requestPlayback, setRequestPlayback] = useState(playOnOpen);
  const tabs = useRef<HTMLDivElement>(null);
  const id = useId();
  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = sections.findIndex(item => item.id === section);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (current + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
    setSection(sections[index].id);
    setRequestPlayback(false);
    tabs.current?.querySelectorAll<HTMLButtonElement>('button')[index].focus();
  }
  return <Dialog title="工坊指南" eyebrow="一张纸的故事，从这里展开" onClose={onClose} wide>
    <div className="workshop-guide">
      <div className="guide-tabs" role="tablist" aria-label="工坊指南内容" ref={tabs} onKeyDown={navigateTabs}>{sections.map(({ id: value, label, icon: Icon }) => <button key={value} id={`${id}-${value}-tab`} role="tab" aria-selected={section === value} aria-controls={`${id}-${value}-panel`} tabIndex={section === value ? 0 : -1} onClick={() => { setSection(value); setRequestPlayback(false); }}><Icon size={17}/>{label}</button>)}</div>
      <section id={`${id}-about-panel`} role="tabpanel" aria-labelledby={`${id}-about-tab`} hidden={section !== 'about'} tabIndex={0} className="guide-panel">
        {section === 'about' && <><div className="guide-about-heading"><span className="guide-kicker">认识纸上有数</span><h3>{WORKSHOP_FILM.title}</h3><p>把一个小小的念头剪出来，看看它怎样变成图案。<br/>这里有可反复尝试的实验，也有留给你的空白。</p></div><WorkshopIntroVideo playOnOpen={requestPlayback}/>
          <div className="guide-feature-list"><article><Scissors size={21}/><h4>先试一刀</h4><p>选折法、画剪口，再慢慢展开。剪错了可以撤销，也能回到某一步修改。</p></article><article><Layers3 size={21}/><h4>看看为什么</h4><p>先预测，再观察纸片、孔洞与连接。跟着实验，把看见的变化想明白。</p></article><article><Printer size={21}/><h4>带到真纸上</h4><p>保存作品、导出备份，或打印实际大小纸样。屏幕上的想法，也可以亲手试试。</p></article></div>
          <div className="guide-next-step"><div><strong>看完了？下一刀交给你。</strong><p>跟着六步引导，完成一次折剪与回看。</p></div><button className="primary-button" onClick={onTour}>跟着做一遍 <ArrowRight size={16}/></button></div>
        </>}
      </section>
      <section id={`${id}-practice-panel`} role="tabpanel" aria-labelledby={`${id}-practice-tab`} hidden={section !== 'practice'} tabIndex={0} className="guide-panel">{children}</section>
      <section id={`${id}-team-panel`} role="tabpanel" aria-labelledby={`${id}-team-tab`} hidden={section !== 'team'} tabIndex={0} className="guide-panel">
        <div className="guide-about-heading"><span className="guide-kicker">五个人，一起把工坊做好</span><h3>各有一份专注，<br/>也一起照顾整张纸。</h3><p>从一个想法，到一次顺手的操作，<br/>我们按这五个方向分工，把每一处细节接起来。</p></div>
        <div className="guide-team-list">{WORKSHOP_TEAM.map(person => <article key={person.number}><span className="team-number">{person.number}</span><div><h4>{person.role}</h4><strong>{person.focus}</strong><p>{person.duties}</p></div></article>)}</div>
        <p className="guide-team-note">工坊会继续生长。接下来，我们也会在这里讲讲每位成员的故事。</p>
      </section>
    </div>
  </Dialog>;
}
