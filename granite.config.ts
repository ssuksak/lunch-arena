// Apps in Toss (AIT) WebView 미니앱 설정
// 작성: 2026-04-22
// Doc: https://developers-apps-in-toss.toss.im/tutorials/webview.html

import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에 등록한 앱 ID (영문 소문자/하이픈)
  appName: 'lunch-arena',

  brand: {
    // 콘솔 등록명과 동일해야 함
    displayName: '오늘급식',
    // 메인 컬러 (오렌지 — 배틀 아이콘 컬러와 통일)
    primaryColor: '#FF8C32',
    // 콘솔에 업로드한 앱 로고 URL (정사각형 600x600)
    icon: 'https://ssuksak.github.io/lunch-arena/icon_600.png',
  },

  // 정적 HTML 앱 (GitHub Pages 배포)
  // 로컬 개발 시: npm run dev → 토스 샌드박스 연결
  web: {
    host: '0.0.0.0',
    port: 5173,
    commands: {
      // 정적 사이트라 별도 빌드 없음. dev는 단순 http 서버
      dev: 'npx http-server -p 5173 -c-1',
      // AIT build가 outdir를 정리하므로 루트를 outdir로 두면 위험함
      build: 'mkdir -p dist && cp index.html privacy.html icon_600.png icon.png icon.svg thumbnail_1932x828.png dist/ && cp -r migrations dist/migrations',
    },
  },

  // 빌드 산출물 위치
  outdir: 'dist',

  // 미니앱 카테고리 (게임이 아니므로 partner)
  webViewProps: {
    type: 'partner',
  },

  // 권한 (위치 기반 학교 매칭, 필요 시만)
  permissions: [],
});
