import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserData } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  public async findById(id: string): Promise<UserDocument> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  public async findByEmail(email: string): Promise<UserDocument | null> {
    return this.usersRepository.findByEmail(email);
  }

  public async findByVerificationToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByVerificationToken(token);
  }

  public async findByPasswordResetToken(
    token: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByPasswordResetToken(token);
  }

  public async create(data: CreateUserData): Promise<UserDocument> {
    return this.usersRepository.create(data);
  }

  public async update(
    id: string,
    update: Partial<User>,
  ): Promise<UserDocument> {
    const user = await this.usersRepository.update(id, update);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  public async updateRefreshToken(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.updateRefreshToken(id, refreshTokenHash);
  }
}

