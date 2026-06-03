"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconClock,
  IconPin,
} from "@/components/icons/doodle-icons";
import { SketchCard } from "@/components/ui/sketch-card";
import { obColors } from "@/lib/design/tokens";
import {
  createStationArrivalTime,
  createTripHref,
  formatDateOnly,
  formatClockOnly,
  getTodayDateInputValue,
  normalizeTrainDepartureTime,
  tripDefaults,
  type TripInput,
} from "@/lib/today-bus/mock-plans";

const dateInputClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-3 text-center text-[23px] font-black text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-text)]";
const timeSelectClass =
  "h-14 w-full rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white px-3 text-center text-[24px] font-black text-[var(--ob-text)] outline-none transition focus:border-[var(--ob-text)]";
const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
const defaultMapCenter = {
  lat: 36.096,
  lng: 128.429,
};
const trainHourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const trainMinuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

type KakaoServiceStatus = "ERROR" | "OK" | "ZERO_RESULT";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  setCenter: (latLng: KakaoLatLng) => void;
};

type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (latLng: KakaoLatLng) => void;
};

type KakaoMapMouseEvent = {
  latLng: KakaoLatLng;
};

type KakaoAddressResult = {
  address?: {
    address_name?: string;
  };
  road_address?: {
    address_name?: string;
  };
};

type KakaoGeocoder = {
  coord2Address: (
    lng: number,
    lat: number,
    callback: (
      results: KakaoAddressResult[],
      status: KakaoServiceStatus,
    ) => void,
  ) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: {
        event: {
          addListener: (
            target: KakaoMap,
            type: "click",
            handler: (event: KakaoMapMouseEvent) => void,
          ) => void;
        };
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number },
        ) => KakaoMap;
        Marker: new (options: {
          map?: KakaoMap;
          position: KakaoLatLng;
        }) => KakaoMarker;
        services?: {
          Geocoder?: new () => KakaoGeocoder;
          Status: Record<KakaoServiceStatus, KakaoServiceStatus>;
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

function createInitialTripInput() {
  const normalizedTrainDeparture =
    normalizeTrainDepartureTime(tripDefaults.trainDeparture) ??
    tripDefaults.trainDeparture;
  const trainDate =
    formatDateOnly(normalizedTrainDeparture) ?? getTodayDateInputValue();
  const trainClock =
    formatClockOnly(normalizedTrainDeparture) ??
    formatClockOnly(tripDefaults.trainDeparture) ??
    "14:10";
  const trainDeparture =
    normalizeTrainDepartureTime(`${trainDate} ${trainClock}`) ??
    normalizedTrainDeparture;

  return {
    arrival:
      createStationArrivalTime(trainDeparture, tripDefaults.buffer) ??
      tripDefaults.arrival,
    buffer: tripDefaults.buffer,
    origin: "",
    trainDeparture,
  } satisfies TripInput;
}

export function SearchForm() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const [input, setInput] = useState<TripInput>(() => createInitialTripInput());
  const [mapStatus, setMapStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >(kakaoMapAppKey ? "loading" : "unavailable");
  const trainClock =
    formatClockOnly(input.trainDeparture) ??
    formatClockOnly(tripDefaults.trainDeparture) ??
    "14:10";
  const trainDate =
    formatDateOnly(input.trainDeparture) ?? getTodayDateInputValue();
  const [selectedTrainHour, selectedTrainMinute] = trainClock.split(":");
  const selectedCoordinate =
    input.originLat && input.originLng
      ? `${Number(input.originLat).toFixed(5)}, ${Number(input.originLng).toFixed(
          5,
        )}`
      : undefined;
  const canSubmit = Boolean(input.originLat && input.originLng);

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
    const trainDeparture = normalizeTrainDepartureTime(`${trainDate} ${clock}`);
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

  function updateTrainDate(date: string) {
    const trainDeparture = normalizeTrainDepartureTime(`${date} ${trainClock}`);
    if (!trainDeparture) return;

    setInput((current) =>
      withDerivedArrival({ ...current, trainDeparture }),
    );
  }

  function updateOriginFromMap(lat: number, lng: number, address?: string) {
    const label = address || "지도에서 선택한 위치";

    setInput((current) => ({
      ...current,
      origin: label,
      originAddress: address,
      originLat: lat.toFixed(6),
      originLng: lng.toFixed(6),
      originPlaceName: label,
      originSource: "manual",
    }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    router.push(createTripHref("/plans", input));
  }

  useEffect(() => {
    if (!kakaoMapAppKey || !mapContainerRef.current) return;

    let cancelled = false;

    setMapStatus("loading");
    void loadKakaoServices()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        const maps = window.kakao?.maps;
        if (!maps) throw new Error("Kakao maps SDK is not available");

        const center = new maps.LatLng(
          defaultMapCenter.lat,
          defaultMapCenter.lng,
        );
        const map = new maps.Map(mapContainerRef.current, {
          center,
          level: 4,
        });
        const marker = new maps.Marker({
          map,
          position: center,
        });

        mapRef.current = map;
        markerRef.current = marker;
        maps.event.addListener(map, "click", (event) => {
          const lat = event.latLng.getLat();
          const lng = event.latLng.getLng();
          const geocoder = maps.services?.Geocoder
            ? new maps.services.Geocoder()
            : undefined;

          updateOriginFromMap(lat, lng);

          geocoder?.coord2Address(lng, lat, (results, status) => {
            const address =
              status === maps.services?.Status.OK
                ? results[0]?.road_address?.address_name ||
                  results[0]?.address?.address_name
                : undefined;

            if (address) updateOriginFromMap(lat, lng, address);
          });
        });
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("unavailable");
      });

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
    };
  }, []);

  useEffect(() => {
    const maps = window.kakao?.maps;
    const map = mapRef.current;
    const marker = markerRef.current;
    const lat = Number(input.originLat);
    const lng = Number(input.originLng);

    if (
      !maps ||
      !map ||
      !marker ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const position = new maps.LatLng(lat, lng);

    marker.setPosition(position);
    map.setCenter(position);
  }, [input.originLat, input.originLng]);

  return (
    <SketchCard accent={obColors.mint} pad={20} radius="r3">
      <form className="flex flex-col gap-5" onSubmit={submitSearch}>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[16px] font-black text-[var(--ob-text)]">
            <IconPin size={20} stroke={obColors.ink} />
            출발지
          </span>
          <div
            className="relative h-64 overflow-hidden rounded-[18px] border-2 border-[var(--ob-ink-soft)] bg-white grayscale contrast-110"
            data-today-bus-map
          >
            <div className="absolute inset-0" ref={mapContainerRef} />
            {mapStatus !== "ready" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white px-4 text-center text-[15px] font-bold text-[var(--ob-text2)]">
                {mapStatus === "unavailable"
                  ? "지도 선택 비활성"
                  : "지도 로딩 중"}
              </div>
            ) : null}
          </div>
          {input.originPlaceName || selectedCoordinate ? (
            <span className="text-[15px] font-bold text-[var(--ob-text)]">
              {input.originAddress || input.originPlaceName || selectedCoordinate}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[16px] font-black text-[var(--ob-text)]">
              <IconClock size={20} stroke={obColors.ink} />
              기차 시간
            </span>
          </div>
          <input
            aria-label="기차 출발 날짜"
            className={dateInputClass}
            min={getTodayDateInputValue()}
            onChange={(event) => updateTrainDate(event.target.value)}
            type="date"
            value={trainDate}
          />
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
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[16px] font-black text-[var(--ob-text)]">
            여유
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
                    background: selected ? obColors.text : "#FFFFFF",
                    borderColor: obColors.text,
                    color: selected ? "#FFFFFF" : obColors.text,
                  }}
                  type="button"
                >
                  {buffer}분
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="ob-modern-cta"
          disabled={!canSubmit}
          type="submit"
        >
          <span>계산하기</span>
          <span aria-hidden="true" className="ob-modern-cta__icon">
            &gt;
          </span>
        </button>
      </form>
    </SketchCard>
  );
}
