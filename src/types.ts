export type ClientStatus = 'Lead' | 'Active' | 'Nearly Expired' | 'Expired' | 'Hold';
export type LeadInterest = 'Interested' | 'Not Interested' | 'Pending';
export type LeadCategory = 'Out of area zone' | 'Social class' | 'Price' | 'No answer' | 'Ladies only' | 'Morning session' | 'Other' | 'None';
export type LeadSource = 'Instagram' | 'WhatsApp' | 'Walk-in' | 'TikTok' | 'Other';
export type LeadStage = 'New' | 'Trial' | 'Follow Up' | 'Converted' | 'Lost';
export type SessionType = 'Private' | 'Group';
export type UserRole = 'manager' | 'rep' | 'admin' | 'super_admin' | 'crm_admin';
export type Branch = 'COMPLEX' | 'MIVIDA' | 'Strike IMPACT';

export interface Package {
  id: string;
  name: string;
  price: number;
  sessions: number;
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
  salesTarget?: number;
}

export interface PrivateSession {
  id: string;
  clientId: string;
  date: string; // ISO string
  status: 'Scheduled' | 'Attended' | 'No Show' | 'Cancelled';
  notes?: string;
  trainerId?: string; // userId
  branch?: Branch;
}

export interface Comment {
  id: string;
  text: string;
  date: string; // ISO string
  author: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'CLIENT' | 'PAYMENT' | 'SESSION' | 'LEAD' | 'TARGET' | 'ATTENDANCE' | 'COACH';
  entityId: string;
  details: string;
  timestamp: string;
  branch?: Branch;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  date: string; // ISO string
  method: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Instapay' | 'Other';
  instapayRef?: string; // 12 digits
  packageType: string;
  coachName?: string; // Optional coach name for PT packages
  notes?: string;
  recordedBy?: string; // userId
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
  packageType?: string; // e.g., "10 S GT Adults", "30 session adult"
  sessionsRemaining?: number | string; // e.g., 6, 0, -3, or "no attend"
  startDate?: string; // ISO string
  membershipExpiry?: string; // ISO string (End Date)
  dateOfBirth?: string; // ISO string
  points?: number;
  typeOfClient?: string;
  salesName?: string;
  
  comments: Comment[];
  lastContactDate: string; // ISO string
  nextReminderDate?: string; // ISO string
  paid?: boolean;
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
  privateSessionsSold: number;
  groupSessionsSold: number;
}

export interface UserSalesTarget {
  id: string;
  userId: string;
  month: string; // 'YYYY-MM'
  targetAmount: number;
  setBy: string; // manager userId
  createdAt: string; // ISO string
}

export interface BrandingSettings {
  companyName: string;
  logoUrl: string;
}

