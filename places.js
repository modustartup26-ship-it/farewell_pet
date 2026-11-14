/* 시설 데이터와 필터 구성
   - 병원 3곳은 공개 정보(hospitals.js). 세부 조건은 아직 모르므로 '확인 필요'로 둔다.
   - 호텔·돌봄·유치원·미용은 화면 설명용 예시 업체다. 이름·요금·조건 모두 예시이며 화면에 '예시'로 표시한다. */
(function(){
  const T=true,F=false;
  /* 문의 채팅 시연용 가상 업체. Supabase facilities의 test-care와 짝을 이룬다. */
  const examples=[
    {id:'test-care',name:'farewell 테스트 돌봄',kindLabel:'문의 채팅 테스트',cat:'hotel',kinds:['hotel','kinder'],region:'나주시',dist:1,example:true,
     address:'테스트용 가상 주소',phone:null,hours:null,
     description:'문의 채팅을 시험해 보는 가상의 업체예요. 실제로 돌봄을 제공하지 않아요.',
     sizes:{},attrs:{},prices:null}
  ];


  /* 미용실: 보호자가 공유한 Google 비즈니스 프로필과 업체 SNS·지역 프로필에서 확인한 정보 (2026.11.01 확인).
     확인되지 않은 조건은 비워 두어 '확인 필요'로 보이게 한다. */
  const grooming=[
    {id:'groom-barberpet',name:'바버펫',cat:'grooming',kinds:['grooming'],region:'나주시',dist:2,
     address:'전라남도 나주시 교육길 13, 스마트파크 지식산업센터 E동 1-110호 (빛가람동)',phone:'010-3316-2882',
     hours:'10:00 - 18:00 (휴무일은 업체에 확인해 주세요)',
     description:'하이바·귀툭튀 같은 가위컷과 대형견 미용을 한다고 소개하는 빛가람동 미용실이에요. 아이들이 스트레스 받지 않는 미용을 추구한다고 밝히고 있어요.',
     sizes:{대형견:true},
     attrs:{'가위컷':true,'목욕':true},
     source:'https://www.instagram.com/barberpet_naju/',sourceLabel:'바버펫 인스타그램',checked:'2026.11.01',prices:null},
    {id:'groom-rosemary',name:'로즈메리펫뷰티샵',cat:'grooming',kinds:['grooming','hotel'],region:'나주시',dist:2,
     address:'전라남도 나주시 상야4길 10, 패션페이스 1층 122호 (빛가람동)',phone:'010-5878-6082',
     hours:'10:00 - 19:00 · 일요일 휴무',
     description:'완벽한 미용보다 안전하고 스트레스 없는 미용을 추구한다고 소개하는 미용실이에요. 스파·팩 서비스를 하고, 애견호텔과 옷·사료 같은 용품 판매도 함께 운영해요.',
     sizes:{},
     attrs:{'스파':true,'목욕':true,'반려동물 용품 판매':true,'주차장':true},
     source:'https://share.google/EIJ6qS6QGWbP2bP1q',sourceLabel:'Google 비즈니스 프로필',checked:'2026.11.01',prices:null},
    {id:'groom-puppyholic',name:'퍼피홀릭',cat:'grooming',kinds:['grooming'],region:'나주시',dist:4,
     address:'전라남도 나주시 남내1길 10 (남내동)',phone:'061-333-0706',
     hours:'월-토 09:30 - 19:30 · 일요일 휴무',
     description:'나주 원도심 남내동에서 반려견 미용과 용품 판매를 함께 하는 곳이에요.',
     sizes:{},
     attrs:{'반려동물 용품 판매':true},
     source:'https://share.google/cyQYIFFHyFf9Yn44I',sourceLabel:'Google 비즈니스 프로필',checked:'2026.11.01',prices:null}
  ];


  /* 유치원: 업체 인스타그램·Google 비즈니스 프로필·지역 프로필(당근)에서 확인한 정보 (2026.11.01 확인) */
  const kindergartens=[
    {id:'kinder-paradise',kindLabel:'유치원·호텔',name:'견상낙원',cat:'kindergarten',kinds:['kinder','hotel'],region:'나주시',dist:2,
     address:'전라남도 나주시 빛가람로 689, 가온빌딩 801호 (빛가람동)',phone:'0507-1391-3684',
     hours:'월-토 09:00 - 23:00 · 일 09:00 - 19:00',
     description:'애견유치원과 호텔, 장기위탁을 함께 운영한다고 소개하는 곳이에요. 픽업도 한다고 안내하지만 요금과 범위는 업체에 확인해 주세요.',
     sizes:{},attrs:{'데이케어':true,'장기 호텔링':true},
     source:'https://www.instagram.com/dogparadise92/',sourceLabel:'견상낙원 인스타그램',checked:'2026.11.01',prices:null},
    {id:'kinder-nunbotti',name:'눈보뛰프리미엄',cat:'kindergarten',kinds:['kinder'],region:'나주시',dist:2,
     address:'전라남도 나주시 배멧3길 19-7, LS타워 201호 (빛가람동)',phone:'010-4755-6485',
     hours:'월-금 08:00 - 19:00 · 토·일 휴무',
     description:'10kg 안팎의 반려견을 대상으로 하는 유치원이라고 소개해요. 수중 트레드밀, 펫 피트니스, 전용 목욕 장비를 갖췄고, 원생을 위한 호텔도 운영한다고 안내해요.',
     sizes:{소형견:true,대형견:false},attrs:{'데이케어':true,'산책':true,'목욕':true,'사회화 교육':true},
     source:'https://www.instagram.com/premium_dogcare/',sourceLabel:'눈보뛰프리미엄 인스타그램',checked:'2026.11.01',prices:null},
    {id:'kinder-castle',kindLabel:'유치원·호텔',name:'멍캐슬',cat:'kindergarten',kinds:['kinder','hotel','grooming'],region:'나주시',dist:2,
     address:'전라남도 나주시 빛가람로 740, 한빛타워 4층 403·404호 (빛가람동)',phone:'061-930-7347',
     hours:'월-금 08:00 - 21:00 · 토·일 10:00 - 19:00',
     description:'유치원·호텔·카페·미용을 한곳에서 운영하는 반려견 케어 센터예요. 200평 규모 실내 공간과 별도 야외 운동장이 있다고 소개해요.',
     sizes:{},attrs:{'데이케어':true,'목욕':true,'실내 놀이터':true,'실외 놀이터':true,'애견카페':true},
     source:'https://www.instagram.com/meongcastle/',sourceLabel:'멍캐슬 인스타그램',checked:'2026.11.01',prices:null},
    {id:'kinder-dabang',kindLabel:'유치원·호텔',name:'멍다방',cat:'kindergarten',kinds:['kinder','hotel'],region:'나주시',dist:2,
     address:'전라남도 나주시 배멧1길 46, 302호 (빛가람동)',phone:'0507-1433-6550',
     hours:'09:30 - 19:00 · 수요일 휴무',
     description:'애견카페와 유치원, 호텔을 함께 운영하는 곳이에요. 방문 후기에 따르면 주차 공간이 넉넉하다고 해요.',
     sizes:{},attrs:{'데이케어':true,'애견카페':true,'주차장':true},
     source:'https://www.instagram.com/mungdabang/',sourceLabel:'멍다방 인스타그램',checked:'2026.11.01',prices:null}
  ];


  /* 나주 전체: 행정안전부 인허가 데이터(동물병원·동물미용업, 2026.7 기준 영업 중)에서 출발해
     업체 SNS·지역 프로필·후기에서 찾은 내용을 더했다 (2026.11.01 확인). 찾지 못한 값은 비워 두어 '확인 필요'로 보인다. */
  const L='행정안전부 인허가 데이터';
  const H=(id,name,address,phone,hours,description,attrs,dist,extra={})=>({id,name,cat:'hospital',kinds:['hospital'],region:'나주시',dist,address,phone,hours,description,sizes:{},attrs,source:extra.source||null,sourceLabel:extra.sourceLabel||L,checked:'2026.11.01',prices:null,...extra});
  const moreHospitals=[
    H('hosp-najujonghap','나주종합동물병원','전라남도 나주시 중앙로 3 (성북동)','061-331-2275','평일 09:00 - 18:00 · 토 09:00 - 13:00 · 일요일 휴무 (출처마다 조금 달라요)','1997년부터 운영해 온 병원으로, 산업동물과 반려동물을 함께 진료한다고 소개해요. 중성화 수술·치과·예방접종 항목이 안내돼 있어요.',{'예방접종':true,'치과':true,'외과·수술':true},3),
    H('hosp-benji','벤지동물병원','전라남도 나주시 빛가람로 789, 103호 (빛가람동)','061-333-1336','24시간 · 연중무휴 (2025년 조사 기준, 방문 전 확인)','빛가람동의 큰 규모 동물병원이에요. 여러 병원 정보 사이트에 24시간 연중무휴로 안내돼 있어요.',{'야간·응급 진료':true},2),
    H('hosp-jiwoong','지웅동물병원','전라남도 나주시 재신길 10, 미도방 1층 (송월동)','061-337-9737',null,'2023년에 문을 연 송월동 동물병원이에요. 진료 대상(반려동물·대동물)과 진료 시간은 아직 확인하지 못했어요.',{},3),
    H('hosp-dongsan','동산동물병원','전라남도 나주시 상야4길 21, 죤프라자 117호 (빛가람동)','061-335-9909',null,'2024년 12월에 지금 자리로 옮겨 문을 연 빛가람동 동물병원이에요.',{},2),
  ];
  /* 기존 병원 3곳 보강 */
  const HOSP_EXTRA={
    '채움동물병원':{hours:'진료 10:00부터 · 접수 09:30 - 12:00, 오후 접수 18:30 마감 · 일요일 휴무'},
    '전남동물의료센터':{hours:'평일 09:00 - 22:00 · 주말 09:00 - 18:00 · 점심 12:00 - 13:30 (2024년 후기 기준)',attrs:{'주차장':true}},
    '가람동물병원':{}
  };
  const G=(id,name,address,phone,hours,description,attrs,dist,extra={})=>({id,name,cat:'grooming',kinds:['grooming'],region:'나주시',dist,address,phone,hours,description,sizes:{},attrs,source:null,sourceLabel:L,checked:'2026.11.01',prices:null,...extra});
  const moreGrooming=[
    G('groom-dogland','애견랜드','전라남도 나주시 나주로 113, 1층 (금성동)','061-334-8980','08:30 - 19:30 (휴무일은 확인해 주세요)','나주 원도심의 애견샵 겸 미용실이에요. 동물위탁관리업도 등록돼 있어 맡기기도 문의할 수 있어요.',{'반려동물 용품 판매':true},4,{kinds:['grooming','hotel']}),
    G('groom-gogo','고고펫살롱','전라남도 나주시 대호길 25 (성북동)','070-4151-7275','10:00 - 17:00 · 수요일 휴무 (인스타그램에는 18:00까지로 나와요)','가위컷 전문이라고 소개하는 미용실이에요. 스파·목욕과 용품 판매도 해요.',{'가위컷':true,'스파':true,'목욕':true,'반려동물 용품 판매':true},3,{source:'https://www.instagram.com/gogo_petsalon/',sourceLabel:'고고펫살롱 인스타그램'}),
    G('groom-fluffy','플러피 애견미용실','전라남도 나주시 중야2길 14, 레이크뷰타워 301호 (빛가람동)','010-8579-8043','09:00 영업 시작 (마감 시간은 확인해 주세요)','미용·스파와 용품 판매를 하는 혁신도시 미용실이에요. 전화나 카톡으로 예약을 받아요.',{'스파':true,'반려동물 용품 판매':true},2,{source:'https://www.instagram.com/fluffy_grooming/',sourceLabel:'플러피 인스타그램'}),
    G('groom-woongi','웅이네 애견샵','전라남도 나주시 상야4길 11, 대양프라자 A동 107호 (빛가람동, 우리밀칼국수 옆)','0507-1497-7964','월-토 11:00 - 18:00 · 일요일 휴무','가위컷 전문 강아지 미용과 고양이 무마취 미용을 한다고 소개하는 미용실이에요. 예약제로 운영해요.',{'가위컷':true},2,{source:'https://blog.naver.com/esse2624_',sourceLabel:'웅이네 애견샵 블로그'}),
    G('groom-dogworld','강아지세상 고양이세상','전라남도 나주시 호수로 68 (빛가람동)','061-332-0733',null,'빛가람 호수공원 주차장 맞은편의 애견샵 겸 미용실이에요.',{'반려동물 용품 판매':true},2),
    G('groom-moongs','뭉쓰살롱','전라남도 나주시 우정로 103, 중흥S클래스센트럴2차 상가 242동 1층 110호 (빛가람동)','010-5752-5777','09:00 - 20:00 · 일요일 휴무','오픈형으로 미용 과정을 볼 수 있는 강아지 미용실이에요. 아파트 상가 주차장을 쓸 수 있어요.',{'주차장':true},2,{source:'https://www.instagram.com/moongs_salon/',sourceLabel:'뭉쓰살롱 인스타그램'}),
    G('groom-gaepyeon','개편한이발소 & 멍마실','전라남도 나주시 상야3길 8, 상가 B동 202호 (빛가람동)','061-336-2228',null,'가위컷 전문 미용실이에요. 애견카페와 소수 정원 호텔, 시간제 놀이방을 함께 운영한다고 소개해요.',{'가위컷':true,'애견카페':true,'데이케어':true},2,{kinds:['grooming','hotel','kinder'],kindLabel:'미용실·카페·호텔',source:'https://www.instagram.com/gaepyeonhan_ibalso/',sourceLabel:'개편한이발소 인스타그램'}),
    G('groom-petstory','펫스토리','전라남도 나주시 남평읍 강변2길 20, 상가 2동 1층 203호','010-6549-1009',null,'남평읍의 미용실이에요. 동물위탁관리업도 등록돼 있어 맡기기도 문의할 수 있어요.',{},4,{kinds:['grooming','hotel']}),
    G('groom-allday','올데이 그루밍','전라남도 나주시 그린로 218, 빛가람빌딩 1층 103호 (빛가람동)','010-4165-9812','10:00 - 20:00 · 100% 예약제 · 휴무일은 달마다 바뀌어요','100% 예약제로 운영하는 미용실이에요. 카톡·문자·DM으로 예약을 받아요.',{},2,{source:'https://www.instagram.com/all_day_grooming/',sourceLabel:'올데이 그루밍 인스타그램'}),
    G('groom-daengkkeul','댕끌림','전라남도 나주시 우정로 103, 중흥S클래스센트럴2차 상가 111호 (빛가람동)','0507-1415-4858','월-토 10:00 - 20:30 · 일요일 휴무','빛가람동 중흥S클래스 2차 아파트 상가에 있는 미용실이에요.',{},2),
    G('groom-reborn','그루밍리본','전라남도 나주시 상야4길 10, 109호 (빛가람동)','010-8927-0024','10:00 - 19:30 · 100% 예약제','조용한 분위기에서 교감 미용을 한다고 소개하는 미용실이에요. 스파와 스타일링을 해요. 미용 중에는 전화를 받기 어려워 문자·카톡이 편해요.',{'스파':true},2,{source:'https://www.instagram.com/grooming_reborn/',sourceLabel:'그루밍리본 인스타그램'}),
    G('groom-gaeyeppeo','개·예뻐','전라남도 나주시 대호길 76-8, 상가동 1층 105호 (대호동, 대방1차 아파트)','0507-1371-6376','화-일 10:00 - 18:00 · 월요일 휴무','2025년에 문을 연 대호동 아파트 상가의 미용실이에요. 예약제로 운영하고 주차할 수 있어요.',{'주차장':true},3),
    G('groom-dadeum','살롱다듬','전라남도 나주시 그린로 204, 1동 104호 (빛가람동)','0507-1452-3433','매일 10:00 - 19:00','2026년 8월에 문을 연 빛가람동 미용실이에요.',{},2)
  ];
  const moreKinder=[
    {id:'kinder-nolmeong',name:'놀멍쉬멍',cat:'kindergarten',kinds:['kinder','hotel'],kindLabel:'애견카페·유치원·호텔',region:'나주시',dist:3,
     address:'전라남도 나주시 대호길 93, 3층 (대호동)',phone:'0507-1331-3698',
     hours:'10:00 - 19:00 · 월요일 휴무',
     description:'애견카페와 놀이방, 유치원, 호텔링을 함께 운영하는 곳이에요. 카페는 보호자 1인당 음료 1잔 주문이 기본이에요.',
     sizes:{},attrs:{'애견카페':true,'데이케어':true},
     source:'https://www.instagram.com/nmsm_petcafe/',sourceLabel:'놀멍쉬멍 인스타그램',checked:'2026.11.01',
     priceNote:'애견카페 입장료예요. 유치원·호텔 요금은 업체에 문의해 주세요.',
     prices:[['애견카페 입장료',[['소형견','4,000원'],['대형견','5,000원'],['보호자','2,000원']]]]},
    {id:'kinder-sogae',name:'소개유치원',cat:'kindergarten',kinds:['kinder','hotel'],kindLabel:'유치원·호텔',region:'나주시',dist:2,
     address:'전라남도 나주시 상야1길 21, 킹덤프라자 A동 405호 (빛가람동)',phone:'010-3966-0045',
     hours:'10:00 - 20:00 (요일별로 확인해 주세요)',
     description:'소규모 정원으로 운영하는 유치원·호텔이에요. 반려동물관리사·펫시터 자격을 갖췄고, 동물위탁업과 운송업이 등록돼 있다고 소개해요. 애견카페는 함께 운영하지 않아요.',
     sizes:{},attrs:{'데이케어':true,'장기 호텔링':true,'유료픽업':true,'실내 놀이터':true,'테라스':true,'주차장':true},
     source:'https://www.instagram.com/so___gae/',sourceLabel:'소개유치원 인스타그램',checked:'2026.11.01',
     priceNote:'보호자가 공유한 앱 화면의 요금이에요. 바뀌었을 수 있으니 예약 전에 확인해 주세요.',
     prices:[['호텔',[['1~5kg','30,000원'],['6~12kg','35,000원']]],['유치원',[['1~5kg 시간권','4,000원'],['1~5kg 종일권','20,000원'],['1~5kg 주3회권','160,000원'],['1~5kg 월권','210,000원']]],['기타',[['픽드랍 편도','3,000원'],['픽드랍 왕복','6,000원'],['1~5kg 장기위탁','300,000원'],['6~12kg 장기위탁','350,000원']]]]}
  ];

  const hospitalPlaces=(typeof hospitals!=='undefined'?hospitals:[]).map((h,i)=>({
    id:'hosp-'+i,name:h.name,cat:'hospital',kinds:['hospital'],region:'나주시',dist:2,address:h.address,phone:h.phone,image:h.image,description:h.description,source:h.source,sourceLabel:h.sourceLabel,checked:'2026.10.18',
    hours:'진료 시간은 병원에 확인해 주세요',sizes:{},attrs:{},prices:null,
    ...(HOSP_EXTRA[h.name]||{})
  }));

  const sizeGroup=title=>({key:'size',title,opts:['소형견','중형견','대형견'],grid:3});
  const FILTERS={
    hotel:{title:'호텔·돌봄',needs:['투약 지원','단독 돌봄','야간 관리'],groups:[
      sizeGroup('돌봄 가능 체급'),
      {title:'주요 서비스',opts:['24시간 상주','개별 객실','장기 호텔링','데이케어','산책','목욕','병원 연계','유료픽업','무료픽업'],grid:3},
      {title:'돌봄 시설',opts:['미끄럼 방지 매트','실내 놀이터','실외 놀이터','마당','테라스','루프탑','수영장']},
      {title:'전문가',opts:['수의사','수의테크니션','훈련사','반려동물 관리사']},
      {title:'편의시설',opts:['주차장','반려동물 용품 판매','애견카페']}]},
    kinder:{title:'유치원',needs:['투약 지원','단독 돌봄'],groups:[
      sizeGroup('등원 가능 체급'),
      {title:'주요 서비스',opts:['데이케어','산책','목욕','사회화 교육','행동 교정','유료픽업','무료픽업'],grid:3},
      {title:'돌봄 시설',opts:['미끄럼 방지 매트','실내 놀이터','실외 놀이터','마당','테라스','루프탑','수영장']},
      {title:'전문가',opts:['훈련사','유치원 교사','반려동물 관리사']},
      {title:'편의시설',opts:['주차장','반려동물 용품 판매','애견카페']}]},
    grooming:{title:'미용',needs:[],groups:[
      sizeGroup('미용 가능 체급'),
      {title:'주요 서비스',opts:['가위컷','특수견 미용','스파','목욕','노령견 미용','피어프리','유료픽업','무료픽업'],grid:3},
      {title:'편의시설',opts:['주차장','반려동물 용품 판매','애견카페']}]},
    hospital:{title:'동물병원',needs:['노령견 진료'],groups:[
      {title:'진료',opts:['야간·응급 진료','외과·수술','피부·귀','치과','건강검진','예방접종']},
      {title:'편의시설',opts:['주차장']}]}
  };
  const SOON={
    consult:{title:'실시간·전문가 상담',kind:'consult',body:'수의사 프로필에서 진료 분야와 예상 대기 시간을 확인하고, 원하는 수의사와 1:1 채팅을 시작할 수 있어요.',note:'이 채팅은 일반 상담용이며 진단이나 응급 처치를 대신하지 않아요. 위급하면 가까운 동물병원에 바로 연락해 주세요.'},
    together:{title:'커뮤니티',kind:'together',body:'보호자끼리 산책 친구를 찾고, 다녀온 곳의 경험과 정보를 나누는 공간을 준비하고 있어요.',note:'광고나 제휴와 상관없이 보호자의 실제 경험이 먼저 보이도록 만들 거예요.'},
    star:{title:'별들의 공간',kind:'star',body:'무지개다리를 건넌 아이를 기억하는 공간이에요. 장례와 추모에 필요한 정보를 조심스럽게 준비하고 있어요.',note:'준비가 끝나면 이 산책로 끝에서 만날 수 있어요.'}
  };
  /* 전남광주통합특별시 공공데이터(public-places.js): 영업 중인 동물병원·미용·위탁관리(호텔·돌봄) 업체 전체.
     직접 확인한 나주 업체와 이름이 겹치면 직접 확인한 쪽만 남긴다. */
  const curated=[...hospitalPlaces,...moreHospitals,...kindergartens,...moreKinder,...grooming,...moreGrooming];
  const norm=n=>String(n).toLowerCase().replace(/동물병원|동물의료센터|동물메디컬센터|애견미용|펫살롱|[\s·&()\-_.,'"]/g,'');
  const same=(a,b)=>{const x=norm(a),y=norm(b);return x.length>1&&y.length>1&&(x===y||x.includes(y)||y.includes(x));};
  const KIND_OF={h:'hospital',g:'grooming',w:'hotel',k:'kinder'};
  const publicPlaces=(window.PUBLIC_PLACES||[]).map(([id,name,ks,region,dist,address,phone,lat,lng,masked,upd])=>{
    const kinds=[...ks].map(k=>KIND_OF[k]);
    const hosp=ks==='h',groom=ks.includes('g'),care=ks.includes('w'),kinder=ks.includes('k');
    const cat=hosp?'hospital':groom?'grooming':'hotel',where=masked?address.replace(/ 일대$/,''):region;
    const kindLabel=hosp?null:[groom&&'미용실',care&&'호텔·돌봄',kinder&&'유치원'].filter(Boolean).join('·');
    const what=hosp?'동물병원':groom&&care?'미용·위탁관리 업체':groom?'반려동물 미용업체':'반려동물 위탁관리(호텔·돌봄) 업체';
    const ask=hosp?'진료 과목·시간과 노령견 진료 여부는 방문 전에 전화로 확인해 주세요.':care?'맡길 수 있는 체급, 합사 방식, 투약·야간 관리 여부는 문의할 때 꼭 확인해 주세요.':'미용 가능한 체급과 요금은 예약할 때 확인해 주세요.';
    return {id:'pub-'+id,name,cat,kinds,kindLabel,region,dist,address,phone,lat,lng,public:true,
      hours:hosp?'진료 시간은 병원에 확인해 주세요':'영업 시간은 업체에 확인해 주세요',
      description:`${where}에 등록된 ${what}예요. ${ask}`,
      addrNote:masked?'공공데이터에서 상세 주소가 가려져 있어요. 지도 위치는 등록 좌표 기준이니 방문 전 업체에 정확한 주소를 물어보세요.':null,
      sourceLabel:`지방행정 인허가 공공데이터(${[hosp&&'동물병원',groom&&'동물미용업',care&&'동물위탁관리업'].filter(Boolean).join('·')})`,checked:`${upd.slice(0,4)}.${upd.slice(4,6)}.${upd.slice(6)}`,
      sizes:{},attrs:{},prices:null};
  }).filter(p=>!curated.some(c=>c.region===p.region&&c.kinds.some(k=>p.kinds.includes(k))&&same(c.name,p.name)));
  /* 지역 선택지: 광주 5개 구 + 전남 22개 시·군 */
  const REGIONS=[['광주',['광주 동구','광주 서구','광주 남구','광주 북구','광주 광산구']],
    ['전남',['나주시','목포시','여수시','순천시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군']]];
  window.PLACES=[...curated,...publicPlaces,...examples];
  window.REGIONS=REGIONS;
  window.FILTERS=FILTERS;
  window.SOON=SOON;
  window.FACILITY_ICONS={'미끄럼 방지 매트':'grid','실내 놀이터':'slide','실외 놀이터':'slide','마당':'tree','테라스':'umbrella','루프탑':'building','수영장':'waves','주차장':'parking','반려동물 용품 판매':'bag','애견카페':'cup'};
})();
