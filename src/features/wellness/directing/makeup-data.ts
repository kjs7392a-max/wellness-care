/**
 * 마음온도(figma.site ver.1.2) 「오늘의 메이크업」 표 — 번들에서 그대로 옮김(2026-09-21 사용자 지시 "그대로 옮겨줘"). 문장 한 글자도 손대지 않는다.
 *   FEMALE_LOOKS = 여성 27조합(질감 3 × 고민 3 × 목적 3 · 목적 gathering 은 원본 표에 없다) · MALE_LOOKS = 남성 그루밍 36조합(질감 3 × 고민 3 × 목적 4)
 *   FEMALE_NONE / MALE_NONE = 「고민 없음」일 때의 질감×목적 표(원본 X2 / Y2 의 사전).
 * 선택 규칙은 makeup.ts.
 */
export interface MakeupStep { step: string; detail: string; icon: string }
export interface MakeupLook { skinTexture: string; skinConcern: string; occasion: string; title: string; emoji: string; steps: MakeupStep[]; tip: string }

export const FEMALE_LOOKS: readonly MakeupLook[] = [
  {
    "skinTexture": "dry",
    "skinConcern": "dullness",
    "occasion": "daily",
    "title": "촉촉 광채 데일리 메이크업",
    "emoji": "✨",
    "steps": [
      {
        "step": "보습 앰플",
        "detail": "히알루론산 앰플로 속부터 촉촉하게",
        "icon": "💧"
      },
      {
        "step": "글로우 베이스",
        "detail": "펄 베이스로 빛 반사 효과 UP",
        "icon": "🌟"
      },
      {
        "step": "쿠션 파운데이션",
        "detail": "가볍게 두드려 자연스러운 광채",
        "icon": "✨"
      },
      {
        "step": "크림 블러셔",
        "detail": "핑크빛 생기를 볼에 살짝",
        "icon": "🌸"
      },
      {
        "step": "하이라이터",
        "detail": "광대뼈에 은은하게",
        "icon": "💎"
      }
    ],
    "tip": "건조한 피부는 메이크업 전 보습이 핵심이에요! 앰플을 충분히 흡수시킨 후 베이스를 발라주세요."
  },
  {
    "skinTexture": "dry",
    "skinConcern": "dullness",
    "occasion": "special",
    "title": "빛나는 특별한 날 메이크업",
    "emoji": "💫",
    "steps": [
      {
        "step": "수분 마스크",
        "detail": "메이크업 전 집중 보습",
        "icon": "💧"
      },
      {
        "step": "프라이머",
        "detail": "광채 프라이머로 기초 완성",
        "icon": "✨"
      },
      {
        "step": "글로우 파운데이션",
        "detail": "촉촉한 광채 피부 표현",
        "icon": "🌟"
      },
      {
        "step": "섀도우 & 립",
        "detail": "화려한 포인트 메이크업",
        "icon": "💄"
      },
      {
        "step": "픽싱 스프레이",
        "detail": "오래 지속되게",
        "icon": "💫"
      }
    ],
    "tip": "특별한 날엔 수분 마스크로 베이스를 완벽하게 준비하세요!"
  },
  {
    "skinTexture": "dry",
    "skinConcern": "dullness",
    "occasion": "casual",
    "title": "가볍고 촉촉한 캐주얼 메이크업",
    "emoji": "🌿",
    "steps": [
      {
        "step": "수분 크림",
        "detail": "가벼운 보습",
        "icon": "💧"
      },
      {
        "step": "틴티드 모이스처라이저",
        "detail": "색조 보습제로 간편하게",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "촉촉한 입술",
        "icon": "💋"
      }
    ],
    "tip": "가벼운 외출엔 색조 보습제 하나면 충분해요!"
  },
  {
    "skinTexture": "dry",
    "skinConcern": "redness",
    "occasion": "daily",
    "title": "진정 & 보습 데일리 메이크업",
    "emoji": "🌸",
    "steps": [
      {
        "step": "진정 앰플",
        "detail": "센텔라 앰플로 붉은기 진정",
        "icon": "🌿"
      },
      {
        "step": "그린 베이스",
        "detail": "붉은기 컬러 보정",
        "icon": "💚"
      },
      {
        "step": "쿠션 파운데이션",
        "detail": "촉촉하게 커버",
        "icon": "✨"
      },
      {
        "step": "크림 블러셔",
        "detail": "자연스러운 혈색",
        "icon": "🌸"
      }
    ],
    "tip": "붉은기는 그린 베이스로 중화시킨 후 파운데이션을 발라주세요."
  },
  {
    "skinTexture": "dry",
    "skinConcern": "redness",
    "occasion": "special",
    "title": "특별한 날 진정 메이크업",
    "emoji": "🌹",
    "steps": [
      {
        "step": "진정 마스크",
        "detail": "붉은기 집중 진정",
        "icon": "🌿"
      },
      {
        "step": "컬러 보정 프라이머",
        "detail": "완벽한 톤 보정",
        "icon": "💚"
      },
      {
        "step": "커버 파운데이션",
        "detail": "붉은기 완벽 커버",
        "icon": "✨"
      },
      {
        "step": "포인트 메이크업",
        "detail": "눈과 입술에 집중",
        "icon": "💄"
      }
    ],
    "tip": "중요한 날엔 진정 마스크로 붉은기를 미리 가라앉히세요!"
  },
  {
    "skinTexture": "dry",
    "skinConcern": "redness",
    "occasion": "casual",
    "title": "편안한 진정 메이크업",
    "emoji": "🧘",
    "steps": [
      {
        "step": "진정 크림",
        "detail": "붉은기 진정",
        "icon": "🌿"
      },
      {
        "step": "그린 틴티드",
        "detail": "컬러 보정 + 보습",
        "icon": "💚"
      },
      {
        "step": "립밤",
        "detail": "촉촉함 유지",
        "icon": "💋"
      }
    ],
    "tip": "예민한 날엔 최소한의 메이크업으로 피부를 쉬게 해주세요."
  },
  {
    "skinTexture": "dry",
    "skinConcern": "puffiness",
    "occasion": "daily",
    "title": "부기 케어 데일리 메이크업",
    "emoji": "☁️",
    "steps": [
      {
        "step": "아이 마사지",
        "detail": "부기 빼는 림프 마사지",
        "icon": "💆"
      },
      {
        "step": "보습 앰플",
        "detail": "속부터 촉촉하게",
        "icon": "💧"
      },
      {
        "step": "쿠션 파운데이션",
        "detail": "자연스러운 커버",
        "icon": "✨"
      },
      {
        "step": "셰이딩",
        "detail": "얼굴 윤곽 정리",
        "icon": "🎨"
      }
    ],
    "tip": "부기가 있을 땐 메이크업 전 림프 마사지가 효과적이에요!"
  },
  {
    "skinTexture": "dry",
    "skinConcern": "puffiness",
    "occasion": "special",
    "title": "완벽한 윤곽 특별 메이크업",
    "emoji": "✨",
    "steps": [
      {
        "step": "쿨링 마사지",
        "detail": "얼음 마사지로 부기 제거",
        "icon": "❄️"
      },
      {
        "step": "프라이머",
        "detail": "매끈한 베이스",
        "icon": "💫"
      },
      {
        "step": "파운데이션",
        "detail": "고커버리지",
        "icon": "✨"
      },
      {
        "step": "컨투어링",
        "detail": "입체적인 윤곽",
        "icon": "🎨"
      }
    ],
    "tip": "특별한 날엔 쿨링 마사지와 컨투어링으로 완벽한 윤곽을 만드세요!"
  },
  {
    "skinTexture": "dry",
    "skinConcern": "puffiness",
    "occasion": "casual",
    "title": "간편 부기 케어",
    "emoji": "🧊",
    "steps": [
      {
        "step": "냉장 스푼 마사지",
        "detail": "빠른 부기 제거",
        "icon": "🥄"
      },
      {
        "step": "수분 크림",
        "detail": "가벼운 보습",
        "icon": "💧"
      },
      {
        "step": "BB크림",
        "detail": "간편하게",
        "icon": "✨"
      }
    ],
    "tip": "바쁜 아침엔 차가운 스푼으로 빠르게 부기를 빼세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "dullness",
    "occasion": "daily",
    "title": "생기 넘치는 데일리 메이크업",
    "emoji": "🌟",
    "steps": [
      {
        "step": "비타민 세럼",
        "detail": "피부 톤업",
        "icon": "🍊"
      },
      {
        "step": "광채 베이스",
        "detail": "자연스러운 빛",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "균일한 피부톤",
        "icon": "💫"
      },
      {
        "step": "블러셔",
        "detail": "생기 있는 볼",
        "icon": "🌸"
      }
    ],
    "tip": "칙칙함은 비타민 세럼으로 먼저 잡아주세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "dullness",
    "occasion": "special",
    "title": "화사한 특별한 날 메이크업",
    "emoji": "💎",
    "steps": [
      {
        "step": "브라이트닝 마스크",
        "detail": "집중 톤업",
        "icon": "✨"
      },
      {
        "step": "글로우 프라이머",
        "detail": "빛나는 베이스",
        "icon": "🌟"
      },
      {
        "step": "파운데이션",
        "detail": "완벽한 피부 표현",
        "icon": "💫"
      },
      {
        "step": "하이라이터",
        "detail": "입체적인 광채",
        "icon": "💎"
      }
    ],
    "tip": "특별한 날엔 브라이트닝 마스크로 완벽한 광채를 준비하세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "dullness",
    "occasion": "casual",
    "title": "가볍게 빛나는 메이크업",
    "emoji": "☀️",
    "steps": [
      {
        "step": "비타민 크림",
        "detail": "간편 톤업",
        "icon": "🍊"
      },
      {
        "step": "쿠션",
        "detail": "가볍게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "생기 있는 입술",
        "icon": "💋"
      }
    ],
    "tip": "가벼운 외출엔 비타민 크림과 쿠션으로 충분해요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "redness",
    "occasion": "daily",
    "title": "안정감 있는 데일리 메이크업",
    "emoji": "🌿",
    "steps": [
      {
        "step": "진정 토너",
        "detail": "붉은기 진정",
        "icon": "💚"
      },
      {
        "step": "그린 베이스",
        "detail": "컬러 보정",
        "icon": "💚"
      },
      {
        "step": "파운데이션",
        "detail": "균일한 톤",
        "icon": "✨"
      },
      {
        "step": "내추럴 블러셔",
        "detail": "자연스러운 혈색",
        "icon": "🌸"
      }
    ],
    "tip": "보통 피부도 붉은기가 있다면 그린 베이스는 필예요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "redness",
    "occasion": "special",
    "title": "완벽한 톤 특별 메이크업",
    "emoji": "🌹",
    "steps": [
      {
        "step": "진정 에센스",
        "detail": "붉은기 집중 케어",
        "icon": "🌿"
      },
      {
        "step": "컬러 프라이머",
        "detail": "완벽한 톤 보정",
        "icon": "💚"
      },
      {
        "step": "롱라스팅 파운데이션",
        "detail": "하루 종일 유지",
        "icon": "✨"
      },
      {
        "step": "포인트 메이크업",
        "detail": "눈과 입술 강조",
        "icon": "💄"
      }
    ],
    "tip": "중요한 순간엔 컬러 프라이머로 완벽한 톤을 만드세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "redness",
    "occasion": "casual",
    "title": "편안한 톤 보정 메이크업",
    "emoji": "🧘",
    "steps": [
      {
        "step": "진정 크림",
        "detail": "붉은기 관리",
        "icon": "🌿"
      },
      {
        "step": "컬러 BB크림",
        "detail": "톤 보정 + 커버",
        "icon": "💚"
      },
      {
        "step": "립밤",
        "detail": "촉촉함",
        "icon": "💋"
      }
    ],
    "tip": "편안한 외출엔 컬러 BB크림 하나로 충분해요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "puffiness",
    "occasion": "daily",
    "title": "또렷한 인상 데일리 메이크업",
    "emoji": "💆",
    "steps": [
      {
        "step": "림프 마사지",
        "detail": "부기 제거",
        "icon": "💆"
      },
      {
        "step": "프라이머",
        "detail": "매끈한 베이스",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "자연스러운 커버",
        "icon": "💫"
      },
      {
        "step": "셰이딩",
        "detail": "윤곽 정리",
        "icon": "🎨"
      }
    ],
    "tip": "아침 부기는 림프 마사지로 빠르게 빼세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "puffiness",
    "occasion": "special",
    "title": "조각같은 특별 메이크업",
    "emoji": "🎨",
    "steps": [
      {
        "step": "쿨링 마사지",
        "detail": "완벽한 부기 제거",
        "icon": "❄️"
      },
      {
        "step": "프라이머",
        "detail": "오래 지속되는 베이스",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "완벽한 커버",
        "icon": "💫"
      },
      {
        "step": "컨투어링",
        "detail": "입체적인 얼굴",
        "icon": "🎨"
      }
    ],
    "tip": "특별한 날엔 컨투어링으로 조각같은 얼굴을 만드세요!"
  },
  {
    "skinTexture": "normal",
    "skinConcern": "puffiness",
    "occasion": "casual",
    "title": "간편 윤곽 메이크업",
    "emoji": "🧊",
    "steps": [
      {
        "step": "아이스 마사지",
        "detail": "빠른 부기 제거",
        "icon": "🧊"
      },
      {
        "step": "BB크림",
        "detail": "간편하게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "포인트",
        "icon": "💋"
      }
    ],
    "tip": "바쁜 아침엔 얼음 마사지가 가장 빠른 해결책이에요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dullness",
    "occasion": "daily",
    "title": "매트 & 브라이트 데일리",
    "emoji": "🌟",
    "steps": [
      {
        "step": "피지 조절 토너",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 프라이머",
        "detail": "번들거림 방지",
        "icon": "💫"
      },
      {
        "step": "세미 매트 파운데이션",
        "detail": "밝고 매트하게",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "지속력",
        "icon": "💎"
      }
    ],
    "tip": "지성 피부는 매트 프라이머가 핵심이에요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dullness",
    "occasion": "special",
    "title": "오래 지속되는 화사한 메이크업",
    "emoji": "💫",
    "steps": [
      {
        "step": "모공 케어 세럼",
        "detail": "피지 조절",
        "icon": "🌿"
      },
      {
        "step": "포어 프라이머",
        "detail": "매끈한 베이스",
        "icon": "✨"
      },
      {
        "step": "매트 파운데이션",
        "detail": "완벽한 피부 표현",
        "icon": "💫"
      },
      {
        "step": "픽싱 파우더",
        "detail": "하루 종일 유지",
        "icon": "💎"
      }
    ],
    "tip": "특별한 날엔 포어 프라이머로 완벽한 베이스를 만드세요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dullness",
    "occasion": "casual",
    "title": "산뜻한 매트 메이크업",
    "emoji": "☀️",
    "steps": [
      {
        "step": "피지 조절 크림",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 쿠션",
        "detail": "간편하게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "생기",
        "icon": "💋"
      }
    ],
    "tip": "지성 피부는 매트 쿠션으로 간편하게!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "redness",
    "occasion": "daily",
    "title": "피지 조절 & 진정 데일리",
    "emoji": "🌿",
    "steps": [
      {
        "step": "진정 토너",
        "detail": "붉은기 + 피지 케어",
        "icon": "💚"
      },
      {
        "step": "그린 프라이머",
        "detail": "컬러 보정 + 매트",
        "icon": "💚"
      },
      {
        "step": "세미 매트 파운데이션",
        "detail": "균일한 톤",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "피지 조절",
        "icon": "💎"
      }
    ],
    "tip": "지성+붉은기는 그린 프라이머가 해답이에요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "redness",
    "occasion": "special",
    "title": "완벽한 매트 특별 메이크업",
    "emoji": "🌹",
    "steps": [
      {
        "step": "진정 에센스",
        "detail": "붉은기 집중 케어",
        "icon": "🌿"
      },
      {
        "step": "컬러 프라이머",
        "detail": "완벽한 톤 보정",
        "icon": "💚"
      },
      {
        "step": "매트 파운데이션",
        "detail": "오래 지속",
        "icon": "✨"
      },
      {
        "step": "픽싱 파우더",
        "detail": "완벽한 마무리",
        "icon": "💎"
      }
    ],
    "tip": "중요한 날엔 진정+매트 콤보로 완벽하게!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "redness",
    "occasion": "casual",
    "title": "편안한 진정 매트 메이크업",
    "emoji": "🧘",
    "steps": [
      {
        "step": "진정 크림",
        "detail": "붉은기 케어",
        "icon": "🌿"
      },
      {
        "step": "컬러 쿠션",
        "detail": "톤 보정",
        "icon": "💚"
      },
      {
        "step": "파우더",
        "detail": "피지 조절",
        "icon": "💎"
      }
    ],
    "tip": "편안한 외출엔 진정 크림과 컬러 쿠션으로!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "puffiness",
    "occasion": "daily",
    "title": "부기 케어 매트 데일리",
    "emoji": "💆",
    "steps": [
      {
        "step": "림프 마사지",
        "detail": "부기 제거",
        "icon": "💆"
      },
      {
        "step": "매트 프라이머",
        "detail": "피지 조절",
        "icon": "✨"
      },
      {
        "step": "세미 매트 파운데이션",
        "detail": "자연스럽게",
        "icon": "💫"
      },
      {
        "step": "셰이딩",
        "detail": "윤곽 정리",
        "icon": "🎨"
      }
    ],
    "tip": "부기+지성 피부는 림프 마사지 후 매트 제품으로!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "puffiness",
    "occasion": "special",
    "title": "완벽한 윤곽 매트 메이크업",
    "emoji": "🎨",
    "steps": [
      {
        "step": "쿨링 마사지",
        "detail": "완벽한 부기 제거",
        "icon": "❄️"
      },
      {
        "step": "포어 프라이머",
        "detail": "매끈한 베이스",
        "icon": "✨"
      },
      {
        "step": "매트 파운데이션",
        "detail": "완벽한 커버",
        "icon": "💫"
      },
      {
        "step": "컨투어링",
        "detail": "조각같은 얼굴",
        "icon": "🎨"
      }
    ],
    "tip": "특별한 날엔 쿨링 마사지+컨투어링으로 완벽하게!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "puffiness",
    "occasion": "casual",
    "title": "간편 매트 윤곽 메이크업",
    "emoji": "🧊",
    "steps": [
      {
        "step": "아이스 마사지",
        "detail": "빠른 부기 제거",
        "icon": "🧊"
      },
      {
        "step": "매트 쿠션",
        "detail": "간편하게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "포인트",
        "icon": "💋"
      }
    ],
    "tip": "바쁜 아침엔 얼음+매트 쿠션으로 빠르게!"
  }
];

export const MALE_LOOKS: readonly MakeupLook[] = [
  {
    "skinTexture": "rough",
    "skinConcern": "beard",
    "occasion": "business",
    "title": "신뢰감 있는 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "각질 정리",
        "detail": "스크럽으로 피부결 매끄럽게",
        "icon": "🧼"
      },
      {
        "step": "수염 정돈",
        "detail": "깔끔한 라인 트리밍",
        "icon": "🪒"
      },
      {
        "step": "톤업 크림",
        "detail": "얼굴 전체 톤 균일하게",
        "icon": "✨"
      },
      {
        "step": "눈썹 정리",
        "detail": "또렷한 인상",
        "icon": "✏️"
      },
      {
        "step": "립밤",
        "detail": "건조함 방지",
        "icon": "💧"
      }
    ],
    "tip": "비즈니스 미팅에서는 깔끔한 수염 라인이 신뢰감을 높여줍니다."
  },
  {
    "skinTexture": "rough",
    "skinConcern": "beard",
    "occasion": "date",
    "title": "훈훈한 인상 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공까지 깨끗하게",
        "icon": "🧼"
      },
      {
        "step": "보습 세럼",
        "detail": "피부에 생기 충전",
        "icon": "💧"
      },
      {
        "step": "수염 오일",
        "detail": "부드러운 수염 연출",
        "icon": "🪒"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 피부톤 보정",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "촉촉한 입술",
        "icon": "💋"
      }
    ],
    "tip": "데이트에는 자연스러운 생기가 핵심! 과하지 않게 정돈하세요."
  },
  {
    "skinTexture": "rough",
    "skinConcern": "beard",
    "occasion": "casual",
    "title": "깔끔한 일상 그루밍",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "미지근한 물로 부드럽게",
        "icon": "💧"
      },
      {
        "step": "수염 트리머",
        "detail": "길이만 정리",
        "icon": "🪒"
      },
      {
        "step": "올인원 크림",
        "detail": "간편한 보습",
        "icon": "🧴"
      },
      {
        "step": "선크림",
        "detail": "자외선 차단",
        "icon": "☀️"
      }
    ],
    "tip": "일상에서는 최소한의 정돈으로 자연스럽게!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "beard",
    "occasion": "gathering",
    "title": "지인들과 친목모임 수염 케어",
    "emoji": "👔",
    "steps": [
      {
        "step": "깔끔한 세안",
        "detail": "친목모임 전 정돈",
        "icon": "💧"
      },
      {
        "step": "수염 정리",
        "detail": "단정하게 다듬기",
        "icon": "🪒"
      },
      {
        "step": "보습 크림",
        "detail": "수분 공급",
        "icon": "🧴"
      }
    ],
    "tip": "지인들과의 친목모임 전엔 깔끔하게! 수염을 정돈하고 보습으로 마무리하세요."
  },
  {
    "skinTexture": "rough",
    "skinConcern": "dull",
    "occasion": "business",
    "title": "피로 흔적 삭제 비즈니스 솔루션",
    "emoji": "💼",
    "steps": [
      {
        "step": "비타민 세럼",
        "detail": "칙칙함 개선",
        "icon": "🍊"
      },
      {
        "step": "톤업 베이스",
        "detail": "밝은 피부톤",
        "icon": "✨"
      },
      {
        "step": "다크서클 커버",
        "detail": "눈 밑 어두움 제거",
        "icon": "👁️"
      },
      {
        "step": "립밤",
        "detail": "입술 컬러",
        "icon": "💧"
      },
      {
        "step": "픽싱 스프레이",
        "detail": "지속력",
        "icon": "💫"
      }
    ],
    "tip": "피곤해 보이는 인상은 톤업 제품으로 즉시 개선됩니다."
  },
  {
    "skinTexture": "rough",
    "skinConcern": "dull",
    "occasion": "date",
    "title": "생기 넘치는 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "각질 제거",
        "detail": "피부결 매끄럽게",
        "icon": "🧼"
      },
      {
        "step": "브라이트닝 크림",
        "detail": "피부 톤업",
        "icon": "✨"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 커버",
        "icon": "💫"
      },
      {
        "step": "아이브로우",
        "detail": "또렷한 눈썹",
        "icon": "✏️"
      }
    ],
    "tip": "첫인상이 중요한 날엔 브라이트닝 제품으로 준비하세요!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "dull",
    "occasion": "casual",
    "title": "산뜻한 일상 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "깔끔하게",
        "icon": "💧"
      },
      {
        "step": "올인원 크림",
        "detail": "간편 보습",
        "icon": "🧴"
      },
      {
        "step": "선크림",
        "detail": "UV 차단",
        "icon": "☀️"
      }
    ],
    "tip": "일상에서는 선크림만 잘 발라도 OK!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "dull",
    "occasion": "gathering",
    "title": "친목모임 준비 브라이트닝",
    "emoji": "✨",
    "steps": [
      {
        "step": "깔끔한 세안",
        "detail": "피부 정돈",
        "icon": "💧"
      },
      {
        "step": "비타민 크림",
        "detail": "피부 톤 개선",
        "icon": "🍊"
      },
      {
        "step": "가벼운 톤업",
        "detail": "화사한 인상",
        "icon": "🌟"
      }
    ],
    "tip": "지인들과의 친목모임 전 비타민 케어로 칙칙함을 개선하고 톤업으로 화사하게!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "trouble",
    "occasion": "business",
    "title": "트러블 커버 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "진정 토너",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "그린 베이스",
        "detail": "붉은기 톤 보정",
        "icon": "💚"
      },
      {
        "step": "컨실러",
        "detail": "포인트 커버",
        "icon": "🎨"
      },
      {
        "step": "파우더",
        "detail": "매트 픽싱",
        "icon": "💫"
      }
    ],
    "tip": "트러블이 있을 땐 진정+커버가 핵심입니다."
  },
  {
    "skinTexture": "rough",
    "skinConcern": "trouble",
    "occasion": "date",
    "title": "자연스러운 트러블 케어",
    "emoji": "🕺",
    "steps": [
      {
        "step": "진정 크림",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "컬러 보정",
        "detail": "붉은기 중화",
        "icon": "💚"
      },
      {
        "step": "BB크림",
        "detail": "가벼운 커버",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "포인트 전환",
        "icon": "💋"
      }
    ],
    "tip": "트러블이 있어도 자연스럽게 커버할 수 있어요!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "trouble",
    "occasion": "casual",
    "title": "편안한 진정 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "순한 세안",
        "detail": "자극 최소화",
        "icon": "💧"
      },
      {
        "step": "진정 크림",
        "detail": "트러블 케어",
        "icon": "🌿"
      },
      {
        "step": "선크림",
        "detail": "자극 없는 제품",
        "icon": "☀️"
      }
    ],
    "tip": "트러블이 있을 땐 자극을 최소화하세요!"
  },
  {
    "skinTexture": "rough",
    "skinConcern": "trouble",
    "occasion": "gathering",
    "title": "친목모임 준비 트러블 케어",
    "emoji": "🌿",
    "steps": [
      {
        "step": "미온수 세안",
        "detail": "자극 없이 깨끗하게",
        "icon": "💧"
      },
      {
        "step": "진정 토너",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "가벼운 커버",
        "detail": "자연스럽게 정돈",
        "icon": "🎨"
      }
    ],
    "tip": "지인들과의 친목모임 전 트러블을 진정시키고 가볍게 커버하면 자신감 UP!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "beard",
    "occasion": "business",
    "title": "완벽한 비즈니스 피니시",
    "emoji": "💼",
    "steps": [
      {
        "step": "수염 정리",
        "detail": "완벽한 라인 트리밍",
        "icon": "🪒"
      },
      {
        "step": "애프터쉐이브",
        "detail": "피부 진정",
        "icon": "💧"
      },
      {
        "step": "톤업 크림",
        "detail": "균일한 피부톤",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "매트 픽싱",
        "icon": "💫"
      }
    ],
    "tip": "매끈한 피부는 정돈만 잘해도 완벽합니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "beard",
    "occasion": "date",
    "title": "훈훈한 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "수염 관리",
        "detail": "부드럽게 정돈",
        "icon": "🪒"
      },
      {
        "step": "수염 오일",
        "detail": "윤기있게",
        "icon": "✨"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 톤업",
        "icon": "💫"
      },
      {
        "step": "립밤",
        "detail": "촉촉함",
        "icon": "💋"
      }
    ],
    "tip": "깔끔한 피부에 적당한 수염이 훈훈함을 더해줍니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "beard",
    "occasion": "casual",
    "title": "간편한 일상 정돈",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "깔끔하게",
        "icon": "💧"
      },
      {
        "step": "수염 트리머",
        "detail": "길이 정리",
        "icon": "🪒"
      },
      {
        "step": "선크림",
        "detail": "UV 차단",
        "icon": "☀️"
      }
    ],
    "tip": "깔끔한 피부는 간단한 정돈만으로 충분해요!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "beard",
    "occasion": "gathering",
    "title": "친목모임용 수염 정돈",
    "emoji": "✂️",
    "steps": [
      {
        "step": "깔끔한 세안",
        "detail": "친목모임 준비",
        "icon": "💧"
      },
      {
        "step": "수염 다듬기",
        "detail": "단정하게 정리",
        "icon": "🪒"
      },
      {
        "step": "수염 오일",
        "detail": "윤기 있게 마무리",
        "icon": "✨"
      }
    ],
    "tip": "지인들과의 친목모임 전 수염을 단정하게 정돈하면 인상이 달라져요!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "dull",
    "occasion": "business",
    "title": "활기찬 비즈니스 룩",
    "emoji": "💼",
    "steps": [
      {
        "step": "비타민 세럼",
        "detail": "피부 활력",
        "icon": "🍊"
      },
      {
        "step": "톤업 크림",
        "detail": "밝은 인상",
        "icon": "✨"
      },
      {
        "step": "아이크림",
        "detail": "다크서클 케어",
        "icon": "👁️"
      },
      {
        "step": "립밤",
        "detail": "입술 컬러",
        "icon": "💧"
      }
    ],
    "tip": "칙칙함은 톤업 제품으로 즉시 개선됩니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "dull",
    "occasion": "date",
    "title": "생기 넘치는 데이트 룩",
    "emoji": "🕺",
    "steps": [
      {
        "step": "브라이트닝 크림",
        "detail": "피부 톤업",
        "icon": "✨"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 광채",
        "icon": "💫"
      },
      {
        "step": "립밤",
        "detail": "생기있는 입술",
        "icon": "💋"
      }
    ],
    "tip": "밝은 인상이 호감도를 높여줍니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "dull",
    "occasion": "casual",
    "title": "산뜻한 일상 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "깨끗하게",
        "icon": "💧"
      },
      {
        "step": "보습 크림",
        "detail": "가벼운 보습",
        "icon": "🧴"
      },
      {
        "step": "선크림",
        "detail": "UV 차단",
        "icon": "☀️"
      }
    ],
    "tip": "일상에서는 기본 케어만으로 충분해요!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "dull",
    "occasion": "gathering",
    "title": "친목모임용 생기 UP",
    "emoji": "💫",
    "steps": [
      {
        "step": "깔끔한 세안",
        "detail": "친목모임 준비",
        "icon": "💧"
      },
      {
        "step": "비타민 세럼",
        "detail": "피부 톤 개선",
        "icon": "🍊"
      },
      {
        "step": "톤업 크림",
        "detail": "화사한 피부",
        "icon": "✨"
      }
    ],
    "tip": "지인들과의 친목모임 전 비타민 세럼과 톤업으로 생기 있는 인상을 만드세요!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "trouble",
    "occasion": "business",
    "title": "트러블 커버 비즈니스 솔루션",
    "emoji": "💼",
    "steps": [
      {
        "step": "진정 토너",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "그린 베이스",
        "detail": "붉은기 보정",
        "icon": "💚"
      },
      {
        "step": "컨실러",
        "detail": "포인트 버",
        "icon": "🎨"
      },
      {
        "step": "파우더",
        "detail": "매트 픽싱",
        "icon": "💫"
      }
    ],
    "tip": "트러블도 컬러 보정으로 깔끔하게 커버됩니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "trouble",
    "occasion": "date",
    "title": "자연스러운 트러블 케어",
    "emoji": "🕺",
    "steps": [
      {
        "step": "진정 크림",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "컬러 보정",
        "detail": "붉은기 중화",
        "icon": "💚"
      },
      {
        "step": "BB크림",
        "detail": "가벼운 커버",
        "icon": "✨"
      }
    ],
    "tip": "자연스러운 커버가 더 매력적입니다!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "trouble",
    "occasion": "casual",
    "title": "편안한 진정 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "순한 세안",
        "detail": "자극 최소화",
        "icon": "💧"
      },
      {
        "step": "진정 크림",
        "detail": "트러블 케어",
        "icon": "🌿"
      },
      {
        "step": "선크림",
        "detail": "자극 없는 제품",
        "icon": "☀️"
      }
    ],
    "tip": "트러블이 있을 땐 자극을 피하세요!"
  },
  {
    "skinTexture": "smooth",
    "skinConcern": "trouble",
    "occasion": "gathering",
    "title": "친목모임 준비 트러블 관리",
    "emoji": "🎯",
    "steps": [
      {
        "step": "미온수 세안",
        "detail": "자극 없이",
        "icon": "💧"
      },
      {
        "step": "진정 토너",
        "detail": "트러블 케어",
        "icon": "🌿"
      },
      {
        "step": "가벼운 커버",
        "detail": "자연스럽게",
        "icon": "🎨"
      }
    ],
    "tip": "지인들과의 친목모임 전 진정 케어 후 가볍게 커버하면 자신감이 생겨요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "beard",
    "occasion": "business",
    "title": "피지 제로 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공 속 피지 제거",
        "icon": "🧼"
      },
      {
        "step": "수염 정리",
        "detail": "깔끔한 라인",
        "icon": "🪒"
      },
      {
        "step": "매트 크림",
        "detail": "피지 조절",
        "icon": "💫"
      },
      {
        "step": "파우더",
        "detail": "T존 픽싱",
        "icon": "✨"
      }
    ],
    "tip": "지성 피부는 매트 제품이 핵심입니다!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "beard",
    "occasion": "date",
    "title": "산뜻한 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "피지 조절 토너",
        "detail": "유분 밸런스",
        "icon": "🌿"
      },
      {
        "step": "수염 관리",
        "detail": "부드럽게 정돈",
        "icon": "🪒"
      },
      {
        "step": "매트 BB크림",
        "detail": "번들거림 방지",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "지속력",
        "icon": "💫"
      }
    ],
    "tip": "데이트에서 번들거림은 금물! 매트하게 정돈하세요."
  },
  {
    "skinTexture": "oily",
    "skinConcern": "beard",
    "occasion": "casual",
    "title": "깔끔한 피지 조절",
    "emoji": "🧢",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공 케어",
        "icon": "🧼"
      },
      {
        "step": "수염 트리머",
        "detail": "간단히 정리",
        "icon": "🪒"
      },
      {
        "step": "매트 선크림",
        "detail": "피지 조절",
        "icon": "☀️"
      }
    ],
    "tip": "지성 피부는 끗한 클렌징이 기본입니다!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "beard",
    "occasion": "gathering",
    "title": "친목모임용 피지 & 수염 관리",
    "emoji": "🎩",
    "steps": [
      {
        "step": "깔끔한 클렌징",
        "detail": "피지 제거",
        "icon": "🧼"
      },
      {
        "step": "수염 다듬기",
        "detail": "단정하게",
        "icon": "🪒"
      },
      {
        "step": "매트 크림",
        "detail": "번들거림 방지",
        "icon": "✨"
      }
    ],
    "tip": "지인들과의 친목모임 전 피지를 제거하고 수염을 정돈하면 깔끔한 인상!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dull",
    "occasion": "business",
    "title": "피지 조절 + 톤업 솔루션",
    "emoji": "💼",
    "steps": [
      {
        "step": "피지 조절 세럼",
        "detail": "유분 밸런스",
        "icon": "🌿"
      },
      {
        "step": "매트 톤업 크림",
        "detail": "밝은 피부톤",
        "icon": "✨"
      },
      {
        "step": "다크서클 커버",
        "detail": "눈 밑 케어",
        "icon": "👁️"
      },
      {
        "step": "픽싱 파우더",
        "detail": "지속력",
        "icon": "💫"
      }
    ],
    "tip": "지성+칙칙함은 매트 톤업 제품이 해답입니다!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dull",
    "occasion": "date",
    "title": "매트 생기 데이트 룩",
    "emoji": "🕺",
    "steps": [
      {
        "step": "피지 조절 토너",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 BB크림",
        "detail": "밝고 산뜻하게",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "번들거림 방지",
        "icon": "💫"
      }
    ],
    "tip": "매트하면서도 생기있는 피부를 만들 수 있어요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dull",
    "occasion": "casual",
    "title": "산뜻한 일상 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공 관리",
        "icon": "🧼"
      },
      {
        "step": "가벼운 보습",
        "detail": "유수분 밸런스",
        "icon": "💧"
      },
      {
        "step": "매트 선크림",
        "detail": "피지 조절",
        "icon": "☀️"
      }
    ],
    "tip": "지성 피부도 보습은 필수입니다!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "dull",
    "occasion": "gathering",
    "title": "친목모임용 매트 생기 케어",
    "emoji": "🌟",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공 속 피지 제거",
        "icon": "🧼"
      },
      {
        "step": "비타민 세럼",
        "detail": "피부 톤 개선",
        "icon": "🍊"
      },
      {
        "step": "매트 톤업",
        "detail": "화사하고 산뜻하게",
        "icon": "✨"
      }
    ],
    "tip": "지인들과의 친목모임 전 피지 제거 후 톤업하면 화사하면서도 번들거림 없이!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "trouble",
    "occasion": "business",
    "title": "피지+트러블 완벽 솔루션",
    "emoji": "💼",
    "steps": [
      {
        "step": "진정 클렌징",
        "detail": "트러블 케어",
        "icon": "🧼"
      },
      {
        "step": "피지 조절 토너",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "그린 베이스",
        "detail": "붉은기 보정",
        "icon": "💚"
      },
      {
        "step": "컨실러 + 파우더",
        "detail": "커버 + 픽싱",
        "icon": "🎨"
      }
    ],
    "tip": "지성+트러블은 진정+피지조절 더블 케어가 필요합니다!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "trouble",
    "occasion": "date",
    "title": "자연스러운 트러블 커버",
    "emoji": "🕺",
    "steps": [
      {
        "step": "진정 토너",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "컬러 보정",
        "detail": "붉은기 중화",
        "icon": "💚"
      },
      {
        "step": "매트 BB크림",
        "detail": "가벼운 커버",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "피지 조절",
        "icon": "💫"
      }
    ],
    "tip": "트러블도 자연스럽게 커버하면서 피지를 조절하세요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "trouble",
    "occasion": "casual",
    "title": "진정 + 피지 조절 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "순한 클렌징",
        "detail": "자극 최소화",
        "icon": "💧"
      },
      {
        "step": "진정 크림",
        "detail": "트러블 케어",
        "icon": "🌿"
      },
      {
        "step": "매트 선크림",
        "detail": "피지 조절",
        "icon": "☀️"
      }
    ],
    "tip": "트러블이 있을 땐 진정에 집중하세요!"
  },
  {
    "skinTexture": "oily",
    "skinConcern": "trouble",
    "occasion": "gathering",
    "title": "친목모임 준비 진정 케어",
    "emoji": "🍃",
    "steps": [
      {
        "step": "순한 클렌징",
        "detail": "자극 없이 깨끗하게",
        "icon": "🧼"
      },
      {
        "step": "진정 토너",
        "detail": "트러블 진정",
        "icon": "🌿"
      },
      {
        "step": "가벼운 커버",
        "detail": "자연스럽게 정돈",
        "icon": "🎨"
      }
    ],
    "tip": "지인들과의 친목모임 전 진정 케어 후 가볍게 커버하면 깔끔한 인상!"
  }
];

export type NoneLook = Omit<MakeupLook, "skinTexture" | "skinConcern" | "occasion">;
export const FEMALE_NONE: Readonly<Record<string, NoneLook>> = {
  "dry-daily": {
    "title": "건강한 피부 유지 데일리 메이크업",
    "emoji": "✨",
    "steps": [
      {
        "step": "보습 크림",
        "detail": "건조한 피부에 수분 충전",
        "icon": "💧"
      },
      {
        "step": "글로우 베이스",
        "detail": "자연스러운 광채",
        "icon": "🌟"
      },
      {
        "step": "쿠션 파운데이션",
        "detail": "가볍게 피부 톤 정리",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "생기 있는 입술",
        "icon": "💋"
      }
    ],
    "tip": "특별한 고민이 없다면 기본 보습과 자연스러운 메이크업이 최고예요!"
  },
  "dry-special": {
    "title": "완벽한 특별한 날 메이크업",
    "emoji": "💫",
    "steps": [
      {
        "step": "수분 마스크",
        "detail": "메이크업 전 집중 보습",
        "icon": "💧"
      },
      {
        "step": "글로우 프라이머",
        "detail": "빛나는 베이스",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "완벽한 피부 표현",
        "icon": "🌟"
      },
      {
        "step": "포인트 메이크업",
        "detail": "눈과 입술 강조",
        "icon": "💄"
      },
      {
        "step": "픽싱 스프레이",
        "detail": "오래 지속",
        "icon": "💫"
      }
    ],
    "tip": "완벽한 컨디션의 피부! 원하는 스타일로 화려하게 연출하세요!"
  },
  "dry-casual": {
    "title": "자연스러운 캐주얼 메이크업",
    "emoji": "🌿",
    "steps": [
      {
        "step": "수분 크림",
        "detail": "가벼운 보습",
        "icon": "💧"
      },
      {
        "step": "틴티드 크림",
        "detail": "색조 보습제로 간편하게",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "촉촉한 입술",
        "icon": "💋"
      }
    ],
    "tip": "피부 상태가 좋을 땐 최소한의 메이크업으로 자연미를 살리세요!"
  },
  "normal-daily": {
    "title": "완벽한 데일리 메이크업",
    "emoji": "🌟",
    "steps": [
      {
        "step": "가벼운 보습",
        "detail": "유수분 밸런스",
        "icon": "💧"
      },
      {
        "step": "프라이머",
        "detail": "매끈한 베이스",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "균일한 피부톤",
        "icon": "💫"
      },
      {
        "step": "블러셔",
        "detail": "생기 있는 볼",
        "icon": "🌸"
      }
    ],
    "tip": "이상적인 피부 컨디션! 원하는 스타일을 자유롭게 연출하세요!"
  },
  "normal-special": {
    "title": "화사한 특별한 날 메이크업",
    "emoji": "💎",
    "steps": [
      {
        "step": "프라이머",
        "detail": "완벽한 베이스",
        "icon": "✨"
      },
      {
        "step": "파운데이션",
        "detail": "완벽한 피부 표현",
        "icon": "🌟"
      },
      {
        "step": "컨투어링",
        "detail": "입체적인 얼굴",
        "icon": "🎨"
      },
      {
        "step": "포인트 메이크업",
        "detail": "눈과 입술 강조",
        "icon": "💄"
      },
      {
        "step": "픽싱 스프레이",
        "detail": "하루 종일 유지",
        "icon": "💫"
      }
    ],
    "tip": "최상의 피부 상태! 화려한 메이크업도 완벽하게 소화할 수 있어요!"
  },
  "normal-casual": {
    "title": "가벼운 자연 메이크업",
    "emoji": "☀️",
    "steps": [
      {
        "step": "가벼운 크림",
        "detail": "기본 보습",
        "icon": "💧"
      },
      {
        "step": "쿠션",
        "detail": "간편하게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "생기 포인트",
        "icon": "💋"
      }
    ],
    "tip": "좋은 피부 컨디션을 그대로 살리는 게 최고예요!"
  },
  "oily-daily": {
    "title": "산뜻한 데일리 메이크업",
    "emoji": "🌟",
    "steps": [
      {
        "step": "피지 조절 토너",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 프라이머",
        "detail": "번들거림 방지",
        "icon": "✨"
      },
      {
        "step": "매트 파운데이션",
        "detail": "깔끔한 피부 표현",
        "icon": "💫"
      },
      {
        "step": "파우더",
        "detail": "지속력",
        "icon": "💎"
      }
    ],
    "tip": "특별한 고민 없이 산뜻하게! 매트 제품으로 완벽하게 마무리하세요!"
  },
  "oily-special": {
    "title": "오래 지속되는 특별 메이크업",
    "emoji": "💫",
    "steps": [
      {
        "step": "피지 조절 세럼",
        "detail": "유분 밸런스",
        "icon": "🌿"
      },
      {
        "step": "포어 프라이머",
        "detail": "매끈한 베이스",
        "icon": "✨"
      },
      {
        "step": "롱라스팅 파운데이션",
        "detail": "완벽한 커버",
        "icon": "🌟"
      },
      {
        "step": "포인트 메이크업",
        "detail": "눈과 입술",
        "icon": "💄"
      },
      {
        "step": "픽싱 파우더",
        "detail": "하루 종일 유지",
        "icon": "💎"
      }
    ],
    "tip": "완벽한 피부 상태! 오래 지속되는 제품으로 특별한 순간을 즐기세요!"
  },
  "oily-casual": {
    "title": "간편 산뜻 메이크업",
    "emoji": "☀️",
    "steps": [
      {
        "step": "피지 조절 크림",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 쿠션",
        "detail": "간편하게",
        "icon": "✨"
      },
      {
        "step": "립틴트",
        "detail": "생기",
        "icon": "💋"
      }
    ],
    "tip": "좋은 컨디션! 매트하게만 유지하면 완벽해요!"
  }
};

export const MALE_NONE: Readonly<Record<string, NoneLook>> = {
  "rough-business": {
    "title": "건강한 피부 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "각질 제거",
        "detail": "피부결 정리",
        "icon": "🧼"
      },
      {
        "step": "보습 크림",
        "detail": "수분 공급",
        "icon": "💧"
      },
      {
        "step": "톤업 크림",
        "detail": "깔끔한 피부톤",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "건조함 방지",
        "icon": "💋"
      }
    ],
    "tip": "특별한 고민 없이 기본만 잘 유지하면 완벽한 인상을 줄 수 있어요!"
  },
  "rough-date": {
    "title": "자연스러운 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "깨끗한 피부",
        "icon": "🧼"
      },
      {
        "step": "보습 세럼",
        "detail": "피부 생기",
        "icon": "💧"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 톤업",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "촉촉함",
        "icon": "💋"
      }
    ],
    "tip": "좋은 컨디션! 자연스럽게 정돈만 해도 훌륭해요!"
  },
  "rough-casual": {
    "title": "간편 일상 그루밍",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "깔끔하게",
        "icon": "💧"
      },
      {
        "step": "보습 크림",
        "detail": "간편 보습",
        "icon": "🧴"
      },
      {
        "step": "선크림",
        "detail": "UV 차단",
        "icon": "☀️"
      }
    ],
    "tip": "피부 상태가 좋을 땐 기본 케어만으로 충분해요!"
  },
  "rough-gathering": {
    "title": "친목모임용 퀵 케어",
    "emoji": "🎯",
    "steps": [
      {
        "step": "깔끔한 세안",
        "detail": "친목모임 준비",
        "icon": "💧"
      },
      {
        "step": "보습 크림",
        "detail": "수분 공급",
        "icon": "🧴"
      },
      {
        "step": "가벼운 톤업",
        "detail": "화사한 인상",
        "icon": "✨"
      }
    ],
    "tip": "지인들과의 친목모임 전 간단하게! 기본 보습과 톤업으로 좋은 인상을 만드세요!"
  },
  "smooth-business": {
    "title": "완벽한 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "보습 크림",
        "detail": "피부 정리",
        "icon": "💧"
      },
      {
        "step": "톤업 크림",
        "detail": "밝은 인상",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "매트 마무리",
        "icon": "💫"
      }
    ],
    "tip": "이상적인 피부 상태! 간단한 정돈으로 완벽한 인상을 만드세요!"
  },
  "smooth-date": {
    "title": "자신감 넘치는 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "가벼운 보습",
        "detail": "피부 정돈",
        "icon": "💧"
      },
      {
        "step": "BB크림",
        "detail": "자연스러운 톤업",
        "icon": "✨"
      },
      {
        "step": "립밤",
        "detail": "생기",
        "icon": "💋"
      }
    ],
    "tip": "완벽한 피부! 최소한의 정돈으로 자신감을 표현하세요!"
  },
  "smooth-casual": {
    "title": "자연스러운 일상 케어",
    "emoji": "🧢",
    "steps": [
      {
        "step": "세안",
        "detail": "깨끗하게",
        "icon": "💧"
      },
      {
        "step": "보습 크림",
        "detail": "간단히",
        "icon": "🧴"
      },
      {
        "step": "선크림",
        "detail": "UV 차단",
        "icon": "☀️"
      }
    ],
    "tip": "좋은 피부 상태를 유지하는 게 최선이에요!"
  },
  "smooth-gathering": {
    "title": "친목모임용 심플 케어",
    "emoji": "✨",
    "steps": [
      {
        "step": "가벼운 세안",
        "detail": "깔끔하게",
        "icon": "💧"
      },
      {
        "step": "수분 크림",
        "detail": "보습",
        "icon": "🧴"
      },
      {
        "step": "톤업 크림",
        "detail": "화사한 피부",
        "icon": "✨"
      }
    ],
    "tip": "완벽한 피부 상태! 지인들과의 친목모임 전 간단한 톤업만으로 충분해요!"
  },
  "oily-business": {
    "title": "산뜻한 비즈니스 그루밍",
    "emoji": "💼",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "피지 제거",
        "icon": "🧼"
      },
      {
        "step": "매트 크림",
        "detail": "피지 조절",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "T존 픽싱",
        "icon": "💫"
      }
    ],
    "tip": "특별한 문제 없이 산뜻하게! 매트 제품으로 완벽하게 유지하세요!"
  },
  "oily-date": {
    "title": "깔끔한 데이트 그루밍",
    "emoji": "🕺",
    "steps": [
      {
        "step": "피지 조절 토너",
        "detail": "유분 정리",
        "icon": "🌿"
      },
      {
        "step": "매트 BB크림",
        "detail": "산뜻한 피부",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "지속력",
        "icon": "💫"
      }
    ],
    "tip": "좋은 상태! 매트하게만 관리하면 완벽해요!"
  },
  "oily-casual": {
    "title": "간편 피지 조절",
    "emoji": "🧢",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "모공 케어",
        "icon": "🧼"
      },
      {
        "step": "가벼운 보습",
        "detail": "유수분 밸런스",
        "icon": "💧"
      },
      {
        "step": "매트 선크림",
        "detail": "피지 조절",
        "icon": "☀️"
      }
    ],
    "tip": "좋은 컨디션! 기본 관리만 잘하면 돼요!"
  },
  "oily-gathering": {
    "title": "친목모임용 매트 케어",
    "emoji": "💫",
    "steps": [
      {
        "step": "딥 클렌징",
        "detail": "피지 제거",
        "icon": "🧼"
      },
      {
        "step": "매트 크림",
        "detail": "유수분 밸런스",
        "icon": "✨"
      },
      {
        "step": "파우더",
        "detail": "번들거림 방지",
        "icon": "💫"
      }
    ],
    "tip": "지인들과의 친목모임 전 피지를 제거하고 매트하게 마무리하면 산뜻해요!"
  }
};
