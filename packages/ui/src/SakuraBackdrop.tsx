import { useEffect, useMemo, useState, type CSSProperties } from "react";

const SAKURA_THEME_CLASS = "theme-sakura";
const PETAL_COUNT = 22;

function buildPetalStyle(index: number, random: () => number): CSSProperties {
  const size = 8 + Math.round(random() * 8);
  return {
    "--sakura-x": `${(index / PETAL_COUNT) * 100 + random() * 6 - 3}%`,
    "--sakura-size": `${size}px`,
    "--sakura-opacity": (0.45 + random() * 0.3).toFixed(2),
    "--sakura-duration": `${(9 + random() * 7).toFixed(2)}s`,
    // 负延迟让花瓣在挂载瞬间就已铺满整屏,避免开场空屏再慢慢填满。
    "--sakura-delay": `${(-random() * 16).toFixed(2)}s`,
    "--sakura-sway": `${(14 + random() * 26).toFixed(1)}px`,
    "--sakura-sway-duration": `${(2.4 + random() * 1.8).toFixed(2)}s`,
  } as CSSProperties;
}

/**
 * 对话区樱花飘落背景层。
 *
 * 通过 MutationObserver 监听 `<html>` 的 theme-sakura class 感知主题,
 * 不与任何 store 耦合;非樱花主题时不渲染任何 DOM。
 * 动画本体在 styles.css 中定义,只使用 transform/opacity,合成器执行。
 * prefers-reduced-motion 下由 CSS 直接隐藏本层。
 */
export function SakuraBackdrop() {
  const [active, setActive] = useState(() =>
    document.documentElement.classList.contains(SAKURA_THEME_CLASS),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setActive(root.classList.contains(SAKURA_THEME_CLASS));
    });
    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const petals = useMemo(() => {
    // 确定性伪随机:同一会话内花瓣分布稳定,避免热重载/重渲染时跳变。
    let seed = 20260922;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: PETAL_COUNT }, (_, i) => buildPetalStyle(i, random));
  }, []);

  if (!active) {
    return null;
  }

  return (
    <div aria-hidden="true" className="sakura-petal-layer">
      {petals.map((style, index) => (
        <span key={index} className="sakura-petal" style={style}>
          <span className="sakura-petal-inner" />
        </span>
      ))}
    </div>
  );
}
