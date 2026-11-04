/** 텔레그램 봇으로 메시지를 보낸다. 토큰·채팅 ID 가 없으면 콘솔에만 찍는다 */
export interface Notifier {
  send(text: string): Promise<void>;
}

export const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function telegramNotifier(token?: string, chatId?: string): Notifier {
  if (!token || !chatId) {
    return {
      async send(text) {
        console.log("[알림(텔레그램 미설정)]\n" + text.replace(/<[^>]+>/g, ""));
      },
    };
  }
  return {
    async send(text) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (!res.ok) throw new Error(`텔레그램 전송 실패: HTTP ${res.status} ${await res.text()}`);
    },
  };
}
