// react-d3-tree: 누락된 prop 보강
import "react";

declare module "react-d3-tree" {
  interface ForeignObjectProps {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    style?: React.CSSProperties;
  }

  // v1 문서/예제에 존재하지만 일부 타입 배포본에 누락된 prop들 보강
  interface TreeProps {
    /** SVG 내 HTML 렌더 허용 */
    allowForeignObjects?: boolean;
    /** foreignObject wrapper props */
    foreignObjectProps?: ForeignObjectProps;

    /** 스타일 오버라이드 */
    styles?: {
      links?: React.CSSProperties;
      nodes?: React.CSSProperties;
      // 필요 시 확장 가능
    };
  }
}
