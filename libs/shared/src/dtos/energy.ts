export interface EnergyStateDto {
  balance: number;
  capacity: number;
  resetsAt: string;
  canStartFull: boolean;
  canStartAxis: boolean;
}
