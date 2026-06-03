
## 1. 서비스 소개

`구미역으로 가자`는 사용자가 현재 출발 위치와 기차 출발 날짜/시간을
입력하면, 구미역에 늦지 않기 위해 언제 출발해야 하는지 계산해주는
Next.js 앱입니다.

사용자는 지도에서 출발 좌표를 선택하고, 기차 날짜/시간과 여유 시간을
입력합니다. 백엔드는 주변 정류장, 구미역 방향 노선, 실시간 버스 도착 정보,
공식 시간표, 도보 시간을 조합해 추천 계획을 만듭니다.

1. 출발 위치를 지도에서 선택한다.
2. 기차 출발 날짜와 시간을 입력한다.
3. 구미역 도착 전 필요한 여유 시간을 선택한다.
4. 앱이 추천 버스, 출발 시각, 탑승 정류장, fallback 이유를 보여준다.

## 2. 서비스 이미지

| 출발지 입력 화면 | 결과 확인 화면 |
| --- | --- |
| <img width="490" height="773" alt="스크린샷 2026-06-03 오후 3 07 48" src="https://github.com/user-attachments/assets/65de6148-0004-439b-8ac6-a3daa80a8d3a" /> | <img width="490" height="773" alt="스크린샷 2026-06-03 오후 3 08 10" src="https://github.com/user-attachments/assets/d493f09e-0e3f-462a-8555-f9898982bc9a" /> |

## 3. 서비스 아키텍처

<img width="1325" height="777" alt="스크린샷 2026-06-03 오후 3 09 51" src="https://github.com/user-attachments/assets/85695205-c31f-4264-a79f-6b9fa939ff15" />

## harness-starter-kit-dog-food

이 프로젝트는 `harness-starter-kit`을 단순 템플릿이 아니라 작업 운영 체계의
기준으로 사용했습니다. 앱 기능은 직접 구현하되, 변경을 안전하게 남기는 방식은
kit의 도움을 많이 받았습니다.

| 도움 받은 영역 | 프로젝트에 반영된 결과 |
| --- | --- |
| Agent workflow | `AGENTS.md`에 작업 규칙, 완료 기준, `/harness` command routing 정리 |
| Verification gate | `npm run check:harness`로 lint, planner test, typecheck, build, harness drift check를 한 번에 실행 |
| Decision memory | `docs/decisions/`에 제품 구조, API boundary, 시간 의미, harness rule을 ADR로 기록 |
| Failure memory | `docs/failures/`에 반복하면 안 되는 실패와 detection/prevention check를 연결 |
| External API safety | TAGO, Gumi BIS, TMAP, OpenRouteService 작업 전용 checklist와 focused smoke command 분리 |
| Harness lifecycle | `.harness/source.json`으로 kit source를 추적하고 `/harness update`로 안전한 변경만 선별 적용 |

요약하면, kit은 이 프로젝트에서 코드 생성보다 **검증 루프, 작업 기억, 외부 API
안전장치, 변경 보고 방식**에 크게 기여했습니다. 특히 planner처럼 live data와
fallback이 섞이는 영역에서 deterministic test와 live smoke를 분리하는 기준을
잡아준 점이 가장 컸습니다.

## Key Paths

- App source: `src/app/`
- Shared UI: `src/components/`
- Planner logic: `src/lib/today-bus/`
- Transit providers: `src/lib/tago/`, `src/lib/gumi-bis/`, `src/lib/transit/`
- Walking providers: `src/lib/tmap/`, `src/lib/openrouteservice/`
- Local tests: `tests/`
- Harness docs: `docs/harness/`
- Harness source tracking: `.harness/source.json`
