type TagoService = "arrival" | "location" | "route" | "station";

type TagoCallOptions = {
  params?: Record<string, number | string | undefined>;
  path: string;
  service: TagoService;
};

type TagoHeader = {
  resultCode?: string;
  resultMsg?: string;
};

type TagoResponse<T> = {
  response?: {
    body?: {
      items?: {
        item?: T | T[];
      } | "";
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
    };
    header?: TagoHeader;
  };
};

export type TagoCity = {
  citycode: number;
  cityname: string;
};

export type TagoRoute = {
  endnodenm?: string;
  endvehicletime?: number | string;
  routeid: string;
  routeno: number | string;
  routetp?: string;
  startnodenm?: string;
  startvehicletime?: number | string;
};

export type TagoStop = {
  gpslati?: number;
  gpslong?: number;
  nodeid: string;
  nodenm: string;
  nodeno?: number | string;
};

export type TagoRouteStop = TagoStop & {
  nodeord: number;
  routeid: string;
};

export type TagoArrival = {
  arrprevstationcnt?: number;
  arrtime?: number;
  nodeid: string;
  nodenm?: string;
  routeid: string;
  routeno: number | string;
  routetp?: string;
  vehicletp?: string;
};

export type TagoCallResult<T> = {
  header: TagoHeader;
  items: T[];
  totalCount: number;
};

export class TagoError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      resultCode?: string;
      resultMsg?: string;
      status?: number;
    },
  ) {
    super(message);
    this.name = "TagoError";
  }
}

const serviceBaseUrls: Record<TagoService, string> = {
  arrival: "https://apis.data.go.kr/1613000/ArvlInfoInqireService",
  location: "https://apis.data.go.kr/1613000/BusLcInfoInqireService",
  route: "https://apis.data.go.kr/1613000/BusRouteInfoInqireService",
  station: "https://apis.data.go.kr/1613000/BusSttnInfoInqireService",
};

function getServiceKey() {
  const serviceKey = process.env.TAGO_SERVICE_KEY?.trim();

  if (!serviceKey) {
    throw new TagoError("TAGO_SERVICE_KEY is not configured");
  }

  return serviceKey;
}

function toArray<T>(item: T | T[] | undefined) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export async function callTago<T>({
  params = {},
  path,
  service,
}: TagoCallOptions): Promise<TagoCallResult<T>> {
  const url = new URL(`${serviceBaseUrls[service]}${path}`);
  url.searchParams.set("serviceKey", getServiceKey());
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", String(params.pageNo ?? 1));
  url.searchParams.set("numOfRows", String(params.numOfRows ?? 100));

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && key !== "pageNo" && key !== "numOfRows") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new TagoError("TAGO request failed", { status: response.status });
  }

  const payload = (await response.json()) as TagoResponse<T>;
  const header = payload.response?.header ?? {};

  if (header.resultCode && header.resultCode !== "00") {
    throw new TagoError("TAGO returned an error", {
      resultCode: header.resultCode,
      resultMsg: header.resultMsg,
    });
  }

  const body = payload.response?.body;
  const items =
    typeof body?.items === "object" ? toArray<T>(body.items.item) : [];

  return {
    header,
    items,
    totalCount: body?.totalCount ?? items.length,
  };
}
