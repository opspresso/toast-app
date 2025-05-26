# Toast 앱 드래그 앤 드롭 기능

이 문서는 Toast 앱의 설정 모드에서 버튼을 드래그 앤 드롭으로 재배열하는 기능에 대한 상세한 기술 사양과 구현 가이드를 제공합니다.

## 목차

- [기능 개요](#기능-개요)
- [사용자 경험](#사용자-경험)
- [기술 요구사항](#기술-요구사항)
- [구현 사양](#구현-사양)
- [UI/UX 가이드라인](#uiux-가이드라인)
- [접근성 고려사항](#접근성-고려사항)
- [성능 고려사항](#성능-고려사항)
- [테스트 시나리오](#테스트-시나리오)

## 기능 개요

### 목적
사용자가 Toast 창의 설정 모드에서 버튼을 직관적으로 드래그하여 원하는 위치로 재배열할 수 있도록 하는 기능입니다.

### 핵심 기능
- 설정 모드에서 버튼 드래그 앤 드롭 지원
- 실시간 위치 미리보기
- 자동 위치 조정 및 애니메이션
- 즉시 저장 및 적용

### 지원 범위
- **그리드 레이아웃**: 4x4 또는 5x3 그리드에서 드래그 앤 드롭
- **목록 레이아웃**: 세로 목록에서 드래그 앤 드롭
- **페이지 내 재배열**: 같은 페이지 내에서만 버튼 이동 가능
- **빈 슬롯 지원**: 빈 공간으로 버튼 이동 가능

## 사용자 경험

### 기본 워크플로우

1. **설정 모드 진입**
   ```
   사용자 액션: 콤마(,) 키 또는 설정 아이콘(⚙️) 클릭
   시스템 응답: 버튼들이 편집 가능한 상태로 변경, 드래그 커서 표시
   ```

2. **드래그 시작**
   ```
   사용자 액션: 버튼 위에서 마우스 왼쪽 버튼 누르고 드래그 시작
   시스템 응답:
   - 드래그 중인 버튼이 반투명하게 변경
   - 드래그 프리뷰 표시
   - 다른 버튼들이 약간 어두워짐
   ```

3. **드래그 중**
   ```
   사용자 액션: 마우스를 다른 위치로 이동
   시스템 응답:
   - 드롭 가능한 위치에 드롭 존 하이라이트 표시
   - 다른 버튼들이 자동으로 위치 조정 미리보기
   - 드래그 프리뷰가 마우스 커서를 따라 이동
   ```

4. **드롭 완료**
   ```
   사용자 액션: 원하는 위치에서 마우스 버튼 놓기
   시스템 응답:
   - 버튼이 새 위치로 애니메이션과 함께 이동
   - 다른 버튼들이 새로운 배치로 부드럽게 재정렬
   - 변경사항이 즉시 저장됨
   ```

### 시각적 피드백

#### 드래그 상태 표시
- **드래그 중인 버튼**: 50% 투명도, 약간 확대 (scale: 1.05)
- **드래그 프리뷰**: 원본 버튼의 복사본, 마우스 커서 따라 이동
- **다른 버튼들**: 70% 투명도로 배경화

#### 드롭 존 표시
- **유효한 드롭 존**: 연한 파란색 테두리 (2px solid #007AFF)
- **무효한 드롭 존**: 연한 빨간색 테두리 (2px solid #FF3B30)
- **현재 호버 위치**: 배경색 변경 (rgba(0, 122, 255, 0.1))

#### 애니메이션
- **위치 변경**: 300ms ease-in-out 트랜지션
- **크기 변경**: 200ms ease-out 트랜지션
- **투명도 변경**: 150ms linear 트랜지션

## 기술 요구사항

### 프론트엔드 요구사항

#### HTML 구조
```html
<div class="button-grid" data-drag-container="true">
  <div class="button-slot" data-position="0">
    <div class="button" draggable="true" data-button-id="btn-1">
      <!-- 버튼 내용 -->
    </div>
  </div>
  <div class="button-slot" data-position="1">
    <!-- 빈 슬롯 또는 다른 버튼 -->
  </div>
  <!-- 추가 슬롯들... -->
</div>
```

#### CSS 클래스
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

.button-slot.drop-zone-invalid {
  border: 2px solid #FF3B30;
  background-color: rgba(255, 59, 48, 0.1);
}

.button.dragging {
  opacity: 0.5;
  transform: scale(1.05);
  z-index: 1000;
}

.button.drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 1001;
  transform: rotate(5deg);
}

.button-grid.drag-active .button:not(.dragging) {
  opacity: 0.7;
}
```

#### JavaScript 이벤트 핸들링
```javascript
// 드래그 시작
function handleDragStart(event) {
  const button = event.target.closest('.button');
  const buttonId = button.dataset.buttonId;

  // 드래그 데이터 설정
  event.dataTransfer.setData('text/plain', buttonId);
  event.dataTransfer.effectAllowed = 'move';

  // 시각적 피드백 적용
  button.classList.add('dragging');
  button.parentElement.parentElement.classList.add('drag-active');

  // 드래그 프리뷰 생성
  createDragPreview(button, event);
}

// 드롭 처리
function handleDrop(event) {
  event.preventDefault();

  const buttonId = event.dataTransfer.getData('text/plain');
  const targetSlot = event.target.closest('.button-slot');
  const targetPosition = parseInt(targetSlot.dataset.position);

  // 버튼 위치 업데이트
  updateButtonPosition(buttonId, targetPosition);

  // 시각적 피드백 제거
  cleanupDragState();
}
```

### 백엔드 요구사항

#### 데이터 구조 업데이트
```javascript
// 페이지 내 버튼 순서 관리
const pageStructure = {
  name: "Page 1",
  shortcut: "1",
  buttons: [
    {
      id: "btn-1",
      name: "Files",
      shortcut: "Q",
      icon: "📁",
      action: "open",
      url: "/Users/username/Documents",
      position: 0  // 새로 추가: 버튼 위치
    },
    {
      id: "btn-2",
      name: "Browser",
      shortcut: "W",
      icon: "🌐",
      action: "open",
      url: "https://google.com",
      position: 1
    }
    // ... 추가 버튼들
  ]
};
```

#### IPC 통신
```javascript
// 렌더러에서 메인으로 위치 변경 요청
ipcRenderer.invoke('update-button-position', {
  pageIndex: 0,
  buttonId: 'btn-1',
  newPosition: 3,
  oldPosition: 0
});

// 메인 프로세스에서 처리
ipcMain.handle('update-button-position', async (event, data) => {
  const { pageIndex, buttonId, newPosition, oldPosition } = data;

  // 구성 업데이트
  const config = configStore.get();
  const page = config.pages[pageIndex];

  // 버튼 위치 재정렬
  const button = page.buttons.find(btn => btn.id === buttonId);
  if (button) {
    // 기존 위치에서 제거
    page.buttons = page.buttons.filter(btn => btn.id !== buttonId);

    // 새 위치에 삽입
    page.buttons.splice(newPosition, 0, button);

    // 모든 버튼의 position 속성 업데이트
    page.buttons.forEach((btn, index) => {
      btn.position = index;
    });

    // 구성 저장
    configStore.set('pages', config.pages);

    return { success: true };
  }

  return { success: false, error: 'Button not found' };
});
```

## 구현 사양

### 단계별 구현 계획

#### Phase 1: 기본 드래그 앤 드롭
- [ ] HTML5 Drag and Drop API 구현
- [ ] 기본 드래그 시작/종료 이벤트 처리
- [ ] 버튼 위치 데이터 구조 설계
- [ ] IPC 통신으로 위치 변경 저장

#### Phase 2: 시각적 피드백
- [ ] 드래그 중 시각적 상태 변경
- [ ] 드롭 존 하이라이트 표시
- [ ] 드래그 프리뷰 구현
- [ ] 부드러운 애니메이션 추가

#### Phase 3: 고급 기능
- [ ] 자동 스크롤 (긴 목록에서)
- [ ] 키보드 접근성 지원
- [ ] 터치 디바이스 지원 (향후)
- [ ] 실행 취소/다시 실행 기능

#### Phase 4: 최적화 및 테스트
- [ ] 성능 최적화
- [ ] 크로스 브라우저 테스트
- [ ] 접근성 테스트
- [ ] 사용자 테스트 및 피드백 반영

### 파일 구조
```
src/renderer/pages/toast/
├── index.html
├── index.js
├── styles.css
├── drag-drop.js          # 새로 추가: 드래그 앤 드롭 로직
└── animations.css        # 새로 추가: 애니메이션 스타일

src/main/
├── config.js            # 수정: 버튼 위치 관리 로직 추가
└── ipc.js              # 수정: 위치 변경 IPC 핸들러 추가
```

## UI/UX 가이드라인

### 드래그 가능 요소 표시
- **설정 모드 진입 시**: 모든 버튼에 미세한 그림자 효과 추가
- **호버 시**: 커서가 grab 모양으로 변경
- **드래그 시작 시**: 커서가 grabbing 모양으로 변경

### 드롭 존 가이드라인
- **유효한 드롭 존**: 연한 파란색 테두리와 배경
- **무효한 드롭 존**: 연한 빨간색 테두리 (현재는 모든 슬롯이 유효)
- **현재 호버 위치**: 배경색 변경으로 명확한 피드백

### 애니메이션 가이드라인
- **드래그 시작**: 200ms 내에 시각적 변화 완료
- **위치 변경**: 300ms ease-in-out으로 부드러운 이동
- **드롭 완료**: 150ms 내에 최종 상태로 복원

### 오류 처리
- **드래그 실패**: 원래 위치로 부드럽게 되돌아가기
- **네트워크 오류**: 로컬에서 변경 후 백그라운드에서 재시도
- **충돌 감지**: 다른 기기에서 변경 시 최신 상태로 동기화

## 접근성 고려사항

### 키보드 네비게이션
```javascript
// 키보드로 버튼 이동
function handleKeyboardMove(event) {
  if (!isEditMode) return;

  const focusedButton = document.activeElement.closest('.button');
  if (!focusedButton) return;

  switch (event.key) {
    case 'ArrowLeft':
      moveButtonLeft(focusedButton);
      break;
    case 'ArrowRight':
      moveButtonRight(focusedButton);
      break;
    case 'ArrowUp':
      moveButtonUp(focusedButton);
      break;
    case 'ArrowDown':
      moveButtonDown(focusedButton);
      break;
    case ' ':
    case 'Enter':
      toggleButtonSelection(focusedButton);
      break;
  }
}
```

### 스크린 리더 지원
```html
<div class="button"
     draggable="true"
     role="button"
     tabindex="0"
     aria-label="Files button, position 1 of 12, draggable"
     aria-describedby="drag-instructions">
  <!-- 버튼 내용 -->
</div>

<div id="drag-instructions" class="sr-only">
  Use arrow keys to move this button, or drag with mouse
</div>
```

### ARIA 라이브 리전
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <span id="drag-status"></span>
</div>
```

```javascript
// 드래그 상태 알림
function announceDragStatus(message) {
  document.getElementById('drag-status').textContent = message;
}

// 사용 예시
announceDragStatus('Files button moved to position 3');
```

## 성능 고려사항

### 최적화 전략

#### DOM 조작 최소화
```javascript
// 배치 업데이트로 리플로우 최소화
function updateButtonPositions(changes) {
  const fragment = document.createDocumentFragment();

  changes.forEach(change => {
    const button = document.querySelector(`[data-button-id="${change.id}"]`);
    const newSlot = document.querySelector(`[data-position="${change.newPosition}"]`);
    fragment.appendChild(button);
  });

  // 한 번에 DOM 업데이트
  requestAnimationFrame(() => {
    changes.forEach(change => {
      const button = fragment.querySelector(`[data-button-id="${change.id}"]`);
      const newSlot = document.querySelector(`[data-position="${change.newPosition}"]`);
      newSlot.appendChild(button);
    });
  });
}
```

#### 이벤트 위임
```javascript
// 개별 버튼에 이벤트 리스너 대신 컨테이너에 위임
document.querySelector('.button-grid').addEventListener('dragstart', handleDragStart);
document.querySelector('.button-grid').addEventListener('dragover', handleDragOver);
document.querySelector('.button-grid').addEventListener('drop', handleDrop);
```

#### 메모리 관리
```javascript
// 드래그 완료 후 임시 요소 정리
function cleanupDragState() {
  // 드래그 프리뷰 제거
  const preview = document.querySelector('.drag-preview');
  if (preview) {
    preview.remove();
  }

  // 클래스 정리
  document.querySelectorAll('.dragging, .drag-active, .drop-zone-valid')
    .forEach(el => {
      el.classList.remove('dragging', 'drag-active', 'drop-zone-valid');
    });
}
```

## 테스트 시나리오

### 기능 테스트

#### 기본 드래그 앤 드롭
1. **시나리오**: 첫 번째 버튼을 세 번째 위치로 이동
   - **준비**: 설정 모드 진입, 4개 버튼이 있는 페이지
   - **실행**: 첫 번째 버튼을 드래그하여 세 번째 슬롯에 드롭
   - **예상 결과**: 버튼이 세 번째 위치로 이동, 다른 버튼들이 자동 재정렬

2. **시나리오**: 빈 슬롯으로 버튼 이동
   - **준비**: 설정 모드 진입, 일부 빈 슬롯이 있는 페이지
   - **실행**: 버튼을 빈 슬롯으로 드래그
   - **예상 결과**: 버튼이 빈 슬롯으로 이동, 원래 위치가 빈 슬롯이 됨

#### 시각적 피드백
1. **시나리오**: 드래그 중 시각적 변화 확인
   - **실행**: 버튼 드래그 시작
   - **예상 결과**: 드래그 중인 버튼 반투명, 다른 버튼들 어두워짐

2. **시나리오**: 드롭 존 하이라이트 확인
   - **실행**: 버튼을 다른 슬롯 위로 드래그
   - **예상 결과**: 해당 슬롯에 파란색 테두리 표시

#### 오류 처리
1. **시나리오**: 드래그 취소
   - **실행**: 드래그 시작 후 ESC 키 누르기
   - **예상 결과**: 버튼이 원래 위치로 복원

2. **시나리오**: 유효하지 않은 드롭
   - **실행**: 버튼을 그리드 외부로 드래그
   - **예상 결과**: 버튼이 원래 위치로 복원

### 성능 테스트

#### 대량 버튼 처리
1. **시나리오**: 15개 버튼이 모두 채워진 페이지에서 드래그
   - **측정 항목**: 드래그 시작 시간, 애니메이션 프레임 레이트
   - **기준**: 60fps 유지, 200ms 이내 응답

#### 메모리 사용량
1. **시나리오**: 연속적인 드래그 앤 드롭 작업
   - **측정 항목**: 메모리 사용량 증가, 가비지 컬렉션 빈도
   - **기준**: 메모리 누수 없음, 안정적인 메모리 사용

### 접근성 테스트

#### 키보드 네비게이션
1. **시나리오**: 키보드만으로 버튼 이동
   - **실행**: Tab으로 버튼 포커스, 화살표 키로 이동
   - **예상 결과**: 모든 기능이 키보드로 접근 가능

#### 스크린 리더
1. **시나리오**: NVDA/JAWS로 드래그 앤 드롭 테스트
   - **실행**: 스크린 리더로 버튼 이동 과정 확인
   - **예상 결과**: 모든 상태 변화가 음성으로 안내됨

이 문서는 드래그 앤 드롭 기능의 완전한 구현을 위한 가이드라인을 제공합니다. 실제 구현 시에는 단계별로 진행하며 각 단계에서 충분한 테스트를 거쳐야 합니다.
