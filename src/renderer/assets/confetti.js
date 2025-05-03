/**
 * 꽃가루 애니메이션 효과
 * Toast 앱 특별 효과
 */

// 컨테이너를 한 번만 생성하기 위한 변수
let confettiContainer = null;

// 애니메이션 진행 중인지 추적
let isAnimationActive = false;

// 꽃가루 색상 배열
const COLORS = ['red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange'];

// 꽃가루 크기 배열
const SIZES = ['small', 'medium', 'large'];

/**
 * 꽃가루 컨테이너 생성 및 초기화
 * @returns {HTMLElement} 꽃가루 컨테이너 요소
 */
function createConfettiContainer() {
  // 이미 있으면 재사용
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
    return confettiContainer;
  }

  // 새로 생성
  confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';
  document.body.appendChild(confettiContainer);

  return confettiContainer;
}

/**
 * 랜덤한 숫자 생성 (최소, 최대 사이)
 * @param {number} min 최소값
 * @param {number} max 최대값
 * @returns {number} 랜덤한 숫자
 */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 랜덤한 정수 생성 (최소, 최대 사이)
 * @param {number} min 최소값
 * @param {number} max 최대값
 * @returns {number} 랜덤한 정수
 */
function randomInt(min, max) {
  return Math.floor(random(min, max));
}

/**
 * 꽃가루 요소 생성
 * @param {HTMLElement} container 부모 컨테이너 요소
 */
function createConfetti(container) {
  // 꽃가루 요소 생성
  const confetti = document.createElement('div');
  confetti.className = 'confetti';

  // 랜덤한 속성 지정
  const size = SIZES[randomInt(0, SIZES.length)];
  const color = COLORS[randomInt(0, COLORS.length)];
  const isFlower = Math.random() > 0.5; // 50% 확률로 꽃잎 모양

  // 클래스 추가
  confetti.classList.add(`size-${size}`);
  confetti.classList.add(`color-${color}`);
  if (isFlower) {
    confetti.classList.add('petal');
  }

  // 랜덤한 위치와 속도 설정
  const left = random(0, 100); // 0-100% 화면 너비
  const initialDelay = random(0, 3); // 0-3초 초기 딜레이
  const fallDuration = random(3, 10); // 3-10초 낙하 시간

  // 스타일 지정
  confetti.style.left = `${left}%`;
  confetti.style.animationDelay = `${initialDelay}s`;
  confetti.style.animationDuration = `${fallDuration}s`;

  // 약간의 회전 추가
  const rotate = random(0, 360);
  const swing = random(-30, 30);
  confetti.style.transform = `rotate(${rotate}deg)`;
  confetti.style.transform += ` translateX(${swing}px)`;

  // 컨테이너에 추가
  container.appendChild(confetti);

  // 애니메이션 완료 후 제거
  setTimeout(() => {
    if (confetti.parentNode === container) {
      container.removeChild(confetti);
    }
  }, (initialDelay + fallDuration) * 1000);
}

/**
 * 꽃가루 애니메이션 시작
 * @param {Object} options 애니메이션 옵션
 * @param {number} options.duration 지속 시간 (초)
 * @param {number} options.density 밀도 (갯수)
 * @param {Function} options.onComplete 완료 콜백
 */
function startConfetti(options = {}) {
  // 이미 실행 중이면 무시
  if (isAnimationActive) return;

  // 옵션 기본값 설정
  const duration = options.duration || 5; // 기본 5초
  const density = options.density || 50; // 기본 밀도
  const onComplete = options.onComplete || (() => {});

  // 컨테이너 생성
  const container = createConfettiContainer();
  isAnimationActive = true;

  // 꽃가루 생성 간격
  const interval = 3000 / density; // 3초 동안 밀도에 맞게 생성
  let count = 0;

  // 주기적으로 꽃가루 생성
  const generator = setInterval(() => {
    count++;

    // 하나의 꽃가루 생성
    createConfetti(container);

    // 밀도에 도달하면 생성 중단
    if (count >= density) {
      clearInterval(generator);
    }
  }, interval);

  // 애니메이션 종료 후 정리
  setTimeout(() => {
    clearInterval(generator);

    // 모든 꽃가루가 떨어질 시간을 추가로 대기
    setTimeout(() => {
      // 컨테이너의 모든 꽃가루 제거
      container.innerHTML = '';
      isAnimationActive = false;

      // 완료 콜백 호출
      onComplete();
    }, 10000); // 10초 추가 대기 (가장 느린 꽃가루가 떨어질 시간)
  }, duration * 1000);
}

/**
 * 꽃가루 애니메이션 중지
 */
function stopConfetti() {
  if (confettiContainer) {
    confettiContainer.innerHTML = '';
  }
  isAnimationActive = false;
}

// 모듈 내보내기
window.confetti = {
  start: startConfetti,
  stop: stopConfetti
};

// 애니메이션 테스트 함수 (window 객체에 등록)
window.startConfettiAnimation = function(options) {
  startConfetti(options);
};
