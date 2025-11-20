# Testing Guide

This guide shows you how to add a test customer and generate a newsletter.

## Example Customer

Here's a complete example customer you can add:

### Required Fields (Minimum)
- **Name:** `Ulta Beauty`
- **Industry:** `Beauty Retail`

### Recommended Fields (For Better Newsletters)
- **Name:** `Ulta Beauty`
- **Industry:** `Beauty Retail`
- **Active:** ✅ (checked)
- **Frequency:** `biweekly`
- **Timezone:** `America/Chicago`
- **Tone:** `friendly_exec`
- **Max Items / Section:** `4`

**PR URLs (comma-separated):**
```
https://www.ulta.com/about-us/news, https://www.ulta.com/press-releases
```

**News Keywords (comma-separated):**
```
Ulta Beauty, Ulta, beauty retail, cosmetics, skincare, makeup
```

**Competitors (comma-separated):**
```
Sephora, Sally Beauty, MAC Cosmetics, Sephora at Kohl's
```

**Key Priorities (comma-separated):**
```
Omnichannel experience, Personalization, Digital innovation, Customer loyalty
```

**Current Initiatives:**
```
Expanding digital capabilities, enhancing in-store experience, launching new beauty brands, improving mobile app functionality
```

**Account Owner Name:** `Sarah Johnson`
**Account Owner Email:** `sarah.johnson@iterate.ai`

**Internal Doc URL:** (optional - leave empty for testing)

---

## Step-by-Step: Adding a Customer

1. **Start the development server:**
   ```bash
   cd newsletter-admin
   npm run dev
   ```

2. **Navigate to the app:**
   - Open `http://localhost:3000`
   - Sign in with one of the accounts you provisioned via `npm run users:create`

3. **Go to Customers:**
   - Click "Go to Customers →" or navigate to `/customers`

4. **Create New Customer:**
   - Click "New Customer" button
   - Fill in the form with the example data above
   - Click "Save"

5. **You'll be redirected to the customer detail page**

---

## Step-by-Step: Testing Newsletter Generation

### Method 1: Manual Generation (Recommended for Testing)

1. **On the customer detail page:**
   - You should see the customer you just created
   - Click the **"Run Newsletter Now"** button

2. **Wait for generation:**
   - The button will show "Running..." while processing
   - This now takes several minutes because it:
     - Launches an OpenAI Deep Research run (web-search powered)
     - Polls until the background task completes (up to the configured max wait)
     - Summarizes results into customer, competitor, and industry sections
     - Generates the final newsletter draft with the LLM
     - Stores the newsletter plus research metadata in the database

3. **View the newsletter:**
   - After generation completes, you'll see a success toast
   - Scroll down to the "Newsletter History" section
   - Click the **"View"** button next to the newly generated newsletter
   - This opens the newsletter at `/customers/[id]/newsletters/[runId]`

### Method 2: Via API (For Advanced Testing)

You can also trigger newsletter generation via API:

```bash
# Replace CUSTOMER_ID with the actual customer ID from the URL
curl -X POST http://localhost:3000/api/customers/CUSTOMER_ID/run \
  -H "Content-Type: application/json"
```

---

## What to Expect in the Newsletter

The generated newsletter will include:

1. **Executive Summary** - High-level overview
2. **What's New For You** - Customer-specific highlights with implications
3. **Industry Trends We're Watching** - Relevant industry trends
4. **Updates from Iterate.ai** - Internal updates (if you've seeded the `internal_update` table)
5. **Ideas for Future Collaboration** - Strategic ideas

---

## Troubleshooting

### Newsletter generation fails

**Check:**
1. ✅ OpenAI API key is set in `.env.local`
2. ✅ Deep research env values (`DEEP_RESEARCH_*`) are set
3. ✅ Database connection is working
4. ✅ Check browser console for errors
5. ✅ Check server logs in terminal
6. ✅ Inspect the `newsletter_run.research_response_id` column to confirm polling finished

### No news found

- Deep research may need more specific customer keywords or competitors
- Update the customer profile with richer `newsKeywords` or `competitors`
- Re-run after adjusting inputs; partial data is still accepted

### Inspecting deep research metadata

- Each `newsletter_run` row now stores `research_response_id` (from OpenAI) and `research_payload`
- The payload contains the structured JSON returned by deep research plus the raw text
- Query example:
  ```sql
  select id, research_response_id, research_payload
  from newsletter_run
  order by created_at desc
  limit 5;
  ```

### Newsletter content is empty

- Check that the `content` column was added to `newsletter_run` table
- Verify database migration completed successfully
- Check server logs for errors

### Can't view newsletter

- Make sure the newsletter status is "success"
- Check that the `content` field exists in the database
- Try refreshing the page

---

## Seeding Internal Updates (Optional)

To include "Updates from Iterate.ai" in newsletters, seed the `internal_update` table:

**Via SQL (Neon Console):**
```sql
INSERT INTO internal_update (title, body, source_url, active)
VALUES 
  ('New Feature Launch', 'We launched AI-powered analytics that help customers...', 'https://iterate.ai/blog/new-feature', true),
  ('Product Update', 'Enhanced dashboard with real-time insights...', 'https://iterate.ai/blog/product-update', true);
```

**Or create a seed script** (see `MIGRATION.md` for details)

---

## Example Newsletter Output

After generation, you'll see something like:

```
Ulta Beauty Newsletter
Generated: 2025-01-17

Executive Summary
[AI-generated summary of key highlights]

1) What's New For You
• [News item about Ulta Beauty]
  Implication for Ulta Beauty: [AI-generated insight]
• [Another news item]
  Implication for Ulta Beauty: [AI-generated insight]

2) Industry Trends We're Watching
• [Industry trend]
  Why it matters: [AI-generated insight]

3) Updates from Iterate.ai
• [Internal update if seeded]

4) Ideas for Future Collaboration
• [Strategic idea] — Value: [Value proposition]
```

---

## Next Steps

1. ✅ Add a test customer
2. ✅ Generate a newsletter
3. ✅ Review the output
4. ✅ Adjust customer settings (keywords, competitors, etc.)
5. ✅ Generate another newsletter to see variations
6. ✅ Test with different tones (formal, consultative, concise)

