import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum UserType {
  staff = 'staff',
  parent = 'parent',
}

export class RegisterDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserType)
  userType: UserType;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  parentFirstName: string;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  parentLastName: string;

  @IsString()
  @Matches(/^\d{13}$/, { message: 'parentNationalId must be 13 digits' })
  parentNationalId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  childFirstName: string;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  childLastName: string;

  @IsString()
  @Matches(/^\d{13}$/, { message: 'childNationalId must be 13 digits' })
  childNationalId: string;

  @IsDateString()
  childBirthDate: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
