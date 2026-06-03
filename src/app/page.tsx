import { IconBusBig } from "@/components/icons/doodle-icons";
import { SearchForm } from "@/components/today-bus/search-form";
import { obColors } from "@/lib/design/tokens";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--ob-bg)] px-4 py-7 text-[var(--ob-text)] sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-[2.6px] bg-[var(--ob-card)]"
            style={{ borderColor: obColors.inkSoft }}
          >
            <IconBusBig size={52} stroke={obColors.ink} />
          </div>
          <h1 className="text-[27px] font-black leading-tight text-[var(--ob-text)]">
            구미역 기차 언제 타지?
          </h1>
        </header>

        <SearchForm />
      </div>
    </main>
  );
}
