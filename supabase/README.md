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
