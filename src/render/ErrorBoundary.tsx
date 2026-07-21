// 错误边界组件：捕获子组件渲染错误，显示降级 UI
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { theme } from './theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string; // 组件名，用于日志
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const name = this.props.name ?? 'Unknown';
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          padding: 8,
          margin: 4,
          border: `1px solid ${theme.colors.danger}`,
          borderRadius: theme.borderRadius,
          background: theme.colors.bgPanel,
          color: theme.colors.danger,
          fontSize: 11,
          fontFamily: theme.fontFamily,
        }}>
          ⚠ 组件出错
        </div>
      );
    }
    return this.props.children;
  }
}