// daon-backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>) {
    // 신규 가입 시 비밀번호 암호화 후 적재
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);
    return this.usersRepository.save(userData);
  }

  async update(id: number, updateData: Partial<User>) {
    // 패스워드 변경 요청이 들어온 경우에만 선별적 암호화 가동
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
    await this.usersRepository.update(id, updateData);
    return this.usersRepository.findOneBy({ id });
  }

  async findAll() {
    return this.usersRepository.find({ select: ['id', 'email', 'phone', 'role'] });
  }

  async findOneByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }
}