-- Run once in the Supabase SQL editor AFTER creating the user in Authentication -> Users.
-- Replace the email with the account you just created.
insert into public.admin_users (auth_user_id, email, role)
select id, email, 'super_admin'
from auth.users
where email = 'you@example.com'
on conflict (auth_user_id) do update set role = 'super_admin';
