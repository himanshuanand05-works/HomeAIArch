import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateIterationDto, GenerateDesignDto } from './dto/design.dto';
import { LayoutService } from './layout.service';

@ApiTags('layout')
@Controller('projects')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Post(':projectId/designs')
  @ApiOperation({ summary: 'Generate the initial design (version 1) for a project' })
  generateInitial(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: GenerateDesignDto,
  ) {
    return this.layoutService.generateInitial(projectId, dto);
  }

  @Get(':projectId/designs')
  @ApiOperation({ summary: 'List design versions for a project' })
  listDesigns(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.layoutService.listDesigns(projectId);
  }

  @Get(':projectId/designs/:versionNumber')
  @ApiOperation({ summary: 'Get a design version by version number' })
  getDesign(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.layoutService.getDesign(projectId, versionNumber);
  }

  @Post(':projectId/designs/:versionNumber/iterations')
  @ApiOperation({ summary: 'Branch a new design version from a change request' })
  createIteration(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @Body() dto: CreateIterationDto,
  ) {
    return this.layoutService.createIteration(projectId, versionNumber, dto);
  }
}
