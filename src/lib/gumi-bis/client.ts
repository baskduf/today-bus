type GumiBisPath =
  | "/localbus/getTimetableInfo"
  | "/localbus/selectBusRouteList"
  | "/localbus/setAllBusRouteInfo";

type GumiBisResponse<T> = {
  rows?: T[];
};

type GumiBisCallOptions = {
  params?: Record<string, number | string | undefined>;
  path: GumiBisPath;
};

export type GumiBisScheduleType = "holiday" | "weekday";

export type GumiBisRoute = {
  brtDirection?: string;
  brtId: string;
  estopNm?: string;
  remark?: string;
  routeId: string;
  sstopNm?: string;
};

export type GumiBisRouteInfo = {
  brtId: string;
  lastStop: string;
  remark?: string;
  routeId: string;
  startStop: string;
};

export type GumiBisTimetableEntry = {
  bttSeqno: number | string;
  remark?: string | null;
  starttime: string;
};

export type GumiBisCallResult<T> = {
  rows: T[];
};

export class GumiBisError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      status?: number;
    },
  ) {
    super(message);
    this.name = "GumiBisError";
  }
}

const baseUrl = "http://bis.gumi.go.kr";
const seoulTimeZone = "Asia/Seoul";

function getScheduleTypeCode(scheduleType: GumiBisScheduleType) {
  return scheduleType === "weekday" ? "0" : "2";
}

export function getGumiBisScheduleTypeForDate(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: seoulTimeZone,
    weekday: "short",
  }).format(date);

  return weekday === "Sat" || weekday === "Sun" ? "holiday" : "weekday";
}

async function callGumiBis<T>({
  params = {},
  path,
}: GumiBisCallOptions): Promise<GumiBisCallResult<T>> {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.set(key, String(value));
  }

  const response = await fetch(`${baseUrl}${path}`, {
    body,
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new GumiBisError("Gumi BIS request failed", {
      status: response.status,
    });
  }

  const payload = (await response.json()) as GumiBisResponse<T>;

  return {
    rows: Array.isArray(payload.rows) ? payload.rows : [],
  };
}

export async function getGumiBisRouteList() {
  return callGumiBis<GumiBisRoute>({
    path: "/localbus/selectBusRouteList",
  });
}

export async function getGumiBisRouteInfo(routeId: string) {
  return callGumiBis<GumiBisRouteInfo>({
    params: { routeId },
    path: "/localbus/setAllBusRouteInfo",
  });
}

export async function getGumiBisTimetable(
  routeId: string,
  scheduleType: GumiBisScheduleType,
) {
  return callGumiBis<GumiBisTimetableEntry>({
    params: {
      bType: getScheduleTypeCode(scheduleType),
      routeId,
    },
    path: "/localbus/getTimetableInfo",
  });
}
