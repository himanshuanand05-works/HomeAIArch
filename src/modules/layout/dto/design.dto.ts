import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class GenerateDesignDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  seed?: number;
}

export class CreateIterationDto {
  @IsObject()
  changeRequest!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  seed?: number;
}
