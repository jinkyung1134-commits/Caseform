# Caseform Supabase 연결 순서

1. Supabase에서 새 프로젝트를 만듭니다.
2. `SQL Editor`에서 `supabase/schema.sql` 내용을 실행합니다.
3. `Project Settings > API`에서 `Project URL`과 `anon public` key를 복사합니다.
4. 프로젝트의 `supabase-config.js`에 아래처럼 넣습니다.

```js
window.CASEFORM_SUPABASE = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY",
};
```

`service_role` key는 서버 전용 비밀키라서 GitHub Pages, HTML, JS 파일에 넣으면 안 됩니다.

이 설정이 비어 있으면 Caseform은 기존 로컬 샘플 모드로 동작합니다.

## 권한 구조

- `customer`: 일반 구매 고객입니다. 본인 프로필, 장바구니, 본인이 쓴 리뷰만 수정할 수 있습니다.
- `admin`: 관리자입니다. 관리자 페이지 접근과 운영 데이터 관리 권한을 가집니다.
- `manager`: 나중에 CS/운영 담당자용으로 확장할 수 있는 예비 권한입니다.

권한은 `profiles.role`에 저장됩니다. 일반 회원가입으로 생성되는 계정은 항상 `customer`로 시작합니다.

## 첫 관리자 지정

1. 사이트에서 실제 관리자 이메일로 회원가입합니다.
2. `supabase/schema.sql`을 Supabase SQL Editor에서 최신 상태로 다시 실행합니다.
3. `supabase/admin-setup.sql` 파일의 `owner@example.com`을 관리자 이메일로 바꿉니다.
4. Supabase SQL Editor에서 실행합니다.
5. 해당 계정으로 로그인하면 `admin.html` 접근이 허용됩니다.

일반 회원은 `profiles.role = customer`, 운영자는 `profiles.role = admin`으로 구분합니다.
