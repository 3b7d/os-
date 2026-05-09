export interface DeliveryTask {
  Creation_DateTime: string;
  Task_Status: string;
  Agent_Name: string;
  Team_Name: string;
  'Distance(KM)': number;
  'Total_Time_Taken(min)': number;
  عدد_الطبالي: number;
  Customer_Address: string;
}

export type DataSource = 'mysql' | 'excel';

export interface KPIStats {
  totalOrders: number;
  successfulOrders: number;
  successRate: number;
  avgDeliveryTime: number;
  totalDistance: number;
}
