# Toast 앱 드래그 앤 드롭 기능 구현 가이드

이 문서는 Toast 앱 설정 모드에서 버튼 재배열을 위한 드래그 앤 드롭 기능의 구현 계획과 가이드입니다.

> **주의**: 이 기능은 아직 구현되지 않았으며, 향후 개발 예정입니다.

## 목차

- [기능 개요](#기능-개요)
  - [핵심 기능](#핵심-기능)
  - [지원 범위](#지원-범위)
- [사용 방법](#사용-방법)
- [기술 구현](#기술-구현)
  - [HTML 구조](#html-구조)
  - [CSS 스타일](#css-스타일)
  - [JavaScript 이벤트 처리](#javascript-이벤트-처리)
  - [데이터 구조](#데이터-구조)
  - [IPC 통신](#ipc-통신)
- [구현 단계](#구현-단계)
  - [Phase 1: 기본 기능](#phase-1-기본-기능)
  - [Phase 2: 시각적 피드백](#phase-2-시각적-피드백)
  - [Phase 3: 최적화](#phase-3-최적화)
- [파일 구조](#파일-구조)
- [핵심 구현 로직](#핵심-구현-로직)
  - [버튼 식별](#버튼-식별)
  - [위치 변경](#위치-변경)
  - [데이터 일관성](#데이터-일관성)
- [테스트 시나리오](#테스트-시나리오)
  - [기본 테스트](#기본-테스트)
  - [데이터 무결성 테스트](#데이터-무결성-테스트)
  - [성능 테스트](#성능-테스트)
- [주요 고려사항](#주요-고려사항)

## 기능 개요

### 핵심 기능
- 설정 모드에서 버튼 드래그 앤 드롭
- 실시간 위치 변경
- 단축키 자동 재할당 (qwertasdfgzxcvb 순서)
- 자동 저장

### 지원 범위
- 그리드 레이아웃 (4x4, 5x3)
- 목록 레이아웃
- 페이지 내 재배열만 지원
- 빈 슬롯 이동 가능

## 사용 방법

1. **설정 모드 진입**: 콤마(,) 키 또는 설정 아이콘 클릭
2. **버튼 드래그**: 버튼을 마우스로 드래그
3. **위치 변경**: 원하는 위치에 드롭
4. **단축키 재할당**: 새로운 위치에 따라 qwertasdfgzxcvb 순서로 자동 재할당
5. **자동 저장**: 변경사항 즉시 저장

## 기술 구현

### HTML 구조
```html
<div class="button-grid" data-drag-container="true">
  <div class="button-slot" data-position="0">
    <div class="button" draggable="true" data-button-index="0">
      <!-- 버튼 내용 -->
    </div>
  </div>
  <div class="button-slot" data-position="1">
    <!-- 빈 슬롯 또는 다른 버튼 -->
  </div>
</div>
```

### CSS 스타일
```css
.button-grid {
  position: relative;
  display: grid;
  gap: 8px;
}

.button-slot {
  position: relative;
  min-height: 80px;
  border-radius: 8px;
  transition: all 300ms ease-in-out;
}

.button-slot.drop-zone-valid {
  border: 2px solid #007AFF;
  background-color: rgba(0, 122, 255, 0.1);
}

.button.dragging {
  opacity: 0.5;
  transform: scale(1.05);
  z-index: 1000;
}

.button-grid.drag-active .button:not(.dragging) {
  opacity: 0.7;
}
```

### JavaScript 이벤트 처리
```javascript
// 드래그 시작
function handleDragStart(event) {
  const button = event.target.closest('.button');
  const buttonIndex = button.dataset.buttonIndex;

  event.dataTransfer.setData('text/plain', buttonIndex);
  event.dataTransfer.effectAllowed = 'move';

  button.classList.add('dragging');
  button.parentElement.parentElement.classList.add('drag-active');
}

// 드롭 처리
function handleDrop(event) {
  event.preventDefault();

  const buttonIndex = parseInt(event.dataTransfer.getData('text/plain'));
  const targetSlot = event.target.closest('.button-slot');
  const targetPosition = parseInt(targetSlot.dataset.position);

  updateButtonPosition(buttonIndex, targetPosition);
  cleanupDragState();
}
```

### 데이터 구조
```javascript
// 기존 Toast 앱 페이지 구조
const pageStructure = {
  name: "Page 1",
  shortcut: "1",
  buttons: [
    {
      name: "Files",
      shortcut: "Q",  // 첫 번째 위치 = Q
      icon: "📁",
      action: "open",
      url: "/Users/username/Documents"
    },
    {
      name: "Browser",
      shortcut: "W",  // 두 번째 위치 = W
      icon: "🌐",
      action: "open",
      url: "https://google.com"
    }
  ]
};

// 드래그 앤 드롭은 배열 순서로 위치 관리
// buttons[0] = 첫 번째 위치 (Q), buttons[1] = 두 번째 위치 (W)
// 위치 변경 시 단축키 자동 재할당: qwertasdfgzxcvb 순서
```

### IPC 통신
```javascript
// 위치 변경 요청
ipcRenderer.invoke('reorder-buttons', {
  pageIndex: 0,
  fromIndex: 0,
  toIndex: 2
});

// 메인 프로세스 처리
ipcMain.handle('reorder-buttons', async (event, data) => {
  const { pageIndex, fromIndex, toIndex } = data;

  try {
    const config = configStore.get();
    const page = config.pages[pageIndex];

    if (!page || !page.buttons) {
      return { success: false, error: 'Page not found' };
    }

    // 배열에서 버튼 이동
    const buttons = [...page.buttons];
    const [movedButton] = buttons.splice(fromIndex, 1);
    buttons.splice(toIndex, 0, movedButton);

    // 단축키 재할당 (qwertasdfgzxcvb 순서)
    const BUTTON_SHORTCUTS = ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B'];
    const buttonsWithReassignedShortcuts = buttons.map((button, index) => ({
      ...button,
      shortcut: BUTTON_SHORTCUTS[index] || button.shortcut
    }));

    // 업데이트된 배열 저장
    page.buttons = buttonsWithReassignedShortcuts;
    configStore.set('pages', config.pages);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## 구현 단계

> **현재 상태**: 미구현 - 아래는 향후 개발 계획입니다.

### Phase 1: 기본 기능 (계획)
- [ ] HTML5 Drag and Drop API 구현
- [ ] 기본 드래그/드롭 이벤트 처리
- [ ] 배열 순서 기반 위치 관리
- [ ] IPC 통신으로 저장

### Phase 2: 시각적 피드백 (계획)
- [ ] 드래그 상태 표시
- [ ] 드롭 존 하이라이트
- [ ] 애니메이션 추가

### Phase 3: 최적화 (계획)
- [ ] 성능 최적화
- [ ] 키보드 접근성
- [ ] 오류 처리

## 파일 구조
```
src/renderer/pages/toast/
├── drag-drop.js          # 드래그 앤 드롭 로직
└── animations.css        # 애니메이션 스타일

src/main/
├── config.js            # 기존 구성 관리
└── ipc.js              # 버튼 재정렬 핸들러 추가
```

## 핵심 구현 로직

### 버튼 식별
- 기존 스키마에 `id` 속성이 없으므로 배열 인덱스 사용
- `data-button-index` 속성으로 버튼 위치 추적

### 위치 변경
- 배열의 `splice()` 메서드로 버튼 순서 변경
- 위치 변경 후 단축키 자동 재할당 (qwertasdfgzxcvb 순서)
- 기존 구성 스키마 구조 유지

### 데이터 일관성
- 기존 버튼 속성 (`name`, `icon`, `action` 등) 보존
- `shortcut` 속성은 위치에 따라 자동 재할당 (qwertasdfgzxcvb 순서)
- 추가 속성 없이 배열 순서만으로 위치 관리

## 테스트 시나리오

### 기본 테스트
1. 첫 번째 버튼을 세 번째 위치로 드래그
2. 마지막 버튼을 첫 번째 위치로 드래그
3. 드래그 취소 (ESC 키)
4. 유효하지 않은 드롭 처리

### 데이터 무결성 테스트
1. 드래그 후 버튼 속성 보존 확인 (단축키 제외)
2. 드래그 후 단축키 자동 재할당 확인
3. 구성 파일 저장/로드 테스트
4. 페이지 전환 후 순서 및 단축키 유지 확인

### 성능 테스트
1. 15개 버튼 환경에서 드래그 테스트
2. 연속 드래그 작업 메모리 사용량 확인

## 주요 고려사항

- **기존 스키마 준수**: 새로운 속성 추가 없이 배열 순서로 위치 관리
- **데이터 일관성**: 기존 버튼 속성과 구조 보존 (단축키는 위치에 따라 자동 재할당)
- **단축키 일관성**: 드래그 앤 드롭 후에도 qwertasdfgzxcvb 순서 유지
- **성능**: DOM 조작 최소화, 이벤트 위임 사용
- **오류 처리**: 드래그 실패 시 원위치 복원
- **호환성**: 기존 구성 파일과 완전 호환
