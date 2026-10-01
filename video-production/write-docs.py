from pathlib import Path
import json
R=Path(__file__).parent;T=json.loads((R/'timeline.json').read_text(encoding='utf8'))
styles=['单一纸花揭示与中文压印','真实全页轻透视到平视','引导卡转到预测面板','鼠标拖拽真实录屏','四个真实展开状态','结构结果转到修改前后对比','参数前后状态与局部推进','真实灵感页纵向浏览','作品库、导出与打印页','指南入口转到静止邀请']
rows=['# 工坊介绍短片分镜','', '|章节|起止（秒）|帧范围|画面动作|口播|','|---|---|---|---|---|']
for i,s in enumerate(T['scenes']):
 rows.append(f'|{i+1}. {s["title"]}|{s["from"]/30:.3f}–{(s["from"]+s["frames"])/30:.3f}|{s["from"]}–{s["from"]+s["frames"]-1}|{styles[i]}|{"".join(s["lines"])}|')
(R.parent/'docs/v5-video/storyboard.md').write_text('\n'.join(rows)+'\n',encoding='utf8')
(R.parent/'docs/v5-video/script.md').write_text('# 纸上有数 · 97.7秒口播稿\n\n'+'\n\n'.join(''.join(s['lines']) for s in T['scenes'])+'\n',encoding='utf8')
