import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

export enum UserType {
  staff = 'staff',
  parent = 'parent',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserType)
  userType: UserType;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
