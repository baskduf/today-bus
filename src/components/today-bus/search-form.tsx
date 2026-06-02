"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
  createStationArrivalTime,
  createTripHref,
  formatClockOnly,
  normalizeTrainDepartureTime,
  tripDefaults,
  type TripInput,
} from "@/lib/today-bus/mock-plans";

const inputClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-4 text-[21px] font-bold text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-green-deep)]";
const timeSelectClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-3 text-center text-[24px] font-black text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-green-deep)]";
const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
const trainHourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const trainMinuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);
const quickTrainTimes = ["14:10", "16:10", "18:10", "20:10"] as const;

type KakaoPlaceCandidate = {
  addressName: string;
  id: string;
  lat: string;
  lng: string;
  name: string;
  roadAddressName: string;
};

type KakaoPlaceResult = {
  address_name?: string;
  id?: string;
  place_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
};

type KakaoPlacesSearchOptions = {
  radius?: number;
  size?: number;
  x?: number;
  y?: number;
};

type KakaoPlacesSearchStatus = "ERROR" | "OK" | "ZERO_RESULT";

type KakaoPlacesService = {
  keywordSearch: (
    keyword: string,
    callback: (
      results: KakaoPlaceResult[],
      status: KakaoPlacesSearchStatus,
    ) => void,
    options?: KakaoPlacesSearchOptions,
  ) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        services?: {
          Places: new () => KakaoPlacesService;
          Status: Record<KakaoPlacesSearchStatus, KakaoPlacesSearchStatus>;
        };
      };
    };
  }
}

let kakaoLoader: Promise<void> | undefined;

function loadKakaoServices() {
  if (!kakaoMapAppKey) {
    return Promise.reject(new Error("Kakao map app key is not configured"));
  }

  if (window.kakao?.maps.services) return Promise.resolve();
  if (kakaoLoader) return kakaoLoader;

  kakaoLoader = new Promise((resolve, reject) => {
    const resolveWhenReady = () => {
      if (!window.kakao?.maps) {
        reject(new Error("Kakao maps SDK is not available"));
        return;
      }

      window.kakao.maps.load(resolve);
    };
    const existingScript = document.getElementById("today-bus-kakao-map-sdk");

    if (existingScript) {
      existingScript.addEventListener("load", resolveWhenReady);
      existingScript.addEventListener("error", () => {
        reject(new Error("Unable to load Kakao maps SDK"));
      });
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      appkey: kakaoMapAppKey,
      autoload: "false",
      libraries: "services",
    });

    script.id = "today-bus-kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?${params.toString()}`;
    script.async = true;
    script.onload = resolveWhenReady;
    script.onerror = () => {
      reject(new Error("Unable to load Kakao maps SDK"));
    };
    document.head.appendChild(script);
  });

  return kakaoLoader;
}

function normalizePlace(place: KakaoPlaceResult): KakaoPlaceCandidate | undefined {
  if (!place.place_name || !place.x || !place.y) return undefined;

  return {
    addressName: place.address_name ?? "",
    id: place.id ?? `${place.place_name}-${place.x}-${place.y}`,
    lat: place.y,
    lng: place.x,
    name: place.place_name,
    roadAddressName: place.road_address_name ?? "",
  };
}

export function SearchForm() {
  const router = useRouter();
  const searchRequestId = useRef(0);
  const [input, setInput] = useState<TripInput>({
    arrival: tripDefaults.arrival,
    buffer: tripDefaults.buffer,
    origin: tripDefaults.origin,
    trainDeparture: tripDefaults.trainDeparture,
  });
  const [originCandidates, setOriginCandidates] = useState<
    KakaoPlaceCandidate[]
  >([]);
  const [originSearchStatus, setOriginSearchStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >(kakaoMapAppKey ? "idle" : "unavailable");
  const [originTouched, setOriginTouched] = useState(false);
  const trainClock =
    formatClockOnly(input.trainDeparture) ??
    formatClockOnly(tripDefaults.trainDeparture) ??
    "14:10";
  const stationArrivalClock = formatClockOnly(input.arrival) ?? input.arrival;
  const [selectedTrainHour, selectedTrainMinute] = trainClock.split(":");

  function withDerivedArrival(nextInput: TripInput): TripInput {
    return {
      ...nextInput,
      arrival:
        createStationArrivalTime(nextInput.trainDeparture, nextInput.buffer) ??
        nextInput.arrival,
    };
  }

  function updateInput(name: keyof TripInput, value: string) {
    setInput((current) =>
      withDerivedArrival({ ...current, [name]: value }),
    );
  }

  function updateTrainClock(clock: string) {
    const trainDeparture = normalizeTrainDepartureTime(clock);
    if (!trainDeparture) return;

    setInput((current) =>
      withDerivedArrival({ ...current, trainDeparture }),
    );
  }

  function updateTrainClockPart(part: "hour" | "minute", value: string) {
    const hour = part === "hour" ? value : selectedTrainHour;
    const minute = part === "minute" ? value : selectedTrainMinute;

    updateTrainClock(`${hour}:${minute}`);
  }

  function updateOrigin(value: string) {
    setOriginTouched(true);
    setOriginCandidates([]);
    setOriginSearchStatus(
      value.trim().length < 2 ? "idle" : kakaoMapAppKey ? "idle" : "unavailable",
    );
    setInput((current) => ({
      ...current,
      origin: value,
      originAddress: undefined,
      originLat: undefined,
      originLng: undefined,
      originPlaceName: undefined,
      originSource: undefined,
    }));
  }

  function selectOriginCandidate(candidate: KakaoPlaceCandidate) {
    setInput((current) => ({
      ...current,
      origin: candidate.name,
      originAddress: candidate.roadAddressName || candidate.addressName,
      originLat: candidate.lat,
      originLng: candidate.lng,
      originPlaceName: candidate.name,
      originSource: "kakao_keyword",
    }));
    setOriginCandidates([]);
    setOriginSearchStatus("ready");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(createTripHref("/plans", input));
  }

  useEffect(() => {
    const keyword = input.origin.trim();
    const requestId = searchRequestId.current + 1;

    searchRequestId.current = requestId;

    if (
      !originTouched ||
      !kakaoMapAppKey ||
      input.originPlaceName === keyword ||
      keyword.length < 2
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOriginSearchStatus("loading");
      void loadKakaoServices()
        .then(() => {
          const services = window.kakao?.maps.services;
          if (!services) throw new Error("Kakao services library is missing");

          const places = new services.Places();

          places.keywordSearch(
            keyword,
            (results, status) => {
              if (searchRequestId.current !== requestId) return;

              if (status !== services.Status.OK) {
                setOriginCandidates([]);
                setOriginSearchStatus("idle");
                return;
              }

              setOriginCandidates(
                results
                  .map(normalizePlace)
                  .filter(
                    (place): place is KakaoPlaceCandidate =>
                      place !== undefined,
                  ),
              );
              setOriginSearchStatus("ready");
            },
            {
              radius: 20_000,
              size: 5,
              x: 128.429,
              y: 36.096,
            },
          );
        })
        .catch(() => {
          if (searchRequestId.current !== requestId) return;
          setOriginCandidates([]);
          setOriginSearchStatus("unavailable");
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [input.origin, input.originPlaceName, originTouched]);

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
              onChange={(event) => updateOrigin(event.target.value)}
              value={input.origin}
            />
            {originCandidates.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-[18px] border-2 border-dashed border-[var(--ob-ink-soft)] bg-white p-2">
                {originCandidates.map((candidate) => (
                  <button
                    className="ob-tap rounded-[14px] px-3 py-2 text-left"
                    key={candidate.id}
                    onClick={() => selectOriginCandidate(candidate)}
                    type="button"
                  >
                    <span className="block text-[17px] font-black text-[var(--ob-text)]">
                      {candidate.name}
                    </span>
                    <span className="block text-[14px] font-bold text-[var(--ob-text2)]">
                      {candidate.roadAddressName || candidate.addressName}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {input.originPlaceName ? (
              <span className="text-[14px] font-bold text-[var(--ob-green-deep)]">
                {input.originAddress || input.originPlaceName}
              </span>
            ) : originTouched && originSearchStatus === "loading" ? (
              <span className="text-[14px] font-bold text-[var(--ob-text2)]">
                장소 검색 중
              </span>
            ) : originTouched && originSearchStatus === "unavailable" ? (
              <span className="text-[14px] font-bold text-[var(--ob-coral-deep)]">
                장소 검색 비활성
              </span>
            ) : null}
          </label>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[15px] font-bold text-[var(--ob-text2)]">
              <IconClock size={20} stroke={obColors.ink} />
              기차 출발 시간
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select
                aria-label="기차 출발 시"
                className={timeSelectClass}
                onChange={(event) =>
                  updateTrainClockPart("hour", event.target.value)
                }
                value={selectedTrainHour}
              >
                {trainHourOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <span className="text-[24px] font-black text-[var(--ob-text2)]">
                :
              </span>
              <select
                aria-label="기차 출발 분"
                className={timeSelectClass}
                onChange={(event) =>
                  updateTrainClockPart("minute", event.target.value)
                }
                value={selectedTrainMinute}
              >
                {trainMinuteOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {quickTrainTimes.map((clock) => {
                const selected = trainClock === clock;

                return (
                  <button
                    aria-pressed={selected}
                    className="ob-pill ob-tap h-10 border-2 text-[15px] font-bold"
                    key={clock}
                    onClick={() => updateTrainClock(clock)}
                    style={{
                      background: selected ? obColors.mint : "#FFFFFF",
                      borderColor: selected
                        ? obColors.greenDeep
                        : obColors.inkSoft,
                      color: selected ? obColors.text : obColors.text2,
                    }}
                    type="button"
                  >
                    {clock}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border-2 border-dashed border-[var(--ob-ink-soft)] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[15px] font-bold text-[var(--ob-text2)]">
              <IconBus size={20} stroke={obColors.ink} />
              도착역
            </span>
            <span className="text-[21px] font-black text-[var(--ob-text)]">
              구미역
            </span>
          </div>
          <p className="mt-1 text-[14px] font-bold text-[var(--ob-text2)]">
            {stationArrivalClock}까지 역에 도착하는 기준입니다.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-bold text-[var(--ob-text2)]">
            구미역 도착 여유
          </span>
          <div className="grid grid-cols-3 gap-2">
            {tripDefaults.stationBuffers.map((buffer) => {
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

        <SketchButton big type="submit">
          <IconSpark size={25} stroke="#1d3a29" />
          기차 시간 맞춰 나가기
        </SketchButton>
      </form>
    </SketchCard>
  );
}
