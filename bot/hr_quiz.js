const scriptName = "인사퀴즈";

/* =========================================================
 * 설정
 * ========================================================= */
var CONFIG = {
  // 관리자 닉네임 (카톡 알림에 뜨는 이름과 띄어쓰기까지 정확히 같아야 함)
  ADMINS: [
    "(대전)조춘삼촌조장풍",
    "슈슈 / 방산 / 대전 / 10+",
    "루희/IT/서울/일이",
    "메뚜기/방송/서울/10+",
    "블랙 / 바이오 / 서울 / 9",
    "틸몬/제조/경기/5"
  ],
  QUIZ_HOURS: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],  // 매시 정각 출제
  WEEKDAYS_ONLY: true,        // true: 월~금만 출제
  POST_WINDOW_MIN: 30,        // 정각을 놓쳤을 때 몇 분 안에는 늦게라도 출제
  REVEAL_AFTER_MIN: 50,       // 출제 후 이 시간 동안 정답자 없으면 정답 공개
  POINTS: 10,                 // 정답 점수
  YEARLY_RESET: true,         // true: 새해가 되면 '올해의 퀴즈왕' 발표 후 점수 초기화
  ANNOUNCE_HOUR: 9,           // 새해 첫날 발표 시각 (이 시각 이후 첫 확인 때 발표)
  CHECK_INTERVAL_MS: 20000,

  // ── 온라인 문제은행 (GitHub, 매주 자동 업데이트) ──
  BANK_URL: "https://raw.githubusercontent.com/jinwooLee1985/shushu-hr-quiz/main/quiz_bank.json",
  BANK_RELOAD_MIN: 180,       // 문제은행 다시 불러오는 주기(분). 실패하면 마지막으로 받은 문제 사용

  // ── 정답 기록 (봇 폰에 저장) ──
  LOG_DIR: "/sdcard/msgbot/quiz",   // quiz_log.csv(정답 기록), quiz_stats.csv(문제별 통계) 저장 위치
  LOG_KEEP: 300,              // 앱 내부에 보관할 최근 기록 수 (/정답기록용)

  // ── 출제 구성 ──
  GEN_RATIO: 0.35,            // 계산형(자동 생성) 문제 비율
  RECENT_NO_REPEAT: 20        // 최근 출제한 N문제는 다시 내지 않음
};

/* 연도별 최저임금 — 매년 8월 고시되면 한 줄 추가 */
var MIN_WAGE = {
  2025: { hour: 10030, rate: 1.7 },
  2026: { hour: 10320, rate: 2.9 },
  2027: { hour: 10700, rate: 3.7 }
};

/* =========================================================
 * 문제 은행
 *  type  num : 숫자 답 (a 중 하나 포함 시 정답, alt 문자열도 인정)
 *        ox  : O/X (1인 1회 기회)
 *        kw  : 서술형. g의 각 그룹에서 단어 하나 이상 포함 + reject 단어 없으면 정답
 *  ok   : 정답 시 "정답! " 뒤에 붙는 문장
 * ========================================================= */
var QUIZ = [
  // ---------- 근로시간 ----------
  { id: 1, cat: "근로시간", lv: "쉬움", type: "num", a: [40],
    q: "휴게시간을 제외한 법정 기준근로시간은 1주 최대 몇 시간일까요?",
    hint: "1일 8시간 × 5일",
    ok: "1주 40시간, 1일 8시간을 넘을 수 없다.",
    exp: "이를 넘기려면 당사자 합의에 따른 연장근로(1주 12시간 한도)로 처리해야 합니다.",
    law: "[근로기준법 제50조]" },
  { id: 2, cat: "근로시간", lv: "쉬움", type: "num", a: [12],
    q: "당사자가 합의하면 1주에 최대 몇 시간까지 연장근로를 할 수 있을까요?",
    hint: "주 52시간제 = 40 + ?",
    ok: "당사자 합의로 1주 12시간까지 연장할 수 있다.",
    exp: "기준근로 40시간 + 연장 12시간 = 주 52시간. 휴일근로도 연장근로 한도에 포함됩니다.",
    law: "[근로기준법 제53조제1항]" },
  { id: 3, cat: "근로시간", lv: "쉬움", type: "num", a: [1, 60],
    q: "8시간을 근무하는 날, 사용자가 근로시간 도중에 줘야 하는 휴게시간은 최소 얼마일까요?",
    hint: "점심시간을 떠올려 보세요",
    ok: "8시간 근로에는 1시간 이상의 휴게시간을 근로시간 도중에 준다.",
    exp: "휴게시간은 근로자가 자유롭게 이용할 수 있어야 하며, 업무 시작 전이나 종료 후에 몰아서 줄 수 없습니다.",
    law: "[근로기준법 제54조]" },
  { id: 4, cat: "근로시간", lv: "쉬움", type: "num", a: [10, 22],
    q: "가산수당이 붙는 야간근로는 오후 몇 시부터 시작될까요?",
    hint: "다음 날 오전 6시까지",
    ok: "오후 10시부터 다음 날 오전 6시까지가 야간근로이고, 통상임금의 50% 이상을 가산한다.",
    exp: "야간근로 가산은 연장근로 가산과 별개로 중복해서 적용됩니다. (5인 이상 사업장)",
    law: "[근로기준법 제56조제3항]" },
  { id: 5, cat: "근로시간", lv: "보통", type: "num", a: [7],
    q: "18세 미만 연소근로자의 1일 근로시간 한도는 몇 시간일까요?",
    hint: "성인보다 1시간 짧아요",
    ok: "연소자는 1일 7시간, 1주 35시간을 넘을 수 없다.",
    exp: "당사자 합의가 있어도 연장근로는 1일 1시간, 1주 5시간까지만 가능합니다.",
    law: "[근로기준법 제69조]" },

  // ---------- 임금·보상 ----------
  { id: 6, cat: "임금", lv: "쉬움", type: "num", a: [50],
    q: "연장근로를 시키면 통상임금의 몇 % 이상을 가산해서 지급해야 할까요?",
    hint: "1.5배",
    ok: "연장근로에는 통상임금의 50% 이상을 가산해 지급한다.",
    exp: "5인 미만 사업장에는 가산수당 규정이 적용되지 않습니다.",
    law: "[근로기준법 제56조제1항]" },
  { id: 7, cat: "임금", lv: "보통", type: "num", a: [100],
    q: "휴일근로 중 8시간을 초과한 시간에는 통상임금의 몇 % 이상을 가산할까요?",
    hint: "8시간 이내는 50%",
    ok: "휴일근로 8시간 이내는 50%, 8시간 초과분은 100% 이상을 가산한다.",
    exp: "2018년 법 개정으로 휴일근로 가산율이 명문화됐습니다.",
    law: "[근로기준법 제56조제2항]" },
  { id: 8, cat: "임금", lv: "쉬움", type: "num", a: [10320],
    q: "", hint: "1만 원을 넘었어요", ok: "", exp: "", law: "",
    // 출제 시점의 연도에 맞춰 문제가 바뀜 (MIN_WAGE 표에 없는 해는 가장 최근 연도로 출제)
    dyn: function (now) {
      var y = now.getFullYear(), ys = [];
      for (var k in MIN_WAGE) ys.push(Number(k));
      ys.sort(function (a, b) { return a - b; });
      if (!MIN_WAGE[y]) y = ys[ys.length - 1];
      var w = MIN_WAGE[y];
      return {
        a: [w.hour],
        q: y + "년 최저임금은 시간급 얼마일까요? (원 단위)",
        ok: y + "년 최저임금은 시간급 " + comma(w.hour) + "원(월 209시간 기준 " + comma(w.hour * 209) + "원)이다.",
        exp: (MIN_WAGE[y - 1] ? (y - 1) + "년 " + comma(MIN_WAGE[y - 1].hour) + "원보다 " + w.rate + "% 올랐습니다." : ""),
        law: "[최저임금법 제10조, " + y + "년 적용 최저임금 고시]"
      };
    } },
  { id: 9, cat: "임금", lv: "보통", type: "num", a: [10],
    q: "1년 이상 근로계약을 맺은 수습근로자(3개월 이내)는 최저임금의 몇 %까지 감액할 수 있을까요?",
    hint: "90%는 줘야 해요",
    ok: "수습 3개월 이내에는 최저임금의 10%까지 감액(90% 지급)할 수 있다.",
    exp: "1년 미만 계약자나 단순노무직종 종사자는 수습 중에도 감액할 수 없습니다.",
    law: "[최저임금법 제5조제2항, 시행령 제3조]" },
  { id: 10, cat: "임금", lv: "쉬움", type: "num", a: [70],
    q: "사용자 귀책사유로 휴업하면 휴업기간 동안 평균임금의 몇 % 이상을 지급해야 할까요?",
    hint: "휴업수당",
    ok: "휴업기간 동안 평균임금의 70% 이상을 휴업수당으로 지급한다.",
    exp: "평균임금의 70%가 통상임금보다 많으면 통상임금으로 지급할 수 있습니다.",
    law: "[근로기준법 제46조]" },
  { id: 11, cat: "임금", lv: "보통", type: "num", a: [3],
    q: "평균임금은 산정사유 발생일 이전 몇 개월 동안 받은 임금총액으로 계산할까요?",
    hint: "분기",
    ok: "사유 발생일 이전 3개월간 임금총액을 그 기간 총일수로 나눈다.",
    exp: "퇴직금·휴업수당·재해보상 등이 평균임금을 기준으로 계산됩니다.",
    law: "[근로기준법 제2조제1항제6호]" },
  { id: 12, cat: "임금", lv: "보통", type: "ox", a: "O",
    q: "[O/X] 임금명세서 교부 의무는 상시 5인 미만 사업장에도 적용된다.",
    hint: "규모 제한이 없어요",
    ok: "임금명세서 교부 의무는 사업장 규모와 관계없이 모든 사업장에 적용된다.",
    exp: "임금 구성항목·계산방법·공제내역 등을 적어 서면(전자문서 포함)으로 교부해야 합니다.",
    law: "[근로기준법 제48조제2항]" },
  { id: 13, cat: "임금", lv: "쉬움", type: "ox", a: "X",
    q: "[O/X] 근로자 본인이 동의하면 임금을 부모님 계좌로 대신 지급해도 된다.",
    hint: "임금 지급 4원칙",
    ok: "임금은 근로자 본인에게 직접 지급해야 한다.",
    exp: "임금 지급 4원칙: 통화로, 직접, 전액을, 매월 1회 이상 일정한 날짜에 지급합니다.",
    law: "[근로기준법 제43조]" },
  { id: 14, cat: "보상", lv: "어려움", type: "ox", a: "O",
    q: "[O/X] 2024년 대법원 전원합의체 판결 이후, '지급일 재직자에게만 준다'는 조건이 붙은 정기상여금도 통상임금이 될 수 있다.",
    hint: "'고정성' 요건이 어떻게 됐을까요",
    ok: "통상임금 판단에서 고정성 요건이 폐기되어 재직조건부 정기상여금도 통상임금에 해당할 수 있다.",
    exp: "대법원은 소정근로의 대가로 정기적·일률적으로 지급되면 통상임금이라고 보면서, 재직조건·근무일수 조건이 붙어도 통상임금성을 부정하지 않았습니다. (판결일 이후 산정분부터 적용)",
    law: "[대법원 2024.12.19. 선고 2023다302838 전원합의체 판결]" },
  { id: 15, cat: "보상", lv: "보통", type: "kw",
    g: [["휴업수당", "70"]],
    q: "자재 수급 문제(회사 사정)로 공장을 3일간 멈추고 직원들을 쉬게 했습니다. 회사가 직원들에게 해야 할 조치는?",
    hint: "평균임금의 일정 비율",
    ok: "휴업기간 동안 평균임금의 70% 이상을 휴업수당으로 지급한다.",
    exp: "경영상 사유(자재 부족 등)도 원칙적으로 사용자 귀책입니다. 부득이한 경우 노동위원회 승인을 받아 기준보다 적게 지급할 수 있습니다.",
    law: "[근로기준법 제46조]" },

  // ---------- 휴가·휴일 ----------
  { id: 16, cat: "휴가", lv: "쉬움", type: "num", a: [15],
    q: "1년간 80% 이상 출근한 근로자에게 주는 연차유급휴가는 며칠일까요?",
    hint: "보름",
    ok: "1년간 80% 이상 출근하면 15일의 연차유급휴가를 준다.",
    exp: "3년 이상 근속하면 최초 1년을 넘는 근속 2년마다 1일씩 가산됩니다.",
    law: "[근로기준법 제60조제1항]" },
  { id: 17, cat: "휴가", lv: "쉬움", type: "num", a: [25],
    q: "가산휴가를 포함한 연차유급휴가의 법정 최대 일수는?",
    hint: "15일 + 가산 최대 10일",
    ok: "연차는 가산휴가를 포함해 최대 25일이다.",
    exp: "근속 21년차에 25일에 도달합니다.",
    law: "[근로기준법 제60조제4항]" },
  { id: 18, cat: "휴가", lv: "보통", type: "num", a: [11],
    q: "입사 1년 미만 근로자는 1개월 개근 시 1일의 연차가 생깁니다. 첫해에 최대 며칠까지 생길까요?",
    hint: "12개월 - 1",
    ok: "1년 미만 기간에는 1개월 개근마다 1일씩, 최대 11일이 발생한다.",
    exp: "1년 근무를 마치면 별도로 15일이 발생합니다.",
    law: "[근로기준법 제60조제2항]" },
  { id: 19, cat: "휴가", lv: "보통", type: "ox", a: "X",
    q: "[O/X] 주 12시간 일하는 아르바이트생에게도 주휴일과 연차를 줘야 한다.",
    hint: "초단시간 근로자",
    ok: "4주 평균 1주 소정근로 15시간 미만인 근로자에게는 주휴일과 연차 규정이 적용되지 않는다.",
    exp: "초단시간 근로자는 퇴직금 지급 대상에서도 제외됩니다.",
    law: "[근로기준법 제18조제3항]" },
  { id: 20, cat: "휴가", lv: "보통", type: "ox", a: "O",
    q: "[O/X] 상시 5인 이상 사업장은 설·추석 같은 관공서 공휴일을 유급휴일로 보장해야 한다.",
    hint: "2022년부터 전면 시행",
    ok: "5인 이상 사업장은 관공서 공휴일과 대체공휴일을 유급휴일로 보장해야 한다.",
    exp: "근로자대표와 서면합의하면 특정 공휴일을 다른 근로일로 대체할 수 있습니다.",
    law: "[근로기준법 제55조제2항, 시행령 제30조제2항]" },
  { id: 21, cat: "휴가", lv: "보통", type: "kw",
    g: [["사용촉진", "연차촉진", "촉진"]],
    q: "미사용 연차수당이 매년 큰 부담입니다. 연차수당 지급 의무를 합법적으로 면제받으려면 어떤 제도를 운영해야 할까요?",
    hint: "회사가 연차 사용을 '독려'하는 서면 절차",
    ok: "연차 사용촉진 제도를 서면으로 시행하면 미사용 연차수당 지급 의무가 면제된다.",
    exp: "① 사용기간 종료 6개월 전 기준 10일 이내에 미사용 일수를 알리고 사용시기 지정을 서면으로 촉구 → ② 근로자가 지정하지 않으면 종료 2개월 전까지 사용자가 시기를 정해 서면 통보. 두 단계를 모두 거쳐야 합니다.",
    law: "[근로기준법 제61조]" },

  // ---------- 모성보호·일가정양립 ----------
  { id: 22, cat: "모성보호", lv: "쉬움", type: "num", a: [90],
    q: "출산전후휴가는 출산 전후를 합쳐 며칠일까요? (한 명 임신 기준)",
    hint: "3개월",
    ok: "출산전후휴가는 90일이며, 출산 후에 45일 이상이 되도록 배정한다.",
    exp: "다태아는 120일(출산 후 60일 이상)입니다.",
    law: "[근로기준법 제74조제1항]" },
  { id: 23, cat: "모성보호", lv: "쉬움", type: "num", a: [20],
    q: "배우자가 출산하면 남편이 쓸 수 있는 유급 배우자 출산휴가는 며칠일까요? (2025.2.23 이후)",
    hint: "예전 10일의 두 배",
    ok: "배우자 출산휴가는 20일 유급으로 주고, 출산일부터 120일 이내에 3회까지 나눠 쓸 수 있다.",
    exp: "2025년 2월 23일부터 10일에서 20일로 늘었습니다.",
    law: "[남녀고용평등법 제18조의2]" },
  { id: 24, cat: "모성보호", lv: "보통", type: "num", a: [18], alt: ["1년6개월", "1년반", "일년반"],
    q: "부모가 모두 같은 자녀로 육아휴직을 3개월 이상 쓰면, 각자 최대 몇 개월까지 쓸 수 있을까요?",
    hint: "1년 + 6개월",
    ok: "부모 모두 3개월 이상 사용하면 각각 최대 1년 6개월(18개월)까지 쓸 수 있다.",
    exp: "2025년 2월 23일 시행. 한부모나 중증장애아동 부모도 1년 6개월까지 가능합니다.",
    law: "[남녀고용평등법 제19조제2항]" },
  { id: 25, cat: "모성보호", lv: "보통", type: "kw",
    g: [["2시간", "두시간", "2h"]],
    q: "임신 10주차 직원이 근로시간 단축을 신청했습니다. 회사는 하루 몇 시간까지 단축을 허용해야 할까요?",
    hint: "임신 12주 이내 또는 32주 이후",
    ok: "1일 2시간의 근로시간 단축을 허용하고, 이를 이유로 임금을 깎으면 안 된다.",
    exp: "1일 근로시간이 8시간 미만인 근로자는 1일 6시간이 되도록 단축할 수 있습니다.",
    law: "[근로기준법 제74조제7항·제8항]" },
  { id: 26, cat: "모성보호", lv: "보통", type: "kw",
    g: [["허용", "승인", "줘야", "부여", "해줘", "거부불가", "거부못", "거부할수없", "거절못", "거절할수없"]],
    reject: ["거부할수있", "거부가능", "거절할수있", "거절가능"],
    q: "입사 2년 된 직원이 만 7세 자녀를 위해 육아휴직을 신청했습니다. 회사가 거부할 수 있을까요? 회사는 어떻게 해야 할까요?",
    hint: "대상 자녀: 만 8세 이하(초2 이하)",
    ok: "대상 자녀 요건을 충족하므로 육아휴직을 허용해야 하고, 원칙적으로 거부할 수 없다.",
    exp: "계속근로 6개월 미만 근로자 등은 예외적으로 거부할 수 있습니다. 육아휴직을 이유로 해고하거나 불리하게 처우하면 안 됩니다.",
    law: "[남녀고용평등법 제19조, 시행령 제10조]" },

  // ---------- 해고·징계 ----------
  { id: 27, cat: "해고", lv: "쉬움", type: "num", a: [30],
    q: "근로자를 해고하려면 최소 며칠 전에 예고해야 할까요?",
    hint: "한 달",
    ok: "적어도 30일 전에 예고하고, 예고하지 않으면 30일분 이상의 통상임금을 지급한다.",
    exp: "계속근로 3개월 미만, 천재지변 등 예외가 있습니다. 해고예고와 해고의 정당성은 별개의 문제입니다.",
    law: "[근로기준법 제26조]" },
  { id: 28, cat: "해고", lv: "보통", type: "num", a: [3],
    q: "부당해고 구제신청은 해고가 있었던 날부터 몇 개월 이내에 노동위원회에 해야 할까요?",
    hint: "분기",
    ok: "해고일부터 3개월 이내에 노동위원회에 구제신청을 한다.",
    exp: "기간이 지나면 구제신청 자체가 각하됩니다. 법원 해고무효확인소송은 별도입니다.",
    law: "[근로기준법 제28조제2항]" },
  { id: 29, cat: "해고", lv: "보통", type: "kw",
    g: [["예고수당", "30일분", "30일치", "30일급여", "30일임금", "한달치", "한달분", "통상임금"]],
    q: "입사 2년 된 직원에게 '내일부터 나오지 마세요'라고 즉시 해고를 통보했습니다. (해고 사유는 정당하다고 가정) 회사가 추가로 해야 할 일은?",
    hint: "예고 없이 해고했을 때의 돈",
    ok: "30일분 이상의 통상임금을 해고예고수당으로 지급하고, 해고 사유와 시기를 서면으로 통지한다.",
    exp: "해고 사유·시기를 서면으로 통지하지 않으면 해고 자체가 무효입니다.",
    law: "[근로기준법 제26조, 제27조]" },
  { id: 30, cat: "해고", lv: "보통", type: "ox", a: "O",
    q: "[O/X] 계속근로 3개월 미만인 근로자는 해고예고 없이 해고할 수 있다.",
    hint: "해고예고의 예외",
    ok: "계속근로 3개월 미만인 근로자는 해고예고 적용이 제외된다.",
    exp: "다만 예고 의무만 면제될 뿐, 5인 이상 사업장이라면 해고의 정당한 이유는 여전히 필요합니다.",
    law: "[근로기준법 제26조 단서]" },
  { id: 31, cat: "징계", lv: "어려움", type: "kw",
    g: [["2분의1", "1/2", "절반", "반"]],
    q: "근태 불량으로 감봉 징계를 하려 합니다. 감급 1회의 금액은 평균임금 1일분의 얼마를 넘을 수 없을까요?",
    hint: "분수로 답해 보세요",
    ok: "감급 1회 금액은 평균임금 1일분의 1/2, 총액은 1임금지급기 임금총액의 1/10을 넘을 수 없다.",
    exp: "감급 제재는 취업규칙에 근거가 있어야 하고, 징계 절차를 지켜야 합니다.",
    law: "[근로기준법 제95조]" },
  { id: 32, cat: "징계", lv: "쉬움", type: "ox", a: "X",
    q: "[O/X] 근로계약서에 '1년 이내 퇴사 시 위약금 300만 원을 낸다'는 조항을 넣으면 유효하다.",
    hint: "위약 예정",
    ok: "위약금이나 손해배상액을 미리 정하는 계약은 금지되므로 무효이다.",
    exp: "다만 회사가 실제 지출한 교육비를 일정 기간 내 퇴사 시 반환하게 하는 약정은 판례상 유효할 수 있습니다.",
    law: "[근로기준법 제20조]" },

  // ---------- 근로계약·취업규칙 ----------
  { id: 33, cat: "근로계약", lv: "쉬움", type: "kw",
    g: [["서면", "계약서", "문서"], ["교부", "작성", "줘", "준다", "주어", "전달", "발급", "써"]],
    q: "신입 직원과 연봉·근로시간을 말로만 합의하고 일을 시작했습니다. 회사가 해야 할 일은?",
    hint: "종이(또는 전자문서)",
    ok: "임금·소정근로시간·휴일·연차 등을 명시한 근로계약서를 서면으로 작성해 근로자에게 교부한다.",
    exp: "서면 명시·교부 의무를 위반하면 500만 원 이하 벌금 대상입니다. 기간제·단시간 근로자는 명시 항목이 더 많습니다.",
    law: "[근로기준법 제17조]" },
  { id: 34, cat: "근로계약", lv: "쉬움", type: "num", a: [10],
    q: "취업규칙을 작성해 고용노동부에 신고해야 하는 사업장은 상시 몇 명 이상일까요?",
    hint: "두 자릿수가 되는 순간",
    ok: "상시 10명 이상 사업장은 취업규칙을 작성해 신고한다.",
    exp: "취업규칙을 변경할 때도 신고해야 합니다.",
    law: "[근로기준법 제93조]" },
  { id: 35, cat: "근로계약", lv: "보통", type: "kw",
    g: [["작성", "만들", "제정"], ["신고", "제출"]],
    q: "직원이 12명으로 늘었는데 아직 취업규칙이 없습니다. 회사가 해야 할 일은?",
    hint: "만들고, 그다음엔?",
    ok: "취업규칙을 작성하고 고용노동부장관(관할 지청)에 신고한다.",
    exp: "작성할 때는 근로자 과반수의 의견을 들어야 하고, 신고할 때 그 의견서를 첨부합니다.",
    law: "[근로기준법 제93조, 제94조]" },
  { id: 36, cat: "근로계약", lv: "어려움", type: "kw",
    g: [["과반", "절반이상", "반이상"], ["동의"]],
    q: "노동조합이 없는 회사에서 상여금을 줄이는 쪽으로 취업규칙을 바꾸려 합니다. 어떤 절차가 필요할까요?",
    hint: "의견 청취가 아니라…",
    ok: "근로자 과반수의 동의(집단적 동의)를 받아야 한다.",
    exp: "불리한 변경은 의견 청취만으로 부족합니다. 과반수 노조가 있으면 그 노조의 동의가 필요합니다. 동의 없는 불리한 변경은 원칙적으로 무효입니다.",
    law: "[근로기준법 제94조제1항 단서]" },
  { id: 37, cat: "근로계약", lv: "쉬움", type: "num", a: [2],
    q: "기간제 근로자를 최대 몇 년까지 사용할 수 있을까요? (초과하면 무기계약직 간주)",
    hint: "한 자리 숫자",
    ok: "기간제 근로자는 2년을 초과해 사용할 수 없고, 초과하면 기간의 정함이 없는 근로자로 본다.",
    exp: "55세 이상 고령자, 박사학위 소지자의 해당 분야 업무 등은 예외입니다.",
    law: "[기간제법 제4조]" },
  { id: 38, cat: "근로계약", lv: "쉬움", type: "num", a: [3],
    q: "근로자 명부와 근로계약서 등 근로계약 관련 서류는 몇 년간 보존해야 할까요?",
    hint: "임금채권 소멸시효와 같아요",
    ok: "근로자 명부와 근로계약 관련 중요 서류는 3년간 보존한다.",
    exp: "임금대장, 휴가 관련 서류, 해고·퇴직 관련 서류 등도 포함됩니다.",
    law: "[근로기준법 제42조]" },

  // ---------- 퇴직 ----------
  { id: 39, cat: "퇴직", lv: "쉬움", type: "num", a: [14],
    q: "근로자가 퇴직하면 임금·퇴직금 등 모든 금품을 며칠 이내에 지급해야 할까요?",
    hint: "2주",
    ok: "퇴직일부터 14일 이내에 임금·퇴직금 등 모든 금품을 지급한다.",
    exp: "특별한 사정이 있으면 당사자 합의로 기일을 연장할 수 있습니다.",
    law: "[근로기준법 제36조, 근로자퇴직급여 보장법 제9조]" },
  { id: 40, cat: "퇴직", lv: "보통", type: "ox", a: "X",
    q: "[O/X] 주 10시간씩 1년 넘게 일한 아르바이트생도 퇴직금을 받는다.",
    hint: "주 15시간",
    ok: "4주 평균 1주 소정근로시간이 15시간 미만이면 퇴직금 지급 대상이 아니다.",
    exp: "퇴직금 요건은 계속근로 1년 이상이면서 4주 평균 주 15시간 이상입니다.",
    law: "[근로자퇴직급여 보장법 제4조제1항]" },
  { id: 41, cat: "퇴직", lv: "쉬움", type: "num", a: [60],
    q: "법정 정년은 최소 몇 세 이상으로 정해야 할까요?",
    hint: "환갑",
    ok: "사업주는 정년을 60세 이상으로 정해야 한다.",
    exp: "60세 미만으로 정하면 60세로 정한 것으로 봅니다.",
    law: "[고령자고용법 제19조]" },

  // ---------- 채용 ----------
  { id: 42, cat: "채용", lv: "쉬움", type: "num", a: [30],
    q: "채용절차법은 상시 몇 명 이상 사업장에 적용될까요?",
    hint: "노사협의회 설치 기준과 같아요",
    ok: "채용절차법은 상시 30명 이상 사업장에 적용된다.",
    exp: "국가·지자체는 규모와 관계없이 적용됩니다.",
    law: "[채용절차법 제3조]" },
  { id: 43, cat: "채용", lv: "쉬움", type: "ox", a: "X",
    q: "[O/X] (상시 30명 이상 회사) 입사지원서에 '부모님 직업' 기재란을 둘 수 있다.",
    hint: "직무와 관련 있을까요?",
    ok: "직계존비속의 학력·직업·재산은 지원서에 기재하도록 요구할 수 없다.",
    exp: "용모·키·체중, 출신지역, 혼인 여부, 재산도 요구할 수 없습니다. 위반하면 최대 500만 원 과태료 대상입니다.",
    law: "[채용절차법 제4조의3]" },
  { id: 44, cat: "채용", lv: "보통", type: "kw",
    g: [["반환", "돌려", "반송"]],
    q: "불합격한 지원자가 우편으로 낸 채용서류를 돌려달라고 요청했습니다. (상시 50명 회사) 회사는 어떻게 해야 할까요?",
    hint: "청구일부터 14일",
    ok: "청구일부터 14일 이내에 채용서류를 반환한다.",
    exp: "홈페이지·이메일로 제출된 서류는 반환 대상이 아닙니다. 반환 비용은 원칙적으로 구인자가 부담하고, 보관기간이 지나면 파기해야 합니다.",
    law: "[채용절차법 제11조]" },
  { id: 45, cat: "채용", lv: "보통", type: "num", a: [3.1],
    q: "민간기업(상시 50명 이상)의 장애인 의무고용률은 몇 %일까요?",
    hint: "3%대",
    ok: "민간기업 장애인 의무고용률은 3.1%이다.",
    exp: "상시 100명 이상 사업주가 의무고용률에 못 미치면 고용부담금을 냅니다.",
    law: "[장애인고용촉진법 제28조, 시행령 제25조]" },

  // ---------- 교육 ----------
  { id: 46, cat: "교육", lv: "쉬움", type: "num", a: [1],
    q: "직장 내 성희롱 예방교육은 연 몇 회 이상 실시해야 할까요?",
    hint: "최소 기준",
    ok: "직장 내 성희롱 예방교육은 연 1회 이상 실시한다.",
    exp: "사업주와 근로자 모두 교육 대상입니다. 미실시 시 500만 원 이하 과태료가 부과될 수 있습니다.",
    law: "[남녀고용평등법 제13조, 시행령 제3조]" },
  { id: 47, cat: "교육", lv: "보통", type: "num", a: [6],
    q: "사무직 근로자의 산업안전보건 정기교육은 매 반기 몇 시간 이상일까요?",
    hint: "비사무직은 12시간",
    ok: "사무직 근로자는 매 반기 6시간 이상 정기 안전보건교육을 받는다.",
    exp: "판매 업무 직접 종사자도 6시간, 그 밖의 근로자는 매 반기 12시간 이상입니다.",
    law: "[산업안전보건법 제29조, 시행규칙 별표4]" },
  { id: 48, cat: "교육", lv: "보통", type: "num", a: [8],
    q: "정규직 신규 입사자에게 실시하는 '채용 시 안전보건교육'은 몇 시간 이상일까요?",
    hint: "하루 근무시간",
    ok: "채용 시 안전보건교육은 8시간 이상 실시한다.",
    exp: "일용근로자·1주 이하 기간제는 1시간, 1주 초과 1개월 이하 기간제는 4시간 이상입니다.",
    law: "[산업안전보건법 제29조제2항, 시행규칙 별표4]" },

  // ---------- 조직문화·노사 ----------
  { id: 49, cat: "조직문화", lv: "보통", type: "kw",
    g: [["조사", "사실확인", "사실관계"]],
    reject: ["조사안", "조사할필요없", "조사필요없", "안해도"],
    q: "상시 40명 회사에서 직장 내 괴롭힘 신고가 들어왔습니다. 사용자가 법에 따라 가장 먼저 해야 할 일은?",
    hint: "지체 없이, 객관적으로",
    ok: "지체 없이 객관적으로 조사하고, 조사 기간 중 피해근로자를 보호한다.",
    exp: "괴롭힘이 확인되면 피해자 요청에 따라 근무장소 변경·유급휴가 등을 조치하고, 행위자를 징계합니다. 신고자에게 불리한 처우를 하면 형사처벌 대상이고, 조사 내용은 비밀로 유지해야 합니다. (5인 미만 사업장 제외)",
    law: "[근로기준법 제76조의3]" },
  { id: 50, cat: "노사", lv: "보통", type: "num", a: [30],
    q: "노사협의회를 의무적으로 설치해야 하는 사업장은 상시 몇 명 이상일까요?",
    hint: "채용절차법 적용 기준과 같아요",
    ok: "상시 30명 이상 사업장은 노사협의회를 설치하고 3개월마다 정기회의를 연다.",
    exp: "고충처리위원도 함께 두어야 합니다.",
    law: "[근로자참여법 제4조, 제12조]" },
  { id: 51, cat: "안전", lv: "보통", type: "kw",
    g: [["산업재해조사표", "재해조사표", "조사표"]],
    q: "직원이 작업 중 다쳐 4일간 출근하지 못했습니다. 회사가 노동관서에 제출해야 하는 서류는?",
    hint: "3일 이상 휴업 재해",
    ok: "재해 발생일부터 1개월 이내에 산업재해조사표를 관할 지방고용노동관서에 제출한다.",
    exp: "사망 또는 3일 이상 휴업이 필요한 부상·질병이 보고 대상입니다. 은폐하거나 보고하지 않으면 과태료·형사처벌 대상입니다.",
    law: "[산업안전보건법 제57조제3항, 시행규칙 제73조]" },
  { id: 52, cat: "근로시간", lv: "쉬움", type: "ox", a: "X",
    q: "[O/X] 상시 4명이 일하는 사업장도 연장근로를 시키면 50% 가산수당을 줘야 한다.",
    hint: "5인 미만 적용 제외 조항",
    ok: "5인 미만 사업장에는 연장·야간·휴일 가산수당 규정이 적용되지 않는다.",
    exp: "다만 실제 일한 시간에 대한 임금과 주휴수당은 지급해야 합니다.",
    law: "[근로기준법 제11조제2항, 시행령 제7조 별표1]" }
];

/* =========================================================
 * 상태
 * ========================================================= */
if (!String.prototype.repeat) {
  String.prototype.repeat = function (n) { var s = ""; for (var i = 0; i < n; i++) s += this; return s; };
}
var DB = {
  ROOMS: "quiz/rooms", USED: "quiz/used", POSTED: "quiz/posted",
  ACTIVE: "quiz/active/", SCORE: "quiz/score/", COUNT: "quiz/count",
  SCORE_YEAR: "quiz/scoreYear/", HALL: "quiz/hall/",
  BANK: "quiz/bank", BANK_AT: "quiz/bankAt", BANK_VER: "quiz/bankVer", RECENT: "quiz/recent",
  LOG: "quiz/log", STATS: "quiz/stats"
};
var quizRooms = loadJSON(DB.ROOMS, []);
var lock = new java.util.concurrent.atomic.AtomicBoolean(false);
var schedulerThread = null;
var lastTick = "없음";

/* =========================================================
 * 스케줄러: 매시 정각 출제 + 미해결 문제 정답 공개
 * ========================================================= */
function startScheduler() {
  stopScheduler();
  schedulerThread = new java.lang.Thread(new java.lang.Runnable({
    run: function () {
      while (!java.lang.Thread.currentThread().isInterrupted()) {
        try {
          lastTick = stamp(new Date());
          tick();
          java.lang.Thread.sleep(CONFIG.CHECK_INTERVAL_MS);
        } catch (e) {
          if (String(e).indexOf("Interrupted") !== -1) break;
          logError("스케줄러", e);
        }
      }
    }
  }));
  schedulerThread.start();
}
function stopScheduler() {
  if (schedulerThread != null) { try { schedulerThread.interrupt(); } catch (e) {} schedulerThread = null; }
}
function onStartCompile() { stopScheduler(); }

function tick() {
  var now = new Date();
  reloadBank(false);
  for (var i = 0; i < quizRooms.length; i++) {
    var room = quizRooms[i];
    // 0) 해가 바뀌었으면 '올해의 퀴즈왕' 발표 + 점수 초기화
    if (needsRollover(room, now, false)) withLock(function () { rollover(room, now, false); });
    var act = getActive(room);
    // 1) 정답자 없이 시간이 지난 문제 → 정답 공개
    if (act && !act.solved && now.getTime() - act.at > CONFIG.REVEAL_AFTER_MIN * 60000) {
      withLock(function () {
        var a = getActive(room);
        if (a && !a.solved) { a.solved = true; setActive(room, a); Api.replyRoom(room, revealText(a)); logReveal(room, a); }
      });
    }
  }
  // 2) 출제 시각이면 출제
  var slot = currentSlot(now);
  if (slot && String(DataBase.getDataBase(DB.POSTED)) !== slot) {
    withLock(function () {
      if (String(DataBase.getDataBase(DB.POSTED)) === slot) return;
      DataBase.setDataBase(DB.POSTED, slot);
      for (var r = 0; r < quizRooms.length; r++) { postQuiz(quizRooms[r]); java.lang.Thread.sleep(1500); }
    });
  }
}

// 지금이 출제 구간이면 "날짜-시" 키 반환
function currentSlot(now) {
  if (CONFIG.WEEKDAYS_ONLY && (now.getDay() === 0 || now.getDay() === 6)) return null;
  if (CONFIG.QUIZ_HOURS.indexOf(now.getHours()) === -1) return null;
  if (now.getMinutes() >= CONFIG.POST_WINDOW_MIN) return null;
  return ymd(now) + "-" + pad(now.getHours());
}

function postQuiz(room) {
  var prev = getActive(room);
  if (prev && !prev.solved) {
    prev.solved = true; setActive(room, prev);
    Api.replyRoom(room, revealText(prev)); logReveal(room, prev);
    java.lang.Thread.sleep(1500);
  }
  var q = pickQuiz();
  var no = Number(DataBase.getDataBase(DB.COUNT) || 0) + 1;
  DataBase.setDataBase(DB.COUNT, String(no));
  // 생성형 문제는 다시 만들 수 없으므로 문제 전체를 저장
  setActive(room, { id: q.id, no: no, at: Date.now(), solved: false, tried: [], gq: q.gen ? q : null });
  Api.replyRoom(room, quizText(q, no));
  sheetLog({ action: "posted", id: String(q.id) });
}

// 아직 안 낸 문제 중 무작위 (모두 냈으면 처음부터)
// 문제 선택: 일정 비율은 계산형 자동 생성, 나머지는 문제은행에서
// - 문제은행은 한 바퀴 돌 때까지 중복 없음
// - 바퀴가 바뀌어도 최근 RECENT_NO_REPEAT개는 제외
function pickQuiz() {
  var recent = loadJSON(DB.RECENT, []);
  var q = null;
  if (Math.random() < CONFIG.GEN_RATIO) q = generateQuiz(recent);
  if (!q) {
    var bank = allQuizzes();
    var used = loadJSON(DB.USED, []);
    var pool = filterPool(bank, function (x) { return used.indexOf(String(x.id)) === -1 && recent.indexOf(String(x.id)) === -1; });
    if (!pool.length) {
      used = [];
      pool = filterPool(bank, function (x) { return recent.indexOf(String(x.id)) === -1; });
      if (!pool.length) pool = bank.slice();
    }
    q = mat(pool[Math.floor(Math.random() * pool.length)]);
    used.push(String(q.id));
    saveJSON(DB.USED, used);
  }
  recent.push(String(q.gen ? q.genKey : q.id));
  while (recent.length > CONFIG.RECENT_NO_REPEAT) recent.shift();
  saveJSON(DB.RECENT, recent);
  return q;
}
function filterPool(arr, fn) { var o = []; for (var i = 0; i < arr.length; i++) if (fn(arr[i])) o.push(arr[i]); return o; }

/* =========================================================
 * 메시지 처리
 * ========================================================= */
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName, threadId) {
  try {
    room = String(room); sender = String(sender);
    var text = String(msg).trim();
    if (!text) return;
    kick();   // 절전으로 정각을 놓쳤으면 지금 따라잡기

    if (text.charAt(0) === "/") { command(room, text, sender, replier); return; }
    if (quizRooms.indexOf(room) === -1) return;

    var act = getActive(room);
    if (!act || act.solved) return;
    var q = quizOf(act);
    if (!q) return;

    var res = judge(q, text);
    if (res === null) return;          // 답 시도로 보기 어려운 메시지 → 무시

    withLock(function () {
      var a = getActive(room);
      if (!a || a.solved || a.id !== q.id) return;
      if (q.type === "ox") {
        if (a.tried.indexOf(sender) !== -1) return;     // O/X는 1인 1회
        a.tried.push(sender);
        setActive(room, a);
        if (!res) { replier.reply("❌ 땡! " + sender + "님은 이번 문제 기회를 다 썼어요."); return; }
      } else if (!res) {
        return;                                          // 오답은 조용히 무시
      }
      a.solved = true;
      a.winner = sender;
      setActive(room, a);
      var total = addScore(room, sender, CONFIG.POINTS);
      sheetLog({ action: "log", result: "정답", room: room, no: a.no, id: String(q.id), question: q.q,
        winner: sender, answer: text, points: CONFIG.POINTS });
      replier.reply(
        "⭕ 정답! " + q.ok + "\n" +
        "🏅 " + sender + " +" + CONFIG.POINTS + "점 (누적 " + total + "점)\n\n" +
        "📖 해설\n" + q.exp + "\n" + q.law
      );
    });
  } catch (e) {
    logError("응답", e);
  }
}

function command(room, text, sender, replier) {
  var parts = text.split(/\s+/);
  var cmd = parts[0];
  var act, q;

  if (cmd === "/퀴즈") {                     // 현재 문제 다시 보기
    act = getActive(room);
    if (!act || act.solved) { replier.reply("지금 풀 문제가 없어요. 다음 정각에 출제됩니다!"); return; }
    replier.reply(quizText(quizOf(act), act.no));
  } else if (cmd === "/힌트") {
    act = getActive(room);
    if (!act || act.solved) return;
    replier.reply("💡 힌트: " + quizOf(act).hint);
  } else if (cmd === "/퀴즈랭킹") {
    replier.reply(rankingText(room));
  } else if (cmd === "/정답기록") {
    var logs = loadJSON(DB.LOG, []), lines = [];
    for (var li = logs.length - 1; li >= 0 && lines.length < 10; li--) {
      if (logs[li][1] !== room) continue;
      var L = logs[li];
      lines.push("#" + L[2] + " " + L[0].substring(5) + " " + (L[5] === "정답" ? "⭕ " + L[6] + " — \"" + String(L[7]).substring(0, 30) + "\"" : "⏰ 정답자 없음"));
    }
    replier.reply(lines.length ? "📒 최근 정답 기록\n" + lines.join("\n") : "아직 기록이 없어요.");
  } else if (cmd === "/명예의전당") {
    replier.reply(hallText(room));
  } else if (cmd === "/내점수") {
    var s = loadJSON(DB.SCORE + room, {});
    replier.reply(sender + "님 점수: " + (s[sender] || 0) + "점");
  } else if (!isAdmin(sender)) {
    return;
  } else if (cmd === "/퀴즈등록") {
    if (quizRooms.indexOf(room) === -1) { quizRooms.push(room); saveJSON(DB.ROOMS, quizRooms); }
    replier.reply("📝 인사퀴즈 방으로 등록했습니다. " + (CONFIG.WEEKDAYS_ONLY ? "평일 " : "매일 ") +
      CONFIG.QUIZ_HOURS[0] + "시~" + CONFIG.QUIZ_HOURS[CONFIG.QUIZ_HOURS.length - 1] + "시 매시 정각에 출제합니다.");
  } else if (cmd === "/퀴즈해제") {
    var i = quizRooms.indexOf(room);
    if (i !== -1) { quizRooms.splice(i, 1); saveJSON(DB.ROOMS, quizRooms); }
    replier.reply("인사퀴즈 출제를 해제했습니다.");
  } else if (cmd === "/퀴즈출제") {            // 지금 바로 한 문제
    withLock(function () { postQuiz(room); });
  } else if (cmd === "/정답공개") {
    withLock(function () {
      var a = getActive(room);
      if (!a || a.solved) { replier.reply("공개할 문제가 없습니다."); return; }
      a.solved = true; setActive(room, a); replier.reply(revealText(a)); logReveal(room, a);
    });
  } else if (cmd === "/퀴즈상태") {
    act = getActive(room);
    replier.reply(
      "등록: " + (quizRooms.indexOf(room) !== -1 ? "O" : "X") + " (전체 " + quizRooms.length + "개 방)\n" +
      "문제 은행: " + allQuizzes().length + "문제 (" + (sheetBank ? "온라인, 업데이트 " + (DataBase.getDataBase(DB.BANK_VER) || "-") : "기본 내장") + ") / 이번 회차 출제 " + loadJSON(DB.USED, []).length + "문제\n" +
      "계산형 비율: " + Math.round(CONFIG.GEN_RATIO * 100) + "% · 최근 " + CONFIG.RECENT_NO_REPEAT + "문제 중복 제외\n" +
      "현재 문제: " + (act ? "#" + act.no + (act.solved ? " (종료)" : " (진행 중)") : "없음") + "\n" +
      "마지막 출제 슬롯: " + (DataBase.getDataBase(DB.POSTED) || "없음") + "\n" +
      "스케줄러: " + (schedulerThread != null && schedulerThread.isAlive() ? "동작 중" : "정지") + " (마지막 확인 " + lastTick + ")"
    );
  } else if (cmd === "/퀴즈새로고침") {
    var n = reloadBank(true);
    replier.reply(n >= 0 ? "📚 온라인 문제은행에서 " + n + "문제를 불러왔습니다. (업데이트 " + (DataBase.getDataBase(DB.BANK_VER) || "-") + ")"
      : "⚠️ 문제은행을 불러오지 못했습니다. 기존 문제로 계속 출제합니다. (" + (DataBase.getDataBase(DB.BANK_AT + "/err") || "") + ")");
  } else if (cmd === "/퀴즈기록저장") {
    try { var cnt = exportStats(); replier.reply("💾 " + CONFIG.LOG_DIR + "/quiz_stats.csv 에 " + cnt + "문제 통계를 저장했습니다.\n(정답 이력은 같은 폴더 quiz_log.csv)"); }
    catch (e) { replier.reply("⚠️ 저장 실패: " + e); }
  } else if (cmd === "/퀴즈점수초기화") {
    saveJSON(DB.SCORE + room, {});
    replier.reply("이 방의 퀴즈 점수를 초기화했습니다.");
  }
}

/* =========================================================
 * 채점
 *  반환: true(정답) / false(오답) / null(답 시도로 보지 않음)
 * ========================================================= */
function judge(q, text) {
  var t = norm(text);
  if (q.type === "ox") {
    t = t.replace(/(입니다|이에요|예요|요|임|!)+$/, "");   // "X요", "O입니다" 허용
    if (!t || t.length > 6) return null;
    var O = ["o", "오", "ㅇ", "맞다", "맞아", "맞음", "맞습니다", "yes", "참", "⭕", "동그라미"];
    var X = ["x", "엑스", "ㄴ", "틀리다", "틀려", "틀림", "틀립니다", "아니다", "아니오", "no", "거짓", "❌"];
    if (O.indexOf(t) !== -1) return q.a === "O";
    if (X.indexOf(t) !== -1) return q.a === "X";
    return null;
  }
  if (q.type === "num") {
    if (t.length > 30) return null;
    if (q.alt) for (var k = 0; k < q.alt.length; k++) if (t.indexOf(norm(q.alt[k])) !== -1) return true;
    // 숫자는 원문에서 추출 (쉼표·소수점·'만/천/억' 단위 해석)
    var nums = parseNums(text);
    if (!nums.length || nums.length > 3) return null;
    var tol = q.tol || 0;
    for (var i = 0; i < nums.length; i++) {
      for (var j = 0; j < q.a.length; j++) {
        if (Math.abs(nums[i] - q.a[j]) <= Math.abs(q.a[j]) * tol + 1e-9) return true;
      }
    }
    return false;
  }
  // kw: 모든 그룹 충족 + 금지어 없음
  if (t.length < 2 || t.length > 150) return null;
  if (q.reject) for (var r = 0; r < q.reject.length; r++) if (t.indexOf(norm(q.reject[r])) !== -1) return false;
  for (var g = 0; g < q.g.length; g++) {
    var hit = false;
    for (var w = 0; w < q.g[g].length; w++) if (t.indexOf(norm(q.g[g][w])) !== -1) { hit = true; break; }
    if (!hit) return false;
  }
  return true;
}

function norm(s) { return String(s).toLowerCase().replace(/[\s.,!?~'"“”‘’()\[\]]/g, ""); }

/* =========================================================
 * 문구
 * ========================================================= */
function quizText(q, no) {
  var how = q.type === "ox" ? "O 또는 X로 답하세요 (1인 1회)" :
            q.type === "num" ? "숫자로 답하세요" : "자유롭게 문장으로 답하세요";
  return "📝 슈슈봇 인사퀴즈 #" + no + " [" + q.cat + "·" + q.lv + "]\n\n" +
    q.q + "\n\n" +
    "✏️ " + how + "\n" +
    "🏅 가장 먼저 맞히면 +" + CONFIG.POINTS + "점 · 힌트: /힌트";
}
function revealText(a) {
  var q = quizOf(a);
  return "⏰ 퀴즈 #" + a.no + " 정답 공개 (정답자 없음)\n" +
    "정답: " + q.ok + "\n\n📖 해설\n" + q.exp + "\n" + q.law;
}
/* =========================================================
 * 온라인 문제은행 (GitHub)
 * ========================================================= */
var sheetBank = loadJSON(DB.BANK, null);   // 마지막으로 받은 온라인 문제 (오프라인 대비 캐시)

// 온라인 문제 + 연도 자동 갱신 문제(dyn). 온라인을 못 받으면 기본 내장 문제
function allQuizzes() {
  if (!sheetBank || !sheetBank.length) return QUIZ;
  var out = sheetBank.slice(), ids = {};
  for (var i = 0; i < out.length; i++) ids[String(out[i].id)] = true;
  for (var j = 0; j < QUIZ.length; j++) {
    if (QUIZ[j].dyn) {
      // 같은 id가 있으면 dyn 버전으로 교체 (연도별 최저임금 등)
      if (ids[String(QUIZ[j].id)]) out = filterPool(out, function (x) { return String(x.id) !== String(QUIZ[j].id); });
      out.push(QUIZ[j]);
    }
  }
  return out;
}

// 반환: 불러온 문제 수, 실패 시 -1, 건너뜀 -2
function reloadBank(force) {
  if (!CONFIG.BANK_URL) return -2;
  var last = Number(DataBase.getDataBase(DB.BANK_AT) || 0);
  if (!force && Date.now() - last < CONFIG.BANK_RELOAD_MIN * 60000) return -2;
  DataBase.setDataBase(DB.BANK_AT, String(Date.now()));    // 실패해도 주기 동안은 재시도 안 함
  try {
    var body = String(org.jsoup.Jsoup.connect(CONFIG.BANK_URL + "?t=" + Date.now())
      .ignoreContentType(true).followRedirects(true).timeout(20000).maxBodySize(0).execute().body());
    var res = JSON.parse(body);
    var list = [];
    for (var i = 0; i < res.rows.length; i++) {
      var r = res.rows[i];
      if (String(r.use || "Y").toUpperCase() === "N") continue;
      var q = rowToQuiz(r);
      if (q) list.push(q);
    }
    if (!list.length) throw new Error("사용 가능한 문제 0개");
    sheetBank = list;
    saveJSON(DB.BANK, list);
    DataBase.setDataBase(DB.BANK_VER, String(res.updated || ""));
    return list.length;
  } catch (e) {
    DataBase.setDataBase(DB.BANK_AT + "/err", String(e).substring(0, 120));
    logError("문제은행 로드", e);
    return -1;
  }
}

// 문제은행 한 행 → 문제 객체 (형식이 잘못된 행은 null로 건너뜀)
function rowToQuiz(r) {
  var type = String(r.type || "").trim().toLowerCase();
  var ans = String(r.answer || "").trim();
  if (!r.id || !r.q || !ans || ["num", "ox", "kw"].indexOf(type) === -1) return null;
  var q = {
    id: String(r.id).trim(), cat: String(r.cat || "인사"), lv: String(r.lv || "보통"), type: type,
    q: String(r.q), hint: String(r.hint || "힌트가 없는 문제예요!"),
    ok: String(r.ok || ans), exp: String(r.exp || ""), law: String(r.law || "")
  };
  if (type === "num") {
    q.a = [];
    var parts = ans.split("|");
    for (var i = 0; i < parts.length; i++) { var n = parseFloat(parts[i].replace(/,/g, "")); if (!isNaN(n)) q.a.push(n); }
    if (!q.a.length) return null;
    if (r.tol) q.tol = parseFloat(r.tol) || 0;
  } else if (type === "ox") {
    q.a = ans.toUpperCase().indexOf("X") !== -1 ? "X" : "O";
  } else {
    q.g = [];
    var groups = ans.split(";");
    for (var g = 0; g < groups.length; g++) {
      var words = splitList(groups[g]);
      if (words.length) q.g.push(words);
    }
    if (!q.g.length) return null;
  }
  if (r.alt) q.alt = splitList(r.alt);
  if (r.reject) q.reject = splitList(r.reject);
  return q;
}
function splitList(s) {
  var a = String(s).split("|"), o = [];
  for (var i = 0; i < a.length; i++) { var w = a[i].trim(); if (w) o.push(w); }
  return o;
}

/* =========================================================
 * 정답 기록 (폰에 저장)
 *  - quiz_log.csv  : 출제·정답 이력 (엑셀로 열기)
 *  - 앱 DB         : 최근 기록(/정답기록), 문제별 통계(출제수·정답수·최근 정답자·답변)
 * ========================================================= */
function sheetLog(obj) {
  try {
    obj.at = stamp(new Date());
    var stats = loadJSON(DB.STATS, {});
    var st = stats[obj.id] || { posted: 0, solved: 0, lastWinner: "", lastAnswer: "", lastAt: "" };
    if (obj.action === "posted") {
      st.posted++;
    } else {
      if (obj.result === "정답") { st.solved++; st.lastWinner = obj.winner; st.lastAnswer = obj.answer; st.lastAt = obj.at; }
      var logs = loadJSON(DB.LOG, []);
      logs.push([obj.at, obj.room, obj.no, obj.id, obj.question, obj.result, obj.winner, obj.answer, obj.points]);
      while (logs.length > CONFIG.LOG_KEEP) logs.shift();
      saveJSON(DB.LOG, logs);
      appendCsv("quiz_log.csv", ["일시", "방", "회차", "문제ID", "문제", "결과", "정답자", "정답자 답변", "점수"],
        [obj.at, obj.room, obj.no, obj.id, obj.question, obj.result, obj.winner, obj.answer, obj.points]);
    }
    if (String(obj.id).indexOf("G-") !== 0) { stats[obj.id] = st; saveJSON(DB.STATS, stats); }
  } catch (e) { logError("기록", e); }
}
function logReveal(room, a) {
  var q = quizOf(a);
  sheetLog({ action: "log", result: "정답자 없음", room: room, no: a.no, id: String(a.id), question: q ? q.q : "",
    winner: "", answer: "", points: 0 });
}

function csvCell(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function appendCsv(name, header, row) {
  try {
    var dir = new java.io.File(CONFIG.LOG_DIR);
    if (!dir.exists()) dir.mkdirs();
    var f = new java.io.File(dir, name);
    var isNew = !f.exists();
    var w = new java.io.OutputStreamWriter(new java.io.FileOutputStream(f, true), "UTF-8");
    if (isNew) w.write("\uFEFF" + header.map(csvCell).join(",") + "\r\n");   // BOM: 엑셀 한글 깨짐 방지
    w.write(row.map(csvCell).join(",") + "\r\n");
    w.close();
  } catch (e) { logError("CSV 저장", e); }
}
// 문제은행 + 문제별 통계를 quiz_stats.csv로 저장 (덮어쓰기)
function exportStats() {
  var stats = loadJSON(DB.STATS, {}), bank = allQuizzes();
  var lines = [["id", "분야", "난이도", "문제", "출제수", "정답수", "정답률", "최근정답자", "최근정답답변", "최근정답일시"]];
  for (var i = 0; i < bank.length; i++) {
    var q = mat(bank[i]), st = stats[String(q.id)] || { posted: 0, solved: 0 };
    lines.push([q.id, q.cat, q.lv, q.q, st.posted, st.solved,
      st.posted ? Math.round(st.solved / st.posted * 100) + "%" : "", st.lastWinner || "", st.lastAnswer || "", st.lastAt || ""]);
  }
  var dir = new java.io.File(CONFIG.LOG_DIR);
  if (!dir.exists()) dir.mkdirs();
  var w = new java.io.OutputStreamWriter(new java.io.FileOutputStream(new java.io.File(dir, "quiz_stats.csv"), false), "UTF-8");
  w.write("\uFEFF");
  for (var j = 0; j < lines.length; j++) w.write(lines[j].map(csvCell).join(",") + "\r\n");
  w.close();
  return lines.length - 1;
}

/* =========================================================
 * 계산형 문제 자동 생성 (법정 공식 기반)
 * ========================================================= */
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function won(n) { return comma(Math.round(n)) + "원"; }
function curWage() {
  var y = new Date().getFullYear(), best = null;
  for (var k in MIN_WAGE) if (Number(k) <= y && (best === null || Number(k) > best)) best = Number(k);
  if (best === null) for (var k2 in MIN_WAGE) best = Number(k2);
  return { year: best, hour: MIN_WAGE[best].hour };
}

var GENERATORS = {
  annual: function () {
    var n = pickOne([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 17, 20, 21, 23]);
    var d = Math.min(25, 15 + Math.floor((n - 1) / 2));
    return { cat: "휴가", lv: "보통", a: [d], unit: "일",
      q: "매년 80% 이상 출근한 근로자가 근속 만 " + n + "년을 채웠습니다. 이때 새로 발생하는 연차유급휴가는 며칠일까요?",
      hint: "15일 + (최초 1년을 넘는 근속 2년마다 1일), 최대 25일",
      ok: "근속 만 " + n + "년이면 연차 " + d + "일이 발생한다.",
      exp: "계산: 15 + ⌊(" + n + "−1) ÷ 2⌋ = " + (15 + Math.floor((n - 1) / 2)) + (d === 25 && 15 + Math.floor((n - 1) / 2) > 25 ? " → 상한 25일" : "") + "일. 3년 이상 근속부터 2년마다 1일씩 가산되고, 가산휴가를 포함해 25일이 한도입니다.",
      law: "[근로기준법 제60조제1항·제4항]" };
  },
  underYear: function () {
    var m = pickOne([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    return { cat: "휴가", lv: "쉬움", a: [m], unit: "일",
      q: "입사 후 " + m + "개월 동안 매달 개근한 신입사원(입사 1년 미만)에게 지금까지 발생한 연차는 총 며칠일까요?",
      hint: "1개월 개근마다 1일",
      ok: "1개월 개근마다 1일씩, " + m + "개월이면 " + m + "일이 발생한다.",
      exp: "입사 1년 미만 기간에는 최대 11일까지 발생하고, 1년을 채우면 별도로 15일이 생깁니다.",
      law: "[근로기준법 제60조제2항]" };
  },
  severance: function () {
    var x = pickOne([80000, 100000, 120000, 150000, 200000]), n = pickOne([1, 2, 3, 4, 5, 6, 7, 8, 10]);
    var v = x * 30 * n;
    return { cat: "퇴직", lv: "보통", a: [v], unit: "원",
      q: "1일 평균임금이 " + won(x) + "인 근로자가 정확히 " + n + "년 근무하고 퇴직했습니다. 법정 퇴직금은 얼마일까요?",
      hint: "1일 평균임금 × 30일 × 근속연수",
      ok: "퇴직금은 1일 평균임금 × 30일 × " + n + "년 = " + won(v) + "이다.",
      exp: "계속근로 1년에 30일분 이상의 평균임금을 지급합니다. 실제로는 재직일수 ÷ 365로 계산합니다. '900만원'처럼 답해도 정답으로 인정합니다.",
      law: "[근로자퇴직급여 보장법 제8조제1항]" };
  },
  weeklyHoliday: function () {
    var w = pickOne([curWage().hour, 11000, 12000, 12500, 15000]), h = pickOne([15, 20, 25, 30, 40]);
    var hrs = h / 5, v = hrs * w;
    return { cat: "임금", lv: "보통", a: [v], unit: "원",
      q: "시급 " + won(w) + ", 주 " + h + "시간(주 5일) 일하는 근로자가 한 주를 개근했습니다. 이번 주 주휴수당은 얼마일까요?",
      hint: "1일 소정근로시간 × 시급",
      ok: "1일 소정근로시간(" + h + "÷5 = " + hrs + "시간) × 시급 = " + won(v) + "을 주휴수당으로 지급한다.",
      exp: "1주 소정근로일을 개근하면 유급휴일이 생깁니다. 4주 평균 주 15시간 미만이면 주휴수당이 없습니다.",
      law: "[근로기준법 제55조제1항, 시행령 제30조제1항]" };
  },
  overtime: function () {
    var w = pickOne([12000, 15000, 18000, 20000, 25000]), h = pickOne([2, 3, 4, 5, 6, 8, 10]);
    var v = w * 1.5 * h;
    return { cat: "임금", lv: "보통", a: [v], unit: "원",
      q: "통상시급 " + won(w) + "인 근로자가 이번 주 연장근로를 " + h + "시간 했습니다(상시 20명 사업장). 이 " + h + "시간에 대해 지급할 금액(가산분 포함)은?",
      hint: "통상시급 × 1.5",
      ok: "통상시급 × 1.5 × " + h + "시간 = " + won(v) + "을 지급한다.",
      exp: "연장근로에는 통상임금의 50% 이상을 가산합니다. 5인 미만 사업장에는 가산 의무가 없습니다.",
      law: "[근로기준법 제56조제1항]" };
  },
  nightOvertime: function () {
    var w = pickOne([12000, 15000, 20000]), h = pickOne([1, 2, 3, 4]);
    var v = w * 2 * h;
    return { cat: "임금", lv: "어려움", a: [v], unit: "원",
      q: "통상시급 " + won(w) + "인 근로자가 오후 10시부터 " + h + "시간 연장근로를 했습니다(상시 20명 사업장). 이 시간은 연장근로이면서 야간근로입니다. 지급할 금액은?",
      hint: "가산이 두 번 붙어요",
      ok: "연장 50%와 야간 50% 가산이 중복되어 통상시급 × 2.0 × " + h + "시간 = " + won(v) + "을 지급한다.",
      exp: "연장근로 가산과 야간근로 가산은 각각 적용됩니다(기본 100% + 연장 50% + 야간 50%).",
      law: "[근로기준법 제56조제1항·제3항]" };
  },
  shutdown: function () {
    var x = pickOne([100000, 120000, 150000, 200000]), d = pickOne([2, 3, 4, 5, 7, 10]);
    var v = x * 0.7 * d;
    return { cat: "임금", lv: "보통", a: [v], unit: "원",
      q: "회사 사정으로 " + d + "일간 휴업했습니다. 근로자의 1일 평균임금이 " + won(x) + "일 때, 지급해야 할 최소 휴업수당은? (평균임금의 70%가 통상임금보다 적다고 가정)",
      hint: "평균임금의 70%",
      ok: "평균임금의 70% × " + d + "일 = " + won(v) + " 이상을 휴업수당으로 지급한다.",
      exp: "평균임금의 70%가 통상임금을 넘으면 통상임금으로 지급할 수 있습니다.",
      law: "[근로기준법 제46조]" };
  },
  monthlyMin: function () {
    var c = curWage(), v = c.hour * 209;
    return { cat: "임금", lv: "보통", a: [v], unit: "원",
      q: c.year + "년 최저임금 기준으로, 주 40시간 일하는 근로자(주휴 포함 월 209시간)의 월 최저임금은 얼마일까요?",
      hint: "시급 " + won(c.hour) + " × 209",
      ok: c.year + "년 월 최저임금은 " + won(c.hour) + " × 209시간 = " + won(v) + "이다.",
      exp: "209시간 = (주 40시간 + 주휴 8시간) × 4.345주(월평균 주수)를 반올림한 값입니다.",
      law: "[최저임금법 제5조, " + c.year + "년 적용 최저임금 고시]" };
  }
};

// 최근에 나온 유형은 피해서 생성
function generateQuiz(recent) {
  var keys = [];
  for (var k in GENERATORS) if (recent.indexOf("G-" + k) === -1) keys.push(k);
  if (!keys.length) return null;
  var key = pickOne(keys);
  var q = GENERATORS[key]();
  q.gen = true;
  q.genKey = "G-" + key;
  q.id = "G-" + key + "-" + Date.now();
  q.type = "num";
  q.q = "🧮 [계산] " + q.q;
  return q;
}

// "4만 8천원" → 48000, "1억 2천만" → 120000000, "9,000,000원" → 9000000
function parseNums(text) {
  var s = String(text).replace(/(\d),(?=\d{3})/g, "$1");
  var re = /(\d+(?:\.\d+)?)\s*(억|천만|백만|만|천)?/g;
  var UNIT = { "억": 1e8, "천만": 1e7, "백만": 1e6, "만": 1e4, "천": 1e3 };
  var out = [], m, prevUnit = null, prevEnd = -1;
  while ((m = re.exec(s)) !== null) {
    var mult = m[2] ? UNIT[m[2]] : 1;
    var v = parseFloat(m[1]) * mult;
    var gap = s.substring(prevEnd, m.index);
    // 앞 숫자가 더 큰 단위였고 사이가 공백뿐이면 합산 (4만 8천)
    if (out.length && prevUnit && mult < prevUnit && /^\s*$/.test(gap)) out[out.length - 1] += v;
    else out.push(v);
    prevUnit = m[2] ? mult : null;
    prevEnd = m.index + m[0].length;
  }
  return out;
}

/* =========================================================
 * 연간 초기화 · 올해의 퀴즈왕
 * ========================================================= */
// 점수가 속한 연도 (처음 실행 시 올해로 기록)
function scoreYear(room, now) {
  var y = DataBase.getDataBase(DB.SCORE_YEAR + room);
  if (y == null || y === "") { DataBase.setDataBase(DB.SCORE_YEAR + room, String(now.getFullYear())); return now.getFullYear(); }
  return Number(y);
}
// force=false: 발표 시각 이후에만 / force=true: 시각 무관 (정답 처리 직전 안전장치)
function needsRollover(room, now, force) {
  if (!CONFIG.YEARLY_RESET) return false;
  if (scoreYear(room, now) >= now.getFullYear()) return false;
  return force || now.getHours() >= CONFIG.ANNOUNCE_HOUR;
}
// 호출하는 쪽에서 lock을 잡은 상태여야 함
function rollover(room, now, force) {
  if (!needsRollover(room, now, force)) return;
  var year = scoreYear(room, now);
  var s = loadJSON(DB.SCORE + room, {});
  var arr = sortScores(s);
  // 명예의 전당 기록
  var hall = loadJSON(DB.HALL + room, []);
  if (arr.length) hall.push({ year: year, top: arr.slice(0, 3) });
  saveJSON(DB.HALL + room, hall);
  // 초기화
  saveJSON(DB.SCORE + room, {});
  DataBase.setDataBase(DB.SCORE_YEAR + room, String(now.getFullYear()));
  // 발표
  var msg;
  if (!arr.length) {
    msg = "🎍 " + now.getFullYear() + "년 새해 복 많이 받으세요!\n" + year + "년엔 퀴즈 정답자가 없었네요. 올해는 첫 퀴즈왕에 도전해 보세요!";
  } else {
    var medal = ["🥇", "🥈", "🥉"], lines = [];
    for (var i = 0; i < arr.length && i < 3; i++) lines.push(medal[i] + " " + arr[i][0] + " — " + arr[i][1] + "점");
    msg = "🏆 " + year + " 올해의 인사퀴즈왕 🏆\n\n" +
      "👑 " + arr[0][0] + "님 (" + arr[0][1] + "점)\n\n" +
      lines.join("\n") + "\n\n" +
      "한 해 동안 퀴즈에 참여해 주신 모든 분께 감사드립니다!\n" +
      "🎍 " + now.getFullYear() + "년 점수는 0점부터 새로 시작합니다.";
  }
  Api.replyRoom(room, msg);
}
function sortScores(s) {
  var arr = [];
  for (var k in s) arr.push([k, s[k]]);
  arr.sort(function (x, y) { return y[1] - x[1]; });
  return arr;
}
function hallText(room) {
  var hall = loadJSON(DB.HALL + room, []);
  if (!hall.length) return "🏛 명예의 전당이 아직 비어 있어요. 첫 퀴즈왕은 연말에 탄생합니다!";
  var lines = [];
  for (var i = hall.length - 1; i >= 0; i--) {
    var h = hall[i];
    lines.push(h.year + "년 👑 " + h.top[0][0] + " (" + h.top[0][1] + "점)" +
      (h.top[1] ? " · 2위 " + h.top[1][0] : "") + (h.top[2] ? " · 3위 " + h.top[2][0] : ""));
  }
  return "🏛 인사퀴즈 명예의 전당\n" + lines.join("\n");
}

function rankingText(room) {
  var s = loadJSON(DB.SCORE + room, {});
  var arr = [];
  for (var k in s) arr.push([k, s[k]]);
  if (!arr.length) return "아직 점수가 없어요. 퀴즈를 맞혀 보세요!";
  arr.sort(function (x, y) { return y[1] - x[1]; });
  var medal = ["🥇", "🥈", "🥉"];
  var lines = [];
  for (var i = 0; i < arr.length && i < 10; i++) lines.push((medal[i] || (i + 1) + ".") + " " + arr[i][0] + " — " + arr[i][1] + "점");
  return "🏆 " + scoreYear(room, new Date()) + " 인사퀴즈 랭킹 TOP" + lines.length + "\n" + lines.join("\n");
}

/* =========================================================
 * 유틸
 * ========================================================= */
function kick() {
  var now = new Date();
  var slot = currentSlot(now);
  if (!slot || String(DataBase.getDataBase(DB.POSTED)) === slot) return;
  new java.lang.Thread(new java.lang.Runnable({ run: function () { try { tick(); } catch (e) { logError("kick", e); } } })).start();
}
function withLock(fn) {
  var spins = 0;
  while (!lock.compareAndSet(false, true)) { java.lang.Thread.sleep(50); if (++spins > 200) return; }
  try { fn(); } finally { lock.set(false); }
}
function findQuiz(id) {
  var bank = allQuizzes();
  for (var i = 0; i < bank.length; i++) if (String(bank[i].id) === String(id)) return mat(bank[i]);
  return null;
}
function quizOf(act) { return act.gq ? act.gq : findQuiz(act.id); }
// 연도에 따라 바뀌는 문제(dyn)를 현재 시점 기준으로 완성
function mat(q) {
  if (!q.dyn) return q;
  var d = q.dyn(new Date()), o = {}, k;
  for (k in q) o[k] = q[k];
  for (k in d) o[k] = d[k];
  return o;
}
function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function getActive(room) { return loadJSON(DB.ACTIVE + room, null); }
function setActive(room, a) { saveJSON(DB.ACTIVE + room, a); }
function addScore(room, name, pt) {
  rollover(room, new Date(), true);   // 새해 첫 정답이 발표보다 먼저 나와도 작년 점수와 섞이지 않게
  var s = loadJSON(DB.SCORE + room, {});
  s[name] = (s[name] || 0) + pt;
  saveJSON(DB.SCORE + room, s);
  return s[name];
}
function isAdmin(s) { return !CONFIG.ADMINS.length || CONFIG.ADMINS.indexOf(s) !== -1; }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function stamp(d) { return ymd(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
function loadJSON(key, def) {
  var raw = DataBase.getDataBase(key);
  if (raw == null || raw === "") return def;
  try { return JSON.parse(String(raw)); } catch (e) { return def; }
}
function saveJSON(key, v) { DataBase.setDataBase(key, JSON.stringify(v)); }
function logError(where, e) { if (typeof Log !== "undefined") Log.e(scriptName + " [" + where + "] " + e); }

startScheduler();
