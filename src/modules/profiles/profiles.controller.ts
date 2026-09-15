import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a HomeProfile from a DesignTemplate and user overrides' })
  create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List profiles for a user' })
  listByUser(@Query('userId', ParseUUIDPipe) userId: string) {
    return this.profilesService.listByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a profile by id' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a profile' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a profile' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.profilesService.delete(id);
  }
}
