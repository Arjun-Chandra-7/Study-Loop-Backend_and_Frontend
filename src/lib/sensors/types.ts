export type ConnectionState = "disconnected" | "connecting" | "connected";
export type SignalQuality = "good" | "fair" | "poor" | "none";

export interface SensorReading {
  t: number;
  connection: ConnectionState;

  battery: number | null;

  hr: number | null;

  eda: number | null;
  quality: SignalQuality;
  deviceName: string | null;
}

export type ReadingListener = (reading: SensorReading) => void;

export interface SensorProvider {
  readonly kind: "mock" | "bluetooth" | "firebase";
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(listener: ReadingListener): () => void;
  getReading(): SensorReading;
  dispose(): void;
}

export type MockScenario =
  | "normal"
  | "elevated"
  | "recovery"
  | "poorSignal"
  | "lowBattery"
  | "disconnected";

export const EMPTY_READING: SensorReading = {
  t: 0,
  connection: "disconnected",
  battery: null,
  hr: null,
  eda: null,
  quality: "none",
  deviceName: null,
};
