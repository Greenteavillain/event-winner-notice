// 코미디 동작 3종: hatrelay(모자 릴레이) · tower(고양이 탑) · solo(한 마리 독무)
// 규칙: pose(c)는 순수함수 — DOM·Math.random·Date·호출 간 상태 없음. 박자(c.b) 하나로 모든 게 결정됨.
// 강세: 정수 박(c.b = 0,1,2..)에 착지/쾅, 마디 첫 박(4의 배수)엔 더 크게.
// IIFE 로 감싼 이유: 여러 동작 파일이 같은 전역에서 돌아서, 최상위 const/함수 이름이 겹치면 서로 깨짐.
(function () {
  'use strict';

  var PI = Math.PI, RAD = PI / 180;
  var HEAD = 0.86;          // 발 → 정수리 = 키의 86% (index.html 모자 기준점 bottom:86% 와 같은 값)
  var HAT = 0.45;           // 모자가 정수리 위로 솟는 높이 = 키의 0.45배
  var TOP = HEAD + HAT;     // 발 → 모자 꼭대기

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mod(a, m) { return ((a % m) + m) % m; }
  function sgn(v) { return v < 0 ? -1 : 1; }

  // 무리 안 순서: key 작은 순 0..n-1, 같으면 번호순 (호출마다 새로 계산 = 상태 없음, 8마리라 비용 무시)
  function rankBy(c, i, key) {
    var me = key(c.homes[i]), r = 0;
    for (var j = 0; j < c.n; j++) {
      if (j === i) continue;
      var k = key(c.homes[j]);
      if (k < me - 0.5 || (Math.abs(k - me) <= 0.5 && j < i)) r++;
    }
    return r;
  }

  // ─────────────────────────────────────────────────────────────
  // 1) hatrelay — 모자 릴레이
  // 의도: 고양이들은 제자리, 모자만 박마다 "옆 고양이 머리"로 포물선을 그리며 날아가 정박에 착지.
  //   · 8개 모자가 동시에 한 칸씩 → 모자들이 무리를 빙빙 도는 회전목마로 읽힘.
  //   · 순서는 x순이 아니라 "무리를 한 바퀴 도는 고리"(무리 중심 기준 각도순 = 화면 시계방향).
  //     x순이면 ① 오른쪽 끝→왼쪽 끝으로 화면을 가로지르는 긴 패스가 매 박 생기고
  //     ② 세로 화면(3+2+3)에선 x순이 위아래 지그재그라 "옆으로 넘긴다"가 안 읽힘. 고리면 항상 바로 옆에게 넘김.
  //   · 앞 8박 시계방향 한 바퀴 → 뒤 8박 반시계 한 바퀴. 8칸 = 한 바퀴라 8박마다 모자가 전부 주인에게 돌아옴
  //     (16박이든 32박이든 끝날 때 원위치 → 다음 동작으로 깔끔하게 넘어감).
  //   · 고양이: 정박 직후 톡 던지는 작은 점프(점프 꼭대기에서 모자 발사) → 날아가는 모자 쪽으로 몸 젖혀 올려다봄
  //     → 다음 정박에 남의 모자가 머리에 쾅 떨어지며 살짝 움찔.
  //   · 착지 지점은 받는 고양이의 "그 순간" 머리(그 고양이도 점프·기울기 중)를 같은 함수로 계산 → 정확히 머리에 앉음.
  //     모자 크기도 받는 고양이 키에 맞춰 바뀜(앞줄은 크게, 뒷줄은 작게).
  var LAUNCH = 0.35;        // 박 안에서 모자가 뜨는 시점(0=정박). 0.35~1.0 동안 날아서 다음 정박에 착지

  function ringOrder(homes) {
    var n = homes.length, cx = 0, cy = 0, i, ang = [], idx = [];
    for (i = 0; i < n; i++) { cx += homes[i].x; cy += homes[i].y; }
    cx /= n; cy /= n;
    for (i = 0; i < n; i++) { ang.push(Math.atan2(homes[i].y - cy, homes[i].x - cx)); idx.push(i); }
    idx.sort(function (a, b) { return (ang[a] - ang[b]) || (a - b); });
    return idx;
  }
  // k번째 박이 시작될 때까지 모자가 고리에서 몇 칸 갔는지 (0→8 시계, 8→0 반시계, 16박 주기)
  function relaySteps(k) {
    var m = mod(k, 16);
    return m <= 8 ? m : 16 - m;
  }
  // 고양이 j 의 몸 (모자 착지점 계산에도 똑같이 씀)
  function relayBody(c, ring, j, b) {
    var home = c.homes[j], h = c.size * home.s;
    var k = Math.floor(b), f = b - k;
    var dir = relaySteps(k + 1) - relaySteps(k);
    var next = c.homes[ring[mod(ring.indexOf(j) + dir, c.n)]];
    var toward = Math.abs(next.x - home.x) > 1 ? sgn(next.x - home.x) : dir;
    var hop = Math.sin(PI * clamp01(f / (2 * LAUNCH)));                 // 꼭대기 = 발사 순간
    var u = clamp01((f - LAUNCH) / (1 - LAUNCH));
    var look = Math.sin(PI * Math.pow(u, 0.7));                          // 모자 따라 고개 젖힘
    var hit = Math.pow(1 - clamp01(f / 0.18), 2);                        // 정박: 모자 맞고 움찔
    var s = 1 - 0.06 * hit;
    return { x: home.x, y: home.y, lift: 0.07 * h * hop, rot: toward * 11 * look, s: s, h: h * s, hs: home.s * s };
  }
  function headOf(bd) {
    var d = HEAD * bd.h, r = bd.rot * RAD;
    return { x: bd.x + d * Math.sin(r), y: bd.y - bd.lift - d * Math.cos(r) };
  }

  registerMove('hatrelay', {
    label: '모자 릴레이',
    pose: function (c) {
      var ring = ringOrder(c.homes), n = c.n, b = c.b;
      var k = Math.floor(b), f = b - k, p = ring.indexOf(c.i);
      var dir = relaySteps(k + 1) - relaySteps(k);
      var fromJ = ring[mod(p + relaySteps(k), n)], toJ = ring[mod(p + relaySteps(k + 1), n)];
      var me = relayBody(c, ring, c.i, b);
      var A = relayBody(c, ring, fromJ, b), B = relayBody(c, ring, toJ, b);
      var hm = headOf(me), ha = headOf(A), hb = headOf(B);
      var u = clamp01((f - LAUNCH) / (1 - LAUNCH));
      var dist = Math.sqrt((hb.x - ha.x) * (hb.x - ha.x) + (hb.y - ha.y) * (hb.y - ha.y));
      var arc = (0.22 * me.h + 0.25 * dist) * 4 * u * (1 - u);            // 포물선 (화면 위로 안 나가게 낮게)
      var hx = lerp(ha.x, hb.x, u), hy = lerp(ha.y, hb.y, u) - arc;
      return {
        x: me.x, y: me.y, lift: me.lift, rot: me.rot, s: me.s,
        hat: {
          dx: hx - hm.x, dy: hy - hm.y,
          // 받는 고양이 기울기에 맞춰 앉고, 날아가는 동안 진행 방향으로 한 바퀴 텀블링
          rot: lerp(A.rot, B.rot, u) - me.rot + dir * 360 * c.ease(u),
          s: lerp(A.hs, B.hs, u) / (c.home.s * me.s),
        },
      };
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 2) tower — 고양이 탑
  // 의도: 8마리가 화면 가운데에 한 줄로 쌓임(위 고양이 발 = 아래 고양이 정수리). 모두 같은 크기,
  //   모자 꼭대기까지 화면에 다 들어오게 키를 맞춤.
  //   · 쌓기: 앞줄(아래쪽) 고양이부터 반 박 간격으로 폴짝 뛰어올라 한 층씩 → 맨 꼭대기가 4박(2마디 첫 박)에 착지.
  //   · 아래 고양이 모자는 위에 누가 올라타는 순간 옆으로 찌그러져 눌림(층마다 좌우 번갈아) → 원인·결과가 보이는 개그.
  //   · 흔들림: 젤리처럼 층마다 기울기가 0.11박씩 늦게 따라오고, 위로 갈수록 크게 → 꼭대기가 채찍처럼 휨.
  //     정박마다 탑 전체가 쿵 눌렸다 펴짐.
  //   · 마디 끝(3→4박)마다 꼭대기 고양이가 폴짝 + 모자 한 바퀴 돌며 튀어오름 → 마디 첫 박에 착지.
  //   · 동작 마지막 마디는 흔들림이 점점 커져 곧 무너질 듯 휘청(다음 동작이 받아줌).
  var STEP = 0.8;           // 층 간격 = 키의 0.8 (정수리 0.86보다 살짝 아래 = 발이 머리털에 파묻힘)
  var LAG = 0.11;           // 한 층 올라갈 때마다 흔들림이 늦게 따라오는 정도(박)

  function towerH(c) {      // 탑 고양이 1마리 키(px): 7층 간격 + 맨 위 고양이·모자 + 꼭대기 점프 여유
    return 0.92 * c.H / (7 * STEP + TOP + 0.15);
  }
  function towerRank(c, i) { // 0 = 맨 아래. 앞줄(화면 아래쪽) 고양이부터, 같은 줄이면 왼쪽부터
    return rankBy(c, i, function (h) { return -h.y * 4096 + h.x; });
  }
  function towerLand(r) { return 0.5 + 0.5 * r; }   // r층 착지 박
  // lvl 층 고양이의 발 위치·기울기: 맨 아래에서부터 기울기 따라 한 층씩 쌓아 올림(층이 끊기지 않음)
  function towerLevel(c, b, lvl) {
    var hT = towerH(c);
    var boost = 1 + 1.3 * c.ease(clamp01((b - (c.len - 4)) / 4));
    var squash = 1 - 0.05 * (1 - c.bounce(b));
    var x = c.W / 2 + 0.02 * c.W * boost * Math.cos(PI * b), y = 0.965 * c.H, rot = 0;
    for (var k = 0; k <= lvl; k++) {
      rot = 15 * boost * Math.pow((k + 1) / 8, 1.3) * Math.cos(PI * (b - LAG * k));
      if (k === lvl) break;
      var d = STEP * hT * squash, r = rot * RAD;
      x += d * Math.sin(r); y -= d * Math.cos(r);
    }
    return { x: x, y: y, rot: rot, h: hT };
  }

  registerMove('tower', {
    label: '고양이 탑',
    pose: function (c) {
      var b = c.b, r = towerRank(c, c.i), hHome = c.size * c.home.s;
      var tLand = towerLand(r), tStart = tLand - 0.75;
      if (b < tStart) {                                       // 차례 기다리며 제자리 콩콩
        return { lift: 0.05 * hHome * c.bounce(b) };
      }
      var slot = towerLevel(c, b, r), sT = slot.h / hHome;
      var hat = { dx: 0, dy: 0, rot: 0, s: 1 };
      if (r < 7) {                                            // 위층이 올라탄 순간 모자가 옆으로 찌그러짐
        var v = c.ease(clamp01((b - towerLand(r + 1)) / 0.2)), side = r % 2 ? 1 : -1;
        hat = { dx: side * 0.12 * slot.h * v, dy: 0.05 * slot.h * v,
                rot: side * (78 + 8 * Math.sin(PI * b)) * v, s: 1 - 0.12 * v };
      }
      var lift = 0;
      if (r === 7 && b >= 4) {                                // 꼭대기: 마디 끝마다 폴짝, 모자 한 바퀴
        var pb = mod(b, 4);
        if (pb >= 3) {
          var q = pb - 3, j = Math.sin(PI * q);
          lift = 0.28 * slot.h * j;
          hat = { dx: 0, dy: -0.3 * slot.h * j, rot: 360 * c.ease(q), s: 1 };
        }
      }
      if (b < tLand) {                                        // 폴짝 뛰어올라 제 층에 착지
        var u = (b - tStart) / 0.75, e = c.ease(u);
        return {
          x: lerp(c.home.x, slot.x, e), y: lerp(c.home.y, slot.y, e),
          lift: 0.35 * hHome * Math.sin(PI * u), s: lerp(1, sT, e), rot: slot.rot * e, z: 5000 + r,
        };
      }
      return { x: slot.x, y: slot.y, lift: lift, s: sT, rot: slot.rot, z: 5000 + r, hat: hat };
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 3) solo — 한 마리 독무
  // 의도: 마디(4박)마다 다른 고양이 한 마리가 무대 가운데 앞으로 튀어나와 거대해져서 독무,
  //   나머지 7마리는 작아져서 뒤쪽 반원(무지개 모양)에 늘어서 박수(정박마다 몸 쪼그림) + 8분음표로 콩콩.
  //   · 반원 자리는 원래 x 순서대로 고정 → 독무 고양이가 빠진 자리가 비어 "저기서 나왔구나"가 읽힘.
  //   · 교대: 마디 마지막 3/4박 동안 새 주인공이 반원에서 점프해 나오고 전 주인공은 제자리로 → 마디 첫 박에 착지.
  //   · 주인공 크기 = 모자 포함 화면 높이의 56%까지(세로 폰에선 약 1.7배, 무리 평균의 2배쯤), 반원 고양이는 그 0.4배.
  //   · 독무 4종을 마디마다 돌림: 0 좌우 스텝 / 1 빙글빙글 / 2 공중제비 / 3 쿵쿵 펌프(모자 냄비뚜껑).
  var SOLO_ORDER = [6, 2, 5, 1, 7, 3, 0, 4];   // 앞·뒤·좌·우가 번갈아 나오게 섞은 순서
  var SWAP = 0.75;                            // 교대에 쓰는 박 수(마디 끝에서)

  function soloGeom(c) {
    var S = Math.min(1.9, 0.56 * c.H / (TOP * c.size), 0.8 * c.W / (0.78 * c.size));
    var C = S * 0.4;
    var topFeet = 0.04 * c.H + TOP * C * c.size;   // 반원 꼭대기 고양이도 모자까지 화면 안
    var yc = (c.tall ? 0.58 : 0.7) * c.H;
    return { S: S, C: C, yS: 0.95 * c.H, yc: yc, Rx: 0.41 * c.W, Ry: Math.max(0.05 * c.H, yc - topFeet) };
  }
  function chorusPose(c, i, b) {
    var g = soloGeom(c), hC = g.C * c.size;
    var a = PI - rankBy(c, i, function (h) { return h.x * 4096 + h.y; }) * PI / (c.n - 1);
    var x = c.W / 2 + g.Rx * Math.cos(a), y = g.yc - g.Ry * Math.sin(a);
    var f = mod(b, 1);
    return {
      x: x, y: y, s: g.C / c.homes[i].s,
      lift: 0.07 * hC * c.bounce(b * 2),                    // 8분음표 콩콩
      sx: 1 - 0.22 * Math.pow(1 - f, 5),                    // 정박 = 짝! (몸 쪼그림)
      rot: sgn(c.W / 2 - x) * 5 + 3 * Math.cos(PI * b),     // 주인공 쪽으로 기울어 구경
      hat: { dx: 0, dy: 0, rot: 0, s: 1 },
    };
  }
  function soloPose(c, i, b, t) {
    var g = soloGeom(c), hS = g.S * c.size, s = g.S / c.homes[i].s;
    var x0 = c.W / 2, y0 = g.yS, pb = b - 4 * t, k = Math.floor(pb), f = pb - k;
    var p = { x: x0, y: y0, s: s, rot: 0, sx: 1, lift: 0, hat: { dx: 0, dy: 0, rot: 0, s: 1 } };
    var style = mod(t, 4);
    if (style === 0) {
      // 좌우 스텝: 박 후반에 반대편으로 폴짝 → 정박에 착지하며 크게 기우뚱
      var side = function (n) { return mod(n, 2) ? -1 : 1; };
      var u0 = clamp01((f - 0.35) / 0.65), m = lerp(side(k), side(k + 1), c.ease(u0));
      // (16°/0.07W 였을 땐 세로 폰에서 거대 고양이 머리·모자가 화면 밖으로 나가서 줄임)
      p.x = x0 + 0.045 * c.W * m;
      p.rot = 11 * m;
      p.lift = 0.12 * hS * Math.sin(PI * u0);
    } else if (style === 1) {
      // 빙글빙글: 박마다 뒤돌기(반 박에 옆모습) + 통통
      p.sx = Math.cos(PI * pb);
      p.lift = 0.1 * hS * c.bounce(pb);
      p.rot = 7 * Math.sin(PI * pb);
    } else if (style === 2) {
      // 1박 움찔 준비 → 1~3박 몸 중심 기준 공중제비 360° → 3박 정박 착지 → 만세 콩콩
      if (pb < 1) {
        p.rot = 9 * Math.sin(2 * PI * pb);
        p.s = s * (1 - 0.06 * Math.sin(PI * pb));
      } else if (pb < 3) {
        var u = (pb - 1) / 2, r = 360 * c.ease(u), jump = 0.4 * hS * Math.sin(PI * u);
        var d = 0.5 * hS, cy = y0 - d - jump;                 // 발 기준 회전을 몸 중심 회전으로 바꿈
        p.x = x0 - d * Math.sin(r * RAD);
        p.y = cy + d * Math.cos(r * RAD);
        p.rot = r;
        p.hat = { dx: 0, dy: -0.15 * hS * Math.sin(PI * u), rot: -40 * Math.sin(2 * PI * u), s: 1 };
      } else {
        p.lift = 0.08 * hS * c.bounce(pb * 2);
        p.rot = 8 * Math.sin(2 * PI * pb);
      }
    } else {
      // 쿵쿵 펌프: 정박마다 몸이 확 커졌다 줄고, 모자는 냄비뚜껑처럼 박 사이에 들썩였다 정박에 쾅
      var pulse = Math.pow(1 - f, 3), alt = mod(k, 2) ? -1 : 1;
      p.s = s * (1 + 0.12 * pulse);
      p.rot = alt * 10 * pulse;
      p.hat = { dx: 0, dy: -0.22 * hS * c.bounce(f), rot: -alt * 25 * c.bounce(f), s: 1 };
    }
    return p;
  }
  function mixPose(a, b, u, hop) {
    return {
      x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u),
      rot: lerp(a.rot, b.rot, u), sx: lerp(a.sx, b.sx, u), lift: lerp(a.lift, b.lift, u) + hop,
      hat: { dx: lerp(a.hat.dx, b.hat.dx, u), dy: lerp(a.hat.dy, b.hat.dy, u),
             rot: lerp(a.hat.rot, b.hat.rot, u), s: lerp(a.hat.s, b.hat.s, u) },
    };
  }

  registerMove('solo', {
    label: '한 마리 독무',
    pose: function (c) {
      var b = c.b, nb = Math.max(1, Math.floor(c.len / 4));
      var t = Math.min(Math.floor(b / 4), nb - 1);
      var cur = SOLO_ORDER[mod(t, 8)], nxt = SOLO_ORDER[mod(t + 1, 8)];
      var B = 4 * (t + 1);
      if (t + 1 < nb && b > B - SWAP && (c.i === cur || c.i === nxt)) {
        var raw = clamp01((b - (B - SWAP)) / SWAP), u = c.ease(raw);
        var hS = soloGeom(c).S * c.size, out;
        if (c.i === nxt) {                                   // 새 주인공: 반원에서 높이 뛰어 앞으로
          out = mixPose(chorusPose(c, c.i, b), soloPose(c, c.i, B, t + 1), u, 0.3 * hS * Math.sin(PI * raw));
          out.z = 20000;
        } else {                                             // 전 주인공: 작아지며 제자리로 폴짝
          out = mixPose(soloPose(c, c.i, b, t), chorusPose(c, c.i, b), u, 0.12 * hS * Math.sin(PI * raw));
          out.z = 15000;
        }
        return out;
      }
      if (c.i === cur) { var sp = soloPose(c, c.i, b, t); sp.z = 20000; return sp; }
      return chorusPose(c, c.i, b);
    },
  });
})();
