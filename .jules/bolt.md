## 2025-02-02 - Eliminate Network Waterfalls with Parallelization and Joins
**Learning:** Sequential 'await' calls for independent Supabase queries create a significant network waterfall, especially in pages with multiple data widgets. Consolidating these into 'Promise.all' or using SQL joins (inner joins) drastically reduces latency.
**Action:** Always check for independent Supabase queries that can be parallelized with 'Promise.all' or combined with joins in '.select()'.
