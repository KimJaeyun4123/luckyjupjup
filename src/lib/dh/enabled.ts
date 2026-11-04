/** 동행복권 로그인 연동은 로컬·개인 배포에서만 켠다. 공개 배포에서는 메뉴·API 가 모두 사라진다 */
export const DH_ENABLED = process.env.LOTTO_DH_ENABLED === "1";
