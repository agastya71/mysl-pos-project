import type { SimpleVendor } from './accountsPayable.types';

export type { SimpleVendor };

export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number: string | null;
  total_amount: string;
  status: 'pending' | 'cleared' | 'void' | 'cancelled';
  memo: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VPListQuery {
  vendor_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface VPListResult {
  payments: VendorPayment[];
  total: number;
  total_amount: number;
  page: number;
  pages: number;
}
