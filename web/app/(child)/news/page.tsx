import { Placeholder } from '@/components/ui/Placeholder';

export default function NewsPage() {
  return (
    <Placeholder
      title="오늘의 경제 뉴스"
      owner="뉴스 트랙 (김경렬·강소정)"
      todo={[
        'content/news/*.mdx 를 읽어 목록·상세 렌더',
        '원문 크롤링·전재 금지 — 이슈를 아이 눈높이로 재작성한다',
        'pipelines/news_digest: 이슈 → Claude API 초안 → 사람 검수 → 발행',
        '자동 발행 금지. 검수 단계를 건너뛸 수 있게 만들지 말 것 (기술스택 §9)',
        '게임의 경제환경 13종과 뉴스를 연결하면 학습 효과가 커진다',
      ]}
    />
  );
}
