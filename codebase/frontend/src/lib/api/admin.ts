import { apiClient } from '../api-client';

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalProjects: number;
  completedProjects: number;
  failedProjects: number;
  renderingProjects: number;
  totalProviderCalls: number;
  estimatedCostUsd: number;
}

export interface AdminProviderItem {
  providerId: string;
  displayName: string;
  isEnabled: boolean;
  billingClassification?: string;
}

export interface AdminUserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

export interface AdminJobItem {
  _id: string;
  title: string;
  userId: string;
  providerId: string;
  status: string;
  errorMessage?: string;
  scenesCount?: number;
  totalDurationSeconds?: number;
  createdAt: string;
}

export interface AdminAuditLogItem {
  _id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export async function fetchAdminDashboard(): Promise<{
  stats: AdminDashboardStats;
  providers: AdminProviderItem[];
}> {
  const res = await apiClient.get('/admin/dashboard');
  return res.data;
}

export async function fetchAdminUsers(limit: number = 50, skip: number = 0, status?: string): Promise<{
  users: AdminUserItem[];
  total: number;
}> {
  const res = await apiClient.get('/admin/users', { params: { limit, skip, status } });
  return res.data;
}

export async function updateAdminUserStatus(userId: string, status: string): Promise<AdminUserItem> {
  const res = await apiClient.patch(`/admin/users/${userId}/status`, { status });
  return res.data;
}

export async function toggleProviderKillswitch(
  providerId: string,
  isEnabled: boolean,
  reason?: string,
): Promise<{ providerId: string; isEnabled: boolean }> {
  const res = await apiClient.patch(`/admin/providers/${providerId}/killswitch`, { isEnabled, reason });
  return res.data;
}

export async function fetchAdminJobs(limit: number = 50, skip: number = 0, status?: string): Promise<{
  jobs: AdminJobItem[];
  total: number;
}> {
  const res = await apiClient.get('/admin/jobs', { params: { limit, skip, status } });
  return res.data;
}

export async function fetchAdminAuditLogs(limit: number = 50, skip: number = 0): Promise<{
  logs: AdminAuditLogItem[];
  total: number;
}> {
  const res = await apiClient.get('/admin/audit-logs', { params: { limit, skip } });
  return res.data;
}

