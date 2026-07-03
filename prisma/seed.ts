// import { PrismaClient } from '@prisma/client';
import { PrismaClient } from '@prisma/client/extension';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 테스트용 비밀번호 암호화
  const hashedPassword = await bcrypt.hash('admin1234!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@daon.com' },
    update: {},
    create: {
      email: 'admin@daon.com',
      name: '최고관리자',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ 관리자 계정 생성 완료:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
