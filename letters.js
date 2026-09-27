// node 로 이 파일을 직접 돌려 글자 검사를 할 때만 window 가 없음 → 전역을 window 로 씀 (브라우저에선 아무 일 안 함)
if (typeof window === 'undefined') globalThis.window = globalThis;

// ── 편지 문장: 장면마다 한 문장 ──────────────────────────────────────────
// ★ 여기 문장은 유저(남자친구)가 직접 쓴 글. 받은 그대로 넣고 어미·띄어쓰기 하나도 고치지 말 것.
//   빈 문자열 '' 이면 그 장면은 문장 없이 춤만 나옴.
//   특별 연출은 { t: '문장(\n=줄바꿈)', fill: [화면폭 비율, 화면높이 비율], shake: 떨림 세기, style: 등장방식 } — fill 은 그 상자를 꽉 채우는 크기로 자동 계산
//   2026-09-26 유저 원문 16줄: 1~12→1~12장면, 13장면 비움(밤 전환), 13~15→14~16장면, 마지막 줄은 두 문장이라 17·18장면에 나눔(글자 그대로).
//   띄어쓰기 4곳(맛난 거·끝날 때가·생각 중이겠다·있을 거니까)은 유저 요청으로 고침. 라구·하구·그래두는 일부러 쓴 말투라 그대로.
//
//   2026-09-26 2차(유저 승인: 400→401 계기판, 8마리나, 꽃게, 큰 글씨 연출 더): 추가 필드
//     fx: 개그 종류 / hot: 문장 속 강조할 글자(그대로 문장 안에 있어야 함) / hs: 강조 글자 배율(em) / y: 문장 높이(화면 비율) 직접 지정
//   ★ 줄바꿈(\n)을 넣을 땐 원래 있던 띄어쓰기를 지우지 말고 그 뒤에 넣음('친구들도 \n8마리나') → \n 만 빼면 원문과 글자까지 똑같음.
//     `node letters.js` 로 18문장 전부 원문과 한 글자도 안 다른지 검사됨(맨 아래).
window.LETTER_LINES = [
  "주원아! 생일 축하해!",                                           //  1 등장 + 기본 춤
  { t: '생일을 축하해줄 친구들도 \n8마리나 \n데려왔어!', fx: 'eight', hot: '8' },   //  2 짤 댄스 — '8'만 거대해지고 동물들이 전부 그 8을 가리킴(attention)
  //   ↑ '8마리나'를 혼자 한 줄로 고정: 두 줄이면 8이 박마다 쿵 할 때 '데려왔어!'가 붙었다 떨어졌다 하며 줄이 매 박 바뀌었음
  { t: '400일도 축하해!', fx: 'odo', hot: '400', hs: 1.6 },             //  3 파도타기 ┐ 두 장면을 한 덩어리로: 문장이 안 나가고 49박 정박에
  { t: '401일도 축하해!!', fx: 'odo', hot: '401', hs: 1.6 },            //  4 강강술래 ┘ 끝자리가 계기판처럼 0→1 로 굴러가고 '!' 하나 퐁 (숫자만 1.6배: 기본 크기론 굴러가는 게 폰에서 잘 안 보였음)
  "요즘 바빠서 우리 여부에게 신경을 못 썼지",                                //  5 모자 날아가기
  "앞으로는 바빠도 우리 여부 잘 챙겨주는 멋진 남자친구가 될게!",                     //  6 모자 릴레이
  { t: '그래도\n지금도\n멋지다고\n생각해줘!', fill: [.9, .62] },                    //  7 기차놀이 — 유저 요청: 네 줄로 크게
  { t: '삐지지\n않기\n!!', fill: [.86, .62], shake: .035, style: 'stamp' }, //  8 제자리 뒤돌기 — 유저 요청: 화면 절반 넘게 꽉 + 도장 쾅 + 삐져서 부들부들 (두 줄은 폭에 막혀 35%뿐이라 세 줄로, 폭 .96은 떨림에 양끝이 잘려 .86)
  { t: '부모님이 여부 생일이라구 \n꽃게도 사주셨나봐', fx: 'crab', hot: '꽃게' },   //  9 한 마리 독무 — 🦀 가 문장 밑을 옆걸음으로 지나가다 '꽃게' 밑에서 멈춰 인사
  { t: '그걸 또 \n힘차게 \n손질한 여부 \n너무 멋있어!', fx: 'chop', hot: '힘차게', hs: 1.7, fill: [.74, .56] },  // 10 고양이 탑 — '힘차게'가 박마다 칼질하듯 쾅쾅 내리침 (폭 .84는 기우뚱+쿵에 '멋있어!'의 ! 가 오른쪽 끝에서 잘려 .74로)
  { t: '다음에 홈파티할 때 \n기대할게 \n여부!', fx: 'grow', hot: '기대할게' },     // 11 고양이 피라미드 — '기대할게'가 박마다 한 칸씩 계속 커짐(기대감 부풀기)
  { t: '요즘 열심히 \n운동하구 \n다이어트도 \n하는 여부!', fx: 'slam', fill: [.86, .34], y: .79, style: 'none' },  // 12 강강술래(2) — 단어가 박마다 하나씩 쾅 (운동 구령), 원이 위에 있어서 아래쪽
  "",                                                       // 13 파도타기 (2번째) — 1:20 밤 전환 카메라 연출이라 비움
  { t: '하지만 파티날에는 걱정 없이 \n맛난 거 \n잔뜩 \n먹어야 해 우리 여부!', fx: 'fat', hot: '잔뜩', hs: 3 },  // 14 해파리 — '잔뜩'이 박마다 꿀꺽꿀꺽 옆으로 통통해짐
  { t: '항상 하는 말이지만 \n그래두 \n명\n심\n해\n!', fx: 'scroll', hot: '명심해!', hs: 3.2, fill: [.9, .8] },  // 15 모자 날아가기(2) — '명심해!'가 가훈 족자처럼 한 글자씩 촤락 펼쳐짐
  "슬슬 이거 끝날 때가 됐는데 생각 중이겠다",                                  // 16 기차놀이 (2번째)
  "피날레가 있을 거니까 기다려 여부!",                                     // 17 짤 댄스 (2번째)
  { t: '여부여부 항상 너무너무 \n사랑해!!', fx: 'heart', hot: '사랑해!!', hs: 2.8 },  // 18 가운데 모여 대점프 → 멈춤 — '사랑해!!'가 크게 두근두근(박마다 쿵쿵 두 번)
];

// ── 문장 연출: 옛날 워드아트처럼 무지개 글자 + 흰 테두리. 들어올 때·나갈 때만 난리(180도 회전, 앞뒤 뒤집기, 도장 쾅…)
//    가운데 구간은 박마다 살짝 통통 튀는 정도로만 움직여서 읽히게 함. 전부 음악 박(beat) 기준이라 음악과 같이 움직임.
//    fx 개그는 전부 "박 번호만 넣으면 모양이 정해지는" 순수 계산 → ?shot=박 으로 아무 박이나 바로 찍어도 같은 그림.
window.Letters = (() => {
  // 장면마다 등장 방식을 돌려 씀 (같은 게 연달아 안 나오게 순서 섞음)
  const STYLES = ['spin180', 'flipY', 'stamp', 'twirl', 'flipX', 'drop', 'fly', 'chars'];
  const ORDER = [0, 1, 2, 7, 3, 4, 5, 6, 1, 2, 0, 7, 4, 3, 6, 5, 1, 2];
  const PALETTES = [
    ['#ff4f9a', '#ff9f43', '#ffd93b', '#3ddc84', '#35b6ff', '#9b6bff'],   // 무지개
    ['#ff5fb8', '#c86bff', '#7f7bff'],                                     // 핑크→보라
    ['#1fb6ff', '#16d9c7', '#3f8cff'],                                     // 아쿠아(프루티거)
    ['#ff8a00', '#ff3d6e', '#ffb800'],                                     // 오렌지·토마토
  ];
  const RAINBOW = PALETTES[0];
  // 강조 글자 색: 문장 나머지와 달라야 "여기가 개그"인 게 한눈에 보임
  const HOT_PAL = {
    chop: ['#ff2e2e', '#ff7a00', '#ff2e6a'],      // 힘차게: 빨강·주황(기운)
    grow: ['#ff4fd8', '#b45cff', '#ff5f9e', '#8a5cff'],
    fat: ['#ff9f1a', '#ffc300', '#ff6a3d'],       // 잔뜩: 먹음직한 주황·노랑
    scroll: ['#2a1d4a'],                          // 명심해!: 족자 위 먹글씨(무지개 사이에서 혼자 진지해서 웃김)
    heart: ['#ff1f5a', '#ff4f9a', '#ff2d78', '#ff6fb3'],
  };
  const ENTER = 1.5, EXIT = 1.25;       // 들어오고 나가는 데 쓰는 박 수
  const ROLL = 1.7;                     // 계기판 숫자 간격(em) — 창(글자칸+테두리 여유 1.65em)보다 커야 대기 중인 '1'이 안 비침
  let box, el, crab, crabOn = false, curKey = null;
  let chars = [], words = [], hots = [], G = {}, odo = null, eight = null, scrollEls = null;

  function init(container) {
    box = container;
    el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;text-align:center;will-change:transform,opacity;opacity:0;' +
      'font-family:"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",-apple-system,sans-serif;font-weight:900;line-height:1.25;' +
      'letter-spacing:-0.02em;word-break:keep-all;backface-visibility:visible;';
    box.appendChild(el);
    // 꽃게(9장면): 문장과 같은 층(letters) 안에 따로 둠 — 문장 요소 안에 넣으면 문장의 기우뚱·등장 회전을 같이 타서 걷는 게 안 보임
    crab = document.createElement('div');
    crab.textContent = '🦀';
    crab.style.cssText = 'position:absolute;left:0;top:0;opacity:0;line-height:1;transform-origin:0 0;will-change:transform,opacity;' +
      'font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;text-shadow:' + outline(.06, '0 .08em .12em rgba(40,0,80,.4)') + ';';
    box.appendChild(crab);
  }

  // 흰 테두리(겹 그림자) + 보라 그림자 → 고양이 위에 겹쳐도 읽힘
  function outline(r, tail) {
    const out = [];
    for (let a = 0; a < 16; a++) out.push(`${(Math.cos(a / 8 * Math.PI) * r).toFixed(3)}em ${(Math.sin(a / 8 * Math.PI) * r).toFixed(3)}em 0 #fff`);
    out.push(tail);
    return out.join(',');
  }
  const OUTLINE = outline(.075, '0 0.13em 0 #6a3cff,0 0.18em 0.25em rgba(40,0,80,.35)');
  const GLOW = OUTLINE + ',0 0 .5em rgba(255,60,140,.55)';   // 사랑해!!: 분홍 후광

  const textOf = item => (typeof item === 'string' ? item : (item && item.t)) || '';

  // 문장 → 줄 → [단어 | 공백] → 단어 안 조각(강조 hot 여부). 글자는 자르기만 하고 절대 안 바꿈.
  //  맨 아래 node 검사가 이 결과를 다시 이어 붙여 원문과 비교하므로, 화면에 그리는 글자는 반드시 이 함수 결과만 씀.
  function tokenize(text, hot) {
    const flat = text.replace(/\n/g, '');
    const h0 = hot ? flat.indexOf(hot) : -1, h1 = h0 < 0 ? -1 : h0 + hot.length;
    let i = 0;
    return text.split('\n').map(line => line.split(/(\s+)/).filter(Boolean).map(part => {
      if (/^\s+$/.test(part)) { i += part.length; return { space: part }; }
      const segs = [];
      for (const ch of part) {
        const isHot = i >= h0 && i < h1, last = segs[segs.length - 1];
        if (last && last.hot === isHot) last.s += ch; else segs.push({ s: ch, hot: isHot });
        i += ch.length;
      }
      return { segs };
    }));
  }

  // 400→401: 두 문장의 차이를 계산으로 뽑음(공통 앞부분 + 바뀌는 한 글자 + 같은 뒷부분 + 새로 붙는 꼬리).
  //  글자를 코드에 따로 적지 않고 원문 두 줄에서만 만들어야 "원문 그대로"가 보장됨.
  function odoParts(a, b) {
    let p = 0;
    while (p < a.length && a[p] === b[p]) p++;
    // 뒤 문장이 앞 문장 + 꼬리뿐('축하해!'→'축하해!!', plain.html): 굴릴 글자 없이 꼬리만 퐁 (2026-09-27 통일 버전용)
    if (p >= a.length && b.length > a.length) return { pre: a, d0: '', d1: '', mid: '', extra: b.slice(a.length) };
    const mid = a.slice(p + 1);
    if (p >= a.length || !b.slice(p + 1).startsWith(mid)) return null;
    return { pre: a.slice(0, p), d0: a[p], d1: b[p], mid, extra: b.slice(p + 1 + mid.length) };
  }
  // 이 장면이 400→401 한 덩어리의 일부면 [앞 장면, 뒤 장면]
  function odoPair(k) {
    const L = window.LETTER_LINES, is = i => L[i] && L[i].fx === 'odo';
    if (!is(k)) return null;
    return is(k - 1) && !is(k - 2) ? [k - 1, k] : is(k + 1) ? [k, k + 1] : null;
  }

  function build(text, k, opt) {
    const pal = PALETTES[k % PALETTES.length], hp = HOT_PAL[opt.fx];
    el.innerHTML = '';
    chars = []; words = []; hots = []; odo = null; scrollEls = null;
    let n = 0, hn = 0;
    tokenize(text, opt.hot).forEach((line, li) => {
      if (li) el.appendChild(document.createElement('br'));   // 유저가 정한 줄바꿈
      line.forEach(tok => {
        if (tok.space) { el.appendChild(document.createTextNode(tok.space)); return; }
        const w = document.createElement('span');          // 단어 단위로 줄바꿈(단어 중간에서 안 끊기게)
        w.style.cssText = 'display:inline-block;white-space:nowrap;';
        if (opt.fx === 'slam') w.style.transformOrigin = '50% 90%';
        const wc = [];
        tok.segs.forEach(seg => {
          let host = w;
          if (seg.hot) {
            // 강조 글자 묶음: 크기(em)·변형을 여기에만 줌. 안쪽 글자엔 will-change 를 안 줌
            //  (will-change 레이어는 처음 크기로 한 번만 래스터돼서, 부모가 늘이면 흐릿해짐)
            host = document.createElement('span');
            // 줄높이: 칼질은 들어 올릴 자리(1.35), 커지는 '기대할게'는 거대해지면 글자 윗테두리가 윗줄을 덮어서(가로 화면에서 확인) 1.2, 나머지 1.05
            host.style.cssText = `display:inline-block;white-space:nowrap;line-height:${opt.fx === 'chop' ? 1.35 : opt.fx === 'grow' ? 1.2 : 1.05};font-size:${opt.hs || 1}em;` +
              (opt.fx === 'chop' ? 'transform-origin:50% 96%;' : opt.fx === 'fat' ? 'transform-origin:50% 88%;' : 'transform-origin:50% 60%;');
            w.appendChild(host); hots.push(host);
          }
          for (const ch of seg.s) {
            const s = document.createElement('span');
            s.textContent = ch;
            const col = seg.hot && hp ? hp[hn++ % hp.length] : pal[n % pal.length];
            s.style.cssText = `display:inline-block;color:${col};text-shadow:${opt.fx === 'heart' && seg.hot ? GLOW : OUTLINE};` + (seg.hot ? '' : 'will-change:transform;');
            host.appendChild(s);
            const rec = { s, hot: seg.hot, col, cur: col, hash: hash(n) };
            chars.push(rec); wc.push(rec); n++;
          }
        });
        el.appendChild(w); words.push({ w, chars: wc });
      });
    });
  }

  // 400일→401일: 끝자리를 계기판 바퀴로 바꾸고, 뒤 문장에만 있는 꼬리('!')를 숨겨서 붙여 둠
  function buildOdo(pair) {
    const L = window.LETTER_LINES, P = odoParts(textOf(L[pair[0]]), textOf(L[pair[1]]));
    if (!P) return;
    if (!P.d0) {                                           // 꼬리만 붙는 경우: 굴림판 없이 '!' 만 숨겨 붙여 둠
      const lastC = chars[chars.length - 1], ex0 = document.createElement('span');
      ex0.textContent = P.extra;
      ex0.style.cssText = `display:inline-block;color:${RAINBOW[(chars.length + 1) % RAINBOW.length]};text-shadow:${OUTLINE};transform:scale(0);`;
      lastC.s.parentNode.appendChild(ex0);
      odo = { strip: null, one: null, digit: null, ex: ex0, exW: 0 };
      return;
    }
    const rc = chars[[...P.pre].length];                   // 바뀌는 자리의 글자('0')
    const roller = document.createElement('span');
    // 창: 위아래를 잘라서 굴러가는 숫자가 창 밖에선 안 보이게. 옆·아래로는 흰 테두리·보라 그림자 몫만큼 여유
    roller.style.cssText = 'display:inline-block;position:relative;-webkit-clip-path:inset(-.15em -.6em -.4em -.6em);clip-path:inset(-.15em -.6em -.4em -.6em);';
    const strip = document.createElement('span');
    strip.style.cssText = 'display:inline-block;position:relative;';
    rc.s.replaceWith(roller); roller.appendChild(strip); strip.appendChild(rc.s);
    const one = document.createElement('span');
    one.textContent = P.d1;
    // 굴러 들어오는 '1'은 원래 숫자와 다른 색(핫핑크) → '어? 숫자 바뀌었다'가 한눈에
    one.style.cssText = `position:absolute;left:0;right:0;top:${ROLL}em;color:${rc.col === '#ff4f9a' ? '#ffb800' : '#ff4f9a'};text-shadow:${OUTLINE};`;
    strip.appendChild(one);
    const last = chars[chars.length - 1];
    const ex = document.createElement('span');
    ex.textContent = P.extra;
    ex.style.cssText = `display:inline-block;color:${RAINBOW[(chars.length + 1) % RAINBOW.length]};text-shadow:${OUTLINE};transform:scale(0);`;
    last.s.parentNode.appendChild(ex);
    odo = { strip, one, digit: rc, ex, exW: 0 };
  }

  const clamp = v => Math.max(0, Math.min(1, v));
  const fr = v => v - Math.floor(v);                         // 박 안에서의 위치 0..1
  const smooth = t => t * t * (3 - 2 * t);
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const backOut = t => { const s = 1.8; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
  const bounceOut = t => { const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
  // 용수철: 0에서 1로 가며 10%쯤 넘쳤다 돌아옴(끝에서 정확히 1)
  const spring = t => t >= 1 ? 1 : t <= 0 ? 0 : 1 - Math.exp(-8 * t) * Math.cos(11 * t);
  // 박마다 한 칸씩 올라가는 계단(각 칸은 용수철) — '계속 커짐', '꿀꺽꿀꺽' 에 씀
  const steps = (u, n) => u >= n ? 1 : u <= 0 ? 0 : (Math.floor(u) + spring(fr(u) * 1.6)) / n;
  // 가운데 구간 자세(박마다 쿵 + 느린 기우뚱) — frame 과 attention 이 같은 식을 써야 8을 가리키는 손끝이 안 어긋남
  const holdPose = (beat, from) => ({ sc: 1 + .06 * Math.exp(-fr(beat - from) * 6), rot: Math.sin(Math.PI * beat / 2) * 2.5 });
  // 글자 크기는 값이 바뀔 때만 씀(레이아웃 다시 계산이 일어나서). style.fontSize 로 비교하면 브라우저가 '1.000em'→'1em' 으로 바꿔 둬서 매번 다르다고 나옴 → 따로 기억
  const setFS = (node, em) => { const v = em.toFixed(3); if (node._fs !== v) { node._fs = v; node.style.fontSize = v + 'em'; } };
  const setCol = (r, col) => { if (r.cur !== col) { r.cur = col; r.s.style.color = col; } };

  // 8마리나: 장면 시작 박 기준. 4박(=다음 마디 정박)에 쾅 커지고 12박(그다음 마디)에 제자리로
  const EIGHT_UP = 4, EIGHT_DOWN = 12;
  const eightPulse = (g, f) => (g > .5 ? 1 + .06 * Math.exp(-f * 7) : 1);
  function eightG(bb) {
    if (bb < EIGHT_UP) return 0;
    if (bb < EIGHT_DOWN) return spring((bb - EIGHT_UP) / 1.2);
    return 1 - smooth(clamp((bb - EIGHT_DOWN) / .8));
  }

  // 문장이나 화면 크기가 바뀔 때만: 다시 만들고 크기 계산 + 개그에 필요한 위치를 재서 저장(매 프레임 레이아웃 읽기 없음)
  function lay(text, k, opt, c, pair, baseY, S, from) {
    const { W, H, tall } = c;
    build(text, k, opt);
    if (pair) buildOdo(pair);
    const maxW = W * (tall ? .9 : .7);
    let fs;
    if (opt.fill) {
      // 꽉 채우기: 100px 로 한 번 재서 상자(fill 비율)에 맞는 최대 크기로 비례 확대
      el.style.width = 'max-content'; el.style.fontSize = '100px';
      const w0 = el.offsetWidth || 1, h0 = el.offsetHeight || 1;
      fs = 100 * Math.min(W * opt.fill[0] / w0, H * opt.fill[1] / h0);
    } else {
      // 글자 수가 많으면 글씨를 줄임(16자 기준, 최소 72%) — 처음 .62 는 35자 문장이 폰에서 21px 로 너무 작았음
      const fit = Math.max(.72, Math.min(1, Math.sqrt(16 / Math.max(1, [...text.replace(/\n/g, '')].length))));
      fs = Math.min(W * (tall ? .085 : .05), H * .065, 46) * fit;
      if (text.includes('\n')) {
        // 줄을 직접 나눈 문장: 가장 긴 줄이 한 줄에 들어가게만 줄임(안 그러면 줄 끝 단어 하나가 혼자 밑줄로 떨어져 나눈 의미가 없어짐)
        el.style.width = 'max-content'; el.style.fontSize = '100px';
        fs = Math.min(fs, 100 * maxW * .98 / (el.offsetWidth || 1));
      }
      el.style.width = maxW + 'px';
    }
    el.style.fontSize = fs + 'px';
    const h = hots[0];
    if (opt.fx === 'heart' && h && h.offsetWidth * 1.3 > W * .95) {
      h.style.fontSize = (opt.hs * W * .95 / (h.offsetWidth * 1.3)) + 'em';   // 두근(최대 1.3배)에도 화면 밖으로 안 나가게
    }
    G = { fs, maxW, elW: el.offsetWidth, elH: el.offsetHeight };

    if (opt.fx === 'eight' && h) {
      // 8의 가운데가 문장 가운데에서 얼마나 떨어졌나: 평소 크기·최대 크기 두 번만 재 두고, 사이는 보간
      const at = () => [h.offsetLeft + h.offsetWidth / 2 - el.offsetWidth / 2, h.offsetTop + h.offsetHeight * .47 - el.offsetHeight / 2];
      const p0 = at();
      // 최대 크기: '8마리나' 한 단어가 한 줄에 들어가는 한도 & 8 높이가 화면 42% 이하. 용수철로 11% 넘쳐도 줄바꿈이 안 바뀌게 여유
      const cap = Math.min(1 + (maxW * .97 - h.parentNode.offsetWidth) / Math.max(1, h.offsetWidth), H * .42 / Math.max(1, h.offsetHeight));
      const hsT = Math.max(1.5, cap / 1.12);
      h.style.fontSize = hsT + 'em';
      const p1 = at();
      h.style.fontSize = '1em';
      eight = { S, from, y: baseY, p0, p1, hsT, fs, idx: chars.findIndex(r => r.hot) };
    }
    if (opt.fx === 'crab' && h) {
      G.hotDx = h.offsetLeft + h.offsetWidth / 2 - el.offsetWidth / 2;   // '꽃게' 가운데 x (문장 가운데 기준)
      crab.style.fontSize = Math.min(W * .16, H * .16) + 'px';          // 화면 폭 16% (가로 화면에선 높이 16%로 제한)
    }
    if (opt.fx === 'grow' && h) {
      // 끝 크기: 한 줄 폭(가로 화면에선 .7W)·화면 높이 30% 중 먼저 닿는 쪽. 계단 용수철이 넘쳐도 안 삐져나오게 4% 여유
      G.hsT = Math.max(1.4, Math.min(Math.min(maxW, W * .94) / h.offsetWidth, H * .3 / h.offsetHeight) / 1.04);
    }
    if (opt.fx === 'fat' && h) G.sxMax = Math.max(1.15, Math.min(1.75, W * .94 / h.offsetWidth));   // 옆으로 최대 1.75배, 화면 폭 94%까지
    if (opt.fx === 'scroll' && hots.length) layScroll(opt);
    if (odo) odo.exW = odo.ex.offsetWidth;
  }

  // 족자: 강조 글자 기둥 뒤에 한지 + 비단 테두리 + 위아래 나무 막대. 위치는 여기서 한 번만 재고, 펼침은 clip 으로만 함
  function layScroll(opt) {
    const hf = G.fs * (opt.hs || 1);
    const slots = hots.map(x => [x.offsetTop, x.offsetTop + x.offsetHeight]);
    const cx = hots[0].offsetLeft + hots[0].offsetWidth / 2;
    const colW = Math.max(...hots.map(x => x.offsetWidth));
    const pad = hf * .14, pw = colW * 1.5, rodH = hf * .17, rodW = pw * 1.3;
    const PT = slots[0][0] - pad, PB = slots[slots.length - 1][1] + pad;
    const mk = css => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;z-index:-1;' + css; el.appendChild(d); return d; };
    const paper = mk(`left:${cx - pw / 2}px;top:${PT}px;width:${pw}px;height:${PB - PT}px;box-sizing:border-box;` +
      `border:${hf * .07}px solid #8fbfe6;background:linear-gradient(90deg,#f3e4c2,#fffaf0 45%,#f6ead0);box-shadow:0 ${hf * .06}px ${hf * .2}px rgba(40,20,0,.3);`);
    const rod = `left:${cx - rodW / 2}px;top:0;width:${rodW}px;height:${rodH}px;border-radius:${rodH / 2}px;` +
      'background:linear-gradient(#5a3314,#c98d4e 35%,#7a4a22 70%,#3e220c);box-shadow:0 2px 4px rgba(0,0,0,.35);';
    const top = mk(rod + `transform:translateY(${PT - rodH / 2}px);`);
    const bot = mk(rod);
    // 걸이 끈(세모) — 벽에 건 족자라는 게 한눈에 보이게
    const str = mk(`left:${cx - pw * .4}px;top:${PT - rodH / 2 - hf * .42}px;width:${pw * .8}px;height:${hf * .42}px;` +
      'background:linear-gradient(to top right,transparent calc(50% - 1.5px),#7a4a22 calc(50% - 1.5px),#7a4a22 calc(50% + 1.5px),transparent calc(50% + 1.5px)) left/50% 100% no-repeat,' +
      'linear-gradient(to top left,transparent calc(50% - 1.5px),#7a4a22 calc(50% - 1.5px),#7a4a22 calc(50% + 1.5px),transparent calc(50% + 1.5px)) right/50% 100% no-repeat;');
    scrollEls = { paper, top, bot, str, PT, PB, rodH, edges: [PT, ...slots.slice(0, -1).map(s => s[1]), PB] };
  }

  function hideAll() {
    if (el) el.style.opacity = 0;
    if (crabOn) { crab.style.opacity = 0; crabOn = false; }
  }

  // c = { beat, scenes: [[시작박, 길이, 문장높이]...], W, H, tall, demo, y }
  function frame(c) {
    if (!el) return;
    const { beat, scenes, W, H, tall } = c;
    let k = -1;
    for (let i = 0; i < scenes.length; i++) if (beat >= scenes[i][0] && beat < scenes[i][0] + scenes[i][1]) k = i;
    const pair = k >= 0 ? odoPair(k) : null;
    const k0 = pair ? pair[0] : k, k1 = pair ? pair[1] : k;   // 400→401 은 두 장면을 한 문장처럼(앞 장면 등장, 뒤 장면 퇴장)
    const item = k0 >= 0 ? LETTER_LINES[k0] : '';
    const opt = item && typeof item === 'object' ? item : {};
    const text = textOf(item) || (k >= 0 && c.demo ? `${k + 1}번 문장 자리` : '');
    if (!text) { hideAll(); curKey = null; return; }
    const yOf = i => (scenes[i] && scenes[i][2] != null ? scenes[i][2] : (c.y ?? .5));
    const baseY = opt.y ?? (opt.fill ? .5 : yOf(k0));       // 꽉 채우는 문장은 화면 한가운데
    const S = scenes[k0][0];
    const from = k0 === 0 ? 3 : S + .25;                   // 첫 장면은 고양이 등장이 끝난 뒤(3박)부터
    const len = scenes[k1][0] + scenes[k1][1] - from - .25; // 다음 장면 직전에 다 빠지게
    const key = k0 + '|' + text + '|' + W + 'x' + H;
    if (key !== curKey) { curKey = key; lay(text, k0, opt, c, pair, baseY, S, from); }

    const fx = opt.fx, bb = beat - S, f = fr(beat);
    if (fx !== 'crab' && crabOn) { crab.style.opacity = 0; crabOn = false; }
    const b = beat - from;
    if (b < 0 || b > len) { hideAll(); return; }
    const e = clamp(b / ENTER), x = clamp((b - (len - EXIT)) / EXIT);
    const style = opt.style || STYLES[ORDER[k0 % ORDER.length]];   // 문장별로 등장 방식 지정 가능

    // 가운데 구간: 박마다 쿵(1.06배) + 느린 좌우 기우뚱
    const hp = holdPose(beat, from);
    let sc = hp.sc, rot = hp.rot, tx = 0, ty = 0, rx = 0, ry = 0, op = 1;

    // 들어오기
    const eb = backOut(e);
    switch (style) {
      case 'spin180': rot += (1 - eb) * 180; sc *= .2 + .8 * eb; op = clamp(e * 3); break;                 // 거꾸로 180도에서 휙 돌아 바로 섬
      case 'flipY': ry = (1 - e) * 540; op = clamp(e * 4); break;                                        // 앞뒤로 뒤집히며 등장 (뒷면은 좌우반전 글자)
      case 'stamp': sc *= 1 + 3.2 * Math.pow(1 - e, 2); rot += -9 * e; op = clamp(e * 2.5); break;       // 도장 쾅
      case 'twirl': rot += (1 - e) * 720; sc *= eb; break;                                                // 뱅글뱅글 두 바퀴 돌며 커짐
      case 'flipX': rx = (1 - e) * 360; op = clamp(e * 4); break;                                        // 앞으로 공중제비
      case 'drop': ty = -(1 - bounceOut(e)) * H * .6; break;                                            // 위에서 떨어져 통통
      case 'fly': tx = -(1 - eb) * W; ty = (1 - eb) * H * .25; rot += (1 - eb) * -80; break;           // 왼쪽 아래에서 날아옴
      case 'chars': break;                                                                              // 글자가 하나씩 퐁퐁 (아래 글자별 처리)
      case 'none': break;                                                                               // 단어가 각자 들어옴(slam)
    }
    // 나가기: 180도 돌며 쪼그라들기 / 뒤집혀 사라지기 / 아래로 추락 — 장면마다 번갈아 (400→401 은 뒤 장면 기준)
    if (x > 0) {
      const xi = x * x;
      switch (k1 % 3) {
        case 0: rot += xi * -180; sc *= 1 - .9 * xi; break;
        case 1: ry += xi * 450; sc *= 1 - .5 * xi; break;
        case 2: ty += xi * H * .8; rot += xi * 50; break;
      }
      op *= 1 - clamp((x - .6) / .4);
    }

    if (opt.shake && x === 0) {                             // 삐져서 부들부들: 멈춰 있는 동안 빠르게 떨림
      const a = opt.shake * parseFloat(el.style.fontSize);
      tx += Math.sin(beat * 47) * a; ty += Math.sin(beat * 61 + 1) * a * .6; rot += Math.sin(beat * 53) * 2;
    }

    // ── 개그별 계산 (문장 전체에 주는 것) ──
    let yF = baseY, hotT = null, jolt = 0, chop = 0, waving = 0;
    const h = hots[0];
    if (fx === 'odo' && odo) {
      const B = scenes[k1][0];                              // 경계 박(49) = 강강술래 첫 정박. 여기서 딱 1이 됨
      // 굴림: 1박 전에 한 번 움찔(될까 말까) → 반 박 동안 점점 빨라지며 굴러 정박에 착 → 살짝 넘쳤다 돌아옴(계기판 바퀴 느낌)
      let p = 0;
      if (beat >= B - 1.1 && beat < B - .8) p = .12 * Math.sin(Math.PI * (beat - (B - 1.1)) / .3);
      else if (beat >= B - .45 && beat < B) p = Math.pow((beat - (B - .45)) / .45, 2.2);
      else if (beat >= B) { const t = Math.min(1, (beat - B) / .6); p = 1 + .13 * Math.sin(Math.PI * t) * (1 - t); }
      if (odo.strip) odo.strip.style.transform = `translateY(${(-p * ROLL).toFixed(3)}em)`;
      const pop = beat >= B ? backOut(clamp((beat - B) / .45)) : 0;
      odo.ex.style.transform = `scale(${pop.toFixed(3)}) rotate(${((1 - clamp(pop)) * -70).toFixed(1)}deg)`;
      tx += odo.exW / 2 * (1 - clamp(pop));                 // '!' 자리를 비워 둔 만큼 오른쪽으로 → 보이는 글자가 가운데
      if (beat >= B) sc *= 1 + .16 * Math.exp(-(beat - B) * 5);   // 1 되는 순간 문장 전체 쿵
      // 문장 높이: 파도타기(.5) → 강강술래(.78, 원이 위에 생김). 1이 된 걸 본 다음 반 박 뒤에 내려감
      yF = baseY + (yOf(k1) - baseY) * smooth(clamp((beat - (B + .75)) / 1.25));
    }
    if (fx === 'eight' && h && eight) {
      const g = eightG(bb);
      let hsv = 1 + (eight.hsT - 1) * g;
      hsv *= eightPulse(g, f);                             // 커져 있는 동안 박마다 쿵
      setFS(h, Math.max(.3, hsv));
    }
    if (fx === 'chop' && bb >= 1.2 && bb < 14.05) {
      // 칼질: 박 사이에 천천히 들어 올렸다가 정박에 쾅(납작). 박마다 좌우로 번갈아 살짝 기울여 내리침. 첫 쾅=장면 2박, 마지막=14박
      //  (처음엔 왼쪽 아래를 축으로 7도 젖혔는데, 긴 단어라 오른쪽 끝이 한 줄 넘게 올라가 윗줄 '그걸 또'를 덮음 → 수직으로 들고 기울기는 2.5도만,
      //   이 줄만 줄높이 1.35 로 위에 여유)
      const hit = Math.floor(beat) >= S + 2 && Math.floor(beat) <= S + 14;
      const lift = f < .15 ? 0 : f < .8 ? smooth((f - .15) / .65) : 1 - Math.pow((f - .8) / .2, 2);
      const side = Math.floor(beat) % 2 ? 1 : -1;
      chop = hit ? Math.exp(-f * 9) : 0;
      hotT = `translateY(${(-.2 * lift).toFixed(3)}em) rotate(${(side * 2.5 * lift).toFixed(2)}deg) scale(${(1 + .14 * chop).toFixed(3)},${(1 - .22 * chop).toFixed(3)})`;
      ty += H * .012 * chop;                                // 도마 쾅 → 문장 전체가 살짝 내려앉음
    }
    if (fx === 'grow' && h) {
      // 기대감이 부푼다: 장면 2박~10박, 박마다 한 칸씩(8칸) 커짐 → 끝까지 커지면 터지기 직전처럼 부들부들
      const u = beat - (S + 2);
      setFS(h, 1 + (G.hsT - 1) * steps(u, 8));
      if (u > 7.5) hotT = `rotate(${(Math.sin(beat * 41) * 2.5 * clamp((u - 7.5) / 1.5)).toFixed(2)}deg)`;
    }
    if (fx === 'fat' && h) {
      // 잔뜩 먹어서 옆으로 통통: 장면 3박~11박 박마다 꿀꺽(순간 납작) 한 칸씩 → 다 먹으면 배부른 젤리처럼 출렁
      const u = beat - (S + 3), fat = steps(u, 8);
      let sx = 1 + (G.sxMax - 1) * fat, sy = 1 + .12 * fat;
      if (u >= 0 && u < 8.5) { const gp = Math.exp(-f * 8); sy *= 1 - .14 * gp; sx *= 1 + .05 * gp; }
      if (u >= 8) sx *= 1 + .035 * Math.sin(beat * Math.PI * 2);
      hotT = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    }
    if (fx === 'heart') {
      // 두근두근: 장면 2박부터 박마다 쿵(크게)-쿵(작게), 끝으로 갈수록 조금씩 더 커짐
      const on = bb >= 2;
      const lub = on ? .15 * Math.exp(-f * 10) + (f > .3 ? .08 * Math.exp(-(f - .3) * 10) : 0) : 0;
      hotT = `scale(${((1 + .12 * smooth(clamp((bb - 2) / 8))) * (1 + lub)).toFixed(3)})`;
    }
    let slamState = null;
    if (fx === 'slam') {
      // 운동 구령: 장면 1박부터 박마다 단어 하나씩 화면 앞에서 날아와 쾅(마지막 '여부!'는 더 크게 더 세게)
      const T0 = S + 1, nW = words.length;
      slamState = words.map((wd, i) => {
        const lastW = i === nW - 1, d = beat - (T0 + i), side = i % 2 ? 1 : -1;
        let s = 1, o = 1, r = side * 4, sy = 1;
        if (d < -.35) o = 0;
        else if (d < 0) { const t = (d + .35) / .35; s = 1 + (lastW ? 6 : 3.5) * Math.pow(1 - t, 2); o = clamp(t * 3); r += (1 - t) * side * 25; }
        else { const im = Math.exp(-d * 10); sy = 1 - .22 * im; s = 1 + .08 * im; jolt = Math.max(jolt, Math.exp(-d * 9) * (lastW ? 1.8 : 1)); }
        if (beat > T0 + nW) sy *= 1 - .07 * Math.exp(-f * 6);   // 다 모이면 박마다 다 같이 스쿼트
        return { o, t: `rotate(${r.toFixed(2)}deg) scale(${(s * (1 + (1 - sy) * .6)).toFixed(3)},${(s * sy).toFixed(3)})` };
      });
      ty += H * .012 * jolt;
    }
    let scrollR = 0;
    if (fx === 'scroll' && scrollEls) {
      // 장면 3박부터 박마다 한 글자씩 촤락: 각 글자 칸은 정박 .4박 전부터 펼쳐져 정박에 다 보임
      const R0 = S + 3;
      for (let j = 0; j < hots.length; j++) scrollR += smooth(clamp((beat - (R0 + j - .4)) / .4));
      const E = scrollEls.edges, j = Math.min(E.length - 2, Math.floor(scrollR)), yb = E[j] + (E[j + 1] - E[j]) * clamp(scrollR - j);
      scrollEls.paper.style.clipPath = scrollEls.paper.style.webkitClipPath = `inset(0 0 ${Math.max(0, scrollEls.PB - yb).toFixed(1)}px 0)`;
      scrollEls.bot.style.transform = `translateY(${(yb - scrollEls.rodH / 2).toFixed(1)}px)`;
      const land = beat - R0 >= 0 && beat - R0 < hots.length ? Math.exp(-f * 9) : 0;
      ty += H * .006 * land;                                // 글자 하나 펼쳐질 때마다 툭
    }

    const y = H * yF;
    el.style.opacity = op;
    // 요소 가운데를 (W/2, y)에 둠: transform-origin 0 0 + 맨 끝 translate(-50%,-50%) → 매 프레임 offsetWidth 를 읽지 않아도 됨
    el.style.transform = `translate(${W / 2 + tx}px,${y + ty}px) perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${rot}deg) scale(${sc}) translate(-50%,-50%)`;
    if (hotT !== null) hots.forEach(hs => { hs.style.transform = hotT; });
    if (slamState) slamState.forEach((st, i) => { const w = words[i].w; w.style.opacity = st.o; w.style.transform = st.t; });

    // ── 꽃게 ──
    if (fx === 'crab') {
      const cs = parseFloat(crab.style.fontSize) || 60;
      const lane = H * yF + G.elH / 2 + cs * 1.45;        // 발밑 = 문장 아래 (1.15 는 인사하며 뛸 때 머리가 글자를 가렸음)
      const xT = W / 2 + G.hotDx, x0 = W + cs * .8, x1 = -cs * .8;
      // 오른쪽 밖 → (장면 1~6박) 옆걸음 → '꽃게' 밑에서 멈춰 4박 인사 → (10~13박) 왼쪽 밖으로. 박 앞 55% 동안만 걷고 나머지는 멈칫(종종걸음)
      const walk = (u, n) => u >= n ? 1 : u <= 0 ? 0 : (Math.floor(u) + smooth(Math.min(1, fr(u) / .55))) / n;
      let cx, rC, lift, sC = 1;
      if (bb < 6) { cx = x0 + (xT - x0) * walk(bb - 1, 5); rC = Math.sin(Math.PI * beat) * 7; lift = Math.abs(Math.sin(Math.PI * beat)) * .18; }
      else if (bb < 10) {
        waving = clamp((bb - 6) / .3) * (1 - clamp((bb - 9.7) / .3));
        cx = xT; rC = Math.sin(2 * Math.PI * beat) * 16 * waving; lift = Math.abs(Math.sin(Math.PI * beat)) * (.18 + .2 * waving); sC = 1 + .12 * waving;
      } else { cx = xT + (x1 - xT) * walk(bb - 10, 3); rC = Math.sin(Math.PI * beat) * 7; lift = Math.abs(Math.sin(Math.PI * beat)) * .18; }
      const show = bb >= 1 && bb <= 13.2;
      crab.style.opacity = show ? 1 : 0; crabOn = show;
      crab.style.transform = `translate(${cx.toFixed(1)}px,${(lane - lift * cs).toFixed(1)}px) rotate(${rC.toFixed(2)}deg) scale(${sC.toFixed(3)}) translate(-50%,-100%)`;
    }

    // 글자별: 물결 + ('chars' 등장이면) 한 글자씩 퐁 + 개그별 글자 움직임
    const n = chars.length, party = fx === 'eight' && bb > EIGHT_UP - .1 && bb < EIGHT_DOWN + .8;
    let hj = 0;
    for (let i = 0; i < n; i++) {
      const r = chars[i];
      const wave = Math.sin(Math.PI * beat + i * .55) * .07;
      let cs = 1, dy = 0;
      if (style === 'chars') cs = backOut(clamp((b - i / Math.max(1, n)) / .35));   // i번째 글자는 i/n 박에 퐁 (한 박 동안 전부 등장)
      if (chop && !r.hot) dy -= .28 * chop * (.4 + .6 * r.hash);                       // 칼질 쾅에 나머지 글자가 도마 위에서 튐
      if (r.hot) {
        if (fx === 'eight') setCol(r, party ? RAINBOW[Math.floor(beat) % RAINBOW.length] : r.col);   // 커져 있는 동안 박마다 무지개 색 바뀜
        if (fx === 'crab') {                                 // 게가 인사하는 동안 '꽃게'도 게 색으로 폴짝폴짝 같이 인사
          setCol(r, waving > .5 ? '#ff3b2f' : r.col);
          dy -= waving * .35 * Math.abs(Math.sin(Math.PI * beat + hj * .6));
        }
        if (fx === 'scroll') {                               // 족자가 그 칸까지 펼쳐진 다음에 글자가 퐁
          const v = clamp((scrollR - hj - .45) / .35);
          cs *= .55 + .45 * backOut(v);
          r.s.style.opacity = v;
        }
        hj++;
      }
      r.s.style.transform = `translateY(${(wave + dy).toFixed(3)}em) scale(${cs})`;
    }
    if (odo && odo.one) odo.one.style.transform = odo.digit.s.style.transform;   // 굴러 올라오는 '1'도 '0'과 같이 물결
  }

  // ── 8마리나: 엔진이 동물들을 이 점으로 돌려세워 손으로 가리키게 함 ──
  //  반환: null(가리킬 것 없음) 또는 { x, y: 화면 px(거대 8의 가운데), k: 0..1 세기(쾅 커질 때 부드럽게 켜지고 줄어들 때 꺼짐) }
  //  레이아웃을 안 읽음: 8 위치는 문장을 배치할 때(lay) 평소/최대 두 번 재 둔 값을 커진 정도로 보간 + frame 과 같은 기우뚱 식
  function attention(beat, W, H) {
    const E = eight;
    if (!E) return null;
    const bb = beat - E.S;
    const k = smooth(clamp((bb - EIGHT_UP) / .9)) * (1 - smooth(clamp((bb - (EIGHT_DOWN - .4)) / 1)));
    if (!(k > .001)) return null;
    const g0 = eightG(bb), g = clamp(g0), hp = holdPose(beat, E.from);
    // 글자 물결(.07em)도 8이 커지면 수십 px 라서 같이 더함 — 빼면 손끝이 8 가운데에서 최대 26px(500x1082) 어긋났음
    const wave = Math.sin(Math.PI * beat + E.idx * .55) * .07 * E.fs * (1 + (E.hsT - 1) * g0) * eightPulse(g0, fr(beat));
    const dx = E.p0[0] + (E.p1[0] - E.p0[0]) * g, dy = E.p0[1] + (E.p1[1] - E.p0[1]) * g + wave;
    const a = hp.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    return { x: W / 2 + hp.sc * (dx * cs - dy * sn), y: H * E.y + hp.sc * (dx * sn + dy * cs), k };
  }

  return { init, frame, attention, _tokenize: tokenize, _odoParts: odoParts, _textOf: textOf };
})();

// ── 글자 검사 (node 전용): `node letters.js` ─────────────────────────────────
//  ORIGINAL = 2026-09-26 2차 연출 작업 "직전"의 LETTER_LINES 글자를 그대로 복사해 둔 것(연출 바꾸기 전에 뽑음).
//  줄바꿈(\n)만 빼고 비교 → 줄바꿈 위치는 바꿔도 되지만 글자·띄어쓰기·순서는 하나라도 다르면 실패.
//  문장 데이터뿐 아니라 실제로 화면에 그리는 조각(tokenize)과 400→401 계기판 조립(odoParts)도 이어 붙여 원문과 비교함.
if (typeof document === 'undefined' && typeof process !== 'undefined') {
  const ORIGINAL = [
    "주원아! 생일 축하해!",
    "생일을 축하해줄 친구들도 8마리나 데려왔어!",
    "400일도 축하해!",
    "401일도 축하해!!",
    "요즘 바빠서 우리 여부에게 신경을 못 썼지",
    "앞으로는 바빠도 우리 여부 잘 챙겨주는 멋진 남자친구가 될게!",
    "그래도\n지금도\n멋지다고\n생각해줘!",
    "삐지지\n않기\n!!",
    "부모님이 여부 생일이라구 꽃게도 사주셨나봐",
    "그걸 또 힘차게 손질한 여부 너무 멋있어!",
    "다음에 홈파티할 때 기대할게 여부!",
    "요즘 열심히 운동하구 다이어트도 하는 여부!",
    "",
    "하지만 파티날에는 걱정 없이 맛난 거 잔뜩 먹어야 해 우리 여부!",
    "항상 하는 말이지만 그래두 명심해!",
    "슬슬 이거 끝날 때가 됐는데 생각 중이겠다",
    "피날레가 있을 거니까 기다려 여부!",
    "여부여부 항상 너무너무 사랑해!!",
  ];
  const flat = s => s.replace(/\n/g, '');
  const L = window.LETTER_LINES, Lt = window.Letters;
  const fails = [];
  if (L.length !== ORIGINAL.length) fails.push(`문장 수 ${L.length} ≠ ${ORIGINAL.length}`);
  let total = 0;
  ORIGINAL.forEach((orig, i) => {
    const item = L[i], opt = item && typeof item === 'object' ? item : {}, t = Lt._textOf(item), want = flat(orig);
    const no = `${i + 1}번`;
    if (flat(t) !== want) fails.push(`${no}: 데이터 글자가 원문과 다름\n   원문 ${JSON.stringify(want)}\n   지금 ${JSON.stringify(flat(t))}`);
    const drawn = Lt._tokenize(t, opt.hot).map(line => line.map(tk => tk.space || tk.segs.map(s => s.s).join('')).join('')).join('');
    if (drawn !== want) fails.push(`${no}: 화면에 그릴 조각을 이어 붙이면 원문과 다름 ${JSON.stringify(drawn)}`);
    if (opt.hot && flat(t).indexOf(opt.hot) < 0) fails.push(`${no}: 강조 글자 ${JSON.stringify(opt.hot)} 가 문장에 없음`);
    total += [...want].length;
  });
  // 400→401: 한 덩어리로 그리는 계기판이 3번·4번 문장을 각각 정확히 만들어 내는지
  const oi = L.map((x, i) => (x && x.fx === 'odo' ? i : -1)).filter(i => i >= 0);
  for (let j = 0; j + 1 < oi.length; j += 2) {
    const a = Lt._textOf(L[oi[j]]), b = Lt._textOf(L[oi[j + 1]]), P = Lt._odoParts(a, b);
    if (!P) { fails.push(`${oi[j] + 1}·${oi[j + 1] + 1}번: 계기판으로 이을 수 없는 두 문장`); continue; }
    if (P.pre + P.d0 + P.mid !== a) fails.push(`${oi[j] + 1}번: 계기판 조립(앞 장면)이 원문과 다름`);
    if (P.pre + P.d1 + P.mid + P.extra !== b) fails.push(`${oi[j + 1] + 1}번: 계기판 조립(뒤 장면)이 원문과 다름`);
    if (a[[...P.pre].length] !== P.d0) fails.push(`${oi[j] + 1}번: 바뀌는 글자 위치가 어긋남`);
  }
  if (fails.length) { console.log('✗ 글자 검사 실패\n' + fails.join('\n')); process.exitCode = 1; }
  else console.log(`✓ 글자 검사 통과: ${ORIGINAL.length}문장 전부 원문과 같음(줄바꿈만 다름) · 총 ${total}글자 · 계기판 ${oi.length / 2}쌍 확인`);
}
