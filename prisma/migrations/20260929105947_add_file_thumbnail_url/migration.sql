-- File에 목록/그리드용 썸네일 주소 필드 추가(nullable - 예전 파일/비이미지는 null로 원본 폴백)
ALTER TABLE `File` ADD COLUMN `thumbnailUrl` VARCHAR(191) NULL;
