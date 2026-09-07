"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // 아이콘 전환은 html의 .dark 클래스에 맡긴다. 이렇게 하면 마운트 여부를 state로
  // 추적할 필요가 없어 하이드레이션 불일치도, 불필요한 리렌더도 생기지 않는다.
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
      <span className="sr-only">테마 전환</span>
    </Button>
  );
}
