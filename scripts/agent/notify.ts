import { sendToMe } from "../../src/lib/kakao/send";
import { kakaoConfig, loadToken } from "../../src/lib/kakao/token";
import { type Notifier, telegramNotifier } from "./telegram";

/**
 * 설정된 채널 모두로 보낸다: 텔레그램(TELEGRAM_BOT_TOKEN·CHAT_ID)과 카카오톡(KAKAO_REST_API_KEY + 연결된 토큰).
 * 둘 다 없으면 콘솔에만 찍는다. 한 채널이 실패해도 다른 채널은 보내고, 마지막에 오류를 모아 던진다.
 */
export function buildNotifier(env = process.env): Notifier & { channels: string[] } {
  const channels: { name: string; send: (text: string, link?: string) => Promise<void> }[] = [];
  const tg = env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = env.TELEGRAM_CHAT_ID?.trim();
  if (tg && chat) {
    const t = telegramNotifier(tg, chat);
    channels.push({ name: "telegram", send: (text) => t.send(text) });
  }
  const kakao = kakaoConfig(env);
  if (kakao && loadToken()) channels.push({ name: "kakao", send: (text, link) => sendToMe(kakao, text, link) });

  if (!channels.length) {
    const t = telegramNotifier();
    return { channels: [], send: (text) => t.send(text) };
  }
  return {
    channels: channels.map((c) => c.name),
    async send(text: string) {
      const link = text.match(/href="([^"]+pick\/result[^"]*)"/)?.[1];
      const errors: string[] = [];
      for (const c of channels) {
        try {
          await c.send(text, link);
        } catch (e) {
          errors.push(`${c.name}: ${(e as Error).message}`);
        }
      }
      if (errors.length === channels.length) throw new Error(errors.join(" / "));
      if (errors.length) console.warn("일부 채널 전송 실패:", errors.join(" / "));
    },
  };
}
