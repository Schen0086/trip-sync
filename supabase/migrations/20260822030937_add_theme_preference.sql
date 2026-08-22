alter table public.profiles
add column theme_preference text not null default 'light';

alter table public.profiles
add constraint profiles_theme_preference_check
check (theme_preference in ('light', 'dark'));