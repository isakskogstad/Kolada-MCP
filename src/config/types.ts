/**
 * Type definitions for Kolada API v3
 */

export interface KPI {
  id: string;
  title: string;
  description: string;
  operating_area: string;
  prel_publication_date?: string;
  publication_date?: string;
  ou_publication_date?: string;
  is_divided_by_gender: boolean;
  has_ou_data: boolean;
  municipality_type: 'K' | 'L' | 'alla';
  auspices?: string;
  publ_period?: string;
}

export interface Municipality {
  id: string;
  title: string;
  type: 'K' | 'L';
}

export interface MunicipalityGroup {
  id: string;
  title: string;
  members?: string[];
}

export interface KPIGroup {
  id: string;
  title: string;
  description?: string;
  members?: string[];
}

export interface OrganizationalUnit {
  id: string;
  title: string;
  municipality: string;
  ou_type?: string;
}

export interface DataPoint {
  period: number;
  value: number;
  gender?: 'M' | 'K' | 'T';
  status?: string;
  count?: number;
}

export interface KPIData {
  kpi: string;
  municipality?: string;
  ou?: string;
  values: DataPoint[];
}

export interface KoladaResponse<T> {
  values: T[];
  count: number;
  next_page?: string;
  previous_page?: string;
}

export interface ToolError {
  isError: true;
  code: 'NOT_FOUND' | 'INVALID_INPUT' | 'API_ERROR' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  message: string;
  details?: any;
  suggestion?: string;
}
