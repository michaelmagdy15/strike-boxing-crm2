export type ClientStatus = 'Lead' | 'Active' | 'Nearly Expired' | 'Expired' | 'Hold';
export type LeadInterest = 'Interested' | 'Not Interested' | 'Pending';
export type LeadCategory = 'Out of area zone' | 'Social class' | 'Price' | 'No answer' | 'Ladies only' | 'Morning session' | 'Other' | 'None';
export type LeadSource = 'Instagram' | 'WhatsApp' | 'Walk-in' | 'TikTok' | 'Other';
export type LeadStage = 'New' | 'Trial' | 'Follow Up' | 'Converted' | 'Lost';
export type PackageType = 'Private' | 'Group';
export type UserRole = 'manager' | 'rep' | 'admin' | 'super_admin' | 'crm_admin';
export type InteractionType = 'Call' | 'WhatsApp' | 'Email' | 'Visit';
export type InteractionOutcome = 'Interested' | 'Not Answered' | 'Scheduled Trial' | 'Rejected' | 'Other';

export type Branch = string;

export interface Package {
  id: string;
  name: string;
  price: number;
  sessions: number; // Keep field name for now but logic uses as packages
  expiryDays: number;
  branch: Branch | 'ALL';
  type: 'Private' | 'Group' | 'Other';
}

export interface Coach {
  id: string;
  name: string;
  active: boolean;
}

export interface ImportBatch {
  id: string;
  date: string;
  fileName: string;
  importedCount: number;
  failedCount: number;
  errors: { row: number; reason: string }[];
  status: 'Completed' | 'Rolled Back';
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  branch?: Branch;
  salesTarget?: number;
  can_delete_payments?: boolean;
  can_view_global_dashboard?: boolean;
  can_access_settings_and_history?: boolean;
  can_delete_records?: boolean;
  can_assign_leads?: boolean;
  lastSeen?: string;
}

export interface PTPackageRecord {
  id: string;
  clientId: string;
  date: string; // ISO string
  status: 'Scheduled' | 'Attended' | 'No Show' | 'Cancelled';
  notes?: string;
  trainerId?: string; // userId
  branch?: Branch;
}

export interface CRMComment {
  id: string;
  text: string;
  date: string; // ISO string
  author: string;
}

export interface InteractionLog {
  id: string;
  date: string; // ISO string
  type: InteractionType;
  outcome: InteractionOutcome;
  notes: string;
  nextFollowUp?: string; // ISO string
  author: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'CLIENT' | 'PAYMENT' | 'PACKAGE_RECORD' | 'LEAD' | 'TARGET' | 'ATTENDANCE' | 'COACH' | 'SYSTEM' | 'BRANCH' | 'SESSION';
  entityId: string;
  details: string;
  timestamp: string;
  branch?: Branch;
}

export interface Payment {
  id: string;
  clientId: string;
  client_name: string;
  amount: number;
  amount_paid: number;
  date: string; // ISO string
  method: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Instapay' | 'Other';
  instapayRef?: string; // 12 digits
  packageType: string;
  package_category_type: 'Private Training' | 'Group Training';
  coachName?: string; // Optional coach name for PT packages
  coach_name?: string; // Aligning with requested schema
  notes?: string;
  recordedBy?: string; // userId
  sales_rep_id: string;
  salesName?: string;
  created_at: string; // ISO string
  deleted_at?: string | null; // ISO string (soft delete)
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  assignedTo?: string; // userId
  branch?: Branch;
  memberId?: string; // Sequential ID for members
  importBatchId?: string; // ID of the import batch this client was created in
  
  // Lead specific
  interest?: LeadInterest;
  category?: LeadCategory;
  source?: LeadSource;
  stage?: LeadStage;
  expectedVisitDate?: string; // ISO string
  trialDate?: string; // ISO string
  
  // Member specific
  packageType?: string; // e.g., "10 S GT Adults", "30 package adult"
  sessionsRemaining?: number | string; // e.g., 6, 0, -3, or "no attend"
  startDate?: string; // ISO string
  membershipExpiry?: string; // ISO string (End Date)
  dateOfBirth?: string; // ISO string
  points?: number;
  typeOfClient?: string;
  salesName?: string;
  
  packages?: ClientPackage[];
  linkedAccount?: boolean; // Shares phone number with another member (family/parent)

  comments?: CRMComment[];
  interactions?: InteractionLog[];
  lastContactDate?: string; // ISO string
  nextReminderDate?: string; // ISO string
  paid?: boolean;
}

export interface ClientPackage {
  id: string;
  packageName: string;
  startDate?: string;
  endDate?: string;
  sessionsTotal?: number;
  sessionsRemaining?: number;
  status: 'Active' | 'Expired' | 'Cancelled' | 'Pending';
}

export interface Attendance {
  id: string;
  clientId: string;
  branch: Branch;
  date: string; // ISO string
  recordedBy: string; // userId
  packageName?: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO string
  status: TaskStatus;
  priority: TaskPriority;
  clientId?: string;
  assignedTo: string; // userId
  createdBy: string; // userId
  createdAt: string; // ISO string
}

export interface SalesTarget {
  targetAmount: number;
  currentAmount: number;
  privatePackagesSold: number;
  groupPackagesSold: number;
}

export interface CommissionRates {
  ptRate: number;
  groupRate: number;
}

export interface UserSalesTarget {
  id: string;
  userId: string;
  sales_rep_id: string;
  month: string; // 'YYYY-MM'
  month_year: string; // 'YYYY-MM'
  targetAmount: number;
  setBy: string; // manager userId
  createdAt: string; // ISO string
}

export interface BrandingSettings {
  companyName: string;
  logoUrl: string;
  kioskPin?: string;
  dailyCheckinPin?: string;
}

export type UserId = string;
export type ClientId = string;
export type PackageId = string;
export type TaskId = string;
export type PaymentId = string;
export type SessionId = string;
export type ImportBatchId = string;

export type PrivateSession = PTPackageRecord;
export type Comment = CRMComment;
export type UserTarget = UserSalesTarget;
export type ClientUpdates = Partial<Client>;

export const isSuperAdmin = (role?: UserRole): boolean => role === 'super_admin' || role === 'crm_admin';
export const isAdmin = (role?: UserRole): boolean => role === 'manager' || role === 'super_admin' || role === 'crm_admin';
