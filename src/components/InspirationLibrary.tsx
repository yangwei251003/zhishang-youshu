import { useState } from 'react';
import { ArrowLeft, ArrowRight, Scissors } from 'lucide-react';
import { REAL_CUT_VIDEOS, VIDEO_CATEGORIES, type InspirationCategory } from '../content/videos';
import RealCutVideo, { VideoMotif } from './RealCutVideo';
import '../styles/media.css';

export interface InspirationLibraryProps { onTryLesson: (lessonId: string) => void; onClose?: () => void }

export default function InspirationLibrary({ onTryLesson, onClose }: InspirationLibraryProps) {
  const [category, setCategory] = useState<InspirationCategory | 'all'>('all');
  const visibleCategories = VIDEO_CATEGORIES.filter(item => category === 'all' || item.id === category);
  return <section className="inspiration-library" aria-labelledby="inspiration-title">
    {onClose && <button className="inspiration-back" type="button" onClick={onClose}><ArrowLeft size={16}/>回到我的工坊</button>}
    <header className="inspiration-hero">
      <div><p className="inspiration-kicker">纸上成真 / 10 段精选真人示范</p><h2 id="inspiration-title">剪纸灵感库<span>看一双手，懂一张纸。</span></h2><p className="inspiration-intro">从雪花的折痕，到蝴蝶的翅膀。跟着剪纸人看一遍，再回到屏幕上，试出自己的答案。</p><p className="inspiration-local-note">点开后才加载在线示范，不自动播放。每类备有一段本站视频，没有外网也能看、能练。</p></div>
      <div className="inspiration-hero-art"><VideoMotif category="flower"/><span>折 · 剪 · 展</span></div>
    </header>
    <nav className="inspiration-filters" aria-label="剪纸视频分类">
      <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>全部 <span>{REAL_CUT_VIDEOS.length}</span></button>
      {VIDEO_CATEGORIES.map(item => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.title}<span>{REAL_CUT_VIDEOS.filter(video => video.category === item.id).length}</span></button>)}
    </nav>
    <div className="inspiration-sections">{visibleCategories.map((item, index) => <section className="inspiration-category" key={item.id} aria-labelledby={`inspiration-${item.id}`}>
      <div className="inspiration-category-intro"><span className="inspiration-index">{String(VIDEO_CATEGORIES.indexOf(item) + 1).padStart(2, '0')}</span><div><h3 id={`inspiration-${item.id}`}>{item.title}<span>{item.caption}</span></h3><p>{item.description}</p></div></div>
      <div className="inspiration-video-grid">{REAL_CUT_VIDEOS.filter(video => video.category === item.id).map(video => <RealCutVideo key={video.id} video={video} heading="真人示范"/>)}</div>
      <div className="inspiration-try"><div><span><Scissors size={17}/>把灵感变成一刀</span><h4>{item.lessonTitle}</h4><p>{item.relation}</p></div><button className="primary-button" type="button" onClick={() => onTryLesson(item.lessonId)}>来屏幕上试一试<ArrowRight size={17}/></button></div>
      {index < visibleCategories.length - 1 && <div className="inspiration-divider" aria-hidden="true">✧</div>}
    </section>)}</div>
    <footer className="inspiration-footer">视频由原作者制作，在线优先使用 B 站播放器；每类另备一段本地示范或摘录，并注明作者、来源与原片区间。纸面示意和观察问题由本工坊制作。</footer>
  </section>;
}
