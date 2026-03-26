export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  programType: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  location: string;
  totalAmount: number;
  advancePaid: number;
  status: 'pending' | 'paid';
}

export type ProgramType = 'Birthday' | 'Wedding' | 'Corporate Party' | 'Engagement' | 'Other';