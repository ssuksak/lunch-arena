-- Prepare meals for breakfast/lunch/dinner display.
-- This is backward-compatible with the existing sync-meals Edge Function.

alter table public.meals
  add column if not exists meal_type text not null default 'lunch',
  add column if not exists meal_type_label text not null default '중식',
  add column if not exists neis_meal_code text;

alter table public.meals
  drop constraint if exists meals_meal_type_check;

alter table public.meals
  add constraint meals_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other'));

update public.meals
set meal_type = 'lunch', meal_type_label = '중식'
where meal_type is null or meal_type_label is null;

comment on column public.meals.meal_type is '식사 구분: breakfast, lunch, dinner, snack, other';
comment on column public.meals.meal_type_label is '사용자에게 표시할 식사 구분명. 예: 조식, 중식, 석식';
comment on column public.meals.neis_meal_code is 'NEIS MMEAL_SC_CODE 원본 값. 1 조식, 2 중식, 3 석식 등';

notify pgrst, 'reload schema';
