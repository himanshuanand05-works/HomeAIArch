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
import { CreatePlotDto } from './dto/create-plot.dto';
import { UpdatePlotDto } from './dto/update-plot.dto';
import { PlotsService } from './plots.service';

@ApiTags('plots')
@Controller('plots')
export class PlotsController {
  constructor(private readonly plotsService: PlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a plot (ownerId is a Phase 0 placeholder identity)' })
  create(@Body() dto: CreatePlotDto) {
    return this.plotsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List plots for an owner' })
  listByOwner(@Query('ownerId', ParseUUIDPipe) ownerId: string) {
    return this.plotsService.listByOwner(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plot by id' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.plotsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plot' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlotDto) {
    return this.plotsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a plot' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.plotsService.delete(id);
  }
}
