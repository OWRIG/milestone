import '@lark-base-open/js-sdk/dist/style/dashboard.css';
import './App.scss';
import './locales/i18n';
import { useState, useEffect } from 'react';
import TimelineDashboard from './components/Timeline';
import { ContainerSize, DashboardMode } from './components/Timeline/types';

export default function App() {
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // 监听容器尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setContainerSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 主题适配
  useEffect(() => {
    const updateTheme = () => {
      // 检测 Lark Base 主题
      const isDark = document.body.classList.contains('dark') || 
                    document.documentElement.getAttribute('theme-mode') === 'dark';
      
      document.documentElement.setAttribute('theme-mode', isDark ? 'dark' : 'light');
    };

    updateTheme();
    
    // 监听主题变化
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['theme-mode'] 
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="timeline-app">
      <TimelineDashboard 
        containerSize={containerSize}
        mode={DashboardMode.Config}
      />
    </div>
  );
}