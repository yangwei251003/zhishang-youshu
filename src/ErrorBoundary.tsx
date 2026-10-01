import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main style={{ maxWidth: 620, margin: '12vh auto', padding: 32, color: '#302821', fontFamily: 'Microsoft YaHei, sans-serif' }}><h1>工坊暂时遇到问题</h1><p>已保存的本机作品不会被清除。请重新打开页面；若问题持续，请保留出错前的项目文件以便检查。</p><button onClick={() => location.reload()}>重新打开工坊</button></main>;
    return this.props.children;
  }
}
