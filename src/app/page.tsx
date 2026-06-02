import { IconBusBig, IconClock } from "@/components/icons/doodle-icons";
import { SearchForm } from "@/components/today-bus/search-form";
import { Badge } from "@/components/ui/badge";
import { obColors } from "@/lib/design/tokens";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--ob-bg)] px-4 py-7 text-[var(--ob-text)] sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-[2.6px] bg-[var(--ob-card)]"
              style={{ borderColor: obColors.inkSoft }}
            >
              <IconBusBig size={52} stroke={obColors.ink} />
            </div>
            <div>
              <p className="text-[17px] font-black text-[var(--ob-green-deep)]">
                오늘버스
              </p>
              <p className="text-[15px] font-bold text-[var(--ob-text2)]">
                지방 생활형 출발 판단 도우미
              </p>
            </div>
          </div>
          <Badge tone="mint">MVP</Badge>
        </header>

        <section className="flex flex-col gap-4">
          <p className="text-[20px] font-black leading-snug text-[var(--ob-text)]">
            버스 시간이 아니라, 오늘 나가야 할 시간을 알려드릴게요.
          </p>
          <div>
            <div className="mb-3 flex items-center gap-2 text-[17px] font-bold text-[var(--ob-text2)]">
              <IconClock size={23} stroke={obColors.ink} />
              핵심 질문
            </div>
            <h1 className="text-[41px] font-black leading-[1.05] text-[var(--ob-text)] sm:text-[56px]">
              구미역까지 몇 시에 나가야 할까요?
            </h1>
          </div>
        </section>

        <SearchForm />
      </div>
    </main>
  );
}
