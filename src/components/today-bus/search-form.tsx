"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBus,
  IconClock,
  IconPin,
  IconSpark,
} from "@/components/icons/doodle-icons";
import { SketchButton } from "@/components/ui/sketch-button";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import {
  createTripHref,
  tripDefaults,
  type TripInput,
} from "@/lib/today-bus/mock-plans";

const inputClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-4 text-[21px] font-bold text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-green-deep)]";

export function SearchForm() {
  const router = useRouter();
  const [input, setInput] = useState<TripInput>({
    arrival: tripDefaults.arrival,
    buffer: tripDefaults.buffer,
    destination: tripDefaults.destination,
    origin: tripDefaults.origin,
  });

  function updateInput(name: keyof TripInput, value: string) {
    setInput((current) => ({ ...current, [name]: value }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(createTripHref("/plans", input));
  }

  return (
    <SketchCard accent={obColors.mint} pad={20} radius="r3">
      <form className="flex flex-col gap-5" onSubmit={submitSearch}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[15px] font-bold text-[var(--ob-text2)]">
              <IconPin size={20} stroke={obColors.ink} />
              출발지
            </span>
            <input
              className={inputClass}
              name="origin"
              onChange={(event) => updateInput("origin", event.target.value)}
              value={input.origin}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[15px] font-bold text-[var(--ob-text2)]">
              <IconBus size={20} stroke={obColors.ink} />
              목적지
            </span>
            <input
              className={inputClass}
              name="destination"
              onChange={(event) =>
                updateInput("destination", event.target.value)
              }
              value={input.destination}
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[15px] font-bold text-[var(--ob-text2)]">
            <IconClock size={20} stroke={obColors.ink} />
            도착 희망 시간
          </span>
          <input
            className={inputClass}
            name="arrival"
            onChange={(event) => updateInput("arrival", event.target.value)}
            value={input.arrival}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-bold text-[var(--ob-text2)]">
            안전 여유 시간
          </span>
          <div className="grid grid-cols-3 gap-2">
            {tripDefaults.safetyBuffers.map((buffer) => {
              const selected = input.buffer === buffer;

              return (
                <button
                  aria-pressed={selected}
                  className="ob-pill ob-tap h-12 border-2 text-[17px] font-bold"
                  key={buffer}
                  onClick={() => updateInput("buffer", buffer)}
                  style={{
                    background: selected ? obColors.yellow : "#FFFFFF",
                    borderColor: selected ? "#D9B93B" : obColors.inkSoft,
                    color: selected ? obColors.text : obColors.text2,
                  }}
                  type="button"
                >
                  {buffer}분
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-bold text-[var(--ob-text2)]">
            자주 가는 목적지
          </span>
          <div className="flex flex-wrap gap-2">
            {tripDefaults.favoriteDestinations.map((destination) => (
              <button
                className="ob-pill ob-tap border-2 bg-white px-4 py-2 text-[16px] font-bold text-[var(--ob-text)]"
                key={destination}
                onClick={() => updateInput("destination", destination)}
                style={{ borderColor: obColors.inkSoft }}
                type="button"
              >
                {destination}
              </button>
            ))}
          </div>
        </div>

        <SketchButton big type="submit">
          <IconSpark size={25} stroke="#1d3a29" />
          출발 타임라인 보기
        </SketchButton>
      </form>
    </SketchCard>
  );
}
