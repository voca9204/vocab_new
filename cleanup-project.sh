#!/bin/bash

echo "🧹 Vocabulary V2 프로젝트 정리 시작..."

# 1. 테스트 및 디버그 파일 삭제
echo "📁 테스트 파일 삭제 중..."
rm -f test-*.js debug-*.js verify-*.js add-*.js analyze-*.js check-*.js update-*.js
rm -f *.html
rm -f pdf-extraction-page.png

# 2. 로그 파일 삭제
echo "📄 로그 파일 삭제 중..."
rm -f *.log

# 3. 중복 설정 파일 삭제 (TypeScript 버전 유지)
echo "⚙️ 중복 설정 파일 정리 중..."
if [ -f "tailwind.config.ts" ] && [ -f "tailwind.config.js" ]; then
    rm -f tailwind.config.js
    echo "  - tailwind.config.js 삭제 (ts 버전 유지)"
fi

# 4. 빌드 아티팩트 삭제
echo "🏗️ 빌드 아티팩트 삭제 중..."
rm -rf out/
rm -rf functions/out/

# 5. 빈 디렉토리 삭제
echo "📂 빈 디렉토리 정리 중..."
rmdir src/app/api/clear-vocabulary 2>/dev/null
rmdir src/app/api/update-source 2>/dev/null
rmdir src/app/api/extract-vocabulary 2>/dev/null

# 6. 마이그레이션 스크립트 아카이브 (선택사항)
echo "📦 마이그레이션 스크립트 확인..."
if [ -d "src/lib/vocabulary-v2" ]; then
    echo "  ⚠️  마이그레이션 스크립트가 있습니다. 수동으로 검토하세요."
    ls src/lib/vocabulary-v2/*.js 2>/dev/null | head -5
fi

# 7. console.log 개수 확인
echo "🔍 console.log 사용 확인..."
CONSOLE_COUNT=$(grep -r "console\.log" src/ --include="*.tsx" --include="*.ts" | wc -l)
echo "  - 총 $CONSOLE_COUNT 개의 console.log 발견"

# 8. TypeScript 오류 확인
echo "🔧 TypeScript 컴파일 확인..."
npm run type-check 2>&1 | grep -E "error TS" | head -5

echo "✅ 정리 완료!"
echo ""
echo "🔔 추가로 검토가 필요한 항목:"
echo "  1. /src/app/api/debug-env/ - 보안 위험 (환경변수 노출)"
echo "  2. /src/app/test/ - 테스트 페이지들"
echo "  3. console.log 제거 - production 빌드 전 필수"
echo "  4. 중복 서비스 파일 통합 필요"