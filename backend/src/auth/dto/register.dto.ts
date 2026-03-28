import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, MaxLength } from 'class-validator';

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
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
