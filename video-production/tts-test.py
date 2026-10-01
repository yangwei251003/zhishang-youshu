from pathlib import Path
import sys, asyncio
sys.path.insert(0,str(Path(__file__).parent/'pydeps'))
import edge_tts
async def main():
    await edge_tts.Communicate('一张纸，折几次，剪一刀。你猜，展开以后，会是什么样？', 'zh-CN-XiaoxiaoNeural', rate='-8%', pitch='-2Hz').save(str(Path(__file__).parent/'tts-test.mp3'))
asyncio.run(main())
