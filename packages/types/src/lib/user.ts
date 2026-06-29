import { UserStatus } from './enums';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  status: UserStatus;
  departmentId?: string;
  maxCapacity: number;
  roles: string[];
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
}
