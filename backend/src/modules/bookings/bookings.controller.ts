import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus } from '../../common/enums/domain.enums';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @RequirePermissions('WRITE:BOOKINGS')
  @ApiOperation({ summary: 'Create new booking' })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookingsService.create(dto, userId);
  }

  @Get()
  @RequirePermissions('READ:BOOKINGS')
  @ApiOperation({ summary: 'Get all bookings with pagination' })
  async findAll(@Query() query: PaginationDto & { status?: BookingStatus; from?: string; to?: string }) {
    return this.bookingsService.findAll(query);
  }

  // Mini-program endpoints (member-facing)
  @Get('my')
  @RequirePermissions('READ:BOOKINGS')
  @ApiOperation({ summary: 'Get my bookings (mini-program)' })
  async getMyBookings(
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationDto & { status?: BookingStatus },
  ) {
    return this.bookingsService.findMyBookings(userId, query);
  }

  @Get(':id')
  @RequirePermissions('READ:BOOKINGS')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions('WRITE:BOOKINGS')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('WRITE:BOOKINGS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('WRITE:BOOKINGS')
  @ApiOperation({ summary: 'Cancel booking (mini-program)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.cancel(id, reason);
  }
}
