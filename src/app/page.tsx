import Image from "next/image";
import { SearchForm } from "@/components/today-bus/search-form";
import { obColors } from "@/lib/design/tokens";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--ob-bg)] px-4 py-7 text-[var(--ob-text)] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex items-center gap-3">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.6px] bg-[var(--ob-card)] p-2"
            style={{ borderColor: obColors.inkSoft }}
          >
            <Image
              alt="구미역으로 가자 버스 로고"
              className="h-full w-full object-contain grayscale contrast-125"
              height={72}
              priority
              src="/bus-logo.jpg"
              width={82}
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-[31px] font-black leading-tight text-[var(--ob-text)]">
              구미역으로 가자
            </h1>
            <p className="text-[16px] font-bold leading-snug text-[var(--ob-text2)]">
              기차 시간, 버스 도착, 걷는 시간을 합쳐 언제 나갈지 계산합니다.
            </p>
          </div>
        </header>

        <SearchForm />
      </div>
    </main>
  );
}
