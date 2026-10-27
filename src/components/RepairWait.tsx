import type { useRepairSearch } from '../hooks/useRepairSearch';
export default function RepairWait({search}: {search: ReturnType<typeof useRepairSearch>}) {
  if (!search.busy) return null;
  return <div className="repair-wait" role="status"><p>{search.slow ? '比较超过 5 秒，你仍可撤销、离开或改用简化比较。' : '正在为你比较方案…每个方案都检查完整剪切顺序。'}</p>{search.slow && <><button className="small-button" onClick={search.continueWaiting}>继续等待</button><button className="small-button" onClick={search.simplify}>只看当前刀简化比较</button><p className="microcopy">仅减少候选刀数，完整顺序和课程目标的检查不变。</p></>}<button className="text-action" onClick={search.cancel}>取消比较</button></div>;
}
