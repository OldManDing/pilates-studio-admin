import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Feedback content', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
