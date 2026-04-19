export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'admin' | 'surveyor' | 'client'
  is_active: boolean
  avatar_url?: string
  created_at?: string
}

export interface Client {
  id: string
  user_id?: string
  company_name?: string
  contact_person?: string
  email: string
  phone?: string
  address?: string
  gst_number?: string
  created_at?: string
}

export interface Surveyor {
  id: string
  user_id: string
  license_number?: string
  specialization?: string
  is_available: boolean
  created_at?: string
}

export interface Project {
  id: string
  project_number: string
  title: string
  description?: string
  client_id?: string
  surveyor_id?: string
  status: string
  priority: string
  location?: string
  latitude?: number
  longitude?: number
  area_sqm?: number
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface QuotationItem {
  id: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  amount?: number
}

export interface Quotation {
  id: string
  quotation_number: string
  project_id?: string
  client_id?: string
  status: string
  subtotal?: number
  tax_percent?: number
  tax_amount?: number
  discount?: number
  total_amount?: number
  valid_until?: string
  notes?: string
  terms_conditions?: string
  items: QuotationItem[]
  created_at?: string
  updated_at?: string
}

export interface InvoiceItem {
  id: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  amount?: number
}

export interface Invoice {
  id: string
  invoice_number: string
  project_id?: string
  client_id?: string
  quotation_id?: string
  status: string
  subtotal?: number
  tax_percent?: number
  tax_amount?: number
  discount?: number
  total_amount?: number
  amount_paid?: number
  due_date?: string
  paid_date?: string
  notes?: string
  terms_conditions?: string
  items: InvoiceItem[]
  created_at?: string
  updated_at?: string
}

export interface Ticket {
  id: string
  ticket_number: string
  project_id?: string
  created_by?: string
  assigned_to?: string
  subject: string
  description?: string
  status: string
  priority: string
  category: string
  created_at?: string
  updated_at?: string
}

export interface Payment {
  id: string
  invoice_id?: string
  amount?: number
  payment_method?: string
  reference_number?: string
  payment_date?: string
  notes?: string
  created_at?: string
}

export interface ProjectDocument {
  id: string
  project_id?: string
  uploaded_by?: string
  file_name?: string
  file_path?: string
  file_type?: string
  file_size_bytes?: number
  description?: string
  created_at?: string
}

export interface DxfEntity {
  type: string
  layer?: string
  color?: string
  start?: number[]
  end?: number[]
  center?: number[]
  radius?: number
  start_angle?: number
  end_angle?: number
  points?: number[][]
  closed?: boolean
  position?: number[]
  text?: string
  height?: number
  major_axis?: number[]
  ratio?: number
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  total_clients: number
  total_invoices: number
  total_revenue: number
  pending_amount: number
  open_tickets: number
  total_tickets: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface PriceTier {
  id: string
  category: string
  label: string
  condition: string
  min_acres?: number
  max_acres?: number
  price_per_acre: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface PaymentTerm {
  id: string
  name: string
  description?: string
  milestone_percent: number
  milestone_label: string
  sort_order?: number
  is_active: boolean
  created_at?: string
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label?: string
  icon_type?: string
  color?: string
  notes?: string
}

export interface MapVersion {
  id: string
  project_id: string
  version_name: string
  version_number: number
  markers: MapMarker[]
  center_lat?: string
  center_lng?: string
  zoom_level?: number
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface DrawingVersion {
  id: string
  project_id: string
  version_name: string
  version_number: number
  dxf_entities: DxfEntity[]
  annotations: any[]
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface SiteSettings {
  id: string
  company_name: string
  tagline?: string
  logo_path?: string
  favicon_path?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  gst_number?: string
  pan_number?: string
  copyright_text?: string
  footer_text?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc?: string
  bank_branch?: string
  upi_id?: string
  invoice_prefix?: string
  quotation_prefix?: string
  invoice_terms?: string
  quotation_terms?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}
