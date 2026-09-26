// 점프 계열 동작 3종: wave(파도타기) · hatfly(모자 날아가기) · spin(제자리 뒤돌기)
// 규칙: pose(c)는 순수함수 — DOM·Math.random·Date·호출 간 상태 없음. 박자(c.b) 하나로 모든 게 결정됨.
// 강세: 정수 박(c.b = 0,1,2..)에 착지/정점, 4의 배수(마디 첫 박)엔 더 크게.
(function () {
  'use strict';

  var PI = Math.PI;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mod(a, m) { return ((a % m) + m) % m; }
  // 이 고양이의 실제 키(px). 모자는 머리 위로 키의 0.45배만큼 더 솟아 있음
  function catH(c) { return c.size * c.home.s; }
  // 모자 꼭대기에서 화면 맨 위(2% 여유)까지 남은 px. 뒷줄은 원래 화면 위쪽이라 여기가 좁다
  function headroom(c) { var h = catH(c); return c.home.y - h * 1.45 - 0.02 * c.H; }
  // 점프 높이: 화면 위로 모자가 안 잘리게 여유 안에서, 단 너무 쪼그라들면 점프로 안 보이니 하한을 둠.
  // (뒷줄은 자연스럽게 작게 뛰게 됨 → 원근감과도 맞음)
  function jumpH(c, maxK, minK) {
    var h = catH(c);
    return clamp(headroom(c) * 0.85, (minK == null ? 0.14 : minK) * h, maxK * h);
  }
  // 무리 안에서 순서 매기기: key 작은 순 0..n-1. 같으면 뒷줄(y 작은) 먼저, 그래도 같으면 번호순
  function rankBy(c, key) {
    var me = key(c.home), r = 0;
    for (var j = 0; j < c.n; j++) {
      if (j === c.i) continue;
      var hj = c.homes[j], k = key(hj);
      if (k < me - 0.5) r++;
      else if (Math.abs(k - me) <= 0.5) {
        if (hj.y < c.home.y - 0.5 || (Math.abs(hj.y - c.home.y) <= 0.5 && j < c.i)) r++;
      }
    }
    return r;
  }
  function byX(h) { return h.x; }
  // 박 위(정수)에서 ±max, 박마다 좌우 번갈아 기우뚱 — 가만히 있는 고양이도 박자 타는 느낌
  function tick(b, deg) { return deg * Math.cos(PI * b); }

  // ─────────────────────────────────────────────────────────────
  // 1) wave — 파도타기
  // 의도: 경기장 파도처럼 왼쪽→오른쪽으로 반 박에 한 마리씩 솟았다 내려가고, 끝에 닿으면 되돌아옴.
  //   · 한 방향 = 8마리 × 반 박 = 4박(1마디). 왕복 8박 → 16박에 2왕복, 32박이어도 그대로 반복.
  //   · 마디 첫 박(0, 4, 8..)엔 항상 양 끝 고양이가 정점 → 벽 맞고 튕기듯 두 번 연속 점프 + 더 높게.
  //   · 솟는 고양이는 살짝 길쭉해지고(s↑, 폭↓) 진행 방향으로 기울며, 모자는 한 템포 늦게 톡 튀어오름(관성).
  //   · 곡선 폭 0.7박 → 옆 고양이와 겹쳐 올라가서 끊긴 점프가 아니라 "물결"로 읽힘.
  registerMove('wave', {
    label: '파도타기',
    pose: function (c) {
      var h = catH(c), n = c.n, r = rankBy(c, byX);
      var oneWay = n * 0.5, period = oneWay * 2;
      var ph = mod(c.b, period);
      var tf = r * 0.5;                        // 가는 길 정점 시각
      var tb = oneWay + (n - 1 - r) * 0.5;     // 오는 길 정점 시각
      var cands = [[tf, 1], [tf + period, 1], [tb, -1], [tb - period, -1]];
      // 양 끝 고양이는 가는 길·오는 길 정점이 반 박 차로 겹침. 둘 중 큰 쪽만 고르면 방향이 뚝 바뀌며 튀어서,
      // 높이·모자는 max(연속), 기울기는 합(좌우가 서로 상쇄되며 부드럽게 반대로 넘어감 = 벽 맞고 튕김)으로 섞음.
      var W = 0.7, up = 0, hatUp = 0, lean = 0, hatLean = 0;
      for (var k = 0; k < cands.length; k++) {
        var t0 = cands[k][0], dir = cands[k][1];
        var accent = Math.abs(mod(t0, 4)) < 1e-6 ? 1.25 : 1; // 마디 첫 박 정점은 더 크게
        var d = ph - t0, dl = d - 0.15;                       // 모자는 0.15박 늦게 = 관성
        var v = Math.abs(d) < W ? 0.5 * (1 + Math.cos(PI * d / W)) : 0;
        var vl = Math.abs(dl) < W ? 0.5 * (1 + Math.cos(PI * dl / W)) : 0;
        up = Math.max(up, v * accent);
        hatUp = Math.max(hatUp, vl * accent);
        lean += dir * v;
        hatLean += dir * vl;
      }
      // 하한 0.18: 뒷줄은 머리 위 여유가 거의 없지만 너무 낮게 뛰면 파도가 끊겨 보여서 모자 끝이 살짝 잘리는 쪽을 택함
      var J = jumpH(c, 0.4, 0.18);
      var bump = Math.min(1, up);
      // 모자 튀는 높이: 점프 뒤에도 머리 위 여유가 남는 만큼만(뒷줄은 화면 위에 붙어 있어서 조금만)
      var pop = clamp(headroom(c) - J * 1.25 - 0.15 * h, 0.06 * h, 0.2 * h);
      return {
        lift: J * up,
        s: 1 + 0.08 * up,
        sx: 1 - 0.07 * bump,
        rot: 6 * lean + tick(c.b, 2.5) * (1 - bump),
        hat: { dy: -pop * hatUp, rot: 14 * hatLean }
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 2) hatfly — 모자 날아가기
  // 의도: 고양이는 매 박 다 같이 통통 뛰고, 마디 첫 박마다 모자가 머리에서 "뿅" 하고 훨씬 높이 날아가
  //   빙글빙글 돌다가 정확히 다음 마디 첫 박에 머리 위로 착지 → 착지하자마자 또 발사(머리로 저글링).
  //   흐릿한 고양이 위에서 쨍한 고해상도 모자만 날아다니는 게 웃음 포인트라 모자는 날면서 조금 커짐(최대 1.35배).
  //   · 모자 궤적 = 4박짜리 포물선(중력처럼 위에서 오래 머묾). 앞줄 모자는 화면 위쪽까지 뒷줄을 가로질러 날고,
  //     뒷줄 모자는 머리 위 여유가 없어서 화면 밖으로 사라졌다가 떨어져 들어옴.
  //   · 모자 dy는 고양이 점프(lift)를 상쇄해서 몸이 뛰든 말든 모자는 자기 포물선대로 감.
  //     머리보다 아래로 파고들지 않게 dy ≤ 0.
  //   · 회전은 착지 순간 0°로 끝나게 −180·turns..+180·turns 범위로 씀(360 배수 차이라 화면상 이어짐).
  //     그래야 다음 동작으로 섞일 때 모자가 거꾸로 몇 바퀴 되감기지 않음.
  //   · 마디마다 높이·회전수·방향을 조금씩 바꿔 16박 내내 똑같아 보이지 않게, 4번째 마디가 제일 높고 많이 돔.
  registerMove('hatfly', {
    label: '모자 날아가기',
    pose: function (c) {
      var h = catH(c), b = c.b;
      var beatN = Math.floor(b), p = b - beatN;
      var bar = Math.floor(b / 4), bi = mod(bar, 4);
      var t = (b - bar * 4) / 4;                      // 이번 비행 진행도 0..1
      // 고양이: 매 박 점프, 모자 발사하는 마디 첫 박 점프만 더 세게
      var kick = mod(beatN, 4) === 0 ? 1.35 : 1;
      var jf = 4 * p * (1 - p);
      var lift = jumpH(c, 0.2) * kick * jf;
      // 모자 비행 높이. 두 경우:
      //  (가) 머리 위 여유가 키 0.8배 이상(세로폰 앞·가운데 줄): 화면 위 끝(3%)을 넘지 않게 → 날아가는 고해상도 모자가 다 보임
      //  (나) 여유가 없음(뒷줄·가로화면): 어중간하게 올리면 화면 끝에 반쯤 잘린 모자가 걸려서 지저분함 →
      //      아예 화면 밖으로 쏴 올렸다가(약 2박 사라짐) 다음 마디 첫 박에 떨어져 머리에 꽂히는 개그로.
      var hatTopY = c.home.y - h * 1.45, hatBaseY = c.home.y - h * 0.86;
      var topR = hatTopY - 0.16 * h - 0.03 * c.H;             // 0.16h = 정점에서 모자가 1.35배로 커지는 몫
      var barMul = [0.85, 0.75, 0.92, 1][bi];                 // 4번째 마디가 제일 높음
      var R = topR >= 0.8 * h                                  // 키의 0.8배 이상 솟을 수 있으면 (가)
        ? topR * barMul * (0.92 + 0.08 * c.rnd(1))
        : (hatBaseY + 0.25 * h) * (0.95 + 0.1 * c.rnd(1));
      var arc = 4 * t * (1 - t);
      var dy = Math.min(0, lift - R * arc);
      var turns = 1 + (c.rnd(3) < 0.5 ? 0 : 1) + (bi === 3 ? 1 : 0);
      var dir = (c.rnd(2) < 0.5 ? -1 : 1) * (bar % 2 ? -1 : 1);
      var spinT = t < 0.5 ? t : t - 1;               // 착지(t→1)에서 0°로 수렴
      var drift = (c.rnd(4) - 0.5) * 0.6 * h * 0.78 * Math.sin(PI * t); // 옆으로 살짝 흘렀다 제자리로
      return {
        lift: lift,
        s: 1 + 0.06 * jf * kick,
        sx: 1 - 0.05 * jf,
        rot: tick(b, 3),
        hat: { dx: drift, dy: dy, rot: dir * 360 * turns * spinT, s: 1 + 0.35 * arc }
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 3) spin — 제자리 뒤돌기
  // 의도: 평소엔 박마다 통통 + 좌우 기우뚱, 마디 첫 박이 오면 고양이들이 차례로(16분음표 간격) 한 바퀴씩
  //   빙그르 돈다. sx = cos(각도)로 납작해졌다 뒤집혔다 돌아오는 가짜 3D 회전.
  //   · 마디마다 도는 순서를 바꿈: ①왼→오 ②오→왼 ③가운데→바깥 ④뒷줄→앞줄 빠르게 두 바퀴 + 크게 점프(구절 마무리).
  //     16박이면 네 패턴이 한 번씩, 32박이면 두 번 돎.
  //   · 도는 동안 살짝 뛰어오르고, 모자는 반 박 늦게 휘청(회전 반대로 기울었다 복귀).
  //   · sx가 0이 되는 순간 고양이가 선 한 줄로 사라지지 않게 최소 폭 0.06은 남김.
  registerMove('spin', {
    label: '제자리 뒤돌기',
    pose: function (c) {
      var h = catH(c), b = c.b, n = c.n;
      var bar = Math.floor(b / 4), bb = b - bar * 4, pat = mod(bar, 4);
      var r;
      if (pat === 0) r = rankBy(c, byX);
      else if (pat === 1) r = n - 1 - rankBy(c, byX);
      else if (pat === 2) r = rankBy(c, function (hm) { return Math.abs(hm.x - c.W / 2); });
      else r = rankBy(c, function (hm) { return hm.y; });
      var gap = pat === 3 ? 0.125 : 0.25;     // 8마리 × 0.25박 = 2박 안에 파도처럼 한 바퀴
      var dur = pat === 3 ? 1.5 : 1;
      var turns = pat === 3 ? 2 : 1;
      var u = clamp((bb - r * gap) / dur, 0, 1);
      var a = 2 * PI * turns * c.ease(u);
      var sx = Math.cos(a);
      if (Math.abs(sx) < 0.06) sx = sx < 0 ? -0.06 : 0.06;
      var arcU = Math.sin(PI * u);
      var hop = jumpH(c, pat === 3 ? 0.32 : 0.18, 0.08) * arcU;
      var bounce = 0.07 * h * c.bounce(mod(b, 1)) * (1 - arcU);
      var dir = pat === 1 ? -1 : 1;
      return {
        lift: Math.max(hop, bounce),
        sx: sx,
        s: 1 + 0.05 * arcU,
        rot: dir * 6 * arcU + tick(b, 4) * (1 - arcU),
        hat: { dy: -0.08 * h * Math.sin(PI * clamp(u * 1.3 - 0.3, 0, 1)), rot: -dir * 14 * Math.sin(2 * PI * u) }
      };
    }
  });
})();
