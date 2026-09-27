/* ────────────────────────────────────────────────────────────────────
   candle.js — 피날레 촛불 끄기 (클래식 스크립트, 외부 라이브러리·네트워크 없음)

   유저 요청(2026-09-27): "촛불 끄기 좋아보임. 피날레에 촛불이 아래에 같이 나오는 게 자연스러울 것 같아.
     촛불을 누르면 권한요청이 나오고 수락한 뒤 바람 불면(혹은 PC에선 마우스로 누르면)
     화면 어두워지면서 '평생 가자 사룽하는 여부야!' 문구 나오면 좋을 것 같아"

   ① 사진이 착지하고 6박 뒤, 사진 아래 빈자리에 케이크가 "퐁" 튀어나옴 (촛불 3개 흔들흔들, 박마다 살짝 찌그러짐)
   ② 케이크(촛불)를 누르면
        · 폰: 마이크 권한 요청 → 허용하면 주변 소리 0.4초 재고 → "후~" 바람(낮은 소리가 크게, 0.2초 넘게)이면 꺼짐.
              부는 동안 불꽃이 소리 크기만큼 눕고 파르르 떪 = "지금 부는 게 먹히고 있어" 신호.
              마이크 기능이 아예 없거나 권한창 없이 바로 거절되면 → 그 탭으로 바로 끔(헛탭 방지)
              거절·12초 동안 못 알아들음·권한창이 영영 안 닫힘 → 한 번 더 누르면 끔
        · PC(마우스, 터치 없음): 누르는 순간 꺼짐
   ③ 꺼지면: 불꽃이 훅 눕고 사라짐 → 연기 몽글 → 화면 전체가 보랏빛 도는 까만색으로 → 문구가 한 글자씩 스르르 떠오름
      + 반짝이 몇 개가 천천히 둥실. 자동으로 안 끝나고 그대로 머묾.

   엔진 사용법:
     Candle.init(container, opts)  한 번. container = 전체화면 fixed div (피날레 글자·동물보다 위, 디버그바·↻보다 아래)
                                    opts = { sfx(name, vol) }  (선택) 페이지 효과음
                                           { audio }           (선택) 배경음악 <audio>. 없으면 #bgm 을 찾음
     Candle.frame(c)               매 프레임. c = { beat, start, W, H, tall, dt, ended }
     Candle.state()                'hidden' | 'idle' | 'asking' | 'calib' | 'listen' | 'fallback' | 'out'
     Candle.blow()                 (검증용) 지금 바로 끄기

   원칙: 등장 모양은 박자(c.beat)의 함수(되감아도 같은 장면). 끄기 연출은 실제 시간(dt 누적) — 음악이 끝난 뒤에도 흘러야 해서.
         c.beat < start+6 (되감기·↻ 다시보기) 이면 싹 숨기고 처음 상태로, 마이크도 즉시 반납.
   탭 분배: 케이크 히트 박스에 .cd-hit 클래스 → 엔진의 화면 탭 분배(사진 한 바퀴·모자 날리기)가 이 탭은 건드리지 않음.
   ──────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ★문구: 한 글자도 고치지 말 것. "사룽하는" 은 일부러(맞춤법 교정 금지)
  var MSG = '평생 가자 사룽하는 여부야!';
  var BRK = MSG.indexOf('사룽');
  var LINES_1 = [MSG];
  // 두 줄일 땐 말의 호흡대로 "평생 가자 " / "사룽하는 여부야!" (첫 줄 끝 띄어쓰기는 남겨 둠 → textContent 가 원문과 똑같음)
  // 브라우저 자동 줄바꿈에 맡기면 좁은 폰에서 "평생 가자 사룽하는" / "여부야!" 로 끊겨 어색해서 직접 나눔
  var LINES_2 = [MSG.slice(0, BRK), MSG.slice(BRK)];

  var FONT = '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
  var STAR = 'M0-50C4-14 14-4 50 0 14 4 4 14 0 50-4 14-14 4-50 0-14-4-4-14 0-50Z';   // 페이지 곳곳의 네 갈래 별과 같은 모양

  // ── 타이밍 ──
  var APPEAR = 6;        // start+6박에 케이크 등장: 착지·첫 불꽃 러시가 지나고 사진을 충분히 본 다음 (바로 나오면 사진 착지와 시선이 갈림)
  var POPB = 1.1;        // 퐁 튀어나오는 데 걸리는 박
  var HINT_AT = 9;       // 안내 말풍선: 케이크 등장 3박 뒤 (같이 뜨면 정신없음)
  var CALIB = 0.4;       // 주변 소리 재는 시간(초)
  var HOLD = 0.2;        // 이만큼(초) 계속 세게 불어야 꺼짐 — 불꽃놀이 "펑"(짧음)·말소리 한 음절로는 안 꺼지게
  var LISTEN_MAX = 12;   // 이 시간 동안 못 알아들으면 마이크 반납하고 "콕 누르면 꺼져!"
  var GRACE = 2.5;       // 첫 탭 후 이만큼 지나면 다시 탭으로도 끌 수 있음 (연타 한 번에 바로 꺼져 버리면 불 기회가 없어서)
  var ASK_SLOW = 5;      // 권한창 응답이 이만큼 없으면 안내를 "콕 누르면 꺼져!"로 (권한창이 영영 안 닫히는 웹뷰 대비)
  var DEAD = 1.5;        // 마이크 신호가 완전한 0 으로만 이만큼 오면 오디오 연결이 고장난 것(진짜 마이크는 늘 잡음이 있음)
  var QUICK_DENY = 0.7;  // 탭 후 이 안에 거절 = 권한창도 안 뜨고 막힌 것(안드로이드 웹뷰 기본값·OS에서 막힘) → 헛탭 안 되게 바로 끔
  var GUST = 0.22, OUTF = 0.2;             // 끄기: 불꽃이 훅 눕는 시간 → 줄어들며 사라지는 시간
  var DARK0 = 0.55, DARKD = 1.25;          // 화면 어두워지기 시작·걸리는 시간 (연기가 막 피어오를 때부터)
  var TEXT0 = 1.9, LDELAY = 0.085, LDUR = 1.1, WORD_GAP = 0.12, LINE_GAP = 0.3;   // 문구: 한 글자씩, 낱말·구절 사이엔 숨 한 번
  var SPARK0 = 2.6;                        // 반짝이는 문구가 반쯤 나왔을 때부터
  var SMOKE = 2.4;                         // 연기 한 가닥 수명(초)

  // ── 케이크 그림 좌표계 (SVG viewBox). 불꽃 꼭대기(≈24)부터 접시 그림자(≈188)까지 ──
  var VBX = 0, VBY = 14, VBW = 200, VBH = 174;
  var CX = 100, TOPY = 98, RX = 80, RY = 19, BOTY = 150;    // 케이크 원기둥: 윗면 타원 중심·반지름, 아랫면 높이
  var CH = 36, WK = 5;                                        // 초 길이, 심지 길이
  // 촛불 3개 (가운데 초가 윗면 뒤쪽이라 먼저 그림). c = 줄무늬 색
  var CANDLES = [
    { x: 100, y: 89, c: '#78d3ff' },
    { x: 70, y: 96, c: '#ff8fc6' },
    { x: 130, y: 96, c: '#ffd23f' },
  ];

  var S = { ready: false };

  /* ── 작은 도구들 ── */
  function noop() {}
  function wall() { try { return performance.now(); } catch (e) { return Date.now(); } }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function frac(v) { return v - Math.floor(v); }
  function n2(v) { return Math.round(v * 100) / 100; }   // 1e-7 같은 지수표기가 transform 에 들어가면 통째로 무시됨
  function easeOutBack(u) { var c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
  function easeOut3(u) { return 1 - Math.pow(1 - u, 3); }
  function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function el(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  // 값이 바뀔 때만 씀 (매 프레임 같은 값 쓰기 = 쓸데없는 스타일 재계산)
  function setOp(e, v) { v = Math.round(v * 1000) / 1000; if (e._o !== v) { e._o = v; e.style.opacity = v; } }
  function setTf(e, v) { if (e._t !== v) { e._t = v; e.style.transform = v; } }
  function setAt(e, k, v) { var c = '_a' + k; if (e[c] !== v) { e[c] = v; e.setAttribute(k, v); } }
  function edgeY(x, cy) { var u = (x - CX) / RX; return cy + RY * Math.sqrt(Math.max(0, 1 - u * u)); }   // 원기둥 앞쪽 테두리
  function sfx(name, vol) { try { if (S.opts && typeof S.opts.sfx === 'function') S.opts.sfx(name, vol); } catch (e) {} }

  var CSS =
    '.cd-root{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;display:none}' +
    '.cd-probe{position:absolute;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none}' +
    // 케이크 = 유일하게 눌리는 곳. 기준점 = 접시 바닥 가운데(퐁·박 찌그러짐이 바닥에서 일어나게)
    '.cd-hit{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;' +
      'touch-action:manipulation;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}' +
    // ↑ will-change:transform 일부러 안 씀: 퐁(크기 0→1) 중에 레이어로 올리면 크롬이 작은 크기로 래스터를 굳혀 케이크가 흐리게 남음(finale.js 사진과 같은 함정).
    //   어차피 불꽃이 매 프레임 SVG 를 다시 그려서 레이어로 올려 얻는 것도 없음
    '.cd-hit.off{pointer-events:none;cursor:default}' +
    '.cd-svg{position:absolute;display:block;overflow:visible;pointer-events:none}' +
    // 안내 말풍선: 프루티거 에어로 알약 버튼(위 반 광택 + 아쿠아 아랫단)
    '.cd-hint{position:absolute;left:0;top:0;opacity:0;transition:opacity .35s;pointer-events:none;white-space:nowrap}' +
    '.cd-hint.on{opacity:1}' +
    '.cd-hb{display:inline-block;padding:0 .85em;border-radius:999px;font-family:' + FONT + ';font-weight:800;color:#4a2386;letter-spacing:-.01em;' +
      'background:linear-gradient(180deg,#ffffff 0%,#eefaff 46%,#bfeeff 54%,#e3f8ff 100%);border:1.5px solid rgba(255,255,255,.95);' +
      'box-shadow:0 2px 8px rgba(40,10,90,.38),inset 0 -2px 3px rgba(90,170,255,.35),0 0 12px rgba(160,230,255,.55);' +
      'text-shadow:0 1px 0 #fff;animation:cdBob 1.6s ease-in-out infinite}' +
    '.cd-hint.mic .cd-hb{background:linear-gradient(180deg,#ffffff 0%,#fff0f8 46%,#ffc9e6 54%,#ffe6f4 100%);' +
      'box-shadow:0 2px 8px rgba(40,10,90,.38),inset 0 -2px 3px rgba(255,120,190,.35),0 0 14px rgba(255,170,220,.7);animation-duration:.9s}' +
    '@keyframes cdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}' +
    // 끈 뒤: 보랏빛 도는 거의 검정 (가운데 문구 자리만 아주 살짝 덜 어둡게 → 촛불 끈 방의 잔광)
    '.cd-dark{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;display:none;' +
      'background:radial-gradient(ellipse 95% 70% at 50% 47%,rgba(40,20,66,.93) 0%,rgba(17,8,32,.955) 55%,rgba(6,3,14,.975) 100%)}' +
    '.cd-msg{position:absolute;left:0;top:0;width:100%;text-align:center;display:none;color:#fff8ea;font-family:' + FONT + ';' +
      'font-weight:700;letter-spacing:.03em;line-height:1.35;word-break:keep-all;' +
      'text-shadow:0 0 .16em rgba(255,240,200,.95),0 0 .45em rgba(255,205,120,.62),0 0 1em rgba(255,150,110,.38)}' +
    '.cd-txt{position:relative}' +
    '.cd-line{display:block}' +
    '.cd-w{display:inline-block;white-space:nowrap}' +
    '.cd-c{display:inline-block;opacity:0}' +
    '.cd-halo{position:absolute;left:50%;top:50%;border-radius:50%;opacity:0;transition:opacity 2.2s;' +
      'background:radial-gradient(closest-side,rgba(255,196,130,.24),rgba(255,160,210,.09) 62%,rgba(255,160,210,0))}' +
    '.cd-msg.on .cd-halo{opacity:1;animation:cdBreath 5s ease-in-out 2.4s infinite}' +
    '@keyframes cdBreath{0%,100%{opacity:1}50%{opacity:.5}}' +
    '.cd-sps{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;transition:opacity 1.8s;display:none}' +
    '.cd-sps.on{opacity:1}' +
    '.cd-sp{position:absolute;animation:cdFloat 6s ease-in-out infinite}' +
    '.cd-sp svg{display:block;width:100%;height:100%;overflow:visible;animation:cdTw 2.8s ease-in-out infinite}' +
    '@keyframes cdFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(3px,-10px)}}' +
    '@keyframes cdTw{0%,100%{opacity:.2;transform:scale(.5) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(22deg)}}';

  /* ── 케이크 SVG ── 바닐라 시트 + 딸기우유 글레이즈(흘러내림) + 진주 설탕 + 방울토마토 2알(토마토 좋아하는 여부 몫) + 줄무늬 초 3개
     + 유리 케이크 접시(프루티거 에어로). 그라데이션 id 는 cd 로 시작 (페이지 안에서 겹치지 않게) */
  function arcPath(cy, x0, x1, dy) {   // 원기둥 앞쪽 테두리를 따라가는 선 (광택 줄용)
    var d = '';
    for (var x = x0; x <= x1; x += 2) d += (d ? 'L' : 'M') + x + ' ' + n2(edgeY(x, cy) + (dy || 0));
    return d;
  }
  function icingPath() {
    // 윗면 뒤쪽 반 타원 + 앞쪽 테두리 아래로 흘러내린 방울들(반타원 모양 = 끝이 동그란 물방울)
    var D = [[33, 11, 5.5], [50, 19, 6.2], [71, 9, 5], [93, 23, 6.8], [116, 12, 5.6], [137, 20, 6.4], [158, 10, 5.2], [173, 6, 4]];
    var rx = RX + 1, d = 'M' + (CX - rx) + ' ' + TOPY + 'A' + rx + ' ' + (RY + 1) + ' 0 0 1 ' + (CX + rx) + ' ' + TOPY;
    for (var x = CX + rx; x >= CX - rx; x -= 1) {
      var u = (x - CX) / rx, y = TOPY + (RY + 1) * Math.sqrt(Math.max(0, 1 - u * u)) + 5;
      for (var k = 0; k < D.length; k++) {
        var v = (x - D[k][0]) / D[k][2];
        if (v > -1 && v < 1) y += D[k][1] * Math.sqrt(1 - v * v);
      }
      d += 'L' + x + ' ' + n2(y);
    }
    return { d: d + 'Z', drips: D };
  }
  function cakeSVG() {
    var s = '<defs>' +
      '<linearGradient id="cdSponge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6"/><stop offset="1" stop-color="#ffd48a"/></linearGradient>' +
      // 원기둥 입체감: 양끝 어둡게, 왼쪽 1/3 에 흰 광택
      '<linearGradient id="cdShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a4a2a" stop-opacity=".3"/><stop offset=".2" stop-color="#9a4a2a" stop-opacity="0"/>' +
        '<stop offset=".33" stop-color="#fff" stop-opacity=".42"/><stop offset=".47" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#9a4a2a" stop-opacity="0"/><stop offset="1" stop-color="#9a4a2a" stop-opacity=".34"/></linearGradient>' +
      '<linearGradient id="cdIcing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3d9"/><stop offset=".55" stop-color="#ff6fb3"/><stop offset="1" stop-color="#ec3d90"/></linearGradient>' +
      '<radialGradient id="cdTop" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="#ffe3f1"/><stop offset=".55" stop-color="#ffa3d1"/><stop offset="1" stop-color="#ff74b7"/></radialGradient>' +
      '<linearGradient id="cdCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#efe3ff"/></linearGradient>' +
      '<radialGradient id="cdDollop" cx=".38" cy=".3" r=".72"><stop offset="0" stop-color="#ffffff"/><stop offset=".68" stop-color="#fbf5ff"/><stop offset="1" stop-color="#dccbf2"/></radialGradient>' +
      '<linearGradient id="cdPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".44" stop-color="#d8f7ff"/><stop offset=".52" stop-color="#8edbff"/><stop offset="1" stop-color="#c6f1ff"/></linearGradient>' +
      '<radialGradient id="cdShadow"><stop offset="0" stop-color="#1c0838" stop-opacity=".55"/><stop offset="1" stop-color="#1c0838" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cdGlow"><stop offset="0" stop-color="#ffe9ad" stop-opacity=".8"/><stop offset=".45" stop-color="#ffc58a" stop-opacity=".28"/><stop offset="1" stop-color="#ffb07a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cdHalo"><stop offset="0" stop-color="#fff4b8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffc766" stop-opacity=".42"/><stop offset="1" stop-color="#ff9a4d" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cdFlame" cx=".5" cy=".8" r=".78" fx=".5" fy=".86"><stop offset="0" stop-color="#ffffff"/><stop offset=".26" stop-color="#fff6b4"/>' +
        '<stop offset=".58" stop-color="#ffc23d"/><stop offset=".86" stop-color="#ff7a2f"/><stop offset="1" stop-color="#ff5a3a"/></radialGradient>' +
      '<radialGradient id="cdTom" cx=".36" cy=".32" r=".78"><stop offset="0" stop-color="#ffb3a3"/><stop offset=".36" stop-color="#ff4a3a"/><stop offset="1" stop-color="#b30f1c"/></radialGradient>';
    CANDLES.forEach(function (k, i) {   // 사탕 줄무늬
      s += '<pattern id="cdS' + i + '" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-34)">' +
        '<rect width="8" height="8" fill="#fffaf3"/><rect width="4" height="8" fill="' + k.c + '"/></pattern>';
    });
    s += '</defs>';

    // 접시: 그림자 → 두께 → 윗면 → 앞쪽 광택 줄
    s += '<ellipse cx="100" cy="181" rx="92" ry="7.5" fill="url(#cdShadow)"/>' +
      '<ellipse cx="100" cy="164" rx="96" ry="20" fill="#56bde8"/>' +
      '<ellipse cx="100" cy="159.5" rx="96" ry="20" fill="url(#cdPlate)" stroke="#ffffff" stroke-width="1.3"/>' +
      '<path d="' + arcPathE(100, 164, 96, 20, 12, 70, -1.5) + '" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>';
    // 시트 몸통 + 입체 음영
    var body = 'M20 ' + TOPY + 'V' + BOTY + 'A' + RX + ' ' + RY + ' 0 0 0 180 ' + BOTY + 'V' + TOPY + 'Z';
    s += '<path d="' + body + '" fill="url(#cdSponge)"/><path d="' + body + '" fill="url(#cdShade)"/>';
    // 가운데 생크림 띠 + 진주 설탕
    s += '<path d="M20 121A80 19 0 0 0 180 121V130A80 19 0 0 1 20 130Z" fill="url(#cdCream)"/>';
    var PEARL = ['#8fe3ff', '#ffe066', '#c9a8ff', '#ff9fd0'];
    for (var x = 26, j = 0; x <= 174; x += 12, j++) {
      var py = n2(edgeY(x, 125.5));
      s += '<circle cx="' + x + '" cy="' + py + '" r="2.4" fill="' + PEARL[j % 4] + '"/><circle cx="' + (x - 0.8) + '" cy="' + n2(py - 0.8) + '" r=".8" fill="#fff"/>';
    }
    // 아래 테두리 생크림 짜기 (가장자리부터 그려서 가운데가 앞에 오게)
    var dol = [];
    for (x = 24; x <= 176; x += 11) dol.push(x);
    dol.sort(function (a, b) { return Math.abs(b - CX) - Math.abs(a - CX); });
    dol.forEach(function (x) { s += '<circle cx="' + x + '" cy="' + n2(edgeY(x, BOTY) - 1.5) + '" r="5.6" fill="url(#cdDollop)"/>'; });
    // 딸기우유 글레이즈 + 윗면 + 광택
    var ic = icingPath();
    s += '<path d="' + ic.d + '" fill="url(#cdIcing)"/>' +
      '<ellipse cx="' + CX + '" cy="' + TOPY + '" rx="' + RX + '" ry="' + RY + '" fill="url(#cdTop)"/>' +
      '<path d="' + arcPath(TOPY, 28, 74, 3.2) + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>' +
      '<ellipse cx="72" cy="90" rx="27" ry="5" transform="rotate(-7 72 90)" fill="#fff" opacity=".55"/>' +
      '<circle cx="137" cy="89.5" r="2.4" fill="#fff" opacity=".75"/>';
    ic.drips.forEach(function (q) {   // 흘러내린 방울마다 작은 반사광
      if (q[1] < 9) return;
      var dy = edgeY(q[0], TOPY) + 5 + q[1] * 0.62;
      s += '<ellipse cx="' + n2(q[0] - q[2] * 0.38) + '" cy="' + n2(dy) + '" rx="1" ry="' + n2(q[1] * 0.2) + '" fill="#fff" opacity=".65"/>';
    });
    // 스프링클 (초·토마토 자리 피해서 고정 배치)
    var SPR = [[44, 96, 30], [56, 104, -40], [58, 89, 70], [84, 86, -20], [90, 99, 45], [112, 95, -60], [118, 85, 15],
               [143, 89, -35], [151, 101, 60], [158, 94, 10], [39, 103, -10], [104, 104, 80], [132, 106, -25], [79, 97, 5]];
    var SPC = ['#6fd8ff', '#ffe45c', '#ffffff', '#b89bff', '#7fe0a0', '#ff9a3d'];
    SPR.forEach(function (q, i) {
      s += '<rect x="' + (q[0] - 2.4) + '" y="' + (q[1] - 0.85) + '" width="4.8" height="1.7" rx=".85" fill="' + SPC[i % SPC.length] + '" transform="rotate(' + q[2] + ' ' + q[0] + ' ' + q[1] + ')"/>';
    });
    // 촛불 빛이 케이크 윗면을 데우는 번짐 (끄면 사라짐)
    s += '<ellipse class="cd-glow" cx="100" cy="66" rx="94" ry="54" fill="url(#cdGlow)"/>';
    // 초
    CANDLES.forEach(function (k, i) {
      s += '<g transform="translate(' + k.x + ' ' + k.y + ')">' +
        '<ellipse cx="0" cy="0" rx="6.5" ry="2" fill="#b3155f" opacity=".35"/>' +
        '<rect x="-5" y="' + (-CH) + '" width="10" height="' + CH + '" rx="2" fill="url(#cdS' + i + ')"/>' +
        '<rect x="-3.6" y="' + (-CH + 1.5) + '" width="2.3" height="' + (CH - 4) + '" rx="1.1" fill="#fff" opacity=".6"/>' +
        '<ellipse cx="0" cy="' + (-CH) + '" rx="5" ry="1.5" fill="#fffdf6"/>' +
        '<path d="M0 ' + (-CH) + 'q.8 -2.6 -.3 -' + WK + '" fill="none" stroke="#4d3226" stroke-width="1.5" stroke-linecap="round"/>' +
        '</g>';
    });
    // 방울토마토 2알 (앞쪽이라 초 다음에)
    [[84, 108.5, 8.5, -8], [119, 110.5, 8, 10]].forEach(function (t) {
      var r = t[2], cal = '';
      for (var k = 0; k < 10; k++) {
        var a = (-90 + k * 36) * Math.PI / 180, rr = k % 2 ? 1.5 : 4.3;
        cal += (k ? 'L' : 'M') + n2(Math.cos(a) * rr) + ' ' + n2(Math.sin(a) * rr - r * 0.8);
      }
      s += '<g transform="translate(' + t[0] + ' ' + t[1] + ') rotate(' + t[3] + ')">' +
        '<ellipse cx="0" cy="' + n2(r * 0.86) + '" rx="' + n2(r * 0.9) + '" ry="2.2" fill="#a0104f" opacity=".35"/>' +
        '<circle r="' + r + '" fill="url(#cdTom)"/>' +
        '<ellipse cx="' + n2(-r * 0.36) + '" cy="' + n2(-r * 0.38) + '" rx="' + n2(r * 0.3) + '" ry="' + n2(r * 0.19) + '" transform="rotate(-32 ' + n2(-r * 0.36) + ' ' + n2(-r * 0.38) + ')" fill="#fff" opacity=".8"/>' +
        '<path d="' + cal + 'Z" fill="#45b84b" stroke="#2a8a36" stroke-width=".5" stroke-linejoin="round"/>' +
        '<path d="M0 ' + n2(-r * 0.8) + 'l.6 -2.6" stroke="#2a8a36" stroke-width="1.2" stroke-linecap="round"/>' +
        '</g>';
    });
    // 불꽃·후광·잔불·연기·훅 (좌표는 매 프레임 JS 가 transform 으로)
    CANDLES.forEach(function (k, i) {
      s += '<g class="cd-f' + i + '">' +
        '<ellipse class="cd-ha" cx="0" cy="-9" rx="15" ry="19" fill="url(#cdHalo)"/>' +
        '<g class="cd-fl"><path d="M0-24C2.6-18 8-12 8-5.5C8-.5 4.6 3 0 3C-4.6 3-8-.5-8-5.5C-8-12-2.6-18 0-24Z" fill="url(#cdFlame)"/>' +
          '<path d="M0-12.5C1.4-9.5 4-6.5 4-3.6C4-.6 2.2 1.2 0 1.2C-2.2 1.2-4-.6-4-3.6C-4-6.5-1.4-9.5 0-12.5Z" fill="#fffdf0" opacity=".92"/>' +
          '<ellipse cx="0" cy=".6" rx="2.6" ry="2" fill="#8fc4ff" opacity=".55"/></g>' +
        '<circle class="cd-em" cx="0" cy="0" r="1.7" fill="#ffae5c" opacity="0"/>' +
        '<circle class="cd-pf" r="2" fill="#f4efff" opacity="0"/><circle class="cd-pf" r="2" fill="#f4efff" opacity="0"/><circle class="cd-pf" r="2" fill="#f4efff" opacity="0"/>' +
        '<path class="cd-sm" d="M0 0C4-7-4-13 0-20S4-33 0-40S-4-53 0-60" fill="none" stroke="#efeaff" stroke-width="1.8" stroke-linecap="round" opacity="0"/>' +
        '<path class="cd-sm" d="M0 0C-4-7 4-13 0-20S-4-33 0-40S4-53 0-60" fill="none" stroke="#e6ddff" stroke-width="1.5" stroke-linecap="round" opacity="0"/>' +
        '</g>';
    });
    return '<svg class="cd-svg" viewBox="' + VBX + ' ' + VBY + ' ' + VBW + ' ' + VBH + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + s + '</svg>';
  }
  function arcPathE(cx, cy, rx, ry, x0, x1, dy) {   // 임의 타원 앞쪽 테두리 따라가는 선 (접시 광택)
    var d = '';
    for (var x = x0; x <= x1; x += 2) {
      var u = (x - cx) / rx;
      d += (d ? 'L' : 'M') + x + ' ' + n2(cy + ry * Math.sqrt(Math.max(0, 1 - u * u)) + dy);
    }
    return d;
  }

  /* ── 초기화 ── */
  function init(container, opts) {
    if (S.ready || !container) return;
    try {
      S.opts = opts || {};
      var style = document.createElement('style');
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);

      S.probe = el('div', 'cd-probe', container);   // env(safe-area-inset-bottom) 값을 JS 로 읽으려는 빈 상자
      var R = S.root = el('div', 'cd-root', container);

      var hit = S.hit = el('div', 'cd-hit', R);
      hit.setAttribute('role', 'button');
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('aria-label', '케이크 촛불 끄기');
      hit.innerHTML = cakeSVG();
      S.svg = hit.firstChild;
      S.glow = S.svg.querySelector('.cd-glow');
      S.fl = CANDLES.map(function (k, i) {
        var g = S.svg.querySelector('.cd-f' + i);
        var sm = g.querySelectorAll('.cd-sm'), pf = g.querySelectorAll('.cd-pf');
        var o = { g: g, halo: g.querySelector('.cd-ha'), fl: g.querySelector('.cd-fl'), em: g.querySelector('.cd-em'),
                  sm: [sm[0], sm[1]], pf: [pf[0], pf[1], pf[2]], x: k.x, oy: k.y - CH - 3, wy: k.y - CH - WK, smL: [] };
        o.sm.forEach(function (p) {
          var L = 90;
          try { L = p.getTotalLength() || 90; } catch (e) {}
          o.smL.push(L);
          p.setAttribute('stroke-dasharray', n2(L) + ' ' + n2(L));
        });
        o.em.setAttribute('cx', k.x); o.em.setAttribute('cy', o.wy);
        return o;
      });

      // click: 폰에서도 탭 = click. 아이폰은 click 리스너가 요소 자신에 있어야 탭을 click 으로 보내 줌.
      //  (touchstart 는 아이폰이 오디오 잠금 해제 제스처로 안 쳐서 AudioContext.resume 이 안 먹힘 → click 으로 통일)
      hit.addEventListener('click', onTap);
      hit.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { try { e.preventDefault(); } catch (x) {} onTap(e); }
      });

      var hint = S.hint = el('div', 'cd-hint', R);
      S.hintB = el('span', 'cd-hb', hint);
      S.dark = el('div', 'cd-dark', R);
      // 유저 요청: 촛불 끈 뒤 어두운 화면을 톡 누르면 막+문구+반짝이가 같이 스르르 사라지고 밝은 피날레로 돌아감.
      //  문구를 다 읽기 전에 실수로 닫히지 않게, 문구가 다 나오고 DISMISS_WAIT 초 뒤부터만 반응
      S.dark.addEventListener('click', function (e) {
        try { e.stopPropagation(); } catch (x) {}
        if (S.state !== 'out' || S.dismissT >= 0 || !S.textOn) return;
        if (S.T - S.outT < TEXT0 + (S.textEnd || 0) + DISMISS_WAIT) return;
        startRelight();
      });
      var msg = S.msg = el('div', 'cd-msg', R);
      msg.setAttribute('aria-live', 'polite');
      S.halo = el('div', 'cd-halo', msg);
      S.txt = el('div', 'cd-txt', msg);
      S.sps = el('div', 'cd-sps', R);
      S.spk = SPARKS.map(function (q, i) {
        var e = el('i', 'cd-sp', S.sps);
        e.innerHTML = '<svg viewBox="-50 -50 100 100"><path d="' + STAR + '"/></svg>';
        e.style.animationDuration = (5.2 + (i % 4) * 0.9) + 's';
        e.style.animationDelay = (-i * 0.73) + 's';
        var sv = e.firstChild;
        sv.style.fill = q[3];
        sv.style.animationDuration = (2.2 + (i % 3) * 0.7) + 's';
        sv.style.animationDelay = (-i * 0.41) + 's';
        sv.style.filter = 'drop-shadow(0 0 3px ' + q[3] + ')';
        return e;
      });

      S.mctx = document.createElement('canvas').getContext('2d');   // 글자 폭 재기용
      S.T = 0; S.session = 0; S.lastBeat = -1e9; S.W = -1; S.H = -1; S.on = false; S.two = null;
      S.state = 'idle'; S.stateT = 0; S.tapT = -1e9; S.lean = 0; S.mic = null;
      S.ready = true;
      resetOut();
      updateHint();   // 처음 안내 문구("🎂 눌러봐")를 채워 둠 — 안 하면 첫 탭 전까지 빈 말풍선
    } catch (e) {
      S.ready = false;
      try { console.error(e); } catch (x) {}
    }
  }

  // 문구 둘레 반짝이: [x(문구 폭 비율), y(문구 높이 비율), 크기(글자 크기 대비), 색]
  var SPARKS = [
    [-0.07, -0.25, 0.4, '#fff3c4'], [0.17, -0.62, 0.26, '#ffffff'], [0.47, -0.78, 0.33, '#ffe9a8'], [0.8, -0.5, 0.24, '#ffd6f0'],
    [1.06, -0.12, 0.36, '#ffffff'], [1.09, 0.8, 0.25, '#fff3c4'], [0.87, 1.36, 0.33, '#ffd6f0'], [0.53, 1.55, 0.22, '#ffffff'],
    [0.2, 1.38, 0.34, '#ffe9a8'], [-0.08, 0.95, 0.24, '#ffffff'], [0.33, -1.05, 0.18, '#ffd6f0'], [0.7, 1.9, 0.18, '#fff3c4'],
  ];

  /* ── 배치: 화면 크기 바뀔 때만 ── */
  function relayout(W, H, tall) {
    S.W = W; S.H = H; S.tall = tall;
    var sb = 0;
    try { sb = parseFloat(getComputedStyle(S.probe).paddingBottom) || 0; } catch (e) {}
    // 사진 상자 — finale.js·엔진과 같은 숫자 (사진 아래끝 = 0.53H + ph/2)
    var pw = tall ? W * 0.56 : H * 0.345, ph = pw * 4 / 3;
    var top = 0.53 * H + ph / 2 + Math.max(6, pw * 0.07);   // 사진 아래 모서리 스티커(🐢🐰)·액자 번짐을 살짝 비켜서
    var bot = H - sb - Math.max(6, H * 0.012);               // 홈 인디케이터(safe-area) 위
    var room = Math.max(36, bot - top);
    // 세로 화면: 말풍선을 케이크 아래에(옆은 동물 기둥이 있어 좁음). 가로 화면: 케이크 옆에(세로 공간이 아까움)
    var hintH = tall ? Math.max(20, Math.min(28, room * 0.15)) : Math.max(22, Math.min(28, room * 0.2));
    var gap = tall ? 4 : 0;
    var ch = room - (tall ? hintH + gap : 0);
    // 폭 상한: 세로는 사진 폭의 78% (더 크면 사진보다 케이크가 주인공이 됨), 가로는 사진 폭 정도
    var maxW = tall ? pw * 0.78 : Math.min(pw * 1.05, W * 0.3);
    var cw = Math.max(40, Math.min(maxW, ch * VBW / VBH, 260));
    ch = cw * VBH / VBW;
    var block = ch + (tall ? gap + hintH : 0);
    var y0 = top + Math.max(0, (room - block) / 2);          // 남는 세로 공간은 위아래로 반씩
    var x0 = W / 2 - cw / 2, pad = Math.max(8, cw * 0.05);   // 손가락이 살짝 빗나가도 눌리게 둘레 여유
    S.cake = { x: x0, y: y0, w: cw, h: ch };
    var h = S.hit.style;
    h.left = n2(x0 - pad) + 'px'; h.top = n2(y0 - pad) + 'px';
    h.width = n2(cw + pad * 2) + 'px'; h.height = n2(ch + pad * 2) + 'px';
    h.transformOrigin = '50% ' + n2(pad + ch * ((182 - VBY) / VBH)) + 'px';   // 접시 바닥
    S.svg.style.left = n2(pad) + 'px'; S.svg.style.top = n2(pad) + 'px';
    S.svg.setAttribute('width', n2(cw)); S.svg.setAttribute('height', n2(ch));
    S.svg.style.width = n2(cw) + 'px'; S.svg.style.height = n2(ch) + 'px';

    var hs = S.hint.style, fsH = Math.round(hintH * 0.54);
    S.hintB.style.height = S.hintB.style.lineHeight = n2(hintH) + 'px';
    S.hintB.style.fontSize = fsH + 'px';
    if (tall) {
      hs.left = n2(W / 2) + 'px'; hs.top = n2(y0 + ch + gap) + 'px'; hs.transform = 'translateX(-50%)';
    } else {
      hs.left = n2(x0 + cw + 6) + 'px'; hs.top = n2(y0 + ch * 0.5 - hintH / 2) + 'px'; hs.transform = 'none';
    }
    layoutMsg(W, H, tall);
  }

  /* ── 문구 배치: 한 줄/두 줄 중 더 크게 들어가는 쪽 (두 줄은 "평생 가자" / "사룽하는 여부야!") ── */
  function layoutMsg(W, H, tall) {
    var m = S.mctx, REF = 100;
    m.font = '700 ' + REF + 'px ' + FONT;
    function em(str) { str = str.replace(/\s+$/, ''); return m.measureText(str).width / REF + 0.03 * (str.length - 1); }
    var maxW = Math.min(W - 40, W * (tall ? 0.88 : 0.8));
    var cap = Math.min(H * 0.085, 58);   // 가로 폰(높이 390)에서 .075 는 22px 로 마지막 문장치고 작았음
    var w1 = em(LINES_1[0]), w2 = Math.max(em(LINES_2[0]), em(LINES_2[1]));
    var fs1 = Math.min(maxW / w1, cap), fs2 = Math.min(maxW / w2, cap);
    var two = fs2 > fs1 * 1.25;                   // 두 줄이 확실히 클 때만 두 줄 (넓은 화면은 한 줄이 더 차분함)
    var fs = Math.max(14, Math.floor(two ? fs2 : fs1));
    if (two !== S.two) { S.two = two; buildText(two ? LINES_2 : LINES_1); }
    S.fs = fs;
    var n = two ? 2 : 1, th = n * 1.35 * fs, tw = (two ? w2 : w1) * fs;
    var cy = H * 0.47, ty = cy - th / 2;
    var ms = S.msg.style;
    ms.fontSize = fs + 'px'; ms.top = n2(ty) + 'px';
    var hs = S.halo.style;
    hs.width = n2(tw * 1.5 + fs * 2) + 'px'; hs.height = n2(th * 2.4 + fs) + 'px';
    hs.marginLeft = n2(-(tw * 1.5 + fs * 2) / 2) + 'px'; hs.marginTop = n2(-(th * 2.4 + fs) / 2) + 'px';
    var bx = W / 2 - tw / 2;
    S.spk.forEach(function (e, i) {
      var q = SPARKS[i], sz = Math.max(7, fs * q[2]);
      var x = Math.max(4, Math.min(W - sz - 4, bx + q[0] * tw - sz / 2));
      var y = Math.max(4, Math.min(H - sz - 4, ty + q[1] * th - sz / 2));
      e.style.left = n2(x) + 'px'; e.style.top = n2(y) + 'px';
      e.style.width = e.style.height = n2(sz) + 'px';
    });
  }
  function buildText(lines) {
    S.txt.textContent = '';
    S.letters = [];
    var k = 0, delay = 0;
    lines.forEach(function (line, li) {
      var ld = el('span', 'cd-line', S.txt);
      if (li > 0) delay += LINE_GAP;
      var words = line.split(' ');
      words.forEach(function (w, wi) {
        if (wi > 0) { ld.appendChild(document.createTextNode(' ')); delay += WORD_GAP; }
        if (!w) return;   // 첫 줄 끝 띄어쓰기(빈 낱말) — 공백 글자만 남기고 넘어감
        var ws = el('span', 'cd-w', ld);
        for (var i = 0; i < w.length; i++) {
          var c = el('span', 'cd-c', ws);
          c.textContent = w.charAt(i);
          S.letters.push({ e: c, d: delay + k * LDELAY });
          k++;
        }
      });
    });
    S.textEnd = S.letters.length ? S.letters[S.letters.length - 1].d + LDUR : 0;
    // 끈 뒤에 화면이 돌아가 한 줄↔두 줄이 바뀌면 글자 칸을 새로 만듦 → 새 칸은 투명(0)이라, 끝난 연출도 한 번 더 돌려 제 상태로 채움
    //  (이걸 안 하면 가로→세로로 돌리는 순간 마지막 문장이 통째로 사라졌음 — 브라우저 시험에서 발견)
    S.outDone = false;
    S.msg.setAttribute('aria-label', MSG);
  }

  /* ── 상태 ── */
  var DISMISS_WAIT = 2, DISMISS_DUR = 1;   // 톡 눌러 다시 켜기: 문구 다 나온 뒤 2초부터 가능, 1초에 걸쳐 밝아짐
  // 유저 제안(2026-09-27): 끈 뒤 저절로 다시 켜져서 또 불어볼 수 있게. 끈 순간부터 5초면 문구(약 3~4초 걸려 뜸)를 읽자마자 밝아져서
  //  '문구가 다 나온 뒤' 5초로 잡음(끈 뒤 약 9초)
  var RELIGHT_WAIT = 5, RELIGHT_GROW = 0.7;
  function setState(st) { S.state = st; S.stateT = S.T; updateHint(); }
  function updateHint() {
    var st = S.state, t = '';
    if (st === 'idle') t = '🎂 눌러봐';
    else if (st === 'asking') t = S.T - S.stateT > ASK_SLOW ? '콕 누르면 꺼져!' : '🎤 허용해줘!';
    else if (st === 'calib' || st === 'listen') t = '후~ 불어줘!';
    else if (st === 'fallback') t = '콕 누르면 꺼져!';
    if (S.hintB._txt !== t) { S.hintB._txt = t; S.hintB.textContent = t; }
    var mic = st === 'calib' || st === 'listen';
    if (S.hint._mic !== mic) { S.hint._mic = mic; S.hint.classList.toggle('mic', mic); }
  }
  function isDesktop() {   // 마우스 달린 PC(터치 없음)만. 터치 노트북·아이패드+트랙패드는 폰처럼 마이크로
    try {
      var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
      var touch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
      return fine && !touch;
    } catch (e) { return false; }
  }

  function onTap(e) {
    if (e) { try { e.stopPropagation(); } catch (x) {} }
    try { tap(); } catch (err) {
      try { console.error(err); } catch (x) {}
      try { blowOut(); } catch (x) {}   // 무슨 일이 있어도 누르면 꺼지게
    }
  }
  function tap() {
    if (!S.on || S.state === 'out') return;
    var st = S.state;
    if (st === 'idle') {
      if (isDesktop()) { blowOut(); return; }
      startMic();
    } else if (st === 'fallback') {
      blowOut();
    } else if (S.T - S.tapT >= GRACE) {   // 권한 대기·듣는 중: 비상구 (연타 한 번에 바로 꺼지진 않게 GRACE 뒤부터)
      blowOut();
    }
  }

  /* ── 마이크 ── */
  function bgm() { try { return (S.opts && S.opts.audio) || document.getElementById('bgm'); } catch (e) { return null; } }
  function startMic() {
    var md = navigator.mediaDevices;
    // 마이크 기능 자체가 없음(https 아닌 주소·옛 웹뷰) → 권한창도 안 뜨니 헛탭 되지 않게 PC처럼 바로 끔
    if (!md || typeof md.getUserMedia !== 'function') { blowOut(); return; }
    var token = ++S.session;
    var m = S.mic = { token: token, ctx: null, stream: null, amb: 0, ambLow: -200, acc: 0, dead: 0, rebuilt: false,
                      calT: -1, cal: [], calLow: [], listenT: 0, startT: S.T, resumeT: -1 };
    S.tapT = S.T;
    S.tapWall = wall();   // 즉시 거절 판정은 실제 시계로 (아이폰 권한창이 떠 있는 동안 rAF 가 멈출 수 있어 S.T 는 안 흐름)
    setState('asking');
    var au = bgm();
    m.wasPlaying = !!(au && !au.paused && !au.ended);
    // 오디오 세션(iOS 16.4+): 엔진이 무음스위치 무시용으로 'playback' 을 걸어 둠 → 그 상태로는 녹음이 막힐 수 있어
    //  잠깐 'play-and-record' 로 바꿨다가 마이크 반납 때 원래대로. (없는 기기는 WebKit 이 알아서 전환)
    try { if (navigator.audioSession) { S.sessPrev = navigator.audioSession.type; navigator.audioSession.type = 'play-and-record'; } } catch (e) {}
    // AudioContext 는 탭 안에서 만들고 resume 해야 아이폰이 켜 줌 (getUserMedia 결과를 기다린 뒤엔 탭 효력이 끝남)
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try { m.ctx = new AC(); if (m.ctx.resume) { var p = m.ctx.resume(); if (p && p.catch) p.catch(noop); } } catch (e) { m.ctx = null; }
    }
    var pr = null;
    try {
      pr = md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) { pr = null; }
    if (!pr || typeof pr.then !== 'function') { micFail(token); return; }
    pr.then(function (stream) {
      try { onStream(token, stream); } catch (e) { stopStream(stream); micFail(token); }
    }, function () { micFail(token); });
  }
  function micFail(token) {
    if (token !== S.session || S.state === 'out') return;
    var quick = (wall() - S.tapWall) / 1000 < QUICK_DENY;
    releaseMic(true);
    if (quick) blowOut();   // 권한창 없이 즉시 거절 = 사용자 입장에선 "눌렀는데 아무 일 없음" → 그냥 끔
    else setState('fallback');
  }
  function onStream(token, stream) {
    var m = S.mic;
    // 그새 꺼졌거나(비상구 탭)·되감겼으면 받자마자 반납
    if (token !== S.session || !m || m.token !== token || S.state !== 'asking') { stopStream(stream); return; }
    m.stream = stream;
    if (!m.ctx) throw new Error('no AudioContext');
    hookup(m);
    m.listenT = S.T;
    setState('calib');
    if (m.wasPlaying) setTimeout(function () { resumeMusic(token); }, 400);
  }
  function hookup(m) {
    var ctx = m.ctx;
    if (ctx.state !== 'running' && ctx.resume) { try { var p = ctx.resume(); if (p && p.catch) p.catch(noop); } catch (e) {} }
    m.src = ctx.createMediaStreamSource(m.stream);
    m.an = ctx.createAnalyser();
    m.an.fftSize = 2048;
    m.an.smoothingTimeConstant = 0.15;
    // 분석기를 소리 0 짜리 게인으로 스피커에 이어 둠: 옛 WebKit 은 출력이 안 이어진 노드를 안 돌려서 분석값이 멈춤 (게인 0 이라 하울링 없음)
    m.sink = ctx.createGain();
    m.sink.gain.value = 0;
    m.src.connect(m.an); m.an.connect(m.sink); m.sink.connect(ctx.destination);
    m.td = new Float32Array(m.an.fftSize);
    m.tb = new Uint8Array(m.an.fftSize);
    m.fd = new Float32Array(m.an.frequencyBinCount);
  }
  function rebuild(m) {   // 마이크는 받았는데 신호가 완전 0 = 탭 때 만든 AudioContext 가 녹음 시작과 어긋남(구형 iOS) → 새로 만들어 다시 연결
    m.rebuilt = true; m.dead = 0;
    try { m.src && m.src.disconnect(); } catch (e) {}
    try { m.sink && m.sink.disconnect(); } catch (e) {}
    closeCtx(m.ctx);
    var AC = window.AudioContext || window.webkitAudioContext;
    m.ctx = new AC();   // 녹음 중인 페이지는 제스처 없이도 소리 허용됨
    hookup(m);
  }
  function stopStream(stream) {
    try { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); } catch (e) {}
  }
  function closeCtx(ctx) {
    if (!ctx) return;
    try { var p = ctx.close(); if (p && p.catch) p.catch(noop); } catch (e) {}
  }
  // 마이크 반납: 아이폰은 마이크가 켜져 있는 동안 음악 소리를 줄이거나 경로를 바꿀 수 있어서, 끝나면 즉시 전부 놓아줌
  function releaseMic(nudge) {
    var m = S.mic;
    S.mic = null;
    if (m) {
      try { m.src && m.src.disconnect(); } catch (e) {}
      try { m.sink && m.sink.disconnect(); } catch (e) {}
      if (m.stream) stopStream(m.stream);
      closeCtx(m.ctx);
    }
    if (S.sessPrev !== undefined) {
      try { navigator.audioSession.type = S.sessPrev; } catch (e) {}
      S.sessPrev = undefined;
    }
    if (nudge && m && m.wasPlaying) {
      var tk = S.session;
      resumeMusic(tk);
      setTimeout(function () { resumeMusic(tk); }, 700);
    }
  }
  // 마이크 켜고 끄는 사이 OS 가 배경음악을 멈춰 버린 경우만 되살림 (원래 재생 중이었고, 끝난 게 아니고, 그새 되감기 안 했을 때)
  function resumeMusic(token) {
    if (token !== S.session && S.state !== 'out') return;
    var au = bgm();
    if (!au || !au.paused || au.ended) return;
    try { var p = au.play(); if (p && p.catch) p.catch(noop); } catch (e) {}
  }

  // 매 프레임: 소리 크기 재서 불꽃 기울이고, "후~" 인지 판정
  function listen(dt) {
    var m = S.mic;
    if (!m || !m.an) return;
    var ctx = m.ctx;
    if (ctx.state !== 'running' && S.T - m.resumeT > 0.5) {   // 'suspended'·'interrupted'(iOS) 이면 계속 깨워 봄
      m.resumeT = S.T;
      try { var p = ctx.resume(); if (p && p.catch) p.catch(noop); } catch (e) {}
    }
    var an = m.an, n = an.fftSize, sum = 0, peak = 0, i, v;
    if (an.getFloatTimeDomainData) {
      an.getFloatTimeDomainData(m.td);
      for (i = 0; i < n; i++) { v = m.td[i]; sum += v * v; if (v < 0) v = -v; if (v > peak) peak = v; }
    } else {
      an.getByteTimeDomainData(m.tb);
      for (i = 0; i < n; i++) { v = (m.tb[i] - 128) / 128; sum += v * v; if (v < 0) v = -v; if (v > peak) peak = v; }
    }
    var rms = Math.sqrt(sum / n);
    // 낮은 소리(40~500Hz) 세기: 입김이 마이크에 닿으면 "부우우" 하는 저음 바람소리가 확 커짐.
    //  폰 스피커는 저음이 거의 안 나와서 페이지 음악·효과음이 새어 들어와도 이 대역은 별로 안 커짐 → 음악·박수로 잘못 꺼지는 걸 막는 핵심
    an.getFloatFrequencyData(m.fd);
    var bin = ctx.sampleRate / n, k0 = Math.max(1, Math.round(40 / bin)), k1 = Math.max(k0 + 1, Math.min(m.fd.length - 1, Math.round(500 / bin))), pw = 0;
    for (i = k0; i <= k1; i++) { v = m.fd[i]; if (v > -200) pw += Math.pow(10, v / 10); }
    var low = 10 * Math.log(pw / (k1 - k0 + 1) + 1e-20) / Math.LN10;

    // 신호가 완전한 0 = 연결 고장 (진짜 마이크는 늘 잡음이 조금 있음) → 한 번 새로 연결, 그래도 0 이면 탭으로 끄기
    if (peak === 0) {
      m.dead += dt;
      if (m.dead > DEAD) {
        if (!m.rebuilt) { try { rebuild(m); } catch (e) { releaseMic(true); setState('fallback'); } }
        else { releaseMic(true); setState('fallback'); }
      }
      S.lean += (0 - S.lean) * Math.min(1, dt * 6);
      return;
    }
    m.dead = 0;

    if (S.state === 'calib') {
      if (m.calT < 0) m.calT = S.T;                        // 신호가 실제로 들어오기 시작한 때부터 0.4초
      m.cal.push(rms); m.calLow.push(low);
      if (S.T - m.calT >= CALIB && m.cal.length >= 5) {
        // 바닥 소음 = 하위 30% 값: 탭하자마자 벌써 불고 있어도 문턱이 같이 올라가 버리지 않게
        var a = m.cal.slice().sort(function (x, y) { return x - y; }), b = m.calLow.slice().sort(function (x, y) { return x - y; });
        m.amb = Math.max(0.0015, Math.min(0.05, a[Math.floor(a.length * 0.3)]));
        m.ambLow = b[Math.floor(b.length * 0.3)];
        setState('listen');
      }
      S.lean += (0 - S.lean) * Math.min(1, dt * 6);
      return;
    }

    // ── 판정: RMS 가 주변의 3.5배(최소 0.03) 넘고 + 저음이 주변보다 10dB 넘게 큼 (또는 거의 찢어질 만큼 큼) ──
    //  최소 0.03: 폰 마이크에 직접 부는 입김은 보통 0.1 이상. 0.02 로 두니 가짜 마이크 시험에서 옆에서 말하는 정도로도 꺼질 만큼 예민했음
    var thr = Math.max(m.amb * 3.5, 0.03);
    var loud = rms > thr && (low > m.ambLow + 10 || rms > Math.max(thr * 3, 0.25));
    // 새는 통: 조건 맞으면 차오르고, 잠깐 끊겨도 바로 0 이 되지 않음(부는 소리는 원래 울퉁불퉁)
    m.acc = loud ? m.acc + dt : Math.max(0, m.acc - dt * 0.6);
    // 바닥 소음은 조용할 때만 천천히 따라감 (불 때 따라가면 문턱이 같이 올라가 버림)
    if (rms < thr * 0.6) {
      var kk = Math.min(1, dt * 0.5);
      m.amb += (Math.max(0.0015, Math.min(0.05, rms)) - m.amb) * kk;
      m.ambLow += (low - m.ambLow) * kk;
    }
    // 불꽃 기울기 = 소리 크기 (주변 1.4배에서 0 → 문턱에서 1). 세게 불고 있으면 거의 눕힘
    var tgt = clamp01((rms - m.amb * 1.4) / Math.max(1e-4, thr - m.amb * 1.4));
    if (loud) tgt = Math.max(tgt, 0.85 + 0.15 * clamp01(m.acc / HOLD));
    S.lean += (tgt - S.lean) * Math.min(1, dt * 14);
    S.level = rms;   // (검증용)
    if (m.acc >= HOLD) blowOut();
    else if (S.T - m.listenT > LISTEN_MAX) { releaseMic(true); setState('fallback'); }
  }

  /* ── 끄기 ── */
  function blowOut() {
    if (S.state === 'out' || !S.on) return;
    S.leanAtOut = S.lean;
    S.session++;                 // 늦게 도착하는 권한 결과는 전부 무시 → 받자마자 반납
    releaseMic(true);
    setState('out');
    S.outT = S.T;
    S.hit.classList.add('off');
    S.hint.classList.remove('on'); S.hint._on = false;
    S.dark.style.display = 'block'; S.dark.style.pointerEvents = 'auto'; S.dark.style.cursor = 'pointer';
    S.msg.style.display = 'block';
    S.sps.style.display = 'block';
    S.dismissT = -1;
  }
  function startRelight() {
    if (S.state !== 'out' || S.dismissT >= 0) return;
    S.dismissT = S.T;                 // 막·문구·반짝이 걷힘 시작(step 에서 진행)
    S.relitT = S.T;                   // 불꽃이 작게서 커지며 다시 켜짐(drawCandles)
    S.hit.classList.remove('off');
    S.flamesGone = false; S.smokeDone = true;
    S.fl.forEach(function (f) {
      f.fl.style.display = ''; f.halo.style.display = '';
      setAt(f.em, 'opacity', '0');
      f.pf.forEach(function (c) { setAt(c, 'opacity', '0'); });
      f.sm.forEach(function (p) { setAt(p, 'opacity', '0'); });
    });
    if (S.glow) S.glow.style.display = '';
    S.tapT = -1e9; S.lean = 0;
    setState('idle');                 // 다시 누르면 또 끌 수 있음 (폰은 마이크 다시 요청)
    sfx('pop', 0.5);
  }
  function resetOut() {          // 끄기 연출을 전부 처음 상태로
    S.outT = -1; S.textOn = false; S.spOn = false; S.outDone = false; S.flamesGone = false; S.smokeDone = false;
    S.hit.classList.remove('off');
    S.hint.classList.remove('on'); S.hint._on = false;
    S.dark.style.display = 'none'; setOp(S.dark, 0); S.dark.style.pointerEvents = ''; S.dismissT = -1;
    S.msg.style.opacity = ''; S.sps.style.opacity = '';
    S.msg.style.display = 'none'; S.msg.classList.remove('on');
    S.sps.style.display = 'none'; S.sps.classList.remove('on');
    (S.letters || []).forEach(function (L) { setOp(L.e, 0); setTf(L.e, ''); L.e.style.filter = ''; L._b = -1; });
    S.fl.forEach(function (f) {
      f.fl.style.display = ''; f.halo.style.display = '';
      setAt(f.em, 'opacity', '0');
      f.pf.forEach(function (c) { setAt(c, 'opacity', '0'); });
      f.sm.forEach(function (p) { setAt(p, 'opacity', '0'); });
    });
    if (S.glow) { S.glow.style.display = ''; }
  }
  function reset() {             // 되감기·다시보기: 숨기고 마이크 반납하고 처음으로
    S.session++;
    releaseMic(false);
    S.state = 'idle'; S.stateT = S.T; S.tapT = -1e9; S.lean = 0;
    updateHint();
    resetOut();
    S.root.style.display = 'none';
    S.on = false;
  }

  /* ── 그리기 ── */
  function drawCandles() {
    if (S.flamesGone) return;
    var t = S.T, out = S.state === 'out', tt = out ? t - S.outT : 0, lean = S.lean;
    if (out) lean = Math.min(1.3, Math.max(S.leanAtOut || 0, clamp01(tt / GUST)) * 1.3);   // 훅: 짧게 확 눕고
    var fade = out ? 1 - clamp01((tt - GUST) / OUTF) : 1;                                   // → 줄어들며 사라짐
    if (!out && S.relitT >= 0) { var g = clamp01((t - S.relitT) / RELIGHT_GROW); fade *= easeOut3(g); if (g >= 1) S.relitT = -1; }   // 다시 켜질 때: 퐁 하고 커짐
    var navg = 0;
    for (var i = 0; i < 3; i++) {
      var f = S.fl[i];
      var nz = Math.sin(t * 11.3 + i * 2.1) * 0.5 + Math.sin(t * 17.9 + i * 5.3) * 0.3 + Math.sin(t * 4.7 + i * 1.3) * 0.2;
      var jit = lean * (Math.sin(t * 37 + i * 3.3) * 0.6 + Math.sin(t * 53 + i) * 0.4);    // 바람 맞을 때 파르르
      navg += nz / 3;
      var rot = nz * 4 + lean * (30 + i * 4) + jit * 10;
      var sk = lean * 14 + jit * 6;
      var sy = (1 + nz * 0.07 - lean * 0.3) * (0.2 + 0.8 * fade), sx = (1 - nz * 0.04 + lean * 0.1) * (0.5 + 0.5 * fade);
      setAt(f.fl, 'transform', 'translate(' + f.x + ' ' + f.oy + ') rotate(' + n2(rot) + ') skewX(' + n2(sk) + ') scale(' + n2(sx) + ' ' + n2(sy) + ')');
      setAt(f.fl, 'opacity', String(n2(fade)));
      setAt(f.halo, 'transform', 'translate(' + f.x + ' ' + f.oy + ') rotate(' + n2(rot * 0.6) + ') scale(' + n2(1 + nz * 0.06) + ')');
      setAt(f.halo, 'opacity', String(n2(Math.max(0, (0.72 + nz * 0.14 - lean * 0.3) * fade))));
    }
    setAt(S.glow, 'opacity', String(n2(Math.max(0, (0.62 + navg * 0.12 - lean * 0.2) * fade))));
    if (out && fade <= 0) {
      S.flamesGone = true;
      S.fl.forEach(function (f) { f.fl.style.display = 'none'; f.halo.style.display = 'none'; });
      S.glow.style.display = 'none';
    }
  }
  function drawOut() {
    if (S.outDone) return;
    var tt = S.T - S.outT;
    // 훅: 심지에서 작은 김 방울 3개가 퍼짐 / 잔불: 심지 끝이 잠깐 주황으로 남았다 식음 / 연기: 두 가닥이 꼬불꼬불 피어오름
    if (!S.smokeDone) {
      S.fl.forEach(function (f, i) {
        var up = (tt - GUST) / 0.6;
        f.pf.forEach(function (c, j) {
          if (up < 0 || up > 1) { setAt(c, 'opacity', '0'); return; }
          var dx = (j - 1) * 9 * up, dy = -3 - up * (7 + j * 2);
          setAt(c, 'cx', String(n2(f.x + dx))); setAt(c, 'cy', String(n2(f.wy + dy)));
          setAt(c, 'r', String(n2(1.5 + up * 6))); setAt(c, 'opacity', String(n2(0.75 * (1 - up))));
        });
        setAt(f.em, 'opacity', String(n2(tt < GUST ? 0 : 0.95 * (1 - clamp01((tt - GUST) / 1.4)))));
        f.sm.forEach(function (p, j) {
          var u = (tt - GUST - OUTF * 0.3 - j * 0.28 - i * 0.07) / SMOKE;
          if (u < 0 || u > 1) { setAt(p, 'opacity', '0'); return; }
          var L = f.smL[j], draw = Math.min(1, u * 2.2);
          var sway = Math.sin(u * 3 + i + j) * 3;
          setAt(p, 'transform', 'translate(' + n2(f.x + sway) + ' ' + n2(f.wy - u * 30) + ') scale(' + n2(1 + u * 0.5) + ')');
          setAt(p, 'stroke-dashoffset', String(n2(L * (1 - draw))));
          setAt(p, 'opacity', String(n2(Math.min(1, u * 6) * Math.pow(1 - u, 1.2) * 0.8)));
        });
      });
      if (tt > GUST + OUTF + 0.3 + SMOKE + 0.6) {
        S.smokeDone = true;
        S.fl.forEach(function (f) {
          setAt(f.em, 'opacity', '0');
          f.pf.forEach(function (c) { setAt(c, 'opacity', '0'); });
          f.sm.forEach(function (p) { setAt(p, 'opacity', '0'); });
        });
      }
    }
    // 화면 어두워짐
    if (S.dismissT === -1) setOp(S.dark, easeInOut(clamp01((tt - DARK0) / DARKD)));   // 다시 켜는 중(≥0)이면 건드리지 않음
    // 문구: 한 글자씩 아래에서 스르르 (흐림→또렷, 살짝 작게→제 크기)
    var tx = tt - TEXT0;
    if (tx >= 0 && !S.textOn) {
      S.textOn = true;
      S.msg.classList.add('on');
      sfx('sharalala', 0.5);
    }
    var fs = S.fs || 30, allDone = tx > S.textEnd;
    (S.letters || []).forEach(function (L) {
      var p = clamp01((tx - L.d) / LDUR);
      if (p === L._b) return;
      L._b = p;
      var e = easeOut3(p);
      setOp(L.e, e);
      if (p >= 1) { setTf(L.e, ''); L.e.style.filter = ''; return; }
      setTf(L.e, 'translateY(' + n2((1 - e) * 0.42 * fs) + 'px) scale(' + n2(0.94 + 0.06 * e) + ')');
      L.e.style.filter = p > 0 ? 'blur(' + n2((1 - e) * 0.14 * fs) + 'px)' : '';
    });
    if (tt >= SPARK0 && !S.spOn) { S.spOn = true; S.sps.classList.add('on'); }
    if (allDone && S.spOn && S.smokeDone && tt > DARK0 + DARKD) S.outDone = true;   // 이후론 CSS 반짝이만 돎(매 프레임 할 일 없음)
  }

  /* ── 매 프레임 ── */
  function frame(c) {
    if (!S.ready || !c) return;
    try { step(c); } catch (e) {
      if (!S.warned) { S.warned = true; try { console.error(e); } catch (x) {} }
    }
  }
  function step(c) {
    var b = +c.beat, st = +c.start, W = +c.W, H = +c.H;
    var dt = +c.dt;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    S.T += dt;
    var a = st + APPEAR;
    // 케이크 등장 전(= 거의 모든 시간, 되감기·↻ 다시보기 포함): 숨기고 처음 상태로. 마이크도 여기서 반납
    if (!(b >= a) || !(W > 0 && H > 0)) {
      if (S.on || S.state !== 'idle' || S.mic) reset();
      S.lastBeat = b;
      return;
    }
    var tall = typeof c.tall === 'boolean' ? c.tall : H > W * 1.05;
    if (!S.on) { S.on = true; S.root.style.display = 'block'; S.W = -1; }
    if (W !== S.W || H !== S.H || tall !== S.tall) relayout(W, H, tall);

    // 등장 "퐁" 효과음: 앞으로 재생하다 등장 박을 넘을 때만 (되감기로 건너뛸 땐 조용히)
    if (S.lastBeat < a && b - S.lastBeat < 1) sfx('pop', 0.5);
    S.lastBeat = b;

    // 퐁 튀어나옴(뒤로 살짝 넘쳤다 제자리) + 박마다 통 찌그러짐 (끄고 나면 멈춤 — 조용한 장면)
    var u = (b - a) / POPB, pop = u >= 1 ? 1 : easeOutBack(Math.max(0, u));
    var bob = S.state === 'out' || u < 1 ? 0 : Math.pow(1 - frac(b - st), 3);
    setTf(S.hit, 'scale(' + n2(Math.max(0.001, pop * (1 + 0.03 * bob))) + ',' + n2(Math.max(0.001, pop * (1 - 0.045 * bob))) + ')');

    // 안내 말풍선: 등장 조금 뒤부터 (눌러서 뭔가 진행 중이면 바로)
    var hintOn = S.state !== 'out' && (b >= st + HINT_AT || S.state !== 'idle');
    if (S.hint._on !== hintOn) { S.hint._on = hintOn; S.hint.classList.toggle('on', hintOn); }
    if (S.state === 'asking') updateHint();

    if (S.state === 'calib' || S.state === 'listen') listen(dt);
    else if (S.state !== 'out') S.lean += (0 - S.lean) * Math.min(1, dt * 6);
    drawCandles();
    if (S.state === 'out') drawOut();
    if (S.dismissT >= 0) {
      var dk = clamp01((S.T - S.dismissT) / DISMISS_DUR), keep = 1 - easeInOut(dk);
      setOp(S.dark, keep); S.msg.style.opacity = keep; S.sps.style.opacity = keep;
      if (dk >= 1) resetOut();   // 막·문구·반짝이 숨기고 글자 초기화 (불꽃은 이미 켜져 있음, 상태는 idle)
    }
    if (S.state === 'out' && S.dismissT === -1 && S.textOn && S.T - S.outT >= TEXT0 + (S.textEnd || 0) + RELIGHT_WAIT) startRelight();
  }

  window.Candle = {
    init: init,
    frame: frame,
    state: function () { return !S.ready ? 'hidden' : !S.on ? 'hidden' : S.state; },
    blow: function () { try { if (S.ready && S.on) blowOut(); } catch (e) {} },
  };
})();
