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
  createTripHref,
  tripDefaults,
  type TripInput,
} from "@/lib/today-bus/mock-plans";

const inputClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-4 text-[21px] font-bold text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-green-deep)]";
const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

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
    destination: tripDefaults.destination,
    origin: tripDefaults.origin,
  });
  const [originCandidates, setOriginCandidates] = useState<
    KakaoPlaceCandidate[]
  >([]);
  const [originSearchStatus, setOriginSearchStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >(kakaoMapAppKey ? "idle" : "unavailable");
  const [originTouched, setOriginTouched] = useState(false);

  function updateInput(name: keyof TripInput, value: string) {
    setInput((current) => ({ ...current, [name]: value }));
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
