-- Add University Law courses (for non-ZIALE students)
INSERT INTO public.academy_courses (name, description, institution, is_active, price)
VALUES 
  ('Constitutional Law', 'Study of constitutional principles, fundamental rights, and government structure in Zambia.', 'University', true, 0),
  ('Contract Law', 'Principles of contract formation, performance, breach, and remedies.', 'University', true, 0),
  ('Criminal Law', 'Study of criminal offenses, defenses, and the Zambian Penal Code.', 'University', true, 0),
  ('Law of Torts', 'Civil wrongs, negligence, defamation, and personal injury law.', 'University', true, 0),
  ('Property Law', 'Land law, property rights, and conveyancing principles.', 'University', true, 0),
  ('Administrative Law', 'Judicial review, government powers, and administrative procedures.', 'University', true, 0),
  ('Family Law', 'Marriage, divorce, custody, and matrimonial property.', 'University', true, 0),
  ('Company Law', 'Corporate governance, formation, and regulation of companies.', 'University', true, 0),
  ('Labour Law', 'Employment relationships, worker rights, and industrial relations.', 'University', true, 0),
  ('International Law', 'Public international law, treaties, and international organizations.', 'University', true, 0),
  ('Jurisprudence', 'Legal theory, philosophy of law, and schools of jurisprudential thought.', 'University', true, 0),
  ('Equity and Trusts', 'Equitable principles, trust formation, and fiduciary duties.', 'University', true, 0),
  ('Land Law', 'Zambian land tenure systems, customary land, and statutory land.', 'University', true, 0),
  ('Legal Research and Writing', 'Legal research methods, case analysis, and legal writing skills.', 'University', true, 0),
  ('Human Rights Law', 'International and regional human rights frameworks and Zambian Bill of Rights.', 'University', true, 0)
ON CONFLICT DO NOTHING;