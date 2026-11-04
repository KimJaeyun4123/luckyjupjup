import type { LedgerItem } from "./client";

/** /api/dh/me 응답 */
export interface DhMe {
  userId: string;
  balance: number;
  ledger: LedgerItem[];
  /** 조회 구간 (YYYY-MM-DD) */
  from: string;
  to: string;
}
export type { LedgerItem };
