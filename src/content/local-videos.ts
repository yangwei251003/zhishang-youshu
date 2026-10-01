import type { InspirationCategory } from './videos';

/** Genuine public tutorial footage, kept locally for offline playback. */
export const LOCAL_VIDEOS: Record<InspirationCategory, { src: string; title: string; author: string; sourceUrl: string; excerpt: string }> = {
  snowflake: { src: '/videos/snowflake-local.mp4', title: '雪花剪纸 · 折、剪、展开', author: '妍琦剪纸', sourceUrl: 'https://www.bilibili.com/video/BV1QV4y1w7W8/', excerpt: '原片 00:00–01:36，真实操作全流程短示范；六角折法供真纸观察。' },
  flower: { src: '/videos/flower-local.mp4', title: '莲花团花 · 细部修剪与展开', author: '慧子手工_非遗文创（杨慧子）', sourceUrl: 'https://www.bilibili.com/video/BV1q84y1q7CV/', excerpt: '原片 08:00–09:05 摘录，观察细部修剪与逐层展开；完整步骤见来源。' },
  happiness: { src: '/videos/happiness-local.mp4', title: '双喜剪纸 · 留住连接再展开', author: '慧子手工_非遗文创（杨慧子）', sourceUrl: 'https://www.bilibili.com/video/BV1U24y1k7hX/', excerpt: '原片 04:15–05:25 摘录，观察最后的剪口、连接与双喜展开。' },
  animal: { src: '/videos/animal-local.mp4', title: '蝴蝶剪纸 · 翅膀细节与展开', author: '慧子手工_非遗文创（杨慧子）', sourceUrl: 'https://www.bilibili.com/video/BV1tV4y1P7ns/', excerpt: '原片 09:15–10:20 摘录，观察翅膀细节与对称展开；完整步骤见来源。' },
  border: { src: '/videos/border-local.mp4', title: '二方连续 · 金鱼花边', author: '云高剪纸', sourceUrl: 'https://www.bilibili.com/video/BV183411N7B3/', excerpt: '原片 00:00–01:52，真实折画剪展短示范；留意相邻金鱼的连接。' },
};
