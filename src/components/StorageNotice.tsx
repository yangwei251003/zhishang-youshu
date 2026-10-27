import { useEffect, useState } from 'react';
import { isStorageUnavailable, probePreferences, subscribeStorage } from '../io/storage-health';
export default function StorageNotice({onBackup}: {onBackup: () => void}) {
  const [unavailable, setUnavailable] = useState(isStorageUnavailable);
  useEffect(() => { const off=subscribeStorage(() => setUnavailable(isStorageUnavailable())); probePreferences(); return off; }, []);
  if (!unavailable) return null;
  return <div role="alert" className="storage-notice" style={{background:'var(--zs-bg-sunken)',color:'var(--zs-warn)',padding:'10px 16px',borderBottom:'1px solid var(--zs-line-strong)',fontSize:14}}>本机保存不可用，请导出备份。当前会话仍可创作；关闭页面后可能丢失。 <button className="text-action" onClick={onBackup}>导出项目备份</button></div>;
}
