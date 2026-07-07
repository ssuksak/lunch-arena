-- Source: migrations/20260428_add_meal_type_columns.sql

-- Statement: 7 of 8

comment on column public.meals.neis_meal_code is 'NEIS MMEAL_SC_CODE 원본 값. 1 조식, 2 중식, 3 석식 등';
