import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  company: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: true })
  isSecret: boolean;

  @Column({ nullable: true })
  password?: string; // 단방향 암호화(bcrypt 등)를 거친 후 저장하는 것을 권장합니다.

  @Column({ default: '접수대기' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}