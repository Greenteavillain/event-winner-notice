// ── 반짝이 층 (sparkles.js) ───────────────────────────────────────────────
// 유저 요청 "반짝이 더 많으면 좋을 것 같아" → 고양이 위·편지 문장 아래에 캔버스 한 장으로 반짝이를 잔뜩 깔아 둠.
//
// 쓰는 법 (엔진 index.html 에서):
//   Sparkles.init(container)   — 한 번. container 는 화면 전체(fixed inset:0)·pointer-events:none,
//                                층 순서는 고양이 무대(#stage) 위, 편지 문장(#letters) 아래.
//   Sparkles.frame({ beat, W, H, dt, night, textY })  — 매 프레임.
//        beat  = 음악 박(소수), W/H = 화면 CSS px, dt = 지난 프레임부터 초(알아서 0~0.05 로 자름),
//        night = 밤 배경 여부(없으면 beat>=203 으로 판단), textY = (선택) 그 장면 문장 높이(화면 비율, 없으면 .5)
//
// 음악과 맞추는 법 — 전부 박(beat) 기준:
//   · 박마다: 전체가 살짝 부풀며 반짝(왼→오로 쓸고 지나가는 물결) + 가장자리에 작은 반짝이 몇 개 톡톡
//   · 마디 첫박(1,5,9…197 / 202,206…)마다: 모서리·가장자리에서 반짝이 촤르르 분사 (장면 시작 박엔 네 모서리 전부 + 비눗방울)
//   · 평소: 작은 반짝이·글리터가 천천히 떠오르며 깜빡, 가끔 프루티거 에어로 비눗방울이 양옆에서 둥실
//   · 296박(사진 피날레)부터: 피날레가 자기 불꽃을 쏘니까 분사·톡톡은 끄고 은은하게만
//
// 가리지 않기: 대부분 작게(글리터 2~6px, 별 5~12px), 큰 별은 화면 가장자리에서만 커짐.
//   문장 줄(가로 띠)과 화면 한가운데는 덜 생기고 더 투명하게 → 고양이 얼굴·글자가 반짝이에 묻히지 않음.
//
// 성능(중급 폰 기준): 입자 350개 상한, 타입배열 풀을 재사용해 매 프레임 새 객체 0개,
//   빛번짐은 색·크기마다 미리 구운 스프라이트를 drawImage 만 함.
//   (입자마다 shadowBlur 를 켜면 가우시안 블러를 매번 새로 계산해서 폰에서 입자 100개만 넘어도 프레임이 반토막 남)
// 되감기: 슬라이드바로 뒤로 가거나 2박 넘게 건너뛰면 입자를 싹 비우고 그 박에 맞게 다시 깔아 둠
//   (지난 분사를 몰아서 터뜨리면 화면이 한 번에 하얗게 뒤덮여서, 건너뛴 박의 분사는 버림)
window.Sparkles = (() => {
  const MAX = 350;
  const STAR = 'M0-50C4-14 14-4 50 0 14 4 4 14 0 50-4 14-14 4-50 0-14-4-4-14 0-50Z';   // 페이지에서 쓰는 네 갈래 별과 같은 모양
  const DAY = ['#ff8fd0', '#ffcf3d', '#6fcfff', '#b394ff', '#7fe0b8'];     // 흰 바탕: 채도 있는 파스텔 (핑크·금·아쿠아·라일락·민트)
  const NIGHT = ['#ffffff', '#ffd95e', '#bfe6ff', '#fff3c4', '#ffffff'];   // 밤: 흰색·금색·옅은 하늘색 (흰색 비중 2배)
  const NC = 5;                                                              // 팔레트 색 수(낮·밤 같게 맞춰 스프라이트 번호 계산 단순화)
  const LV = [16, 32, 64, 128];                                              // 스프라이트 해상도 단계(밉맵): 128px 를 6px 로 줄이면 계단·지글거림
  const STAR_K = 0, DOT_K = 1, BUB_K = 2;
  const BODY = [.36, .16, .44];            // 스프라이트 한 변 대비 몸통 반지름(별=꼭지까지, 글리터·방울=원). 나머지는 빛번짐 여백
  const AMB = 0, BURST = 1, POP = 2, BUBBLE = 3;   // 역할: 떠다니는 것 / 마디 분사 / 박마다 톡 / 비눗방울
  // 폰 세로 한 화면 기준 개수. 떠다니는 160 + 분사·톡톡 → 실측 평균 ≈190·최대 ≈250개 (상한 350 안쪽)
  // 120 으로 찍어 보니 '뿌려 놓은' 정도라 '더 많이' 요청엔 모자라서 올림. 180 까지 찍어 봐도 고양이·글자는 안 가렸음 —
  // 더 원하면 올려도 됨: 대가는 개수에 거의 비례하는 그리기 비용(+20개 ≈ +10%)과, 가로 큰 화면에서 350 상한에 먼저 닿아 분사가 잘리는 것
  const AMB_N = 160, BUB_N = 3, BURST_N = 20, BIG_N = 24;

  // 음악 구조 (index.html·beats.js 와 같은 값)
  const SCENE_STARTS = [1, 17, 33, 49, 65, 81, 97, 113, 129, 145, 161, 177, 202, 218, 234, 250, 266, 282];   // 1 = 첫 마디 첫박(인트로 빛이 터지는 순간)
  const PHOTO = 296, NIGHT_AT = 203;
  const isDown = b => (b >= 1 && b <= 197 && (b - 1) % 4 === 0) || (b >= 202 && (b - 202) % 4 === 0);
  const barNo = b => b <= 197 ? (b - 1) / 4 : 50 + (b - 202) / 4;

  // ── 입자 풀: 타입배열(구조체 배열 대신) → 추가·삭제해도 가비지 0, 살아 있는 건 항상 0..n-1 에 빽빽이 ──
  const X = new Float32Array(MAX), Y = new Float32Array(MAX), VX = new Float32Array(MAX), VY = new Float32Array(MAX);
  const AGE = new Float32Array(MAX), LIFE = new Float32Array(MAX), SIZE = new Float32Array(MAX);
  const ROT = new Float32Array(MAX), VR = new Float32Array(MAX), PH = new Float32Array(MAX), TW = new Float32Array(MAX);
  const DRAG = new Float32Array(MAX), GRAV = new Float32Array(MAX);
  const KIND = new Uint8Array(MAX), COL = new Uint8Array(MAX), SET = new Uint8Array(MAX), ROLE = new Uint8Array(MAX);
  let n = 0, nAmb = 0, nBub = 0;

  let box = null, cv = null, ctx = null, SPR = null;
  let cw = 0, ch = 0, dpr = 1;                     // 현재 캔버스 크기(CSS px)·배율
  let W = 390, H = 844, u = 1, vmin = 390, countK = 1, textY = .5;
  let lastBeat = null, lastInt = 0;

  // ── 스프라이트 굽기 (init 때 한 번, 공연 도중엔 절대 안 만듦) ──
  const hexRgb = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const WHITE = [255, 255, 255];
  const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function makeStar(S, c, night, path) {
    const s = document.createElement('canvas'); s.width = s.height = S;
    const g = s.getContext('2d'), R = S / 2;
    g.translate(R, R);
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, R);   // 둥근 후광 = 흰 바탕 위 '은은한 빛'
    halo.addColorStop(0, rgba(c, night ? .55 : .42));
    halo.addColorStop(.3, rgba(c, night ? .2 : .14));
    halo.addColorStop(1, rgba(c, 0));
    g.fillStyle = halo; g.fillRect(-R, -R, S, S);
    const k = S * BODY[STAR_K] / 50;
    g.save(); g.scale(k, k);
    g.shadowColor = rgba(c, .95); g.shadowBlur = S * .07;     // 굽는 순간에만 쓰는 블러(여기선 한 번뿐이라 공짜)
    g.fillStyle = rgba(night ? mix(c, WHITE, .5) : c, 1);
    g.fill(path);
    g.restore();
    g.save(); g.scale(k * .42, k * .42);                        // 가운데 하얀 심 → 사탕처럼 반들반들
    g.fillStyle = rgba(mix(c, WHITE, night ? 1 : .75), 1);
    g.fill(path);
    g.restore();
    return s;
  }
  function makeDot(S, c, night) {
    const s = document.createElement('canvas'); s.width = s.height = S;
    const g = s.getContext('2d'), R = S / 2;
    g.translate(R, R);
    const halo = g.createRadialGradient(0, 0, 0, 0, 0, R);
    halo.addColorStop(0, rgba(c, night ? .7 : .5));
    halo.addColorStop(.32, rgba(c, night ? .22 : .16));
    halo.addColorStop(1, rgba(c, 0));
    g.fillStyle = halo; g.fillRect(-R, -R, S, S);
    const r = S * BODY[DOT_K];
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
    g.fillStyle = rgba(night ? mix(c, WHITE, .55) : c, 1); g.fill();
    g.beginPath(); g.arc(-r * .25, -r * .25, r * .45, 0, Math.PI * 2);
    g.fillStyle = rgba(mix(c, WHITE, .8), .95); g.fill();
    return s;
  }
  function makeBubble(S, c, night) {               // 프루티거 에어로 비눗방울: 속은 거의 투명, 테만 색, 왼쪽 위 반사광
    const s = document.createElement('canvas'); s.width = s.height = S;
    const g = s.getContext('2d'), R = S / 2, r = S * BODY[BUB_K];
    g.translate(R, R);
    const body = g.createRadialGradient(0, 0, 0, 0, 0, r);
    body.addColorStop(0, rgba(c, night ? .03 : .05));
    body.addColorStop(.6, rgba(c, night ? .07 : .11));
    body.addColorStop(.86, rgba(c, night ? .3 : .42));
    body.addColorStop(.96, rgba(mix(c, WHITE, .35), night ? .75 : .85));
    body.addColorStop(1, rgba(c, 0));
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = body; g.fill();
    // 비눗방울 막의 무지갯빛: 이미 칠한 곳에만(source-atop) 얹어서 테가 진한 곳일수록 무지개가 비침
    g.globalCompositeOperation = 'source-atop';
    const rain = g.createLinearGradient(-r, -r, r, r);
    rain.addColorStop(0, 'rgba(111,207,255,.55)'); rain.addColorStop(.35, 'rgba(179,148,255,.45)');
    rain.addColorStop(.65, 'rgba(255,143,208,.5)'); rain.addColorStop(1, 'rgba(255,207,61,.5)');
    g.fillStyle = rain; g.fillRect(-R, -R, S, S);
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(0, 0, r * .985, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, S * .012); g.strokeStyle = rgba(night ? WHITE : c, night ? .55 : .8); g.stroke();
    g.save(); g.translate(-r * .4, -r * .42); g.rotate(-.75); g.scale(1, .5);   // 왼쪽 위 창문 반사광
    const hi = g.createRadialGradient(0, 0, 0, 0, 0, r * .4);
    hi.addColorStop(0, 'rgba(255,255,255,.95)'); hi.addColorStop(.55, 'rgba(255,255,255,.55)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi; g.fillRect(-r * .4, -r * .4, r * .8, r * .8);
    g.restore();
    g.beginPath(); g.arc(r * .48, r * .46, r * .08, 0, Math.PI * 2);             // 오른쪽 아래 작은 반사
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
    return s;
  }
  function bakeSprites() {
    const path = new Path2D(STAR);
    SPR = new Array(3 * 2 * NC * LV.length);
    for (let set = 0; set < 2; set++) {
      const pal = set ? NIGHT : DAY;
      for (let ci = 0; ci < NC; ci++) {
        const c = hexRgb(pal[ci]);
        for (let li = 0; li < LV.length; li++) {
          const S = LV[li];
          SPR[sprIdx(STAR_K, set, ci, li)] = makeStar(S, c, set === 1, path);
          SPR[sprIdx(DOT_K, set, ci, li)] = makeDot(S, c, set === 1);
          SPR[sprIdx(BUB_K, set, ci, li)] = makeBubble(S, c, set === 1);
        }
      }
    }
  }
  function sprIdx(k, set, ci, li) { return ((k * 2 + set) * NC + ci) * LV.length + li; }
  function levelFor(devPx) { return devPx <= 16 ? 0 : devPx <= 32 ? 1 : devPx <= 64 ? 2 : 3; }

  function init(container) {
    box = container;
    cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;left:0;top:0;display:block;pointer-events:none;';
    box.appendChild(cv);
    ctx = cv.getContext('2d');
    bakeSprites();
  }

  // ── 크기 ──
  function resize(nW, nH) {
    const nd = Math.min(2, window.devicePixelRatio || 1);   // 3배 폰도 2배로: 픽셀 수 2.25배 아끼고 반짝이라 차이 안 보임
    if (nW === cw && nH === ch && nd === dpr) return;
    if (cw > 0 && ch > 0) {                                   // 회전·주소창 변화: 입자 위치를 새 화면 비율로 옮김(안 그러면 한쪽에 몰림)
      const sx = nW / cw, sy = nH / ch;
      for (let i = 0; i < n; i++) { X[i] *= sx; Y[i] *= sy; }
    }
    cw = nW; ch = nH; dpr = nd;
    cv.width = Math.round(nW * nd); cv.height = Math.round(nH * nd);
    cv.style.width = nW + 'px'; cv.style.height = nH + 'px';
  }
  function setUnits() {
    vmin = Math.min(W, H);
    u = Math.max(.8, Math.min(1.5, vmin / 390));                      // 크기 단위: 폰 세로(390) = 1
    countK = Math.max(.6, Math.min(1.8, (W * H) / (u * u * 390 * 844))); // 개수는 '화면 덮는 비율'이 폰과 같게 (가로 화면에서 과밀 방지)
  }

  // ── 위치 가중치 ──
  // 가장자리 정도 0(한가운데)~1(모서리·테두리)
  function edge(x, y) { const ex = Math.abs(x / W - .5), ey = Math.abs(y / H - .5); return (ex > ey ? ex : ey) * 2; }
  // 문장 띠 차분함 0(문장 한가운데)~1(멀리): 가로로 긴 타원 → 문장 줄 전체가 조용해짐
  function calm(x, y) {
    const nx = (x / W - .5) * 2, ny = (y / H - textY) / .13;
    const d = nx * nx * .3 + ny * ny;
    return d >= 1 ? 1 : d;
  }
  const rnd = Math.random;

  // ── 입자 추가·삭제 ──
  function add(kind, role, x, y, vx, vy, size, life, set) {
    if (n >= MAX) return -1;
    const i = n++;
    KIND[i] = kind; ROLE[i] = role; SET[i] = set; COL[i] = (rnd() * NC) | 0;
    X[i] = x; Y[i] = y; VX[i] = vx; VY[i] = vy; SIZE[i] = size; LIFE[i] = life; AGE[i] = 0;
    ROT[i] = rnd() * 6.283; VR[i] = (rnd() - .5) * 1.2; PH[i] = rnd() * 6.283; TW[i] = 2 + rnd() * 3.5;
    DRAG[i] = 0; GRAV[i] = 0;
    if (role === AMB) nAmb++; else if (role === BUBBLE) nBub++;
    return i;
  }
  function kill(i) {
    const r = ROLE[i];
    if (r === AMB) nAmb--; else if (r === BUBBLE) nBub--;
    const j = --n;
    if (i === j) return;
    X[i] = X[j]; Y[i] = Y[j]; VX[i] = VX[j]; VY[i] = VY[j]; AGE[i] = AGE[j]; LIFE[i] = LIFE[j]; SIZE[i] = SIZE[j];
    ROT[i] = ROT[j]; VR[i] = VR[j]; PH[i] = PH[j]; TW[i] = TW[j]; DRAG[i] = DRAG[j]; GRAV[i] = GRAV[j];
    KIND[i] = KIND[j]; COL[i] = COL[j]; SET[i] = SET[j]; ROLE[i] = ROLE[j];
  }

  // 떠다니는 반짝이 하나: 가운데·문장 띠는 뽑혀도 몇 번 다시 뽑아서 덜 생기게(완전 금지하면 가운데만 휑해서 어색)
  function spawnAmbient(set, randomAge) {
    let x = 0, y = 0;
    for (let t = 0; t < 6; t++) {
      x = rnd() * W; y = rnd() * H;
      const e = edge(x, y), ok = (.15 + .85 * calm(x, y)) * (.35 + .65 * e);
      if (rnd() < ok) break;
    }
    const e = edge(x, y);
    const isDot = rnd() < .5;
    const size = isDot ? (2 + rnd() * 3 + e * 1.5) * u
      : (4.5 + rnd() * 6 + e * e * 12) * u;                // 별은 가장자리로 갈수록만 커짐(가운데는 최대 ~10px)
    const life = isDot ? 2 + rnd() * 3 : 2.5 + rnd() * 3.5;
    const i = add(isDot ? DOT_K : STAR_K, AMB, x, y, (rnd() - .5) * 8 * u, -(3 + rnd() * 10) * u, size, life, set);
    if (i >= 0 && randomAge) AGE[i] = rnd() * life;
  }
  function spawnBubble(set, randomAge) {
    const left = rnd() < .5;
    const x = left ? rnd() * W * .2 : W * (.8 + rnd() * .2);   // 양옆 띠에서만 (가운데 고양이·글자 앞을 가로지르지 않게)
    const y = H * (.55 + rnd() * .5);
    const life = 4.5 + rnd() * 3;
    const i = add(BUB_K, BUBBLE, x, y, (left ? 1 : -1) * rnd() * 4 * u, -(16 + rnd() * 20) * u, (14 + rnd() * 20) * u, life, set);
    if (i >= 0 && randomAge) { AGE[i] = rnd() * life * .8; Y[i] += VY[i] * AGE[i]; }
  }

  // 마디 첫박 분사: (ex,ey) 에서 ang 방향 부채꼴로. 끌림(drag)이 커서 멀리 못 가고 가장자리 근처에 머묾
  function burst(ex, ey, ang, spread, count, set, big) {
    for (let k = 0; k < count; k++) {
      const a = ang + (rnd() - .5) * spread;
      const sp = vmin * (.3 + rnd() * .85) * (big ? 1.15 : 1);   // 끌림 2.6/s → 이동거리 ≈ 속도/2.6 = 화면 짧은 변의 12~37%
      const star = rnd() < .62;
      const size = star ? (6 + rnd() * 11 + (big ? 5 : 0)) * u : (2.2 + rnd() * 3) * u;
      const i = add(star ? STAR_K : DOT_K, BURST, ex + (rnd() - .5) * 10 * u, ey + (rnd() - .5) * 10 * u,
        Math.cos(a) * sp, Math.sin(a) * sp, size, .85 + rnd() * .95, set);
      if (i < 0) return;
      DRAG[i] = 2.6; GRAV[i] = vmin * .16; VR[i] = (rnd() - .5) * 9;
    }
  }
  const CORNER = [[.02, .015], [.98, .015], [.02, .985], [.98, .985]];   // 좌상·우상·좌하·우하 (살짝 안쪽)
  function cornerBurst(ci, count, set, big) {
    const cx = CORNER[ci][0] * W, cy = CORNER[ci][1] * H;
    burst(cx, cy, Math.atan2(H * .5 - cy, W * .5 - cx), 1.7, count, set, big);   // 화면 가운데를 향한 부채꼴 ±49°
  }
  function onDownbeat(b, set) {
    const big = SCENE_STARTS.indexOf(b) >= 0;
    const cnt = Math.round((big ? BIG_N : BURST_N) * countK);
    if (big) {                                     // 장면 시작 = 네 모서리 전부 + 비눗방울 두 개
      for (let c = 0; c < 4; c++) cornerBurst(c, cnt, set, true);
      spawnBubble(set, false); spawnBubble(set, false);
      return;
    }
    switch (barNo(b) % 4) {                        // 마디마다 자리를 돌려 가며 (같은 데서만 터지면 금방 지루)
      case 0: cornerBurst(0, cnt, set, false); cornerBurst(3, cnt, set, false); break;   // ↘ 대각선
      case 1: cornerBurst(1, cnt, set, false); cornerBurst(2, cnt, set, false); break;   // ↙ 대각선
      case 2:                                                                            // 양옆 벽에서 안쪽으로 (높이 엇갈리게)
        burst(0, H * .3, 0, 1.5, cnt, set, false);
        burst(W, H * .7, Math.PI, 1.5, cnt, set, false);
        break;
      default:                                                                           // 아래 두 모서리에서 분수처럼 위로 → 중력에 떨어짐
        burst(W * .04, H, -Math.PI / 2 + .25, .9, cnt, set, false);
        burst(W * .96, H, -Math.PI / 2 - .25, .9, cnt, set, false);
    }
    if (rnd() < .5) spawnBubble(set, false);
  }
  function onBeat(set) {                           // 박마다 가장자리에 작은 반짝이 톡톡 (자리 안 움직이고 제자리에서 폈다 짐)
    const cnt = Math.round(4 * countK);
    for (let k = 0; k < cnt; k++) {
      let x = 0, y = 0;
      for (let t = 0; t < 6; t++) { x = rnd() * W; y = rnd() * H; if (edge(x, y) > .6) break; }
      const star = rnd() < .5;
      add(star ? STAR_K : DOT_K, POP, x, y, 0, 0, star ? (5 + rnd() * 8) * u : (2.5 + rnd() * 3) * u, .45 + rnd() * .35, set);
    }
  }

  // 지금 박에서 떠다니는 반짝이 목표 개수 비율 (1 = 평소)
  function level(beat) {
    if (beat < .5) return 0;                                     // 인트로 검은 막 뒤: 아무것도 안 그림
    let k = Math.min(1, (beat - .5) / 2.5);                       // 첫박 뒤 2~3박 동안 점점 채움
    if (beat >= 200.5 && beat < 207.5) k *= .7;                   // 카메라 하늘 연출: 별·달이 주인공이라 살짝 비킴
    if (beat >= PHOTO) k *= .3;                                   // 사진 피날레: 은은하게만
    else if (beat > PHOTO - 2) k *= 1 - .7 * (beat - (PHOTO - 2)) / 2;
    return k;
  }

  function reset(beat, set) {                      // 되감기·크게 건너뜀: 싹 비우고 그 박 모습으로 바로 채움(서서히 차오르면 캡처·되감기 때 휑함)
    n = 0; nAmb = 0; nBub = 0;
    lastInt = Math.floor(beat);
    const k = level(beat);
    const target = Math.round(AMB_N * countK * k);
    for (let i = 0; i < target; i++) spawnAmbient(set, true);
    const tb = Math.round(BUB_N * countK * k);
    for (let i = 0; i < tb; i++) spawnBubble(set, true);
  }

  function frame(c) {
    if (!ctx || !c) return;
    const beat = +c.beat;
    const nW = c.W || box.clientWidth, nH = c.H || box.clientHeight;
    if (!(nW > 0 && nH > 0) || !isFinite(beat)) return;
    resize(nW, nH);
    W = nW; H = nH; setUnits();
    textY = c.textY > 0 && c.textY < 1 ? c.textY : .5;
    const night = c.night === undefined ? beat >= NIGHT_AT : !!c.night;
    const set = night ? 1 : 0;
    let dt = +c.dt || 0; dt = dt < 0 ? 0 : dt > .05 ? .05 : dt;   // 탭 전환 뒤 첫 프레임 dt 가 크면 입자가 순간이동 → 0.05 로 자름

    // 되감기(0.25박 넘게 뒤로) · 2박 넘게 건너뜀 → 리셋. 오디오 시계의 아주 작은 뒤로 흔들림은 무시
    if (lastBeat === null || beat < lastBeat - .25 || beat - lastBeat > 2) reset(beat, set);
    lastBeat = beat;

    // 박 이벤트: 정수 박을 새로 넘을 때마다 한 번씩 (lastInt 는 뒤로 안 감 → 시계가 흔들려도 같은 박 두 번 안 터짐)
    const bi = Math.floor(beat);
    if (bi > lastInt) {
      for (let b = lastInt + 1; b <= bi; b++) {
        if (b < 1 || b >= PHOTO) continue;           // 인트로 전·사진 피날레 후엔 분사 없음
        if (isDown(b)) onDownbeat(b, set); else onBeat(set);
      }
      lastInt = bi;
    }

    // 떠다니는 반짝이 보충: 한 프레임에 몇 개씩만(한꺼번에 생기면 번쩍해 보임)
    const k = level(beat);
    const target = Math.round(AMB_N * countK * k);
    for (let m = 0; m < 4 && nAmb < target; m++) spawnAmbient(set, false);
    if (nBub < Math.round(BUB_N * countK * k) && rnd() < dt * .5) spawnBubble(set, false);

    // ── 움직이기 (뒤에서부터 돌아야 kill 로 끝 원소를 당겨 와도 안 건너뜀) ──
    for (let i = n - 1; i >= 0; i--) {
      AGE[i] += dt;
      if (AGE[i] >= LIFE[i]) { kill(i); continue; }
      if (DRAG[i] > 0) { const f = 1 - DRAG[i] * dt; VX[i] *= f; VY[i] *= f; }
      VY[i] += GRAV[i] * dt;
      X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
      ROT[i] += VR[i] * dt;
      const r = ROLE[i];
      if (r === AMB && (Y[i] < -20 || X[i] < -20 || X[i] > W + 20)) { kill(i); continue; }   // 화면 밖으로 떠나간 것
    }

    draw(beat, night);
  }

  function draw(beat, night) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (n === 0) return;

    // 박 반짝임: 박 직후 확 부풀었다 가라앉음. 왼쪽이 먼저, 오른쪽이 0.35박 늦게 → 물결처럼 쓸고 지나감
    const invW = 1 / W;
    // 1패스 비눗방울(맨 뒤) → 2패스 글리터 → 3패스 별(맨 앞). 밤엔 빛을 더하기(lighter)로 겹치면 더 환해지게
    for (let pass = 0; pass < 3; pass++) {
      const want = pass === 0 ? BUB_K : pass === 1 ? DOT_K : STAR_K;
      ctx.globalCompositeOperation = night && pass > 0 ? 'lighter' : 'source-over';
      if (pass !== 2) ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < n; i++) {
        if (KIND[i] !== want) continue;
        const t = AGE[i] / LIFE[i], r = ROLE[i];
        let x = X[i], y = Y[i];
        let f = beat - x * invW * .35; f -= Math.floor(f);
        const sh = Math.exp(-5 * f);                        // 0~1 박 반짝임
        let a, s;
        if (r === AMB) {
          a = t < .18 ? t / .18 : t > .7 ? (1 - t) / .3 : 1;
          const tw = Math.abs(Math.sin(AGE[i] * TW[i] + PH[i]));
          if (want === STAR_K) { s = .45 + .55 * tw + .45 * sh; a *= .6 + .4 * tw; }
          else { s = 1 + .35 * sh; a *= .3 + .5 * tw + .35 * sh; }
          x += Math.sin(AGE[i] * 1.1 + PH[i]) * 3 * u;        // 살랑살랑 좌우로
        } else if (r === BURST) {
          s = t < .1 ? t * 13 : 1.3 * Math.pow(1 - (t - .1) / .9, .6);   // 톡 튀어나와 크게 → 점점 작아짐
          a = t < .65 ? 1 : (1 - t) / .35;
          s *= 1 + .25 * sh;
        } else if (r === POP) {
          s = Math.sin(t * Math.PI); a = s;                   // 제자리에서 폈다 짐
        } else {                                              // 비눗방울: 둥실 흔들리다 마지막에 '톡' 부풀며 사라짐
          a = t < .12 ? t / .12 : t > .93 ? (1 - t) / .07 : 1;
          s = t > .93 ? 1 + (t - .93) * 3.5 : 1 + .04 * sh;
          x += Math.sin(AGE[i] * 1.4 + PH[i]) * 7 * u;
          a *= .9;
        }
        if (r !== BUBBLE) a *= .3 + .7 * calm(x, y);          // 문장 띠 위에선 더 투명하게
        if (a > 1) a = 1;
        if (a <= .02 || s <= .02) continue;
        const kd = KIND[i];
        const D = SIZE[i] * s / (2 * BODY[kd]);               // 스프라이트 한 변(CSS px)
        const dev = D * dpr;
        const spr = SPR[sprIdx(kd, SET[i], COL[i], levelFor(dev))];
        ctx.globalAlpha = a;
        if (kd === STAR_K) {                                  // 별만 빙글 돌림 (setTransform 한 번으로 이동·회전·크기 → 객체 생성 없음)
          const sc = dev / spr.width, co = Math.cos(ROT[i]) * sc, si = Math.sin(ROT[i]) * sc;
          ctx.setTransform(co, si, -si, co, x * dpr, y * dpr);
          ctx.drawImage(spr, -spr.width / 2, -spr.width / 2);
        } else {
          ctx.drawImage(spr, x * dpr - dev / 2, y * dpr - dev / 2, dev, dev);
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  return { init, frame, get count() { return n; } };   // count = 지금 살아 있는 입자 수(검증용)
})();
