-- 메인 슬라이드 노출 순서 필드 추가(관리자 페이지 드래그 정렬용)
ALTER TABLE `MainSlide` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터는 지금까지의 정렬 기준(id 역순, 최신이 먼저)을 그대로 유지하도록
-- order 값을 채워둔다 - 새로 필드가 생겼다고 화면 순서가 갑자기 바뀌지 않게.
SET @rownum := 0;
UPDATE `MainSlide`
JOIN (
  SELECT id, (@rownum := @rownum + 1) AS rn
  FROM `MainSlide`
  ORDER BY id DESC
) ranked ON `MainSlide`.id = ranked.id
SET `MainSlide`.`order` = ranked.rn;
