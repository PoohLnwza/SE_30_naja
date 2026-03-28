import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChildDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;
}
