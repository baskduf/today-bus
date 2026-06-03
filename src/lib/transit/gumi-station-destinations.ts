export type GumiStationDestinationStop = {
  label: "구미역";
  name: string;
  nodeId: string;
  stopNo: string;
  walkMinutesToStation: number;
};

export const gumiStationDestinationStops = [
  {
    label: "구미역",
    name: "구미역(중앙시장)",
    nodeId: "GMB79",
    stopNo: "10079",
    walkMinutesToStation: 7,
  },
] satisfies GumiStationDestinationStop[];
