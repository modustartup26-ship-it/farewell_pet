# farewell pet · 산책 지도

반려견 프로필(체급·약·성격)을 먼저 입력하고, 산책로처럼 이어진 지도에서 병원·호텔·유치원·미용실을 골라 조건을 하나씩 대조해 보는 프로토타입입니다.

- 첫 화면: `index.html`
- 우리 아이 등록(질문 한 개씩 + 건강 고민 + 미니미 꾸미기 + 성격 검사 MCPQ-R): `profile.html`
- 산책 지도 · 필터링 · 상세: `services.html`
- 보호자 문의함: `inbox.html` / 업체 문의함: `partner.html` (Supabase, 스키마는 `supabase/migrations/`)
- 수의사 1:1 상담: `consult.html` (Supabase 이메일 인증·실시간 채팅)

로그인 세션은 현재 브라우저 탭에만 저장됩니다. 사이트 내부 페이지 이동과 새로고침 중에는 유지되고, 탭을 닫으면 자동으로 종료됩니다.

호텔·유치원·미용 업체와 요금은 화면 설명용 예시입니다. 병원 3곳은 공개 정보이며, 진료 조건은 병원에 직접 확인해야 합니다.

위치 지도와 길찾기는 카카오맵(`kakaomap.js`)을 쓰며, 카카오 개발자 콘솔에 등록한 도메인에서만 표시됩니다.

로그인하지 않아도 아이 등록 페이지에서 임시 프로필을 만들고 서비스를 둘러볼 수 있습니다. 임시 프로필은 이 브라우저에만 저장되며 계정이나 다른 기기와 동기화되지 않습니다. 아이 정보를 계정별로 저장하려면 `supabase/migrations/20261112_create_pet_profiles.sql`을 사이트에서 사용하는 Supabase 프로젝트의 SQL Editor에서 실행하고 로그인하세요. 로그인한 첫 계정에는 기존 브라우저 프로필이 한 번 옮겨지며, 이후에는 계정에 저장된 프로필을 사용합니다. 로그아웃하면 이 기기의 계정 프로필 캐시만 지우며, 계정에 저장된 정보는 유지됩니다. 찜한 곳과 일기는 기존처럼 브라우저에 저장됩니다.

수의사 상담을 활성화하려면 `supabase/migrations/20261110_create_vet_consultations.sql`도 SQL Editor에서 실행하고, Auth의 Redirect URLs에 `http://localhost:5175/profile.html`, `http://localhost:5175/consult.html`과 배포 도메인의 `/profile.html`, `/consult.html`을 등록하세요. 수의사는 이메일 로그인 후 프로필과 면허 번호를 제출합니다. 운영자는 면허를 별도로 확인한 뒤 신청자의 `user_id`를 확인하고 승인할 수 있습니다.

```sql
update public.veterinarian_applications
set status = 'approved'
where user_id = '신청자의 auth user UUID';
```

승인 시 수의사 프로필이 자동으로 만들어지며, 수의사가 상담 가능 여부를 켜면 고객 목록에 상담 시작 버튼이 표시됩니다. 거절은 `status = 'rejected'`로 변경합니다. 면허 번호는 공개 프로필에 포함되지 않습니다.

로컬 실행(PowerShell):

```powershell
$env:GEMINI_API_KEY="Google AI Studio에서 발급한 API 키"
node server.cjs
```

브라우저에서 http://localhost:5175 를 열면 AI 상담 버튼을 사용할 수 있습니다. [Google AI Studio에서 Gemini API 키](https://aistudio.google.com/api-keys)를 발급한 뒤 서버 환경 변수 `GEMINI_API_KEY`로 설정하세요. 기본 모델은 응답이 빠르고 가벼운 `gemini-3.5-flash-lite`이며, `GEMINI_MODEL` 환경 변수로 바꿀 수 있습니다. API 키는 브라우저 코드에 넣지 마세요.

Gemini API에는 무료 사용 등급이 있지만 모델과 계정별 사용량 제한이 적용됩니다. 무료 등급에 입력한 콘텐츠는 Google 제품 개선에 사용될 수 있으므로 민감한 개인정보나 건강 정보를 입력하지 않도록 안내하세요. 최신 한도와 조건은 [Gemini API 요금 안내](https://ai.google.dev/gemini-api/docs/pricing)에서 확인하세요.

GitHub Pages 같은 정적 호스팅은 API 서버를 실행하지 않으므로 AI 상담을 제공할 수 없습니다. 배포 시 Node 서버를 함께 호스팅하고 `/api/chat` 요청을 서버에 연결해야 합니다. 공개 운영 전에는 사용자별 인증, 요청 제한 및 비용 한도를 추가하세요.

성격 검사 참고 문헌
- Ley, Bennett & Coleman (2009). Applied Animal Behaviour Science, 116(2–4), 220–227. doi:10.1016/j.applanim.2008.09.009
- Ley, McGreevy & Bennett (2009). Applied Animal Behaviour Science, 119(1–2), 85–90. doi:10.1016/j.applanim.2009.02.027
