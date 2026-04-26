import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AllowMiniUser } from '../../common/decorators/allow-mini-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Create new transaction' })
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  @RequirePermissions('READ:TRANSACTIONS')
  @ApiOperation({ summary: 'Get all transactions with pagination' })
  async findAll(@Query() query: PaginationDto & { memberId?: string; kind?: string; from?: string; to?: string }) {
    return this.transactionsService.findAll(query);
  }

  @Get('summary')
  @RequirePermissions('READ:ANALYTICS')
  @ApiOperation({ summary: 'Get financial summary' })
  async getSummary() {
    return this.transactionsService.getSummary();
  }

  @Get('my')
  @AllowMiniUser()
  @RequirePermissions('READ:TRANSACTIONS')
  @ApiOperation({ summary: 'Get current mini-program member transactions' })
  async getMyTransactions(
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationDto & { kind?: string; from?: string; to?: string },
  ) {
    return this.transactionsService.findMyTransactions(userId, query);
  }

  @Get('my-summary')
  @AllowMiniUser()
  @RequirePermissions('READ:TRANSACTIONS')
  @ApiOperation({ summary: 'Get current mini-program member transaction summary' })
  async getMySummary(
    @CurrentUser('sub') userId: string,
    @Query() query: { from?: string; to?: string },
  ) {
    return this.transactionsService.getMySummary(userId, query);
  }

  @Get(':id')
  @RequirePermissions('READ:TRANSACTIONS')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Update transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('WRITE:TRANSACTIONS')
  @ApiOperation({ summary: 'Update transaction status' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(id, dto);
  }
}
