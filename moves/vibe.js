// vibe.js — 고양이 떼창 동작 3종: 짤 댄스(flipflop) · 해파리 둥둥(jellyfish) · 피날레(finale)
// 규칙: pose(c)는 순수함수(DOM·Math.random·Date·호출 간 저장 상태 없음). 박자는 c.b 기준, 정박(정수)에 강세.
// 엔진이 앞 동작에서 첫 ~1.5박 동안 알아서 섞어주므로 진입 전환은 따로 안 만듦.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const frac = x => x - Math.floor(x);

  // ───────────────────────── 1) flipflop · 짤 댄스 ─────────────────────────
  // 의도: 옛날 "WOO! YAY!" 고양이 짤 그 자체. 8마리가 복붙한 GIF처럼 완전히 똑같이 움직임.
  //  - (처음엔 한 박에 8프레임으로 뚝뚝 끊어 저프레임 GIF 느낌을 냈는데, 실제로 보니 '렉 걸린 것'처럼 보인다는 피드백
  //     → 2026-09-26 양자화 제거, 움직임은 부드럽게. 짤 느낌은 정박마다 순간 좌우반전으로만 남김)
  //  - 매 정박마다 좌우 뒤집기(sx ±1) + 고개 까딱(rot ±12) + 콩 뛰기(lift 조금).
  //  - 마디 첫 박으로 들어가는 점프만 크게 뛰어서 강박에 쿵 착지(착지 프레임에 살짝 찌그러짐).
  //  - 4마디마다 마지막 1마디는 두 배속(반 박마다 뒤집기) → 짤이 버벅이며 빨라지는 웃음 포인트.
  registerMove('flipflop', {
    label: '짤 댄스',
    pose(c) {
      const qb = c.b;                                     // 부드러운 박자 시계 (양자화 제거 — 위 주석 참고)
      const dbl = Math.floor(qb / 4) % 4 === 3;           // 4마디 중 마지막 마디 = 두 배속
      const unit = dbl ? 0.5 : 1;                         // 뒤집기 간격(박)
      const t = qb / unit;
      const k = Math.floor(t + 1e-9);                     // 몇 번째 뒤집기인지
      const ph = t - k;                                   // 뒤집기 사이 진행도 0..1 (0 = 정박)
      const dir = k % 2 === 0 ? 1 : -1;                   // 정박마다 좌우 반전
      const h = c.size * c.home.s;                        // 이 고양이 키(px)
      const down = !dbl && k % 4 === 0;                   // 마디 첫 박
      const intoDown = !dbl && (k + 1) % 4 === 0;         // 다음 착지가 마디 첫 박 → 크게 점프
      const hop = h * (dbl ? 0.035 : intoDown ? 0.11 : 0.055);
      const tilt = down ? 16 : 12;                        // 강박엔 고개를 더 크게 꺾음
      const hatLag = frac(ph - 0.25);                     // 모자는 2프레임 늦게 따라와서 허술하게 들썩
      return {
        sx: dir,
        rot: dir * tilt * Math.cos(Math.PI * ph),         // 정박에서 최대로 꺾이고 박 사이에 반대쪽으로 넘어감
        lift: hop * c.bounce(ph),                         // 박 사이에 뜨고 정박에 착지
        s: 1 - (down ? 0.08 : 0.04) * Math.exp(-ph * 14),  // 착지 순간 찌그러졌다가 부드럽게 펴짐 (예전엔 1프레임 뚝 찌그러짐)
        opacity: 1,
        hat: { dy: -h * 0.06 * c.bounce(hatLag), rot: -dir * 7 * c.bounce(hatLag) },
      };
    },
  });

  // ───────────────────────── 2) jellyfish · 해파리 둥둥 ─────────────────────────
  // 의도: 느려지는 엔딩(리타르단도)용 몽환 파트. 고양이들이 물속 해파리처럼 화면 전체에 흩어져 떠다님.
  //  - 기준 위치를 화면 전체에 흩뿌리고, 크기를 줄여(원근: 뒤=작고 흐릿, 앞=크고 선명) 물속 공간감.
  //  - 8~16박 주기의 느린 사인파로 옆/위아래 표류 + 곡 전체에 걸쳐 조금씩 위로 떠오름.
  //  - 매 박마다 해파리 수축: 정박 직후 폭이 좁아지고 키가 늘며(sx↓ s↑) 위로 쑥 → 천천히 가라앉음.
  //  - 몸은 가는 방향으로 살짝 기울고, 모자는 물의 저항처럼 한 박자 늦게 둥실 따라옴.
  // 배치: [x비율, 발 y비율, 크기(=c.size 대비 키)]. 모자 끝이 화면 위로 안 나가게 크기별로 y 하한을 계산해 둠.
  const JELLY_TALL = [
    [.26, .35, .60], [.76, .31, .56], [.52, .49, .66], [.20, .61, .72],
    [.82, .63, .70], [.44, .76, .80], [.78, .89, .86], [.22, .92, .84],
  ];
  const JELLY_WIDE = [
    [.10, .52, .48], [.30, .44, .45], [.52, .50, .50], [.74, .42, .46],
    [.90, .58, .52], [.22, .87, .60], [.48, .93, .62], [.72, .85, .58],
  ];
  // 해파리 한 번 헤엄: 정박 직후 위로 쑥(1/3박에 최고점) → 다음 박까지 천천히 가라앉음
  const propel = p => 6.75 * p * (1 - p) * (1 - p);
  registerMove('jellyfish', {
    label: '해파리 둥둥',
    pose(c) {
      const [ax, ay, depth] = (c.tall ? JELLY_TALL : JELLY_WIDE)[c.i % 8];
      const lo = c.tall ? 0.56 : 0.45, hi = c.tall ? 0.86 : 0.62;
      const near = clamp01((depth - lo) / (hi - lo));     // 0 = 제일 뒤, 1 = 제일 앞
      const b = c.b, ph = frac(b);
      const hh = c.size * depth;                          // 그려질 키(px)
      const px = 16;                                      // 옆 표류 주기(박)
      const py = c.rnd(11) < 0.5 ? 8 : 16;                // 위아래 표류 주기(박)
      const fx = c.rnd(12) * TAU, fy = c.rnd(13) * TAU;   // 고양이마다 다른 출발 위상
      const ampX = c.W * (c.tall ? 0.06 : 0.035), ampY = c.H * 0.025;
      const rise = c.H * 0.05 * c.ease(clamp01(b / c.len)); // 곡 내내 아주 천천히 떠오름
      // 수축: 정박부터 0.15박 동안 빠르게 조였다가 박 끝까지 서서히 풀림
      const con = ph < 0.15 ? c.ease(ph / 0.15) : Math.pow((1 - ph) / 0.85, 2);
      const lift = hh * 0.07 * propel(ph);
      const hatLift = hh * 0.07 * 1.4 * propel(frac(ph - 0.2)); // 모자는 0.2박 늦게, 더 높이 뜸
      return {
        x: ax * c.W + ampX * Math.sin(TAU * b / px + fx),
        y: ay * c.H + ampY * Math.sin(TAU * b / py + fy) - rise,
        s: (depth / c.home.s) * (1 + 0.05 * con),         // 수축할 때 키가 살짝 늘고
        sx: 1 - 0.14 * con,                               // 폭은 좁아짐(종 모양이 오므라드는 느낌)
        lift,
        rot: 7 * Math.cos(TAU * b / px + fx) + 3 * Math.sin(TAU * b / 4 + fy), // 떠가는 방향으로 기울기 + 잔물결
        z: depth * 1000,                                  // 큰(앞) 고양이가 앞에 그려짐
        opacity: 0.78 + 0.22 * near,                      // 뒤쪽은 살짝 흐릿하게 → 물속 깊이감
        hat: {
          dy: -hh * 0.03 - (hatLift - lift),              // 머리 위에 살짝 떠서 한 박자 늦게 출렁
          dx: hh * 0.03 * Math.sin(TAU * (b - 0.35) / 4 + fy),
          rot: 8 * Math.sin(TAU * (b - 0.35) / 4 + fy),   // 몸 흔들림보다 늦게 도는 모자
        },
      };
    },
  });

  // ───────────────────────── 3) finale · 피날레 ─────────────────────────
  // 의도: 레퍼런스 짤처럼 가운데로 우르르 뭉쳐서 떼창 → 마지막에 다같이 초대형 점프 → 착지하며 정지.
  //  - 앞쪽 절반 동안 매 박 콩콩 뛰면서 가운데 덩어리(뒤 3·가운데 2·앞 3, 서로 겹침)로 모임.
  //  - 점프는 끝으로 갈수록 점점 커짐(마디 첫 박으로 들어가는 점프는 더 크게). 이웃끼리 반대로 흔들어 난장판 떼창.
  //  - 마지막 4박: 반 박 웅크림 → 2.5박 동안 초대형 점프(공중에서 빙글 돌고, 덩어리가 폭죽처럼 벌어짐,
  //    모자는 더 높이 날아가 뱅글뱅글) → c.len-1 박에 정확히 착지, 그 뒤로는 완전 정지(모자는 삐뚤게 안착).
  const SLOT = [[-1, 0], [0, 0], [1, 0], [-0.5, 1], [0.5, 1], [-1, 2], [0, 2], [1, 2]]; // [가로칸, 줄(0뒤·1중간·2앞)]
  const ROWS = [{ dy: -0.36, s: 0.84 }, { dy: -0.18, s: 0.92 }, { dy: 0, s: 1 }];      // 줄별 발 높이(키 배수)·크기
  // 가로 화면 집(4+4)에서 덩어리 칸으로 갈 때 서로 덜 엇갈리게 짝지음. 세로 화면(3+2+3)은 번호 그대로.
  const WIDE_SLOT = [0, 1, 4, 2, 5, 3, 6, 7];

  function clumpSpot(c) {
    const slot = c.tall ? c.i % 8 : WIDE_SLOT[c.i % 8];
    const [ux, row] = SLOT[slot];
    const k = c.tall ? 1.0 : 0.78;                      // 앞줄 키 = c.size * k (가로 화면은 원래 고양이가 커서 줄임)
    const H0 = c.size * k, w0 = H0 * 0.78;
    const sp = w0 * (c.tall ? 0.6 : 0.72) * (row === 0 ? 0.9 : 1); // 옆 고양이와 40% 가까이 겹치게
    const Yf = c.H * (c.tall ? 0.76 : 0.92);            // 앞줄 발 위치 (위쪽 공간은 마지막 점프용)
    const R = ROWS[row];
    const out = ux !== 0 ? Math.sign(ux) : (slot % 2 === 0 ? 1 : -1); // 바깥쪽 방향(가운데는 번갈아)
    return { slot, ux, row, out, sp, x: c.W / 2 + ux * sp, y: Yf + R.dy * H0, hh: H0 * R.s, s: (k * R.s) / c.home.s };
  }

  // 모이면서 콩콩 뛰는 구간의 자세 (J = 마지막 점프 시작 박)
  function hopPose(c, sp, b, J) {
    const G = Math.min(J, 4 * Math.max(1, Math.round(J * 0.15))); // 모이는 데 걸리는 박(16박이면 8, 32박이면 16)
    const fb = Math.floor(b), ph = b - fb;
    const g = G > 0 ? c.ease(clamp01((fb + c.ease(ph)) / G)) : 1; // 공중에 떠 있을 때만 전진 → 한 박에 한 걸음씩
    const prog = J > 0 ? clamp01(b / J) : 1;             // 곡 진행도 → 점프·흔들기 점점 커짐
    const into = (fb + 1) % 4 === 0;                     // 다음 착지가 마디 첫 박
    const hsz = lerp(c.size * c.home.s, sp.hh, g);       // 지금 그려지는 키
    const amp = hsz * (0.05 + 0.24 * prog * prog) * (0.85 + 0.3 * c.rnd(21)) * (into ? 1.35 : 1);
    const alt = sp.slot % 2 === 0 ? 1 : -1;              // 이웃끼리 반대로 흔들기
    return {
      x: lerp(c.home.x, sp.x, g),
      y: lerp(c.home.y, sp.y, g),
      s: lerp(1, sp.s, g),
      sx: 1,
      lift: amp * c.bounce(ph),
      rot: alt * (5 + 7 * prog) * Math.cos(Math.PI * b), // 정박마다 좌우로 크게 기우뚱
      opacity: 1,
      hat: {
        dx: 0, s: 1,
        dy: -hsz * (0.04 + 0.1 * prog) * c.bounce(frac(ph - 0.2)), // 점프 커질수록 모자가 더 헐렁하게 들썩
        rot: -alt * (4 + 6 * prog) * Math.cos(Math.PI * b - 0.6),
      },
    };
  }

  registerMove('finale', {
    label: '피날레',
    pose(c) {
      const sp = clumpSpot(c);
      const L = c.len;
      const J = Math.max(0, L - 4);                      // 마지막 4박 = 초대형 점프
      const b = c.b;
      if (b < J) return hopPose(c, sp, b, J);

      const t = b - J;
      const finalRot = sp.ux !== 0 ? sp.out * 6 : sp.out * 3; // 착지 포즈: 바깥으로 살짝 기운 "짜잔" 부채꼴
      // 모자는 삐뚤게 떨어져 안착. (rnd-0.5)만 썼더니 해시가 한쪽으로 쏠려 8개 중 7개가 같은 쪽으로 기울어서 → 부호는 번갈아
      const crook = (c.i % 2 ? 1 : -1) * (8 + 14 * c.rnd(34));
      const freeze = {
        x: sp.x, y: sp.y, s: sp.s, sx: 1, lift: 0, rot: finalRot, opacity: 1,
        hat: { dx: 0, dy: 0, rot: crook, s: 1 },
      };
      if (t >= 3) return freeze;                         // c.len-1 박 이후 완전 정지

      if (t < 0.5) {                                     // 웅크리기: 직전 자세에서 작아지며 힘 모음
        const pre = hopPose(c, sp, J, J);
        const cr = c.ease(t / 0.5);
        return {
          x: sp.x, y: sp.y, sx: 1, lift: 0, opacity: 1,
          s: sp.s * (1 - 0.08 * cr),
          rot: pre.rot * (1 - cr),
          hat: { dx: 0, s: 1, dy: lerp(pre.hat.dy, sp.hh * 0.03, cr), rot: pre.hat.rot * (1 - cr) },
        };
      }

      // 초대형 점프: 머리 꼭대기가 화면 위 28% 근처까지 올라가도록 높이를 고양이마다 계산.
      // (20%까지 올렸더니 모자가 화면 밖으로 0.2~0.3H나 나가서 '모자 날아감' 개그가 안 보였음 → 고양이를 조금 낮추고 모자에 공간을 줌)
      const u = (t - 0.5) / 2.5;                          // 0 = 도약, 1 = 착지(c.len-1 박)
      const arc = 4 * u * (1 - u);
      const up = Math.sin(Math.PI * u);
      const peak = Math.min(c.H * 0.45, Math.max(c.H * 0.12, sp.y - sp.hh - c.H * 0.28));
      const turns = sp.slot % 3 === 0 ? 2 : 1;            // 몇 마리는 두 바퀴
      const unsquash = Math.max(0, 1 - u * 5);            // 도약 직후 웅크림이 풀림
      // 모자는 고양이보다 더 높이 날아감. 단 최고점에서 모자 끝이 화면 위로 2% 이상 안 나가게 상한(커진 모자 키 ~0.6배 포함)
      const room = sp.y - peak - 1.6 * sp.hh + c.H * 0.02;
      const hatPk = Math.max(sp.hh * 0.4, Math.min(sp.hh * (0.7 + 0.45 * c.rnd(31)), room));
      const spin = (c.rnd(32) < 0.5 ? -1 : 1) * 360 * (c.rnd(35) < 0.5 ? 1 : 2);
      return {
        x: sp.x + sp.ux * sp.sp * 0.3 * up,               // 덩어리가 공중에서 폭죽처럼 벌어졌다 다시 모임
        y: sp.y,
        s: sp.s * (1 - 0.08 * unsquash),
        sx: Math.cos(TAU * turns * c.ease(u)),            // 좌우 뒤집기로 가짜 빙글 회전
        lift: peak * arc,
        rot: sp.out * 14 * up + finalRot * c.ease(u),
        opacity: 1,
        hat: {
          dx: (sp.ux * sp.sp * 0.25 + (c.rnd(33) - 0.5) * sp.hh * 0.4) * up,
          dy: -hatPk * up + sp.hh * 0.03 * unsquash,
          rot: (spin + crook) * c.ease(u),
          s: 1 + 0.3 * up,                                // 날아오를 때 카메라 쪽으로 오듯 커짐
        },
      };
    },
  });
})();
