"""지방행정 인허가 CSV(동물병원·동물미용업)를 public-places.js로 바꾼다.
사용: python3 -I tools/build_public_places.py 동물병원.csv 동물미용업.csv 동물위탁관리업.csv public-places.js
- 영업/정상인 곳만 넣는다(폐업·휴업·취소 제외).
- 미용업과 위탁관리업을 함께 등록한 업체(같은 지역·같은 이름)는 한 곳으로 합친다.
- 좌표는 EPSG:5174(중부원점 Bessel)를 WGS84 위경도로 바꿔 지도에 바로 쓴다.
- 나주시는 빛가람동, 다른 시·군·구는 등록 업체 좌표의 중앙값을 기준으로 거리 단계(1~5)를 매긴다."""
import csv, json, math, re, sys, statistics

# ---------- 좌표 변환 (EPSG:5174 → WGS84) ----------
A, RF = 6377397.155, 299.1528128
F = 1 / RF; E2 = 2 * F - F * F
LAT0, LON0, K0, X0, Y0 = math.radians(38), math.radians(127.0028902777778), 1.0, 200000.0, 500000.0
def _m(phi):
    e4, e6 = E2 * E2, E2 ** 3
    return A * ((1 - E2/4 - 3*e4/64 - 5*e6/256) * phi - (3*E2/8 + 3*e4/32 + 45*e6/1024) * math.sin(2*phi)
                + (15*e4/256 + 45*e6/1024) * math.sin(4*phi) - (35*e6/3072) * math.sin(6*phi))
M0 = _m(LAT0)
def tm_inverse(x, y):
    ep2 = E2 / (1 - E2)
    m = M0 + (y - Y0) / K0
    mu = m / (A * (1 - E2/4 - 3*E2**2/64 - 5*E2**3/256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    p1 = mu + (3*e1/2 - 27*e1**3/32) * math.sin(2*mu) + (21*e1**2/16 - 55*e1**4/32) * math.sin(4*mu) \
         + (151*e1**3/96) * math.sin(6*mu) + (1097*e1**4/512) * math.sin(8*mu)
    c1 = ep2 * math.cos(p1)**2; t1 = math.tan(p1)**2
    n1 = A / math.sqrt(1 - E2 * math.sin(p1)**2)
    r1 = A * (1 - E2) / (1 - E2 * math.sin(p1)**2) ** 1.5
    d = (x - X0) / (n1 * K0)
    lat = p1 - (n1 * math.tan(p1) / r1) * (d*d/2 - (5 + 3*t1 + 10*c1 - 4*c1*c1 - 9*ep2) * d**4/24
          + (61 + 90*t1 + 298*c1 + 45*t1*t1 - 252*ep2 - 3*c1*c1) * d**6/720)
    lon = LON0 + (d - (1 + 2*t1 + c1) * d**3/6 + (5 - 2*c1 + 28*t1 - 3*c1*c1 + 8*ep2 + 24*t1*t1) * d**5/120) / math.cos(p1)
    return lat, lon
def bessel_to_wgs84(lat, lon):
    # Bessel 위경도 → 지심좌표 → 7변수 변환 → WGS84 위경도
    n = A / math.sqrt(1 - E2 * math.sin(lat)**2)
    X = n * math.cos(lat) * math.cos(lon); Y = n * math.cos(lat) * math.sin(lon); Z = n * (1 - E2) * math.sin(lat)
    dx, dy, dz = -115.80, 474.99, 674.11
    rx, ry, rz = (math.radians(v / 3600) for v in (1.16, -2.31, -1.63)); s = 1 + 6.43e-6
    X2 = dx + s * (X - rz*Y + ry*Z); Y2 = dy + s * (rz*X + Y - rx*Z); Z2 = dz + s * (-ry*X + rx*Y + Z)
    a, f = 6378137.0, 1/298.257223563; e2 = 2*f - f*f
    p = math.hypot(X2, Y2); lon2 = math.atan2(Y2, X2); lat2 = math.atan2(Z2, p * (1 - e2))
    for _ in range(6):
        n2 = a / math.sqrt(1 - e2 * math.sin(lat2)**2)
        lat2 = math.atan2(Z2 + e2 * n2 * math.sin(lat2), p)
    return math.degrees(lat2), math.degrees(lon2)
def to_wgs(xs, ys):
    try: x, y = float(xs), float(ys)
    except ValueError: return None
    if not (x and y): return None
    return bessel_to_wgs84(*tm_inverse(x, y))

# ---------- 정리 ----------
GWANGJU = {'동구', '서구', '남구', '북구', '광산구'}
SKIP = re.compile(r'가축|야생동물|낙농|축협|축산|한우|양돈|양계|수산|어류|방역|검역|연구소|위생시험')
def region_of(r):
    for a in (r['도로명주소'], r['지번주소']):
        t = a.split()
        if len(t) > 1 and t[0] == '전남광주통합특별시':
            return ('광주 ' + t[1]) if t[1] in GWANGJU else t[1]
    return None
def dong_of(r):
    t = [w for w in r['지번주소'].split()[2:] if '*' not in w and not re.match(r'^[\d\-]+$', w) and w != '산']
    if t: return ' '.join(t[:2])
    m = re.search(r'\(([^)*,]+)', r['도로명주소']); return m.group(1) if m else ''
def phone(p):
    d = re.sub(r'\D', '', p or '')
    if len(d) < 8 or d.startswith('00'): return None
    if d.startswith('02'): return f'{d[:2]}-{d[2:-4]}-{d[-4:]}'
    if d.startswith(('050', '070', '080')) and len(d) == 12: return f'{d[:4]}-{d[4:8]}-{d[8:]}'
    if d.startswith('0'): return f'{d[:3]}-{d[3:-4]}-{d[-4:]}'
    if len(d) == 8: return f'{d[:4]}-{d[4:]}'
    return None
def address(r, reg):
    road = r['도로명주소'].strip()
    if road and '*' not in road: return road.replace('전남광주통합특별시 ', ''), False
    return f'{reg.replace("광주 ", "")} {dong_of(r)} 일대'.replace('  ', ' ').strip(), True
def km(a, b):
    return math.hypot((a[0]-b[0]) * 111.0, (a[1]-b[1]) * 111.0 * math.cos(math.radians(a[0])))
def step(d):
    return 1 if d <= 1.5 else 2 if d <= 3 else 3 if d <= 6 else 4 if d <= 12 else 5

BITGARAM = (35.0182, 126.7880)
def load(path, kind):
    rows = list(csv.DictReader(open(path, encoding='cp949')))
    out, skipped = [], []
    for r in rows:
        if r['영업상태명'] != '영업/정상': continue
        name = r['사업장명'].strip()
        if kind == 'hospital' and SKIP.search(name): skipped.append(name); continue
        reg = region_of(r)
        if not reg: skipped.append(name); continue
        addr, masked = address(r, reg)
        pos = to_wgs(r['좌표정보(X)'].strip(), r['좌표정보(Y)'].strip())
        out.append(dict(r=r, kind=kind, name=name, region=reg, address=addr, masked=masked, pos=pos,
                        phone=phone(r['전화번호']), id=kind[0] + r['관리번호'].strip(),
                        updated=r['데이터갱신시점'][:10]))
    return out, skipped

KINDER = re.compile(r'유치원|놀이|데이케어|스쿨|school|kinder|키즈', re.I)
def letters(i):
    k = i['kind']
    if k == 'hospital': return 'h'
    if k == 'grooming': return 'g'
    return 'wk' if KINDER.search(i['name']) else 'w'   # w=호텔·돌봄, k=유치원
def nkey(i): return (i['region'], re.sub(r'[\s·&()\-_.,]', '', i['name']).lower())

def main(hosp_csv, groom_csv, care_csv, out_js):
    items, skipped = [], []
    for p, k in ((hosp_csv, 'hospital'), (groom_csv, 'grooming'), (care_csv, 'wtak')):
        a, s = load(p, k); items += a; skipped += s
    for i in items: i['letters'] = letters(i)
    # 미용 + 위탁을 같이 하는 곳은 하나로 합친다
    groom = {nkey(i): i for i in items if i['kind'] == 'grooming'}
    merged = []
    for i in items:
        g = groom.get(nkey(i)) if i['kind'] == 'wtak' else None
        if g:
            g['letters'] = ''.join(sorted(set(g['letters'] + i['letters']), key='hgwk'.index))
            if not g['phone']: g['phone'] = i['phone']
            if not g['pos']: g['pos'] = i['pos']
        else: merged.append(i)
    items = merged
    centers = {}
    for reg in {i['region'] for i in items}:
        pts = [i['pos'] for i in items if i['region'] == reg and i['pos']]
        centers[reg] = BITGARAM if reg == '나주시' else (statistics.median(p[0] for p in pts), statistics.median(p[1] for p in pts))
    places = []
    for i in items:
        # 너무 멀리 찍힌 좌표(잘못 입력)는 버리고 업체 이름으로 지도에서 찾게 한다
        if i['pos'] and km(i['pos'], centers[i['region']]) > 60: i['pos'] = None
        dist = step(km(i['pos'], centers[i['region']])) if i['pos'] else 3
        # 한 줄 배열로 줄여 담고, 설명·출처 같은 반복 문장은 places.js에서 붙인다
        # [id, 이름, 종류, 지역, 거리단계, 주소, 전화, 위도, 경도, 주소가림(0/1), 갱신일]
        lat, lng = (round(i['pos'][0], 5), round(i['pos'][1], 5)) if i['pos'] else (None, None)
        places.append([i['id'], i['name'], i['letters'], i['region'], dist,
                       i['address'], i['phone'], lat, lng, 1 if i['masked'] else 0, i['updated'].replace('-', '')])
    places.sort(key=lambda p: (p[3], p[2], p[4], p[1]))
    js = ('/* 전남광주통합특별시 동물병원·동물미용업·동물위탁관리업 — 지방행정 인허가 공공데이터에서 영업 중인 곳만 자동 생성.\n'
          '   tools/build_public_places.py로 다시 만들 수 있다. 직접 고치지 말 것.\n'
          '   행: [id, 이름, 종류(h=동물병원 g=미용 w=호텔·돌봄 k=유치원), 지역, 거리단계, 주소, 전화, 위도, 경도, 주소가림, 갱신일] */\n'
          'window.PUBLIC_PLACES=[\n' + ',\n'.join(json.dumps(p, ensure_ascii=False, separators=(',', ':')) for p in places) + '\n];\n')
    open(out_js, 'w', encoding='utf-8').write(js)
    from collections import Counter
    print('total', len(places), Counter(p[2] for p in places), 'merged', sum('g' in p[2] and 'w' in p[2] for p in places), 'no coords', sum(p[7] is None for p in places))
    print('skipped', skipped)
    print(Counter(p[3] for p in places))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 'public-places.js')
