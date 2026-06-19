-- 在 Supabase Dashboard > SQL Editor 中完整执行本文件。
-- 表名采用 PostgreSQL 常见的 snake_case；与需求字段的对应关系见 README。

create extension if not exists pgcrypto;

create table if not exists public.officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  sort_order integer not null default 0
);

alter table public.officers drop constraint if exists officers_role_key;
create unique index if not exists officers_name_unique_idx on public.officers(name);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.officers(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  tags text[] not null default '{}',
  comment text check (comment is null or char_length(comment) <= 200),
  anonymous_id uuid not null,
  created_at timestamptz not null default now(),
  constraint one_review_per_officer_per_device unique (officer_id, anonymous_id)
);

create index if not exists reviews_officer_id_idx on public.reviews(officer_id);
create index if not exists reviews_anonymous_id_idx on public.reviews(anonymous_id);
create index if not exists reviews_created_at_idx on public.reviews(created_at desc);

alter table public.officers enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Anyone can read officers" on public.officers;
create policy "Anyone can read officers"
on public.officers for select
to anon, authenticated
using (true);

-- 评论表不创建公开策略：浏览器不能直接读取或写入评论。
-- 投票和后台统计仅通过下面两个受控函数完成。
revoke all on table public.reviews from anon, authenticated;
grant select on table public.officers to anon, authenticated;

delete from public.officers
where name not in (
  '张鑫名', '李珂', '韩家锐', '刘广运', '赛依浦丁', '李超',
  '祖拉雅提', '何晨', '热依莱', '帕热达', '王俊杰'
);

insert into public.officers (name, role, sort_order) values
  ('张鑫名', '班长', 1),
  ('李珂', '团支书', 2),
  ('韩家锐', '学习委员', 3),
  ('刘广运', '组织委员', 4),
  ('赛依浦丁', '体育委员', 5),
  ('李超', '宣传委员', 6),
  ('祖拉雅提', '生活委员', 7),
  ('何晨', '信息委员', 8),
  ('热依莱', '文艺委员', 9),
  ('帕热达', '心理委员', 10),
  ('王俊杰', '心理委员', 11)
on conflict (name) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;

-- 原子提交整张选票。即使清空 localStorage，数据库仍会按 anonymous_id 拒绝重复提交。
create or replace function public.submit_ballot(
  p_anonymous_id uuid,
  p_reviews jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  submitted_count integer;
  valid_officer_count integer;
begin
  if p_anonymous_id is null then
    raise exception 'Missing anonymous id';
  end if;

  if jsonb_typeof(p_reviews) <> 'array' then
    raise exception 'Reviews must be a JSON array';
  end if;

  if exists (
    select 1 from public.reviews r where r.anonymous_id = p_anonymous_id
  ) then
    raise exception 'This anonymous id has already submitted a ballot';
  end if;

  select count(*) into expected_count from public.officers;
  submitted_count := jsonb_array_length(p_reviews);

  if submitted_count <> expected_count then
    raise exception 'A complete ballot must review every officer';
  end if;

  select count(distinct x."officerId")
  into valid_officer_count
  from jsonb_to_recordset(p_reviews) as x(
    "officerId" uuid,
    score integer,
    tags text[],
    comment text
  )
  join public.officers o on o.id = x."officerId";

  if valid_officer_count <> expected_count then
    raise exception 'Ballot contains an invalid or duplicate officer';
  end if;

  insert into public.reviews (officer_id, score, tags, comment, anonymous_id)
  select
    x."officerId",
    x.score,
    coalesce(x.tags, '{}'::text[]),
    nullif(left(trim(x.comment), 200), ''),
    p_anonymous_id
  from jsonb_to_recordset(p_reviews) as x(
    "officerId" uuid,
    score integer,
    tags text[],
    comment text
  );
end;
$$;

-- 静态站点没有后端，因此后台通过带密码的数据库函数读取聚合结果。
-- 管理密码仅用于当前简易后台，正式敏感场景建议改用 Supabase Auth。
create or replace function public.get_admin_dashboard(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_password is distinct from '20252502' then
    raise exception 'Invalid admin password';
  end if;

  with officer_data as (
    select
      o.id,
      o.name,
      o.role,
      o.sort_order,
      round(coalesce(avg(r.score), 0)::numeric, 1) as average_score,
      count(r.id)::integer as vote_count,
      jsonb_build_object(
        '负责', 0,
        '积极', 0,
        '沟通好', 0,
        '一般', 0,
        '不满意', 0
      ) || coalesce((
        select jsonb_object_agg(t.tag, t.tag_count)
        from (
          select tag, count(*)::integer as tag_count
          from public.reviews r2
          cross join unnest(r2.tags) as tag
          where r2.officer_id = o.id
          group by tag
        ) t
      ), '{}'::jsonb) as tags,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r3.id,
            'comment', r3.comment,
            'score', r3.score,
            'createdAt', r3.created_at
          ) order by r3.created_at desc
        )
        from public.reviews r3
        where r3.officer_id = o.id and r3.comment is not null
      ), '[]'::jsonb) as comments
    from public.officers o
    left join public.reviews r on r.officer_id = o.id
    group by o.id, o.name, o.role, o.sort_order
  )
  select jsonb_build_object(
    'totalVoters', (select count(distinct anonymous_id)::integer from public.reviews),
    'officers', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'role', role,
        'averageScore', average_score,
        'voteCount', vote_count,
        'tags', tags,
        'comments', comments
      ) order by sort_order
    ), '[]'::jsonb)
  ) into result
  from officer_data;

  return result;
end;
$$;

revoke execute on function public.submit_ballot(uuid, jsonb) from public;
revoke execute on function public.get_admin_dashboard(text) from public;
grant execute on function public.submit_ballot(uuid, jsonb) to anon, authenticated;
grant execute on function public.get_admin_dashboard(text) to anon, authenticated;
