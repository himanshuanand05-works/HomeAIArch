import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsUUID()
  ownerId!: string;

  @IsUUID()
  plotId!: string;

  @IsUUID()
  homeProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
