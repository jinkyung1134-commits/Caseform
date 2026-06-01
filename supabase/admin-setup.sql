-- 첫 관리자 계정 지정용
-- 1. 사이트에서 관리자 이메일로 회원가입을 먼저 합니다.
-- 2. 아래 이메일을 실제 관리자 이메일로 바꾼 뒤 Supabase SQL Editor에서 실행합니다.

update public.profiles
set role = 'admin'
where email = 'owner@example.com';

select id, email, name, role, created_at
from public.profiles
where role = 'admin';
