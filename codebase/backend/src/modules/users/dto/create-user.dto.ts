import { UserRole, UserStatus } from '../schemas/user.schema';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
}

