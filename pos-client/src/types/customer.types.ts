export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  loyalty_points: number;
  total_spent: number;
  total_transactions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_active?: boolean;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerSearchResult {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  full_name: string; // Combined first + last name
  phone: string | null;
  email: string | null;
}
