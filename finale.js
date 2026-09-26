/* ────────────────────────────────────────────────────────────────────
   finale.js — 마지막 장면 (클래식 스크립트, 외부 라이브러리·네트워크 없음)

   ① 커플 사진이 가운데서 빙그르르르 돌며 커져서 start 첫박에 딱 똑바로 "착" 착지
   ② 착지 순간 흰 번쩍 → 배경이 흰색에서 꿈빛 밤하늘(남색·보라·분홍)로
   ③ 박마다 불꽃놀이 펑 펑 (마디 첫박엔 여러 발), 빛줄기·반짝이·비눗방울·해파리
   ④ 「여부여부 생일 축하해!!!!」 옛날 워드아트 글자가 하나씩 퐁퐁 → 박자에 맞춰 물결 통통

   ⑤ 착지 뒤 사진을 콕 누르면: 한 바퀴 더 빙그르르(살짝 떴다가 "착" 찌그러지며 똑바로) + 하트 불꽃 펑 (2026-09-26 유저 요청)

   엔진 사용법:
     Finale.init(back, front)  한 번. back = 고양이 뒤 전체화면 div, front = 고양이 앞 전체화면 div
     Finale.frame(c)           매 프레임. c = { beat, start, W, H, tall, dt, ended }
     Finale.tap(x, y)          pointerdown 마다(client px). 착지한 사진 위면 빙그르르+하트 펑 하고 true, 아니면 false(= 동물 차례)
     Finale.hit(x, y)          위와 같은 판정만(효과 없음)
     Finale.photoRect()        지금 화면의 사진 액자 테두리 상자 {x, y, w, h}(client px, 기울기·회전 포함 외접 사각형) / 안 보이면 null

   원칙: 화면 모양은 전부 박자(c.beat)의 함수 → 노래를 되감아도 같은 장면이 나옴.
         상태를 갖는 건 불꽃 입자(와 떠다니는 방울·해파리 위치)뿐이고, 되감기 감지 시 비움.
         예외 = 탭 효과: 박자와 상관없이 누른 순간부터 실제 시간(엔진 dt 누적 S.wt)으로 흘러감.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // 문구: 한 글자도 바꾸지 말 것. 두 줄일 땐 첫 띄어쓰기에서 끊음 → "여부여부" / "생일 축하해!!!!"
  var TEXT = '여부여부 생일 축하해!!!!';
  var CUT = TEXT.indexOf(' ');
  var LINES_1 = [TEXT];
  var LINES_2 = [TEXT.slice(0, CUT), TEXT.slice(CUT + 1)];

  var FONT = '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
  var EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  var TURNS = 4;       // 등장 때 몇 바퀴 도는지 (정수여야 똑바로 착지)
  var LEAD = 0.6;      // 폭죽이 올라가는 데 걸리는 박 수 → 미리 쏴서 "펑"이 정확히 박에 오게
  var CAP = 600;       // 살아있는 불꽃 입자 상한 (폰 배려)
  var POP0 = 0.3, POPGAP = 0.29, POPDUR = 0.4;   // 글자 등장: start+0.3박부터 0.29박 간격, 0.4박 동안 퐁 → 13자가 4박 안에
  var TRACK = 0.1;     // 글자 사이 추가 간격(em)
  var OUT = 0.3;       // 바깥 흰 테 선폭(em)
  var INN = 0.14;      // 안쪽 보라 테 선폭(em)
  var SHD = 0.07;      // 그림자 어긋남(em)
  var LH = 1.12;       // 줄 간격(em)

  // 불꽃 색: 파스텔 + 무지개. 4번 = 토마토 빨강
  var PAL = ['#ff7ec3', '#ffc4e6', '#ffe45c', '#ffab6e', '#ff5147', '#7ef2c4',
             '#72d8ff', '#9fb0ff', '#c897ff', '#ffffff', '#ffc93c', '#ff3b7a'];
  var WHITE = 9, GOLD = 10, HOT = 11;   // HOT = 하트 전용 진분홍 (0번 파스텔 분홍만으론 하트 윤곽이 밤하늘·사진 위에서 흐릿했음)

  // ── 사진 탭 효과 (벽시계 초 단위) ──
  var TCAP = 420;      // 탭 불꽃 입자 상한. 박자 불꽃(CAP)과 따로 셈 → 연타해도 박자 불꽃은 안 줄어듦
  var SPIN_D = 0.85;   // 한 바퀴 빙그르르 걸리는 시간(초). 0.72 지점에 360°+살짝 넘침 → 나머지 동안 되돌아와 똑바로
  var SPIN_OV = 0.04;  // 넘침 = 360°의 4% ≈ 14°
  var SPIN_MAX = 3;    // 동시에 겹칠 수 있는 바퀴 수 (연타 = 더 빨리 여러 바퀴, 무한 가속은 막음)
  var HEART_COLS = [   // 말랑 유리 하트 스티커 색(위·가운데·아래): 분홍 / 빨강 / 금색
    ['#ffe0f0', '#ff6fb5', '#e02a7c'],
    ['#ffd0d6', '#ff4d6d', '#c40f3b'],
    ['#fff8cf', '#ffd23f', '#e59400'],
  ];
  var SCHEMES = [[0, 1], [2, 10], [6, 5], [8, 7], [4, 3], [1, 6], [5, 2], [8, 0], [6, 1]];
  var RAINBOW = [4, 3, 2, 5, 6, 7, 8, 0];
  var EMOJI = ['🍅', '🐢', '🐬', '🍅', '🐢', '🐬', '🎂'];   // 토마토·거북이·돌고래 폭죽 (해파리는 🪼가 iOS15에서 두부라 직접 그림)

  // 글자별 채움색(위·가운데·아래). 무지개 순으로 돌아가며 칠함
  var LETTER_COL = [
    ['#ffd3ee', '#ff5fb0', '#dc2a84'],
    ['#ffe3bf', '#ff9a3d', '#ec5d1c'],
    ['#fffbc4', '#ffd83a', '#eea300'],
    ['#dcffcb', '#5fe07a', '#1ba652'],
    ['#d2fcff', '#3fd3f0', '#168bd3'],
    ['#dfe6ff', '#6f8bff', '#3b4ade'],
    ['#f1deff', '#b36bff', '#7630de'],
  ];

  // 사진 모서리 스티커(사진 박스 대비 위치·기울기·크기)
  var STICKERS = [
    { e: '🍅', x: 0.035, y: 0.03, r: -16, s: 0.2 },
    { e: '🐬', x: 0.965, y: 0.055, r: 14, s: 0.19 },
    { e: '🐢', x: 0.955, y: 0.972, r: -8, s: 0.2 },
    { e: '🐰', x: 0.045, y: 0.968, r: 10, s: 0.19 },   // 비어 있던 왼쪽 아래 — 유저 요청으로 토끼 (토끼도 춤추는 친구로 합류해서 짝 맞춤)
  ];
  // 액자 위 반짝 빛점(사진 박스 대비 위치)
  var GLINTS = [[0.05, 0.955], [0.99, 0.42], [0.012, 0.3], [0.55, 0.012]];

  // 꿈빛 밤하늘: 남색 → 보라 → 분홍, 몽글몽글 빛 번짐 몇 개
  var SKY =
    'radial-gradient(120% 55% at 50% 108%, rgba(255,168,214,.95), rgba(255,168,214,0) 70%),' +
    'radial-gradient(circle at 14% 24%, rgba(110,200,255,.30), rgba(110,200,255,0) 30%),' +
    'radial-gradient(circle at 86% 42%, rgba(205,140,255,.32), rgba(205,140,255,0) 32%),' +
    'radial-gradient(circle at 62% 6%, rgba(255,150,220,.22), rgba(255,150,220,0) 26%),' +
    'linear-gradient(180deg, #060a2c 0%, #16134d 28%, #3b2474 52%, #80418f 74%, #f08fbf 100%)';

  var CSS =
    '.fn-root{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;display:none}' +
    '.fn-a{position:absolute;left:0;top:0}' +
    '.fn-sky{width:100%;height:100%;opacity:0;background:' + SKY + '}' +
    '.fn-rays{opacity:0;will-change:transform,opacity}' +
    '.fn-photo{opacity:0;transform-origin:50% 50%}' +
    // 진주빛 액자: 흰 바탕에 분홍·하늘·노랑·보라가 비치는 그라데이션
    '.fn-frame{width:100%;height:100%;background:linear-gradient(135deg,#ffffff 0%,#ffe3f3 20%,#e3f2ff 42%,#fff6d9 62%,#eadcff 82%,#ffffff 100%)}' +
    '.fn-win{overflow:hidden;background:#ffe9f5}' +
    '.fn-win img{position:absolute;left:0;top:0;width:100%;height:100%;display:block;object-fit:cover}' +
    // 프루티거 에어로식 유리 광택(위쪽 반달)
    '.fn-gloss{width:100%;height:42%;background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.13) 72%,rgba(255,255,255,0))}' +
    '.fn-edge{width:100%;height:100%}' +
    '.fn-sweep{top:-20%;width:30%;height:140%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.55) 50%,rgba(255,255,255,0))}' +
    '.fn-stk{line-height:1;white-space:nowrap;font-family:' + EMOJI_FONT + '}' +
    '.fn-glint{will-change:transform}' +
    '.fn-flash{width:100%;height:100%;background:#fff;opacity:0}' +
    '.fn-l{opacity:0;transform-origin:50% 55%;will-change:transform,opacity}';

  var S = { ready: false, on: false };

  /* ── 작은 도구들 ── */
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // CSS에 1e-7 같은 지수표기가 들어가면 transform 통째로 무시됨 → 반올림해서 씀
  function n2(v) { return Math.round(v * 100) / 100; }
  function n4(v) { return Math.round(v * 10000) / 10000; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function frac(v) { return v - Math.floor(v); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  // 스타일은 값이 바뀔 때만 씀 (매 프레임 같은 값 쓰기 = 쓸데없는 스타일 재계산)
  function setOp(e, v) { v = Math.round(v * 1000) / 1000; if (e._o !== v) { e._o = v; e.style.opacity = v; } }
  function setTf(e, v) { if (e._t !== v) { e._t = v; e.style.transform = v; } }
  function easeOutBack(u) { var c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }

  /* ── 미리 그려두는 스프라이트 (매 프레임 그라데이션 새로 만들지 않으려고) ── */
  function makeGlow(hex) {           // 빛 방울: 가운데 흰 심 + 색 번짐
    var c = mk(64, 64), x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.13, rgba(hex, 1));
    g.addColorStop(0.32, rgba(hex, 0.45));
    g.addColorStop(1, rgba(hex, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  }
  function starPath(x, k) {          // 엔진 반짝이와 같은 네 갈래 별
    x.beginPath();
    x.moveTo(0, -50 * k);
    x.bezierCurveTo(4 * k, -14 * k, 14 * k, -4 * k, 50 * k, 0);
    x.bezierCurveTo(14 * k, 4 * k, 4 * k, 14 * k, 0, 50 * k);
    x.bezierCurveTo(-4 * k, 14 * k, -14 * k, 4 * k, -50 * k, 0);
    x.bezierCurveTo(-14 * k, -4 * k, -4 * k, -14 * k, 0, -50 * k);
    x.closePath();
  }
  function makeStar() {              // 반짝이 별 + 은은한 후광
    var c = mk(64, 64), x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(0.22, 'rgba(255,215,245,.35)');
    g.addColorStop(0.6, 'rgba(200,220,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.translate(32, 32);
    starPath(x, 0.62);
    x.fillStyle = '#ffffff'; x.fill();
    return c;
  }
  function makeEmoji(e) {
    var c = mk(80, 80), x = c.getContext('2d');
    x.font = '60px ' + EMOJI_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(e, 40, 44);
    return c;
  }
  function makeBubble() {            // 프루티거 에어로 비눗방울: 투명한 속 + 반짝 테 + 광택
    var c = mk(128, 128), x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.68, 'rgba(170,230,255,.07)');
    g.addColorStop(0.88, 'rgba(150,220,255,.32)');
    g.addColorStop(0.955, 'rgba(255,255,255,.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, Math.PI * 2); x.fill();
    var p = x.createRadialGradient(88, 92, 0, 88, 92, 44);   // 아래쪽 무지갯빛(분홍) 기운
    p.addColorStop(0, 'rgba(255,170,230,.28)'); p.addColorStop(1, 'rgba(255,170,230,0)');
    x.fillStyle = p; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
    x.save(); x.translate(42, 38); x.rotate(-0.7);          // 큰 광택
    var h = x.createLinearGradient(0, -12, 0, 12);
    h.addColorStop(0, 'rgba(255,255,255,.95)'); h.addColorStop(1, 'rgba(255,255,255,.1)');
    x.fillStyle = h; x.beginPath(); x.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2); x.fill();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(92, 94, 5, 0, Math.PI * 2); x.fill();
    return c;
  }
  function makeBell() {              // 해파리 갓(보름달물해파리 클로버 무늬)
    var c = mk(128, 110), x = c.getContext('2d');
    x.beginPath();
    x.ellipse(64, 70, 58, 62, 0, Math.PI, 0);
    for (var i = 0; i < 6; i++) {                          // 아랫단 물결 주름
      var xa = 122 - i * (116 / 6), xb = xa - 116 / 6;
      x.quadraticCurveTo((xa + xb) / 2, 82, xb, 70);
    }
    x.closePath();
    var g = x.createRadialGradient(64, 44, 4, 64, 58, 66);
    g.addColorStop(0, 'rgba(255,240,252,.95)');
    g.addColorStop(0.45, 'rgba(255,160,220,.6)');
    g.addColorStop(1, 'rgba(190,140,255,.35)');
    x.fillStyle = g; x.fill();
    x.lineWidth = 3; x.strokeStyle = 'rgba(255,205,240,.85)'; x.stroke();
    x.strokeStyle = 'rgba(255,120,200,.6)'; x.lineWidth = 3;
    [[54, 46], [74, 46], [54, 60], [74, 60]].forEach(function (q) {
      x.beginPath(); x.arc(q[0], q[1], 6.5, 0, Math.PI * 2); x.stroke();
    });
    x.fillStyle = 'rgba(255,255,255,.6)';
    x.beginPath(); x.ellipse(42, 32, 13, 6, -0.55, 0, Math.PI * 2); x.fill();
    return c;
  }
  // 하트 곡선 x = 16sin³t, y = -(13cos t - 5cos2t - 2cos3t - cos4t) — 기존 하트 불꽃과 같은 식.
  // 범위: x ±16, y -12(두 혹 꼭대기) ~ +17(아래 뾰족). 원점은 가운데보다 2.5 위(혹 사이 오목한 곳 근처)
  function heartXY(t) {
    var s = Math.sin(t);
    return [16 * s * s * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
  }
  // 곡선 길이 기준으로 고르게 찍은 점 N개 (t 를 균등하게 나누면 아래 뾰족한 끝·오목한 곳에 점이 몰리고 옆구리가 성겨서
  //  입자 수가 적을 때 하트가 찌그러져 보임 → 길이로 나눠야 점이 적어도 하트 윤곽이 또렷)
  function heartEven(N) {
    var M = 720, pts = [], len = [0], i, a, b;
    for (i = 0; i <= M; i++) pts.push(heartXY(i / M * Math.PI * 2));
    for (i = 1; i <= M; i++) { a = pts[i - 1]; b = pts[i]; len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    var out = [], j = 0, L = len[M];
    for (i = 0; i < N; i++) {
      var want = i / N * L;
      while (len[j + 1] < want) j++;
      var f = (want - len[j]) / (len[j + 1] - len[j] || 1);
      out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
    }
    return out;
  }
  function heartPath(x, k, cx, cy) { // (cx, cy) = 곡선 원점, k = 1단위당 px
    x.beginPath();
    for (var i = 0; i <= 72; i++) {
      var q = heartXY(i / 72 * Math.PI * 2);
      if (i) x.lineTo(cx + q[0] * k, cy + q[1] * k); else x.moveTo(cx + q[0] * k, cy + q[1] * k);
    }
    x.closePath();
  }
  function makeHeart(col) {          // 프루티거 에어로식 말랑 유리 하트: 그라데이션 + 흰 테 + 왼쪽 혹 위 광택
    var c = mk(96, 96), x = c.getContext('2d'), k = 2.5, cx = 48, cy = 48 - 2.5 * k;
    heartPath(x, k, cx, cy);
    var g = x.createLinearGradient(0, cy - 12 * k, 0, cy + 17 * k);
    g.addColorStop(0, col[0]); g.addColorStop(0.45, col[1]); g.addColorStop(1, col[2]);
    x.fillStyle = g; x.fill();
    x.lineJoin = 'round'; x.lineWidth = 3.5; x.strokeStyle = 'rgba(255,255,255,.95)'; x.stroke();
    x.save();
    heartPath(x, k, cx, cy); x.clip();
    x.translate(cx - 7 * k, cy - 5.5 * k); x.rotate(-0.55);
    var h = x.createLinearGradient(0, -3.5 * k, 0, 3.5 * k);
    h.addColorStop(0, 'rgba(255,255,255,.95)'); h.addColorStop(1, 'rgba(255,255,255,.15)');
    x.fillStyle = h; x.beginPath(); x.ellipse(0, 0, 6 * k, 3 * k, 0, 0, Math.PI * 2); x.fill();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.beginPath(); x.arc(cx + 8.5 * k, cy - 5 * k, 1.4 * k, 0, Math.PI * 2); x.fill();
    return c;
  }

  function makeRays(n, c0, c1) {     // 사진 뒤 회전 빛줄기 (가운데 밝고 바깥으로 사라짐)
    var s = 512, r = s / 2, c = mk(s, s), x = c.getContext('2d');
    var g = x.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, c0); g.addColorStop(0.35, c1); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath();
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2;
      x.moveTo(r, r); x.arc(r, r, r, a, a + Math.PI / n * 0.85); x.closePath();
    }
    x.fill();
    return c;
  }

  /* ── 초기화: 요소 만들고 전부 숨겨둠 ── */
  function init(back, front) {
    if (S.ready || !back || !front) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);

    var bR = S.bRoot = el('div', 'fn-root', back);
    var fR = S.fRoot = el('div', 'fn-root', front);

    // 뒤판(아래→위): 하늘 → 빛줄기 2겹 → 불꽃 캔버스 → 사진
    S.sky = el('div', 'fn-a fn-sky', bR);
    S.rays = [makeRays(12, 'rgba(255,255,255,.55)', 'rgba(255,225,245,.17)'),
              makeRays(20, 'rgba(190,235,255,.4)', 'rgba(215,195,255,.12)')];
    S.rays.forEach(function (r) { r.className = 'fn-a fn-rays'; bR.appendChild(r); });
    S.cv = el('canvas', 'fn-a', bR);
    S.ctx = S.cv.getContext('2d');

    var ph = S.photo = el('div', 'fn-a fn-photo', bR);
    S.frame = el('div', 'fn-a fn-frame', ph);
    S.win = el('div', 'fn-a fn-win', ph);
    S.img = el('img', '', S.win);
    S.img.alt = ''; S.img.draggable = false;
    S.img.src = 'img/photo.jpg';                           // 지금 불러두면 피날레 때 이미 준비됨
    S.gloss = el('div', 'fn-a fn-gloss', S.win);
    S.edge = el('div', 'fn-a fn-edge', S.win);
    S.sweep = el('div', 'fn-a fn-sweep', S.win);
    S.stk = STICKERS.map(function (d) { var e = el('div', 'fn-a fn-stk', ph); e.textContent = d.e; return e; });

    // 스프라이트
    S.glow = PAL.map(makeGlow);
    S.star = makeStar();
    S.emoji = EMOJI.map(makeEmoji);
    S.bubble = makeBubble();
    S.bell = makeBell();
    S.hearts = HEART_COLS.map(makeHeart);
    S.heartPts = heartEven(240);

    S.glints = GLINTS.map(function () {
      var c = mk(64, 64);
      c.getContext('2d').drawImage(S.star, 0, 0);
      c.className = 'fn-a fn-glint';
      ph.appendChild(c);
      return c;
    });

    // 앞판: 탭 하트 불꽃 캔버스 → 글자 테두리 판(전부) → 글자 채움 판(전부) → 번쩍
    // 탭 하트는 앞판에: 뒤판(불꽃 캔버스)은 사진·고양이 밑이라 사진 한가운데서 터지는 하트가 사진에 가려 안 보임.
    //  글자보다는 아래 → 하트가 위로 떠올라도 "여부여부 생일 축하해!!!!" 는 안 가림. 평소엔 display:none (전체화면 캔버스 합성 비용 0)
    S.cv2 = el('canvas', 'fn-a', fR);
    S.cv2.style.display = 'none';
    S.ctx2 = S.cv2.getContext('2d');
    // 테두리를 전부 뒤에 깔아야 이웃 글자의 흰 테가 채움을 파먹지 않고 워드아트처럼 한 덩어리로 이어짐
    S.tBack = el('div', 'fn-a', fR);
    S.tFront = el('div', 'fn-a', fR);
    S.letters = [];
    for (var i = 0, k = 0; i < TEXT.length; i++) {
      var ch = TEXT.charAt(i);
      if (ch === ' ') continue;
      S.letters.push({ ch: ch, idx: k++, ob: el('canvas', 'fn-a fn-l', S.tBack), fb: el('canvas', 'fn-a fn-l', S.tFront) });
    }
    S.flash = el('div', 'fn-a fn-flash', fR);

    S.mctx = mk(4, 4).getContext('2d');                   // 글자 폭 재기용

    // 밤하늘 별·비눗방울·해파리 (위치는 화면 비율이라 크기 바뀌어도 그대로)
    S.stars = [];
    for (i = 0; i < 50; i++) S.stars.push({ x: Math.random(), y: Math.pow(Math.random(), 1.3) * 0.9, r: rnd(0.5, 1.4), ph: rnd(0, 6.3), sp: rnd(1.5, 4) });
    S.bubs = [];
    for (i = 0; i < 9; i++) S.bubs.push({ x: Math.random(), y: rnd(0, 1.1), r: rnd(0.035, 0.1), sp: rnd(0.025, 0.06), ph: rnd(0, 6.3) });
    S.jels = [];
    for (i = 0; i < 3; i++) S.jels.push({ x: [0.12, 0.88, 0.3][i], y: [0.9, 0.62, 1.1][i], s: rnd(0.08, 0.11), ph: i * 0.37 });

    S.parts = []; S.pool = []; S.rockets = [];
    S.dst = S.parts;                                       // spawn()이 넣을 목록 (탭 효과 때만 잠깐 S.tp 로 바꿈)
    S.tp = []; S.tq = []; S.spins = []; S.neons = []; S.wt = 0; S.tapT = -1e9; S.lastFx = -1e9; S.cv2On = false; S.pose = null;
    S.W = -1; S.H = -1; S.t = 0; S.lastBeat = -1e9; S.landed = false; S.nextK = 0; S.lastSpark = 0; S.willOn = false;
    S.ready = true;
  }

  /* ── 배치: 화면 크기 바뀔 때만 ── */
  function relayout(W, H, tall) {
    S.W = W; S.H = H; S.tall = tall;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.tdpr = Math.min(window.devicePixelRatio || 1, 3);    // 글자는 작아서 3배까지 또렷하게
    S.m = Math.min(W, H);

    [S.cv, S.cv2].forEach(function (cv) {
      cv.width = Math.round(W * S.dpr); cv.height = Math.round(H * S.dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    });

    // 사진 상자(액자 포함) — 엔진이 고양이를 양옆에 세울 때 같은 숫자를 씀. 바꾸지 말 것
    var pw = tall ? W * 0.56 : H * 0.46 * 0.75, ph = pw * 4 / 3;
    S.pw = pw; S.ph = ph; S.pcx = 0.5 * W; S.pcy = 0.53 * H;
    var p = S.photo.style;
    p.width = pw + 'px'; p.height = ph + 'px';
    p.left = (S.pcx - pw / 2) + 'px'; p.top = (S.pcy - ph / 2) + 'px';

    // 액자: 옆 두께 b, 위아래는 사진이 정확히 3:4로 들어가게 조금 더 두껍게(폴라로이드 느낌)
    var b = pw * 0.045, iw = pw - 2 * b, ih = iw * 4 / 3, bv = (ph - ih) / 2;
    var r = pw * 0.075, ri = Math.max(2, r - b);
    var g = pw * 0.035, G = pw * 0.1, sp = pw * 0.012;
    S.frame.style.borderRadius = r + 'px';
    // 무지갯빛 번짐: 네 방향으로 다른 색 그림자 → 돌 때 무지개가 같이 돎. 안쪽 그림자 = 볼록한 진주 테
    S.frame.style.boxShadow =
      '0 0 0 ' + n2(Math.max(1.5, pw * 0.01)) + 'px rgba(255,255,255,.95),' +
      n2(-g) + 'px ' + n2(-g) + 'px ' + n2(G) + 'px ' + n2(sp) + 'px rgba(255,110,200,.85),' +
      n2(g) + 'px ' + n2(-g) + 'px ' + n2(G) + 'px ' + n2(sp) + 'px rgba(255,220,100,.85),' +
      n2(g) + 'px ' + n2(g) + 'px ' + n2(G) + 'px ' + n2(sp) + 'px rgba(90,215,255,.85),' +
      n2(-g) + 'px ' + n2(g) + 'px ' + n2(G) + 'px ' + n2(sp) + 'px rgba(170,130,255,.85),' +
      '0 0 ' + n2(G * 2.2) + 'px rgba(255,255,255,.5),' +
      'inset 0 ' + n2(pw * 0.012) + 'px ' + n2(pw * 0.016) + 'px rgba(255,255,255,1),' +
      'inset 0 ' + n2(-pw * 0.014) + 'px ' + n2(pw * 0.026) + 'px rgba(150,110,210,.42)';
    var w = S.win.style;
    w.left = b + 'px'; w.top = bv + 'px'; w.width = iw + 'px'; w.height = ih + 'px'; w.borderRadius = ri + 'px';
    S.iw = iw;
    S.gloss.style.borderRadius = ri + 'px ' + ri + 'px 50% 50% / ' + ri + 'px ' + ri + 'px 26% 26%';
    S.edge.style.borderRadius = ri + 'px';
    S.edge.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.7), inset 0 ' + n2(pw * 0.01) + 'px ' + n2(pw * 0.035) + 'px rgba(70,30,130,.35)';

    STICKERS.forEach(function (d, i) {
      var e = S.stk[i], fs = pw * d.s;
      e.style.fontSize = fs + 'px';
      e.style.left = (d.x * pw - fs * 0.6) + 'px';
      e.style.top = (d.y * ph - fs * 0.5) + 'px';
      e._r = d.r;
    });
    var gs = pw * 0.2;
    GLINTS.forEach(function (q, i) {
      var c = S.glints[i].style;
      c.width = gs + 'px'; c.height = gs + 'px';
      c.left = (q[0] * pw - gs / 2) + 'px'; c.top = (q[1] * ph - gs / 2) + 'px';
    });

    // 빛줄기: 사진 가운데 기준으로 화면 구석까지 덮는 크기
    var D = 2 * Math.sqrt(Math.pow(Math.max(S.pcx, W - S.pcx), 2) + Math.pow(Math.max(S.pcy, H - S.pcy), 2)) * 1.03;
    S.rays.forEach(function (c) {
      c.style.width = D + 'px'; c.style.height = D + 'px';
      c.style.left = (S.pcx - D / 2) + 'px'; c.style.top = (S.pcy - D / 2) + 'px';
    });

    layoutText(W, H, tall);
  }

  /* ── 글자 배치: 한 줄/두 줄 중 더 크게 들어가는 쪽 ── */
  function layoutText(W, H, tall) {
    var m = S.mctx, REF = 100;
    m.font = '900 ' + REF + 'px ' + FONT;
    function adv(ch) { return m.measureText(ch).width / REF; }        // em 단위 글자 폭
    function lineEm(str) { var s = 0; for (var i = 0; i < str.length; i++) s += adv(str.charAt(i)); return s + TRACK * (str.length - 1); }

    var maxW = tall ? 0.94 * W : 0.7 * W;
    var cy0 = tall ? 0.13 * H : 0.1 * H;
    var photoTop = 0.53 * H - (tall ? W * 0.56 : H * 0.345) * 2 / 3;
    // 글자 크기 = 세 조건 중 가장 작은 값:
    //  폭(maxW 안에) / 위(통통 튀어도 화면 위끝에 안 잘리게: 반높이 + 테 0.15em + 튀는 높이 0.14em) / 아래(사진 윗단을 조금만 덮게)
    function fit(nl, wEm) {
      return Math.min(maxW / (wEm + OUT),
                      (cy0 - 0.012 * H) / (nl * LH / 2 + 0.3),
                      (photoTop - cy0 + 0.02 * H) / (nl * LH / 2 + 0.2));
    }
    var fs1 = fit(1, lineEm(LINES_1[0]));
    var fs2 = fit(2, Math.max(lineEm(LINES_2[0]), lineEm(LINES_2[1])));
    var two = fs2 > fs1 * 1.1;                             // 두 줄이 확실히 더 클 때만 두 줄
    var fs = Math.max(12, Math.floor(two ? fs2 : fs1));
    var lines = two ? LINES_2 : LINES_1;

    var rerender = fs !== S.fs || S.tdpr !== S.fsDpr;
    S.fs = fs; S.fsDpr = S.tdpr;
    var k = 0, maxLW = 0;
    for (var li = 0; li < lines.length; li++) {
      var str = lines[li];
      var y = cy0 + (li - (lines.length - 1) / 2) * LH * fs;
      var lw = lineEm(str) * fs;
      maxLW = Math.max(maxLW, lw);
      var x = W / 2 - lw / 2;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i), a = adv(ch) * fs;
        if (ch !== ' ') {
          var L = S.letters[k++];
          L.adv = a; L.cx = x + a / 2; L.cy = y;
          if (rerender) renderLetter(L, fs, S.tdpr);
          L.bx = L.cx - L.w / 2; L.by = L.cy - L.h / 2;
        }
        x += a + TRACK * fs;
      }
    }
    S.textCY = cy0; S.textW = maxLW; S.textH = lines.length * LH * fs;
  }

  // 워드아트 한 글자 = 테두리 판(그림자 + 흰 테 + 보라 테) + 채움 판(무지개 그라데이션 + 유리 광택)
  function renderLetter(L, fs, dpr) {
    var pad = fs * (OUT / 2 + SHD + 0.08);
    var w = L.adv + pad * 2, h = fs * 1.2 + pad * 2;
    L.w = w; L.h = h;
    [L.ob, L.fb].forEach(function (c) {
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
      c.style.width = w + 'px'; c.style.height = h + 'px';
    });
    var font = '900 ' + fs + 'px ' + FONT, cx = w / 2, cy = h / 2;
    function prep(x) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, w, h);
      x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineJoin = 'round'; x.miterLimit = 2;
    }
    var o = L.ob.getContext('2d');
    prep(o);
    o.fillStyle = o.strokeStyle = 'rgba(45,10,90,.55)';   // 그림자: 오른쪽 아래로 어긋난 통짜 덩어리
    o.lineWidth = fs * OUT;
    o.strokeText(L.ch, cx + fs * SHD, cy + fs * SHD * 1.25);
    o.fillText(L.ch, cx + fs * SHD, cy + fs * SHD * 1.25);
    o.strokeStyle = '#ffffff'; o.lineWidth = fs * OUT; o.strokeText(L.ch, cx, cy);
    o.strokeStyle = '#4a1d8c'; o.lineWidth = fs * INN; o.strokeText(L.ch, cx, cy);

    var f = L.fb.getContext('2d');
    prep(f);
    var col = LETTER_COL[L.idx % LETTER_COL.length];
    var g = f.createLinearGradient(0, cy - fs * 0.5, 0, cy + fs * 0.5);
    g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]);
    f.fillStyle = g; f.fillText(L.ch, cx, cy);
    f.globalCompositeOperation = 'source-atop';           // 글자 모양 안에만 광택
    var gg = f.createLinearGradient(0, cy - fs * 0.55, 0, cy - fs * 0.02);
    gg.addColorStop(0, 'rgba(255,255,255,.85)'); gg.addColorStop(1, 'rgba(255,255,255,.12)');
    f.fillStyle = gg; f.fillRect(0, cy - fs * 0.6, w, fs * 0.58);
    f.globalCompositeOperation = 'source-over';
  }

  /* ── 사진: 빙그르르 등장 → 박마다 콩콩, 살랑살랑 ── */
  function setWill(v) {
    S.photo.style.willChange = v;
    if (S.sweep) S.sweep.style.willChange = v;
    if (S.stk) for (var k = 0; k < S.stk.length; k++) S.stk[k].style.willChange = v;
  }
  function updPhoto(b) {
    var st = S.st, tf, op = 1, i;
    if (b < st) {
      // start-2 ~ start: 점처럼 작게 시작 → TURNS 바퀴 돌며 커져서 start에 정확히 크기 1·각도 0
      var p = clamp((b - (st - 2)) / 2, 0, 1);
      var sc = 0.03 + 0.97 * (1 - (1 - p) * (1 - p));
      var rot = -360 * TURNS * Math.pow(1 - p, 1.35);
      op = clamp(p * 6, 0, 1);
      tf = 'rotate(' + n2(rot) + 'deg) scale(' + n4(sc) + ')';
      S.pose = { dy: 0, rot: rot, sx: sc, sy: sc, bdy: 0, brot: rot, bs: sc };
      if (S.willOn) { setWill(''); S.willOn = false; }
      for (i = 0; i < S.glints.length; i++) setOp(S.glints[i], 0);
      setOp(S.sweep, 0);
      for (i = 0; i < S.stk.length; i++) setTf(S.stk[i], 'rotate(' + S.stk[i]._r + 'deg)');
    } else {
      var t = b - st, q = frac(t);
      var pulse = Math.exp(-q * 5);                        // 박마다 1 → 0
      var land = t < 1.5 ? 0.09 * Math.exp(-t * 3) * Math.cos(t * 8) : 0;   // 착지 출렁
      var s2 = 1 + 0.03 * pulse + land;
      var r2 = 2.2 * Math.sin(t * Math.PI / 2);            // 4박에 한 번 왼쪽·오른쪽으로 살랑
      var dy0 = -S.ph * 0.012 * pulse;
      // 탭 빙그르르: 박자 모양 위에 그냥 더함 → 다 돌면 더한 값이 0(=360의 배수)이라 박자 콩콩으로 이음새 없이 돌아감
      var sp = spinState(), lp = Math.max(0, sp.L), lq = Math.max(0, -sp.L);
      var pop = 1 + 0.12 * lp;                              // 도는 동안 앞으로 톡 튀어나옴(12%)
      var sxq = pop * (1 + 0.32 * lq), syq = pop * (1 - 0.36 * lq);   // 착지 때 옆으로 퍼지며 납작("착")
      // 납작해질 때 아래 테두리는 제자리(가운데 기준으로 찌그러지면 공중에서 찌그러지는 것처럼 보임) + 도는 동안 살짝 떠오름
      var dyq = S.ph / 2 * s2 * (pop - syq) - S.ph * 0.05 * lp;
      var ang = r2 + sp.a;
      tf = 'translate(0,' + n2(dy0 + dyq) + 'px) rotate(' + n2(ang) + 'deg) scale(' + n4(s2 * sxq) + ',' + n4(s2 * syq) + ')';
      S.pose = { dy: dy0 + dyq, rot: ang, sx: s2 * sxq, sy: s2 * syq, bdy: dy0, brot: r2, bs: s2 };
      // 착지 후엔 크기가 거의 1로 고정 → 이때 레이어로 올려야 크롬이 흐리게 굳히지 않음(작을 때 올리면 흐림)
      if (!S.willOn) { setWill('transform'); S.willOn = true; }   // 착지 순간 사진+빛줄기+스티커를 같이 자기 층으로 (검수 확정: 따로 두면 매 프레임 사진 전체를 다시 그려 폰 GPU 2.6배)

      // 액자 반짝 빛점: 2박 주기로 하나씩 차례로 반짝. 탭하면 네 개가 0.07초 간격으로 한꺼번에 반짝(탭 반짝임)
      var tt = S.wt - S.tapT;
      for (i = 0; i < S.glints.length; i++) {
        var gq = frac(t / 2 - i * 0.25), tw = gq < 0.3 ? Math.sin(gq / 0.3 * Math.PI) : 0;
        var tq2 = (tt - i * 0.07) / 0.4;
        if (tq2 > 0 && tq2 < 1) { var tw2 = Math.sin(tq2 * Math.PI) * 1.3; if (tw2 > tw) { tw = tw2; gq = tq2; } }
        setOp(S.glints[i], tw > 0.01 ? 1 : 0);
        if (tw > 0.01) setTf(S.glints[i], 'rotate(' + n2(gq * 150) + 'deg) scale(' + n2(0.2 + tw) + ')');
      }
      // 마디 첫박마다 유리 위로 빛이 한 번 쓱 지나감. 탭하면 그 순간부터 0.45초 동안 한 번 더 쓱
      var sq = frac(t / 4) * 4;
      if (tt >= 0 && tt < 0.45) sq = tt / 0.45;
      if (sq < 1) {
        setOp(S.sweep, 1);
        setTf(S.sweep, 'translateX(' + n2((-0.45 + 1.6 * sq) * S.iw) + 'px) skewX(-18deg)');
      } else setOp(S.sweep, 0);
      // 스티커는 박마다 까딱
      for (i = 0; i < S.stk.length; i++) {
        var sgn = i % 2 ? -1 : 1;
        setTf(S.stk[i], 'rotate(' + n2(S.stk[i]._r + sgn * 9 * Math.sin(t * Math.PI)) + 'deg) scale(' + n2(1 + 0.12 * pulse) + ')');
      }
    }
    setTf(S.photo, tf);
    setOp(S.photo, op);
  }

  /* ── 하늘·빛줄기 ── */
  function updBg(b) {
    var t = b - S.st;
    if (t < 0) { setOp(S.sky, 0); setOp(S.rays[0], 0); setOp(S.rays[1], 0); return; }
    setOp(S.sky, 1);                                        // 착지 순간 휙 (흰 번쩍에 가려서 바뀜)
    var bp = Math.exp(-frac(t) * 4);                        // 박마다
    var dp = Math.exp(-frac(t / 4) * 10);                   // 마디 첫박마다
    var fade = clamp(t / 0.8, 0, 1);
    setOp(S.rays[0], fade * (0.7 + 0.3 * bp));
    setOp(S.rays[1], fade * (0.55 + 0.35 * dp));
    setTf(S.rays[0], 'rotate(' + n2(t * 7) + 'deg) scale(' + n4(1 + 0.05 * dp) + ')');
    setTf(S.rays[1], 'rotate(' + n2(-t * 4.5) + 'deg) scale(' + n4(1.02 + 0.03 * bp) + ')');
  }

  /* ── 흰 번쩍: 착지 때 크게, 이후 4마디마다 살짝 ── */
  function updFlash(b, ended) {
    var t = b - S.st, fo = 0;
    if (t >= 0 && t < 1.3) fo = Math.pow(1 - t / 1.3, 2);
    else if (t >= 16 && !ended) { var q = t % 16; if (q < 0.6) fo = 0.28 * Math.pow(1 - q / 0.6, 2); }
    setOp(S.flash, fo);
  }

  /* ── 글자: 하나씩 퐁 → 물결치며 박마다 통통 ── */
  function updText(b) {
    var st = S.st, fs = S.fs, A = fs * 0.14;
    for (var i = 0; i < S.letters.length; i++) {
      var L = S.letters[i], tp = st + POP0 + L.idx * POPGAP, u = (b - tp) / POPDUR;
      if (u <= 0) { setOp(L.ob, 0); setOp(L.fb, 0); continue; }
      var uu = Math.min(1, u);
      var s = easeOutBack(uu);                              // 0 → 1.2쯤 → 1 (퐁!)
      var rot0 = (1 - uu) * (L.idx % 2 ? 50 : -50);
      var y0 = (1 - uu) * fs * 0.5;
      var ramp = clamp((b - tp - POPDUR) / 1.2, 0, 1);      // 다 나온 뒤 통통이 서서히 붙음
      var ph = L.idx * 0.8 - (b - st) * Math.PI / 4;        // 물결 기준선(8박에 한 바퀴 흘러감)
      var wy = fs * 0.07 * Math.sin(ph), wr = 6 * Math.cos(ph);
      var hop = Math.abs(Math.sin(Math.PI * (b - st - L.idx * 0.08)));   // 박마다 바닥에 닿는 공 튀기기, 글자마다 조금씩 늦게 = 물결
      var sq = Math.pow(1 - hop, 4) * 0.09 * ramp;          // 닿는 순간 살짝 찌그러짐
      var dy = y0 + wy - A * hop * ramp;
      var tf = 'translate(' + n2(L.bx) + 'px,' + n2(L.by + dy) + 'px) rotate(' + n2(rot0 + wr * uu) + 'deg) scale(' +
        n4(s * (1 + sq)) + ',' + n4(s * (1 - sq)) + ')';
      var op = Math.min(1, u * 4);
      setTf(L.ob, tf); setTf(L.fb, tf);
      setOp(L.ob, op); setOp(L.fb, op);
    }
  }

  /* ── 불꽃 입자 ──
     kind 0 = 불꽃 알갱이(꼬리선 있음), 1 = 이모지, 2 = 반짝이 별, 3 = 로켓 불티, 4 = 터지는 순간 번쩍, 5 = 유리 하트(탭 전용) */
  function spawn(kind, x, y, vx, vy, life, size, col, drag, g) {
    var p = S.pool.pop() || {};
    p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
    p.size = size; p.col = col; p.drag = drag; p.g = g; p.tw = false; p.rot = 0; p.vr = 0; p.spr = 0; p.amp = 1;
    S.dst.push(p);
    return p;
  }
  function room(n) {                  // 새 입자 n개 자리: 상한 넘으면 제일 오래된(거의 꺼진) 것부터 뺌
    var P = S.parts, over = P.length + n - CAP;
    if (over > 0) {
      for (var i = 0; i < over; i++) S.pool.push(P[i]);
      P.splice(0, over);
    }
  }
  function clearParts() {
    for (var i = 0; i < S.parts.length; i++) S.pool.push(S.parts[i]);
    S.parts.length = 0; S.rockets.length = 0;
  }

  // 한 발 터뜨리기. big = 마디 첫박용 큰 것
  function burst(style, x, y, big, c1, c2) {
    var m = S.m, R = m * (big ? rnd(0.24, 0.3) : rnd(0.16, 0.22)), cm = big ? 1.3 : 1;
    var dr = 2.4, v = R * dr, i, a, s, n, p, col;
    var sz = function () { return m * rnd(0.011, 0.016); };
    room(style === 'emoji' ? 40 : Math.round(80 * cm));
    spawn(4, x, y, 0, 0, 0.3, R * 0.6, WHITE, 0, 0);        // 펑! 하는 순간의 번쩍
    switch (style) {
      case 'ring':                                           // 비스듬한 고리
        n = Math.round(44 * cm);
        var tilt = rnd(0.4, 1), ra = rnd(0, Math.PI), cr = Math.cos(ra), sr = Math.sin(ra);
        for (i = 0; i < n; i++) {
          a = i / n * Math.PI * 2;
          var ux = Math.cos(a), uy = Math.sin(a) * tilt;
          spawn(0, x, y, (ux * cr - uy * sr) * v, (ux * sr + uy * cr) * v, rnd(1.2, 1.5), sz(), i % 2 ? c1 : c2, dr, 0.8);
        }
        for (i = 0; i < 12; i++) {
          a = rnd(0, 6.3); s = rnd(0.1, 0.4) * v;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.8, 1.2), sz() * 0.8, WHITE, dr, 1); p.tw = true;
        }
        break;
      case 'rainbow':                                        // 방향마다 무지개색
        n = Math.round(72 * cm);
        for (i = 0; i < n; i++) {
          a = i / n * Math.PI * 2 + rnd(-0.04, 0.04); s = rnd(0.8, 1) * v;
          spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1.2, 1.6), sz(), RAINBOW[Math.floor(i / n * RAINBOW.length)], dr, 1);
        }
        break;
      case 'crackle':                                        // 금빛·흰빛 반짝반짝 글리터
        n = Math.round(56 * cm);
        for (i = 0; i < n; i++) {
          a = rnd(0, 6.3); s = rnd(0.35, 1) * v;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1.3, 1.9), sz() * 0.85, i % 2 ? GOLD : WHITE, dr, 1);
          p.tw = true;
        }
        break;
      case 'willow':                                         // 금빛 수양버들: 길게 늘어짐
        n = Math.round(56 * cm);
        for (i = 0; i < n; i++) {
          a = rnd(0, 6.3); s = rnd(0.7, 1) * R * 1.7;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(2.0, 2.6), sz() * 0.8, GOLD, 1.7, 1.7);
          p.tw = true;
        }
        break;
      case 'heart':                                          // 하트 모양
        n = Math.round(56 * cm);
        for (i = 0; i < n; i++) {
          var tt = i / n * Math.PI * 2, st3 = Math.sin(tt);
          var hx = 16 * st3 * st3 * st3;
          var hy = -(13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt));
          spawn(0, x, y, hx / 17 * v, hy / 17 * v, rnd(1.4, 1.7), sz(), i % 3 ? 0 : 4, dr, 0.25);
        }
        for (i = 0; i < 14; i++) {
          a = rnd(0, 6.3); s = rnd(0.1, 0.35) * v;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.9, 1.3), sz() * 0.8, 1, dr, 0.5); p.tw = true;
        }
        break;
      case 'emoji':                                          // 토마토·거북이·돌고래가 펑
        n = 11;
        for (i = 0; i < n; i++) {
          a = i / n * Math.PI * 2 + rnd(-0.2, 0.2); s = rnd(0.55, 1) * v * 0.9;
          p = spawn(1, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1.8, 2.3), m * rnd(0.08, 0.11), 0, 1.8, 1.1);
          p.spr = (Math.random() * S.emoji.length) | 0; p.rot = rnd(-0.5, 0.5); p.vr = rnd(-4, 4);
        }
        for (i = 0; i < 24; i++) {
          a = rnd(0, 6.3); s = rnd(0.5, 1) * v;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1, 1.4), sz() * 0.8, pick([0, 2, 5, 6, 9]), dr, 1); p.tw = true;
        }
        break;
      default:                                               // peony: 둥근 국화꽃
        n = Math.round(64 * cm);
        for (i = 0; i < n; i++) {
          a = rnd(0, 6.3);
          s = (Math.random() < 0.72 ? rnd(0.86, 1) : rnd(0.3, 0.8)) * v;
          col = Math.random() < 0.3 ? c2 : c1;
          p = spawn(0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(1.1, 1.6), sz(), col, dr, 1);
          if (Math.random() < 0.12) { p.col = WHITE; p.tw = true; }
        }
    }
  }

  // 폭죽 한 발 쏘기: 박 k-LEAD 에 바닥에서 출발해 박 k 에 정확히 터짐
  function rocket(k, style, big, fx, fy) {
    var W = S.W, H = S.H, sc = pick(SCHEMES);
    if (fx == null) fx = rnd(0.12, 0.88);
    if (fy == null) fy = Math.random() < 0.75 ? rnd(0.07, 0.42) : rnd(0.74, 0.9);   // 대부분 위쪽 절반
    var x1 = fx * W, y1 = fy * H;
    S.rockets.push({ k0: k - LEAD, k1: k, x0: x1 + rnd(-0.06, 0.06) * W, y0: H * 1.02, x1: x1, y1: y1,
                     x: x1, y: H * 1.02, style: style, big: big, c1: sc[0], c2: sc[1] });
  }

  // 박 k 에 무엇을 터뜨릴지 (ended 뒤엔 2박에 한 번, 한 발씩만 = 잔잔하게)
  function plan(k, calm) {
    var rel = Math.round(k - S.st);
    if (calm && rel % 2) return;
    if (rel % 4 === 0) {                                     // 마디 첫박: 여러 발 크게
      if (rel % 16 === 0) {
        rocket(k, 'peony', true, rnd(0.15, 0.3), rnd(0.18, 0.3));
        if (!calm) rocket(k, 'rainbow', true, rnd(0.7, 0.85), rnd(0.15, 0.28));
        if (!calm) rocket(k, 'willow', true, rnd(0.4, 0.6), rnd(0.06, 0.14));
      } else if (rel % 8 === 4) {
        rocket(k, 'heart', true, rnd(0.3, 0.7), rnd(0.12, 0.3));
        if (!calm) rocket(k, pick(['peony', 'crackle']), false);
      } else {
        rocket(k, 'emoji', true, rnd(0.25, 0.75), rnd(0.12, 0.3));
        if (!calm) rocket(k, 'ring', false);
      }
    } else {
      rocket(k, pick(['peony', 'ring', 'crackle', 'rainbow', 'peony', 'rainbow']), false);
      if (!calm && rel % 4 === 2 && Math.random() < 0.5) rocket(k, 'peony', false);
    }
  }

  // 착지 순간: 로켓 없이 바로 세 발 + 사진 둘레 반짝이 원
  function landing() {
    burst('peony', S.W * 0.2, S.H * 0.3, true, 0, 1);
    burst('rainbow', S.W * 0.8, S.H * 0.26, true, 0, 0);
    burst('crackle', S.W * 0.5, S.H * 0.86, true, 0, 0);
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2;
      var p = spawn(2, S.pcx + Math.cos(a) * S.pw * 0.62, S.pcy + Math.sin(a) * S.ph * 0.58,
                    Math.cos(a) * S.m * 0.15, Math.sin(a) * S.m * 0.15, 0.9, S.m * 0.08, WHITE, 2, 0);
      p.rot = rnd(0, 1); p.vr = rnd(-2, 2);
    }
  }

  // 박마다 사진·글자 둘레에 반짝이 별 몇 개
  function sparkles(calm) {
    var n = calm ? 2 : 3, i, a, p;
    if (S.parts.length > CAP - 8) return;
    for (i = 0; i < n; i++) {
      a = rnd(0, 6.3);
      p = spawn(2, S.pcx + Math.cos(a) * S.pw * rnd(0.55, 0.68), S.pcy + Math.sin(a) * S.ph * rnd(0.52, 0.6),
                0, -S.m * 0.02, rnd(0.45, 0.7), S.m * rnd(0.045, 0.075), WHITE, 0, 0);
      p.rot = rnd(0, 1); p.vr = rnd(-1.5, 1.5);
    }
    for (i = 0; i < 2; i++) {
      p = spawn(2, S.W / 2 + rnd(-0.5, 0.5) * S.textW, S.textCY + rnd(-0.6, 0.6) * S.textH,
                0, 0, rnd(0.4, 0.6), S.m * rnd(0.04, 0.06), WHITE, 0, 0);
      p.rot = rnd(0, 1); p.vr = rnd(-1.5, 1.5);
    }
  }

  function schedule(b, ended) {
    if (!S.landed) {
      S.landed = true;
      if (b - S.st < 1) landing();                           // 막 착지했을 때만(중간으로 건너뛰어 들어왔으면 생략)
      S.nextK = Math.max(S.st + 1, Math.ceil(b + LEAD - 1e-6));
    }
    while (S.nextK - LEAD <= b) {
      var k = S.nextK++;
      if (b - (k - LEAD) < 0.5) plan(k, ended);              // 너무 늦은 발사는 건너뜀
    }
    var bi = Math.floor(b - S.st);
    if (bi !== S.lastSpark) {
      if (bi === S.lastSpark + 1 && bi >= 1) sparkles(ended);
      S.lastSpark = bi;
    }
  }

  function stepParts(P, dt) {
    var j = 0, g = S.m * 0.5, i, p;
    for (i = 0; i < P.length; i++) {
      p = P[i];
      p.life -= dt;
      if (p.life <= 0) { S.pool.push(p); continue; }
      var f = Math.exp(-p.drag * dt);                        // 공기저항 → 퍼졌다가 멈칫
      p.vx *= f;
      p.vy = p.vy * f + g * p.g * dt;                        // 중력 → 축 늘어짐
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      P[j++] = p;
    }
    P.length = j;
  }

  function step(b, dt) {
    var P = S.parts, i;
    stepParts(P, dt);

    var R = S.rockets, rj = 0, r;
    for (i = 0; i < R.length; i++) {
      r = R[i];
      if (b >= r.k1) {                                       // 박 도착 → 펑
        if (b - r.k1 < 1) burst(r.style, r.x1, r.y1, r.big, r.c1, r.c2);
        continue;
      }
      var q = clamp((b - r.k0) / (r.k1 - r.k0), 0, 1), e = 1 - (1 - q) * (1 - q);
      r.x = r.x0 + (r.x1 - r.x0) * e; r.y = r.y0 + (r.y1 - r.y0) * e;
      if (P.length < CAP) spawn(3, r.x, r.y, rnd(-15, 15), rnd(10, 50), 0.35, S.m * 0.008, GOLD, 3, 0.6);
      R[rj++] = r;
    }
    R.length = rj;

    // 비눗방울은 위로 둥실, 해파리는 2박마다 오므렸다 펴며 올라감 (화면 비율 단위)
    for (i = 0; i < S.bubs.length; i++) {
      var u = S.bubs[i];
      u.y -= u.sp * dt;
      if (u.y < -0.15) { u.y = 1.15; u.x = Math.random(); }
    }
    for (i = 0; i < S.jels.length; i++) {
      var jl = S.jels[i], k = jellyPulse(b, jl);
      jl.y -= (0.008 + 0.05 * k) * dt;
      jl.x += Math.sin(S.t * 0.4 + jl.ph * 9) * 0.006 * dt;
      if (jl.y < -0.2) { jl.y = 1.2; jl.x = rnd(0.08, 0.92); }
    }
  }

  function jellyPulse(b, jl) {        // 0 → 1(오므림) → 0, 2박 주기
    var q = frac((b - S.st) / 2 + jl.ph);
    return q < 0.3 ? Math.sin(q / 0.3 * Math.PI / 2) : Math.cos((q - 0.3) / 0.7 * Math.PI / 2);
  }

  /* ── 캔버스 그리기 ── */
  function draw(b) {
    var ctx = S.ctx, W = S.W, H = S.H, m = S.m, dpr = S.dpr, P = S.parts, i, d;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';               // 빛끼리 겹치면 더 밝게

    // 별: 반짝반짝
    for (i = 0; i < S.stars.length; i++) {
      var sr = S.stars[i];
      d = m * 0.03 * sr.r;
      ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(S.t * sr.sp + sr.ph));
      ctx.drawImage(S.glow[WHITE], sr.x * W - d / 2, sr.y * H - d / 2, d, d);
    }
    // 비눗방울
    ctx.globalAlpha = 0.85;
    for (i = 0; i < S.bubs.length; i++) {
      var u = S.bubs[i]; d = u.r * m * 2;
      ctx.drawImage(S.bubble, (u.x + 0.02 * Math.sin(S.t * 0.8 + u.ph)) * W - d / 2, u.y * H - d / 2, d, d);
    }
    // 해파리
    for (i = 0; i < S.jels.length; i++) drawJelly(ctx, S.jels[i], b);

    // 충격파 고리: 착지 때 두 겹, 이후 마디 첫박마다 은은하게
    var t = b - S.st;
    ring(ctx, t, 1.6, 0.9, '#ffffff');
    ring(ctx, t - 0.25, 1.4, 0.6, '#ffd6f2');
    if (t >= 4) ring(ctx, t % 4, 1, 0.25, '#e8f4ff');

    drawParts(ctx, P, S.rockets);
  }

  // 입자 그리기 (뒤판 불꽃 캔버스·앞판 탭 캔버스 공용). 호출 전 합성 = lighter, 끝나면 source-over·변환 초기화
  function drawParts(ctx, P, rockets) {
    var m = S.m, dpr = S.dpr, n = P.length, i, p, lf, a, d, ci;
    // 불꽃 꼬리선 (색별로 모아서 한 번에)
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, m * 0.0045);
    ctx.globalAlpha = 0.5;
    for (ci = 0; ci < PAL.length; ci++) {
      var any = false;
      ctx.beginPath();
      for (i = 0; i < n; i++) {
        p = P[i];
        if (p.kind !== 0 || p.col !== ci || p.vx * p.vx + p.vy * p.vy < 400) continue;
        ctx.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.lineTo(p.x, p.y); any = true;
      }
      if (any) { ctx.strokeStyle = PAL[ci]; ctx.stroke(); }
    }
    // 빛 방울
    for (i = 0; i < n; i++) {
      p = P[i];
      if (p.kind === 1 || p.kind === 2) continue;
      lf = p.life / p.max;
      if (p.kind === 5) continue;
      if (p.kind === 4) { a = lf * lf * 0.9 * p.amp; d = p.size * 2 * (1.25 - 0.25 * lf); }
      else {
        a = Math.min(1, lf * 1.8);
        if (p.tw && lf < 0.6 && Math.random() < 0.5) a *= 0.15;   // 글리터 깜빡
        d = p.size * 3.4 * (0.6 + 0.4 * lf);
      }
      ctx.globalAlpha = a;
      ctx.drawImage(S.glow[p.col], p.x - d / 2, p.y - d / 2, d, d);
    }
    // 로켓 머리
    ctx.globalAlpha = 1;
    for (i = 0; rockets && i < rockets.length; i++) {
      var r = rockets[i]; d = m * 0.035;
      ctx.drawImage(S.glow[WHITE], r.x - d / 2, r.y - d / 2, d, d);
    }
    // 반짝이 별 (커졌다 작아지며 빙글)
    for (i = 0; i < n; i++) {
      p = P[i];
      if (p.kind !== 2) continue;
      lf = p.life / p.max;
      d = p.size * Math.sin(Math.PI * (1 - lf));
      if (d < 0.5) continue;
      var c2 = Math.cos(p.rot), s2 = Math.sin(p.rot);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr * c2, dpr * s2, -dpr * s2, dpr * c2, dpr * p.x, dpr * p.y);
      ctx.drawImage(S.star, -d / 2, -d / 2, d, d);
    }
    // 이모지·유리 하트는 원래 색 그대로 보이게 보통 합성으로 (lighter 면 하트가 겹치는 데서 허옇게 타버림)
    ctx.globalCompositeOperation = 'source-over';
    for (i = 0; i < n; i++) {
      p = P[i];
      if (p.kind !== 1 && p.kind !== 5) continue;
      lf = p.life / p.max;
      d = p.size;
      if (p.kind === 5) {                                     // 하트: 처음 0.2초에 퐁 커지고(살짝 넘침) 끝에 서서히 사라짐
        var age = p.max - p.life;
        d *= age < 0.2 ? Math.max(0.05, easeOutBack(age / 0.2)) : 1;
        ctx.globalAlpha = Math.min(1, lf * 3);
      } else ctx.globalAlpha = Math.min(1, lf * 2.5);
      var c3 = Math.cos(p.rot), s3 = Math.sin(p.rot);
      ctx.setTransform(dpr * c3, dpr * s3, -dpr * s3, dpr * c3, dpr * p.x, dpr * p.y);
      ctx.drawImage(p.kind === 5 ? S.hearts[p.spr] : S.emoji[p.spr], -d / 2, -d / 2, d, d);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
  }

  function ring(ctx, t, dur, a0, col) {
    if (t < 0 || t > dur) return;
    var u = t / dur, r0 = 0.5 * Math.sqrt(S.pw * S.pw + S.ph * S.ph);
    ctx.globalAlpha = a0 * Math.pow(1 - u, 1.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = S.m * 0.03 * (1 - u) + 1;
    ctx.beginPath();
    ctx.arc(S.pcx, S.pcy, r0 * 0.8 + u * S.m * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawJelly(ctx, jl, b) {
    var s = jl.s * S.m, X = jl.x * S.W, Y = jl.y * S.H, k = jellyPulse(b, jl);
    var bw = s * (1 - 0.14 * k), bh = s * 0.86 * (1 + 0.12 * k);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffb8e6';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {                            // 하늘하늘 촉수
      var x0 = X + (i - 2) * bw * 0.16, y0 = Y + bh * 0.08;
      ctx.moveTo(x0, y0);
      for (var sg = 1; sg <= 6; sg++) {
        ctx.lineTo(x0 + Math.sin(S.t * 3 + sg * 0.9 + i * 1.3 + jl.ph * 6) * s * 0.06 * sg / 3,
                   y0 + sg * s * 0.2 * (1 - 0.2 * k));
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(S.bell, X - bw / 2, Y - bh * 0.64, bw, bh);
  }

  /* ── 사진 탭: 한 바퀴 더 빙그르르 + 하트 불꽃 펑 (벽시계) ──
     바퀴는 탭마다 하나씩 "더함": 각도 = Σ 360°·f(탭 뒤 경과). f 는 처음 속도 0에서 부드럽게 출발하니
     돌던 중에 또 눌러도 속도가 끊기지 않고 더 빨리 돌 뿐, 끝나면 합이 360의 배수라 반드시 똑바로 멈춤.
     (다시 처음부터 재시작하는 방식은 도는 중 각도가 툭 튀고, 줄 세워 기다리는 방식은 눌렀는데 반응이 늦어서 버림) */
  function spinF(u) {                // 0 → (0.72에서) 1.04 → 1. 앞은 천천히 출발→휙→감속, 뒤는 넘친 14°를 되돌아옴
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    if (u < 0.72) { var v = u / 0.72; return (1 + SPIN_OV) * v * v * (3 - 2 * v); }
    return 1 + SPIN_OV * (0.5 + 0.5 * Math.cos((u - 0.72) / 0.28 * Math.PI));
  }
  function liftF(tau) {              // 붕 떠오름(+1, 0.27초 꼭대기) → 넘친 각도 되돌아올 때 "착" 납작(-0.3, 0.7초)
    if (tau <= 0 || tau >= SPIN_D) return 0;
    if (tau < 0.55) return Math.sin(tau / 0.55 * Math.PI);
    return -0.3 * Math.sin((tau - 0.55) / (SPIN_D - 0.55) * Math.PI);
  }
  function spinState() {
    var a = 0, L = 0, i, tau;
    for (i = 0; i < S.spins.length; i++) {
      tau = S.wt - S.spins[i];
      a += 360 * spinF(tau / SPIN_D);
      L += liftF(tau);
    }
    return { a: a % 360, L: clamp(L, -0.35, 1.2) };
  }

  // (x, y) 가 이 자세의 사진 액자 안인가. 자세 = 사진 가운데 기준 translate(0,dy) rotate(rot) scale(sx,sy) 를 거꾸로 풀어서 봄
  function inPose(x, y, dy, rot, sx, sy, pad) {
    var dx = x - S.pcx, dz = y - (S.pcy + dy), r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    var lx = (c * dx + s * dz) / sx, ly = (-s * dx + c * dz) / sy;
    return Math.abs(lx) <= S.pw / 2 + pad && Math.abs(ly) <= S.ph / 2 + pad;
  }
  function landedNow() { return S.ready && S.on && S.pose && S.W > 0 && S.lastBeat >= S.st; }
  function hit(x, y) {
    if (!landedNow() || !(x === x) || !(y === y)) return false;
    var P = S.pose, pad = S.pw * 0.02;                     // 테두리 살짝 밖(모서리 스티커 반쯤)까지. 옆 고양이를 뺏지 않게 작게
    // 지금 보이는 자세 또는 똑바로 선 자세 둘 중 하나라도 맞으면 인정 (도는 중엔 모서리가 휙휙 지나가서 한 번 더 누르기 어려움)
    return inPose(x, y, P.dy, P.rot, P.sx, P.sy, pad) || inPose(x, y, P.bdy, P.brot, P.bs, P.bs, pad);
  }
  function tap(x, y) {
    if (!hit(x, y)) return false;
    var now = S.wt, busy = 0;
    for (var i = 0; i < S.spins.length; i++) if (now - S.spins[i] < SPIN_D * 0.6) busy++;
    if (busy < SPIN_MAX) S.spins.push(now);                // 이미 여러 바퀴 겹쳐 도는 중이면 바퀴는 그만 더하고 하트만
    S.tapT = now;
    // 하트: 0.2초 안에 또 누르면 가운데 하트 하나만(작게), 아니면 가운데 큰 하트 + 옆 하트 두 개 차례로 (연타 = 입자 폭주 방지)
    var quick = now - S.lastFx < 0.2;
    S.lastFx = now;
    S.tq.push({ at: now, k: quick ? 'mini' : 'main' });
    if (!quick && S.tq.length < 8) {
      var cs = S.pcx, cy = S.pcy, hw = S.pw * 0.5, hh = S.ph * 0.5;
      var spots = [[cs - hw * 0.95, cy - hh * 0.72], [cs + hw * 0.95, cy - hh * 0.72], [cs + hw * 0.9, cy + hh * 0.62], [cs - hw * 0.9, cy + hh * 0.62]];
      var s0 = (Math.random() * 4) | 0, s1 = (s0 + 1 + ((Math.random() * 3) | 0)) % 4;   // 서로 다른 모서리 두 곳
      S.tq.push({ at: now + 0.13, k: 'side', x: spots[s0][0], y: spots[s0][1], c: [GOLD, WHITE] });
      S.tq.push({ at: now + 0.26, k: 'side', x: spots[s1][0], y: spots[s1][1], c: [HOT, 1] });
    }
    return true;
  }

  // 사진 액자의 지금 화면 상자(돌고 기운 것까지 감싸는 외접 사각형)
  function photoRect() {
    if (!S.ready || !S.on || !S.pose || !(S.W > 0) || !(S.photo._o > 0.05)) return null;
    var P = S.pose, r = P.rot * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    var ax = S.pw / 2 * Math.abs(P.sx), ay = S.ph / 2 * Math.abs(P.sy);
    var hx = c * ax + s * ay, hy = s * ax + c * ay, cy = S.pcy + P.dy;
    return { x: S.pcx - hx, y: cy - hy, w: 2 * hx, h: 2 * hy };
  }

  function tRoom(n) { return Math.max(0, Math.min(n, TCAP - S.tp.length)); }   // 꽉 차면 새 하트를 성기게(옛 입자를 지우면 켜져 있던 하트가 툭 꺼짐)

  // 하트 모양 불꽃: 모든 알갱이가 한 점에서 출발해 하트 윤곽의 제자리로 퍼짐 (공기저항 dr → 딱 R 만큼 가서 멈칫)
  // (x, y) = 하트 상자 가운데, R = 반폭×17/16
  function heartRing(x, y, R, n, cA, cB, g, twEvery, life) {
    n = tRoom(n);
    if (n < 3) return;
    var dr = 2.8, v = R * dr / 17, oy = y - 2.5 * R / 17, sz = S.m, P = S.heartPts, i, q, p, lf = life || 1.5;
    for (i = 0; i < n; i++) {
      q = P[Math.floor(i / n * P.length)];
      p = spawn(0, x, oy, q[0] * v, q[1] * v, lf * rnd(0.9, 1.1), sz * rnd(0.012, 0.016), i % 2 ? cA : cB, dr, g);
      if (twEvery && i % twEvery === 0) p.tw = true;
    }
  }
  // 네온사인 하트 선: 알갱이와 같은 속도로 커지는 굵은 하트 윤곽 + 두근두근 두 번.
  //  알갱이만으로는 사진(얼굴·옷 무늬) 위를 지나는 부분이 묻혀서 하트로 안 읽혔음 → 이어진 선이 있어야 한눈에 하트
  function neon(x, y, R, col, dur) {
    if (S.neons.length > 6) S.neons.shift();
    S.neons.push({ x: x, y: y - 2.5 * R / 17, R: R, col: col, t0: S.wt, dur: dur });
  }
  function drawNeons(ctx) {
    var m = S.m, i, j = 0, nz = S.neons;
    for (i = 0; i < nz.length; i++) {
      var z = nz[i], t = S.wt - z.t0;
      if (t >= z.dur) continue;
      nz[j++] = z;
      var grow = 1 - Math.exp(-2.8 * t);                      // 알갱이(공기저항 2.8)와 같은 곡선으로 커짐
      var beat2 = 0.07 * (Math.exp(-Math.pow((t - 0.5) / 0.06, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.72) / 0.06, 2)));   // 두근, 두근
      var k = z.R / 17 * grow * (1 + beat2);
      var a = Math.min(1, t / 0.08) * Math.pow(1 - t / z.dur, 1.3);
      if (k < 0.5 || a < 0.01) continue;
      ctx.setTransform(S.dpr * k, 0, 0, S.dpr * k, S.dpr * z.x, S.dpr * z.y);
      heartPath(ctx, 1, 0, 0);
      ctx.lineJoin = 'round';
      ctx.globalAlpha = a * 0.35; ctx.strokeStyle = z.col; ctx.lineWidth = m * 0.04 / k; ctx.stroke();    // 번짐
      ctx.globalAlpha = a; ctx.lineWidth = m * 0.014 / k; ctx.stroke();                                    // 네온 관
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = m * 0.005 / k; ctx.stroke(); // 흰 심
    }
    nz.length = j;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.globalAlpha = 1;
  }
  function flashAt(x, y, size, amp) {
    if (tRoom(1) < 1) return;
    var p = spawn(4, x, y, 0, 0, 0.32, size, WHITE, 0, 0); p.amp = amp;
  }

  function tapFx(e) {
    S.dst = S.tp;
    try { tapFx2(e); } finally { S.dst = S.parts; }       // 중간에 오류가 나도 박자 불꽃이 탭 목록으로 새지 않게
  }
  function tapFx2(e) {
    var P = S.pose || { dy: 0 }, cx = S.pcx, cy = S.pcy + (P.bdy || 0), m = S.m, i, a, s, p, n;
    if (e.k === 'side') {
      var Rs = Math.min(S.pw * 0.5, S.W * 0.3) / 2 * 17 / 16;
      flashAt(e.x, e.y, Rs * 0.7, 0.8);
      neon(e.x, e.y, Rs, e.c[0] === GOLD ? '#ffc93c' : '#ff3b7a', 1.1);
      heartRing(e.x, e.y, Rs, 40, e.c[0], e.c[1], 0.2, 3);
    } else {
      var main = e.k === 'main';
      // 가운데 하트: 폭 = 사진의 1.55배(세로 화면 ≈ 화면 폭 87%), 화면 밖으로 안 나가게 폭·높이 제한
      var Wd = Math.min(S.pw * (main ? 1.55 : 1.15), S.W * 0.94, S.H * 0.8 * 32 / 29), R = Wd / 2 * 17 / 16;
      flashAt(cx, cy, S.pw * (main ? 0.62 : 0.45), main ? 0.75 : 0.5);   // 사진 위 번쩍 (살짝만 — 사진 얼굴이 하얗게 날아가지 않게)
      neon(cx, cy, R, '#ff3b7a', main ? 1.35 : 1.0);
      heartRing(cx, cy, R, main ? 92 : 56, HOT, 0, 0.12, 0);             // 바깥 하트: 진분홍·분홍
      if (main) heartRing(cx, cy, R * 0.6, 48, GOLD, 4, 0.12, 2, 1.05); // 안쪽 하트: 금색·빨강, 반짝반짝. 얼굴 위를 지나가니 빨리 꺼지게
      // 말랑 유리 하트 스티커가 사방으로 퐁퐁 → 둥실 떠오름(음의 중력)
      n = tRoom(main ? 10 : 4);
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (i / Math.max(1, n) - 0.5) * Math.PI * 1.9 + rnd(-0.15, 0.15);
        s = m * rnd(0.55, 0.95);
        p = spawn(5, cx, cy, Math.cos(a) * s * 1.6, Math.sin(a) * s * 1.6, rnd(1.5, 2.1), m * rnd(0.075, 0.11), 0, 2.2, rnd(-0.32, -0.12));
        p.spr = i % 3; p.rot = rnd(-0.5, 0.5); p.vr = rnd(-1.6, 1.6);
      }
      // 사진 둘레 반짝이 별
      n = tRoom(main ? 8 : 3);
      for (i = 0; i < n; i++) {
        a = i / n * Math.PI * 2 + rnd(-0.3, 0.3);
        p = spawn(2, cx + Math.cos(a) * S.pw * 0.55, cy + Math.sin(a) * S.ph * 0.52,
                  Math.cos(a) * m * 0.12, Math.sin(a) * m * 0.12, rnd(0.5, 0.75), m * rnd(0.07, 0.1), WHITE, 2, 0);
        p.rot = rnd(0, 1); p.vr = rnd(-2, 2);
      }
    }
  }

  // 매 프레임: 예약된 하트 터뜨리기 → 입자 움직이기 → 앞판 캔버스 그리기 (입자 없으면 한 번 비우고 숨김)
  function tapFrame(dt) {
    var i, j = 0, q = S.tq;
    for (i = 0; i < q.length; i++) { if (q[i].at <= S.wt) tapFx(q[i]); else q[j++] = q[i]; }
    q.length = j;
    for (i = 0, j = 0; i < S.spins.length; i++) if (S.wt - S.spins[i] < SPIN_D) S.spins[j++] = S.spins[i];
    S.spins.length = j;                                    // 다 돈 바퀴(=360°, 안 보임)는 빼기

    var P = S.tp, ctx = S.ctx2, dpr = S.dpr;
    if (P.length) stepParts(P, dt);
    if (P.length || S.neons.length) {
      if (!S.cv2On) { S.cv2.style.display = 'block'; S.cv2On = true; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, S.W, S.H);
      drawNeons(ctx);                                      // 선 먼저, 알갱이가 그 위에서 반짝
      ctx.globalCompositeOperation = 'lighter';
      drawParts(ctx, P, null);
    } else if (S.cv2On) clearTap(false);
  }
  function clearTap(all) {
    for (var i = 0; i < S.tp.length; i++) S.pool.push(S.tp[i]);
    S.tp.length = 0; S.neons.length = 0;
    if (all) { S.tq.length = 0; S.spins.length = 0; S.tapT = -1e9; S.lastFx = -1e9; }
    if (S.ctx2) { S.ctx2.setTransform(1, 0, 0, 1, 0, 0); S.ctx2.clearRect(0, 0, S.cv2.width, S.cv2.height); }
    S.cv2.style.display = 'none'; S.cv2On = false;
  }

  /* ── 표시/숨김·되감기 ── */
  function show(b) {
    S.on = true;
    S.bRoot.style.display = 'block';
    S.fRoot.style.display = 'block';
    S.W = -1;                           // 다음 줄에서 배치 새로
    S.lastBeat = b;
    S.landed = false; S.nextK = 0; S.lastSpark = Math.floor(b - S.st);
  }
  function hide() {
    S.on = false;
    S.bRoot.style.display = 'none';
    S.fRoot.style.display = 'none';
    clearParts();
    clearTap(true);
    S.pose = null;
    S.landed = false;
    if (S.willOn) { setWill(''); S.willOn = false; }
    if (S.ctx && S.cv.width) { S.ctx.setTransform(1, 0, 0, 1, 0, 0); S.ctx.clearRect(0, 0, S.cv.width, S.cv.height); }
  }

  /* ── 매 프레임 ── */
  function frame(c) {
    if (!S.ready || !c) return;
    var b = +c.beat, st = +c.start;
    // 피날레 전(= 거의 모든 시간): 아무것도 안 함. 노래가 처음부터 다시 시작돼도 여기서 싹 숨김
    if (!(b >= st - 2)) {
      if (S.on) hide();
      // 등장 몇 박 전에 사진 디코딩을 미리 해둠 → 돌기 시작한 첫 프레임에 빈 액자가 안 보이게 (한 번만)
      if (b >= st - 8 && !S.warm) { S.warm = true; if (S.img.decode) S.img.decode().catch(function () {}); }
      else if (b < st - 8) S.warm = false;
      S.lastBeat = b;
      return;
    }
    S.st = st;
    var W = c.W, H = c.H;
    if (!(W > 0 && H > 0)) return;
    var tall = typeof c.tall === 'boolean' ? c.tall : H > W * 1.05;
    if (!S.on) show(b);
    if (W !== S.W || H !== S.H || tall !== S.tall || Math.min(window.devicePixelRatio || 1, 2) !== S.dpr) relayout(W, H, tall);

    var dt = +c.dt;
    if (!(dt > 0)) dt = 0;
    S.wt += Math.min(dt, 0.1);          // 탭 효과용 벽시계(초). 입자용 dt 와 달리 0.05로 안 자름 → 느린 폰에서도 한 바퀴가 0.85초 안에 끝남
    if (dt > 0.05) dt = 0.05;           // 탭 전환 뒤 큰 dt → 입자가 순간이동하지 않게

    if (b < S.lastBeat - 0.25) {        // 되감기(피날레 안에서 뒤로): 입자 비우고 다시 박 맞춤
      clearParts();
      clearTap(true);
      S.landed = false;
      S.lastSpark = Math.floor(b - st);
    } else if (b - S.lastBeat > 2) {    // 크게 건너뜀: 밀린 폭죽은 몰아서 쏘지 않음
      S.nextK = Math.ceil(b + LEAD);
      S.lastSpark = Math.floor(b - st);
    }
    S.lastBeat = b;
    S.t += dt;

    tapFrame(dt);                       // 사진 자세(updPhoto)보다 먼저: 다 돈 바퀴를 여기서 빼야 이번 프레임 각도가 맞음
    updPhoto(b);
    updBg(b);
    updText(b);
    updFlash(b, !!c.ended);

    if (b >= st) {
      schedule(b, !!c.ended);
      step(b, dt);
      draw(b);
      S.cvDirty = true;
    } else if (S.cvDirty !== false) {   // 회전 등장 중(하늘은 아직 흰색): 캔버스는 한 번만 비우고 쉼
      clearParts();
      S.ctx.setTransform(1, 0, 0, 1, 0, 0);
      S.ctx.clearRect(0, 0, S.cv.width, S.cv.height);
      S.cvDirty = false;
    }
  }

  window.Finale = { init: init, frame: frame, tap: tap, hit: hit, photoRect: photoRect };
})();
