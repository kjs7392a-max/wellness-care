/**
 * 「오늘의 추천도서」 — 2026-10-24 사용자 지시: 음악과 페이지를 나누고 · 에세이·시집·소설·자기개발서로 갈라 · 분류마다 베스트셀러 1~5위를 보여 주고 고르게.
 * 순위 = 알라딘 국내도서 분류별 주간 베스트(2026년 10월 3주). 순수 · 테스트 books.test.ts · 순위는 BOOKS_BEST_AS_OF 기준으로 갈아 끼운다.
 */
export type BookCategoryId = "essay" | "poem" | "novel" | "selfhelp";
export interface BestBook { rank: number; title: string; author: string }
export interface BookCategory { id: BookCategoryId; label: string; emoji: string; best: readonly BestBook[] }

export const BOOKS_BEST_AS_OF = "2026년 10월 3주 알라딘 분류별 주간 베스트셀러";

const top = (rows: readonly (readonly [string, string])[]): BestBook[] => rows.map(([title, author], i) => ({ rank: i + 1, title, author }));

export const BOOK_CATEGORIES: readonly BookCategory[] = [
  {
    id: "essay", label: "에세이", emoji: "☕",
    best: top([
      ["농부, 짠한 형", "최요왕"],
      ["자연의 것들은 그저 자란다", "이윤 리"],
      ["박완서의 낱말들", "박완서"],
      ["에로스, 달콤씁쓸한", "앤 카슨"],
      ["언젠가 이발관", "이석원"],
    ]),
  },
  {
    id: "poem", label: "시집", emoji: "🌸",
    best: top([
      ["빨강의 자서전", "앤 카슨"],
      ["남편의 아름다움", "앤 카슨"],
      ["짧은 이야기들", "앤 카슨"],
      ["레드 닥>", "앤 카슨"],
      ["유리, 아이러니 그리고 신", "앤 카슨"],
    ]),
  },
  {
    id: "novel", label: "소설", emoji: "📖",
    best: top([
      ["가호", "무라카미 하루키"],
      ["한국사 이상현상 연구원", "최인서"],
      ["싯다르타", "헤르만 헤세"],
      ["모순", "양귀자"],
      ["아메리칸 학원 1", "이민진"],
    ]),
  },
  {
    id: "selfhelp", label: "자기개발서", emoji: "🌱",
    best: top([
      ["퍼플필", "진쏠미"],
      ["주의를 기울이는 법", "롭 워커"],
      ["돈으로 자유를 사라", "댄 록"],
      ["아주 작은 습관의 힘", "제임스 클리어"],
      ["부자의 5가지 철학", "사힐 블룸"],
    ]),
  },
];

export const bookCategory = (id: BookCategoryId): BookCategory => BOOK_CATEGORIES.find((c) => c.id === id) ?? BOOK_CATEGORIES[0];

/** 네이버 책 검색(제목+저자) — persona.ts bookSearchUrl 과 같은 규칙. */
export const bestBookNaverUrl = (b: BestBook): string => `https://search.naver.com/search.naver?where=book&query=${encodeURIComponent(`${b.title} ${b.author}`)}`;
/** 알라딘 검색(제목+저자). */
export const bestBookAladinUrl = (b: BestBook): string => `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=${encodeURIComponent(`${b.title} ${b.author}`)}`;
