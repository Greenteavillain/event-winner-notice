// 대형(formation) 동작 3종: ganggang(강강술래) · conga(기차놀이) · pyramid(고양이 피라미드)
// 규칙: pose(c)는 순수함수 — DOM·Math.random·Date·호출 간 상태 없음. 박자(c.b) 하나로 모든 게 결정됨.
// 강세: 정수 박(c.b = 0,1,2..)에 착지, 4의 배수(마디 첫 박)엔 더 크게.
// 대형 동작은 8마리를 "같은 원근 규칙"으로 다시 줄 세우므로 크기는 s = k / home.s 로 통일해서 씀
// (k = c.size 대비 배율 → 실제 키 = k * c.size).
(function () {
  'use strict';

  var PI = Math.PI, TAU = PI * 2;
  // 고양이 원본(cat.png)은 고개·앞발이 살짝 "왼쪽"을 향함 → sx=+1 이 왼쪽 보기.
  // 엔진이 고양이별 flip 을 sx 위에 또 곱는 구조라면 이 한 줄만 뒤집으면 됨.
  var FACE = 1;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(a, m) { return ((a % m) + m) % m; }
  function sgn(v, tie) { return v > 1e-9 ? 1 : v < -1e-9 ? -1 : tie; }
  // 얼굴 방향: 진행방향 부호(오른쪽 +1)를 "박 위 착지 지점"에서만 정하고, 바뀌면 공중에서 cos 로 휙 뒤돌기.
  // 왜 속도로 매 프레임 sx 를 안 정하나: 옆구간(가로속도≈0)에서 sx≈0 → 고양이가 실처럼 얇아지는데,
  //   폴짝 동작은 착지 때 거의 멈추므로 하필 그 얇은 순간이 오래 보임(수치로 확인: b=5 에서 sx=0.0 인 고양이 발생).
  //   이렇게 하면 착지 순간엔 항상 온전한 모습, 뒤돌기는 공중(e=0.5)에서 0 을 스쳐 지나감.
  function hopTurn(from, to, e) { return -(from === to ? from : from * Math.cos(PI * e)) * FACE; }

  // ─────────────────────────────────────────────────────────────
  // 1) ganggang — 강강술래
  // 의도: 8마리가 화면 가운데를 중심으로 납작한 타원(=위에서 비스듬히 본 원)을 그리며 손잡고 빙빙.
  //   · 원 뒤쪽(화면 위)은 작게, 앞쪽(화면 아래)은 크게 → 원근. z=발 y 라서 앞쪽이 뒤쪽을 가림.
  //   · 16박에 한 바퀴. 매 박 폴짝(박 위에 착지), 전진은 뜬 동안 더 많이 → 깡총깡총 도는 느낌.
  //   · 마디 마지막 박(4k+3)은 크게 뛰어서 다음 마디 첫 박에 쿵 착지.
  //   · 12~16박엔 원이 안으로 우르르 오므라들었다 다시 퍼짐("모여라~") → 16박짜리로 완결, 32박이면 한 번 더.
  //   · 진행방향(가로속도 부호)으로 몸을 돌림: 앞줄은 왼쪽, 뒷줄은 오른쪽으로 가고, 양 옆에서 뒤돌기.
  registerMove('ganggang', {
    label: '강강술래',
    pose: function (c) {
      var W = c.W, H = c.H, S = c.size, b = c.b;
      // 세로폰: 원 둘레(≈870px)에 8마리가 손잡고 "틈이 보이게" 서야 원으로 읽힘 → 고양이를 작게(앞 0.62/뒤 0.36),
      //   세로 여유가 많으니 타원을 덜 납작하게(ry 0.16H). 처음(앞 0.88)엔 한 덩어리 떼로 뭉쳐 보여서 줄였음(미리보기로 확인).
      var kBack = c.tall ? 0.36 : 0.42, kFront = c.tall ? 0.62 : 0.74, kMid = (kBack + kFront) / 2;
      var cx = W / 2, cy = H * (c.tall ? 0.56 : 0.6);
      var ry = H * (c.tall ? 0.16 : 0.17);
      // 양 옆 고양이 몸통(키*0.78 의 절반)이 화면 밖으로 안 나가게 가로 반지름을 잡음. 너무 좁아지면 하한.
      var rx = Math.max(W * 0.22, Math.min(W * 0.38, W / 2 - kMid * S * 0.39 - W * 0.03));

      // 자리 배정: 원래 떼창 자리의 각도 순서대로 원 위에 앉힘 → 진입 블렌드 때 서로 덜 엇갈림
      var myA = Math.atan2(c.home.y - cy, c.home.x - cx), rank = 0;
      for (var j = 0; j < c.n; j++) {
        if (j === c.i) continue;
        var a = Math.atan2(c.homes[j].y - cy, c.homes[j].x - cx);
        if (a < myA - 1e-9 || (Math.abs(a - myA) <= 1e-9 && j < c.i)) rank++;
      }

      var k = Math.floor(b), f = b - k;
      // 전진량: 뜬 동안 60%는 ease(착지 직전 멈칫), 40%는 등속 → 폴짝폴짝 돌되 완전히 멈추진 않음
      var prog = k + 0.6 * c.ease(f) + 0.4 * f;
      // 화면좌표(y 아래)에서 θ 증가 = 오른쪽→아래(앞)→왼쪽→위(뒤) = 화면상 시계방향
      var th = -PI + PI / 8 + rank * PI / 4 + TAU * prog / 16;

      // 12~16박(마디 4) 동안 sin² 로 오므라들었다 퍼짐 — 가장 모였을 때가 14박
      var q16 = mod(b, 16);
      var gather = q16 >= 12 ? Math.pow(Math.sin(PI * (q16 - 12) / 4), 2) : 0;
      var rm = 1 - 0.34 * gather;

      var sn = Math.sin(th), cs = Math.cos(th);
      var x = cx + rx * rm * cs, y = cy + ry * rm * sn;
      var kk = kBack + (kFront - kBack) * (sn + 1) / 2; // 앞(sinθ=1)일수록 크게
      var h = kk * S;
      var big = mod(k, 4) === 3 ? 1.9 : 1;              // 다음 마디 첫 박에 떨어지는 큰 점프
      var hop = h * 0.1 * big * c.bounce(f);

      var dirX = -sn;                                    // 가로속도 ∝ -sinθ (앞줄은 왼쪽으로 감)
      // 이번 박/다음 박 착지 각도에서의 진행방향. 정확히 옆(sinθ=0)이면 곧 갈 방향으로: 오른쪽 끝→왼쪽, 왼쪽 끝→오른쪽
      var th0 = -PI + PI / 8 + rank * PI / 4 + TAU * k / 16, th1 = th0 + TAU / 16;
      var F0 = sgn(-Math.sin(th0), Math.cos(th0) > 0 ? -1 : 1), F1 = sgn(-Math.sin(th1), Math.cos(th1) > 0 ? -1 : 1);
      // 진행방향으로 살짝 기울고 + 박마다 좌우로 번갈아 기우뚱(정수 박에서 최대)
      var rot = 7 * dirX + 5 * Math.cos(PI * b);
      return {
        x: x, y: y, s: kk / c.home.s, rot: rot, sx: hopTurn(F0, F1, c.ease(f)), lift: hop, z: y,
        // 모자는 한 박자 늦게 따라옴: 떨어질 때 머리 위로 살짝 떠 있다가 착지 직후(0.2박)에 제자리
        hat: { dy: -h * 0.06 * big * c.bounce(f + 0.8), rot: -rot * 0.9 },
      };
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 2) conga — 기차놀이
  // 의도: 한 줄로 서서 앞 고양이를 졸졸 따라가며 화면을 휘젓는 콩가 라인. "하나 둘 셋 뻥!"
  //   · 길: 세로화면 = 세로로 선 8자, 가로화면 = 가로로 누운 ∞자. 가운데 교차점을 X자로 지나감
  //     (줄 길이 = 경로의 35~45% 라 머리와 꼬리가 교차점에서 부딪히진 않음).
  //   · 원근: 화면 위쪽 = 멀리 = 작게. 간격도 "세계 거리"(화면 거리 ÷ 크기)로 재서 멀리 있는 줄은 촘촘해 보임.
  //   · 한 마디 = 폴짝폴짝폴짝(세 박 동안 전진, 박 위에 착지) + 넷째 박에 옆으로 다리 뻥(rot)하고 멈춤.
  //     뻥 방향은 마디마다 좌/우 번갈아. 16박 = 4마디 = 경로 한 바퀴, 32박이면 두 바퀴.
  //   · 맨 앞 고양이(i=0)는 기관차: 모자를 머리 위로 번쩍 들어 흔듦.
  function congaGeom(c) {
    var g = { tall: c.tall, cx: c.W / 2 };
    if (c.tall) { g.ax = c.W * 0.3; g.ay = c.H * 0.25; g.cy = c.H * 0.58; g.kFar = 0.45; g.kNear = 0.72; }
    else { g.ax = c.W * 0.36; g.ay = c.H * 0.2; g.cy = c.H * 0.6; g.kFar = 0.4; g.kNear = 0.62; }
    return g;
  }
  // t∈[0,2π) 한 바퀴. 세로 8자: x=sin2t, y=sint / 가로 ∞: x=sint, y=sin2t (둘 다 t=0,π 에서 가운데 교차)
  function congaX(g, t) { return g.cx + g.ax * Math.sin(g.tall ? 2 * t : t); }
  function congaY(g, t) { return g.cy + g.ay * Math.sin(g.tall ? t : 2 * t); }
  function congaDX(g, t) { return g.tall ? 2 * g.ax * Math.cos(2 * t) : g.ax * Math.cos(t); }
  // 그 지점에서의 가로 진행 부호. 딱 방향이 꺾이는 점이면 조금 앞(t+0.02)의 방향 = 곧 갈 방향
  function congaFace(g, t) { return sgn(congaDX(g, t), congaDX(g, t + 0.02) >= 0 ? 1 : -1); }
  // 세계 호 길이 s → 경로 매개변수 t (누적표 이분탐색 + 구간 선형보간)
  function congaT(cum, N, s) {
    var lo = 0, hi = N;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    var seg = cum[hi] - cum[lo];
    return TAU * (lo + (seg > 0 ? (s - cum[lo]) / seg : 0)) / N;
  }
  function congaK(g, y) { return g.kFar + (g.kNear - g.kFar) * clamp((y - (g.cy - g.ay)) / (2 * g.ay), 0, 1); }

  registerMove('conga', {
    label: '기차놀이',
    pose: function (c) {
      var S = c.size, b = c.b, g = congaGeom(c);
      // 호 길이 표(매 호출마다 새로 계산 — 상태 저장 금지 규칙. 121점이라 8마리×60fps 에도 가벼움)
      // 세계거리 = 화면거리 / 원근배율 → 같은 세계간격이면 멀리 있는 고양이끼리는 화면상 더 붙어 보임
      var N = 120, cum = new Array(N + 1), total = 0;
      var px = congaX(g, 0), py = congaY(g, 0);
      cum[0] = 0;
      for (var j = 1; j <= N; j++) {
        var t = TAU * j / N, nx = congaX(g, t), ny = congaY(g, t);
        var dx = nx - px, dy = ny - py;
        total += Math.sqrt(dx * dx + dy * dy) / congaK(g, (ny + py) / 2);
        cum[j] = total; px = nx; py = ny;
      }

      var bar = Math.floor(b / 4), q = b - bar * 4;
      // 마디 안 전진: 0~3박은 폴짝 한 번에 한 칸(ease → 박 위 착지 때 멈칫), 3~4박은 뻥차기라 제자리
      var steps = q < 3 ? Math.floor(q) + c.ease(q - Math.floor(q)) : 3;
      var prog = bar * 3 + steps;                        // 12칸 = 한 바퀴
      var gap = S * 0.72;                                // 앞 고양이와의 세계간격 ≈ 몸 폭의 90%(살짝 겹쳐 허리 잡은 느낌. 0.58은 떼로 뭉쳐 보였음)
      var s = mod(total * prog / 12 - c.i * gap, total);

      var tt = congaT(cum, N, s);
      var x = congaX(g, tt), y = congaY(g, tt);
      var kk = congaK(g, y), h = kk * S;

      // 진행방향(접선)의 가로성분 → 몸 기울기용(연속값)
      var tx = congaDX(g, tt), ty = g.tall ? g.ay * Math.cos(tt) : 2 * g.ay * Math.cos(2 * tt);
      var dirX = tx / (Math.sqrt(tx * tx + ty * ty) || 1);
      // 얼굴 방향은 착지 칸(n, n+1)에서만 정함 → 공중에서 뒤돌기 (hopTurn 주석 참고). 뻥차기 박은 제자리라 그대로.
      var n = bar * 3 + (q < 3 ? Math.floor(q) : 3);
      var F0 = congaFace(g, congaT(cum, N, mod(total * n / 12 - c.i * gap, total)));
      var F1 = congaFace(g, congaT(cum, N, mod(total * (n + 1) / 12 - c.i * gap, total)));
      var turnE = q < 3 ? c.ease(q - Math.floor(q)) : 0;

      // 넷째 박(4k+3) 정박에 다리 뻥: 0.15박 만에 확 기울고, 0.6박까지 버티고, 다음 마디 첫 박 전에 복귀
      var kick = 0;
      if (q >= 3) {
        var kq = q - 3;
        kick = kq < 0.15 ? c.ease(kq / 0.15) : kq < 0.6 ? 1 : 1 - c.ease((kq - 0.6) / 0.4);
      }
      var kd = mod(bar, 2) === 0 ? 1 : -1;               // 마디마다 좌/우 번갈아
      var kickDeg = (16 + 10 * c.rnd(3)) * kd * kick;    // 고양이마다 기울기 제각각 = 엉성한 맛
      var hop = q < 3 ? c.bounce(q) : 0;

      var hat;
      if (c.i === 0) {
        // 기관차: 모자를 번쩍 들고(머리 위로 떠 있음) 박마다 좌우로 흔듦
        hat = { dy: -h * (0.16 + 0.06 * c.bounce(b)), rot: 22 * Math.cos(PI * b) - kickDeg * 0.5 };
      } else {
        // 나머지: 뻥 찰 때 모자가 반대쪽으로 휙 쏠림
        hat = { dy: -h * 0.04 * hop, rot: -kickDeg * 1.1 };
      }
      return {
        x: x - kd * kick * h * 0.05,                     // 다리 뻗는 반대쪽으로 몸통 살짝 이동
        y: y, s: kk / c.home.s,
        rot: kickDeg + 4 * dirX,
        sx: hopTurn(F0, F1, turnE),
        lift: h * (0.09 * hop + 0.035 * kick),           // 뻥 찰 땐 한 발 까치발
        z: y, hat: hat,
      };
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 3) pyramid — 고양이 피라미드
  // 의도: 가운데 아래에 4-3-1 로 쌓은 인간 피라미드(아니고 고양이). 윗단은 아랫단 머리 위에 올라섬.
  //   · 원래 자리가 화면 아래쪽인 4마리 = 맨 아랫단, 다음 3마리 = 가운데단, 제일 위에 있던 1마리 = 꼭대기.
  //   · 박마다 좌/우 번갈아 기우뚱: 기우는 쪽 아래 모서리를 축으로 통째로 까딱(반대쪽 발이 살짝 들림).
  //     윗단일수록 0.1박씩 늦고 더 크게 → 젤리처럼 휘청.
  //   · 꼭대기 고양이: 매 마디 셋째 박(4k+2)에 도움닫기해서 2박 동안 날았다가 다음 마디 첫 박(다운비트)에 쿵 착지.
  //     홀수 번째 점프 = 모자만 더 높이 튕겨 올라 한 바퀴 돌고 머리로 복귀, 짝수 번째 = 공중 앞구르기(몸 중심 회전).
  //   · 착지 순간 피라미드 전체가 푹 눌렸다 튀어오르고(윗단일수록 더 많이) 젤리처럼 흔들림.
  //   · 깔린 고양이들 모자는 옆으로 찌그러져 밀려 있음. 꼭대기 바로 밑 고양이 모자는 꼭대기가 뛰는 동안만
  //     띠용 하고 서 있다가 착지하면 다시 납작.
  //   · 윗단이 앞에 그려지게 z 를 단수로 줌(발이 아랫단 머리 위에 보여야 "올라선" 것으로 읽힘).
  registerMove('pyramid', {
    label: '고양이 피라미드',
    pose: function (c) {
      var W = c.W, H = c.H, b = c.b;
      var RISE = 0.8, JUMP = 0.55;                       // 한 단 높이 = 키*0.8 (정수리 0.876 보다 살짝 낮게 → 머리를 밟고 눌림)
      var yb = H * (c.tall ? 0.88 : 0.9);
      // 폭: 4마리 × 간격 0.72폭 + 한 폭 = 2.465×키 가 화면 94% 안 / 높이: 2단 + 몸+모자 1.45 + 점프 가 바닥~화면 위 4% 안
      var h = Math.min(0.94 * W / 2.465, (yb - 0.04 * H) / (2 * RISE + 1.45 + JUMP));
      var d = h * 0.78 * 0.72, cx = W / 2;

      // 단 배정: 원래 자리가 아래(y 큰)인 순서 → 0~3 아랫단, 4~6 가운데단, 7 꼭대기. 단 안에서는 x 순서.
      var ord = [];
      for (var j = 0; j < c.n; j++) ord.push(j);
      ord.sort(function (p, r) {
        var dy = c.homes[r].y - c.homes[p].y;
        return Math.abs(dy) > 1e-6 ? dy : p - r;
      });
      var pos = ord.indexOf(c.i);
      var tier = pos < 4 ? 0 : pos < 7 ? 1 : 2;
      var start = tier === 0 ? 0 : tier === 1 ? 4 : 7, cnt = tier === 0 ? 4 : tier === 1 ? 3 : 1;
      var col = 0;
      for (var m = start; m < start + cnt; m++) {
        if (m !== pos && (c.homes[ord[m]].x < c.home.x || (c.homes[ord[m]].x === c.home.x && ord[m] < c.i))) col++;
      }
      var X = (col - (cnt - 1) / 2) * d;                 // 가운데 기준 가로 위치 (윗단은 아랫단 두 마리 사이)
      var Y = tier * RISE * h;                           // 바닥에서의 높이

      // ── 박마다 기우뚱: 정수 박에서 반대쪽으로 출발해 0.5박 만에 도착(ease) ──
      function lean(bb) {
        var kb = Math.floor(bb), fb = bb - kb, side = mod(kb, 2) === 0 ? 1 : -1;
        return side * (2 * c.ease(Math.min(1, fb / 0.5)) - 1);
      }
      // ── 착지(4,8,12..박) 뒤 여진 ──
      var L = Math.floor(b / 4) * 4, dt = b - L, landed = L >= 4;
      var jig = landed ? Math.exp(-3 * dt) * Math.sin(TAU * 1.25 * dt) : 0;
      var dip = landed ? Math.exp(-5 * dt) : 0;

      var deg = lean(b - 0.1 * tier) * (2.2 + 1.5 * tier) + 4 * jig * (1 + 0.5 * tier);
      var th = deg * PI / 180;
      // 기우는 쪽 아래 모서리를 축으로 회전(화면 시계방향 = +). 각도 0 에서 축이 바뀌므로 위치는 연속.
      var pivX = cx + (th >= 0 ? 1 : -1) * 1.5 * d;
      var rx = cx + X - pivX, ryy = -Y;
      var x = pivX + rx * Math.cos(th) - ryy * Math.sin(th);
      var y = yb + rx * Math.sin(th) + ryy * Math.cos(th);
      var rot = deg;
      var lift = -h * [0.035, 0.08, 0.11][tier] * dip;   // 착지 충격: 위로 갈수록 누적해서 더 푹
      var hat, sx = X < -1 ? -FACE : FACE;               // 왼쪽 절반은 오른쪽(가운데)을 보게 → 좌우대칭

      var q = b - L;                                     // 마디 안 위치(0~4)
      var air = b >= 2 && q >= 2;                        // 4k+2 ~ 4k+4 공중
      var jumpNo = Math.floor(b / 4) + 1;                // 이번 점프가 몇 번째 착지인지(4박 착지 = 1번)

      if (tier === 2) {
        if (air) {
          var tj = (q - 2) / 2;                          // 0..1
          lift += JUMP * h * 4 * tj * (1 - tj);
          if (jumpNo % 2 === 0) {
            // 앞구르기: 엔진 rot 는 발 기준이라, 몸 중심(발 위 h/2)이 제자리에 있도록 발 위치를 보정
            var ph = TAU * c.ease(tj);
            x += -(h / 2) * Math.sin(ph);
            y += (h / 2) * (Math.cos(ph) - 1);
            rot += ph * 180 / PI;
            hat = { rot: 0 };
          } else {
            // 모자만 로켓: 고양이보다 더 높이 튕겨 한 바퀴 돌고 착지 순간 머리로 복귀.
            // 높이는 최대 키*0.5 지만, 가로화면처럼 위가 좁으면 화면 위 5% 밖까지만(살짝 프레임 밖으로 나갔다 오는 건 개그로 허용)
            var topY = yb - Y - JUMP * h - 1.45 * h;       // 점프 정점에서 모자 꼭대기 y (기울기 무시한 근사)
            var pop = clamp(topY + 0.05 * H, 0.25 * h, 0.5 * h);
            hat = { dy: -pop * Math.sin(PI * tj), rot: 360 * tj };
          }
        } else {
          // 도움닫기: 1.5~2박에 쪼그렸다가(2박 순간 0) 튀어오름 → 위치가 끊기지 않음
          if (b >= 1.5 && q >= 1.5) lift -= h * 0.07 * Math.sin(PI * (q - 1.5) / 0.5);
          hat = { rot: 8 * Math.cos(PI * b) };
        }
      } else {
        // 깔린 고양이 모자: 바깥쪽으로 쓰러짐. 윗단을 많이 받치는 안쪽일수록 더 찌그러짐.
        var side = X > 1 ? 1 : X < -1 ? -1 : 1;
        var under = tier === 1 ? (col === 1 ? 1 : 0.55) : (col === 1 || col === 2 ? 0.8 : 0.45);
        if (tier === 1 && col === 1) {
          // 꼭대기 바로 밑: 꼭대기가 떠 있는 동안만 띠용(감쇠 스프링으로 살짝 넘쳤다 섬), 착지하면 다시 납작
          var ta = q - 2;
          var up = air ? clamp(1 - Math.exp(-6 * ta) * Math.cos(10 * ta), 0, 1.3) : 0;
          under *= 1 - up;
        }
        hat = {
          dx: side * h * 0.2 * under, dy: h * 0.1 * under,
          rot: side * 70 * under + 12 * jig, s: 1 - 0.15 * under,
        };
      }
      return { x: x, y: y, s: h / (c.size * c.home.s), rot: rot, sx: sx, lift: lift, z: H * (1 + tier) + col, hat: hat };
    },
  });
})();
