/**
 * Branded types for IDs to prevent accidental mixing of different ID types.
 * @see https://egghead.io/blog/using-branded-types-in-typescript
 */
export type ClientId = string & { readonly __brand: 'ClientId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type PackageId = string & { readonly __brand: 'PackageId' };
export type PaymentId = string & { readonly __brand: 'PaymentId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type CommentId = string & { readonly __brand: 'CommentId' };
export type AuditLogId = string & { readonly __brand: 'AuditLogId' };
export type ImportBatchId = string & { readonly __brand: 'ImportBatchId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

export type ClientStatus = 'Lead' | 'Active' | 'Nearly Expired' | 'Expired';
export type LeadInterest = 'Interested' | 'Not Interested' | 'Pending';
export type LeadCategory = 'Out of area zone' | 'Social class' | 'Price' | 'No answer' | 'Other' | 'None';
export type LeadSource = 'Instagram' | 'WhatsApp' | 'Walk-in' | 'Social Media' | 'Other';
export type LeadStage = 'New' | 'Trial' | 'Follow Up' | 'Converted' | 'Lost';
export type SessionType = 'Private' | 'Group';
export type UserRole = 'manager' | 'rep' | 'admin' | 'super_admin' | 'crm_admin';

/**
 * Type guard to check if a user has admin privileges.
 */
export const isAdmin = (role: UserRole | undefined): boolean => 
  role === 'manager' || role === 'admin' || role === 'super_admin' || role === 'crm_admin';

/**
 * Type guard to check if a user has super admin privileges.
 */
export const isSuperAdmin = (role: UserRole | undefined): boolean => 
  role === 'super_admin' || role === 'crm_admin';

export type Branch = 'COMPLEX' | 'MIVIDA';

export interface Package {
  id: PackageId;
  name: string;
  price: number;
  sessions: number;
  expiryDays: number;
  branch: Branch | 'ALL';
  type: 'Private' | 'Group' | 'Other';
}

export interface ImportBatch {
  id: ImportBatchId;
  date: string; // ISO string
  fileName: string;
  importedCount: number;
  failedCount: number;
  errors: { row: number; reason: string }[];
  status: 'Completed' | 'Rolled Back';
}

export interface User {
  id: UserId;
  name: string;
  role: UserRole;
  email: string;
}

export interface PrivateSession {
  id: SessionId;
  clientId: ClientId;
  date: string; // ISO string
  status: 'Scheduled' | 'Attended' | 'No Show' | 'Cancelled';
  notes?: string;
}

export interface Comment {
  id: CommentId;
  text: string;
  date: string; // ISO string
  author: string; // userId or name
}

export interface AuditLog {
  id: AuditLogId;
  userId: UserId;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'CLIENT' | 'PAYMENT' | 'SESSION' | 'LEAD' | 'TARGET';
  entityId: string;
  details: string;
  timestamp: string; // ISO string
}

export interface Payment {
  id: PaymentId;
  clientId: ClientId;
  amount: number;
  date: string; // ISO string
  method: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Instapay' | 'Other';
  instapayRef?: string; // 12 digits
  packageType: string;
  notes?: string;
  recordedBy?: UserId;
}

/**
 * Base properties shared by all client types.
 */
interface BaseClient {
  id: ClientId;
  name: string;
  phone: string;
  status: ClientStatus;
  assignedTo?: UserId;
  branch?: Branch;
  importBatchId?: ImportBatchId;
  comments: Comment[];
  lastContactDate: string; // ISO string
  nextReminderDate?: string; // ISO string
}

/**
 * Represents a potential customer in the lead stage.
 */
export interface LeadClient extends BaseClient {
  status: 'Lead';
  interest?: LeadInterest;
  category?: LeadCategory;
  source?: LeadSource;
  stage?: LeadStage;
  expectedVisitDate?: string; // ISO string
  trialDate?: string; // ISO string
}

/**
 * Represents an active or expired member with membership details.
 */
export interface MemberClient extends BaseClient {
  status: 'Active' | 'Nearly Expired' | 'Expired';
  memberId: string; // Sequential ID for members
  packageType: string;
  sessionsRemaining: number | string;
  startDate: string; // ISO string
  membershipExpiry: string; // ISO string
  dateOfBirth?: string; // ISO string
  points?: number;
}

/**
 * Discriminated union for Client to ensure type safety based on status.
 */
export type Client = LeadClient | MemberClient;

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: TaskId;
  title: string;
  description?: string;
  dueDate: string; // ISO string
  status: TaskStatus;
  priority: TaskPriority;
  clientId?: ClientId;
  assignedTo: UserId;
  createdBy: UserId;
  createdAt: string; // ISO string
}

export interface SalesTarget {
  targetAmount: number;
  currentAmount: number;
  privateSessionsSold: number;
  groupSessionsSold: number;
}

export interface BrandingSettings {
  companyName: string;
  logoUrl: string;
}

