Here's the most practical idea I'm currently planning off:

Problem:
- Most people need to buy groceries locally
- Might be limited by budget, diet restrictions, nutrient requirements (ex. bodybuilder)
- Need a quick way to plan their meals based on availability and costs of ingredients  

Solution:
- Web app that helps you plan your groceries based on budget, travel time, diet restrictions, nutrients 
- Users can use without making an account (for easy access) 
- Ex. I need to plan a cheap meal near Thompson residence
      -> Pulls up current discounts at nearby metro and Farmboy to provide grocery options

Implementation:
1. User inputs their specifications (diet restrictions, budget, 
2. Uses APIS or webscraping, etc, to find grocery options.
3. AI prompts users to choose between different plans, providing pros and cons of each option


https://food-guide.canada.ca/en/
Intended to university students, busy people, travellers etc.
Suggests cheap and easy to make meals
https://allrecipes.com/
Some questions:
How far into the future must the app plan?
Should it be on a meal by meal basis or per day, week? (related to 1).
I’m thinking this is all done in the onboarding (which, if skipped, will assume good defaults.) 


Frontend: HTML, CSS, JavaScript (React in TypeScript), Tailwind
Backend: Python (FastAPI)
APIs:
https://pypi.org/project/beautifulsoup4/
If needed, Playwright (headless browser) https://playwright.dev/python/docs/intro
Google Maps JS
Hosting/Domain: Vercel

Other tools:
Git + GitHub (version control)
Database: (MongoDB, If SQLite: TursoDB, Postgres: NeonDB or Supabase)

We discussed the fact that in order to make this as simple as possible, we want to have some sort of local db which everything in the client side is stored in. that way, once we add login we can just make it so that it syncs the local db to the server so you can use it on any device, while still making it work without login.