# VELTIER Supabase 연결 순서

1. Supabase에서 새 프로젝트를 만듭니다.
2. `SQL Editor`에서 `supabase/schema.sql` 내용을 실행합니다.
   - 이미 기존 스키마를 실행한 프로젝트라면 `supabase/commerce-ops.sql`만 추가로 실행해도 됩니다.
3. `Project Settings > API`에서 `Project URL`과 `anon public` key를 복사합니다.
4. 프로젝트의 `supabase-config.js`에 아래처럼 넣습니다.

```js
window.CASEFORM_SUPABASE = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY",
};
```

`service_role` key는 서버 전용 비밀키라서 GitHub Pages, HTML, JS 파일에 넣으면 안 됩니다.

이 설정이 비어 있으면 VELTIER는 기존 로컬 샘플 모드로 동작합니다.

## 권한 구조

- `customer`: 일반 구매 고객입니다. 본인 프로필, 장바구니, 본인이 쓴 리뷰만 수정할 수 있습니다.
- `admin`: 관리자입니다. 관리자 페이지 접근과 운영 데이터 관리 권한을 가집니다.
- `manager`: 나중에 CS/운영 담당자용으로 확장할 수 있는 예비 권한입니다.

권한은 `profiles.role`에 저장됩니다. 일반 회원가입으로 생성되는 계정은 항상 `customer`로 시작합니다.

## 운영 데이터

`supabase/schema.sql`에는 아래 운영 테이블과 스토리지 정책이 포함되어 있습니다.

- `products`: 관리자 상품 관리용 테이블입니다. 공개 화면은 `is_active = true` 상품만 읽습니다.
- `product-media`: 상품 이미지/영상 업로드용 공개 스토리지 버킷입니다. 업로드/수정/삭제는 `admin`만 가능합니다.
- `orders`, `order_items`: 결제 연결 전 단계의 주문 생성용 테이블입니다. 고객은 본인 주문만 보고, 관리자는 전체 주문을 볼 수 있습니다.
- `product_variants`: 상품별 기종 옵션, SKU, 재고, 품절 여부를 관리합니다.
- `notification_events`: 주문 생성과 주문 상태 변경 시 이메일 발송용 대기열을 저장합니다.
- `user_addresses`: 고객이 마이페이지와 체크아웃에서 재사용할 배송지를 저장합니다.

새 스키마를 실행한 뒤 관리자 페이지에서 상품을 저장하면 현재 상품 목록이 Supabase `products` 테이블로 동기화됩니다.

## 결제와 이메일 자동화

Toss Payments 결제 승인과 이메일 발송은 Supabase Edge Function으로 처리합니다.

- `confirm-toss-payment`: Toss 결제 승인 서버 검증 후 주문을 `paid`로 변경합니다.
- `send-notification-email`: `notification_events`의 대기 메일을 이메일 서비스로 발송합니다.

배포 명령과 필요한 secret 이름은 `docs/commerce-launch.md`를 참고하세요. Toss Secret Key, Resend API Key, Supabase service role key는 절대 브라우저 파일에 넣지 않습니다.

## 첫 관리자 지정

1. 사이트에서 실제 관리자 이메일로 회원가입합니다.
2. `supabase/schema.sql`을 Supabase SQL Editor에서 최신 상태로 다시 실행합니다.
3. `supabase/admin-setup.sql` 파일의 `owner@example.com`을 관리자 이메일로 바꿉니다.
4. Supabase SQL Editor에서 실행합니다.
5. 해당 계정으로 로그인하면 `admin.html` 접근이 허용됩니다.

일반 회원은 `profiles.role = customer`, 운영자는 `profiles.role = admin`으로 구분합니다.
