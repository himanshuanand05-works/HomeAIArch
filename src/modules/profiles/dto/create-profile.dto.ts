import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProfileRoomDto {
  @IsString()
  type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  count?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  minM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  idealM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  maxM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  minSideM?: number;
}

export class KitchenDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  minM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  idealM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  maxM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  counterMinM?: number;
}

export class BathConnectivityDto {
  @IsOptional()
  @IsBoolean()
  ensuite?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4)
  commonBaths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2)
  wcPerFloor?: number;
}

export class ParkingDto {
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4)
  cars?: number;
}

export class MandatoryDto {
  @IsOptional()
  @IsBoolean()
  attachedBathrooms?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParkingDto)
  indoorParking?: ParkingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParkingDto)
  outdoorParking?: ParkingDto;
}

export class CreateProfileDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  floors?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileRoomDto)
  rooms!: ProfileRoomDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => KitchenDto)
  kitchen?: KitchenDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BathConnectivityDto)
  bathConnectivity?: BathConnectivityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MandatoryDto)
  mandatory?: MandatoryDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  maxCoverage?: number | null;
}
