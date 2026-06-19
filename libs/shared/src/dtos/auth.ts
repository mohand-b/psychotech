import { Sector } from '../enums';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currentSector: Sector;
  locale?: string;
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}
