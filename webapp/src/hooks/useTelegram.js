import { useCallback, useEffect, useState } from "react";
import TelegramWebApp from "@twa-dev/sdk";

/*
  Telegram WebApp (TWA) bilan ishlash uchun umumiy hook:
  - ready() / expand() chaqiradi,
  - initData, foydalanuvchi va tema ma'lumotlarini beradi,
  - haptic (tebranish) yordamchisi.
*/

// Telegram themeParams -> loyihaning CSS o'zgaruvchilariga xaritalash.
const THEME_VAR_MAP = {
  "--tg-base": "bg_color",
  "--tg-deep": "secondary_bg_color",
  "--tg-card": "section_bg_color",
  "--tg-surface": "secondary_bg_color",
  "--tg-text": "text_color",
  "--tg-muted": "hint_color",
  "--tg-accent": "accent_text_color",
  "--tg-border": "separator_color",
};

function applyTelegramTheme() {
  const root = document.documentElement;
  const theme = TelegramWebApp.themeParams || {};

  for (const [cssVar, key] of Object.entries(THEME_VAR_MAP)) {
    const value = theme[key];
    if (value) root.style.setProperty(cssVar, value);
  }

  // Telegram'ning quyuq rejimi aniqlangani bo'lsa, `dark` klassini qo'yamiz.
  const scheme = TelegramWebApp.colorScheme;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", scheme === "dark" || (!scheme && prefersDark));
}

export function useTelegram() {
  const [colorScheme, setColorScheme] = useState(
    TelegramWebApp.colorScheme || "light"
  );
  const [user] = useState(() => TelegramWebApp.initDataUnsafe?.user || null);
  const [initData] = useState(() => TelegramWebApp.initData || "");
  const [isInTelegram] = useState(() => Boolean(TelegramWebApp.initData));

  useEffect(() => {
    try {
      // 1. WebApp tayyorligini aytamiz va to'liq ekranga ochamiz.
      TelegramWebApp.ready();
      TelegramWebApp.expand();

      // Tema ranglarini boshlang'ich qo'llaymiz.
      applyTelegramTheme();

      // Telegram ichida dinamik theme o'zgarishlariga moslashamiz.
      const onTheme = () => applyTelegramTheme();
      const onScheme = () => setColorScheme(TelegramWebApp.colorScheme);
      TelegramWebApp.onEvent("themeChanged", onTheme);
      TelegramWebApp.onEvent("colorSchemeChanged", onScheme);

      return () => {
        TelegramWebApp.offEvent("themeChanged", onTheme);
        TelegramWebApp.offEvent("colorSchemeChanged", onScheme);
      };
    } catch {
      // Brauzerda (dev rejimda) Telegram SDK bo'lmasa ham app ishlayveradi.
      applyTelegramTheme();
    }
  }, []);

  // Sensatsiya (tebranish) — tugmalar bosilganda foydalanuvchi his qilishi uchun.
  const haptic = useCallback((kind = "light") => {
    try {
      if (kind === "success") {
        TelegramWebApp.HapticFeedback.notificationOccurred("success");
      } else if (kind === "error") {
        TelegramWebApp.HapticFeedback.notificationOccurred("error");
      } else {
        TelegramWebApp.HapticFeedback.impactOccurred(kind);
      }
    } catch {
      /* scroll */
    }
  }, []);

  return { initData, user, colorScheme, isInTelegram, haptic };
}